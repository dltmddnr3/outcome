import assert from 'node:assert/strict'
import test from 'node:test'
import { generateKeyPairSync, sign } from 'node:crypto'
import {
  HostedObserverBridgeError,
  canonicalEnrollmentBytes,
  canonicalHostedRequestBytes,
  createHostedObserverBridge,
} from './phase3-observer-bridge-hosted.mjs'
import { canonicalObserverBridgeBytes } from './phase3-observer-bridge.mjs'

const BASE = Date.parse('2026-08-27T00:00:00.000Z')
const owner = Object.freeze({ account_ref: 'account_owner_01', workspace_id: 'workspace_main', project_ids: ['outcome'] })
const viewers = Object.freeze([
  { workspace_id: 'workspace_main', viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_ids: ['outcome'] },
  { workspace_id: 'workspace_main', viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_ids: ['outcome'] },
])
const binding = Object.freeze({ workspace_id: 'workspace_main', project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01' })
const expectCode = (fn, code) => assert.throws(fn, (error) => error instanceof HostedObserverBridgeError && error.code === code)

function makeFixture(overrides = {}) {
  let clock = BASE
  let entropy = 0
  const bridge = createHostedObserverBridge({
    feature_enabled: true,
    ingest_enabled: true,
    bindings: [binding],
    viewers,
    authorize_owner: (context) => context?.token === 'owner' ? owner : null,
    authorize_viewer: (context) => context?.token === 'owner' ? owner : null,
    now: () => clock,
    random_bytes: (length) => Buffer.alloc(length, ++entropy),
    ...overrides,
  })
  const keys = generateKeyPairSync('ed25519')
  const spki = keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
  const begin = (changes = {}) => bridge.createEnrollment({ auth_context: { token: 'owner' }, ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01', ...changes })
  const complete = (challenge, changes = {}) => {
    const input = { challenge_ref: challenge.challenge_ref, public_key_spki: spki, ...changes }
    if (!Object.hasOwn(input, 'proof_signature')) input.proof_signature = sign(null, canonicalEnrollmentBytes({ ...challenge.enrollment_scope, challenge_ref: challenge.challenge_ref, challenge_nonce: challenge.challenge_nonce, public_key_spki: spki }), keys.privateKey).toString('base64url')
    return bridge.completeEnrollment(input)
  }
  const event = (sequence = 1, changes = {}) => {
    const unsigned = {
      schema_version: 1, project_id: 'outcome', role: 'builder', binding_version: 1,
      source_ref: 'source_alpha_01', source_version: 1, key_version: 1, sequence,
      observed_at: new Date(clock).toISOString(), expires_at: new Date(clock + 60_000).toISOString(),
      status_code: '구현 진행 중', ...changes,
    }
    return { ...unsigned, signature: sign(null, canonicalObserverBridgeBytes(unsigned), keys.privateKey).toString('base64url') }
  }
  const ingest = (certificate, eventValue = event(), changes = {}) => {
    const unsigned = { certificate_ref: certificate.certificate_ref, request_id: 'request_alpha_01', nonce: 'nonce_alpha_01', event: eventValue, ...changes }
    return bridge.ingest({ ...unsigned, request_signature: sign(null, canonicalHostedRequestBytes(unsigned), keys.privateKey).toString('base64url') })
  }
  return { bridge, keys, spki, begin, complete, event, ingest, setClock: (value) => { clock = value } }
}

test('RED contract: feature and ingest are disabled by default', () => {
  const bridge = createHostedObserverBridge({ bindings: [binding], viewers, authorize_owner: () => owner, authorize_viewer: () => owner })
  expectCode(() => bridge.createEnrollment({ auth_context: {}, ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }), 'unavailable')
})

test('enrollment is owner-scoped, 300-second single-use, proof-bound and idempotent', () => {
  const fixture = makeFixture()
  expectCode(() => fixture.bridge.createEnrollment({ auth_context: { token: 'wrong' }, ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }), 'access_denied')
  expectCode(() => fixture.begin({ project_id: 'cherry-note' }), 'access_denied')
  const challenge = fixture.begin()
  assert.equal(challenge.expires_at, new Date(BASE + 300_000).toISOString())
  assert.deepEqual(fixture.begin(), challenge)
  const certificate = fixture.complete(challenge)
  assert.equal(certificate.status, 'source_active')
  assert.deepEqual(Object.keys(certificate).sort(), ['binding_version', 'certificate_ref', 'key_version', 'role', 'source_version', 'status'])
  expectCode(() => fixture.complete(challenge), 'enrollment_invalid')

  const expired = makeFixture()
  const stale = expired.begin()
  expired.setClock(BASE + 300_001)
  expectCode(() => expired.complete(stale), 'enrollment_invalid')

  const wrong = makeFixture()
  const wrongChallenge = wrong.begin()
  const other = generateKeyPairSync('ed25519')
  expectCode(() => wrong.complete(wrongChallenge, { proof_signature: sign(null, canonicalEnrollmentBytes({ ...wrongChallenge.enrollment_scope, challenge_ref: wrongChallenge.challenge_ref, challenge_nonce: wrongChallenge.challenge_nonce, public_key_spki: wrong.spki }), other.privateKey).toString('base64url') }), 'enrollment_invalid')
})

test('constructor and key inputs reject Proxy/accessor decorations without callback execution', () => {
  let hits = 0
  const proxy = new Proxy(binding, { ownKeys() { hits += 1; return [] }, get() { hits += 1 } })
  expectCode(() => createHostedObserverBridge({ bindings: [proxy], viewers, authorize_owner: () => owner, authorize_viewer: () => owner }), 'configuration_invalid')
  assert.equal(hits, 0)
  const fixture = makeFixture()
  const challenge = fixture.begin()
  const decorated = { value: fixture.spki }
  Object.defineProperty(decorated, 'toString', { get() { hits += 1; return () => fixture.spki } })
  expectCode(() => fixture.complete(challenge, { public_key_spki: decorated }), 'input_invalid')
  assert.equal(hits, 0)
})

test('companion ingest uses signature/certificate only and preserves replay/domain semantics', () => {
  const fixture = makeFixture()
  const certificate = fixture.complete(fixture.begin())
  assert.deepEqual(fixture.ingest(certificate), { status: 'accepted', ledger_revision: 1 })
  assert.deepEqual(fixture.ingest(certificate), { status: 'accepted', ledger_revision: 1 })
  expectCode(() => fixture.ingest(certificate, fixture.event(1, { status_code: '테스트 실행 중' })), 'request_conflict')
  expectCode(() => fixture.ingest(certificate, fixture.event(3), { request_id: 'request_gap_01', nonce: 'nonce_gap_01' }), 'sequence_conflict')
  expectCode(() => fixture.ingest({ ...certificate, certificate_ref: 'certificate_missing_01' }), 'access_denied')
})

test('tampering request/event scope, revoked source and rotation fail closed', () => {
  const fixture = makeFixture()
  const certificate = fixture.complete(fixture.begin())
  const signed = fixture.event()
  const unsigned = { certificate_ref: certificate.certificate_ref, request_id: 'request_tamper_01', nonce: 'nonce_tamper_01', event: signed }
  const signature = sign(null, canonicalHostedRequestBytes(unsigned), fixture.keys.privateKey).toString('base64url')
  for (const [field, value] of [['request_id', 'request_other_01'], ['nonce', 'nonce_other_01']]) {
    expectCode(() => fixture.bridge.ingest({ ...unsigned, [field]: value, request_signature: signature }), 'signature_invalid')
  }
  const eventTampering = {
    schema_version: 2, project_id: 'cherry-note', role: 'planner', binding_version: 2,
    source_ref: 'source_other_01', source_version: 2, key_version: 2, sequence: 2,
    observed_at: new Date(BASE + 1_000).toISOString(), expires_at: new Date(BASE + 61_000).toISOString(),
    status_code: '테스트 실행 중', signature: Buffer.alloc(64).toString('base64url'),
  }
  for (const [field, value] of Object.entries(eventTampering)) {
    assert.throws(
      () => fixture.bridge.ingest({ ...unsigned, event: { ...signed, [field]: value }, request_signature: signature }),
      (error) => error instanceof HostedObserverBridgeError && ['input_invalid', 'signature_invalid'].includes(error.code),
      field,
    )
  }
  assert.equal(fixture.bridge.revokeSource({ auth_context: { token: 'owner' }, certificate_ref: certificate.certificate_ref, expected_revision: 1 }).status, 'source_revoked')
  expectCode(() => fixture.ingest(certificate), 'access_denied')
})

test('rotation and re-enrollment replace certificates without inheriting authority', () => {
  const fixture = makeFixture()
  const first = fixture.complete(fixture.begin())
  const rotation = fixture.bridge.createEnrollment({ auth_context: { token: 'owner' }, ...binding, mode: 'rotate', idempotency_key: 'rotate-key-01' })
  const rotated = generateKeyPairSync('ed25519')
  const rotatedSpki = rotated.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
  const rotatedProof = sign(null, canonicalEnrollmentBytes({ ...rotation.enrollment_scope, challenge_ref: rotation.challenge_ref, challenge_nonce: rotation.challenge_nonce, public_key_spki: rotatedSpki }), rotated.privateKey).toString('base64url')
  const second = fixture.bridge.completeEnrollment({ challenge_ref: rotation.challenge_ref, public_key_spki: rotatedSpki, proof_signature: rotatedProof })
  assert.equal(second.key_version, 2)
  assert.equal(second.source_version, 1)
  expectCode(() => fixture.ingest(first), 'access_denied')
  assert.equal(fixture.bridge.revokeSource({ auth_context: { token: 'owner' }, certificate_ref: second.certificate_ref, expected_revision: 2 }).status, 'source_revoked')
  const reenroll = fixture.bridge.createEnrollment({ auth_context: { token: 'owner' }, ...binding, mode: 'enroll', idempotency_key: 'reenroll-key-01' })
  assert.equal(reenroll.enrollment_scope.source_version, 2)
  assert.equal(reenroll.enrollment_scope.key_version, 1)
})

test('viewer authorization is server-derived and both viewer classes get equal minimal projection', () => {
  const fixture = makeFixture()
  const certificate = fixture.complete(fixture.begin())
  fixture.ingest(certificate)
  const workstation = fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' })
  const remote = fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_id: 'outcome' })
  assert.deepEqual(remote, workstation)
  assert.deepEqual(Object.keys(workstation).sort(), ['ledger_revision', 'projections', 'status'])
  expectCode(() => fixture.bridge.read({ auth_context: {}, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }), 'access_denied')
  expectCode(() => fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'remote_device', project_id: 'outcome' }), 'access_denied')
})

test('clone, clock, crypto, dependency reentry and store failures are atomic', () => {
  let failClone = true
  const cloneFixture = makeFixture({ clone: (value) => { if (failClone) throw new Error('private'); return structuredClone(value) } })
  expectCode(() => cloneFixture.begin(), 'materialization_failed')
  failClone = false
  assert.equal(cloneFixture.begin().status, 'challenge_created')

  const clockFixture = makeFixture({ now: () => { throw new Error('private') } })
  expectCode(() => clockFixture.begin(), 'clock_unavailable')

  let reentryBridge
  const reentryFixture = makeFixture({ authorize_owner: () => {
    expectCode(() => reentryBridge.read({ auth_context: {}, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }), 'reentrant_operation')
    return owner
  } })
  reentryBridge = reentryFixture.bridge
  expectCode(() => reentryFixture.begin(), 'reentrant_operation')

  const cryptoFixture = makeFixture({ verify_signature: () => { throw new Error('private') } })
  const challenge = cryptoFixture.begin()
  expectCode(() => cryptoFixture.complete(challenge), 'crypto_unavailable')

  let failStore = true
  const storeFixture = makeFixture({ transaction_store: { commit: () => !failStore } })
  expectCode(() => storeFixture.begin(), 'storage_unavailable')
  failStore = false
  assert.equal(storeFixture.begin().status, 'challenge_created')

  const substituted = makeFixture({ clone: (value) => ({ ...structuredClone(value), progress: 100 }) })
  expectCode(() => substituted.begin(), 'materialization_failed')

  const authOutage = makeFixture({ authorize_owner: () => { throw new Error('private') } })
  expectCode(() => authOutage.begin(), 'auth_unavailable')
})

test('body and rate limits fail before new replay/domain state is committed', () => {
  const bodyFixture = makeFixture({ max_body_bytes: 64 })
  const bodyCertificate = bodyFixture.complete(bodyFixture.begin())
  const bodyEvent = bodyFixture.event()
  const bodyUnsigned = { certificate_ref: bodyCertificate.certificate_ref, request_id: 'request_body_01', nonce: 'nonce_body_01', event: bodyEvent }
  const bodySignature = sign(null, canonicalHostedRequestBytes(bodyUnsigned), bodyFixture.keys.privateKey).toString('base64url')
  expectCode(() => bodyFixture.bridge.ingest({ ...bodyUnsigned, request_signature: bodySignature, body_bytes: 65 }), 'input_invalid')

  const rateFixture = makeFixture({ rate_limit_count: 1 })
  const rateCertificate = rateFixture.complete(rateFixture.begin())
  assert.deepEqual(rateFixture.ingest(rateCertificate), rateFixture.ingest(rateCertificate))
  expectCode(() => rateFixture.ingest(rateCertificate, rateFixture.event(2), { request_id: 'request_rate_02', nonce: 'nonce_rate_02' }), 'rate_limited')
})

test('responses and serialized state contain no authority or prohibited data', () => {
  const fixture = makeFixture()
  const certificate = fixture.complete(fixture.begin())
  fixture.ingest(certificate)
  const output = fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' })
  assert.doesNotMatch(JSON.stringify(output), /prompt|result|session|thread|turn|credential|private.?key|signature|certificate|progress|gate|approval|completion/i)
  assert.equal(output.completionAuthority, undefined)
})

test('QA RED F1 rejects same project name across a different authorized workspace', () => {
  const fixture = makeFixture({ authorize_viewer: () => ({ account_ref: 'account_other_01', workspace_id: 'workspace_other', project_ids: ['outcome'] }) })
  const certificate = fixture.complete(fixture.begin())
  fixture.ingest(certificate)
  expectCode(() => fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }), 'access_denied')
})

test('F1 binds registrations, sources and reads to workspace even when project IDs collide', () => {
  const otherBinding = { ...binding, workspace_id: 'workspace_other', source_ref: 'source_other_01' }
  const multiViewers = [
    ...viewers,
    { workspace_id: 'workspace_other', viewer_ref: 'viewer_other_workstation_01', viewer_class: 'workstation', project_ids: ['outcome'] },
    { workspace_id: 'workspace_other', viewer_ref: 'viewer_other_remote_01', viewer_class: 'remote_device', project_ids: ['outcome'] },
  ]
  const fixture = makeFixture({
    bindings: [binding, otherBinding], viewers: multiViewers,
    authorize_viewer: (context) => context?.token === 'other'
      ? { account_ref: 'account_other_01', workspace_id: 'workspace_other', project_ids: ['outcome'] }
      : owner,
  })
  const certificate = fixture.complete(fixture.begin())
  fixture.ingest(certificate)
  expectCode(() => fixture.bridge.read({ auth_context: { token: 'other' }, viewer_ref: 'viewer_other_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }), 'access_denied')
  assert.equal(fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }).projections.length, 1)
})

test('QA RED F2 rejects inherited prototype authority without store consumption', () => {
  let storeCommits = 0
  const fixture = makeFixture({
    transaction_store: { commit: () => { storeCommits += 1; return true } },
    authorize_owner: (context) => context.token === 'owner' ? owner : null,
  })
  const polluted = JSON.parse('{"__proto__":{"token":"owner"}}')
  expectCode(() => fixture.bridge.createEnrollment({ auth_context: polluted, ...binding, mode: 'enroll', idempotency_key: 'polluted-key-01' }), 'access_denied')
  assert.equal(storeCommits, 0)
})

test('F2 rejects inherited, accessor and Proxy auth without callback or trap execution', () => {
  let callbacks = 0
  let storeCommits = 0
  const fixture = makeFixture({
    transaction_store: { commit: () => { storeCommits += 1; return true } },
    authorize_owner: (context) => context.token === 'owner' ? owner : null,
  })
  const inherited = Object.create({ token: 'owner' })
  const accessor = {}
  Object.defineProperty(accessor, 'token', { enumerable: true, get() { callbacks += 1; return 'owner' } })
  const proxy = new Proxy({}, { get() { callbacks += 1; return 'owner' }, ownKeys() { callbacks += 1; return ['token'] } })
  const nullPrototypeMissing = Object.create(null)
  for (const auth_context of [inherited, accessor, proxy, nullPrototypeMissing]) {
    expectCode(() => fixture.bridge.createEnrollment({ auth_context, ...binding, mode: 'enroll', idempotency_key: 'authority-key-01' }), 'access_denied')
  }
  assert.equal(callbacks, 0)
  assert.equal(storeCommits, 0)
})

test('QA RED F4 rotation keeps immutable count and revision then resumes monotonically', () => {
  const fixture = makeFixture()
  const first = fixture.complete(fixture.begin())
  fixture.ingest(first)
  const before = fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }).projections[0]
  const rotation = fixture.bridge.createEnrollment({ auth_context: { token: 'owner' }, ...binding, mode: 'rotate', idempotency_key: 'rotation-red-01' })
  const keys = generateKeyPairSync('ed25519')
  const spki = keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
  const proof = sign(null, canonicalEnrollmentBytes({ ...rotation.enrollment_scope, challenge_ref: rotation.challenge_ref, challenge_nonce: rotation.challenge_nonce, public_key_spki: spki }), keys.privateKey).toString('base64url')
  const second = fixture.bridge.completeEnrollment({ challenge_ref: rotation.challenge_ref, public_key_spki: spki, proof_signature: proof })
  const afterResponse = fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' })
  const after = afterResponse.projections[0]
  assert.equal(after.accepted_count, before.accepted_count)
  assert.ok(after.ledger_revision > before.ledger_revision)
  assert.equal(after.status_code, null)
  assert.equal(after.freshness_class, 'unknown')
  assert.deepEqual(fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_remote_01', viewer_class: 'remote_device', project_id: 'outcome' }), afterResponse)
  const unsigned = { schema_version: 1, project_id: 'outcome', role: 'builder', binding_version: 1, source_ref: 'source_alpha_01', source_version: 1, key_version: 2, sequence: 2, observed_at: new Date(BASE).toISOString(), expires_at: new Date(BASE + 60_000).toISOString(), status_code: '테스트 실행 중' }
  const event = { ...unsigned, signature: sign(null, canonicalObserverBridgeBytes(unsigned), keys.privateKey).toString('base64url') }
  const request = { certificate_ref: second.certificate_ref, request_id: 'request_rotated_02', nonce: 'nonce_rotated_02', event }
  const result = fixture.bridge.ingest({ ...request, request_signature: sign(null, canonicalHostedRequestBytes(request), keys.privateKey).toString('base64url') })
  assert.ok(result.ledger_revision > after.ledger_revision)
  const resumed = fixture.bridge.read({ auth_context: { token: 'owner' }, viewer_ref: 'viewer_workstation_01', viewer_class: 'workstation', project_id: 'outcome' }).projections[0]
  assert.equal(resumed.accepted_count, before.accepted_count + 1)
  assert.equal(resumed.status_code, '테스트 실행 중')
})

test('QA RED F5 expires challenge at the exact 300-second instant', () => {
  for (const [elapsed, accepted] of [[299_999, true], [300_000, false], [300_001, false]]) {
    const fixture = makeFixture()
    const challenge = fixture.begin()
    fixture.setClock(BASE + elapsed)
    if (accepted) assert.equal(fixture.complete(challenge).status, 'source_active')
    else expectCode(() => fixture.complete(challenge), 'enrollment_invalid')
  }
})

test('F5 expiry failures consume no entropy or store revision', () => {
  let entropyCalls = 0
  let storeCommits = 0
  let clock = BASE
  const fixture = makeFixture({
    now: () => clock,
    random_bytes: (length) => { entropyCalls += 1; return Buffer.alloc(length, entropyCalls) },
    transaction_store: { commit: () => { storeCommits += 1; return true } },
  })
  const challenge = fixture.begin()
  const before = { entropyCalls, storeCommits }
  clock = BASE + 300_000
  expectCode(() => fixture.complete(challenge), 'enrollment_invalid')
  assert.deepEqual({ entropyCalls, storeCommits }, before)
})

test('QA RED F6 semantic enrollment retry ignores property insertion order', () => {
  const fixture = makeFixture()
  const first = fixture.begin()
  const reversed = Object.fromEntries(Object.entries({ auth_context: { token: 'owner' }, ...binding, mode: 'enroll', idempotency_key: 'enroll-key-01' }).reverse())
  assert.deepEqual(fixture.bridge.createEnrollment(reversed), first)
})

test('F6 null-prototype semantic retry is immutable and changed scope conflicts', () => {
  let entropyCalls = 0
  let storeCommits = 0
  const plannerBinding = { ...binding, role: 'planner', source_ref: 'source_planner_01' }
  const fixture = makeFixture({
    bindings: [binding, plannerBinding],
    random_bytes: (length) => { entropyCalls += 1; return Buffer.alloc(length, entropyCalls) },
    transaction_store: { commit: () => { storeCommits += 1; return true } },
  })
  const first = fixture.begin()
  const before = { entropyCalls, storeCommits }
  const retry = Object.create(null)
  for (const [key, value] of Object.entries({ idempotency_key: 'enroll-key-01', mode: 'enroll', source_ref: binding.source_ref, binding_version: 1, role: 'builder', project_id: 'outcome', workspace_id: 'workspace_main', auth_context: { token: 'owner' } })) {
    Object.defineProperty(retry, key, { value, enumerable: true })
  }
  assert.deepEqual(fixture.bridge.createEnrollment(retry), first)
  assert.deepEqual({ entropyCalls, storeCommits }, before)
  expectCode(() => fixture.bridge.createEnrollment({ auth_context: { token: 'owner' }, ...plannerBinding, mode: 'enroll', idempotency_key: 'enroll-key-01' }), 'idempotency_conflict')
  assert.deepEqual({ entropyCalls, storeCommits }, before)
})
