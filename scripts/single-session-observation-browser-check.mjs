import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

// Isolated synthetic component reproduction. No owner session, provider or API.
const compiled = await build({ stdin: { contents: `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {SingleSessionObservation} from './src/components/SingleSessionObservation';
const root=createRoot(document.getElementById('root'));
window.renderObservation=value=>root.render(<div className="current-projection"><div className="current-projection__sequence"><SingleSessionObservation observation={value}/></div></div>);
window.unmountObservation=()=>root.unmount();
window.renderObservation(undefined);
`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', define: { 'process.env.NODE_ENV': '"production"' }, jsx: 'automatic' })
const css = readFileSync('src/styles.css', 'utf8')
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(compiled.outputFiles[0].text); return }
  if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end('<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>')
})
server.listen(0, '127.0.0.1'); await once(server, 'listening')
let browser
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    const origin = `http://127.0.0.1:${server.address().port}`
    await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort())
    await page.clock.install({ time: new Date(20000) })
    await page.goto(origin); await page.getByRole('heading', { name: '연결 확인 전' }).waitFor()
    await page.evaluate(() => {
      window.observerTimers = new Set()
      const originalSet = window.setInterval, originalClear = window.clearInterval
      window.setInterval = (...args) => { const id = originalSet(...args); window.observerTimers.add(id); return id }
      window.clearInterval = id => { window.observerTimers.delete(id); return originalClear(id) }
      window.renderObservation({ schemaVersion: 1, observedAtMs: Date.now(), completionAuthority: false, executionAuthority: false,
        work: { stage: 'implementing', activity: 'running', freshness: 'fresh', evidenceStatus: 'reference_only_unverified', continuation: 'next_action_recorded' },
        runtime: { state: 'active' }, privateLocator: 'never-render-this' })
    })
    await page.getByRole('heading', { name: '실행 관측됨', exact: true }).waitFor()
    const cdp = await page.context().newCDPSession(page)
    const ax = await cdp.send('Accessibility.getFullAXTree')
    const names = ax.nodes.map(node => node.name?.value)
    for (const literal of ['실행 관측됨', '다음 단계 기록됨 · 실행과 별개', '근거 참조 있음 · 내용 검증과 별개']) assert(names.includes(literal), `raw AX missing: ${literal}`)
    assert(!(await page.locator('body').innerText()).includes('never-render-this'))
    assert.equal(await page.locator('button,a,input').count(), 0)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'document overflow')
    if (process.env.OUTCOME_OBSERVER_SCREENSHOTS === '1') await page.screenshot({ path: `/tmp/outcome-single-session-observer-${width}.png`, fullPage: true })
    await page.clock.fastForward(16001)
    await page.getByRole('heading', { name: '새 관측 필요' }).waitFor()
    assert(!(await page.locator('body').innerText()).includes('실행 관측됨'))
    await page.evaluate(() => window.unmountObservation())
    assert.equal(await page.evaluate(() => window.observerTimers.size), 0)
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`PASS synthetic Chrome width=${width}: raw AX, expiry, privacy, overflow, unmount, console`)
  }
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
