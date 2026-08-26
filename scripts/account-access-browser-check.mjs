import { once } from 'node:events'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
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
const readyDashboard = { ...JSON.parse(readFileSync('snapshot/outcome-package-source.json', 'utf8')), build: { repository: 'test/repo', ref: 'test', commit: null, tree: null, asset: null, runtimeNowPinned: false } }
const readyProjects = readyDashboard.projects
const memoryStore = createInMemoryAccountStore({ workspaces: [{ id: 'workspace', state: 'active' }], memberships: [{ subject: 'owner', workspaceId: 'workspace', role: 'owner-viewer', state: 'active' }], projects: readyProjects.map((projection) => ({ id: projection.project.id, workspaceId: 'workspace', state: 'active', projection })) })
const store = { ...memoryStore, workspaceProjection: (workspaceId) => workspaceId === 'workspace' ? structuredClone(readyDashboard) : null }
const accountAccess = createAccountAccessService({ now, ownerSubject: 'owner', store, authProvider: { verify: async (token) => token === 'valid' ? { subject: 'owner', issuedAt: now(), expiresAt: now() + 60_000, linkedProviders: ['google', 'email_code'] } : null } })
const transitions = []
const loginMeasurements = []
const screenshotDirectory = '.outcome-runtime/account-access-preview-ux'
if (process.env.OUTCOME_ACCOUNT_UX_SCREENSHOTS === '1') mkdirSync(screenshotDirectory, { recursive: true })
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
  ready: { status: 200, body: { workspace: { viewState: 'ready', projects: readyProjects, dashboard: readyDashboard } } },
}

try {
  for (const viewport of [{ name: 'legacy-desktop', width: 1440, height: 900 }, { name: 'legacy-mobile', width: 390, height: 844 }]) {
    for (const pathname of ['/', '/cherry-note-dashboard', '/workspace']) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
      const page = await context.newPage()
      let publicPayloadRequests = 0
      page.on('request', (request) => { if (['/api/dashboard', '/api/dashboard/cherry-note'].includes(new URL(request.url()).pathname)) publicPayloadRequests += 1 })
      await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, access: 'private_read_only', providers: [], sessionMaximumDays: 7, completionAuthority: false }) }))
      await page.route('**/api/private/workspace', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'authentication_required' }) }))
      await page.goto(`${base}${pathname}`)
      await page.locator('[data-state-code="login"]').waitFor()
      const boundary = await page.evaluate(() => ({ projects: document.querySelectorAll('[data-private-project]').length, dashboard: document.querySelectorAll('.oc-dashboard').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
      if (publicPayloadRequests !== 0 || boundary.projects !== 0 || boundary.dashboard !== 0 || boundary.overflow !== 0) throw new Error(`${viewport.name}${pathname} account-only convergence failed requests=${publicPayloadRequests} ${JSON.stringify(boundary)}`)
      await context.close()
    }
  }

  for (const viewport of [{ name: 'macbook', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }, { name: 'phone', width: 375, height: 812 }]) {
    for (const [state, fixture] of Object.entries(states)) {
      if (state === 'ready') continue
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
      const page = await context.newPage()
      await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false }) }))
      await page.route('**/api/private/workspace', (route) => route.fulfill({ status: fixture.status, contentType: 'application/json', body: JSON.stringify(fixture.body) }))
      await page.goto(`${base}/workspace`)
      await page.locator(`[data-state-code="${state}"]`).waitFor()
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
          login: root?.getAttribute('data-account-state') === 'login' ? {
            panelWidth: panel?.width ?? 0,
            headerWidth: header?.width ?? 0,
            googleHeight: document.querySelector('[data-private-login-provider=google]')?.getBoundingClientRect().height ?? 0,
            googleBackground: getComputedStyle(document.querySelector('[data-private-login-provider=google]')).backgroundColor,
            separator: Boolean(document.querySelector('.account-workspace__separator')),
            fallback: Boolean(document.querySelector('.account-workspace__fallback')),
          } : null,
        }
      })
      if (!result.Korean || !result.readOnly || !result.completionFalse || result.horizontalOverflow > 1 || result.intersection !== 0 || result.buttons.some((height) => height < 44) || result.contrast < 4.5) throw new Error(`${viewport.name}/${state} failed ${JSON.stringify(result)}`)
      if (state === 'login' && (!result.login || result.login.panelWidth > Math.min(620, viewport.width - 32) + 1 || result.login.headerWidth > Math.min(620, viewport.width - 32) + 1 || result.login.googleHeight < 44 || result.login.googleBackground !== 'rgb(173, 255, 47)' || !result.login.separator || !result.login.fallback)) throw new Error(`${viewport.name}/login visual contract failed ${JSON.stringify(result.login)}`)
      if (state === 'login') loginMeasurements.push({ viewport: `${viewport.width}x${viewport.height}`, panel: result.login.panelWidth, header: result.login.headerWidth, overflow: result.horizontalOverflow, google: result.login.googleHeight })
      if (state === 'ready') {
        const ready = await page.evaluate(() => ({ projects: document.querySelectorAll('[data-private-project]').length, columns: [...document.querySelectorAll('.account-workspace__hierarchy h3')].map((item) => item.textContent.trim()), current: document.querySelectorAll('[data-actual-current=true][aria-current=step]').length, gates: document.querySelectorAll('.account-workspace__gates li').length, logout: document.querySelector('[data-private-logout=true]')?.getBoundingClientRect().height ?? 0 }))
        if (ready.projects !== 2 || ready.columns.join('|') !== '페이즈|범위|스테이지|완료 조건' || ready.current !== 3 || ready.gates < 1 || ready.logout < 44) throw new Error(`${viewport.name}/ready hierarchy failed ${JSON.stringify(ready)}`)
      }
      if (state === 'login') {
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => ({ provider: document.activeElement?.getAttribute('data-private-login-provider'), outlineWidth: Number.parseFloat(getComputedStyle(document.activeElement).outlineWidth), outlineColor: getComputedStyle(document.activeElement).outlineColor }))
        if (focus.provider !== 'google' || focus.outlineWidth < 3 || focus.outlineColor !== 'rgb(173, 255, 47)') throw new Error(`${viewport.name}/login keyboard focus failed ${JSON.stringify(focus)}`)
        if (process.env.OUTCOME_ACCOUNT_UX_SCREENSHOTS === '1' && ['macbook', 'mobile'].includes(viewport.name)) await page.screenshot({ path: `${screenshotDirectory}/${viewport.name}-${viewport.width}x${viewport.height}-login.png`, fullPage: true })
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
    await page.locator('[data-state-code="login"]').waitFor()
    await page.locator('[data-private-login-provider=google]').focus(); await page.keyboard.press('Enter')
    await page.locator('.account-workspace__loading').waitFor()
    await page.locator('.oc-dashboard').waitFor()
    if (await page.locator('[data-private-project]').count() !== 2) throw new Error(`${viewport.name} project controls missing`)
    const shell = await page.evaluate(() => ({ sidebar: Boolean(document.querySelector('.oc-global-nav')), journey: Boolean(document.querySelector('.oc-outcome-map')), current: document.querySelectorAll('[aria-current=step]').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
    if (!shell.sidebar || !shell.journey || shell.current < 3 || shell.overflow !== 0) throw new Error(`${viewport.name} existing shell failed ${JSON.stringify(shell)}`)
    if (viewport.width <= 390) {
      await page.locator('.oc-outcome-map').evaluate((element) => element.scrollIntoView({ block: 'start' }))
      await page.evaluate(() => window.scrollBy(0, 320))
      const hierarchyFlow = await page.evaluate(() => {
        const intersects = (left, right) => left.right > right.left && right.right > left.left && left.bottom > right.top && right.bottom > left.top
        const wrapper = document.querySelector('.oc-hierarchy-sticky')
        const action = document.querySelector('.oc-show-current-button')?.getBoundingClientRect()
        const visibleOptions = [...document.querySelectorAll('[role=option]')].map((element) => element.getBoundingClientRect()).filter((box) => box.bottom > 0 && box.top < innerHeight)
        return { position: wrapper ? getComputedStyle(wrapper).position : 'missing', overlap: action ? visibleOptions.filter((box) => intersects(action, box)).length : -1, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
      })
      if (hierarchyFlow.position !== 'static' || hierarchyFlow.overlap !== 0 || hierarchyFlow.overflow !== 0) throw new Error(`${viewport.name} mobile hierarchy flow failed ${JSON.stringify(hierarchyFlow)}`)
      await page.evaluate(() => window.scrollTo(0, 0))
    }
    if (process.env.OUTCOME_ACCOUNT_UX_SCREENSHOTS === '1' && ['macbook-ready', 'mobile-ready'].includes(viewport.name)) await page.screenshot({ path: `${screenshotDirectory}/${viewport.name}-${viewport.width}x${viewport.height}-shell.png`, fullPage: true })
    if (viewport.width <= 390) {
      await page.locator('.oc-nav-trigger').click()
      if (process.env.OUTCOME_ACCOUNT_UX_SCREENSHOTS === '1' && viewport.name === 'mobile-ready') await page.screenshot({ path: `${screenshotDirectory}/${viewport.name}-${viewport.width}x${viewport.height}-sidebar.png`, fullPage: false })
    }
    await page.locator('[data-private-project=cherry-note]').click()
    await page.locator('#oc-project-title', { hasText: 'Cherry Note' }).waitFor()
    if (await page.locator('[data-private-project=cherry-note]').getAttribute('aria-current') !== 'page') throw new Error(`${viewport.name} project switch failed`)
    const motion = await page.evaluate(() => [...document.querySelectorAll('.oc-dashboard *')].filter((element) => getComputedStyle(element).animationName !== 'none').length)
    if (motion !== 0) throw new Error(`${viewport.name} reduced motion failed animations=${motion}`)
    const logout = page.locator('[data-private-logout=true]'); if (await logout.evaluate((element) => element.getBoundingClientRect().height) < 44) throw new Error(`${viewport.name} logout touch target`)
    if (viewport.width <= 390) await page.locator('.oc-nav-trigger').click()
    await logout.click(); await page.locator('[data-state-code="login"]').waitFor()
    await context.close()
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.route('**/api/private/auth/login', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'authentication_unavailable' }) }))
    await page.goto(`${base}/workspace`); await page.locator('[data-state-code="login"]').waitFor(); await page.locator('[data-private-login-provider=google]').click()
    await page.locator('.account-workspace__transition-error', { hasText: '검증용 인증 전환을 완료하지 못했습니다.' }).waitFor()
    if (await page.locator('.account-workspace__state-code').getAttribute('data-state-code') !== 'login') throw new Error('injected login failure did not fail closed to login')
    await context.close()
  }

  for (const viewport of [{ name: 'macbook-loading', width: 1440, height: 900 }, { name: 'mobile-loading', width: 390, height: 844 }, { name: 'phone-loading', width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true }) }))
    await page.route('**/api/private/workspace', async (route) => { await new Promise((resolve) => setTimeout(resolve, 1_000)); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspace: {} }) }) })
    await page.goto(`${base}/workspace`)
    await page.locator('.account-workspace__loading').waitFor()
    const loading = await page.evaluate(() => ({
      title: document.querySelector('.account-workspace__loading h1')?.textContent?.trim(),
      detail: document.querySelector('.account-workspace__loading p')?.textContent?.trim(),
      technicalCopy: ['Cherry 전용 비공개 워크스페이스', '권한 확인 중', '서버에서', 'completionAuthority=false'].filter((value) => document.body.innerText.includes(value)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      busy: document.querySelector('.account-workspace__loading')?.getAttribute('aria-busy'),
    }))
    if (loading.title !== '로그인 중' || loading.detail !== '잠시만 기다려 주세요.' || loading.technicalCopy.length || loading.overflow !== 0 || loading.busy !== 'true') throw new Error(`${viewport.name} simplified loading failed ${JSON.stringify(loading)}`)
    if (viewport.width <= 390) await page.evaluate(() => { document.documentElement.style.zoom = '2' })
    if (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) !== 0) throw new Error(`${viewport.name} 200% zoom horizontal overflow`)
    await context.close()
  }
  if (transitions.length !== 6 || transitions.filter(([action]) => action === 'login').length !== 3 || transitions.filter(([action]) => action === 'logout').length !== 3) throw new Error(`injected transition count failed ${JSON.stringify(transitions)}`)
  console.log(`account access browser PASS: account-only legacy convergence=6/6 with anonymous project payload requests=0; Clerk SDK browser markers present with no server callback/session-token handoff; 3 viewports x ${Object.keys(states).length - 1} non-ready states + loading + ready existing-shell login/logout hierarchy; login=${JSON.stringify(loginMeasurements)}; non-ready mobile/phone 200% zoom overflow=0; ready shell overflow=0; touch>=44; project switch preserved`)
} finally {
  server.close(); await once(server, 'close'); await browser.close()
}
