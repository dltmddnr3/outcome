import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { once } from 'node:events'
import { chromium } from '@playwright/test'
import { createOutcomeServer } from '../server/index.mjs'
import { createAccountModelV2Projection } from '../server/account-model-v2-projection.mjs'

// Real built dashboard with synthetic private identity/data, no external services.
const dashboard = JSON.parse(readFileSync('snapshot/outcome-package-source.json', 'utf8'))
dashboard.build = { repository: 'synthetic/outcome', ref: 'test', commit: null, tree: null, asset: null, runtimeNowPinned: false }
const projects = dashboard.projects.map(project => ({ ...project, modelV2: createAccountModelV2Projection(project, { observedAt: new Date().toISOString() }) }))
const reads = []
let projectionOnly = false
const service = {
 authenticate: async () => ({ subject: 'synthetic' }),
 readWorkspace: async () => ({ viewState: 'ready', workspace: { id: 'synthetic' }, projects: projectionOnly ? projects.map(({project, modelV2}) => ({project, modelV2})) : projects, ...(!projectionOnly && {dashboard}), completionAuthority: false }),
 readWorkObservation: async ({ requestedProjectId }) => ({ projectId: requestedProjectId, observation: null, completionAuthority: false }),
 readConnectionInventory: async ({ requestedProjectId }) => {
  reads.push(requestedProjectId)
  const checkedAtMs = Date.now()
  return { schemaVersion: 1, projectId: requestedProjectId, checkedAtMs, completionAuthority: false, executionAuthority: false,
   entries: ['workspace_api', 'execution_observer', 'mcp', 'provider_api', 'cli', 'environment', 'deployment'].map((id, i) => ({ id, state: i === 0 ? 'access_verified' : 'not_observed', observedAtMs: i === 0 ? checkedAtMs : null })) }
 },
}
const server = createOutcomeServer({ publicReadOnly: true, accountAccess: service })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
 browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
 for (const width of [390, 1440]) for (const only of [false, true]) {
  projectionOnly = only
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort())
  await page.context().addCookies([{ name: '__session', value: 'synthetic', url: base }])
  await page.goto(`${base}/workspace`)
  if (only && width < 1100) {
   const tabs = page.getByRole('navigation', {name:'모바일 작업공간'})
   for (const name of ['대화', '승인', '지도']) {
    await tabs.getByRole('button', {name, exact:true}).click()
    assert.equal(await page.locator(`[data-workspace-panel="${name}"]`).isVisible(), true)
    for (const other of ['지도', '대화', '승인'].filter(item => item !== name)) assert.equal(await page.locator(`[data-workspace-panel="${other}"]`).isVisible(), false)
   }
  }
  if (process.env.OUTCOME_CONNECTION_NAV_DIAGNOSE === '1') {
   await page.waitForLoadState('networkidle')
   console.log(JSON.stringify({ width, errors, text: (await page.locator('body').innerText()).slice(0, 800) }))
   await page.close(); break
  }
  const button = page.getByRole('button', { name: '연결 관리 · 읽기 전용', exact: true })
  await page.locator('.oc-management').waitFor({ state: 'attached' })
  for (const projectId of ['outcome', 'cherry-note']) {
   if (width < 1100) await page.getByRole('button', { name: '전역 탐색 열기', exact: true }).click()
   if (projectId !== 'outcome') {
    await page.locator(`[data-private-project="${projectId}"]`).click()
    if (width < 1100) await page.getByRole('button', { name: '전역 탐색 열기', exact: true }).click()
   }
   await button.click()
   const details = page.locator('[data-projection-field="connection-inventory"] details')
   await page.waitForFunction(() => document.querySelector('[data-projection-field="connection-inventory"] details')?.open === true)
   await page.getByText('접근 확인됨 · 이 조회 기준', { exact: false }).waitFor()
   assert.equal(reads.at(-1), projectId)
   assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SUMMARY')
   assert.equal(await page.locator('#oc-main-content').evaluate(el => el.inert), false)
   if (width < 1100) assert.equal(await page.locator('.oc-global-nav').getAttribute('data-open'), 'false')
   assert.equal(await details.locator('button,input,a').count(), 0)
  }
  assert.deepEqual(errors, [])
  await page.close(); console.log(`PASS built dashboard ${width} projectionOnly=${only}: selected project navigation, disclosure open, focus, inert release, read-only`)
 }
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
