import snapshot from './deployment-snapshot.mjs'
import { isPromise, isProxy } from 'node:util/types'
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
  const names = companion ? ['content-type'] : ['content-type', 'origin', 'x-outcome-csrf']
  return Object.fromEntries(names.map((name) => [name, String(header(headers, name))]).filter(([, value]) => value))
}
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
    const bridgeTarget = bridgeRequestTarget(pathname)
    if (bridgeTarget.candidate) {
      if (!bridgeTarget.valid) return bridgeUnavailable()
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
const safeDataMethod = (object, key) => {
  try {
    if ((typeof object !== 'object' && typeof object !== 'function') || object === null || isProxy(object)) return null
    let current = object
    for (let depth = 0; current !== null && depth < 16; depth += 1) {
      if (isProxy(current)) return null
      const descriptor = Object.getOwnPropertyDescriptor(current, key)
      if (descriptor) {
        if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function' || isProxy(descriptor.value)) return null
        const name = Object.getOwnPropertyDescriptor(descriptor.value, 'name')
        return name && Object.hasOwn(name, 'value') && typeof name.value === 'string' && !name.value.startsWith('bound ') ? descriptor.value : null
      }
      current = Object.getPrototypeOf(current)
    }
  } catch {}
  return null
}
const safeIteratorResult = (value) => {
  try {
    if (typeof value !== 'object' || value === null || isProxy(value)) return null
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const keys = Reflect.ownKeys(descriptors)
    if (keys.some((key) => typeof key !== 'string' || !['done', 'value'].includes(key))) return null
    const done = descriptors.done
    if (!done || !Object.hasOwn(done, 'value') || typeof done.value !== 'boolean') return null
    const item = descriptors.value
    if (item && !Object.hasOwn(item, 'value')) return null
    return { done: done.value, value: item?.value }
  } catch {
    return null
  }
}
const closeIterator = async (iterator) => {
  const close = safeDataMethod(iterator, 'return')
  if (!close) return
  try {
    const pending = Reflect.apply(close, iterator, [])
    if (!isProxy(pending) && isPromise(pending)) await pending
  } catch {}
}
const rawBridgeBody = async (request, pathname) => {
  const target = bridgeRequestTarget(pathname)
  if (isProxy(request)) return undefined
  let body
  try {
    const descriptor = Object.getOwnPropertyDescriptor(request, 'body')
    if (descriptor && !Object.hasOwn(descriptor, 'value')) return undefined
    body = descriptor?.value
  } catch { return undefined }
  if (isProxy(body)) return undefined
  if (!target.candidate || !target.valid || request.method === 'GET' || typeof body === 'string' || Buffer.isBuffer(body)) return body
  const iteratorMethod = safeDataMethod(request, Symbol.asyncIterator)
  if (!iteratorMethod) return body
  let iterator
  try { iterator = Reflect.apply(iteratorMethod, request, []) } catch { return undefined }
  if (typeof iterator !== 'object' || iterator === null || isProxy(iterator)) return undefined
  const next = safeDataMethod(iterator, 'next')
  if (!next) return undefined
  const chunks = []
  let bytes = 0
  try {
    while (true) {
      let pending = Reflect.apply(next, iterator, [])
      if (isProxy(pending)) { await closeIterator(iterator); return undefined }
      if (isPromise(pending)) pending = await pending
      const item = safeIteratorResult(pending)
      if (!item) { await closeIterator(iterator); return undefined }
      if (item.done) break
      const chunk = item.value
      if (isProxy(chunk)) { await closeIterator(iterator); return undefined }
      let value
      if (typeof chunk === 'string') value = Buffer.from(chunk)
      else if (Buffer.isBuffer(chunk) && Object.getPrototypeOf(chunk) === Buffer.prototype) value = chunk
      else { await closeIterator(iterator); return undefined }
      bytes += value.length
      if (bytes > MAXIMUM_STABLE_BRIDGE_BODY_BYTES) { await closeIterator(iterator); return Buffer.alloc(MAXIMUM_STABLE_BRIDGE_BODY_BYTES + 1) }
      chunks.push(value)
    }
  } catch {
    await closeIterator(iterator)
    return undefined
  }
  return Buffer.concat(chunks, bytes)
}

export const config = Object.freeze({ api: Object.freeze({ bodyParser: false }) })

export default async function handler(request, response) {
  if (isProxy(request)) {
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('x-content-type-options', 'nosniff')
    response.setHeader('x-frame-options', 'DENY')
    return response.status(400).json({ error: 'bad_request' })
  }
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
