import { once } from 'node:events'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { handleStableHostRequest } from '../api/index.mjs'
import { verifyAllDashboardStates } from './browser-assertions.mjs'

const dist = resolve('dist')
if (!existsSync(join(dist, 'index.html'))) throw new Error('stable host browser check requires a production build')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://outcome.local')
  if (url.pathname.startsWith('/api/')) {
    const result = handleStableHostRequest({ method: request.method, pathname: url.pathname })
    response.writeHead(result.status, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(result.body)); return
  }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify({ error: 'read_only' })); return }
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '')
  const candidate = resolve(dist, requested)
  const path = candidate.startsWith(`${dist}/`) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(dist, 'index.html')
  response.writeHead(200, { 'content-type': mime[extname(path)] ?? 'application/octet-stream' })
  if (request.method === 'HEAD') response.end(); else createReadStream(path).pipe(response)
})

server.listen(0, '127.0.0.1'); await once(server, 'listening')
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  try {
    for (const viewport of [
      { name: 'stable-desktop-1440x900', width: 1440, height: 900 },
      { name: 'stable-mobile-390x844', width: 390, height: 844 },
      { name: 'stable-phone-375x812', width: 375, height: 812 },
      { name: 'stable-landscape-844x390', width: 844, height: 390 },
    ]) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage(); await page.goto(`${base}/cherry-note-dashboard`, { waitUntil: 'networkidle' }); await verifyAllDashboardStates(page, viewport.name); await context.close()
    }
  } finally { await browser.close() }
} finally { server.close(); await once(server, 'close') }
