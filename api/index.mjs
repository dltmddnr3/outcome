import snapshot from './deployment-snapshot.mjs'
import { privateAccessPublicConfig } from '../server/account-access-api.mjs'
import { handlePrivateAccessRequest } from '../server/account-access-api.mjs'
import { AccountAccessError } from '../server/account-access.mjs'
import { HOSTED_IDENTITY_ENV, createHostedIdentityRuntime, readHostedIdentityConfiguration, safeClerkAuthReason } from '../server/account-access-hosted.mjs'
import { handleHostedObserverBridgeAdminRequest, handleHostedObserverBridgeRequest } from '../server/phase3-observer-bridge-api.mjs'
import { createObserverBridgeRuntimeControl } from '../server/phase3-observer-bridge-runtime.mjs'
import { createManagedObserverBridgeRuntimeFactory, readDeploymentPreviewOrigin } from '../server/phase3-observer-bridge-managed-runtime.mjs'
import { handlePrivateChatRequest } from '../server/outcome-chat-api.mjs'
import { createOutcomeChatHostedRuntimeFactory } from '../server/outcome-chat-hosted-runtime.mjs'
import { isProxy } from 'node:util/types'

const result = (status, body) => ({ status, body })

export function handleStableHostRequest({ method = 'GET', pathname = '/' } = {}) {
  if (pathname === '/api/private/decisions') return result(405, { error: 'read_only' })
  if (method !== 'GET') return result(405, { error: 'read_only' })
  if (pathname === '/api/dashboard') return result(200, { dashboard: snapshot })
  if (pathname === '/api/auth/session') return result(200, { authenticated: false, publicReadOnly: true })
  if (pathname === '/api/health') return result(200, { status: 'available', access: 'public_read_only', source: 'deployment_snapshot' })
  if (pathname === '/api/private/config') return result(200, privateAccessPublicConfig(false))
  if (pathname === '/api/private/session') return result(401, { error: 'authentication_required' })
  if (pathname === '/api/private/workspace') return result(401, { error: 'authentication_required' })
  return result(404, { error: 'not_found' })
}
const header = (headers, name) => typeof headers?.get === 'function' ? headers.get(name) : headers?.[name] ?? headers?.[name.toLowerCase()] ?? ''
const cookieValue = (headers, name) => String(header(headers, 'cookie')).split(';').map((item) => item.trim().split('=')).find(([key]) => key === name)?.[1] ?? ''
const privateSessionInput = (headers) => {
  const authorization = String(header(headers, 'authorization'))
  if (authorization) return { authSource: 'bearer', token: authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1] ?? '' }
  const token = cookieValue(headers, '__session')
  return { authSource: token ? 'cookie' : 'none', token }
}
const privateSessionToken = (headers) => privateSessionInput(headers).token
const BRIDGE_PREFIX = '/api/private/bridge/'
const BRIDGE_PROJECTION_ENROLLMENT_PATHS = new Set([
  '/api/private/bridge/projection',
  '/api/private/bridge/enrollments',
  '/api/private/bridge/enrollments/complete',
  '/api/private/bridge/sources/revoke',
  '/api/private/bridge/sources/rotate',
])
const BRIDGE_INGESTION_PATHS = new Set(['/api/private/bridge/events'])
const BRIDGE_ADMIN_PATHS = new Set([
  '/api/private/bridge/admin/viewers/register',
  '/api/private/bridge/admin/viewers/revoke',
  '/api/private/bridge/admin/challenges/cleanup',
  '/api/private/bridge/admin/readiness',
])
const BRIDGE_OWNER_PATHS = new Set([
  '/api/private/bridge/enrollments',
  '/api/private/bridge/sources/revoke',
  '/api/private/bridge/sources/rotate',
])
const bridgeUnavailable = () => result(404, { error: 'bridge_unavailable' })
const rawRequestTarget = (target) => {
  if (typeof target !== 'string') return null
  const absolute = target.match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*(.*)$/s)
  const value = absolute ? (absolute[1] || '/') : target
  if (!value.startsWith('/')) return null
  const fragment = value.indexOf('#')
  const withoutFragment = fragment === -1 ? value : value.slice(0, fragment)
  const query = withoutFragment.indexOf('?')
  return {
    path: query === -1 ? withoutFragment : withoutFragment.slice(0, query),
    search: query === -1 ? '' : withoutFragment.slice(query),
    ambiguous: fragment !== -1,
  }
}
const bridgeRequestTarget = (target) => {
  const value = rawRequestTarget(target)
  if (!value) return { candidate: false, valid: false, path: '', search: '' }
  const probe = value.path.replace(/%(?:2f|5c)/gi, '/').replaceAll('\\', '/')
  const candidate = probe === '/api/private/bridge' || probe.startsWith(BRIDGE_PREFIX)
  const valid = candidate && !value.ambiguous && !/[.%\\\u0000-\u0020\u007f]/.test(value.path)
  return { ...value, candidate, valid }
}
const isBridgePathname = (pathname) => bridgeRequestTarget(pathname).candidate
const selectedHeaders = (headers, companion = false) => {
  const names = companion ? ['content-type'] : ['content-type', 'origin', 'x-outcome-csrf', 'if-match']
  return Object.fromEntries(names.map((name) => [name, String(header(headers, name))]).filter(([, value]) => value))
}
const selectedChatHeaders = (headers) => Object.fromEntries(['content-type','origin','x-outcome-csrf','idempotency-key'].map((name) => [name, String(header(headers,name))]).filter(([,value]) => value))
const bridgeLocation = (pathname) => {
  try {
    const target = bridgeRequestTarget(pathname)
    if (!target.valid) return { path: '', query: Object.create(null) }
    const query = Object.create(null)
    for (const [key, value] of new URLSearchParams(target.search)) {
      if (Object.hasOwn(query, key)) query.__duplicate__ = true
      else query[key] = value
    }
    return { path: target.path, query }
  } catch {
    return { path: '', query: Object.create(null) }
  }
}
const PRIVATE_SESSION_ERROR_STATUS = Object.freeze({
  authentication_required: 401,
  session_revoked: 401,
  session_expired: 401,
  owner_mismatch: 403,
  authentication_unavailable: 503,
})
const privateTokenDiagnostic = (token, configuredOrigin, currentTime = Date.now()) => {
  const segments = String(token).split('.')
  if (segments.length !== 3 || segments.some((segment) => !segment)) return { tokenShape: 'other' }
  const state = { tokenShape: 'jwt3' }
  try {
    if (segments[1].length > 8_192) return state
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'))
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return state
    const nowSeconds = currentTime / 1_000
    return {
      ...state,
      azpMatchesConfiguredOrigin: typeof claims.azp === 'string' && claims.azp === configuredOrigin,
      expFuture: Number.isFinite(claims.exp) && claims.exp > nowSeconds,
      iatNotFuture: Number.isFinite(claims.iat) && claims.iat <= nowSeconds,
    }
  } catch { return state }
}
const privateSessionDiagnostic = (logger, input, error, configuredOrigin) => {
  const knownStatus = error instanceof AccountAccessError ? PRIVATE_SESSION_ERROR_STATUS[error.code] : undefined
  const safeError = knownStatus === error?.status
    ? { errorCode: error.code, status: knownStatus }
    : { errorCode: 'private_workspace_unavailable', status: 503 }
  const tokenState = privateTokenDiagnostic(input.token, configuredOrigin)
  const sdkReason = safeClerkAuthReason(error?.sdkReason)
  try { logger?.info?.('outcome_private_session', { authSource: input.authSource, ...tokenState, ...(sdkReason ? { sdkReason } : {}), ...safeError }) } catch {}
}
const deploymentIdentityOrigin = (environment) => {
  if (typeof environment !== 'object' || environment === null || isProxy(environment)) return null
  let descriptor
  try { descriptor = Object.getOwnPropertyDescriptor(environment, 'VERCEL_ENV') } catch { return null }
  if (descriptor === undefined) return undefined
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string') return null
  if (descriptor.value === 'preview') return readDeploymentPreviewOrigin(environment)
  return descriptor.value === 'production' || descriptor.value === 'development' ? undefined : null
}

export function createStableHostRequestHandler({ environment = process.env, runtimeFactory = createHostedIdentityRuntime, bridgeRuntimeFactory = createManagedObserverBridgeRuntimeFactory({ environment }), chatRuntimeFactory = createOutcomeChatHostedRuntimeFactory({ environment }), decisionRuntimeFactory, clerkClientFactory, clerkTokenVerifier, logger } = {}) {
  const bridgeControl = createObserverBridgeRuntimeControl({ environment, runtimeFactory: bridgeRuntimeFactory })
  const previewOrigin = deploymentIdentityOrigin(environment)
  const identityConfiguration = readHostedIdentityConfiguration(environment, { allowedOrigin: previewOrigin })
  const configured = identityConfiguration.enabled
  const configuredOrigin = previewOrigin === undefined ? (() => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(environment, HOSTED_IDENTITY_ENV.privateAllowedOrigin)
      return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' ? descriptor.value.trim() : ''
    } catch { return '' }
  })() : previewOrigin ?? ''
  const validRuntime = (value) => value?.allowedOrigin === configuredOrigin
    && typeof value?.publishableKey === 'string'
    && value.publishableKey.length > 0
    && typeof value?.service?.readWorkspace === 'function'
    && typeof value?.service?.authenticate === 'function'
    && typeof value?.service?.resolveBridgeAuthority === 'function'
  let runtimePromise
  let decisionRuntimePromise
  let chatRuntimePromise
  const selectedRuntime = async () => {
    if (!configured || typeof runtimeFactory !== 'function') return null
    runtimePromise ??= Promise.resolve().then(() => runtimeFactory({ environment, allowedOrigin: previewOrigin, sealedSnapshot: snapshot, clerkClientFactory, tokenVerifier: clerkTokenVerifier })).then((value) => validRuntime(value) ? value : null).catch(() => null)
    return runtimePromise
  }
  const selectedDecisionRuntime = async (hosted) => {
    if (!hosted || typeof decisionRuntimeFactory !== 'function') return null
    decisionRuntimePromise ??= Promise.resolve().then(() => decisionRuntimeFactory({ environment, identityRuntime: hosted })).then((value) => value?.allowedOrigin === configuredOrigin && typeof value?.csrfSecret === 'string' && value.csrfSecret.length >= 16 && typeof value?.service?.record === 'function' ? value : null).catch(() => null)
    return decisionRuntimePromise
  }
  const selectedChatRuntime = async (hosted) => {
    if (typeof chatRuntimeFactory !== 'function') return null
    chatRuntimePromise ??= Promise.resolve().then(() => chatRuntimeFactory({ accountRuntime: hosted, allowedOrigin: configuredOrigin })).catch(() => null)
    return chatRuntimePromise
  }
  return async ({ method = 'GET', pathname = '/', headers = {}, body, origin } = {}) => {
    const bridgeTarget = bridgeRequestTarget(pathname)
    if (bridgeTarget.candidate) {
      if (!bridgeTarget.valid) return bridgeUnavailable()
      const location = bridgeLocation(pathname)
      const projectionEnrollment = BRIDGE_PROJECTION_ENROLLMENT_PATHS.has(location.path)
      const ingestion = BRIDGE_INGESTION_PATHS.has(location.path)
      const admin = BRIDGE_ADMIN_PATHS.has(location.path)
      if ((!projectionEnrollment && !ingestion && !admin)
        || (projectionEnrollment && !bridgeControl.configuration.projectionEnrollmentEnabled)
        || (ingestion && !bridgeControl.configuration.ingestionEnabled)
        || (admin && (!bridgeControl.configuration.projectionEnrollmentEnabled || !bridgeControl.configuration.ingestionEnabled))) return bridgeUnavailable()
      const hosted = await selectedRuntime()
      if (!hosted) return bridgeUnavailable()
      const bridgeRuntime = await bridgeControl.select(hosted)
      if (!bridgeRuntime) return bridgeUnavailable()
      const companion = ['/api/private/bridge/enrollments/complete', '/api/private/bridge/events'].includes(location.path)
      if (admin) {
        try {
          return await handleHostedObserverBridgeAdminRequest({
            admin: bridgeRuntime.admin,
            allowed_origin: bridgeRuntime.allowedOrigin,
            csrf_secret: bridgeRuntime.csrfSecret,
            method,
            path: location.path,
            headers: selectedHeaders(headers),
            rawBody: body,
            token: privateSessionToken(headers),
            query: location.query,
          })
        } catch {
          return result(503, { error: 'bridge_unavailable' })
        }
      }
      let authContext = null
      if ((location.path === '/api/private/bridge/projection' && method === 'GET') || (BRIDGE_OWNER_PATHS.has(location.path) && method === 'POST')) {
        try {
          authContext = await hosted.service.resolveBridgeAuthority({ token: privateSessionToken(headers) })
        } catch (error) {
          return error?.code === 'authentication_unavailable' ? result(503, { error: 'bridge_unavailable' }) : bridgeUnavailable()
        }
      }
      try {
        return await handleHostedObserverBridgeRequest({
          bridge: bridgeRuntime.bridge,
          allowed_origin: bridgeRuntime.allowedOrigin,
          csrf_secret: bridgeRuntime.csrfSecret,
          method,
          path: location.path,
          headers: selectedHeaders(headers, companion),
          rawBody: body,
          authContext,
          query: location.query,
        })
      } catch {
        return result(503, { error: 'bridge_unavailable' })
      }
    }
    if (!pathname.startsWith('/api/private/')) {
      if (configured && method === 'GET' && ['/api/dashboard', '/api/dashboard/cherry-note'].includes(pathname)) return result(404, { error: 'not_found' })
      if (configured && method === 'GET' && pathname === '/api/auth/session') return result(200, { authenticated: false, publicReadOnly: false })
      if (configured && method === 'GET' && pathname === '/api/health') return result(200, { status: 'available', access: 'authentication_required', source: 'private_snapshot' })
      return handleStableHostRequest({ method, pathname })
    }
    const hosted = await selectedRuntime()
    if (!hosted) return pathname.startsWith('/api/private/chat/') ? result(503, { error: 'chat_unavailable' }) : handleStableHostRequest({ method, pathname })
    if (pathname.startsWith('/api/private/chat/')) {
      const chat = await selectedChatRuntime(hosted)
      if (!chat) return result(503, { error: 'chat_unavailable' })
      let authority
      try { authority = await hosted.service.resolveBridgeAuthority({ token: privateSessionToken(headers) }) } catch { return result(503, { error: 'chat_unavailable' }) }
      if (!authority || authority.workspace_id !== 'account-only-preview' || !Array.isArray(authority.project_ids) || !authority.project_ids.includes('outcome')) return result(503, { error: 'chat_unavailable' })
      const service = chat.createService(authority.workspace_id)
      const owner = { authenticated:true,actor:'cherry_owner',allowed_origin:chat.allowedOrigin,csrf:chat.csrfSecret,workspace_id:authority.workspace_id,account_ref:authority.account_ref,project_ids:authority.project_ids }
      return handlePrivateChatRequest({ method,url:pathname,headers:selectedChatHeaders(headers),rawBody:Buffer.isBuffer(body)?body.toString('utf8'):body,service,owner,rateLimit:chat.rateLimit })
    }
    if (method === 'GET' && pathname === '/api/private/config') return result(200, { ...privateAccessPublicConfig(true), publishableKey: hosted.publishableKey })
    if (method === 'GET' && pathname === '/api/private/session') {
      const sessionInput = privateSessionInput(headers)
      try {
        await hosted.service.authenticate(sessionInput.token)
        return result(200, { authenticated: true, owner: true })
      } catch (error) {
        privateSessionDiagnostic(logger, sessionInput, error, configuredOrigin)
        return error?.status ? result(error.status, { error: error.code }) : result(503, { error: 'private_workspace_unavailable' })
      }
    }
    if ((method === 'GET' && pathname === '/api/private/workspace') || pathname === '/api/private/decisions') {
      let parsedBody = body
      if (pathname === '/api/private/decisions' && method === 'POST' && (typeof body === 'string' || Buffer.isBuffer(body))) {
        if (Buffer.byteLength(body) > 10_000) return result(413, { error: 'request_too_large' })
        try { parsedBody = JSON.parse(String(body) || '{}') } catch { return result(400, { error: 'invalid_request' }) }
      }
      return handlePrivateAccessRequest({ method, pathname, token: privateSessionToken(headers), service: hosted.service, decisionRuntime: await selectedDecisionRuntime(hosted), headers: selectedHeaders(headers), origin, body: parsedBody })
    }
    return method === 'GET' ? result(404, { error: 'not_found' }) : result(405, { error: 'read_only' })
  }
}
export const requestPath = (request) => {
  const target = rawRequestTarget(request.url ?? '/')
  if (!target) return '/'
  const queryPath = Array.isArray(request.query?.path) ? request.query.path.join('/') : request.query?.path
  if (queryPath) {
    const searchParams = new URLSearchParams(target.search)
    searchParams.delete('path')
    const search = searchParams.toString()
    return `/api/${String(queryPath).replace(/^\/+/, '')}${search ? `?${search}` : ''}`
  }
  return `${target.path}${target.search}`
}

const hostedRequest = createStableHostRequestHandler({ logger: console })

const MAXIMUM_STABLE_BRIDGE_BODY_BYTES = 1_048_576
const rawBridgeBody = async (request, pathname) => {
  const target = bridgeRequestTarget(pathname)
  const chat = typeof pathname === 'string' && pathname.startsWith('/api/private/chat/')
  const body = request.body
  const decisionCandidate = pathname === '/api/private/decisions'
  if ((!target.candidate && !chat && !decisionCandidate) || (target.candidate && !target.valid) || request.method === 'GET' || typeof body === 'string' || Buffer.isBuffer(body)) return body
  const maximumBytes = chat || decisionCandidate ? 10_000 : MAXIMUM_STABLE_BRIDGE_BODY_BYTES
  const chunks = []
  let bytes = 0
  try {
    if (typeof request[Symbol.asyncIterator] !== 'function') return body
    for await (const chunk of request) {
      let value
      if (typeof chunk === 'string') value = Buffer.from(chunk)
      else if (Buffer.isBuffer(chunk)) value = chunk
      else return undefined
      bytes += value.length
      if (bytes > maximumBytes) return Buffer.alloc(maximumBytes + 1)
      chunks.push(value)
    }
  } catch {
    return undefined
  }
  return Buffer.concat(chunks, bytes)
}

export const config = Object.freeze({ api: Object.freeze({ bodyParser: false }) })

export default async function handler(request, response) {
  const pathname = requestPath(request)
  let body
  try { body = await rawBridgeBody(request, pathname) } catch { body = undefined }
  const value = await hostedRequest({ method: request.method, pathname, headers: request.headers, body, origin: request.headers?.origin })
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', value.status === 200 && !pathname.startsWith('/api/private/') ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  for (const [name, content] of Object.entries(value.headers ?? {})) response.setHeader(name, content)
  return response.status(value.status).json(value.body)
}
