import snapshot from './deployment-snapshot.mjs'
import { privateAccessPublicConfig } from '../server/account-access-api.mjs'
import { handlePrivateAccessRequest } from '../server/account-access-api.mjs'
import { AccountAccessError } from '../server/account-access.mjs'
import { HOSTED_IDENTITY_ENV, createHostedIdentityRuntime, readHostedIdentityConfiguration } from '../server/account-access-hosted.mjs'

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
const PRIVATE_SESSION_ERROR_STATUS = Object.freeze({
  authentication_required: 401,
  session_revoked: 401,
  session_expired: 401,
  owner_mismatch: 403,
  authentication_unavailable: 503,
})
const privateSessionDiagnostic = (logger, input, error) => {
  const knownStatus = error instanceof AccountAccessError ? PRIVATE_SESSION_ERROR_STATUS[error.code] : undefined
  const safeError = knownStatus === error?.status
    ? { errorCode: error.code, status: knownStatus }
    : { errorCode: 'private_workspace_unavailable', status: 503 }
  try { logger?.info?.('outcome_private_session', { authSource: input.authSource, ...safeError }) } catch {}
}

export function createStableHostRequestHandler({ environment = process.env, runtimeFactory = createHostedIdentityRuntime, clerkClientFactory, logger } = {}) {
  const configured = readHostedIdentityConfiguration(environment).enabled
  const configuredOrigin = typeof environment?.[HOSTED_IDENTITY_ENV.privateAllowedOrigin] === 'string' ? environment[HOSTED_IDENTITY_ENV.privateAllowedOrigin].trim() : ''
  const validRuntime = (value) => value?.allowedOrigin === configuredOrigin
    && typeof value?.publishableKey === 'string'
    && value.publishableKey.length > 0
    && typeof value?.service?.readWorkspace === 'function'
    && typeof value?.service?.authenticate === 'function'
  let runtimePromise
  const selectedRuntime = async () => {
    if (!configured || typeof runtimeFactory !== 'function') return null
    runtimePromise ??= Promise.resolve().then(() => runtimeFactory({ environment, clerkClientFactory })).then((value) => validRuntime(value) ? value : null).catch(() => null)
    return runtimePromise
  }
  return async ({ method = 'GET', pathname = '/', headers = {}, body, origin } = {}) => {
    if (!pathname.startsWith('/api/private/')) return handleStableHostRequest({ method, pathname })
    const hosted = await selectedRuntime()
    if (!hosted) return handleStableHostRequest({ method, pathname })
    if (method === 'GET' && pathname === '/api/private/config') return result(200, { ...privateAccessPublicConfig(true), publishableKey: hosted.publishableKey })
    if (method === 'GET' && pathname === '/api/private/session') {
      const sessionInput = privateSessionInput(headers)
      try {
        await hosted.service.authenticate(sessionInput.token)
        return result(200, { authenticated: true, owner: true })
      } catch (error) {
        privateSessionDiagnostic(logger, sessionInput, error)
        return error?.status ? result(error.status, { error: error.code }) : result(503, { error: 'private_workspace_unavailable' })
      }
    }
    if (method === 'GET' && pathname === '/api/private/workspace') return handlePrivateAccessRequest({ method, pathname, token: privateSessionToken(headers), service: hosted.service })
    return result(405, { error: 'read_only' })
  }
}
const requestPath = (request) => {
  const queryPath = Array.isArray(request.query?.path) ? request.query.path.join('/') : request.query?.path
  if (queryPath) return `/api/${String(queryPath).replace(/^\/+/, '')}`
  return new URL(request.url ?? '/', 'https://outcome.invalid').pathname
}

const hostedRequest = createStableHostRequestHandler({ logger: console })

export default async function handler(request, response) {
  const pathname = requestPath(request)
  const value = await hostedRequest({ method: request.method, pathname, headers: request.headers, body: request.body, origin: request.headers?.origin })
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', value.status === 200 && !pathname.startsWith('/api/private/') ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  for (const [name, content] of Object.entries(value.headers ?? {})) response.setHeader(name, content)
  return response.status(value.status).json(value.body)
}
