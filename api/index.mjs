import snapshot from '../snapshot/outcome-package-public.json' with { type: 'json' }

const result = (status, body) => ({ status, body })

export function handleStableHostRequest({ method = 'GET', pathname = '/' } = {}) {
  if (method !== 'GET') return result(405, { error: 'read_only' })
  if (pathname === '/api/dashboard') return result(200, { dashboard: snapshot })
  if (pathname === '/api/auth/session') return result(200, { authenticated: false, publicReadOnly: true })
  if (pathname === '/api/health') return result(200, { status: 'available', access: 'public_read_only', source: 'deployment_snapshot' })
  return result(404, { error: 'not_found' })
}
const requestPath = (request) => {
  const queryPath = Array.isArray(request.query?.path) ? request.query.path.join('/') : request.query?.path
  if (queryPath) return `/api/${String(queryPath).replace(/^\/+/, '')}`
  return new URL(request.url ?? '/', 'https://outcome.invalid').pathname
}

export default function handler(request, response) {
  const value = handleStableHostRequest({ method: request.method, pathname: requestPath(request) })
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', value.status === 200 ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  return response.status(value.status).json(value.body)
}
