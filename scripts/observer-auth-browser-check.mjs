import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

// Real compiled hosted UI; synthetic SDK intentionally stays signed in after
// server denial. No actual provider/owner identity, revocation or credentials.
const sdk = `
const getToken=async()=>'synthetic-token';const errors={};
export const useAuth=()=>({sessionId:'synthetic-session',isLoaded:true,isSignedIn:true,getToken,signOut:async()=>{window.signOutCalls++;}});
export const useSignIn=()=>({signIn:null,errors,fetchStatus:'idle'});export const useUser=()=>({user:null});
export const ClerkProvider=({children})=>children;export const AuthenticateWithRedirectCallback=()=>null;
`
const mode = process.env.OUTCOME_AUTH_FIXTURE_MODE === 'injected' ? 'injected' : 'hosted'
const entry = mode === 'hosted' ? `import{HostedClerkWorkspace}from'./src/components/AccountWorkspaceClerk';const View=()=> <HostedClerkWorkspace publishableKey="synthetic" pathname="/workspace"/>;` : `import{OutcomeApp as View}from'./src/OutcomeApp';`
const compiled = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';${entry}window.signOutCalls=0;createRoot(document.getElementById('root')).render(<View/>);`, loader: 'tsx', resolveDir: process.cwd() },
  bundle: true, write: false, outdir: '.outcome-runtime/observer-auth-fixture', format: 'esm', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'synthetic-clerk', setup(builder) { builder.onResolve({ filter: /^@clerk\/react$/ }, () => ({ path: 'sdk', namespace: 'synthetic' })); builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: sdk, loader: 'js' })) } }] })
const css = readFileSync('src/styles.css', 'utf8') + compiled.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n')
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(compiled.outputFiles.find(file => file.path.endsWith('.js')).text); return }
  if (request.url === '/app.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script></html>')
})
server.listen(0, '127.0.0.1'); await once(server, 'listening')
let browser
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  for (const width of [390, 1440]) for (const error of ['session_expired', 'session_revoked', 'authentication_required', 'owner_mismatch', 'authentication_unavailable']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } }); page.setDefaultTimeout(5000)
    const base = `http://127.0.0.1:${server.address().port}`, errors = []; let denied = false, reads = 0, writes = 0
    page.on('pageerror', error => errors.push(error.message))
    const project = { project: { id: 'outcome', name: 'Synthetic private sentinel' }, phases: [], current: { phaseId: '', scopeId: '', stageId: '' },
      modelV2: { schemaVersion: 1, modelVersion: 2, project: { id: 'outcome', label: 'Synthetic' }, destination: null, remainingAcceptanceGap: { remaining: 1, total: 1 }, now: { state: 'ready', observedAt: new Date(20000).toISOString() }, state: 'ready', readyBoundaryLabels: [], nextActionLabel: null, cherryActionLabel: null, events: [] } }
    await page.route('**/*', route => {
      const url = route.request().url()
      if (!url.startsWith(base + '/')) return route.abort()
      if (!url.includes('/api/')) return route.continue()
      if (route.request().method() !== 'GET') { writes++; return route.abort() }
      if (url.endsWith('/config')) return route.fulfill({ json: { enabled: true, access: 'private_read_only', providers: [], sessionMaximumDays: 7, completionAuthority: false } })
      if (url.endsWith('/session')) return route.fulfill({ json: { authenticated: true, owner: true } })
      if (url.endsWith('/workspace')) return route.fulfill({ json: { workspace: { projects: [project] } }, headers: { 'x-outcome-destination-csrf': 'synthetic-destination', 'x-outcome-csrf': 'synthetic-decision', etag: '"synthetic"' } })
      assert(url.endsWith('/work-observation/outcome')); reads++
      if (denied) return route.fulfill({ status: error === 'authentication_unavailable' ? 503 : error === 'owner_mismatch' ? 403 : 401, json: { error } })
      return route.fulfill({ json: { projectId: 'outcome', completionAuthority: false, observation: { schemaVersion: 1, observedAtMs: 20000, completionAuthority: false, executionAuthority: false,
        work: { stage: 'implementing', activity: 'running', freshness: 'fresh', evidenceStatus: 'missing', continuation: 'observing' }, runtime: { state: 'active' } } } })
    })
    await page.clock.install({ time: new Date(20000) }); await page.goto(base)
    await page.getByRole('heading', { name: '실행 관측됨', exact: true }).waitFor()
    assert.equal(await page.locator('[data-private-project]').count(), 1)
    denied = true; await page.clock.fastForward(11000)
    await page.locator(`[data-state-code="${error === 'authentication_unavailable' ? 'unavailable' : error === 'owner_mismatch' ? 'access_denied' : 'session_expired'}"]`).waitFor()
    assert.equal(reads, 2)
    assert.equal(await page.locator('[data-private-project]').count(), 0)
    assert(!(await page.locator('body').innerText()).includes('Synthetic private sentinel'))
    assert.equal(await page.evaluate(() => window.signOutCalls), 0); assert.equal(writes, 0)
    const after = reads; await page.clock.fastForward(120000); assert.equal(reads, after)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual(errors, []); await page.close()
    console.log(JSON.stringify({ mode, width, error, privateUiRemoved: true, automaticSignOut: false, physicalProviderProof: false }))
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
