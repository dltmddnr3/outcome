import { once } from 'node:events'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { createAccountAccessService, createInMemoryAccountStore } from '../server/account-access.mjs'
import { createAccountModelV2Projection } from '../server/account-model-v2-projection.mjs'
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
const hostileMilestoneSlug = 'q2-independent-qa'
const roleEvents = ['planner', 'builder', 'ux_product_qa', 'release_audit'].map((role, index) => ({ id: `event-${role.replaceAll('_', '-')}-1`, sequence: index + 1, role, type: 'work_observed', summary: `${role} public observation`, observedAt: `2026-08-31T00:0${index + 1}:00.000Z`, status: 'observed' }))
const hostileProjection = createAccountModelV2Projection({ project: { id: 'outcome', name: 'OUTCOME', outcome: 'One safe outcome' }, current: { phaseId: 'destination-one' }, phases: [{ id: 'destination-one', title: 'Destination', purpose: 'Safe outcome', scopes: [{ stages: [{ id: 'milestone-one', title: hostileMilestoneSlug, purpose: 'User result', dependsOn: [], gate: { sourceRef: 'GATES.md', gates: [{ id: 'B1', title: 'Server projection', closed: false }] } }] }] }], events: roleEvents }, { observedAt: '2026-08-31T00:00:00.000Z' })
const blockedProjection = Object.freeze({ ...createAccountModelV2Projection({ project: { id: 'outcome', name: 'OUTCOME', outcome: 'One safe outcome' }, blocked: true, events: [{ id: 'event-builder-blocked', sequence: 7, role: 'builder', type: 'result_observed', summary: '고정 근거가 없어 안전 보류', observedAt: '2026-09-04T02:00:00.000Z', status: 'safe_hold' }] }, { observedAt: '2026-09-04T02:00:00.000Z' }), cherryActionLabel: '후보 화면을 확인한다' })
if (JSON.stringify(hostileProjection).includes(hostileMilestoneSlug) || hostileProjection.readyBoundaryLabels.length !== 0) throw new Error('hostile milestone slug survived API projection')
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

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    let browserErrors = 0
    page.on('pageerror', () => { browserErrors += 1 })
    page.on('console', (message) => { if (message.type() === 'error') browserErrors += 1 })
    await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, access: 'private_read_only', providers: [], sessionMaximumDays: 7, completionAuthority: false }) }))
    const hostileProjects = readyProjects.map((project) => project.project.id === 'outcome' ? { ...project, modelV2: hostileProjection } : project)
    await page.route('**/api/private/workspace', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspace: { viewState: 'ready', projects: hostileProjects, dashboard: readyDashboard } }) }))
    await page.goto(`${base}/workspace`)
    await page.locator('.current-projection').waitFor()
    await page.locator('details.oc-v1-compatibility > summary').click()
    for (const [index, label] of ['Planner', 'Builder', 'UX & Product QA', 'Release Audit'].entries()) {
      const filter = page.locator('.planner-conversation__filters button').nth(index + 1)
      if ((await filter.textContent())?.trim() !== label) throw new Error(`role lens filter order drifted at ${label}`)
      await filter.evaluate((element) => element.click())
      const event = page.locator(`[data-event-id="${roleEvents[index].id}"]`)
      if (await event.count() !== 1 || await event.getAttribute('data-event-sequence') !== String(index + 1) || await event.getAttribute('data-event-role') !== roleEvents[index].role || await page.locator('[data-non-progress-boundary="true"]').count() !== 1) throw new Error(`role lens ${label} lost stable projected identity or non-progress boundary`)
    }
    if (!await page.locator('[data-event-role="release_audit"] small', { hasText: '완료 판정 권한 없음' }).count()) throw new Error('release audit lens gained completion authority')
    const visual = await page.evaluate(() => {
      const node = document.querySelector('.oc-map-column button[role=option]>i.complete')
      const nodeStyle = node ? getComputedStyle(node) : null
      const markerStyle = node ? getComputedStyle(node, '::after') : null
      const rail = document.querySelector('.oc-project-progress-track')
      const colors = ['', 'current', 'complete'].map((className) => { const element = document.createElement('i'); element.className = className; rail?.append(element); const color = getComputedStyle(element).backgroundColor; element.remove(); return color })
      const rgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const luminance = (value) => { const channels = rgb(value).map((channel) => { const normalized = channel / 255; return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4 }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] }
      const contrast = (left, right) => { const values = [luminance(left), luminance(right)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05) }
      return { node: nodeStyle && markerStyle ? { width: nodeStyle.width, height: nodeStyle.height, background: nodeStyle.backgroundColor, image: nodeStyle.backgroundImage, shadow: nodeStyle.boxShadow, markerWidth: markerStyle.width, markerHeight: markerStyle.height, markerBackground: markerStyle.backgroundColor } : null, colors, contrasts: [contrast(colors[0], colors[1]), contrast(colors[1], colors[2])] }
    })
    if (!visual.node || visual.node.width !== '22px' || visual.node.height !== '22px' || visual.node.background !== 'rgb(21, 26, 21)' || visual.node.image !== 'none' || visual.node.shadow !== 'none' || visual.node.markerWidth !== '7px' || visual.node.markerHeight !== '7px' || visual.node.markerBackground !== 'rgb(173, 255, 47)' || visual.contrasts.some((value) => value < 3)) throw new Error(`role chat visual contract failed ${JSON.stringify(visual)}`)
    const hostile = await page.evaluate((slug) => ({ apiFieldCount: document.querySelectorAll('[data-projection-field=boundary] li').length, markup: document.documentElement.outerHTML.includes(slug), visible: document.body.innerText.includes(slug), accessibility: document.body.textContent.includes(slug), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }), hostileMilestoneSlug)
    if (hostile.apiFieldCount !== 0 || hostile.markup || hostile.visible || hostile.accessibility || hostile.overflow !== 0 || browserErrors !== 0) throw new Error(`hostile milestone built boundary failed ${JSON.stringify({ ...hostile, browserErrors })}`)
    await context.close()
  }

  for (const viewport of [{ name: 'macbook-ready', width: 1440, height: 900 }, { name: 'mobile-ready', width: 390, height: 844 }, { name: 'narrow-ready', width: 320, height: 720 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(`${base}/workspace`)
    await page.locator('[data-state-code="login"]').waitFor()
    await page.locator('[data-private-login-provider=google]').focus(); await page.keyboard.press('Enter')
    await page.locator('.account-workspace__loading').waitFor()
    await page.locator('.oc-dashboard').waitFor()
    if (await page.locator('[data-private-project]').count() !== 2) throw new Error(`${viewport.name} project controls missing`)
    const shell = await page.evaluate(() => {
      const projection = document.querySelector('.current-projection'); const conversation = document.querySelector('.planner-conversation')
      const projectionBox = projection?.getBoundingClientRect(); const conversationBox = conversation?.getBoundingClientRect()
      return { sidebar: Boolean(document.querySelector('.oc-global-nav')), journey: Boolean(document.querySelector('.oc-outcome-map')), current: document.querySelectorAll('[aria-current=step]').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, approvedBoundaryLabels: [...document.querySelectorAll('[data-projection-field=boundary] li')].map((item) => item.textContent?.trim()).filter(Boolean), semanticProjectionFirst: Boolean(projection && conversation && (projection.compareDocumentPosition(conversation) & Node.DOCUMENT_POSITION_FOLLOWING)), visualProjectionFirst: innerWidth <= 760 ? Boolean(projectionBox && conversationBox && conversationBox.top < projectionBox.top) : Boolean(projectionBox && conversationBox && projectionBox.left < conversationBox.left), rawActionSlugVisible: ['q2-independent-qa', 'verify-coherent-slice', 'resolve-blocker', 'resolve_blocker'].some((value) => document.body.innerText.includes(value)) }
    })
    if (!shell.sidebar || !shell.journey || shell.current < 3 || shell.overflow !== 0 || shell.approvedBoundaryLabels.length === 0 || !shell.semanticProjectionFirst || !shell.visualProjectionFirst || shell.rawActionSlugVisible) throw new Error(`${viewport.name} existing shell failed ${JSON.stringify(shell)}`)
    if (viewport.width === 1440) {
      await page.setViewportSize({ width: 720, height: 900 })
      const zoom = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, semanticProjectionFirst: Boolean(document.querySelector('.current-projection')?.compareDocumentPosition(document.querySelector('.planner-conversation')) & Node.DOCUMENT_POSITION_FOLLOWING) }))
      if (zoom.overflow !== 0 || !zoom.semanticProjectionFirst) throw new Error(`${viewport.name} ready 200% reflow failed ${JSON.stringify(zoom)}`)
      await page.setViewportSize({ width: 1440, height: 900 })
    }
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

  for (const decisionProbe of [{ name: 'desktop-pointer', viewport: { width: 1440, height: 900 }, activation: 'pointer' }, { name: 'mobile-keyboard', viewport: { width: 390, height: 844 }, activation: 'keyboard' }]) {
    const context = await browser.newContext({ viewport: decisionProbe.viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const decisionRequests = []
    await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, access: 'private_read_only', providers: [], sessionMaximumDays: 7, completionAuthority: false }) }))
    await page.route('**/api/private/workspace', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { etag: '"browser-revision"', 'x-outcome-csrf': 'browser-csrf-secret' }, body: JSON.stringify({ workspace: { viewState: 'ready', projects: [{ ...readyProjects.find((project) => project.project.id === 'outcome'), modelV2: blockedProjection }], dashboard: readyDashboard } }) }))
    await page.route('**/api/private/decisions', async (route) => { decisionRequests.push({ headers: route.request().headers(), body: route.request().postDataJSON() }); await new Promise((resolve) => setTimeout(resolve, 80)); if (decisionRequests.length > 1) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'decision_store_unavailable' }) }); else await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ decisionState: 'recorded', decision: 'approved', rejectionReason: null, decidedAt: '2026-09-04T03:00:00.000Z', decisionActorClass: 'owner', notice: '기록됨 · 전달은 이 범위 밖', completionAuthority: false }) }) })
    await page.goto(`${base}/workspace`)
    await page.locator('.oc-dashboard').waitFor()
    await page.locator('details.oc-v1-compatibility > summary').click()
    if (decisionProbe.viewport.width <= 760) await page.locator('.oc-workspace-tabs').getByRole('button', { name: '승인' }).click()
    const approval = page.locator('.oc-approval-rail')
    if (await approval.locator('form, a').count() !== 0 || await approval.locator('[data-approval-kind=explicit_cherry_action] button[aria-disabled=true]').count() !== 1 || await approval.locator('[data-approval-kind=explicit_cherry_action] button:disabled').count() !== 0 || await approval.locator('[data-approval-kind=evidence_blocker] option').count() !== 4) throw new Error('decision controls violated the explicit-action or closed-vocabulary boundary')
    const stageButton = approval.getByRole('button', { name: '승인 기록' })
    if (decisionProbe.activation === 'keyboard') { await stageButton.focus(); await page.keyboard.press('Enter') } else await stageButton.click()
    const review = approval.getByRole('alertdialog', { name: '결정 기록 검토' })
    await review.waitFor()
    if (decisionRequests.length !== 0) throw new Error(`${decisionProbe.name} first activation sent POST before confirmation`)
    for (const value of ['event-builder-blocked', 'sequence 7', '승인', 'completionAuthority=false']) if (!(await review.textContent())?.includes(value)) throw new Error(`${decisionProbe.name} review omitted ${value}`)
    await review.getByRole('button', { name: '취소' }).click()
    if (decisionRequests.length !== 0 || await stageButton.evaluate((element) => document.activeElement !== element)) throw new Error(`${decisionProbe.name} cancel mutated or failed to restore focus`)
    const rejectButton = approval.getByRole('button', { name: '반려 기록' })
    await rejectButton.click(); await review.waitFor()
    for (const value of ['반려', '근거가 충분하지 않음', 'evidence_insufficient']) if (!(await review.textContent())?.includes(value)) throw new Error(`${decisionProbe.name} rejection review omitted ${value}`)
    await review.getByRole('button', { name: '취소' }).click()
    if (decisionRequests.length !== 0 || await rejectButton.evaluate((element) => document.activeElement !== element)) throw new Error(`${decisionProbe.name} rejection cancel mutated or failed to restore focus`)
    if (decisionProbe.activation === 'keyboard') await page.keyboard.press('Enter'); else await stageButton.click()
    await review.waitFor()
    await review.getByRole('button', { name: '확인 기록' }).evaluate((button) => { button.click(); button.click() })
    await approval.getByText('기록됨 · 전달은 이 범위 밖').waitFor()
    const decisionRequest = decisionRequests[0]
    if (decisionRequests.length !== 1 || !decisionRequest || decisionRequest.headers['x-outcome-csrf'] !== 'browser-csrf-secret' || decisionRequest.headers['if-match'] !== '"browser-revision"' || decisionRequest.body.eventId !== 'event-builder-blocked' || decisionRequest.body.sequence !== 7) throw new Error(`${decisionProbe.name} decision browser request lost its staged server binding ${JSON.stringify(decisionRequests)}`)
    await stageButton.click(); await review.waitFor(); await review.getByRole('button', { name: '확인 기록' }).click()
    await approval.getByText('결정을 기록하지 못했습니다. 원본을 새로 확인하세요.').waitFor()
    const errorFocus = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), tag: document.activeElement?.tagName }))
    if (decisionRequests.length !== 2 || await stageButton.evaluate((element) => document.activeElement !== element)) throw new Error(`${decisionProbe.name} error did not remain single-submit or restore focus requests=${decisionRequests.length} focus=${JSON.stringify(errorFocus)}`)
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
  console.log(`account access browser PASS: account-only legacy convergence=6/6 with anonymous project payload requests=0; Clerk SDK browser markers present with no server callback/session-token handoff; 3 viewports x ${Object.keys(states).length - 1} non-ready states + loading + ready existing-shell login/logout hierarchy; decision confirmation desktop-pointer+mobile-keyboard first POST=0 cancel POST=0 confirm POST=1 double-submit=1 error-focus-restored; login=${JSON.stringify(loginMeasurements)}; non-ready mobile/phone 200% zoom overflow=0; ready shell overflow=0; touch>=44; project switch preserved`)
} finally {
  await browser.close(); server.close(); await once(server, 'close')
}
