import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import test from 'node:test'
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { assertFinalizedReceipt, extractBuiltAsset, finalizeDeploymentSnapshot } from '../scripts/finalize-stable-snapshot.mjs'
import { assertAutoDetectedNodeRuntime } from '../scripts/validate-vercel-config.mjs'

if (process.env.OUTCOME_ASSERT_BUILT !== '1') {
  const fixture = finalizeDeploymentSnapshot({ source, commit: '1111111111111111111111111111111111111111', tree: '2222222222222222222222222222222222222222', asset: 'index-test.js' })
  writeFileSync(new URL('../api/deployment-snapshot.mjs', import.meta.url), `export default ${JSON.stringify(fixture)}\n`, 'utf8')
}
const { createStableHostRequestHandler, handleStableHostRequest } = await import('../api/index.mjs')
const { default: snapshot } = await import('../api/deployment-snapshot.mjs')

const request = (method, pathname) => handleStableHostRequest({ method, pathname })

test('stable host exposes the public Package snapshot needed by the app', () => {
  const response = request('GET', '/api/dashboard')
  assert.equal(response.status, 200)
  assert.equal(response.body.dashboard.snapshot.boundary, 'deployment_snapshot')
  assert.equal(response.body.dashboard.snapshot.source, 'sanitized_public_projection')
  assert.equal(response.body.dashboard.snapshot.liveSessionRelay, false)
  assert.equal(response.body.dashboard.projects.length >= 2, true)
})

test('stale or null source receipt is rejected before serving', () => {
  const stale = { ...source, build: { repository: 'dltmddnr3/outcome', ref: 'main', commit: 'ef2b9719d780', tree: 'b5192111b034', asset: null, runtimeNowPinned: false } }
  assert.throws(() => assertFinalizedReceipt(stale, { commit: 'eab0cdfd19eda14bb317de00bd9875f91060c032', tree: 'eb99c218f193b9d09702f698fca33963b35f8e0f', asset: 'index-f7tnHLzV.js' }), /stale/)
})

test('deployment finalization pins exact commit tree and built asset while preserving source capture time', () => {
  const finalized = finalizeDeploymentSnapshot({ source, commit: '123456789abc0123456789abcdef0123456789ab', tree: 'abcdef1234560123456789abcdef0123456789ab', asset: 'index-exact123.js' })
  assertFinalizedReceipt(finalized, { commit: '123456789abc0123456789abcdef0123456789ab', tree: 'abcdef1234560123456789abcdef0123456789ab', asset: 'index-exact123.js' })
  assert.equal(finalized.snapshot.capturedAt, source.snapshot.capturedAt)
  assert.equal(finalized.build.commit, '123456789abc')
  assert.equal(finalized.build.tree, 'abcdef123456')
})

test('stable host exposes public read-only session and health GETs', () => {
  assert.deepEqual(request('GET', '/api/auth/session'), { status: 200, body: { authenticated: false, publicReadOnly: true } })
  assert.deepEqual(request('GET', '/api/health'), { status: 200, body: { status: 'available', access: 'public_read_only', source: 'deployment_snapshot' } })
})

test('stable host exposes a disabled provider-neutral private contract and fails workspace access closed', () => {
  const config = request('GET', '/api/private/config')
  assert.equal(config.status, 200)
  assert.equal(config.body.enabled, false)
  assert.equal(config.body.completionAuthority, false)
  assert.deepEqual(config.body.providers.map((provider) => provider.id), ['google', 'apple', 'email_code'])
  assert.deepEqual(request('GET', '/api/private/workspace'), { status: 401, body: { error: 'authentication_required' } })
  assert.doesNotMatch(JSON.stringify(config.body), /secret|subject|token|VITE_/i)
})

test('complete identity configuration closes legacy public project APIs even when runtime construction fails', async () => {
  const environment = {
    OUTCOME_PRIVATE_SURFACE_ENABLED: '1',
    OUTCOME_CLERK_PUBLISHABLE_KEY: 'pk_test_boundary',
    OUTCOME_CLERK_SECRET_KEY: 'sk_test_boundary',
    OUTCOME_OWNER_SUBJECT: 'synthetic-owner',
    OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://preview.invalid',
    OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT: 'rollback-preview',
  }
  for (const runtimeFactory of [async () => { throw new Error('construction failed') }, async () => null]) {
    const privateRequest = createStableHostRequestHandler({ environment, runtimeFactory })
    for (const pathname of ['/api/dashboard', '/api/dashboard/cherry-note']) assert.deepEqual(await privateRequest({ method: 'GET', pathname }), { status: 404, body: { error: 'not_found' } })
    assert.deepEqual(await privateRequest({ method: 'GET', pathname: '/api/auth/session' }), { status: 200, body: { authenticated: false, publicReadOnly: false } })
    assert.equal(JSON.stringify(await privateRequest({ method: 'GET', pathname: '/api/dashboard' })).includes('Cherry Note'), false)
  }
})

test('stable host rejects every mutation and unknown GET fails closed', () => {
  let checked = 0
  for (const path of ['/api/dashboard', '/api/auth/session', '/api/health', '/api/private/config', '/api/private/workspace', '/api/unknown']) for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.deepEqual(request(method, path), { status: 405, body: { error: 'read_only' } })
    checked += 1
  }
  assert.equal(checked, 24)
  assert.deepEqual(request('GET', '/api/unknown'), { status: 404, body: { error: 'not_found' } })
})

test('stable snapshot has no prohibited disclosure or Gate evidence fields', () => {
  const text = JSON.stringify(snapshot)
  for (const pattern of [/\/Users\//, /\/tmp\//, /(?:session|thread|turn|task)[_-]?id/i, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, /\b[0-9a-f]{40}\b/i, /\b[0-9a-f]{64}\b/i, /(?:token|secret|password|authorization)\s*[:=]/i]) assert.doesNotMatch(text, pattern)
  for (const project of snapshot.projects) for (const phase of project.phases ?? []) for (const scope of phase.scopes ?? []) for (const stage of scope.stages ?? []) for (const gate of stage.gate?.gates ?? []) assert.equal(Object.hasOwn(gate, 'evidence'), false)
  assert.equal(snapshot.snapshot.boundary, 'deployment_snapshot')
  assert.notEqual(snapshot.build.asset, null)
})

test('Vercel config preserves dashboard route fallback and built output contract', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.throws(() => assertAutoDetectedNodeRuntime({ functions: { 'api/index.mjs': { runtime: 'nodejs22.x' } } }), /auto-detection/)
  assertAutoDetectedNodeRuntime(config)
  assert.equal(JSON.stringify(config).includes('nodejs22.x'), false)
  assert.equal(config.outputDirectory, 'dist')
  assert.equal(config.rewrites.some((item) => item.source === '/api/:path*' && item.destination.includes('/api')), true)
  assert.equal(config.rewrites.some((item) => item.source === '/cherry-note-dashboard' && item.destination === '/index.html'), true)
  assert.equal(config.rewrites.some((item) => item.source === '/workspace' && item.destination === '/index.html'), true)
  assert.equal(config.rewrites.some((item) => item.source === '/workspace/sso-callback' && item.destination === '/index.html'), true)
  assert.equal(config.rewrites.some((item) => item.source === '/workspace/apple-callback' && item.destination === '/index.html'), true)
  if (process.env.OUTCOME_ASSERT_BUILT === '1') {
    assert.equal(existsSync(new URL('../dist/index.html', import.meta.url)), true)
    const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
    assert.match(html, /\/assets\/index-[A-Za-z0-9_-]+\.js/)
    const git = (...args) => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }
    const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? git('rev-parse', 'HEAD')
    const tree = process.env.OUTCOME_DEPLOY_TREE ?? (commit ? git('rev-parse', `${commit}^{tree}`) : null)
    assertFinalizedReceipt(snapshot, { commit, tree, asset: extractBuiltAsset(html) })
  }
})
