import assert from 'node:assert/strict'
import test from 'node:test'

import { createPhase3ObservationRelay } from './phase3-observation-relay.mjs'

const BASE_TIME = Date.parse('2026-08-26T08:00:00.000Z')
const config = (overrides = {}) => ({
  project_ids: ['outcome'],
  roles: ['builder'],
  binding_versions: [1],
  source_hosts: ['source-a', 'source-b'],
  freshness_ms: 60_000,
  registry_revision: 7,
  now: () => BASE_TIME,
  enabled: true,
  ...overrides,
})
const event = (overrides = {}) => ({
  project_id: 'outcome',
  role: 'builder',
  binding_version: 1,
  source_host: 'source-a',
  sequence: 1,
  observed_at: '2026-08-26T08:00:00.000Z',
  availability: 'available',
  now_summary: '공개 가능한 합성 작업 요약',
  ...overrides,
})
const snapshot = (relay) => structuredClone(relay.read())

test('constructor and every mutation reject non-primitive or coercive input before use', () => {
  const hostile = [new String('outcome'), Symbol('outcome'), {}, new Proxy({}, { get() { throw new Error('proxy touched') } }), { toString() { throw new Error('coerced') } }]
  for (const value of hostile) {
    assert.throws(() => createPhase3ObservationRelay(config({ project_ids: [value] })), /configuration_invalid/)
  }
  assert.throws(() => createPhase3ObservationRelay(config({ freshness_ms: new Number(1) })), /configuration_invalid/)
  assert.throws(() => createPhase3ObservationRelay(config({ enabled: 1 })), /configuration_invalid/)
  assert.throws(() => createPhase3ObservationRelay(config({ registry_revision: 0 })), /configuration_invalid/)
  assert.throws(() => createPhase3ObservationRelay({ ...config(), secret: 'not accepted' }), /configuration_invalid/)

  const relay = createPhase3ObservationRelay(config())
  for (const value of hostile) {
    const before = snapshot(relay)
    assert.throws(() => relay.ingest(event({ project_id: value })), /input_invalid/)
    assert.deepEqual(relay.read(), before)
    assert.throws(() => relay.disconnect({ source_host: value }), /input_invalid/)
    assert.deepEqual(relay.read(), before)
    assert.throws(() => relay.reconnect({ source_host: value, expected_last_sequence: 0, event: event({ sequence: 2 }) }), /input_invalid/)
    assert.deepEqual(relay.read(), before)
    assert.throws(() => relay.restore({ registry_revision: value }), /input_invalid/)
    assert.deepEqual(relay.read(), before)
    assert.throws(() => relay.disable(value), /input_invalid/)
    assert.deepEqual(relay.read(), before)
  }
})

test('valid ingest preserves the public event and exact duplicate is idempotent', () => {
  const relay = createPhase3ObservationRelay(config())
  const accepted = relay.ingest(event())
  assert.equal(accepted.status, 'accepted')
  assert.deepEqual(accepted.projection, {
    project_id: 'outcome', role: 'builder', binding_version: 1, source_host: 'source-a', sequence: 1,
    availability: 'available', freshness_class: 'fresh', observed_at: '2026-08-26T08:00:00.000Z', now_summary: '공개 가능한 합성 작업 요약',
  })
  const before = snapshot(relay)
  assert.equal(relay.ingest(event()).status, 'duplicate')
  assert.deepEqual(relay.read(), before)
  assert.equal(relay.read().evidence.length, 1)
})

test('conflicting duplicate, lower sequence and gap preserve last sequence but remove NOW', () => {
  const duplicate = createPhase3ObservationRelay(config())
  duplicate.ingest(event({ sequence: 2 }))
  assert.equal(duplicate.ingest(event({ sequence: 2, availability: 'idle' })).status, 'conflict')
  assert.equal(duplicate.read().evidence.at(-1).reason_code, 'duplicate_conflict')

  const lower = createPhase3ObservationRelay(config())
  lower.ingest(event({ sequence: 2 }))
  assert.equal(lower.ingest(event({ sequence: 1 })).status, 'conflict')
  assert.equal(lower.read().evidence.at(-1).reason_code, 'out_of_order')

  const relay = createPhase3ObservationRelay(config())
  relay.ingest(event({ sequence: 2 }))
  assert.equal(relay.ingest(event({ sequence: 4, observed_at: '2026-08-26T08:00:01.000Z' })).status, 'conflict')
  assert.equal(relay.ingest(event({ sequence: 3, observed_at: '2026-08-26T08:00:01.000Z' })).status, 'conflict')
  const view = relay.read()
  assert.equal(view.projections[0].sequence, 2)
  assert.equal(view.projections[0].availability, 'conflicting')
  assert.equal('now_summary' in view.projections[0], false)
  assert.deepEqual(view.evidence.map((item) => item.evidence_id), [1, 2, 3])
  assert.deepEqual(view.evidence.map((item) => item.reason_code), ['accepted', 'sequence_gap', 'resync_required'])
})

test('freshness and unavailable states never expose NOW or synthesize progress', () => {
  let clock = BASE_TIME
  const relay = createPhase3ObservationRelay(config({ now: () => clock }))
  relay.ingest(event())
  clock += 60_001
  assert.deepEqual(relay.read().projections[0], {
    project_id: 'outcome', role: 'builder', binding_version: 1, source_host: 'source-a', sequence: 1,
    availability: 'available', freshness_class: 'stale', observed_at: '2026-08-26T08:00:00.000Z',
  })
  for (const availability of ['idle', 'offline', 'unknown']) {
    const item = createPhase3ObservationRelay(config())
    item.ingest(event({ availability, now_summary: undefined }))
    assert.equal('now_summary' in item.read().projections[0], false)
  }
  assert.doesNotMatch(JSON.stringify(relay.read()), /progress|completion|approval|dispatch|active/i)
})

test('allowlists, timestamps and prohibited summary shapes fail atomically', () => {
  const relay = createPhase3ObservationRelay(config())
  const invalid = [
    event({ project_id: 'other' }), event({ role: 'planner' }), event({ binding_version: 2 }), event({ source_host: 'source-z' }),
    event({ observed_at: 'not-a-date' }), event({ observed_at: '2026-08-26T08:00:05.001Z' }),
    event({ now_summary: 'session 019ffa84-63b3-7353-89c8-c6472865bfd1' }),
    event({ now_summary: 'thread_id=opaque' }), event({ now_summary: 'credential bearer secret' }),
    event({ now_summary: '/Users/example/private/file' }), event({ now_summary: 'C:\\private\\file' }),
    event({ now_summary: '/tmp/private/file' }),
    event({ now_summary: 'prompt: raw request' }), event({ now_summary: 'result: raw response' }),
  ]
  for (const value of invalid) {
    const before = snapshot(relay)
    assert.throws(() => relay.ingest(value), /input_invalid|scope_not_allowed|timestamp_invalid|summary_prohibited/)
    assert.deepEqual(relay.read(), before)
  }
})

test('disconnect and reconnect use CAS while gap resync opens a new monotonic baseline', () => {
  const relay = createPhase3ObservationRelay(config())
  relay.ingest(event())
  assert.equal(relay.disconnect({ source_host: 'source-a' }).status, 'disconnected')
  let projection = relay.read().projections[0]
  assert.equal(projection.availability, 'offline')
  assert.equal(projection.sequence, 1)
  assert.equal('now_summary' in projection, false)
  assert.equal(relay.ingest(event({ sequence: 2, observed_at: '2026-08-26T08:00:01.000Z' })).status, 'conflict')
  projection = relay.read().projections[0]
  assert.equal(projection.availability, 'offline')
  assert.equal(projection.sequence, 1)
  const disconnected = snapshot(relay)
  assert.throws(() => relay.reconnect({ source_host: 'source-a', expected_last_sequence: 0, event: event({ sequence: 2 }) }), /cas_mismatch/)
  assert.deepEqual(relay.read(), disconnected)
  assert.equal(relay.reconnect({ source_host: 'source-a', expected_last_sequence: 1, event: event({ sequence: 2, observed_at: '2026-08-26T08:00:01.000Z' }) }).status, 'reconnected')

  assert.equal(relay.ingest(event({ sequence: 4, observed_at: '2026-08-26T08:00:02.000Z' })).status, 'conflict')
  assert.equal(relay.reconnect({ source_host: 'source-a', expected_last_sequence: 2, event: event({ sequence: 5, observed_at: '2026-08-26T08:00:03.000Z' }) }).status, 'reconnected')
  projection = relay.read().projections[0]
  assert.equal(projection.sequence, 5)
  assert.equal(projection.freshness_class, 'fresh')
  assert.equal(projection.now_summary, '공개 가능한 합성 작업 요약')
})

test('disable blocks writes, restore requires registry CAS, and failures are deep-equal', () => {
  const relay = createPhase3ObservationRelay(config())
  relay.ingest(event())
  assert.equal(relay.disable().status, 'disabled')
  const disabled = snapshot(relay)
  assert.throws(() => relay.ingest(event({ sequence: 2 })), /relay_disabled/)
  assert.throws(() => relay.reconnect({ source_host: 'source-a', expected_last_sequence: 1, event: event({ sequence: 2 }) }), /relay_disabled/)
  assert.throws(() => relay.restore({ registry_revision: 8 }), /cas_mismatch/)
  assert.deepEqual(relay.read(), disabled)
  assert.equal(relay.restore({ registry_revision: 7 }).status, 'restored')
  assert.equal(relay.read().enabled, true)
})

test('clock failure, re-entry and response materialization failure never partially commit', () => {
  let clockFails = true
  const clockError = createPhase3ObservationRelay(config({ now: () => {
    if (clockFails) throw new Error('clock secret')
    return BASE_TIME
  } }))
  assert.throws(() => clockError.ingest(event()), /clock_unavailable/)
  clockFails = false
  assert.deepEqual(clockError.read(), { enabled: true, registry_revision: 7, projections: [], evidence: [] })

  let relay
  let reenter = false
  relay = createPhase3ObservationRelay(config({ now: () => {
    if (reenter) relay.disconnect({ source_host: 'source-a' })
    return BASE_TIME
  } }))
  reenter = true
  assert.throws(() => relay.ingest(event()), /reentrant_mutation/)
  reenter = false
  assert.deepEqual(relay.read(), { enabled: true, registry_revision: 7, projections: [], evidence: [] })

  const cloneFailure = createPhase3ObservationRelay(config())
  const originalClone = globalThis.structuredClone
  globalThis.structuredClone = () => { throw new Error('clone failure') }
  try { assert.throws(() => cloneFailure.ingest(event()), /materialization_failed/) } finally { globalThis.structuredClone = originalClone }
  assert.deepEqual(cloneFailure.read(), { enabled: true, registry_revision: 7, projections: [], evidence: [] })
})

test('serialized public projection and evidence contain zero prohibited raw values', () => {
  const relay = createPhase3ObservationRelay(config())
  relay.ingest(event())
  relay.ingest(event({ sequence: 3, observed_at: '2026-08-26T08:00:01.000Z' }))
  const serialized = JSON.stringify(relay.read())
  assert.doesNotMatch(serialized, /session|thread|provider|locator|prompt|result|credential|bearer|token|cookie|\/Users\/|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  for (const evidence of relay.read().evidence) {
    assert.deepEqual(Object.keys(evidence), ['evidence_id', 'action', 'scope', 'before_sequence', 'after_sequence', 'reason_code', 'recorded_at'])
  }
})
