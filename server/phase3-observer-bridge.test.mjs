import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createPublicKey, generateKeyPairSync, sign } from 'node:crypto'

import {
  OBSERVER_BRIDGE_NOW_STATES,
  ObserverBridgeError,
  canonicalObserverBridgeBytes,
  createPhase3ObserverBridge,
} from './phase3-observer-bridge.mjs'

const BASE_TIME = Date.parse('2026-08-27T00:00:00.000Z')
const FRESHNESS_MS = 60_000

const makeFixture = (overrides = {}) => {
  const keys = generateKeyPairSync('ed25519')
  let clock = BASE_TIME
  const source = {
    project_id: 'outcome',
    role: 'builder',
    binding_version: 1,
    source_ref: 'source_alpha_01',
    source_version: 1,
    key_version: 1,
    public_key: keys.publicKey,
    status: 'active',
  }
  const viewers = [
    { viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_ids: ['outcome'], status: 'active' },
    { viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_ids: ['outcome'], status: 'active' },
  ]
  const options = {
    sources: [source],
    viewers,
    freshness_ms: FRESHNESS_MS,
    now: () => clock,
    enabled: true,
    ...overrides,
  }
  const bridge = createPhase3ObserverBridge(options)
  const unsigned = (changes = {}) => ({
    schema_version: 1,
    project_id: 'outcome',
    role: 'builder',
    binding_version: 1,
    source_ref: 'source_alpha_01',
    source_version: 1,
    key_version: 1,
    sequence: 1,
    observed_at: new Date(BASE_TIME).toISOString(),
    expires_at: new Date(BASE_TIME + FRESHNESS_MS).toISOString(),
    status_code: '구현 진행 중',
    ...changes,
  })
  const signed = (changes = {}, privateKey = keys.privateKey) => {
    const value = unsigned(changes)
    return { ...value, signature: sign(null, canonicalObserverBridgeBytes(value), privateKey).toString('base64url') }
  }
  return {
    bridge, keys, source, viewers, unsigned, signed,
    setClock(value) { clock = value },
    viewer(viewerClass = 'workstation') {
      return viewerClass === 'workstation'
        ? { viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }
        : { viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_id: 'outcome' }
    },
  }
}

const expectCode = (fn, code) => assert.throws(fn, (error) => error instanceof ObserverBridgeError && error.code === code)

test('constructor requires exact primitive registrations and exactly two viewer classes', () => {
  const { source, viewers } = makeFixture()
  for (const bad of [undefined, null, [], {}, { sources: [], viewers, freshness_ms: FRESHNESS_MS }]) {
    expectCode(() => createPhase3ObserverBridge(bad), 'configuration_invalid')
  }
  expectCode(() => createPhase3ObserverBridge({ sources: [source], viewers: [viewers[0]], freshness_ms: FRESHNESS_MS }), 'configuration_invalid')
  expectCode(() => createPhase3ObserverBridge({ sources: [source], viewers: [viewers[0], { ...viewers[1], viewer_class: 'workstation' }], freshness_ms: FRESHNESS_MS }), 'configuration_invalid')
  expectCode(() => createPhase3ObserverBridge({ sources: [source], viewers: [viewers[0], { ...viewers[1], project_ids: ['cherry-note'] }], freshness_ms: FRESHNESS_MS }), 'configuration_invalid')
  expectCode(() => createPhase3ObserverBridge({ sources: [source, source], viewers, freshness_ms: FRESHNESS_MS }), 'configuration_invalid')
  expectCode(() => createPhase3ObserverBridge({ sources: [{ ...source, status: 'revoked' }], viewers, freshness_ms: FRESHNESS_MS }), 'configuration_invalid')
  expectCode(() => createPhase3ObserverBridge({ sources: [{ ...source, public_key: generateKeyPairSync('ed25519').privateKey }], viewers, freshness_ms: FRESHNESS_MS }), 'configuration_invalid')

  let proxyHits = 0
  const proxy = new Proxy({ sources: [source], viewers, freshness_ms: FRESHNESS_MS }, { get() { proxyHits += 1 }, ownKeys() { proxyHits += 1 } })
  expectCode(() => createPhase3ObserverBridge(proxy), 'configuration_invalid')
  assert.equal(proxyHits, 0)

  let dependencyTrapHits = 0
  const proxyClock = new Proxy(() => BASE_TIME, { apply() { dependencyTrapHits += 1; return BASE_TIME } })
  expectCode(() => createPhase3ObserverBridge({ sources: [source], viewers, freshness_ms: FRESHNESS_MS, now: proxyClock }), 'configuration_invalid')
  assert.equal(dependencyTrapHits, 0)
})

test('canonical bytes are fixed-order length-prefixed UTF-8 with a stable digest', () => {
  const { unsigned } = makeFixture()
  const bytes = canonicalObserverBridgeBytes(unsigned())
  assert.equal(bytes.toString('utf8').split('\n')[0], 'OUTCOME_OBSERVER_BRIDGE_EVENT_V1')
  assert.equal(bytes.toString('utf8').includes('status_code=17:구현 진행 중\n'), true)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '392d32bb5f1084fae349846415ee398ca76aae42cd04af85f11d20fe533999ae')
  assert.deepEqual(bytes, canonicalObserverBridgeBytes(unsigned()))
})

test('event schema rejects missing, unknown, accessor, Proxy and hostile primitive values before mutation', () => {
  const fixture = makeFixture()
  const event = fixture.signed()
  for (const key of Object.keys(event)) {
    const candidate = { ...event }
    delete candidate[key]
    expectCode(() => fixture.bridge.ingest(candidate), 'input_invalid')
  }
  expectCode(() => fixture.bridge.ingest({ ...event, extra: 'value' }), 'input_invalid')
  for (const value of [new String('outcome'), Symbol('outcome'), 1n, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expectCode(() => fixture.bridge.ingest({ ...event, project_id: value }), 'input_invalid')
  }
  let getterHits = 0
  const accessorEvent = { ...event }
  Object.defineProperty(accessorEvent, 'signature', { enumerable: true, get() { getterHits += 1; return event.signature } })
  expectCode(() => fixture.bridge.ingest(accessorEvent), 'input_invalid')
  assert.equal(getterHits, 0)
  let proxyHits = 0
  const proxyEvent = new Proxy(event, { get() { proxyHits += 1 }, ownKeys() { proxyHits += 1 } })
  expectCode(() => fixture.bridge.ingest(proxyEvent), 'input_invalid')
  assert.equal(proxyHits, 0)
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].freshness_class, 'unknown')
})

test('all six exact Korean states are accepted and every non-member variant is denied', () => {
  assert.deepEqual([...OBSERVER_BRIDGE_NOW_STATES], ['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중'])
  for (const status of OBSERVER_BRIDGE_NOW_STATES) {
    const fixture = makeFixture()
    assert.equal(fixture.bridge.ingest(fixture.signed({ status_code: status })).status, 'accepted')
    assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].status_code, status)
  }
  for (const status of ['', ' 구현 진행 중', '구현 진행 중 ', 'IMPLEMENTING', 'https://example.com', '../relative', '구현\u00a0진행 중', '구현 진행중', null]) {
    const fixture = makeFixture()
    expectCode(() => fixture.bridge.ingest({ ...fixture.signed(), status_code: status }), 'input_invalid')
  }
})

test('valid Ed25519 signature is accepted and tampering every semantic field is denied atomically', () => {
  const fixture = makeFixture()
  const valid = fixture.signed()
  const tampered = {
    schema_version: 2,
    project_id: 'cherry-note',
    role: 'planner',
    binding_version: 2,
    source_ref: 'source_other_01',
    source_version: 2,
    key_version: 2,
    sequence: 2,
    observed_at: new Date(BASE_TIME + 1_000).toISOString(),
    expires_at: new Date(BASE_TIME + FRESHNESS_MS - 1).toISOString(),
    status_code: '테스트 실행 중',
  }
  for (const [field, value] of Object.entries(tampered)) {
    assert.throws(() => fixture.bridge.ingest({ ...valid, [field]: value }), ObserverBridgeError, field)
    assert.equal(fixture.bridge.read(fixture.viewer()).ledger_revision, 0)
  }
  const wrongKey = generateKeyPairSync('ed25519')
  expectCode(() => fixture.bridge.ingest(fixture.signed({}, wrongKey.privateKey)), 'signature_invalid')
  expectCode(() => fixture.bridge.ingest({ ...valid, signature: `${valid.signature}=` }), 'input_invalid')
  expectCode(() => fixture.bridge.ingest({ ...valid, signature: Buffer.alloc(64).toString('base64url') }), 'signature_invalid')
  assert.equal(fixture.bridge.read(fixture.viewer()).ledger_revision, 0)
  assert.equal(fixture.bridge.ingest(valid).status, 'accepted')
})

test('viewer authorization is non-enumerating and both classes receive the same minimal projection', () => {
  const fixture = makeFixture()
  fixture.bridge.ingest(fixture.signed())
  const workstation = fixture.bridge.read(fixture.viewer('workstation'))
  const remote = fixture.bridge.read(fixture.viewer('remote_device'))
  assert.deepEqual(remote, workstation)
  assert.deepEqual(Object.keys(workstation).sort(), ['ledger_revision', 'projections', 'status'])
  assert.deepEqual(Object.keys(workstation.projections[0]).sort(), ['accepted_count', 'binding_version', 'conflict_count', 'freshness_class', 'ledger_revision', 'observed_time_class', 'project_id', 'role', 'status_code'])

  for (const denied of [
    undefined,
    {},
    { viewer_ref: 'missing_viewer_01', viewer_class: 'workstation', project_id: 'outcome' },
    { viewer_ref: 'viewer_workstation_01', viewer_class: 'remote_device', project_id: 'outcome' },
    { viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'cherry-note' },
  ]) expectCode(() => fixture.bridge.read(denied), 'access_denied')

  let proxyHits = 0
  const proxy = new Proxy(fixture.viewer(), { get() { proxyHits += 1 }, ownKeys() { proxyHits += 1 } })
  expectCode(() => fixture.bridge.read(proxy), 'access_denied')
  assert.equal(proxyHits, 0)

  const revokedFixture = makeFixture({ viewers: [fixture.viewers[0], { ...fixture.viewers[1], status: 'revoked' }] })
  expectCode(() => revokedFixture.bridge.read(revokedFixture.viewer('remote_device')), 'access_denied')
})

test('duplicates are idempotent, conflicts and gaps quarantine, and explicit resync is CAS-bound', () => {
  const fixture = makeFixture()
  const accepted = fixture.bridge.ingest(fixture.signed())
  assert.deepEqual(accepted, { status: 'accepted', ledger_revision: 1 })
  assert.deepEqual(fixture.bridge.ingest(fixture.signed()), { status: 'duplicate', ledger_revision: 1 })
  assert.equal(fixture.bridge.audit(fixture.viewer()).entries.length, 1)

  const conflict = fixture.bridge.ingest(fixture.signed({ status_code: '테스트 실행 중' }))
  assert.deepEqual(conflict, { status: 'conflict', reason_code: 'duplicate_conflict', ledger_revision: 2 })
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].freshness_class, 'conflicting')
  expectCode(() => fixture.bridge.ingest(fixture.signed({ sequence: 2 })), 'resync_required')
  expectCode(() => fixture.bridge.resync({ expected_ledger_revision: 1, expected_last_sequence: 1, event: fixture.signed({ sequence: 2 }) }), 'cas_mismatch')
  assert.deepEqual(fixture.bridge.resync({ expected_ledger_revision: 2, expected_last_sequence: 1, event: fixture.signed({ sequence: 2 }) }), { status: 'resynced', ledger_revision: 3 })

  const gapFixture = makeFixture()
  gapFixture.bridge.ingest(gapFixture.signed())
  assert.equal(gapFixture.bridge.ingest(gapFixture.signed({ sequence: 3 })).reason_code, 'sequence_gap')
  expectCode(() => gapFixture.bridge.ingest(gapFixture.signed({ sequence: 2 })), 'resync_required')

  const orderFixture = makeFixture()
  orderFixture.bridge.ingest(orderFixture.signed())
  orderFixture.bridge.ingest(orderFixture.signed({ sequence: 2 }))
  expectCode(() => orderFixture.bridge.ingest(orderFixture.signed({ sequence: 1 })), 'out_of_order')
  assert.equal(orderFixture.bridge.read(orderFixture.viewer()).ledger_revision, 2)
})

test('future, stale and expiry boundaries fail closed while heartbeat reads decay fresh to stale to offline', () => {
  const futureOk = makeFixture()
  assert.equal(futureOk.bridge.ingest(futureOk.signed({ observed_at: new Date(BASE_TIME + 5_000).toISOString(), expires_at: new Date(BASE_TIME + FRESHNESS_MS).toISOString() })).status, 'accepted')
  const futureBad = makeFixture()
  expectCode(() => futureBad.bridge.ingest(futureBad.signed({ observed_at: new Date(BASE_TIME + 5_001).toISOString() })), 'timestamp_invalid')
  const staleBad = makeFixture()
  expectCode(() => staleBad.bridge.ingest(staleBad.signed({ observed_at: new Date(BASE_TIME - FRESHNESS_MS - 1).toISOString(), expires_at: new Date(BASE_TIME - 1).toISOString() })), 'expired')
  const invalidRange = makeFixture()
  expectCode(() => invalidRange.signed({ observed_at: new Date(BASE_TIME + 1_000).toISOString(), expires_at: new Date(BASE_TIME + 999).toISOString() }), 'input_invalid')

  const fixture = makeFixture()
  fixture.bridge.ingest(fixture.signed())
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].freshness_class, 'fresh')
  fixture.setClock(BASE_TIME + FRESHNESS_MS + 1)
  assert.deepEqual(fixture.bridge.read(fixture.viewer()).projections[0], {
    project_id: 'outcome', role: 'builder', binding_version: 1, status_code: null,
    freshness_class: 'stale', observed_time_class: 'expired', ledger_revision: 1,
    accepted_count: 1, conflict_count: 0,
  })
  fixture.setClock(BASE_TIME + FRESHNESS_MS * 2 + 1)
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].freshness_class, 'offline')
})

test('source/key lifecycle, rotation, disable/restore and tombstone are revision bound', () => {
  const fixture = makeFixture()
  fixture.bridge.ingest(fixture.signed())
  const rotated = generateKeyPairSync('ed25519')
  expectCode(() => fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: fixture.keys.publicKey, expected_registry_revision: 1,
  }), 'input_invalid')
  assert.deepEqual(fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: rotated.publicKey, expected_registry_revision: 1,
  }), { status: 'key_rotated', ledger_revision: 2, registry_revision: 2 })
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].status_code, null)
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].freshness_class, 'unknown')
  expectCode(() => fixture.bridge.ingest(fixture.signed({ sequence: 2 })), 'scope_denied')
  const rotatedEvent = fixture.signed({ key_version: 2, sequence: 2 }, rotated.privateKey)
  expectCode(() => fixture.bridge.ingest(rotatedEvent), 'resync_required')
  assert.equal(fixture.bridge.resync({ expected_ledger_revision: 2, expected_last_sequence: 1, event: rotatedEvent }).status, 'resynced')
  assert.equal(fixture.bridge.revokeKey({ project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, expected_key_version: 2, expected_registry_revision: 2 }).status, 'key_revoked')
  expectCode(() => fixture.bridge.ingest(fixture.signed({ key_version: 2, sequence: 3 }, rotated.privateKey)), 'scope_denied')

  const disabled = fixture.bridge.disable({ expected_ledger_revision: 4 })
  assert.deepEqual(disabled, { status: 'disabled', ledger_revision: 5 })
  expectCode(() => fixture.bridge.ingest(fixture.signed({ sequence: 3 })), 'bridge_disabled')
  expectCode(() => fixture.bridge.restore({ expected_disabled_revision: 4, expected_registry_revision: 3 }), 'cas_mismatch')
  assert.deepEqual(fixture.bridge.restore({ expected_disabled_revision: 5, expected_registry_revision: 3 }), { status: 'restored', ledger_revision: 6 })
  assert.deepEqual(fixture.bridge.tombstone({ expected_ledger_revision: 6 }), { status: 'tombstoned', ledger_revision: 7 })
  const projection = fixture.bridge.read(fixture.viewer()).projections[0]
  assert.equal(projection.status_code, null)
  assert.equal(projection.freshness_class, 'unknown')
  assert.equal(projection.accepted_count, 2)
})

test('source revocation is atomic and immediately removes active NOW', () => {
  const fixture = makeFixture()
  fixture.bridge.ingest(fixture.signed())
  expectCode(() => fixture.bridge.revokeSource({ project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, expected_registry_revision: 2 }), 'cas_mismatch')
  assert.equal(fixture.bridge.revokeSource({ project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, expected_registry_revision: 1 }).status, 'source_revoked')
  assert.equal(fixture.bridge.read(fixture.viewer()).projections[0].freshness_class, 'offline')
  expectCode(() => fixture.bridge.ingest(fixture.signed({ sequence: 2 })), 'scope_denied')
})

test('clock, crypto, digest, clone and dependency reentry failures leave state and revisions untouched', () => {
  let failVerify = true
  const cryptoFixture = makeFixture({ verify_signature: () => { if (failVerify) throw new Error('secret provider detail'); return true } })
  expectCode(() => cryptoFixture.bridge.ingest({ ...cryptoFixture.unsigned(), signature: Buffer.alloc(64).toString('base64url') }), 'crypto_unavailable')
  failVerify = false
  assert.equal(cryptoFixture.bridge.read(cryptoFixture.viewer()).ledger_revision, 0)

  let failDigest = true
  const digestFixture = makeFixture({ digest: (bytes) => { if (failDigest) throw new Error('digest detail'); return createHash('sha256').update(bytes).digest('hex') } })
  expectCode(() => digestFixture.bridge.ingest(digestFixture.signed()), 'crypto_unavailable')
  failDigest = false
  assert.equal(digestFixture.bridge.read(digestFixture.viewer()).ledger_revision, 0)

  let failClone = true
  const cloneFixture = makeFixture({ clone: (value) => { if (failClone) throw new Error('clone detail'); return structuredClone(value) } })
  expectCode(() => cloneFixture.bridge.ingest(cloneFixture.signed()), 'materialization_failed')
  failClone = false
  assert.equal(cloneFixture.bridge.read(cloneFixture.viewer()).ledger_revision, 0)

  let failClock = true
  const clockFixture = makeFixture({ now: () => { if (failClock) throw new Error('clock detail'); return BASE_TIME } })
  expectCode(() => clockFixture.bridge.ingest(clockFixture.signed()), 'clock_unavailable')
  failClock = false
  assert.equal(clockFixture.bridge.read(clockFixture.viewer()).ledger_revision, 0)

  const nonFiniteClock = makeFixture({ now: () => Infinity })
  expectCode(() => nonFiniteClock.bridge.read(nonFiniteClock.viewer()), 'clock_unavailable')
  const outOfRangeClock = makeFixture({ now: () => 8.64e15 + 1 })
  expectCode(() => outOfRangeClock.bridge.read(outOfRangeClock.viewer()), 'clock_unavailable')

  const regressingClock = makeFixture()
  regressingClock.bridge.ingest(regressingClock.signed())
  regressingClock.setClock(BASE_TIME - 1)
  expectCode(() => regressingClock.bridge.read(regressingClock.viewer()), 'clock_unavailable')
  regressingClock.setClock(BASE_TIME + 1)
  assert.equal(regressingClock.bridge.read(regressingClock.viewer()).ledger_revision, 1)

  let reentryBridge
  let reentry = true
  const reentryFixture = makeFixture({ verify_signature: () => {
    if (reentry) {
      reentry = false
      expectCode(() => reentryBridge.read({ viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }), 'reentrant_mutation')
    }
    return true
  } })
  reentryBridge = reentryFixture.bridge
  expectCode(() => reentryBridge.ingest({ ...reentryFixture.unsigned(), signature: Buffer.alloc(64).toString('base64url') }), 'reentrant_mutation')
  assert.equal(reentryBridge.read(reentryFixture.viewer()).ledger_revision, 0)
})

test('clone output substitutions fail atomically before state publication', () => {
  const ingestAttacks = [
    ['extra prohibited fields', (value) => ({ ...structuredClone(value), signature: 'private', progress: 100 })],
    ['missing field', (value) => {
      const output = structuredClone(value)
      delete output.status
      return output
    }],
    ['changed field', (value) => ({ ...structuredClone(value), ledger_revision: 99 })],
    ['same original object', (value) => value],
    ['accessor output', (value) => {
      const output = structuredClone(value)
      Object.defineProperty(output, 'status', { enumerable: true, get: () => value.status })
      return output
    }],
    ['outer Proxy', (value) => new Proxy(structuredClone(value), {})],
    ['function value', (value) => ({ ...structuredClone(value), status: () => 'accepted' })],
    ['symbol value', (value) => ({ ...structuredClone(value), status: Symbol('accepted') })],
    ['mutated draft response', (value) => {
      value.progress = 100
      return structuredClone(value)
    }],
  ]

  for (const [label, substitute] of ingestAttacks) {
    let attack = true
    const fixture = makeFixture({ clone: (value) => attack ? substitute(value) : structuredClone(value) })
    expectCode(() => fixture.bridge.ingest(fixture.signed()), 'materialization_failed')
    attack = false
    assert.deepEqual(fixture.bridge.read(fixture.viewer()), {
      status: 'ok',
      ledger_revision: 0,
      projections: [{
        project_id: 'outcome', role: 'builder', binding_version: 1, status_code: null,
        freshness_class: 'unknown', observed_time_class: 'unavailable', ledger_revision: 0,
        accepted_count: 0, conflict_count: 0,
      }],
    }, label)
    assert.deepEqual(fixture.bridge.audit(fixture.viewer()), { status: 'ok', ledger_revision: 0, entries: [] }, label)
    assert.deepEqual(fixture.bridge.ingest(fixture.signed()), { status: 'accepted', ledger_revision: 1 }, label)
  }

  const readAttacks = [
    ['nested Proxy', (value, onTrap) => {
      const output = structuredClone(value)
      output.projections = new Proxy(output.projections, { get() { onTrap(); return undefined }, ownKeys() { onTrap(); return [] } })
      return output
    }],
    ['altered array shape', (value) => {
      const output = structuredClone(value)
      output.projections.push(structuredClone(output.projections[0]))
      return output
    }],
    ['altered nested value', (value) => {
      const output = structuredClone(value)
      output.projections[0].status_code = '테스트 실행 중'
      return output
    }],
    ['shared nested identity', (value) => ({ ...structuredClone(value), projections: value.projections })],
  ]

  for (const [label, substitute] of readAttacks) {
    let attack = false
    let trapHits = 0
    const fixture = makeFixture({ clone: (value) => attack ? substitute(value, () => { trapHits += 1 }) : structuredClone(value) })
    fixture.bridge.ingest(fixture.signed())
    const before = fixture.bridge.read(fixture.viewer())
    const beforeAudit = fixture.bridge.audit(fixture.viewer())
    attack = true
    expectCode(() => fixture.bridge.read(fixture.viewer()), 'materialization_failed')
    attack = false
    assert.equal(trapHits, 0, label)
    assert.deepEqual(fixture.bridge.read(fixture.viewer()), before, label)
    assert.deepEqual(fixture.bridge.audit(fixture.viewer()), beforeAudit, label)
  }
})

test('public-key Proxy traps are rejected before evaluation while real Ed25519 rotation works', () => {
  const base = makeFixture()
  let constructorTrapHits = 0
  const constructorProxy = new Proxy(base.keys.publicKey, {
    get() { constructorTrapHits += 1; throw new Error('must not run') },
    getPrototypeOf() { constructorTrapHits += 1; throw new Error('must not run') },
  })
  expectCode(() => createPhase3ObserverBridge({
    sources: [{ ...base.source, public_key: constructorProxy }],
    viewers: base.viewers,
    freshness_ms: FRESHNESS_MS,
  }), 'configuration_invalid')
  assert.equal(constructorTrapHits, 0)

  const fixture = makeFixture()
  const replacement = generateKeyPairSync('ed25519')
  let rotationTrapHits = 0
  let nestedCode = null
  const rotationProxy = new Proxy(replacement.publicKey, {
    get() {
      rotationTrapHits += 1
      try { fixture.bridge.disable({ expected_ledger_revision: 0 }) } catch (error) { nestedCode = error.code }
      throw new Error('must not run')
    },
    getPrototypeOf() {
      rotationTrapHits += 1
      throw new Error('must not run')
    },
  })
  expectCode(() => fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: rotationProxy, expected_registry_revision: 1,
  }), 'input_invalid')
  assert.equal(rotationTrapHits, 0)
  assert.equal(nestedCode, null)
  assert.deepEqual(fixture.bridge.audit(fixture.viewer()), { status: 'ok', ledger_revision: 0, entries: [] })

  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 })
  expectCode(() => createPhase3ObserverBridge({
    sources: [{ ...base.source, public_key: rsa.publicKey }],
    viewers: base.viewers,
    freshness_ms: FRESHNESS_MS,
  }), 'configuration_invalid')
  expectCode(() => createPhase3ObserverBridge({
    sources: [{ ...base.source, public_key: base.keys.privateKey }],
    viewers: base.viewers,
    freshness_ms: FRESHNESS_MS,
  }), 'configuration_invalid')

  assert.deepEqual(fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: replacement.publicKey, expected_registry_revision: 1,
  }), { status: 'key_rotated', ledger_revision: 1, registry_revision: 2 })
  assert.equal(fixture.bridge.revokeKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 2, expected_registry_revision: 2,
  }).status, 'key_revoked')
})

test('decorated public keys are rejected without caller behavior at constructor and rotation', () => {
  const decorations = [
    ['equals method', (key, hit) => Object.defineProperty(key, 'equals', { configurable: true, value: () => { hit(); return false } })],
    ['export method', (key, hit) => Object.defineProperty(key, 'export', { configurable: true, value: () => { hit(); throw new Error('must not run') } })],
    ['type accessor', (key, hit) => Object.defineProperty(key, 'type', { configurable: true, get: () => { hit(); return 'public' } })],
    ['asymmetric type accessor', (key, hit) => Object.defineProperty(key, 'asymmetricKeyType', { configurable: true, get: () => { hit(); return 'ed25519' } })],
    ['non-enumerable property', (key) => Object.defineProperty(key, 'hidden', { configurable: true, value: 'value' })],
    ['generic accessor', (key, hit) => Object.defineProperty(key, 'probe', { configurable: true, get: () => { hit(); return 'value' } })],
    ['symbol accessor', (key, hit) => Object.defineProperty(key, Symbol('probe'), { configurable: true, get: () => { hit(); return 'value' } })],
  ]

  for (const [label, decorate] of decorations) {
    const base = makeFixture()
    const constructorKeys = generateKeyPairSync('ed25519')
    let constructorHits = 0
    decorate(constructorKeys.publicKey, () => { constructorHits += 1 })
    expectCode(() => createPhase3ObserverBridge({
      sources: [{ ...base.source, public_key: constructorKeys.publicKey }],
      viewers: base.viewers,
      freshness_ms: FRESHNESS_MS,
    }), 'configuration_invalid')
    assert.equal(constructorHits, 0, `constructor ${label}`)

    const fixture = makeFixture()
    const replacement = generateKeyPairSync('ed25519')
    let rotationHits = 0
    decorate(replacement.publicKey, () => { rotationHits += 1 })
    expectCode(() => fixture.bridge.rotateKey({
      project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
      expected_key_version: 1, new_key_version: 2, new_public_key: replacement.publicKey, expected_registry_revision: 1,
    }), 'input_invalid')
    assert.equal(rotationHits, 0, `rotation ${label}`)
    assert.deepEqual(fixture.bridge.audit(fixture.viewer()), { status: 'ok', ledger_revision: 0, entries: [] }, label)
  }
})

test('server-owned key snapshots ignore retained caller mutation and deny canonical same-key rotation', () => {
  const fixture = makeFixture()
  const originalDer = fixture.keys.publicKey.export({ format: 'der', type: 'spki' })
  const cleanSameKey = createPublicKey({ key: Buffer.from(originalDer), format: 'der', type: 'spki' })
  let callbackHits = 0
  Object.defineProperty(fixture.keys.publicKey, 'equals', {
    configurable: true,
    value: () => { callbackHits += 1; return false },
  })

  assert.deepEqual(fixture.bridge.ingest(fixture.signed()), { status: 'accepted', ledger_revision: 1 })
  assert.equal(callbackHits, 0)
  expectCode(() => fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: cleanSameKey, expected_registry_revision: 1,
  }), 'input_invalid')
  expectCode(() => fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: fixture.keys.publicKey, expected_registry_revision: 1,
  }), 'input_invalid')
  assert.equal(callbackHits, 0)
  assert.deepEqual(fixture.bridge.audit(fixture.viewer()), {
    status: 'ok', ledger_revision: 1,
    entries: [{ action: 'ingest', reason_code: 'accepted', ledger_revision: 1 }],
  })

  const replacement = generateKeyPairSync('ed25519')
  assert.deepEqual(fixture.bridge.rotateKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 1, new_key_version: 2, new_public_key: replacement.publicKey, expected_registry_revision: 1,
  }), { status: 'key_rotated', ledger_revision: 2, registry_revision: 2 })
  Object.defineProperty(replacement.publicKey, 'export', {
    configurable: true,
    value: () => { callbackHits += 1; throw new Error('must not run') },
  })
  const rotatedEvent = fixture.signed({ key_version: 2, sequence: 2 }, replacement.privateKey)
  assert.deepEqual(fixture.bridge.resync({
    expected_ledger_revision: 2,
    expected_last_sequence: 1,
    event: rotatedEvent,
  }), { status: 'resynced', ledger_revision: 3 })
  assert.equal(callbackHits, 0)
  assert.equal(fixture.bridge.revokeKey({
    project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1,
    expected_key_version: 2, expected_registry_revision: 2,
  }).status, 'key_revoked')
})

test('every lifecycle envelope rejects Proxy traps before evaluation and consumes no revision', () => {
  const fixture = makeFixture()
  const rotated = generateKeyPairSync('ed25519')
  const operations = [
    ['resync', { expected_ledger_revision: 0, expected_last_sequence: 1, event: fixture.signed() }],
    ['revokeSource', { project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, expected_registry_revision: 1 }],
    ['revokeKey', { project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, expected_key_version: 1, expected_registry_revision: 1 }],
    ['rotateKey', { project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, expected_key_version: 1, new_key_version: 2, new_public_key: rotated.publicKey, expected_registry_revision: 1 }],
    ['disable', { expected_ledger_revision: 0 }],
    ['restore', { expected_disabled_revision: 0, expected_registry_revision: 1 }],
    ['tombstone', { expected_ledger_revision: 0 }],
  ]
  for (const [method, input] of operations) {
    let hits = 0
    const proxy = new Proxy(input, { get() { hits += 1 }, ownKeys() { hits += 1 } })
    expectCode(() => fixture.bridge[method](proxy), 'input_invalid')
    assert.equal(hits, 0, method)
    assert.equal(fixture.bridge.read(fixture.viewer()).ledger_revision, 0, method)
  }
})

test('audit, responses and loggable serialization stay privacy-minimal and carry no completion authority', () => {
  const fixture = makeFixture()
  const event = fixture.signed()
  const outputs = [
    fixture.bridge.ingest(event),
    fixture.bridge.read(fixture.viewer()),
    fixture.bridge.audit(fixture.viewer()),
  ]
  const serialized = JSON.stringify(outputs)
  for (const prohibited of [
    'source_alpha_01', event.signature, event.observed_at, event.expires_at,
    'key_version', 'source_version', 'viewer_workstation_01', 'session', 'thread', 'turn',
    'credential', 'token', 'password', 'path', 'progress', 'percentage', 'gate', 'approval',
    'completion', 'dispatch', 'result_pointer', 'evidence_pointer',
  ]) assert.equal(serialized.toLowerCase().includes(String(prohibited).toLowerCase()), false, prohibited)
  assert.deepEqual(Object.keys(outputs[2]).sort(), ['entries', 'ledger_revision', 'status'])
  assert.deepEqual(Object.keys(outputs[2].entries[0]).sort(), ['action', 'ledger_revision', 'reason_code'])
})
