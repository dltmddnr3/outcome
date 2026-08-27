import snapshot from './deployment-snapshot.mjs'
import { privateAccessPublicConfig } from '../server/account-access-api.mjs'
import { handlePrivateAccessRequest } from '../server/account-access-api.mjs'
import { AccountAccessError } from '../server/account-access.mjs'
import { HOSTED_IDENTITY_ENV, createHostedIdentityRuntime, readHostedIdentityConfiguration, safeClerkAuthReason } from '../server/account-access-hosted.mjs'
import { handleHostedObserverBridgeRequest } from '../server/phase3-observer-bridge-api.mjs'
import { createObserverBridgeRuntimeControl } from '../server/phase3-observer-bridge-runtime.mjs'

const result = (status, body) => ({ status, body })

export function handleStableHostRequest({ method = 'GET', pathname = '/' } = {}) {
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
const BRIDGE_OWNER_PATHS = new Set([
  '/api/private/bridge/enrollments',
  '/api/private/bridge/sources/revoke',
  '/api/private/bridge/sources/rotate',
])
const bridgeUnavailable = () => result(404, { error: 'bridge_unavailable' })
const isBridgePathname = (pathname) => {
  try {
    const path = new URL(pathname, 'https://outcome.invalid').pathname
    return path === '/api/private/bridge' || path.startsWith(BRIDGE_PREFIX)
  } catch {
    return false
  }
}
const selectedHeaders = (headers, companion = false) => {
  const names = companion ? ['content-type'] : ['content-type', 'origin', 'x-outcome-csrf']
  return Object.fromEntries(names.map((name) => [name, String(header(headers, name))]).filter(([, value]) => value))
}
const bridgeLocation = (pathname) => {
  try {
    const url = new URL(pathname, 'https://outcome.invalid')
    const query = Object.create(null)
    for (const [key, value] of url.searchParams) {
      if (Object.hasOwn(query, key)) query.__duplicate__ = true
      else query[key] = value
    }
    return { path: url.pathname, query }
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

export function createStableHostRequestHandler({ environment = process.env, runtimeFactory = createHostedIdentityRuntime, bridgeRuntimeFactory, clerkClientFactory, clerkTokenVerifier, logger } = {}) {
  const configured = readHostedIdentityConfiguration(environment).enabled
  const configuredOrigin = typeof environment?.[HOSTED_IDENTITY_ENV.privateAllowedOrigin] === 'string' ? environment[HOSTED_IDENTITY_ENV.privateAllowedOrigin].trim() : ''
  const validRuntime = (value) => value?.allowedOrigin === configuredOrigin
    && typeof value?.publishableKey === 'string'
    && value.publishableKey.length > 0
    && typeof value?.service?.readWorkspace === 'function'
    && typeof value?.service?.authenticate === 'function'
  let runtimePromise
  const bridgeControl = createObserverBridgeRuntimeControl({ environment, runtimeFactory: bridgeRuntimeFactory })
  const selectedRuntime = async () => {
    if (!configured || typeof runtimeFactory !== 'function') return null
    runtimePromise ??= Promise.resolve().then(() => runtimeFactory({ environment, sealedSnapshot: snapshot, clerkClientFactory, tokenVerifier: clerkTokenVerifier })).then((value) => validRuntime(value) ? value : null).catch(() => null)
    return runtimePromise
  }
  return async ({ method = 'GET', pathname = '/', headers = {}, body, origin } = {}) => {
    if (!pathname.startsWith('/api/private/')) {
      if (configured && method === 'GET' && ['/api/dashboard', '/api/dashboard/cherry-note'].includes(pathname)) return result(404, { error: 'not_found' })
      if (configured && method === 'GET' && pathname === '/api/auth/session') return result(200, { authenticated: false, publicReadOnly: false })
      if (configured && method === 'GET' && pathname === '/api/health') return result(200, { status: 'available', access: 'authentication_required', source: 'private_snapshot' })
      return handleStableHostRequest({ method, pathname })
    }
    if (isBridgePathname(pathname)) {
      const location = bridgeLocation(pathname)
      const projectionEnrollment = BRIDGE_PROJECTION_ENROLLMENT_PATHS.has(location.path)
      const ingestion = BRIDGE_INGESTION_PATHS.has(location.path)
      if ((!projectionEnrollment && !ingestion)
        || (projectionEnrollment && !bridgeControl.configuration.projectionEnrollmentEnabled)
        || (ingestion && !bridgeControl.configuration.ingestionEnabled)) return bridgeUnavailable()
      const hosted = await selectedRuntime()
      if (!hosted) return bridgeUnavailable()
      const bridgeRuntime = await bridgeControl.select(hosted)
      if (!bridgeRuntime) return bridgeUnavailable()
      const companion = ['/api/private/bridge/enrollments/complete', '/api/private/bridge/events'].includes(location.path)
      let authContext = null
      if ((location.path === '/api/private/bridge/projection' && method === 'GET') || (BRIDGE_OWNER_PATHS.has(location.path) && method === 'POST')) {
        try {
          authContext = await hosted.service.authenticate(privateSessionToken(headers))
        } catch (error) {
          return error?.code === 'authentication_unavailable' ? result(503, { error: 'bridge_unavailable' }) : bridgeUnavailable()
        }
      }
      return handleHostedObserverBridgeRequest({
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
    }
    const hosted = await selectedRuntime()
    if (!hosted) return handleStableHostRequest({ method, pathname })
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
    if (method === 'GET' && pathname === '/api/private/workspace') return handlePrivateAccessRequest({ method, pathname, token: privateSessionToken(headers), service: hosted.service })
    return method === 'GET' ? result(404, { error: 'not_found' }) : result(405, { error: 'read_only' })
  }
}
export const requestPath = (request) => {
  const url = new URL(request.url ?? '/', 'https://outcome.invalid')
  const queryPath = Array.isArray(request.query?.path) ? request.query.path.join('/') : request.query?.path
  if (queryPath) {
    url.searchParams.delete('path')
    const search = url.searchParams.toString()
    return `/api/${String(queryPath).replace(/^\/+/, '')}${search ? `?${search}` : ''}`
  }
  return `${url.pathname}${url.search}`
}

const hostedRequest = createStableHostRequestHandler({ logger: console })

const MAXIMUM_STABLE_BRIDGE_BODY_BYTES = 1_048_576
const rawBridgeBody = async (request, pathname) => {
  if (!isBridgePathname(pathname) || request.method === 'GET' || typeof request.body === 'string' || Buffer.isBuffer(request.body) || typeof request?.[Symbol.asyncIterator] !== 'function') return request.body
  const chunks = []
  let bytes = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += value.length
    if (bytes > MAXIMUM_STABLE_BRIDGE_BODY_BYTES) return Buffer.alloc(MAXIMUM_STABLE_BRIDGE_BODY_BYTES + 1)
    chunks.push(value)
  }
  return Buffer.concat(chunks, bytes)
}

export const config = Object.freeze({ api: Object.freeze({ bodyParser: false }) })

export default async function handler(request, response) {
  const pathname = requestPath(request)
  const body = await rawBridgeBody(request, pathname)
  const value = await hostedRequest({ method: request.method, pathname, headers: request.headers, body, origin: request.headers?.origin })
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', value.status === 200 && !pathname.startsWith('/api/private/') ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  for (const [name, content] of Object.entries(value.headers ?? {})) response.setHeader(name, content)
  return response.status(value.status).json(value.body)
}
