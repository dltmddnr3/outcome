import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

// Synthetic isolated browser: no owner credentials or external requests.
const compiled = await build({ stdin: { contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {ConnectionInventory} from './src/components/ConnectionInventory';
import {fetchPrivateWorkspace} from './src/lib/api';
const root=createRoot(document.getElementById('root'));
window.selectProject=id=>root.render(<div className="current-projection"><div className="current-projection__sequence"><ConnectionInventory key={id} projectId={id}/></div></div>);
window.init=async()=>{await fetchPrivateWorkspace('synthetic');window.selectProject('outcome')}; window.init();
`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } })
const css = readFileSync('src/styles.css', 'utf8')
const server = createServer((req, res) => {
 if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(compiled.outputFiles[0].text) }
 if (req.url === '/app.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css) }
 res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script></html>')
})
server.listen(0, '127.0.0.1'); await once(server, 'listening')
const origin = `http://127.0.0.1:${server.address().port}`
let browser
try {
 browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
 for (const width of [320, 390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } }), errors = []
  let reads = 0, denied = false
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => {
   const url = route.request().url()
   if (!url.startsWith(origin + '/')) return route.abort()
   if (url.endsWith('/api/private/workspace')) return route.fulfill({ json: { workspace: { projects: ['outcome', 'cherry-note'].map(id => ({ project: { id } })) } } })
   if (url.includes('/api/private/connections/')) {
    reads++
    if (denied) return route.fulfill({ status: 401, json: { error: 'session_revoked' } })
    return route.fulfill({ json: { schemaVersion: 1, projectId: url.split('/').at(-1), checkedAtMs: 20000, completionAuthority: false, executionAuthority: false,
     entries: ['workspace_api', 'execution_observer', 'mcp', 'provider_api', 'cli', 'environment', 'deployment'].map((id, i) => ({ id, state: i === 0 ? 'access_verified' : 'not_observed', observedAtMs: i === 0 ? 20000 : null })) } })
   }
   return route.continue()
  })
  await page.clock.install({ time: new Date(18000) }) // Server clock is two seconds ahead.
  await page.goto(origin); await page.locator('summary').waitFor()
  assert.equal(reads, 0)
  await page.locator('summary').click(); await page.getByText('접근 확인됨 · 이 조회 기준', { exact: false }).waitFor()
  assert.equal(reads, 1)
  const cdp = await page.context().newCDPSession(page), ax = await cdp.send('Accessibility.getFullAXTree')
  for (const label of ['프로젝트 접근', '작업 관측', 'MCP 도구', '외부 서비스 API', '로컬 실행 도구', '실행 환경', '배포 상태']) assert(ax.nodes.some(node => node.name?.value === label), `AX missing ${label}`)
  assert.equal(await page.locator('button,input,a').count(), 0)
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`)
  await page.clock.fastForward(16001); await page.getByText('새 관측 필요', { exact: false }).waitFor()
  await page.locator('summary').click(); const count = reads
  await page.clock.fastForward(30000); assert.equal(reads, count)
  await page.evaluate(() => window.selectProject('cherry-note')); await page.locator('summary').waitFor()
  assert(!(await page.locator('body').innerText()).includes('접근 확인됨'))
  denied = true
  const denial = page.waitForResponse(response => response.url().includes('/api/private/connections/') && response.status() === 401)
  await page.locator('summary').click(); await denial; await page.getByText('연결 상태 확인 전', { exact: false }).waitFor()
  await page.waitForFunction(() => !document.body.innerText.includes('접근 확인됨'))
  assert.deepEqual(errors, [])
  await page.close(); console.log(`PASS synthetic Chrome ${width}: closed no-read, open GET, raw AX, stale original time, close stop, project reset, denial, overflow`)
 }
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
