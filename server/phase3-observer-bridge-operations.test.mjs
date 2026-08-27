import assert from 'node:assert/strict'
import test from 'node:test'
import { createObserverBridgeOperations, ObserverBridgeOperationsError } from './phase3-observer-bridge-operations.mjs'

const BASE = Date.parse('2026-08-27T00:00:00.000Z')
const expectCode = (operation, code) => assert.throws(operation, (error) => error instanceof ObserverBridgeOperationsError && error.code === code)

test('operations default feature off, ingest disabled and read-only with no authority fields', () => {
  const operations = createObserverBridgeOperations()
  assert.deepEqual(operations.status(), { feature: 'off', ingest: 'disabled', mode: 'read_only', revision: 0, schema_version: 1 })
  assert.deepEqual(operations.metrics(), { feature: 'off', ingest: 'disabled', mode: 'read_only', revision: 0, durable_revision: 0, cache_parity: 'equal', audit_count: 0 })
  assert.doesNotMatch(JSON.stringify([operations.status(), operations.metrics()]), /progress|gate|approval|completion|prompt|result|session|thread|turn|path|credential/i)
  expectCode(() => operations.admit({ body_bytes: 1, cost_units: 1 }), 'unavailable')
})

test('ingest admission enforces actual body, rolling rate and cost limits atomically', () => {
  let clock = BASE
  const operations = createObserverBridgeOperations({ feature_enabled: true, ingest_enabled: true, read_only: false, rate_limit_count: 2, rate_window_ms: 1_000, body_limit_bytes: 10, cost_limit_units: 3, now: () => clock })
  assert.equal(operations.admit({ body_bytes: 10, cost_units: 1 }).status, 'admitted')
  assert.equal(operations.admit({ body_bytes: 1, cost_units: 1 }).status, 'admitted')
  expectCode(() => operations.admit({ body_bytes: 1, cost_units: 1 }), 'rate_limited')
  clock += 1_001
  expectCode(() => operations.admit({ body_bytes: 11, cost_units: 1 }), 'body_too_large')
  assert.equal(operations.admit({ body_bytes: 1, cost_units: 1 }).status, 'admitted')
  expectCode(() => operations.admit({ body_bytes: 1, cost_units: 1 }), 'cost_limited')
})

test('freshness decays to stale and offline without replay or progress inference', () => {
  let clock = BASE
  const operations = createObserverBridgeOperations({ durable_revision: 3, cache_revision: 3, freshness_ms: 60_000, now: () => clock })
  const input = { status_code: '구현 진행 중', observed_at: new Date(BASE).toISOString(), expires_at: new Date(BASE + 60_000).toISOString(), durable_revision: 3, cache_revision: 3 }
  assert.deepEqual(operations.projection(input), { status_code: '구현 진행 중', freshness_class: 'fresh', durable_revision: 3, cache_revision: 3 })
  clock = BASE + 60_001
  assert.deepEqual(operations.projection(input), { status_code: null, freshness_class: 'stale', durable_revision: 3, cache_revision: 3 })
  clock = BASE + 120_001
  assert.deepEqual(operations.projection(input), { status_code: null, freshness_class: 'offline', durable_revision: 3, cache_revision: 3 })
  expectCode(() => operations.projection({ ...input, cache_revision: 4 }), 'revision_conflict')
})

test('disable and exact restore stay read-only, CAS-bound and require tombstone replay', () => {
  const operations = createObserverBridgeOperations({ feature_enabled: true, ingest_enabled: true, read_only: false, durable_revision: 4, cache_revision: 4 })
  assert.deepEqual(operations.disable({ expected_revision: 0, reason_code: 'source_compromise' }), { status: 'disabled', revision: 1, reason_code: 'source_compromise' })
  expectCode(() => operations.disable({ expected_revision: 0, reason_code: 'operator_action' }), 'revision_conflict')
  const manifest = { expected_revision: 1, schema_version: 1, durable_revision: 4, cache_revision: 4, tombstones_applied: true, backup_digest: 'a'.repeat(64) }
  expectCode(() => operations.restore({ ...manifest, schema_version: 2 }), 'input_invalid')
  expectCode(() => operations.restore({ ...manifest, tombstones_applied: false }), 'restore_denied')
  expectCode(() => operations.restore({ ...manifest, cache_revision: 5 }), 'restore_denied')
  assert.deepEqual(operations.restore(manifest), { status: 'restore_verified', revision: 2, durable_revision: 4, mode: 'read_only' })
  assert.deepEqual(operations.status(), { feature: 'off', ingest: 'disabled', mode: 'read_only', revision: 2, schema_version: 1 })
})

test('retention requires a tombstone, preserves count-only receipt and prevents raw resurrection', () => {
  const operations = createObserverBridgeOperations({ durable_revision: 2, cache_revision: 2 })
  expectCode(() => operations.applyRetention({ expected_revision: 0, expired_challenges: 1, expired_replays: 2, expired_events: 3, tombstone_written: false }), 'retention_denied')
  assert.deepEqual(operations.applyRetention({ expected_revision: 0, expired_challenges: 1, expired_replays: 2, expired_events: 3, tombstone_written: true }), { status: 'retention_applied', revision: 1, deleted_count: 6, tombstone_state: 'recorded' })
  assert.doesNotMatch(JSON.stringify(operations.metrics()), /source|event|request|digest|signature|account|email|path|credential|progress|gate|approval|completion/i)
})

test('authorized export is revision-bound and contains only finite recovery metadata', () => {
  const operations = createObserverBridgeOperations({ durable_revision: 2, cache_revision: 2 })
  assert.deepEqual(operations.exportReceipt({ expected_revision: 0 }), {
    status: 'export_ready',
    schema_version: 1,
    durable_revision: 2,
    revision: 0,
    content_class: 'finite_status_only',
    tombstone_policy: 'required',
  })
  expectCode(() => operations.exportReceipt({ expected_revision: 1 }), 'export_denied')
  const serialized = JSON.stringify(operations.exportReceipt({ expected_revision: 0 }))
  assert.doesNotMatch(serialized, /source|event|request|digest|signature|account|email|path|credential|prompt|result|session|thread|turn|progress|gate|approval|completion/i)
})

test('clock, clone and reentry failures preserve the exact operations state', () => {
  const clockFailure = createObserverBridgeOperations({ feature_enabled: true, ingest_enabled: true, read_only: false, now: () => { throw new Error('private') } })
  expectCode(() => clockFailure.admit({ body_bytes: 1, cost_units: 1 }), 'clock_unavailable')
  assert.equal(clockFailure.metrics().audit_count, 0)

  const cloneFailure = createObserverBridgeOperations({ clone: () => { throw new Error('private') } })
  expectCode(() => cloneFailure.disable({ expected_revision: 0, reason_code: 'operator_action' }), 'materialization_failed')
  assert.equal(cloneFailure.status().revision, 0)

  let operations
  const reentrant = createObserverBridgeOperations({ feature_enabled: true, ingest_enabled: true, read_only: false, now: () => {
    expectCode(() => operations.disable({ expected_revision: 0, reason_code: 'operator_action' }), 'reentrant_operation')
    return BASE
  } })
  operations = reentrant
  expectCode(() => operations.admit({ body_bytes: 1, cost_units: 1 }), 'reentrant_operation')
  assert.equal(operations.status().revision, 0)
})

test('hostile primitive and Proxy inputs fail before traps and state changes', () => {
  const operations = createObserverBridgeOperations({ feature_enabled: true, ingest_enabled: true, read_only: false })
  let hits = 0
  const proxy = new Proxy({}, { ownKeys() { hits += 1; return [] }, get() { hits += 1 } })
  expectCode(() => operations.admit(proxy), 'input_invalid')
  const accessor = {}
  Object.defineProperty(accessor, 'body_bytes', { enumerable: true, get() { hits += 1; return 1 } })
  Object.defineProperty(accessor, 'cost_units', { enumerable: true, value: 1 })
  expectCode(() => operations.admit(accessor), 'input_invalid')
  assert.equal(hits, 0)
  assert.equal(operations.metrics().audit_count, 0)
})
