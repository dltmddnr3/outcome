import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

// Isolated synthetic component/API reproduction. No owner session or provider.
const compiled = await build({ stdin: { contents: `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {SingleSessionObservation} from './src/components/SingleSessionObservation';
import {fetchPrivateWorkspace,endPrivateSession,capturePrivateDecisionBindingVersion,captureDestinationReviewBinding} from './src/lib/api';
const root=createRoot(document.getElementById('root'));
window.renderObservation=value=>root.render(<div className="current-projection"><div className="current-projection__sequence"><SingleSessionObservation observation={value}/></div></div>);
window.unmountObservation=()=>root.unmount();
window.initializeWorkspace=async()=>{await fetchPrivateWorkspace('fixture-owner',async()=>'fixture-fresh');window.bindingVersion=capturePrivateDecisionBindingVersion();window.reviewCurrent=captureDestinationReviewBinding();};
window.bindingUnchanged=()=>window.bindingVersion===capturePrivateDecisionBindingVersion()&&window.reviewCurrent();
window.switchProject=id=>root.render(<div className="current-projection"><div className="current-projection__sequence"><SingleSessionObservation key={id} projectId={id}/></div></div>);
window.logoutFixture=()=>endPrivateSession();
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

    const live = await browser.newPage({ viewport: { width, height: 900 } })
    const liveErrors = [], reads = []; let held, secondRouteObserved
    const secondRoute = new Promise(resolve => { secondRouteObserved = resolve })
    live.on('pageerror', error => liveErrors.push(error.message))
    await live.route('**/*', async route => {
      const url = route.request().url()
      if (!url.startsWith(origin + '/')) return route.abort()
      if (!url.includes('/api/')) return route.continue()
      assert.equal(route.request().method(), url.endsWith('/logout') ? 'POST' : 'GET')
      if (url.endsWith('/workspace')) return route.fulfill({ json: { workspace: { projects: ['outcome', 'cherry-note'].map(id => ({ project: { id } })) } }, headers: { etag: '"unchanged-source"', 'x-outcome-csrf': 'synthetic-decision', 'x-outcome-destination-csrf': 'synthetic-destination' } })
      if (url.endsWith('/logout')) return route.fulfill({ json: {} })
      const projectId = url.split('/').at(-1)
      assert(url.includes('/api/private/work-observation/'))
      assert.equal(route.request().headers().authorization, 'Bearer fixture-fresh')
      assert(!route.request().headers()['x-outcome-csrf'])
      reads.push(projectId)
      if (reads.length === 2) { held = route; secondRouteObserved(); return }
      return route.fulfill({ json: { projectId, completionAuthority: false, observation: { schemaVersion: 1, observedAtMs: 20000, completionAuthority: false, executionAuthority: false,
        work: { stage: 'implementing', activity: 'running', freshness: 'fresh', evidenceStatus: 'missing', continuation: 'observing' }, runtime: { state: projectId === 'outcome' ? 'active' : 'waiting_user' } } } })
    })
    await live.clock.install({ time: new Date(20000) }); await live.goto(origin)
    await live.getByRole('heading', { name: '연결 확인 전' }).waitFor()
    await live.evaluate(async () => { await window.initializeWorkspace(); window.switchProject('outcome') })
    await live.getByRole('heading', { name: '실행 관측됨', exact: true }).waitFor()
    assert.equal(await live.evaluate(() => window.bindingUnchanged()), true)
    const nextRead = live.waitForRequest(request => request.url().endsWith('/work-observation/outcome'))
    await live.clock.fastForward(11000)
    await nextRead
    // A client request event precedes interception. Observe the actual handler
    // rather than asserting its side effects have already happened.
    await Promise.race([secondRoute, new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('second route not observed')), 5000); timer.unref() })])
    assert.equal(reads.length, 2)
    await live.evaluate(() => window.switchProject('cherry-note'))
    await live.getByRole('heading', { name: '답변 대기', exact: true }).waitFor()
    await held.fulfill({ json: { projectId: 'outcome', observation: { rawPrompt: 'late-private-value' }, completionAuthority: false } }).catch(() => {})
    assert(!(await live.locator('body').innerText()).includes('late-private-value'))
    const liveCdp = await live.context().newCDPSession(live)
    assert((await liveCdp.send('Accessibility.getFullAXTree')).nodes.some(node => node.name?.value === '답변 대기'))
    await live.evaluate(() => window.logoutFixture()); await live.clock.fastForward(10000)
    await live.getByRole('heading', { name: '연결 확인 전', exact: true }).waitFor()
    const count = reads.length; await live.clock.fastForward(120000); assert.equal(reads.length, count)
    await live.evaluate(() => window.unmountObservation()); assert.deepEqual(liveErrors, [])
    await live.close()
    console.log(`PASS synthetic Chrome width=${width}: scoped refresh, unchanged bindings, cross-project late response, logout stop`)
  }
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
