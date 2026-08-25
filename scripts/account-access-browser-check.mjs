import { once } from 'node:events'
import { chromium } from '@playwright/test'
import { createOutcomeServer } from '../server/index.mjs'

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const server = createOutcomeServer({ publicReadOnly: true })
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
  ready: { status: 200, body: { workspace: { viewState: 'ready' } } },
}

try {
  for (const viewport of [{ name: 'macbook', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
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
        return {
          Korean: document.body.innerText.includes('Cherry 전용 비공개 워크스페이스'),
          readOnly: document.body.innerText.includes('읽기 전용'),
          completionFalse: root?.getAttribute('data-completion-authority') === 'false',
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          intersection: header && panel ? Math.max(0, Math.min(header.bottom, panel.bottom) - Math.max(header.top, panel.top)) : -1,
          buttons,
        }
      })
      if (!result.Korean || !result.readOnly || !result.completionFalse || result.horizontalOverflow > 1 || result.intersection !== 0 || result.buttons.some((height) => height < 44)) throw new Error(`${viewport.name}/${state} failed ${JSON.stringify(result)}`)
      if (state === 'login') {
        await page.keyboard.press('Tab')
        if (await page.evaluate(() => document.activeElement?.tagName) !== 'BUTTON') throw new Error(`${viewport.name}/login keyboard focus failed`)
      }
      await context.close()
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.route('**/api/private/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true }) }))
  await page.route('**/api/private/workspace', async (route) => { await new Promise((resolve) => setTimeout(resolve, 1_000)); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspace: {} }) }) })
  await page.goto(`${base}/workspace`)
  await page.locator('.account-workspace__state-code', { hasText: 'loading' }).waitFor()
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  if (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) > 1) throw new Error('200% zoom horizontal overflow')
  await context.close()
  console.log(`account access browser PASS: 2 viewports x ${Object.keys(states).length} settled states + loading + 200% zoom; touch>=44; overflow/intersection=0`)
} finally {
  server.close(); await once(server, 'close'); await browser.close()
}
