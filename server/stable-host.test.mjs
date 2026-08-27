import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import test from 'node:test'
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { assertFinalizedReceipt, extractBuiltAsset, finalizeDeploymentSnapshot } from '../scripts/finalize-stable-snapshot.mjs'
import { assertAutoDetectedNodeRuntime } from '../scripts/validate-vercel-config.mjs'
import { AccountAccessError } from './account-access.mjs'

if (process.env.OUTCOME_ASSERT_BUILT !== '1') {
  const fixture = finalizeDeploymentSnapshot({ source, commit: '1111111111111111111111111111111111111111', tree: '2222222222222222222222222222222222222222', asset: 'index-test.js' })
  writeFileSync(new URL('../api/deployment-snapshot.mjs', import.meta.url), `export default ${JSON.stringify(fixture)}\n`, 'utf8')
}
const { config: stableConfig, createStableHostRequestHandler, default: stableHandler, handleStableHostRequest } = await import('../api/index.mjs')
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

const identityEnvironment = {
  OUTCOME_PRIVATE_SURFACE_ENABLED: '1',
  OUTCOME_CLERK_PUBLISHABLE_KEY: 'pk_test_boundary',
  OUTCOME_CLERK_SECRET_KEY: 'sk_test_boundary',
  OUTCOME_OWNER_SUBJECT: 'synthetic-owner',
  OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://preview.invalid',
  OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT: 'rollback-preview',
}
const bridgeEnvironment = (projectionEnrollment = '1', ingestion = '1') => ({
  ...identityEnvironment,
  OUTCOME_OBSERVER_BRIDGE_PROJECTION_ENROLLMENT_ENABLED: projectionEnrollment,
  OUTCOME_OBSERVER_BRIDGE_INGESTION_ENABLED: ingestion,
})
const accountRuntimeFactory = async () => ({
  allowedOrigin: 'https://preview.invalid',
  publishableKey: 'pk_test_boundary',
  service: {
    async authenticate(token) {
      if (token !== 'server-valid') throw new AccountAccessError('authentication_required', 401)
      return Object.freeze({ subject: 'synthetic-owner', issuedAt: 1, expiresAt: 2 })
    },
    async readWorkspace() {},
  },
})
const bridgeStub = (calls, maximumBytes = 32_768) => ({
  maxBodyBytes: maximumBytes,
  read(value) { calls.push(['read', value]); return { projections: [] } },
  createEnrollment(value) { calls.push(['createEnrollment', value]); return { status: 'pending' } },
  completeEnrollment(value) { calls.push(['completeEnrollment', value]); return { status: 'source_active' } },
  revokeSource(value) { calls.push(['revokeSource', value]); return { status: 'source_revoked' } },
  ingest(value) { calls.push(['ingest', value]); return { status: 'accepted', ledger_revision: 1 } },
})
const injectedBridgeRequest = ({ calls = [], environment = bridgeEnvironment(), bridge = bridgeStub(calls), bridgeRuntimeFactory } = {}) => createStableHostRequestHandler({
  environment,
  runtimeFactory: accountRuntimeFactory,
  bridgeRuntimeFactory: bridgeRuntimeFactory ?? (async () => ({ bridge, allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' })),
})

test('default disabled bridge routes are finite unavailable and preserve non-bridge responses', async () => {
  const disabled = createStableHostRequestHandler({ environment: {}, bridgeRuntimeFactory: async () => { throw new Error('must not run') } })
  for (const [method, pathname] of [
    ['GET', '/api/private/bridge/projection'],
    ['POST', '/api/private/bridge/enrollments'],
    ['POST', '/api/private/bridge/enrollments/complete'],
    ['POST', '/api/private/bridge/events'],
    ['POST', '/api/private/bridge'],
    ['DELETE', '/api/private/bridge/unknown'],
  ]) assert.deepEqual(await disabled({ method, pathname, body: Buffer.from('{}') }), { status: 404, body: { error: 'bridge_unavailable' } })
  assert.deepEqual(await disabled({ method: 'GET', pathname: '/api/health' }), request('GET', '/api/health'))
  assert.deepEqual(await disabled({ method: 'POST', pathname: '/api/dashboard' }), request('POST', '/api/dashboard'))
  assert.equal(stableConfig.api.bodyParser, false)
})

test('partial malformed configuration and factory throw reject invalid are cached unavailable', async () => {
  const partial = { ...identityEnvironment, OUTCOME_OBSERVER_BRIDGE_PROJECTION_ENROLLMENT_ENABLED: '1' }
  const malformed = bridgeEnvironment('true', '0')
  for (const environment of [partial, malformed]) {
    let calls = 0
    const bridgeRequest = createStableHostRequestHandler({ environment, runtimeFactory: accountRuntimeFactory, bridgeRuntimeFactory: async () => { calls += 1; return { bridge: bridgeStub([]), allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' } } })
    assert.deepEqual(await bridgeRequest({ method: 'GET', pathname: '/api/private/bridge/projection' }), { status: 404, body: { error: 'bridge_unavailable' } })
    assert.equal(calls, 0)
  }
  for (const factory of [
    () => { throw new Error('sensitive throw') },
    async () => { throw new Error('sensitive reject') },
    async () => null,
    async () => ({}),
  ]) {
    let calls = 0
    const bridgeRequest = createStableHostRequestHandler({ environment: bridgeEnvironment(), runtimeFactory: accountRuntimeFactory, bridgeRuntimeFactory: (...args) => { calls += 1; return factory(...args) } })
    for (let index = 0; index < 2; index += 1) assert.deepEqual(await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/events', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') }), { status: 404, body: { error: 'bridge_unavailable' } })
    assert.equal(calls, 1)
  }
})

test('projection enrollment and ingestion flags gate their route groups independently', async () => {
  const projectionOnly = injectedBridgeRequest({ environment: bridgeEnvironment('1', '0') })
  assert.equal((await projectionOnly({ method: 'GET', pathname: '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome', headers: { authorization: 'Bearer server-valid' } })).status, 200)
  assert.deepEqual(await projectionOnly({ method: 'POST', pathname: '/api/private/bridge/events', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') }), { status: 404, body: { error: 'bridge_unavailable' } })

  const ingestionOnly = injectedBridgeRequest({ environment: bridgeEnvironment('0', '1') })
  assert.equal((await ingestionOnly({ method: 'POST', pathname: '/api/private/bridge/events', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') })).status, 200)
  assert.deepEqual(await ingestionOnly({ method: 'GET', pathname: '/api/private/bridge/projection' }), { status: 404, body: { error: 'bridge_unavailable' } })
})

test('server auth context defeats spoof attempts for owner and viewer routes', async () => {
  const calls = []
  const bridgeRequest = injectedBridgeRequest({ calls })
  const projection = await bridgeRequest({
    method: 'GET',
    pathname: '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome',
    headers: { authorization: 'Bearer server-valid' },
  })
  assert.deepEqual(projection, { status: 200, body: { projections: [] } })
  assert.equal(calls[0][0], 'read')
  assert.equal(calls[0][1].auth_context.subject, 'synthetic-owner')
  assert.equal(Object.hasOwn(calls[0][1], 'token'), false)

  const headers = { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }
  const spoofed = await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/enrollments', headers, body: Buffer.from('{"auth_context":{"subject":"attacker"}}') })
  assert.deepEqual(spoofed, { status: 400, body: { error: 'bad_request' } })
  assert.equal(calls.filter(([name]) => name === 'createEnrollment').length, 0)
  const valid = await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/enrollments', headers, body: Buffer.from('{"workspace_id":"workspace_main"}') })
  assert.equal(valid.status, 201)
  assert.equal(calls.at(-1)[1].auth_context.subject, 'synthetic-owner')
})

test('companion ambient authority is removed and never authenticated', async () => {
  const calls = []
  let authentications = 0
  const runtimeFactory = async () => {
    const runtime = await accountRuntimeFactory()
    return { ...runtime, service: { ...runtime.service, async authenticate(token) { authentications += 1; return runtime.service.authenticate(token) } } }
  }
  const bridgeRequest = createStableHostRequestHandler({
    environment: bridgeEnvironment(),
    runtimeFactory,
    bridgeRuntimeFactory: async () => ({ bridge: bridgeStub(calls), allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' }),
  })
  const ambient = { 'content-type': 'application/json', cookie: '__session=attacker', authorization: 'Bearer attacker' }
  assert.equal((await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/enrollments/complete', headers: ambient, body: Buffer.from('{}') })).status, 200)
  assert.equal((await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/events', headers: ambient, body: Buffer.from('{}') })).status, 200)
  assert.equal(authentications, 0)
  assert.deepEqual(calls.map(([name]) => name), ['completeEnrollment', 'ingest'])
})

test('raw bytes reach the audited body cap without JSON reserialization', async () => {
  const calls = []
  const bridgeRequest = injectedBridgeRequest({ calls, bridge: bridgeStub(calls, 8) })
  const exact = Buffer.from(' {\n } ')
  assert.equal((await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/events', headers: { 'content-type': 'application/json' }, body: exact })).status, 200)
  assert.equal(calls[0][1].body_bytes, exact.length)
  assert.deepEqual(await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/events', headers: { 'content-type': 'application/json' }, body: Buffer.from('{"long":1}') }), { status: 400, body: { error: 'body_too_large' } })
})

test('enabled bridge methods outside the exact allowlist remain finite and fail closed', async () => {
  const bridgeRequest = injectedBridgeRequest()
  assert.deepEqual(await bridgeRequest({ method: 'PATCH', pathname: '/api/private/bridge/projection' }), { status: 405, body: { error: 'read_only' } })
  assert.deepEqual(await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/unknown', body: Buffer.from('{}') }), { status: 404, body: { error: 'bridge_unavailable' } })
  assert.deepEqual(await bridgeRequest({ method: 'POST', pathname: '/api/private/workspace' }), { status: 405, body: { error: 'read_only' } })
})

test('private bridge response is no-store at the stable handler boundary', async () => {
  const headers = new Map()
  let status
  let body
  await stableHandler(
    { method: 'GET', url: '/api/private/bridge/projection', query: {}, headers: {} },
    { setHeader: (name, value) => headers.set(name, value), status(value) { status = value; return this }, json(value) { body = value; return value } },
  )
  assert.equal(status, 404)
  assert.deepEqual(body, { error: 'bridge_unavailable' })
  assert.equal(headers.get('cache-control'), 'no-store')
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
