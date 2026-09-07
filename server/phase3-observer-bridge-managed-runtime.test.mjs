import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, X509Certificate } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { rootCertificates } from 'node:tls'
import { PGlite } from '@electric-sql/pglite'
import { canonicalEnrollmentBytes, canonicalHostedRequestBytes } from './phase3-observer-bridge-hosted.mjs'
import {
  MANAGED_OBSERVER_BRIDGE_ENV,
  createManagedObserverBridgeRuntimeFactory,
  createPostgresTransactionPort,
  readDeploymentPreviewOrigin,
  readManagedObserverBridgeConfiguration,
} from './phase3-observer-bridge-managed-runtime.mjs'

const binding = { workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'builder', binding_version: 18, source_ref: 'source_private_01' }
const key = Buffer.alloc(32, 7).toString('base64url')
const databaseCaPem = new X509Certificate(rootCertificates[0]).toString()
const environment = () => ({
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'outcome-preview-abc.vercel.app',
  [MANAGED_OBSERVER_BRIDGE_ENV.databaseUrl]: 'postgresql://outcome_bridge_runtime:private@localhost/outcome',
  [MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem]: databaseCaPem,
  [MANAGED_OBSERVER_BRIDGE_ENV.csrfSecret]: 'synthetic-csrf-secret',
  [MANAGED_OBSERVER_BRIDGE_ENV.bindings]: JSON.stringify([binding]),
  [MANAGED_OBSERVER_BRIDGE_ENV.recoveryKeyV1]: key,
})

test('managed V2 environment names and deployment-owned Preview origin are exact', () => {
  assert.deepEqual(Object.values(MANAGED_OBSERVER_BRIDGE_ENV), [
    'OUTCOME_OBSERVER_BRIDGE_V2_DATABASE_URL',
    'OUTCOME_OBSERVER_BRIDGE_V2_DATABASE_CA_PEM',
    'OUTCOME_OBSERVER_BRIDGE_V2_CSRF_SECRET',
    'OUTCOME_OBSERVER_BRIDGE_V2_BINDINGS_JSON',
    'OUTCOME_OBSERVER_BRIDGE_V2_RECOVERY_KEY_V1',
  ])
  assert.equal(readManagedObserverBridgeConfiguration(environment()).valid, true)
  assert.equal(readManagedObserverBridgeConfiguration({ ...environment(), OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://attacker.invalid' }).valid, true)
  for (const change of [
    { VERCEL_ENV: 'production' },
    { VERCEL_URL: 'https://outcome-preview-abc.vercel.app' },
    { VERCEL_URL: 'outcome-preview-abc.vercel.app/path' },
    { VERCEL_URL: 'OUTCOME-preview-abc.vercel.app' },
    { VERCEL_URL: 'outcome-preview-abc.vercel.app.' },
  ]) assert.equal(readManagedObserverBridgeConfiguration({ ...environment(), ...change }).valid, false)
})

test('Preview origin rejects hostile environment shapes without executing accessors or proxy traps', () => {
  let hits = 0
  const accessor = { VERCEL_URL: 'preview.vercel.app' }
  Object.defineProperty(accessor, 'VERCEL_ENV', { enumerable: true, get() { hits += 1; return 'preview' } })
  const proxy = new Proxy({}, {
    getOwnPropertyDescriptor() { hits += 1; throw new Error('trap') },
    get() { hits += 1; throw new Error('trap') },
  })
  assert.equal(readDeploymentPreviewOrigin(accessor), null)
  assert.equal(readDeploymentPreviewOrigin(proxy), null)
  assert.equal(hits, 0)
})

test('v1 to v2 managed flow survives restart and recovers the exact completion response without a second mutation', async () => {
  const db = await PGlite.create('memory://')
  const at = Date.parse('2026-09-01T00:00:00.000Z')
  try {
    await db.exec("create role anon nologin; create role authenticated nologin; create schema auth; create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;")
    for (const path of ['../supabase/migrations/202608250001_account_access_foundation.sql', '../supabase/migrations/20260827000756_observer_bridge.sql', '../supabase/migrations/20260901082821_observer_bridge_durable_v2.sql', '../supabase/migrations/20260902100000_observer_bridge_workspace_bootstrap_v2.sql']) await db.exec(await readFile(new URL(path, import.meta.url), 'utf8'))
    await db.exec(`
      insert into outcome_private.workspaces(id,state) values ('workspace-main','active');
      insert into outcome_private.workspace_memberships(workspace_id,identity_subject,role,state) values ('workspace-main','subject-main','owner-viewer','active');
      insert into outcome_private.projects(id,package_id,state) values ('project-outcome','outcome','active');
      insert into outcome_private.project_bindings(workspace_id,project_id,state) values ('workspace-main','project-outcome','active');
      insert into outcome_private.bridge_schema_versions(workspace_id,schema_version,durable_revision,updated_at) values ('workspace-main',2,0,'2026-09-01T00:00:00.000Z');
      set session authorization outcome_bridge_runtime;
    `)
    class Pool { async connect() { return { query: db.query.bind(db), release() {} } } }
    const backendQuery = async (sql) => { await db.exec('set role outcome_bridge_backend'); try { return await db.query(sql) } finally { await db.exec('reset role') } }
    const accountRuntime = { service: { async resolveBridgeAuthority() { return { account_ref: 'a'.repeat(64), workspace_id: 'workspace-main', project_ids: ['project-outcome'] } } } }
    const makeRuntime = () => createManagedObserverBridgeRuntimeFactory({ environment: environment(), driverLoader: async () => ({ Pool }), now: () => at })({ accountRuntime, capabilities: { projectionEnrollment: true, ingestion: true } })
    const runtime = await makeRuntime()
    assert.ok(runtime)
    const viewerRevisions = new Map()
    for (const [viewer_ref, viewer_class, idempotency] of [['viewer_workstation_01', 'workstation', 'viewer-idem-workstation'], ['viewer_remote_device_01', 'remote_device', 'viewer-idem-remote']]) {
      const input = { token: 'owner-token', workspace_id: 'workspace-main', project_id: 'project-outcome', viewer_ref, viewer_class, idempotency_key: idempotency, expected_schema_revision: 2 }
      const registered = await runtime.admin.registerViewer(input)
      assert.equal(registered.status, 'viewer_registered')
      assert.equal((await runtime.admin.registerViewer(input)).revision, registered.revision)
      await assert.rejects(() => runtime.admin.registerViewer({ ...input, viewer_ref: `${viewer_ref}_conflict` }), (error) => error.code === 'idempotency_conflict')
      viewerRevisions.set(viewer_ref, registered.revision)
    }
    assert.deepEqual(await runtime.admin.readiness({ token: 'owner-token', workspace_id: 'workspace-main', project_id: 'project-outcome' }), { status: 'ready', active_viewer_count: 2, active_viewer_class_count: 2 })
    const auth_context = { account_ref: 'a'.repeat(64), workspace_id: 'workspace-main', project_ids: ['project-outcome'] }
    const enrollment = await runtime.bridge.createEnrollment({ auth_context, ...binding, mode: 'enroll', idempotency_key: 'enrollment-attempt-01' })
    assert.deepEqual(await runtime.bridge.createEnrollment({ auth_context, ...binding, mode: 'enroll', idempotency_key: 'enrollment-attempt-01' }), enrollment)
    const keys = generateKeyPairSync('ed25519')
    const public_key_spki = keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
    const proof_signature = sign(null, canonicalEnrollmentBytes({ ...enrollment.enrollment_scope, challenge_ref: enrollment.challenge_ref, challenge_nonce: enrollment.challenge_nonce, public_key_spki }), keys.privateKey).toString('base64url')
    const completeInput = { challenge_ref: enrollment.challenge_ref, public_key_spki, proof_signature }
    const completed = await runtime.bridge.completeEnrollment(completeInput)
    const revisionAfterComplete = Number((await backendQuery("select durable_revision from outcome_private.bridge_schema_versions where workspace_id='workspace-main'")).rows[0].durable_revision)
    const restarted = await makeRuntime()
    const recovered = await restarted.bridge.completeEnrollment(completeInput)
    assert.deepEqual(recovered, { ...completed, recovered: true })
    assert.equal(Number((await backendQuery("select durable_revision from outcome_private.bridge_schema_versions where workspace_id='workspace-main'")).rows[0].durable_revision), revisionAfterComplete)
    await assert.rejects(() => restarted.bridge.completeEnrollment({ ...completeInput, proof_signature: proof_signature.replace(/^./, proof_signature[0] === 'A' ? 'B' : 'A') }), (error) => error.code === 'enrollment_conflict')
    await assert.rejects(() => restarted.admin.cleanupExpiredChallenges({ workspace_id: 'workspace-main', before: new Date(at + 300_001).toISOString(), limit: 100 }), (error) => error.code === 'input_invalid')
    assert.equal((await restarted.admin.cleanupExpiredChallenges({ token: 'owner-token', project_id: 'project-outcome', before: new Date(at + 300_001).toISOString(), limit: 100 })).cleared_count, 1)
    assert.equal((await restarted.bridge.completeEnrollment(completeInput)).certificate_ref, completed.certificate_ref)
    const observed_at = new Date(at + 1_000).toISOString(); const expires_at = new Date(at + 61_000).toISOString()
    const event = { schema_version: 1, project_id: 'project-outcome', role: 'builder', binding_version: 18, source_ref: 'source_private_01', source_version: 1, key_version: 1, sequence: 1, observed_at, expires_at, status_code: '구현 진행 중', signature: sign(null, Buffer.from('event'), keys.privateKey).toString('base64url') }
    const request = { certificate_ref: completed.certificate_ref, request_id: 'request_private_01', nonce: 'nonce_private_0001', event }
    const request_signature = sign(null, canonicalHostedRequestBytes(request), keys.privateKey).toString('base64url')
    assert.equal((await restarted.bridge.ingest({ ...request, request_signature })).status, 'accepted')
    assert.equal((await restarted.bridge.ingest({ ...request, request_signature })).status, 'duplicate')
    for (let sequence = 2; sequence <= 60; sequence += 1) {
      const nextEvent = { ...event, sequence }
      const nextRequest = { certificate_ref: completed.certificate_ref, request_id: `request_private_${String(sequence).padStart(2, '0')}`, nonce: `nonce_private_${String(sequence).padStart(4, '0')}`, event: nextEvent }
      const nextSignature = sign(null, canonicalHostedRequestBytes(nextRequest), keys.privateKey).toString('base64url')
      assert.equal((await restarted.bridge.ingest({ ...nextRequest, request_signature: nextSignature })).status, 'accepted')
    }
    const limitedEvent = { ...event, sequence: 61 }
    const limitedRequest = { certificate_ref: completed.certificate_ref, request_id: 'request_private_61', nonce: 'nonce_private_0061', event: limitedEvent }
    const limitedSignature = sign(null, canonicalHostedRequestBytes(limitedRequest), keys.privateKey).toString('base64url')
    await assert.rejects(() => restarted.bridge.ingest({ ...limitedRequest, request_signature: limitedSignature }), (error) => error.code === 'rate_limited')
    for (const [viewer_ref, viewer_class] of [['viewer_workstation_01', 'workstation'], ['viewer_remote_device_01', 'remote_device']]) assert.equal((await restarted.bridge.read({ auth_context, viewer_ref, viewer_class, project_id: 'project-outcome' })).projection.status_code, '구현 진행 중')
    const revokeViewerInput = { token: 'owner-token', workspace_id: 'workspace-main', project_id: 'project-outcome', viewer_ref: 'viewer_remote_device_01', expected_revision: viewerRevisions.get('viewer_remote_device_01'), idempotency_key: 'viewer-revoke-remote' }
    const viewerRevoked = await restarted.admin.revokeViewer(revokeViewerInput)
    assert.equal((await restarted.admin.revokeViewer(revokeViewerInput)).revision, viewerRevoked.revision)
    await assert.rejects(() => restarted.bridge.read({ auth_context, viewer_ref: 'viewer_remote_device_01', viewer_class: 'remote_device', project_id: 'project-outcome' }), (error) => error.code === 'access_denied')
    assert.equal((await restarted.bridge.revokeSource({ auth_context, certificate_ref: completed.certificate_ref, expected_revision: 1 })).status, 'source_revoked')
    await assert.rejects(() => restarted.bridge.completeEnrollment(completeInput), (error) => error.code === 'enrollment_conflict')
    assert.equal(Number((await backendQuery('select count(*)::int count from outcome_private.bridge_rate_windows')).rows[0].count), 0)
  } finally { await db.close() }
})

test('managed configuration strictly parses exact bindings and recovery key without returning secrets', () => {
  const value = readManagedObserverBridgeConfiguration(environment())
  assert.equal(value.valid, true)
  assert.equal(value.bindingCount, 1)
  assert.match(value.bindingDigest, /^[a-f0-9]{64}$/)
  assert.equal(value.recoveryKeyVersion, 1)
  assert.match(value.recoveryKeyFingerprint, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(value).includes('source_private_01'), false)
  assert.equal(JSON.stringify(value).includes(key), false)
  assert.equal(JSON.stringify(value).includes(databaseCaPem), false)

  for (const change of [
    { [MANAGED_OBSERVER_BRIDGE_ENV.recoveryKeyV1]: '' },
    { [MANAGED_OBSERVER_BRIDGE_ENV.bindings]: '[]' },
    { [MANAGED_OBSERVER_BRIDGE_ENV.bindings]: JSON.stringify([binding, binding]) },
    { [MANAGED_OBSERVER_BRIDGE_ENV.databaseUrl]: 'postgresql://postgres:private@localhost/outcome' },
    { [MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem]: '' },
    { [MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem]: '-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----\n' },
    { [MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem]: `${databaseCaPem}${databaseCaPem}` },
    { [MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem]: `${databaseCaPem}${'A'.repeat(16_384)}` },
    { [MANAGED_OBSERVER_BRIDGE_ENV.databaseUrl]: 'postgresql://outcome_bridge_runtime:private@localhost/outcome?sslmode=no-verify' },
    { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
  ]) assert.equal(readManagedObserverBridgeConfiguration({ ...environment(), ...change }).valid, false)
})

test('managed CA rejects accessor-backed and proxied environment carriers without executing caller behavior', () => {
  let hits = 0
  const accessor = environment()
  Object.defineProperty(accessor, MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem, { enumerable: true, get() { hits += 1; return databaseCaPem } })
  const proxy = new Proxy(environment(), {
    getOwnPropertyDescriptor() { hits += 1; throw new Error('hostile trap') },
    get() { hits += 1; throw new Error('hostile trap') },
  })
  assert.equal(readManagedObserverBridgeConfiguration(accessor).valid, false)
  assert.equal(readManagedObserverBridgeConfiguration(proxy).valid, false)
  assert.equal(hits, 0)
})

test('managed construction boundaries reject hostile records without executing caller behavior', async () => {
  const hostileShapes = (field) => {
    let hits = 0
    const getter = Object.defineProperty({}, field, { enumerable: true, get() { hits += 1; throw new Error('hostile getter') } })
    const proxy = new Proxy({}, { get() { hits += 1; throw new Error('hostile trap') }, getOwnPropertyDescriptor() { hits += 1; throw new Error('hostile trap') }, ownKeys() { hits += 1; throw new Error('hostile trap') }, getPrototypeOf() { hits += 1; throw new Error('hostile trap') } })
    const decorated = Object.create({ inherited: true }); decorated[field] = null
    const symbol = { [field]: null, [Symbol('hostile')]: true }
    const unknown = { [field]: null, unknown: true }
    return { values: [getter, proxy, decorated, symbol, unknown], hits: () => hits }
  }

  const factoryOptions = hostileShapes('environment')
  for (const value of factoryOptions.values) assert.equal(await createManagedObserverBridgeRuntimeFactory(value)({}), null)
  assert.equal(factoryOptions.hits(), 0)

  const invocationInputs = hostileShapes('accountRuntime')
  const runtimeFactory = createManagedObserverBridgeRuntimeFactory({ environment: environment() })
  for (const value of invocationInputs.values) assert.equal(await runtimeFactory(value), null)
  assert.equal(invocationInputs.hits(), 0)

  const transactionOptions = hostileShapes('pool')
  for (const value of transactionOptions.values) assert.throws(() => createPostgresTransactionPort(value), /managed_runtime_unavailable/)
  assert.equal(transactionOptions.hits(), 0)

  let callbackHits = 0
  const nestedFactory = createManagedObserverBridgeRuntimeFactory({ environment: environment(), driverLoader: async () => { callbackHits += 1; return {} } })
  const hostileCapabilities = hostileShapes('projectionEnrollment')
  for (const capabilities of hostileCapabilities.values) assert.equal(await nestedFactory({ accountRuntime: {}, capabilities }), null)
  assert.equal(hostileCapabilities.hits(), 0)
  const hostileAccountRuntime = hostileShapes('service')
  for (const accountRuntime of hostileAccountRuntime.values) assert.equal(await nestedFactory({ accountRuntime, capabilities: { projectionEnrollment: true, ingestion: true } }), null)
  assert.equal(hostileAccountRuntime.hits(), 0)
  const hostileService = hostileShapes('resolveBridgeAuthority')
  for (const service of hostileService.values) assert.equal(await nestedFactory({ accountRuntime: { service }, capabilities: { projectionEnrollment: true, ingestion: true } }), null)
  assert.equal(hostileService.hits(), 0)
  assert.equal(callbackHits, 0)
})

test('ordinary managed construction controls preserve runtime and transaction behavior', async () => {
  const calls = []
  let poolOptions = null
  class Pool {
    constructor(options) { poolOptions = options }
    async connect() {
      return {
        async query(sql) {
          calls.push(sql)
          if (sql === 'select session_user, current_user') return { rows: [{ session_user: 'outcome_bridge_runtime', current_user: 'outcome_bridge_backend' }] }
          return { rows: [] }
        },
        release() { calls.push('release') },
      }
    }
  }
  const repository = {}
  const runtime = await createManagedObserverBridgeRuntimeFactory({ environment: environment(), driverLoader: async () => ({ Pool }), repositoryFactory: () => repository })({
    accountRuntime: { service: { async resolveBridgeAuthority() { return { account_ref: 'a'.repeat(64), workspace_id: 'workspace-main', project_ids: ['project-outcome'] } } } },
    capabilities: { projectionEnrollment: true, ingestion: true },
  })
  assert.ok(runtime)
  assert.equal(typeof runtime.bridge.createEnrollment, 'function')
  assert.equal(typeof runtime.admin.registerViewer, 'function')
  assert.deepEqual(poolOptions.ssl, { ca: databaseCaPem, rejectUnauthorized: true })
  assert.equal(JSON.stringify(readManagedObserverBridgeConfiguration(environment())).includes('databaseCaPem'), false)

  const transact = createPostgresTransactionPort({ pool: new Pool() })
  assert.equal(await transact({ effective_role: 'outcome_bridge_backend' }, async () => 'ok'), 'ok')
  assert.deepEqual(calls, ['BEGIN', 'SET LOCAL ROLE outcome_bridge_backend', 'select session_user, current_user', 'COMMIT', 'release'])
})

test('admin cleanup resolves fresh token and exact project before using only the authorized workspace', async () => {
  const cleaned = []
  let authorityCalls = 0
  class Pool { async connect() { throw new Error('must not connect before authorized repository operation') } }
  const runtime = await createManagedObserverBridgeRuntimeFactory({
    environment: environment(),
    driverLoader: async () => ({ Pool }),
    repositoryFactory: () => ({
      async cleanupExpiredChallenges(value) { cleaned.push(value); return { status: 'challenge_cleanup', cleared_count: 0 } },
    }),
  })({
    accountRuntime: { service: { async resolveBridgeAuthority({ token }) {
      authorityCalls += 1
      if (token === 'inactive-token') return { account_ref: 'a'.repeat(64), workspace_id: 'workspace-main', project_ids: [] }
      if (token !== 'owner-token') throw new Error('private auth detail')
      return { account_ref: 'a'.repeat(64), workspace_id: 'workspace-main', project_ids: ['project-outcome'] }
    } } },
    capabilities: { projectionEnrollment: true, ingestion: true },
  })
  const input = { token: 'owner-token', project_id: 'project-outcome', before: '2026-09-02T00:00:00.000Z', limit: 100 }
  assert.deepEqual(await runtime.admin.cleanupExpiredChallenges(input), { status: 'challenge_cleanup', cleared_count: 0 })
  assert.deepEqual(cleaned, [{ workspace_id: 'workspace-main', before: input.before, limit: 100 }])
  await assert.rejects(() => runtime.admin.cleanupExpiredChallenges({ ...input, project_id: 'project-other' }), (error) => error.code === 'access_denied')
  await assert.rejects(() => runtime.admin.cleanupExpiredChallenges({ ...input, token: 'revoked-token' }), (error) => error.code === 'auth_unavailable')
  await assert.rejects(() => runtime.admin.cleanupExpiredChallenges({ ...input, token: 'inactive-token' }), (error) => error.code === 'access_denied')
  await assert.rejects(() => runtime.admin.cleanupExpiredChallenges({ ...input, workspace_id: 'workspace-other' }), (error) => error.code === 'input_invalid')
  assert.equal(authorityCalls, 4)
  assert.equal(cleaned.length, 1)
})

test('transaction port verifies exact session and effective roles before the bridge query', async () => {
  const calls = []
  const client = {
    async query(sql) {
      calls.push(sql)
      if (sql === 'select session_user, current_user') return { rows: [{ session_user: 'outcome_bridge_runtime', current_user: 'outcome_bridge_backend' }] }
      return { rows: [] }
    },
    release() { calls.push('release') },
  }
  const transact = createPostgresTransactionPort({ pool: { async connect() { return client } } })
  const result = await transact({ effective_role: 'outcome_bridge_backend' }, async (port) => {
    await port.query('select schema_version from outcome_private.bridge_schema_versions')
    return 'ok'
  })
  assert.equal(result, 'ok')
  assert.deepEqual(calls, ['BEGIN', 'SET LOCAL ROLE outcome_bridge_backend', 'select session_user, current_user', 'select schema_version from outcome_private.bridge_schema_versions', 'COMMIT', 'release'])
})

test('transaction port rolls back before callback on identity mismatch and never retries', async () => {
  let callbackCount = 0
  let connectCount = 0
  const calls = []
  const transact = createPostgresTransactionPort({ pool: { async connect() {
    connectCount += 1
    return {
      async query(sql) {
        calls.push(sql)
        if (sql === 'select session_user, current_user') return { rows: [{ session_user: 'postgres', current_user: 'outcome_bridge_backend' }] }
        return { rows: [] }
      },
      release() { calls.push('release') },
    }
  } } })
  await assert.rejects(() => transact({ effective_role: 'outcome_bridge_backend' }, async () => { callbackCount += 1 }), /managed_runtime_unavailable/)
  assert.equal(connectCount, 1)
  assert.equal(callbackCount, 0)
  assert.deepEqual(calls, ['BEGIN', 'SET LOCAL ROLE outcome_bridge_backend', 'select session_user, current_user', 'ROLLBACK', 'release'])
})
