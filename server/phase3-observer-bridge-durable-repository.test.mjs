import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import test from 'node:test'
import {
  DURABLE_REPOSITORY_OPERATIONS,
  ObserverBridgeDurableRepositoryError,
  createObserverBridgeDurableRepositoryMemoryFake,
} from './phase3-observer-bridge-durable-repository.mjs'

const scope = Object.freeze({
  workspace_id: 'workspace', project_id: 'outcome', role: 'builder', binding_version: 5,
  source_ref: 'source_private_01', source_version: 1,
})
const digest = (character) => character.repeat(64)
const keyFixture = () => {
  const { publicKey } = generateKeyPairSync('ed25519')
  const der = publicKey.export({ format: 'der', type: 'spki' })
  return Object.freeze({ spki: der.toString('base64url'), digest: createHash('sha256').update(der).digest('hex') })
}
const publicKeyFixture = keyFixture()
const rotatedKeyFixture = keyFixture()
const publicKeySpki = publicKeyFixture.spki
const publicKeyDigest = publicKeyFixture.digest
const rotatedKeySpki = rotatedKeyFixture.spki
const rotatedKeyDigest = rotatedKeyFixture.digest
const at = '2026-08-29T00:00:00.000Z'
const later = '2026-08-29T00:05:00.000Z'
const challenge = (revision = 0) => ({ ...scope, expected_durable_revision: revision, idempotency_digest: digest('a'), challenge_digest: digest('b'), expires_at: later })
const completion = (revision = 1) => ({ ...scope, expected_durable_revision: revision, challenge_digest: digest('b'), certificate_digest: digest('c'), key_version: 1, public_key_spki: publicKeySpki, public_key_digest: publicKeyDigest, activated_at: at })
const read = (revision = 2) => ({ ...scope, expected_durable_revision: revision })
const ingest = (revision = 2) => ({ ...scope, expected_durable_revision: revision, certificate_digest: digest('c'), request_digest: digest('e'), nonce_digest: digest('f'), event_digest: digest('1'), sequence: 1, status_code: '구현 진행 중', observed_at: at, expires_at: later })

const expectCode = async (operation, code) => {
  await assert.rejects(operation, (error) => error instanceof ObserverBridgeDurableRepositoryError && error.code === code && error.message === code)
}

test('RED contract exposes exactly six finite async operations and no generic authority surface', async () => {
  assert.deepEqual(DURABLE_REPOSITORY_OPERATIONS, ['createEnrollmentChallenge', 'completeEnrollment', 'readProjection', 'revokeSource', 'rotateSource', 'ingestEvent'])
  const repository = createObserverBridgeDurableRepositoryMemoryFake()
  assert.deepEqual(Reflect.ownKeys(repository).sort(), [...DURABLE_REPOSITORY_OPERATIONS].sort())
  for (const name of DURABLE_REPOSITORY_OPERATIONS) assert.equal(repository[name].constructor.name, 'AsyncFunction')
  for (const forbidden of ['query', 'transaction', 'load', 'commit', 'retry', 'role', 'schema', 'table']) assert.equal(Object.hasOwn(repository, forbidden), false)
})

test('challenge completion and projection publish normalized groups only after materialized success', async () => {
  const repository = createObserverBridgeDurableRepositoryMemoryFake()
  assert.deepEqual(await repository.createEnrollmentChallenge(challenge()), { status: 'challenge_created', durable_revision: 1 })
  assert.deepEqual(await repository.completeEnrollment(completion()), { status: 'source_active', durable_revision: 2, source_version: 1, key_version: 1 })
  assert.deepEqual(await repository.readProjection(read()), { status: 'projection_read', durable_revision: 2, projection: null })
})

test('CAS wrong scope duplicate and schema mismatch are finite and leave durable revision unchanged', async () => {
  const repository = createObserverBridgeDurableRepositoryMemoryFake()
  await repository.createEnrollmentChallenge(challenge())
  for (const [input, code] of [
    [completion(0), 'revision_conflict'],
    [{ ...completion(), project_id: 'other' }, 'access_denied'],
    [{ ...completion(), unexpected: true }, 'input_invalid'],
  ]) await expectCode(() => repository.completeEnrollment(input), code)
  assert.deepEqual(await repository.completeEnrollment(completion()), { status: 'source_active', durable_revision: 2, source_version: 1, key_version: 1 })
  const mismatched = createObserverBridgeDurableRepositoryMemoryFake({ schema_version: 2 })
  await expectCode(() => mismatched.createEnrollmentChallenge(challenge()), 'schema_mismatch')
})

test('replay idempotency conflict rate event projection and audit commit atomically', async () => {
  const repository = createObserverBridgeDurableRepositoryMemoryFake({ rate_limit_count: 1 })
  await repository.createEnrollmentChallenge(challenge())
  await repository.completeEnrollment(completion())
  assert.deepEqual(await repository.ingestEvent(ingest()), { status: 'accepted', durable_revision: 3, sequence: 1 })
  assert.deepEqual(await repository.ingestEvent({ ...ingest(3) }), { status: 'duplicate', durable_revision: 3, sequence: 1 })
  await expectCode(() => repository.ingestEvent({ ...ingest(3), event_digest: digest('2') }), 'request_conflict')
  await expectCode(() => repository.ingestEvent({ ...ingest(3), request_digest: digest('2'), nonce_digest: digest('2'), sequence: 2 }), 'rate_limited')
  assert.deepEqual(await repository.readProjection(read(3)), { status: 'projection_read', durable_revision: 3, projection: { sequence: 1, status_code: '구현 진행 중', observed_at: at, expires_at: later } })
})

test('transaction and response clone failures roll back every drafted group without retry', async () => {
  let transactions = 0
  const transactionFailure = createObserverBridgeDurableRepositoryMemoryFake({ before_commit: () => { transactions += 1; throw new Error('private database detail') } })
  await expectCode(() => transactionFailure.createEnrollmentChallenge(challenge()), 'storage_unavailable')
  await expectCode(() => transactionFailure.createEnrollmentChallenge(challenge()), 'storage_unavailable')
  assert.equal(transactions, 2)

  let clones = 0
  let failResponseOnce = true
  const cloneFailure = createObserverBridgeDurableRepositoryMemoryFake({ clone: (value) => {
    clones += 1
    if (value?.status === 'challenge_created' && failResponseOnce) { failResponseOnce = false; throw new Error('private clone detail') }
    return structuredClone(value)
  } })
  await expectCode(() => cloneFailure.createEnrollmentChallenge(challenge()), 'materialization_failed')
  assert.equal(clones, 2)
  assert.deepEqual(await cloneFailure.createEnrollmentChallenge(challenge()), { status: 'challenge_created', durable_revision: 1 })
})

test('reentry is rejected and does not publish partial state', async () => {
  let repository
  let nested
  repository = createObserverBridgeDurableRepositoryMemoryFake({ before_commit: async () => {
    nested = repository.readProjection(read(1)).catch((error) => error)
    await nested
  } })
  await expectCode(() => repository.createEnrollmentChallenge(challenge()), 'reentrant_operation')
  assert.equal((await nested).code, 'reentrant_operation')
  await expectCode(() => repository.readProjection(read(1)), 'revision_conflict')
})

test('rotation and revocation are scoped atomic operations with finite public-safe errors', async () => {
  const repository = createObserverBridgeDurableRepositoryMemoryFake()
  await repository.createEnrollmentChallenge(challenge())
  await repository.completeEnrollment(completion())
  assert.deepEqual(await repository.rotateSource({ ...scope, expected_durable_revision: 2, certificate_digest: digest('c'), expected_key_version: 1, new_key_version: 2, public_key_spki: rotatedKeySpki, public_key_digest: rotatedKeyDigest, rotated_at: at }), { status: 'key_rotated', durable_revision: 3, key_version: 2 })
  assert.deepEqual(await repository.revokeSource({ ...scope, expected_durable_revision: 3, certificate_digest: digest('c'), revoked_at: at }), { status: 'source_revoked', durable_revision: 4 })
  for (const operation of [
    () => repository.ingestEvent(ingest(4)),
    () => repository.readProjection(read(4)),
  ]) await expectCode(operation, 'access_denied')
  await expectCode(() => repository.createEnrollmentChallenge(new Proxy(challenge(4), { ownKeys() { throw new Error('private trap') } })), 'input_invalid')
})

test('accessor proxy sanitizing clone and shallow nested result cannot cross the contract', async () => {
  let reads = 0
  const accessor = {}
  Object.defineProperty(accessor, 'clone', { enumerable: true, get() { reads += 1; return structuredClone } })
  for (const options of [accessor, new Proxy({}, { ownKeys() { reads += 1; return [] } })]) {
    assert.throws(() => createObserverBridgeDurableRepositoryMemoryFake(options), (error) => error.code === 'configuration_invalid')
  }
  assert.equal(reads, 0)

  const sanitizing = createObserverBridgeDurableRepositoryMemoryFake({ clone: (value) => {
    const copy = { ...value }
    delete copy.unexpected
    return copy
  } })
  await expectCode(() => sanitizing.createEnrollmentChallenge({ ...challenge(), unexpected: true }), 'input_invalid')

  const shallow = createObserverBridgeDurableRepositoryMemoryFake({ clone: (value) => ({ ...value }) })
  await shallow.createEnrollmentChallenge(challenge())
  await shallow.completeEnrollment(completion())
  await shallow.ingestEvent(ingest())
  await expectCode(() => shallow.readProjection(read(3)), 'materialization_failed')
})

test('RA-1 prototype-decorated top-level and nested responses fail before publication', async () => {
  let decorateTopLevel = true
  const topLevel = createObserverBridgeDurableRepositoryMemoryFake({ clone: (value) => {
    const copy = structuredClone(value)
    if (copy?.status === 'challenge_created' && decorateTopLevel) {
      decorateTopLevel = false
      Object.setPrototypeOf(copy, { synthetic_private_marker: true })
      assert.equal(copy.synthetic_private_marker, true)
      assert.equal(Object.hasOwn(copy, 'synthetic_private_marker'), false)
    }
    return copy
  } })
  await expectCode(() => topLevel.createEnrollmentChallenge(challenge()), 'materialization_failed')
  assert.deepEqual(await topLevel.createEnrollmentChallenge(challenge()), { status: 'challenge_created', durable_revision: 1 })

  const nested = createObserverBridgeDurableRepositoryMemoryFake({ clone: (value) => {
    const copy = structuredClone(value)
    if (copy?.status === 'projection_read' && copy.projection) {
      Object.setPrototypeOf(copy.projection, { synthetic_private_marker: true })
      assert.equal(copy.projection.synthetic_private_marker, true)
      assert.equal(Object.hasOwn(copy.projection, 'synthetic_private_marker'), false)
    }
    return copy
  } })
  await nested.createEnrollmentChallenge(challenge())
  await nested.completeEnrollment(completion())
  await nested.ingestEvent(ingest())
  await expectCode(() => nested.readProjection(read(3)), 'materialization_failed')
  assert.deepEqual(await nested.ingestEvent({ ...ingest(3), request_digest: digest('2'), nonce_digest: digest('2'), event_digest: digest('2'), sequence: 2 }), { status: 'accepted', durable_revision: 4, sequence: 2 })
})

test('SPKI contract validates canonical key digest before transaction and never leaks key material', async () => {
  let commits = 0
  const repository = createObserverBridgeDurableRepositoryMemoryFake({ before_commit: () => { commits += 1 } })
  await repository.createEnrollmentChallenge(challenge())
  assert.equal(commits, 1)
  for (const changes of [
    { public_key_spki: undefined },
    { public_key_spki: 'A'.repeat(39) },
    { public_key_spki: `${publicKeySpki}=` },
    { public_key_spki: publicKeySpki, public_key_digest: digest('0') },
  ]) {
    const input = { ...completion(), ...changes }
    if (changes.public_key_spki === undefined) delete input.public_key_spki
    await expectCode(() => repository.completeEnrollment(input), 'input_invalid')
  }
  assert.equal(commits, 1)
  const accessor = completion()
  Object.defineProperty(accessor, 'public_key_spki', { enumerable: true, get() { throw new Error('private getter') } })
  await expectCode(() => repository.completeEnrollment(accessor), 'input_invalid')
  await expectCode(() => repository.completeEnrollment(new Proxy(completion(), { ownKeys() { throw new Error('private trap') } })), 'input_invalid')
  assert.equal(commits, 1)

  const completed = await repository.completeEnrollment(completion())
  assert.equal(commits, 2)
  assert.equal(JSON.stringify(completed).includes(publicKeySpki), false)
  const rotation = { ...scope, expected_durable_revision: 2, certificate_digest: digest('c'), expected_key_version: 1, new_key_version: 2, public_key_spki: rotatedKeySpki, public_key_digest: rotatedKeyDigest, rotated_at: at }
  const missingRotationSpki = { ...rotation }
  delete missingRotationSpki.public_key_spki
  await expectCode(() => repository.rotateSource(missingRotationSpki), 'input_invalid')
  await expectCode(() => repository.rotateSource({ ...rotation, public_key_digest: digest('0') }), 'input_invalid')
  assert.equal(commits, 2)
  const rotated = await repository.rotateSource(rotation)
  assert.equal(commits, 3)
  assert.equal(JSON.stringify(rotated).includes(rotatedKeySpki), false)
})

test('hostile canonical non-SPKI and non-Ed25519 DER fail before transaction entry', async () => {
  let commits = 0
  const repository = createObserverBridgeDurableRepositoryMemoryFake({ before_commit: () => { commits += 1 } })
  await repository.createEnrollmentChallenge(challenge())
  const rawKeyBytes = Buffer.alloc(32, 1)
  const { publicKey: wrongAlgorithmKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const wrongAlgorithmDer = wrongAlgorithmKey.export({ format: 'der', type: 'spki' })
  const decoratedDer = Buffer.concat([Buffer.from(publicKeySpki, 'base64url'), Buffer.of(0)])
  for (const der of [rawKeyBytes, wrongAlgorithmDer, decoratedDer]) {
    await expectCode(() => repository.completeEnrollment({
      ...completion(),
      public_key_spki: der.toString('base64url'),
      public_key_digest: createHash('sha256').update(der).digest('hex'),
    }), 'input_invalid')
  }
  assert.equal(commits, 1)
  await expectCode(() => repository.readProjection(read(1)), 'access_denied')
})

test('post-call input mutation cannot replace materialized Ed25519 key state', async () => {
  let commits = 0
  let releaseCommit
  const repository = createObserverBridgeDurableRepositoryMemoryFake({ before_commit: () => {
    commits += 1
    if (commits > 1) return new Promise((resolve) => { releaseCommit = resolve })
  } })
  await repository.createEnrollmentChallenge(challenge())
  const completionInput = completion()
  const completing = repository.completeEnrollment(completionInput)
  completionInput.public_key_spki = Buffer.alloc(32, 1).toString('base64url')
  completionInput.public_key_digest = createHash('sha256').update(Buffer.alloc(32, 1)).digest('hex')
  releaseCommit()
  assert.deepEqual(await completing, { status: 'source_active', durable_revision: 2, source_version: 1, key_version: 1 })

  const rotationInput = { ...scope, expected_durable_revision: 2, certificate_digest: digest('c'), expected_key_version: 1, new_key_version: 2, public_key_spki: rotatedKeySpki, public_key_digest: rotatedKeyDigest, rotated_at: at }
  const rotating = repository.rotateSource(rotationInput)
  rotationInput.public_key_spki = Buffer.alloc(32, 2).toString('base64url')
  rotationInput.public_key_digest = createHash('sha256').update(Buffer.alloc(32, 2)).digest('hex')
  releaseCommit()
  assert.deepEqual(await rotating, { status: 'key_rotated', durable_revision: 3, key_version: 2 })
})
