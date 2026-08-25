import { once } from 'node:events'
import { readFileSync, readdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { createAccountAccessService, createInMemoryAccountStore } from '../server/account-access.mjs'
import { createOutcomeServer } from '../server/index.mjs'

const builtBrowser = readdirSync('dist/assets').filter((name) => name.endsWith('.js')).map((name) => readFileSync(`dist/assets/${name}`, 'utf8')).join('\n')
for (const marker of ['oauth_google', 'oauth_apple', '/workspace/sso-callback']) {
  if (!builtBrowser.includes(marker)) throw new Error(`Clerk browser integration missing from production asset: ${marker}`)
}
for (const marker of ['sessionPresent', 'ownerVerified', 'data-private-logout', 'data-private-link-provider']) {
  if (!builtBrowser.includes(marker)) throw new Error(`Clerk revoked-session recovery boundary missing from production asset: ${marker}`)
}
if (builtBrowser.includes('/api/private/auth/callback') || builtBrowser.includes('sessionToken')) throw new Error('production browser asset contains forbidden server callback/session token handoff')

const now = () => Date.parse('2026-08-25T00:00:00.000Z')
const readyProjects = [
  { project: { id: 'cherry-note', name: 'Cherry Note' }, phases: [{ id: 'cherry-phase', title: '체리 단계', scopes: [{ id: 'cherry-scope', title: '체리 범위', stages: [{ id: 'cherry-current', title: '체리 실제 현재', gate: { gates: [{ id: 'C1', title: '현재 완료 조건', closed: false }] } }, { id: 'cherry-next', title: '체리 탐색 대상', gate: { gates: [{ id: 'C2', title: '탐색 완료 조건', closed: true }] } }] }] }], current: { phaseId: 'cherry-phase', scopeId: 'cherry-scope', stageId: 'cherry-current' } },
  { project: { id: 'outcome', name: 'OUTCOME' }, phases: [{ id: 'outcome-phase', title: '아웃컴 단계', scopes: [{ id: 'outcome-scope', title: '아웃컴 범위', stages: [{ id: 'outcome-current', title: '아웃컴 실제 현재', gate: { gates: [{ id: 'O1', title: '아웃컴 완료 조건', closed: false }] } }] }] }], current: { phaseId: 'outcome-phase', scopeId: 'outcome-scope', stageId: 'outcome-current' } },
]
const store = createInMemoryAccountStore({ workspaces: [{ id: 'workspace', state: 'active' }], memberships: [{ subject: 'owner', workspaceId: 'workspace', role: 'owner-viewer', state: 'active' }], projects: readyProjects.map((projection) => ({ id: projection.project.id, workspaceId: 'workspace', state: 'active', projection })) })
const accountAccess = createAccountAccessService({ now, ownerSubject: 'owner', store, authProvider: { verify: async (token) => token === 'valid' ? { subject: 'owner', issuedAt: now(), expiresAt: now() + 60_000, linkedProviders: ['google', 'email_code'] } : null } })
const transitions = []
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const server = createOutcomeServer({ publicReadOnly: true, accountAccess, secureCookies: false, privateTransitionAdapter: {
  begin: async ({ provider }) => { transitions.push(['login', provider]); await new Promise((resolve) => setTimeout(resolve, 80)); return { token: 'valid' } },
  end: async () => { transitions.push(['logout']); return { state: 'signed_out' } },
} })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
const base = `http://127.0.0.1:${server.address().port}`
const states = {
  login: { status: 401, body: { error: 'authentication_required' } },
  empty: { status: 200, body: { workspace: { viewState: 'empty' } } },
  stale: { status: 200, body: { workspace: { viewState: 'stale' } } },
  conflict: { status: 403, body: { error: 'membership_conflict' } },
  unavailable: { status: 503, body: { error: 'private_workspace_unavailable' } },
  session_expired: { status: 401, body: { error: 'session_expired' } },
  access_denied: { status: 403, body: { error: 'project_access_denied' } },
  safe_degraded: { status: 200, body: { workspace: { viewState: 'safe_degraded' } } },
  ready: { status: 200, body: { workspace: { viewState: 'ready', projects: readyProjects } } },
}

try {
  for (const viewport of [{ name: 'macbook', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }, { name: 'phone', width: 375, height: 812 }]) {
    for (const [state, fixture] of Object.entries(states)) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
      const page = await context.newPage()
      await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false }) }))
      await page.route('**/api/private/workspace', (route) => route.fulfill({ status: fixture.status, contentType: 'application/json', body: JSON.stringify(fixture.body) }))
      await page.goto(`${base}/workspace`)
      await page.locator('.account-workspace__state-code', { hasText: state }).waitFor()
      const result = await page.evaluate(() => {
        const root = document.querySelector('.account-workspace')
        const header = document.querySelector('.account-workspace__header')?.getBoundingClientRect()
        const panel = document.querySelector('.account-workspace__state')?.getBoundingClientRect()
        const buttons = [...document.querySelectorAll('.account-workspace button')].map((element) => element.getBoundingClientRect().height)
        const rgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number); const luminance = (value) => { const channels = rgb(value).map((channel) => { const normalized = channel / 255; return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4 }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] }; const paragraph = document.querySelector('.account-workspace__state p'); const foreground = luminance(getComputedStyle(paragraph).color); const background = luminance(getComputedStyle(root).backgroundColor); const contrast = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05)
        return {
          Korean: document.body.innerText.includes('Cherry 전용 비공개 워크스페이스'),
          readOnly: document.body.innerText.includes('읽기 전용'),
          completionFalse: root?.getAttribute('data-completion-authority') === 'false',
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          intersection: header && panel ? Math.max(0, Math.min(header.bottom, panel.bottom) - Math.max(header.top, panel.top)) : -1,
          buttons,
          contrast,
        }
      })
      if (!result.Korean || !result.readOnly || !result.completionFalse || result.horizontalOverflow > 1 || result.intersection !== 0 || result.buttons.some((height) => height < 44) || result.contrast < 4.5) throw new Error(`${viewport.name}/${state} failed ${JSON.stringify(result)}`)
      if (state === 'ready') {
        const ready = await page.evaluate(() => ({ projects: document.querySelectorAll('[data-private-project]').length, columns: [...document.querySelectorAll('.account-workspace__hierarchy h3')].map((item) => item.textContent.trim()), current: document.querySelectorAll('[data-actual-current=true][aria-current=step]').length, gates: document.querySelectorAll('.account-workspace__gates li').length, logout: document.querySelector('[data-private-logout=true]')?.getBoundingClientRect().height ?? 0 }))
        if (ready.projects !== 2 || ready.columns.join('|') !== '페이즈|범위|스테이지|완료 조건' || ready.current !== 3 || ready.gates < 1 || ready.logout < 44) throw new Error(`${viewport.name}/ready hierarchy failed ${JSON.stringify(ready)}`)
      }
      if (state === 'login') {
        await page.keyboard.press('Tab')
        if (await page.evaluate(() => document.activeElement?.tagName) !== 'BUTTON') throw new Error(`${viewport.name}/login keyboard focus failed`)
      }
      if (viewport.width <= 390) {
        await page.evaluate(() => { document.documentElement.style.zoom = '2' })
        const zoom = await page.evaluate(() => { const visible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0 }; const text = [...document.querySelectorAll('.account-workspace *')].filter((element) => visible(element) && element.textContent.trim() && element.children.length === 0); return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, undersized: text.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 11).map((element) => element.textContent.trim()), hidden: text.filter((element) => { const style = getComputedStyle(element); return (style.overflowX === 'hidden' || style.textOverflow === 'ellipsis') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) }).map((element) => element.textContent.trim()) } })
        if (zoom.overflow !== 0 || zoom.undersized.length || zoom.hidden.length) throw new Error(`${viewport.name}/${state} 200% zoom failed ${JSON.stringify(zoom)}`)
      }
      await context.close()
    }
  }

  for (const viewport of [{ name: 'macbook-ready', width: 1440, height: 900 }, { name: 'mobile-ready', width: 390, height: 844 }, { name: 'phone-ready', width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(`${base}/workspace`)
    await page.locator('.account-workspace__state-code', { hasText: 'login' }).waitFor()
    await page.locator('[data-private-login-provider=google]').focus(); await page.keyboard.press('Enter')
    await page.locator('.account-workspace__state-code', { hasText: 'loading' }).waitFor()
    await page.locator('.account-workspace__state-code', { hasText: 'ready' }).waitFor()
    if (await page.locator('[data-private-project]').count() !== 2) throw new Error(`${viewport.name} project controls missing`)
    await page.locator('[data-private-stage=cherry-next]').click()
    const selection = await page.evaluate(() => ({ actualCurrent: document.querySelector('[data-private-stage=cherry-current]')?.getAttribute('aria-current'), actualSelected: document.querySelector('[data-private-stage=cherry-current]')?.getAttribute('aria-selected'), touchedCurrent: document.querySelector('[data-private-stage=cherry-next]')?.getAttribute('aria-current'), touchedSelected: document.querySelector('[data-private-stage=cherry-next]')?.getAttribute('aria-selected'), actualText: document.querySelector('[data-private-actual]')?.textContent, selectedText: document.querySelector('[data-private-selected]')?.textContent }))
    if (selection.actualCurrent !== 'step' || selection.actualSelected !== 'false' || selection.touchedCurrent !== null || selection.touchedSelected !== 'true' || !selection.actualText?.includes('체리 실제 현재') || !selection.selectedText?.includes('체리 탐색 대상')) throw new Error(`${viewport.name} current-vs-selected failed ${JSON.stringify(selection)}`)
    await page.locator('[data-private-project=outcome]').focus(); await page.keyboard.press('Enter')
    const outcomePressed = await page.locator('[data-private-project=outcome]').getAttribute('aria-pressed'); const outcomeGate = await page.locator('.account-workspace__gates').textContent()
    if (outcomePressed !== 'true' || !outcomeGate.includes('아웃컴 완료 조건')) throw new Error(`${viewport.name} project switch failed`)
    const motion = await page.evaluate(() => [...document.querySelectorAll('.account-workspace *')].filter((element) => getComputedStyle(element).animationName !== 'none').length)
    if (motion !== 0) throw new Error(`${viewport.name} reduced motion failed animations=${motion}`)
    if (viewport.width <= 390) {
      await page.evaluate(() => { document.documentElement.style.zoom = '2' })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow !== 0) throw new Error(`${viewport.name} ready 200% zoom overflow=${overflow}`)
      await page.evaluate(() => { document.documentElement.style.zoom = '1' })
    }
    const logout = page.locator('[data-private-logout=true]'); if (await logout.evaluate((element) => element.getBoundingClientRect().height) < 44) throw new Error(`${viewport.name} logout touch target`)
    await logout.click(); await page.locator('.account-workspace__state-code', { hasText: 'login' }).waitFor()
    await context.close()
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.route('**/api/private/auth/login', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'authentication_unavailable' }) }))
    await page.goto(`${base}/workspace`); await page.locator('.account-workspace__state-code', { hasText: 'login' }).waitFor(); await page.locator('[data-private-login-provider=google]').click()
    await page.locator('.account-workspace__transition-error', { hasText: '검증용 인증 전환을 완료하지 못했습니다.' }).waitFor()
    if (await page.locator('.account-workspace__state-code').textContent() !== 'login') throw new Error('injected login failure did not fail closed to login')
    await context.close()
  }

  for (const viewport of [{ name: 'macbook-loading', width: 1440, height: 900 }, { name: 'mobile-loading', width: 390, height: 844 }, { name: 'phone-loading', width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true }) }))
    await page.route('**/api/private/workspace', async (route) => { await new Promise((resolve) => setTimeout(resolve, 1_000)); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspace: {} }) }) })
    await page.goto(`${base}/workspace`)
    await page.locator('.account-workspace__state-code', { hasText: 'loading' }).waitFor()
    if (viewport.width <= 390) await page.evaluate(() => { document.documentElement.style.zoom = '2' })
    if (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) !== 0) throw new Error(`${viewport.name} 200% zoom horizontal overflow`)
    await context.close()
  }
  if (transitions.length !== 6 || transitions.filter(([action]) => action === 'login').length !== 3 || transitions.filter(([action]) => action === 'logout').length !== 3) throw new Error(`injected transition count failed ${JSON.stringify(transitions)}`)
  console.log(`account access browser PASS: Clerk SDK browser markers present with no server callback/session-token handoff; 3 viewports x ${Object.keys(states).length} settled states + loading + ready login/logout hierarchy; mobile/phone 200% zoom overflow=0; touch>=44; current-vs-selected preserved`)
} finally {
  server.close(); await once(server, 'close'); await browser.close()
}
