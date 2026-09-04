import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import test from 'node:test'
import { createContext, runInContext } from 'node:vm'
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { assertFinalizedReceipt, extractBuiltAsset, finalizeDeploymentSnapshot, normalizeProviderCommit, readValidatedCarrierSource } from '../scripts/finalize-stable-snapshot.mjs'
import { assertAutoDetectedNodeRuntime } from '../scripts/validate-vercel-config.mjs'
import { AccountAccessError } from './account-access.mjs'
import { createHostedObserverBridge, HostedObserverBridgeError } from './phase3-observer-bridge-hosted.mjs'
import { createOutcomeChatRateLimiter } from './outcome-chat-hosted-runtime.mjs'

if (process.env.OUTCOME_ASSERT_BUILT !== '1') {
  const fixture = finalizeDeploymentSnapshot({ source, commit: '1111111111111111111111111111111111111111', tree: '2222222222222222222222222222222222222222', asset: 'index-test.js' })
  writeFileSync(new URL('../api/deployment-snapshot.mjs', import.meta.url), `export default ${JSON.stringify(fixture)}\n`, 'utf8')
}
const { config: stableConfig, createStableHostRequestHandler, default: stableHandler, handleStableHostRequest, requestPath } = await import('../api/index.mjs')
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
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'preview.invalid.vercel.app',
  OUTCOME_OBSERVER_BRIDGE_V2_PROJECTION_ENROLLMENT_ENABLED: projectionEnrollment,
  OUTCOME_OBSERVER_BRIDGE_V2_INGESTION_ENABLED: ingestion,
})
const accountRuntimeFactory = async () => ({
  allowedOrigin: 'https://preview.invalid.vercel.app',
  publishableKey: 'pk_test_boundary',
  service: {
    async authenticate(token) {
      if (token !== 'server-valid') throw new AccountAccessError('authentication_required', 401)
      return Object.freeze({ subject: 'synthetic-owner', issuedAt: 1, expiresAt: 2 })
    },
    async resolveBridgeAuthority({ token }) {
      if (token !== 'server-valid') throw new AccountAccessError('authentication_required', 401)
      return Object.freeze({ account_ref: 'a'.repeat(64), workspace_id: 'workspace_main', project_ids: Object.freeze(['outcome']) })
    },
    async readWorkspace() {},
  },
})

test('V2 Preview supplies one deployment-owned origin to the account runtime and ignores the legacy override', async () => {
  let input
  const handler = createStableHostRequestHandler({
    environment: { ...bridgeEnvironment(), OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://legacy-attacker.invalid' },
    runtimeFactory: async (value) => {
      input = value
      return { ...(await accountRuntimeFactory()), allowedOrigin: value.allowedOrigin }
    },
    bridgeRuntimeFactory: async () => null,
  })
  assert.equal((await handler({ method: 'GET', pathname: '/api/private/config' })).status, 200)
  assert.equal(input.allowedOrigin, 'https://preview.invalid.vercel.app')
})

test('account identity uses the deployment-owned Preview origin when observer bridge activation is disabled', async () => {
  let input
  const handler = createStableHostRequestHandler({
    environment: { ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app' },
    runtimeFactory: async (value) => {
      input = value
      return { ...(await accountRuntimeFactory()), allowedOrigin: value.allowedOrigin }
    },
    bridgeRuntimeFactory: async () => { throw new Error('must not run') },
  })
  assert.equal((await handler({ method: 'GET', pathname: '/api/private/config' })).status, 200)
  assert.equal(input.allowedOrigin, 'https://preview.invalid.vercel.app')
})

test('hosted private chat GET and POST route through durable service with no-store and no locator surface', async () => {
  const calls = []
  const service = {
    async timeline(value) { calls.push(['timeline', value]); return { target: { role: 'planner', binding_version: 3 }, events: [], completion_authority: false } },
    async submitPlannerMessage(value) { calls.push(['submit', value]); return { accepted: true, sequence: 1, event_id: 'event-0000000000000001', dispatch_state: 'not_invoked', delivery: 'delivery_unknown', execution_started: false, result_attached: false, evidence_attached: false } },
  }
  const handler = createStableHostRequestHandler({
    environment: { ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app' },
    runtimeFactory: async () => ({ ...(await accountRuntimeFactory()), service: { ...(await accountRuntimeFactory()).service, async resolveBridgeAuthority({ token }) { if (token !== 'server-valid') throw new AccountAccessError('authentication_required', 401); return { account_ref: 'a'.repeat(64), workspace_id: 'account-only-preview', project_ids: ['outcome'] } } } }),
    bridgeRuntimeFactory: async () => null,
    chatRuntimeFactory: async () => ({ allowedOrigin: 'https://preview.invalid.vercel.app', csrfSecret: 'synthetic-csrf-boundary-value-123456', createService: () => service, rateLimit: () => ({ allowed: true }) }),
  })
  const common = { authorization: 'Bearer server-valid', origin: 'https://preview.invalid.vercel.app', 'x-outcome-csrf': 'synthetic-csrf-boundary-value-123456' }
  const timeline = await handler({ method: 'GET', pathname: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', headers: common })
  assert.equal(timeline.status, 200); assert.equal(timeline.headers['cache-control'], 'no-store'); assert.equal(timeline.body.csrf, '')
  const submit = await handler({ method: 'POST', pathname: '/api/private/chat/messages', headers: { ...common, 'content-type': 'application/json', 'idempotency-key': 'message-0000000000000001' }, body: JSON.stringify({ project_id: 'outcome', message: 'persist me' }) })
  assert.equal(submit.status, 405); assert.deepEqual(submit.body, { error: 'read_only' }); assert.equal(calls.length, 1)
  assert.equal(JSON.stringify({ timeline, submit, calls }).includes('locator'), false)
})

test('hosted chat is finite unavailable when identity or durable runtime configuration is incomplete', async () => {
  for (const handler of [createStableHostRequestHandler({ environment: {} }), createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory: accountRuntimeFactory, chatRuntimeFactory: async () => null })]) {
    assert.deepEqual(await handler({ method: 'GET', pathname: '/api/private/chat/timeline?project_id=outcome&after_sequence=0' }), { status: 503, body: { error: 'chat_unavailable' } })
  }
})

test('malformed database URL cannot escape stable handler construction', async () => {
  const environment = { ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app', OUTCOME_CHAT_DURABLE_ENABLED: '1', OUTCOME_CHAT_DATABASE_URL: 'postgresql://outcome_chat_runtime%E0%A4%A:x@db.invalid/outcome?sslmode=verify-full', OUTCOME_CHAT_DATABASE_CA_PEM: '-----BEGIN CERTIFICATE-----\nQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=\n-----END CERTIFICATE-----', OUTCOME_CHAT_CSRF_SECRET: 'synthetic-csrf-boundary-value-123456' }
  let handler
  assert.doesNotThrow(() => { handler = createStableHostRequestHandler({ environment, runtimeFactory: accountRuntimeFactory }) })
  assert.deepEqual(await handler({ method: 'GET', pathname: '/api/private/chat/timeline?project_id=outcome&after_sequence=0' }), { status: 503, body: { error: 'chat_unavailable' } })
})

test('production chat assembly denies repeated scope without cross-owner interference or raw scope output', async () => {
  const limiter = createOutcomeChatRateLimiter({ now: () => 0, windowMs: 60_000, timelineLimit: 1, submitLimit: 1, maxEntries: 8 })
  const service = { async timeline() { return { target: { role: 'planner', binding_version: 3 }, events: [], completion_authority: false } }, async submitPlannerMessage() {} }
  const handler = createStableHostRequestHandler({
    environment: { ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app' },
    runtimeFactory: async () => ({ allowedOrigin: 'https://preview.invalid.vercel.app', publishableKey: 'pk_test_boundary', service: { async readWorkspace() {}, async authenticate() {}, async resolveBridgeAuthority({ token }) { return { account_ref: token === 'owner-b' ? 'b'.repeat(64) : 'a'.repeat(64), workspace_id: 'account-only-preview', project_ids: ['outcome'] } } } }),
    bridgeRuntimeFactory: async () => null,
    chatRuntimeFactory: async () => ({ allowedOrigin: 'https://preview.invalid.vercel.app', csrfSecret: 'synthetic-csrf-boundary-value-123456', createService: () => service, rateLimit: limiter.check }),
  })
  const read = (token) => handler({ method: 'GET', pathname: '/api/private/chat/timeline?project_id=outcome&after_sequence=0', headers: { authorization: `Bearer ${token}` } })
  assert.equal((await read('owner-a')).status, 200)
  const denied = await read('owner-a'); assert.equal(denied.status, 429); assert.equal(denied.headers['retry-after'], '60')
  assert.equal((await read('owner-b')).status, 200)
  assert.equal(JSON.stringify(denied).includes('account-only-preview'), false)
})

test('bridge-disabled Preview sends only the deployment-owned origin to identity verification', async () => {
  let verifierOptions
  const now = Math.floor(Date.now() / 1_000)
  const handler = createStableHostRequestHandler({
    environment: { ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app' },
    clerkClientFactory: () => ({
      sessions: {
        async getSession() { return { status: 'active', userId: 'synthetic-owner' } },
        async revokeSession() {},
        async getSessionList() { return { data: [] } },
      },
    }),
    clerkTokenVerifier: async (_token, options) => {
      verifierOptions = options
      return { sub: 'synthetic-owner', sid: 'synthetic-session', iat: now - 1, exp: now + 60 }
    },
    bridgeRuntimeFactory: async () => { throw new Error('must not run') },
  })
  assert.equal((await handler({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer synthetic-token' } })).status, 200)
  assert.deepEqual(verifierOptions.authorizedParties, ['https://preview.invalid.vercel.app'])
})

test('account identity origin selection preserves stable environments and fails hostile Preview metadata closed', async () => {
  for (const vercelEnvironment of [undefined, 'production', 'development']) {
    let input
    const environment = { ...identityEnvironment, ...(vercelEnvironment ? { VERCEL_ENV: vercelEnvironment, VERCEL_URL: 'ignored.invalid' } : {}) }
    const handler = createStableHostRequestHandler({
      environment,
      runtimeFactory: async (value) => {
        input = value
        return { ...(await accountRuntimeFactory()), allowedOrigin: identityEnvironment.OUTCOME_PRIVATE_ALLOWED_ORIGIN }
      },
      bridgeRuntimeFactory: async () => { throw new Error('must not run') },
    })
    assert.equal((await handler({ method: 'GET', pathname: '/api/private/config', headers: { host: 'forged.invalid', 'x-forwarded-host': 'forged.invalid', origin: 'https://forged.invalid' } })).body.enabled, true)
    assert.equal(input.allowedOrigin, undefined)
  }

  const accessor = { ...identityEnvironment, VERCEL_URL: 'preview.invalid.vercel.app' }
  Object.defineProperty(accessor, 'VERCEL_ENV', { enumerable: true, get() { throw new Error('must not execute') } })
  const hostileEnvironments = [
    { ...identityEnvironment, VERCEL_ENV: 'preview' },
    { ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'PREVIEW.invalid.vercel.app' },
    { ...identityEnvironment, VERCEL_ENV: 'unexpected', VERCEL_URL: 'preview.invalid.vercel.app' },
    accessor,
    new Proxy({ ...identityEnvironment, VERCEL_ENV: 'preview', VERCEL_URL: 'preview.invalid.vercel.app' }, { getOwnPropertyDescriptor() { throw new Error('must not execute') } }),
  ]
  for (const environment of hostileEnvironments) {
    let calls = 0
    const handler = createStableHostRequestHandler({
      environment,
      runtimeFactory: async () => { calls += 1; return accountRuntimeFactory() },
      bridgeRuntimeFactory: async () => { throw new Error('must not run') },
    })
    assert.equal((await handler({ method: 'GET', pathname: '/api/private/config' })).body.enabled, false)
    assert.equal(calls, 0)
  }
})
const bridgeStub = (calls, maximumBytes = 32_768) => ({
  maxBodyBytes: maximumBytes,
  read(value) { calls.push(['read', value]); return { projections: [] } },
  createEnrollment(value) { calls.push(['createEnrollment', value]); return { status: 'pending' } },
  completeEnrollment(value) { calls.push(['completeEnrollment', value]); return { status: 'source_active' } },
  revokeSource(value) { calls.push(['revokeSource', value]); return { status: 'source_revoked' } },
  ingest(value) { calls.push(['ingest', value]); return { status: 'accepted', ledger_revision: 1 } },
})
const adminStub = (calls) => ({
  registerViewer(value) { calls.push(['registerViewer', value]); return { status: 'viewer_registered', revision: 1, ledger_revision: 1 } },
  revokeViewer(value) { calls.push(['revokeViewer', value]); return { status: 'viewer_revoked', revision: 2, ledger_revision: 2 } },
  cleanupExpiredChallenges(value) { calls.push(['cleanupExpiredChallenges', value]); return { status: 'challenge_cleanup', cleared_count: 0 } },
  readiness(value) { calls.push(['readiness', value]); return { status: 'ready', active_viewer_count: 2, active_viewer_class_count: 2 } },
})
const stableBridgeCases = [
  { path: '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome', method: 'GET', bridgeMethod: 'read', headers: { authorization: 'Bearer server-valid' } },
  { path: '/api/private/bridge/enrollments', method: 'POST', bridgeMethod: 'createEnrollment', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
  { path: '/api/private/bridge/enrollments/complete', method: 'POST', bridgeMethod: 'completeEnrollment', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') },
  { path: '/api/private/bridge/sources/revoke', method: 'POST', bridgeMethod: 'revokeSource', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
  { path: '/api/private/bridge/sources/rotate', method: 'POST', bridgeMethod: 'createEnrollment', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
  { path: '/api/private/bridge/events', method: 'POST', bridgeMethod: 'ingest', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') },
]
const stableFixedStatuses = {
  unavailable: 404, access_denied: 404, auth_unavailable: 503,
  enrollment_invalid: 409, enrollment_conflict: 409, idempotency_conflict: 409,
  request_conflict: 409, sequence_conflict: 409, signature_invalid: 401,
  csrf_invalid: 403, rate_limited: 429, body_too_large: 400,
  bad_request: 400, input_invalid: 400,
}
const captureHostedError = (operation) => {
  try { operation() } catch (error) { return error }
  assert.fail('expected hosted operation to fail')
}
const stableGenuineHostedOperationErrors = () => {
  const hostedBinding = { workspace_id: 'workspace_main', project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01' }
  const hostedViewers = [
    { workspace_id: 'workspace_main', viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_ids: ['outcome'] },
    { workspace_id: 'workspace_main', viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_ids: ['outcome'] },
  ]
  const hostedOwner = { account_ref: 'account_owner_01', workspace_id: 'workspace_main', project_ids: ['outcome'] }
  const options = { bindings: [hostedBinding], viewers: hostedViewers, authorize_owner: () => hostedOwner, authorize_viewer: () => hostedOwner, now: () => Date.parse('2026-08-27T00:00:00.000Z') }
  const readInput = { auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }
  return [
    ['unavailable', captureHostedError(() => createHostedObserverBridge(options).read(readInput))],
    ['input_invalid', captureHostedError(() => createHostedObserverBridge({ ...options, feature_enabled: true }).read({}))],
    ['access_denied', captureHostedError(() => createHostedObserverBridge({ ...options, feature_enabled: true, authorize_viewer: () => null }).read(readInput))],
    ['auth_unavailable', captureHostedError(() => createHostedObserverBridge({ ...options, feature_enabled: true, authorize_viewer: () => { throw new Error('private auth') } }).read(readInput))],
    ['enrollment_invalid', captureHostedError(() => createHostedObserverBridge({ ...options, feature_enabled: true }).completeEnrollment({ challenge_ref: 'challenge_missing_01', public_key_spki: 'invalid', proof_signature: 'invalid' }))],
  ]
}
const stableBrandHostileFactories = (trap) => [
  () => { const value = new Error('rate_limited'); Object.setPrototypeOf(value, HostedObserverBridgeError.prototype); Object.defineProperties(value, { name: { value: 'HostedObserverBridgeError', enumerable: true, writable: true, configurable: true }, code: { value: 'rate_limited', enumerable: true, writable: true, configurable: true } }); return value },
  () => { const value = new HostedObserverBridgeError('rate_limited'); Object.setPrototypeOf(value, Error.prototype); return value },
  () => { class Subclass extends HostedObserverBridgeError {}; return new Subclass('rate_limited') },
  () => { const value = new HostedObserverBridgeError('rate_limited'); value[Symbol('extra')] = true; return value },
  () => Object.assign(new HostedObserverBridgeError('rate_limited'), { extra: true }),
  () => { const value = new HostedObserverBridgeError('rate_limited'); Object.defineProperty(value, 'code', { get: trap }); return value },
  () => { const value = new HostedObserverBridgeError('rate_limited'); value.code = 'bad_request'; return value },
  () => { const value = new HostedObserverBridgeError('rate_limited'); delete value.code; return value },
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), {}),
  () => { const value = Proxy.revocable(new HostedObserverBridgeError('rate_limited'), {}); value.revoke(); return value.proxy },
  () => { const value = runInContext('new Error("rate_limited")', createContext({})); Object.setPrototypeOf(value, HostedObserverBridgeError.prototype); Object.defineProperties(value, { name: { value: 'HostedObserverBridgeError', enumerable: true, writable: true, configurable: true }, code: { value: 'rate_limited', enumerable: true, writable: true, configurable: true } }); return value },
  () => Object.freeze(new HostedObserverBridgeError('rate_limited')),
  () => Object.seal(new HostedObserverBridgeError('rate_limited')),
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), { getPrototypeOf: trap }),
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), { ownKeys: trap }),
  () => new Proxy(new HostedObserverBridgeError('rate_limited'), { getOwnPropertyDescriptor: trap }),
  () => new HostedObserverBridgeError('unknown'),
  () => { const value = {}; value.self = value; return value },
]
const stableAlternateNewTargetError = () => {
  function AlternateNewTarget() {}
  AlternateNewTarget.prototype = HostedObserverBridgeError.prototype
  return Reflect.construct(HostedObserverBridgeError, ['rate_limited'], AlternateNewTarget)
}
const stableNewTargetVariantFactories = [
  stableAlternateNewTargetError,
  () => { class Subclass extends HostedObserverBridgeError {}; return new Subclass('rate_limited') },
  () => Reflect.construct(HostedObserverBridgeError, ['rate_limited'], HostedObserverBridgeError.bind(null)),
  () => new (new Proxy(HostedObserverBridgeError, {}))('rate_limited'),
  () => { const target = new Proxy(HostedObserverBridgeError, {}); return Reflect.construct(HostedObserverBridgeError, ['rate_limited'], target) },
  () => { const value = new HostedObserverBridgeError('rate_limited'); Object.setPrototypeOf(value, Error.prototype); return value },
]
const stableQaPrivateFactoryHostileFactories = () => [
  () => Reflect.construct(new Proxy(HostedObserverBridgeError, {}), ['rate_limited'], HostedObserverBridgeError),
  () => Reflect.construct(HostedObserverBridgeError.bind(null), ['rate_limited'], HostedObserverBridgeError),
  () => {
    const original = Object.getPrototypeOf(HostedObserverBridgeError.prototype)
    try { Object.setPrototypeOf(HostedObserverBridgeError.prototype, null); return new HostedObserverBridgeError('rate_limited') }
    finally { Object.setPrototypeOf(HostedObserverBridgeError.prototype, original) }
  },
  () => {
    const marker = Symbol('qa-private-decoration')
    try { HostedObserverBridgeError.prototype[marker] = true; return new HostedObserverBridgeError('rate_limited') }
    finally { delete HostedObserverBridgeError.prototype[marker] }
  },
  () => Reflect.construct(runInContext('new Proxy(Target, {})', createContext({ Target: HostedObserverBridgeError })), ['rate_limited'], HostedObserverBridgeError),
]

test('QA private error factory root blocker is generic for every stable-host endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of stableBridgeCases) for (const factory of stableQaPrivateFactoryHostileFactories()) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw factory() }
      : () => { calls += 1; throw factory() }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    assert.deepEqual(await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body }), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 60)
})

test('QA alternate newTarget blocker is generic for every stable-host endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of stableBridgeCases) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw stableAlternateNewTargetError() }
      : () => { calls += 1; throw stableAlternateNewTargetError() }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    assert.deepEqual(await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body }), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 12)
})

test('newTarget construction matrix is generic for every stable-host endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of stableBridgeCases) for (const factory of stableNewTargetVariantFactories) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw factory() }
      : () => { calls += 1; throw factory() }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    assert.deepEqual(await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body }), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 72)
})
const injectedBridgeRequest = ({ calls = [], environment = bridgeEnvironment(), bridge = bridgeStub(calls), admin = adminStub(calls), bridgeRuntimeFactory } = {}) => createStableHostRequestHandler({
  environment,
  runtimeFactory: accountRuntimeFactory,
  bridgeRuntimeFactory: bridgeRuntimeFactory ?? (async () => ({ bridge, admin, allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' })),
})

test('stable host routes only the four private admin operations with cookie or bearer token injection', async () => {
  const calls = []
  const requestAdmin = injectedBridgeRequest({ calls })
  const headers = { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }
  const posts = [
    ['/api/private/bridge/admin/viewers/register', { workspace_id: 'workspace-main', project_id: 'outcome', viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', idempotency_key: 'viewer-register-01', expected_schema_revision: 2 }, 'registerViewer'],
    ['/api/private/bridge/admin/viewers/revoke', { workspace_id: 'workspace-main', project_id: 'outcome', viewer_ref: 'viewer_workstation_01', expected_revision: 1, idempotency_key: 'viewer-revoke-01' }, 'revokeViewer'],
    ['/api/private/bridge/admin/challenges/cleanup', { project_id: 'outcome', before: '2026-09-02T00:00:00.000Z', limit: 100 }, 'cleanupExpiredChallenges'],
  ]
  for (const [pathname, body, operation] of posts) {
    assert.equal((await requestAdmin({ method: 'POST', pathname, headers, body: JSON.stringify(body) })).status, 200)
    assert.equal(calls.at(-1)[0], operation)
    assert.equal(calls.at(-1)[1].token, 'server-valid')
  }
  const ready = await requestAdmin({ method: 'GET', pathname: '/api/private/bridge/admin/readiness?workspace_id=workspace-main&project_id=outcome', headers: { cookie: '__session=server-valid' } })
  assert.deepEqual(ready, { status: 200, body: { status: 'ready', active_viewer_count: 2, active_viewer_class_count: 2 } })
  assert.equal(calls.at(-1)[0], 'readiness')
  assert.equal(calls.at(-1)[1].token, 'server-valid')
})

test('stable host admin routes reject aliases missing runtime and client authority without touching ordinary bridge routes', async () => {
  const calls = []
  const requestAdmin = injectedBridgeRequest({ calls })
  const headers = { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }
  const body = JSON.stringify({ project_id: 'outcome', before: '2026-09-02T00:00:00.000Z', limit: 100 })
  for (const pathname of [
    '/api/private/bridge/admin/challenges/cleanup/',
    '/api/private/bridge/admin/challenges/%63leanup',
    '/api/private/bridge/admin/challenges/../readiness',
    '/api/private/bridge/admin/challenges\\cleanup',
    '/api/private/bridge/admin/challenges/cleanup?project_id=outcome&project_id=other',
  ]) assert.notEqual((await requestAdmin({ method: 'POST', pathname, headers, body })).status, 200)
  assert.equal(calls.length, 0)
  const missing = injectedBridgeRequest({ admin: undefined, bridgeRuntimeFactory: async () => ({ bridge: bridgeStub([]), allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' }) })
  assert.deepEqual(await missing({ method: 'GET', pathname: '/api/private/bridge/admin/readiness?workspace_id=workspace-main&project_id=outcome', headers: { authorization: 'Bearer server-valid' } }), { status: 404, body: { error: 'bridge_unavailable' } })
  const ordinaryCalls = []
  let adminCalls = 0
  const untouchedAdmin = Object.fromEntries(['registerViewer', 'revokeViewer', 'cleanupExpiredChallenges', 'readiness'].map((name) => [name, () => { adminCalls += 1; throw new Error(`must not invoke ${name}`) }]))
  const ordinary = injectedBridgeRequest({ calls: ordinaryCalls, admin: untouchedAdmin })
  assert.equal((await ordinary({ method: 'GET', pathname: '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome', headers: { authorization: 'Bearer server-valid' } })).status, 200)
  assert.equal(ordinaryCalls.at(-1)[0], 'read')
  assert.equal(adminCalls, 0)
})

test('raw bridge aliases reject dot separators backslashes controls and invalid percent before authority', async () => {
  const calls = []
  let authentications = 0
  let bridgeFactories = 0
  const runtimeFactory = async () => {
    const runtime = await accountRuntimeFactory()
    return { ...runtime, service: { ...runtime.service, async authenticate(token) { authentications += 1; return runtime.service.authenticate(token) } } }
  }
  const bridgeRequest = createStableHostRequestHandler({
    environment: bridgeEnvironment(),
    runtimeFactory,
    bridgeRuntimeFactory: async () => { bridgeFactories += 1; return { bridge: bridgeStub(calls), allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' } },
  })
  const query = '?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome'
  const aliases = [
    '/api/private/bridge/events/../projection',
    '/api/private/bridge/events/%2e%2e/projection',
    '/api/private/bridge/projection/',
    '/api/private/bridge//projection',
    '/api/private/bridge/%70rojection',
    '/api/private/bridge/events/%2E%2E/projection',
    '/api/private/bridge/events/.%2e/projection',
    '/api/private/bridge/events/%2e./projection',
    '/api/private/bridge/events%2f..%2fprojection',
    '/api/private/bridge/events%5c..%5cprojection',
    '/api/private/bridge/events\\..\\projection',
    '/api/private%2fbridge%2fprojection',
    '/api/private/bridge/events/%00/projection',
    '/api/private/bridge/events/%GG/projection',
    '/api/private/bridge/events/\u0000/projection',
  ]
  for (const pathname of aliases) assert.deepEqual(await bridgeRequest({ method: 'GET', pathname: pathname + query, headers: { authorization: 'Bearer server-valid' } }), { status: 404, body: { error: 'bridge_unavailable' } }, pathname)
  assert.equal(authentications, 0)
  assert.equal(bridgeFactories, 0)
  assert.deepEqual(calls, [])
})

test('request target preserves raw bridge aliases and valid Vercel catch-all query mapping', async () => {
  const query = 'viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome'
  for (const pathname of [
    '/api/private/bridge/events/../projection',
    '/api/private/bridge/events/%2e%2e/projection',
    '/api/private/bridge/events\\..\\projection',
  ]) assert.equal(requestPath({ url: pathname + '?' + query, query: {} }), pathname + '?' + query)

  const catchAll = requestPath({
    url: '/api?path=private%2Fbridge%2Fevents%2F..%2Fprojection&viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome',
    query: { path: 'private/bridge/events/../projection' },
  })
  assert.equal(catchAll, '/api/private/bridge/events/../projection?' + query)
  const calls = []
  const bridgeRequest = injectedBridgeRequest({ calls })
  assert.deepEqual(await bridgeRequest({ method: 'GET', pathname: catchAll, headers: { authorization: 'Bearer server-valid' } }), { status: 404, body: { error: 'bridge_unavailable' } })
  assert.deepEqual(calls, [])

  const canonical = '/api/private/bridge/projection?' + query
  assert.equal(requestPath({ url: canonical, query: {} }), canonical)
  assert.equal((await bridgeRequest({ method: 'GET', pathname: canonical, headers: { authorization: 'Bearer server-valid' } })).status, 200)
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
  const partial = { ...identityEnvironment, OUTCOME_OBSERVER_BRIDGE_V2_PROJECTION_ENROLLMENT_ENABLED: '1' }
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

test('stable host awaits async bridge completion and safely maps rejection', async () => {
  const pathname = '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome'
  const headers = { authorization: 'Bearer server-valid' }
  const resolved = injectedBridgeRequest({ bridge: { ...bridgeStub([]), async read() { return { projections: [{ status: 'durable' }] } } } })
  assert.deepEqual(await resolved({ method: 'GET', pathname, headers }), { status: 200, body: { projections: [{ status: 'durable' }] } })
  for (const [failure, expected] of [
    [new HostedObserverBridgeError('rate_limited'), { status: 503, body: { error: 'bridge_unavailable' } }],
    [new Error('private database detail'), { status: 503, body: { error: 'bridge_unavailable' } }],
  ]) {
    let calls = 0
    const rejected = injectedBridgeRequest({ bridge: { ...bridgeStub([]), async read() { calls += 1; throw failure } } })
    assert.deepEqual(await rejected({ method: 'GET', pathname, headers }), expected)
    assert.equal(calls, 1)
  }
})

test('stable host residual bridge rejection is finite for every endpoint with one call and retry zero', async () => {
  const cases = [
    { path: '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome', method: 'GET', bridgeMethod: 'read', headers: { authorization: 'Bearer server-valid' } },
    { path: '/api/private/bridge/enrollments', method: 'POST', bridgeMethod: 'createEnrollment', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/enrollments/complete', method: 'POST', bridgeMethod: 'completeEnrollment', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/sources/revoke', method: 'POST', bridgeMethod: 'revokeSource', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/sources/rotate', method: 'POST', bridgeMethod: 'createEnrollment', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/events', method: 'POST', bridgeMethod: 'ingest', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') },
  ]
  for (const item of cases) {
    const reasons = [
      new Proxy(new HostedObserverBridgeError('rate_limited'), { getPrototypeOf() { throw new Error('private prototype detail') } }),
      (() => { const error = new HostedObserverBridgeError('rate_limited'); Object.defineProperty(error, 'code', { get() { throw new Error('private code detail') } }); return error })(),
    ]
    for (const reason of reasons) {
      let calls = 0
      const bridge = { ...bridgeStub([]), [item.bridgeMethod]: async () => { calls += 1; throw reason } }
      const bridgeRequest = injectedBridgeRequest({ bridge })
      const actual = await bridgeRequest({ method: item.method, pathname: item.path, headers: item.headers, body: item.body })
      assert.deepEqual(actual, { status: 503, body: { error: 'bridge_unavailable' } })
      assert.equal(calls, 1)
      assert.doesNotMatch(JSON.stringify(actual), /private|prototype|code detail|stack/i)
    }
  }
})

test('re-QA brand blocker is generic for every stable-host endpoint and settlement mode', async () => {
  const cases = [
    { path: '/api/private/bridge/projection?viewer_ref=viewer_workstation_01&viewer_class=workstation&project_id=outcome', method: 'GET', bridgeMethod: 'read', headers: { authorization: 'Bearer server-valid' } },
    { path: '/api/private/bridge/enrollments', method: 'POST', bridgeMethod: 'createEnrollment', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/enrollments/complete', method: 'POST', bridgeMethod: 'completeEnrollment', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/sources/revoke', method: 'POST', bridgeMethod: 'revokeSource', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/sources/rotate', method: 'POST', bridgeMethod: 'createEnrollment', headers: { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }, body: Buffer.from('{}') },
    { path: '/api/private/bridge/events', method: 'POST', bridgeMethod: 'ingest', headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') },
  ]
  const reasons = [
    () => {
      const forged = new Error('private raw identifier')
      Object.setPrototypeOf(forged, HostedObserverBridgeError.prototype)
      Object.defineProperty(forged, 'code', { value: 'rate_limited', enumerable: true, writable: true, configurable: true })
      return forged
    },
    () => {
      const decorated = new HostedObserverBridgeError('rate_limited')
      decorated[Symbol('private decoration')] = true
      return decorated
    },
  ]
  for (const item of cases) for (const reason of reasons) for (const asynchronous of [false, true]) {
    let calls = 0
    const failure = asynchronous
      ? async () => { calls += 1; throw reason() }
      : () => { calls += 1; throw reason() }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    const actual = await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body })
    assert.deepEqual(actual, { status: 503, body: { error: 'bridge_unavailable' } })
    assert.equal(calls, 1)
  }
})

test('brand mutation matrix is generic for every stable-host endpoint and settlement mode', async () => {
  let trapHits = 0
  const trap = () => { trapHits += 1; throw new Error('private trap detail') }
  let calls = 0
  for (const item of stableBridgeCases) for (const reason of stableBrandHostileFactories(trap)) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw reason() }
      : () => { calls += 1; throw reason() }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    assert.deepEqual(await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body }), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 216)
  assert.equal(trapHits, 0)
})

test('genuine hosted operation mappings cover every stable-host endpoint and settlement mode', async () => {
  let calls = 0
  for (const item of stableBridgeCases) for (const [code, error] of stableGenuineHostedOperationErrors()) for (const asynchronous of [false, true]) {
    const status = stableFixedStatuses[code]
    const failure = asynchronous
      ? async () => { calls += 1; throw error }
      : () => { calls += 1; throw error }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    assert.deepEqual(await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body }), { status, body: { error: status === 404 || status === 503 ? 'bridge_unavailable' : code } })
  }
  assert.equal(calls, 60)
})

test('public constructor never confers finite stable-host mapping', async () => {
  let calls = 0
  for (const item of stableBridgeCases) for (const code of Object.keys(stableFixedStatuses)) for (const asynchronous of [false, true]) {
    const failure = asynchronous
      ? async () => { calls += 1; throw new HostedObserverBridgeError(code) }
      : () => { calls += 1; throw new HostedObserverBridgeError(code) }
    const bridge = { ...bridgeStub([]), [item.bridgeMethod]: failure }
    assert.deepEqual(await injectedBridgeRequest({ bridge })({ method: item.method, pathname: item.path, headers: item.headers, body: item.body }), { status: 503, body: { error: 'bridge_unavailable' } })
  }
  assert.equal(calls, 168)
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
  assert.deepEqual(calls[0][1].auth_context, { account_ref: 'a'.repeat(64), workspace_id: 'workspace_main', project_ids: ['outcome'] })
  assert.equal(Object.hasOwn(calls[0][1], 'token'), false)

  const headers = { 'content-type': 'application/json', origin: 'https://preview.invalid', 'x-outcome-csrf': 'synthetic-csrf-value', authorization: 'Bearer server-valid' }
  const spoofed = await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/enrollments', headers, body: Buffer.from('{"auth_context":{"subject":"attacker"}}') })
  assert.deepEqual(spoofed, { status: 400, body: { error: 'bad_request' } })
  assert.equal(calls.filter(([name]) => name === 'createEnrollment').length, 0)
  const valid = await bridgeRequest({ method: 'POST', pathname: '/api/private/bridge/enrollments', headers, body: Buffer.from('{"workspace_id":"workspace_main"}') })
  assert.equal(valid.status, 201)
  assert.deepEqual(calls.at(-1)[1].auth_context, { account_ref: 'a'.repeat(64), workspace_id: 'workspace_main', project_ids: ['outcome'] })
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

const invokeStableHandler = async (request) => {
  const headers = new Map()
  let status
  let body
  await stableHandler(request, {
    setHeader: (name, value) => headers.set(name, value),
    status(value) { status = value; return this },
    json(value) { body = value; return value },
  })
  return { status, body, headers }
}

const streamRequest = (iterator) => ({
  method: 'POST', url: '/api/private/bridge/events', query: {}, headers: {}, body: undefined,
  [Symbol.asyncIterator]: iterator,
})
const singleChunkIterator = (chunk) => function iterator() {
  let yielded = false
  return { next: () => Promise.resolve(yielded ? { done: true } : (yielded = true, { value: chunk, done: false })) }
}

test('trusted runtime iterator does not use mutable function name as authority', async () => {
  let yielded = 0
  const iterator = function platformIterator() {
    let done = false
    return { next: async () => done ? { done: true } : (done = true, yielded += 1, { value: Buffer.from('{}'), done: false }) }
  }
  Object.defineProperty(iterator, 'name', { value: 'bound platformIterator' })
  const actual = await invokeStableHandler(streamRequest(iterator))
  assert.equal(actual.status, 404)
  assert.deepEqual(actual.body, { error: 'bridge_unavailable' })
  assert.equal(actual.headers.get('cache-control'), 'no-store')
  assert.equal(yielded, 1)
})

test('QA stream body blocker rejects getter-bearing chunk without outward failure', async () => {
  let getterHits = 0
  const chunk = Object.create(null)
  Object.defineProperty(chunk, 'valueOf', { get() { getterHits += 1; throw new Error('private chunk getter') } })
  const actual = await invokeStableHandler(streamRequest(singleChunkIterator(chunk)))
  assert.equal(actual.status, 404)
  assert.deepEqual(actual.body, { error: 'bridge_unavailable' })
  assert.equal(actual.headers.get('cache-control'), 'no-store')
  assert.equal(getterHits, 0)
})

test('QA stream body blocker rejects thenable-shaped chunk without outward failure', async () => {
  const chunk = Object.create(null)
  Object.defineProperty(chunk, 'then', { value: () => assert.fail('must not assimilate chunk'), enumerable: true })
  const actual = await invokeStableHandler(streamRequest(singleChunkIterator(chunk)))
  assert.equal(actual.status, 404)
  assert.deepEqual(actual.body, { error: 'bridge_unavailable' })
  assert.equal(actual.headers.get('cache-control'), 'no-store')
})

test('reachable HTTP body chunks reject unsupported values without coercion', async () => {
  let coercionHits = 0
  const fail = () => { coercionHits += 1; throw new Error('must not coerce HTTP chunk') }
  const getterChunk = Object.create(null)
  Object.defineProperty(getterChunk, 'toString', { get: fail })
  Object.defineProperty(getterChunk, 'valueOf', { get: fail })
  const thenableChunk = Object.create(null)
  Object.defineProperty(thenableChunk, 'then', { get: fail })
  const unsupportedChunks = [getterChunk, thenableChunk, new Uint8Array([1]), new ArrayBuffer(1), new String('{}'), {}, Symbol('chunk')]
  for (const chunk of unsupportedChunks) {
    let closeCalls = 0
    const request = streamRequest(() => {
      let yielded = false
      return {
        next: () => yielded ? { done: true } : (yielded = true, { done: false, value: chunk }),
        return: () => { closeCalls += 1; return { done: true } },
      }
    })
    const actual = await invokeStableHandler(request)
    assert.equal(actual.status, 404)
    assert.deepEqual(actual.body, { error: 'bridge_unavailable' })
    assert.equal(actual.headers.get('cache-control'), 'no-store')
    assert.equal(closeCalls, 1)
  }
  assert.equal(coercionHits, 0)
})

test('ordinary platform iterator failure is finite and invalid or capped iteration closes early', async () => {
  let calls = 0
  const failures = [
    streamRequest(() => { calls += 1; throw new Error('private create failure') }),
    streamRequest(() => ({ next: () => { calls += 1; throw new Error('private next failure') } })),
    streamRequest(() => ({ next: () => { calls += 1; return Promise.reject(new Error('private next rejection')) } })),
    streamRequest(() => {
      let yielded = false
      return { next: () => yielded ? { done: true } : (yielded = true, { done: false, value: {} }), return: () => { calls += 1; throw new Error('private cleanup failure') } }
    }),
  ]
  for (const request of failures) {
    const actual = await invokeStableHandler(request)
    assert.equal(actual.status, 404)
    assert.deepEqual(actual.body, { error: 'bridge_unavailable' })
    assert.equal(actual.headers.get('cache-control'), 'no-store')
  }
  assert.equal(calls, 4)

  let invalidClose = 0
  const invalid = streamRequest(() => {
    let yielded = false
    return { next: () => yielded ? { done: true } : (yielded = true, { done: false, value: new Uint8Array([1]) }), return: () => { invalidClose += 1; return { done: true } } }
  })
  assert.equal((await invokeStableHandler(invalid)).status, 404)
  assert.equal(invalidClose, 1)

  let cappedClose = 0
  let cappedNext = 0
  const capped = streamRequest(() => ({
    next: () => { cappedNext += 1; return { done: false, value: Buffer.alloc(600_000) } },
    return: () => { cappedClose += 1; return { done: true } },
  }))
  assert.equal((await invokeStableHandler(capped)).status, 404)
  assert.equal(cappedNext, 2)
  assert.equal(cappedClose, 1)
})

test('stream body genuine multi-chunk Buffer and string values preserve exact bytes', async () => {
  const chunks = [' {', Buffer.from('"value":1'), '} ']
  let index = 0
  const request = streamRequest(() => ({ next: () => index < chunks.length ? { value: chunks[index++], done: false } : { done: true } }))
  const stable = await invokeStableHandler(request)
  assert.equal(stable.status, 404)
  assert.equal(stable.headers.get('cache-control'), 'no-store')
  assert.equal(index, chunks.length)
  let generatorChunks = 0
  const generator = await invokeStableHandler(streamRequest(async function * iterator() {
    for (const chunk of chunks) { generatorChunks += 1; yield chunk }
  }))
  assert.equal(generator.status, 404)
  assert.equal(generatorChunks, chunks.length)

  const expected = Buffer.concat(chunks.map((chunk) => typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
  const calls = []
  const enabled = injectedBridgeRequest({ calls, bridge: bridgeStub(calls, expected.length) })
  assert.equal((await enabled({ method: 'POST', pathname: '/api/private/bridge/events', headers: { 'content-type': 'application/json' }, body: expected })).status, 200)
  assert.equal(calls[0][1].body_bytes, expected.length)
  assert.equal(expected.toString('utf8'), ' {"value":1} ')
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
    const gitCommit = git('rev-parse', 'HEAD')
    const providerCommit = normalizeProviderCommit(process.env.VERCEL_GIT_COMMIT_SHA)
    const carrierSource = !providerCommit && !gitCommit ? readValidatedCarrierSource() : null
    const commit = providerCommit ?? gitCommit ?? carrierSource?.commit
    const tree = process.env.OUTCOME_DEPLOY_TREE ?? (providerCommit || gitCommit ? git('rev-parse', `${commit}^{tree}`) : carrierSource?.tree)
    assertFinalizedReceipt(snapshot, { commit, tree, asset: extractBuiltAsset(html) })
  }
})
