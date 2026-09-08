// Synthetic injected-auth transport only. This does not prove Clerk/provider or physical-device expiry.
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { chromium } from '@playwright/test'
import { createOutcomeServer } from '../server/index.mjs'

const server = createOutcomeServer({ publicReadOnly: true })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const base = `http://127.0.0.1:${server.address().port}`
  for (const width of [390,1440]) for (const failure of ['session_expired','session_revoked','private_workspace_unavailable']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    let state = 'ready', authCalls = 0, otherApiCalls = 0
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/private/config') return route.fulfill({ json: { enabled: true, access:'private_read_only', providers:[], sessionMaximumDays:7, completionAuthority:false } })
      if (path === '/api/private/workspace') return state === 'ready'
        ? route.fulfill({ json: { workspace: { viewState:'ready', projects: [{ project:{id:'synthetic',name:'Synthetic private sentinel'}, phases:[],current:{phaseId:'none',scopeId:'none',stageId:'none'} }] } } })
        : route.fulfill({ status: state === 'private_workspace_unavailable' ? 503 : 401, json:{error:state} })
      if (path === '/api/private/auth/logout') { authCalls++; return route.fulfill({ json:{state:'signed_out'} }) }
      if (path === '/api/private/auth/login') { authCalls++; state = 'ready'; return route.fulfill({ json:{state:'signed_in'} }) }
      otherApiCalls++; return route.abort()
    })
    await page.goto(`${base}/workspace`)
    await page.locator('[data-account-state=ready]').waitFor()
    assert.equal(await page.locator('[data-private-project]').count(), 1)
    state = failure
    await page.reload()
    await page.locator(`[data-state-code=${failure === 'private_workspace_unavailable' ? 'unavailable' : 'session_expired'}]`).waitFor()
    assert.equal(await page.locator('[data-private-project]').count(), 0)
    assert.equal(await page.getByText('Synthetic private sentinel', { exact:true }).count(), 0)
    assert.equal(await page.locator('.oc-dashboard').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    // Recovery is an explicit page revisit after the synthetic service recovers, not an automatic replay.
    state = 'ready'
    await page.reload()
    await page.locator('[data-account-state=ready]').waitFor()
    assert.equal(await page.locator('[data-private-project]').count(), 1)
    assert.equal(authCalls, 0)
    assert.equal(otherApiCalls, 0)
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({width,failure,privateUiRemoved:true,explicitReloadRecovered:true,authCalls,otherApiCalls,physicalProof:false,clerkProof:false}))
    await context.close()
  }
} finally { await browser?.close(); server.close(); await once(server,'close') }
