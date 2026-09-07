import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { ObserverBridgeDurableRepositoryError } from './phase3-observer-bridge-durable-repository.mjs'
import { createObserverBridgeDurableRepositoryPostgres, DURABLE_REPOSITORY_POSTGRES_OPERATIONS } from './phase3-observer-bridge-durable-repository-postgres.mjs'

const foundationUrl = new URL('../supabase/migrations/202608250001_account_access_foundation.sql', import.meta.url)
const migrationUrl = new URL('../supabase/migrations/20260827000756_observer_bridge.sql', import.meta.url)
const AT = '2026-08-29T00:00:00.000Z'
const LATER = '2026-08-29T00:05:00.000Z'
const digest = (character) => character.repeat(64)
const scope = Object.freeze({ workspace_id: 'workspace-main', project_id: 'outcome', role: 'builder', binding_version: 5, source_ref: 'source_private_01', source_version: 1 })
const keyFixture = () => {
  const { publicKey } = generateKeyPairSync('ed25519')
  const der = publicKey.export({ format: 'der', type: 'spki' })
  return { spki: der.toString('base64url'), digest: createHash('sha256').update(der).digest('hex') }
}
const firstKey = keyFixture()
const secondKey = keyFixture()
const base = (revision) => ({ ...scope, expected_durable_revision: revision })
const challenge = (revision = 0) => ({ ...base(revision), idempotency_digest: digest('a'), challenge_digest: digest('b'), expires_at: LATER })
const completion = (revision = 1) => ({ ...base(revision), challenge_digest: digest('b'), certificate_digest: digest('c'), key_version: 1, public_key_spki: firstKey.spki, public_key_digest: firstKey.digest, activated_at: AT })
const rotation = (revision = 2) => ({ ...base(revision), certificate_digest: digest('c'), expected_key_version: 1, new_key_version: 2, public_key_spki: secondKey.spki, public_key_digest: secondKey.digest, rotated_at: AT })
const event = (revision = 2) => ({ ...base(revision), certificate_digest: digest('c'), request_digest: digest('d'), nonce_digest: digest('e'), event_digest: digest('f'), sequence: 1, status_code: '구현 진행 중', observed_at: AT, expires_at: LATER })
const expectCode = (operation, code) => assert.rejects(operation, (error) => error instanceof ObserverBridgeDurableRepositoryError && error.code === code && error.message === code)

async function createDatabase() {
  const db = await PGlite.create('memory://')
  await db.exec('create role anon nologin; create role authenticated nologin; create schema auth; create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting(\'request.jwt.claims\', true), \'\'), \'{}\')::jsonb $$; grant usage on schema auth to authenticated; grant execute on function auth.jwt() to authenticated;')
  await db.exec(await readFile(foundationUrl, 'utf8'))
  await db.exec(await readFile(migrationUrl, 'utf8'))
  await db.exec(`insert into outcome_private.workspaces(id,state) values ('workspace-main','active'); insert into outcome_private.projects(id,package_id,state) values ('outcome','outcome','active'); insert into outcome_private.project_bindings(workspace_id,project_id,state) values ('workspace-main','outcome','active'); insert into outcome_private.bridge_schema_versions(workspace_id,schema_version,durable_revision,updated_at) values ('workspace-main',1,0,'${AT}')`)
  return db
}

function transactionPort(db, { fail = null, failure = null, onQuery = null } = {}) {
  return async (context, operation) => {
    assert.deepEqual(context, { effective_role: 'outcome_bridge_backend' })
    await db.exec('begin')
    try {
      await db.exec('set local role outcome_bridge_backend')
      const response = await operation({ query: async (sql, params) => {
        assert.equal(typeof sql, 'string')
        assert.equal(Array.isArray(params), true)
        assert.equal(sql.includes('workspace-main'), false)
        if (onQuery) await onQuery()
        if (fail?.test(sql)) throw failure ?? new Error('private database detail')
        return db.query(sql, params)
      } })
      await db.exec('commit')
      return response
    } catch (error) {
      await db.exec('rollback')
      throw error
    }
  }
}

const rowIdFactory = () => {
  let next = 0
  return () => `018f0000-0000-7000-8000-${(++next).toString(16).padStart(12, '0')}`
}
const repositoryFor = (db, options = {}) => createObserverBridgeDurableRepositoryPostgres({ with_transaction: transactionPort(db, options), new_row_id: rowIdFactory() })

test('surface is exactly six finite operations with no generic authority', async () => {
  const db = await createDatabase()
  try {
    const repository = repositoryFor(db)
    assert.deepEqual(DURABLE_REPOSITORY_POSTGRES_OPERATIONS, ['createEnrollmentChallenge', 'completeEnrollment', 'readProjection', 'revokeSource', 'rotateSource', 'ingestEvent'])
    assert.deepEqual(Reflect.ownKeys(repository).sort(), [...DURABLE_REPOSITORY_POSTGRES_OPERATIONS].sort())
    for (const name of DURABLE_REPOSITORY_POSTGRES_OPERATIONS) assert.equal(repository[name].constructor.name, 'AsyncFunction')
    for (const name of ['query', 'transaction', 'role', 'schema', 'table', 'retry', 'load', 'commit']) assert.equal(Object.hasOwn(repository, name), false)
    for (const options of [{ with_transaction: async () => {}, role: 'owner' }, new Proxy({ with_transaction: async () => {} }, { ownKeys() { throw new Error('private trap') } })]) {
      assert.throws(() => createObserverBridgeDurableRepositoryPostgres(options), (error) => error.code === 'configuration_invalid')
    }
  } finally { await db.close() }
})

test('all six operations map normalized rows and memory-oracle responses atomically', async () => {
  const db = await createDatabase()
  try {
    const repository = repositoryFor(db)
    assert.deepEqual(await repository.createEnrollmentChallenge(challenge()), { status: 'challenge_created', durable_revision: 1 })
    assert.deepEqual(await repository.createEnrollmentChallenge(challenge(1)), { status: 'duplicate', durable_revision: 1 })
    assert.deepEqual(await repository.completeEnrollment(completion()), { status: 'source_active', durable_revision: 2, source_version: 1, key_version: 1 })
    assert.deepEqual(await repository.readProjection(base(2)), { status: 'projection_read', durable_revision: 2, projection: null })
    assert.deepEqual(await repository.ingestEvent(event()), { status: 'accepted', durable_revision: 3, sequence: 1 })
    assert.deepEqual(await repository.ingestEvent(event(3)), { status: 'duplicate', durable_revision: 3, sequence: 1 })
    assert.deepEqual(await repository.readProjection(base(3)), { status: 'projection_read', durable_revision: 3, projection: { sequence: 1, status_code: '구현 진행 중', observed_at: AT, expires_at: LATER } })
    assert.deepEqual(await repository.rotateSource(rotation(3)), { status: 'key_rotated', durable_revision: 4, key_version: 2 })
    assert.deepEqual(await repository.revokeSource({ ...base(4), certificate_digest: digest('c'), revoked_at: AT }), { status: 'source_revoked', durable_revision: 5 })
    await expectCode(() => repository.readProjection(base(5)), 'access_denied')
    const counts = {}
    for (const table of ['bridge_enrollment_challenges', 'bridge_source_scopes', 'bridge_sources', 'bridge_source_keys', 'bridge_events', 'bridge_request_replay', 'bridge_projections', 'bridge_audit']) counts[table] = Number((await db.query(`select count(*)::int count from outcome_private.${table}`)).rows[0].count)
    assert.deepEqual(counts, { bridge_enrollment_challenges: 1, bridge_source_scopes: 1, bridge_sources: 1, bridge_source_keys: 2, bridge_events: 1, bridge_request_replay: 1, bridge_projections: 1, bridge_audit: 5 })
  } finally { await db.close() }
})

test('canonical Ed25519 DER-SPKI and digest fail closed before transaction', async () => {
  const db = await createDatabase()
  try {
    let transactions = 0
    const basePort = transactionPort(db)
    const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async (...args) => { transactions += 1; return basePort(...args) }, new_row_id: rowIdFactory() })
    await repository.createEnrollmentChallenge(challenge())
    const raw = Buffer.alloc(32, 1)
    const { publicKey: ecKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    for (const bytes of [raw, ecKey.export({ format: 'der', type: 'spki' }), Buffer.concat([Buffer.from(firstKey.spki, 'base64url'), Buffer.of(0)])]) {
      await expectCode(() => repository.completeEnrollment({ ...completion(), public_key_spki: bytes.toString('base64url'), public_key_digest: createHash('sha256').update(bytes).digest('hex') }), 'input_invalid')
    }
    await expectCode(() => repository.completeEnrollment({ ...completion(), public_key_digest: digest('0') }), 'input_invalid')
    assert.equal(transactions, 1)
    assert.equal(Number((await db.query('select durable_revision::int from outcome_private.bridge_schema_versions')).rows[0].durable_revision), 1)
  } finally { await db.close() }
})

test('expected revision scope expiry replay sequence and rate errors preserve state', async () => {
  const db = await createDatabase()
  try {
    const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: transactionPort(db), new_row_id: rowIdFactory(), rate_limit_count: 1 })
    await repository.createEnrollmentChallenge(challenge())
    await expectCode(() => repository.completeEnrollment(completion(0)), 'revision_conflict')
    await expectCode(() => repository.completeEnrollment({ ...completion(), project_id: 'other' }), 'access_denied')
    await expectCode(() => repository.completeEnrollment({ ...completion(), activated_at: LATER }), 'enrollment_invalid')
    await repository.completeEnrollment(completion())
    await expectCode(() => repository.ingestEvent({ ...event(), sequence: 2 }), 'sequence_conflict')
    await repository.ingestEvent(event())
    await expectCode(() => repository.ingestEvent({ ...event(3), request_digest: digest('1'), nonce_digest: digest('2'), event_digest: digest('3'), sequence: 2 }), 'rate_limited')
    await expectCode(() => repository.ingestEvent({ ...event(3), event_digest: digest('4') }), 'request_conflict')
    assert.equal(Number((await db.query('select durable_revision::int from outcome_private.bridge_schema_versions')).rows[0].durable_revision), 3)
  } finally { await db.close() }
})

test('storage and response materialization failure roll back with no retry or leakage', async () => {
  const db = await createDatabase()
  try {
    let attempts = 0
    const failing = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async (...args) => { attempts += 1; return transactionPort(db, { fail: /insert into outcome_private\.bridge_audit/ })(...args) }, new_row_id: rowIdFactory() })
    await expectCode(() => failing.createEnrollmentChallenge(challenge()), 'storage_unavailable')
    assert.equal(attempts, 1)
    assert.equal(Number((await db.query('select count(*)::int count from outcome_private.bridge_enrollment_challenges')).rows[0].count), 0)
    assert.equal(Number((await db.query('select durable_revision::int from outcome_private.bridge_schema_versions')).rows[0].durable_revision), 0)

    const cloneFailure = createObserverBridgeDurableRepositoryPostgres({ with_transaction: transactionPort(db), new_row_id: rowIdFactory(), clone: (value) => value?.status ? { ...value, leaked: firstKey.spki } : structuredClone(value) })
    await expectCode(() => cloneFailure.createEnrollmentChallenge(challenge()), 'materialization_failed')
    assert.equal(Number((await db.query('select count(*)::int count from outcome_private.bridge_enrollment_challenges')).rows[0].count), 0)
    assert.equal(JSON.stringify(await db.query('select durable_revision from outcome_private.bridge_schema_versions')).includes(firstKey.spki), false)
  } finally { await db.close() }
})

test('reentry and malformed client ports fail closed without partial publication', async () => {
  const db = await createDatabase()
  try {
    let repository
    let nested
    let attack = true
    const port = transactionPort(db, { onQuery: async () => {
      if (!attack) return
      attack = false
      nested = repository.readProjection(base(1)).catch((error) => error)
      await nested
    } })
    repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: port, new_row_id: rowIdFactory() })
    await expectCode(() => repository.createEnrollmentChallenge(challenge()), 'reentrant_operation')
    assert.equal((await nested).code, 'reentrant_operation')
    assert.equal(Number((await db.query('select count(*)::int count from outcome_private.bridge_enrollment_challenges')).rows[0].count), 0)
    const malformed = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async (_context, operation) => operation({ query: async () => ({ rows: [] }), extra: true }) })
    await expectCode(() => malformed.createEnrollmentChallenge(challenge()), 'storage_unavailable')
  } finally { await db.close() }
})

test('concurrent operation loses finitely without retry or a second transaction', async () => {
  const db = await createDatabase()
  try {
    let release
    let announce
    let transactionCount = 0
    let firstQuery = true
    const entered = new Promise((resolve) => { announce = resolve })
    const basePort = transactionPort(db, { onQuery: async () => {
      if (!firstQuery) return
      firstQuery = false
      announce()
      await new Promise((resolve) => { release = resolve })
    } })
    const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async (...args) => { transactionCount += 1; return basePort(...args) }, new_row_id: rowIdFactory() })
    const winner = repository.createEnrollmentChallenge(challenge())
    await entered
    await expectCode(() => repository.createEnrollmentChallenge(challenge()), 'reentrant_operation')
    release()
    await expectCode(() => winner, 'reentrant_operation')
    assert.equal(transactionCount, 1)
    assert.equal(Number((await db.query('select count(*)::int count from outcome_private.bridge_enrollment_challenges')).rows[0].count), 0)
  } finally { await db.close() }
})

test('constant parameterized SQL uses only the fixed least-privilege role', async () => {
  const calls = []
  const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async (context, operation) => {
    assert.deepEqual(context, { effective_role: 'outcome_bridge_backend' })
    return operation({ query: async (sql, params) => {
      calls.push({ sql, params })
      if (sql.startsWith('select schema_version')) return { rows: [{ schema_version: 1, durable_revision: 0 }] }
      if (sql.startsWith('select project_id')) return { rows: [] }
      if (sql.startsWith('select challenge_digest')) return { rows: [] }
      if (sql.startsWith('select source_ref')) return { rows: [] }
      if (sql.startsWith('update outcome_private.bridge_schema_versions')) return { rows: [{ durable_revision: 1 }] }
      return { rows: [], rowCount: 1 }
    } })
  }, new_row_id: rowIdFactory() })
  const output = await repository.createEnrollmentChallenge(challenge())
  assert.deepEqual(output, { status: 'challenge_created', durable_revision: 1 })
  assert.equal(calls.every(({ sql, params }) => typeof sql === 'string' && Array.isArray(params) && !sql.includes('workspace-main')), true)
  assert.doesNotMatch(JSON.stringify(output), /spki|digest|workspace|source|certificate|credential|session|thread|path/i)
})

test('hostile storage message accessor cannot execute or escape private detail', async () => {
  const db = await createDatabase()
  let invocations = 0
  let accessorReads = 0
  const hostile = {}
  Object.defineProperty(hostile, 'message', { enumerable: true, get() { accessorReads += 1; throw new Error('private storage getter detail') } })
  try {
    const port = transactionPort(db, { fail: /insert into outcome_private\.bridge_audit/, failure: hostile })
    const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async (...args) => { invocations += 1; return port(...args) }, new_row_id: rowIdFactory() })
    await expectCode(() => repository.createEnrollmentChallenge(challenge()), 'storage_unavailable')
    assert.equal(invocations, 1)
    assert.equal(accessorReads, 0)
    assert.equal(Number((await db.query('select count(*)::int count from outcome_private.bridge_enrollment_challenges')).rows[0].count), 0)
    assert.equal(Number((await db.query('select durable_revision::int from outcome_private.bridge_schema_versions')).rows[0].durable_revision), 0)
  } finally { await db.close() }
})

test('proxy coercion symbol and malformed error shapes map finitely without caller behavior', async () => {
  let behaviorCalls = 0
  const coercive = {}
  Object.defineProperties(coercive, {
    toString: { enumerable: true, value() { behaviorCalls += 1; throw new Error('private toString detail') } },
    valueOf: { enumerable: true, value() { behaviorCalls += 1; throw new Error('private valueOf detail') } },
  })
  const errorPrototypeOnly = Object.create(Error.prototype)
  const decoratedRepositoryError = new ObserverBridgeDurableRepositoryError('revision_conflict')
  Object.defineProperty(decoratedRepositoryError, 'message', { get() { behaviorCalls += 1; throw new Error('private decorated detail') } })
  const repositoryPrototypeOnly = Object.create(ObserverBridgeDurableRepositoryError.prototype)
  Object.defineProperty(repositoryPrototypeOnly, 'code', { get() { behaviorCalls += 1; throw new Error('private code detail') } })
  const shapes = [
    new Proxy({}, { get() { behaviorCalls += 1; throw new Error('private proxy detail') }, getPrototypeOf() { behaviorCalls += 1; throw new Error('private prototype detail') } }),
    coercive,
    errorPrototypeOnly,
    decoratedRepositoryError,
    repositoryPrototypeOnly,
    Symbol('private symbol detail'),
    'private string detail',
    7,
    null,
    undefined,
  ]
  for (const shape of shapes) {
    const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async () => { throw shape } })
    await expectCode(() => repository.createEnrollmentChallenge(challenge()), 'storage_unavailable')
  }
  assert.equal(behaviorCalls, 0)
})

test('trusted repository and native database errors retain approved finite mappings', async () => {
  for (const [operation, thrown, code] of [
    ['createEnrollmentChallenge', new ObserverBridgeDurableRepositoryError('revision_conflict'), 'revision_conflict'],
    ['createEnrollmentChallenge', new Error('permission denied for table bridge_sources'), 'access_denied'],
    ['createEnrollmentChallenge', new Error('serialization failure'), 'revision_conflict'],
    ['createEnrollmentChallenge', new Error('duplicate key value violates unique constraint'), 'enrollment_conflict'],
    ['ingestEvent', new Error('duplicate key value violates unique constraint'), 'request_conflict'],
  ]) {
    let invocations = 0
    const repository = createObserverBridgeDurableRepositoryPostgres({ with_transaction: async () => { invocations += 1; throw thrown } })
    await expectCode(() => repository[operation](operation === 'ingestEvent' ? event() : challenge()), code)
    assert.equal(invocations, 1)
  }
})
