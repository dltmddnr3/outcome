import { createHmac, timingSafeEqual } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectCherryNoteDashboard, sanitizeRemotePayload } from './cherry-note-dashboard.mjs'
import { collectOutcomePackages, loadBindingRegistry, projectPublicPackages } from './outcome-package.mjs'
import { handlePrivateAccessRequest } from './account-access-api.mjs'
import { cleanupPidRecord, writePidRecord } from './runtime-process.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
const json = (response, status, body, headers = {}) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); response.end(JSON.stringify(body)) }
const readBody = async (request) => {
  const chunks = []; let size = 0
  for await (const chunk of request) { chunks.push(chunk); size += chunk.length; if (size > 10_000) throw new Error('request_too_large') }
  const text = Buffer.concat(chunks).toString('utf8')
  return request.headers['content-type']?.startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text || '{}')
}
const constantEqual = (left, right) => { const a = Buffer.from(String(left)); const b = Buffer.from(String(right)); return a.length === b.length && timingSafeEqual(a, b) }
const cookieValue = (request, name) => (request.headers.cookie ?? '').split(';').map((item) => item.trim().split('=')).find(([key]) => key === name)?.[1] ?? ''
const loginHtml = (error = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>OUTCOME · 인증</title></head><body><main><h1>OUTCOME</h1><p>비공개 읽기 전용 접근</p><form method="post" action="/api/auth/login"><label for="outcome-password">접근 암호</label><input id="outcome-password" name="password" type="password" autocomplete="current-password" required><button type="submit">OUTCOME 열기</button></form>${error ? '<p role="alert">인증에 실패했습니다.</p>' : ''}</main></body></html>`

export function readBuildReceipt(root = projectRoot) {
  const read = (revision) => execFileSync('git', ['-C', root, 'rev-parse', revision], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  try {
    const html = existsSync(join(root, 'dist', 'index.html')) ? readFileSync(join(root, 'dist', 'index.html'), 'utf8') : ''
    const asset = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0]?.replace('/assets/', '') ?? null
    return { repository: 'dltmddnr3/outcome', ref: 'main', commit: read('HEAD').slice(0, 12), tree: read('HEAD^{tree}').slice(0, 12), asset, runtimeNowPinned: false }
  } catch { return { repository: 'dltmddnr3/outcome', ref: 'main', commit: null, tree: null, asset: null, runtimeNowPinned: false } }
}

export function createSessionAuth({ password, secret, secureCookies = true, now = () => Date.now() }) {
  if (!password || password.length < 12) throw new Error('OUTCOME_ACCESS_PASSWORD must contain at least 12 characters')
  if (!secret || secret.length < 32) throw new Error('OUTCOME_SESSION_SECRET must contain at least 32 characters')
  const sign = (payload) => createHmac('sha256', secret).update(payload).digest('base64url')
  const issue = () => { const payload = Buffer.from(JSON.stringify({ expiresAt: now() + 12 * 60 * 60 * 1000 })).toString('base64url'); return `${payload}.${sign(payload)}` }
  const verify = (token) => {
    const [payload, signature] = token.split('.'); if (!payload || !signature || !constantEqual(signature, sign(payload))) return false
    try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).expiresAt > now() } catch { return false }
  }
  const cookie = (token, maxAge = 43_200) => `outcome_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`
  return { authenticatePassword: (candidate) => constantEqual(candidate, password), issue, verify, cookie }
}

export function createOutcomeServer(options = {}) {
  const root = options.root ?? projectRoot
  const dist = join(root, 'dist')
  const publicReadOnly = options.publicReadOnly ?? process.env.OUTCOME_PUBLIC_READ_ONLY === '1'
  const auth = publicReadOnly && !(options.password ?? process.env.OUTCOME_ACCESS_PASSWORD) && !(options.secret ?? process.env.OUTCOME_SESSION_SECRET) ? null : createSessionAuth({ password: options.password ?? process.env.OUTCOME_ACCESS_PASSWORD, secret: options.secret ?? process.env.OUTCOME_SESSION_SECRET, secureCookies: options.secureCookies ?? process.env.NODE_ENV === 'production', now: options.now })
  const collect = options.collect ?? (() => collectCherryNoteDashboard())
  const collectPackages = options.collectPackages ?? (() => collectOutcomePackages({ bindingRegistry: loadBindingRegistry() }))
  const buildReceipt = options.buildReceipt ?? readBuildReceipt(root)
  const accountAccess = options.accountAccess
  const decisionRuntime = options.decisionRuntime
  const privateTransitionAdapter = options.privateTransitionAdapter
  const operationsGuard = options.operationsGuard
  const failures = new Map()
  return createServer(async (request, response) => {
    response.setHeader('x-content-type-options', 'nosniff'); response.setHeader('x-frame-options', 'DENY'); response.setHeader('referrer-policy', 'no-referrer'); response.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()')
    response.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    const url = new URL(request.url, 'http://outcome.local')
    const authenticated = Boolean(auth?.verify(cookieValue(request, 'outcome_session')))
    const accessGranted = publicReadOnly || authenticated
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'available', access: publicReadOnly ? 'public_read_only' : 'authentication_required' })
    if (request.method === 'GET' && url.pathname === '/api/auth/session') return json(response, 200, { authenticated, publicReadOnly })
    if (url.pathname.startsWith('/api/private/')) {
      const rate = operationsGuard?.allowRequest({ path: url.pathname, source: request.socket.remoteAddress ?? 'unknown' }) ?? { allowed: true }
      if (!rate.allowed) return json(response, 429, { error: 'rate_limited', retryAfter: rate.retryAfter }, { 'retry-after': String(rate.retryAfter) })
      if (url.pathname === '/api/private/decisions' && request.method === 'POST' && publicReadOnly) return json(response, 405, { error: 'read_only' })
      if (url.pathname === '/api/private/decisions' && request.method === 'POST' && !decisionRuntime) return json(response, 503, { error: 'decision_store_unavailable' })
      if (url.pathname === '/api/private/auth/login' || url.pathname === '/api/private/auth/logout') {
        if (request.method !== 'POST' || !accountAccess || !privateTransitionAdapter) return json(response, 405, { error: 'read_only' })
        const secure = options.secureCookies ?? process.env.NODE_ENV === 'production'
        const cookie = (token, maxAge) => `__session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
        try {
          if (url.pathname.endsWith('/login')) {
            const body = await readBody(request)
            if (!['google', 'email_code'].includes(body.provider)) return json(response, 400, { error: 'provider_not_allowed' })
            const transition = await privateTransitionAdapter.begin({ provider: body.provider })
            if (!transition?.token) return json(response, 503, { error: 'authentication_unavailable' })
            return json(response, 200, { state: 'authenticated', mode: 'injected_adapter' }, { 'set-cookie': cookie(transition.token, 604_800) })
          }
          await privateTransitionAdapter.end({ token: cookieValue(request, '__session') })
          return json(response, 200, { state: 'signed_out', mode: 'injected_adapter' }, { 'set-cookie': cookie('', 0) })
        } catch { return json(response, 503, { error: 'authentication_unavailable' }) }
      }
      let body
      if (url.pathname === '/api/private/decisions' && request.method === 'POST') {
        try { body = await readBody(request) } catch { return json(response, 400, { error: 'invalid_request' }) }
      }
      const value = await handlePrivateAccessRequest({ method: request.method, pathname: url.pathname, token: cookieValue(request, '__session'), service: accountAccess, decisionRuntime, headers: request.headers, origin: request.headers.origin, body })
      return json(response, value.status, value.body, value.headers)
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      if (publicReadOnly || !auth) return json(response, 405, { error: 'read_only' })
      const address = request.socket.remoteAddress ?? 'unknown'; const attempt = failures.get(address) ?? { count: 0, blockedUntil: 0 }
      if (attempt.blockedUntil > Date.now()) return json(response, 429, { error: 'too_many_attempts' })
      const isForm = request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')
      let body; try { body = await readBody(request) } catch { return json(response, 400, { error: 'invalid_request' }) }
      if (!auth.authenticatePassword(body.password)) {
        const count = attempt.count + 1; failures.set(address, { count, blockedUntil: count >= 5 ? Date.now() + 60_000 : 0 })
        if (isForm) { response.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return response.end(loginHtml(true)) }
        return json(response, 401, { error: 'invalid_credentials' })
      }
      failures.delete(address)
      if (isForm) { response.writeHead(303, { location: '/cherry-note-dashboard', 'set-cookie': auth.cookie(auth.issue()), 'cache-control': 'no-store' }); return response.end() }
      return json(response, 200, { authenticated: true }, { 'set-cookie': auth.cookie(auth.issue()) })
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') return publicReadOnly || !auth ? json(response, 405, { error: 'read_only' }) : json(response, 200, { authenticated: false }, { 'set-cookie': auth.cookie('', 0) })
    if (url.pathname.startsWith('/api/')) {
      if (!accessGranted) return json(response, 401, { error: 'authentication_required' })
      if (request.method === 'GET' && url.pathname === '/api/dashboard') {
        try { return json(response, 200, { dashboard: { ...projectPublicPackages(collectPackages()), build: sanitizeRemotePayload(buildReceipt) } }) }
        catch { return json(response, 503, { error: 'project_registry_invalid' }) }
      }
      if (request.method === 'GET' && url.pathname === '/api/dashboard/cherry-note') return json(response, 200, { dashboard: sanitizeRemotePayload(collect()) })
      return json(response, request.method === 'GET' ? 404 : 405, { error: request.method === 'GET' ? 'not_found' : 'read_only' })
    }
    if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'read_only' })
    if (!accessGranted) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      return request.method === 'HEAD' ? response.end() : response.end(loginHtml())
    }
    const requested = url.pathname === '/' || url.pathname === '/cherry-note-dashboard' ? 'index.html' : normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '')
    const candidate = resolve(dist, requested)
    const path = candidate.startsWith(`${resolve(dist)}/`) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(dist, 'index.html')
    if (!existsSync(path)) return json(response, 503, { error: 'build_unavailable' })
    response.writeHead(200, { 'content-type': mime[extname(path)] ?? 'application/octet-stream', 'cache-control': path.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable' })
    if (request.method === 'HEAD') return response.end()
    createReadStream(path).pipe(response)
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.OUTCOME_HOST ?? '127.0.0.1'
  const port = Number(process.env.OUTCOME_PORT ?? 8787)
  const pidFile = join(process.env.OUTCOME_RUNTIME_DIR ?? join(projectRoot, '.outcome-runtime'), 'server.pid')
  const server = createOutcomeServer()
  const cleanup = () => cleanupPidRecord(pidFile, process.pid)
  process.once('exit', cleanup)
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)))
  server.listen(port, host, () => { writePidRecord(pidFile, process.pid); console.log(`OUTCOME listening on http://${host}:${port}`) })
}
