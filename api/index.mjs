import snapshot from './deployment-snapshot.mjs'
import { privateAccessPublicConfig } from '../server/account-access-api.mjs'
import { handlePrivateAccessRequest } from '../server/account-access-api.mjs'
import { AccountAccessError } from '../server/account-access.mjs'
import { HOSTED_PREVIEW_ENV, readHostedPreviewConfiguration } from '../server/account-access-hosted.mjs'

const result = (status, body) => ({ status, body })

export function handleStableHostRequest({ method = 'GET', pathname = '/' } = {}) {
  if (method !== 'GET') return result(405, { error: 'read_only' })
  if (pathname === '/api/dashboard') return result(200, { dashboard: snapshot })
  if (pathname === '/api/auth/session') return result(200, { authenticated: false, publicReadOnly: true })
  if (pathname === '/api/health') return result(200, { status: 'available', access: 'public_read_only', source: 'deployment_snapshot' })
  if (pathname === '/api/private/config') return result(200, privateAccessPublicConfig(false))
  if (pathname === '/api/private/workspace') return result(401, { error: 'authentication_required' })
  return result(404, { error: 'not_found' })
}
const header = (headers, name) => typeof headers?.get === 'function' ? headers.get(name) : headers?.[name] ?? headers?.[name.toLowerCase()] ?? ''
const cookieValue = (headers, name) => String(header(headers, 'cookie')).split(';').map((item) => item.trim().split('=')).find(([key]) => key === name)?.[1] ?? ''
const normalizedBody = (body) => { if (!body) return {}; if (typeof body === 'object') return body; try { return JSON.parse(body) } catch { return {} } }
const sessionCookie = (token, maxAge) => `__session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

export function createStableHostRequestHandler({ environment = process.env, runtimeFactory } = {}) {
  const configured = readHostedPreviewConfiguration(environment).enabled
  const configuredOrigin = typeof environment?.[HOSTED_PREVIEW_ENV.privateAllowedOrigin] === 'string' ? environment[HOSTED_PREVIEW_ENV.privateAllowedOrigin].trim() : ''
  const validRuntime = (value) => value?.allowedOrigin === configuredOrigin
    && typeof value?.service?.readWorkspace === 'function'
    && typeof value?.service?.authenticate === 'function'
    && typeof value?.transition?.begin === 'function'
    && typeof value?.transition?.appleLink === 'function'
    && typeof value?.transition?.end === 'function'
  let runtimePromise
  const selectedRuntime = async () => {
    if (!configured || !runtimeFactory) return null
    runtimePromise ??= Promise.resolve().then(() => runtimeFactory({ environment })).then((value) => validRuntime(value) ? value : null).catch(() => null)
    return runtimePromise
  }
  return async ({ method = 'GET', pathname = '/', headers = {}, body, origin } = {}) => {
    if (!pathname.startsWith('/api/private/')) return handleStableHostRequest({ method, pathname })
    const hosted = await selectedRuntime()
    if (!hosted) return handleStableHostRequest({ method, pathname })
    if (method === 'GET' && pathname === '/api/private/config') return result(200, privateAccessPublicConfig(true))
    if (method === 'GET' && pathname === '/api/private/workspace') return handlePrivateAccessRequest({ method, pathname, token: cookieValue(headers, '__session'), service: hosted.service })
    if (method !== 'POST') return result(405, { error: 'read_only' })
    if ((origin ?? header(headers, 'origin')) !== hosted.allowedOrigin) return result(403, { error: 'request_origin_denied' })
    const input = normalizedBody(body)
    try {
      if (pathname === '/api/private/auth/login') {
        const transition = await hosted.transition.begin({ provider: input.provider })
        if (!transition?.redirectUrl) return result(503, { error: 'authentication_unavailable' })
        return result(200, { state: 'redirect_required', mode: 'hosted_provider_redirect', redirectUrl: transition.redirectUrl })
      }
      if (pathname === '/api/private/auth/apple-link') {
        const transition = await hosted.transition.appleLink({ token: cookieValue(headers, '__session') })
        if (!transition?.redirectUrl) return result(503, { error: 'authentication_unavailable' })
        return result(200, { state: 'redirect_required', mode: 'hosted_provider_link', redirectUrl: transition.redirectUrl })
      }
      if (pathname === '/api/private/auth/callback') {
        await hosted.service.authenticate(input.sessionToken)
        return { ...result(200, { state: 'authenticated', mode: 'hosted_provider_callback' }), headers: { 'set-cookie': sessionCookie(input.sessionToken, 604_800) } }
      }
      if (pathname === '/api/private/auth/logout') {
        await hosted.transition.end({ token: cookieValue(headers, '__session') })
        return { ...result(200, { state: 'signed_out', mode: 'hosted_provider_session' }), headers: { 'set-cookie': sessionCookie('', 0) } }
      }
      return result(405, { error: 'read_only' })
    } catch (error) {
      return error instanceof AccountAccessError ? result(error.status, { error: error.code }) : result(503, { error: 'private_workspace_unavailable' })
    }
  }
}
const requestPath = (request) => {
  const queryPath = Array.isArray(request.query?.path) ? request.query.path.join('/') : request.query?.path
  if (queryPath) return `/api/${String(queryPath).replace(/^\/+/, '')}`
  return new URL(request.url ?? '/', 'https://outcome.invalid').pathname
}

const hostedRequest = createStableHostRequestHandler()

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
