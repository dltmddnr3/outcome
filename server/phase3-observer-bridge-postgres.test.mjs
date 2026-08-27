import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { computeTombstoneCoverageDigest, createObserverBridgePostgresAdapter, OBSERVER_BRIDGE_EFFECTIVE_ROLE, OBSERVER_BRIDGE_POSTGRES_FUTURE_SKEW_MS, ObserverBridgePostgresError } from './phase3-observer-bridge-postgres.mjs'

const foundationUrl = new URL('../supabase/migrations/202608250001_account_access_foundation.sql', import.meta.url)
const migrationUrl = new URL('../supabase/migrations/20260827000756_observer_bridge.sql', import.meta.url)
const AT = '2026-08-27T00:00:00.000Z'
const EXPIRES = '2026-08-27T00:01:00.000Z'
const digest = (character) => character.repeat(64)
const uuid7 = (character) => `018f0000-0000-7000-8000-${character.repeat(12)}`
const MAIN_SCOPE = Object.freeze({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'builder', binding_version: 1, source_ref: 'source_main_01', source_version: 1 })
const expectCode = async (operation, code) => assert.rejects(operation, (error) => error instanceof ObserverBridgePostgresError && error.code === code)
const denied = async (operation) => {
  try { await operation(); return false } catch (error) { return /permission denied|row-level security|violates|duplicate key|foreign key|already exists/i.test(String(error.message)) }
}

async function createDatabase() {
  const db = await PGlite.create('memory://')
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.jwt() to authenticated;
  `)
  await db.exec(await readFile(foundationUrl, 'utf8'))
  await db.exec(await readFile(migrationUrl, 'utf8'))
  await db.exec(`
    insert into outcome_private.workspaces(id,state) values ('workspace-main','active'),('workspace-other','active');
    insert into outcome_private.workspace_memberships(workspace_id,identity_subject,role,state) values
      ('workspace-main','subject-main','owner-viewer','active'),
      ('workspace-other','subject-other','owner-viewer','active');
    insert into outcome_private.projects(id,package_id,state) values ('project-outcome','outcome','active');
    insert into outcome_private.project_bindings(workspace_id,project_id,state) values
      ('workspace-main','project-outcome','active'),('workspace-other','project-outcome','active');
    insert into outcome_private.bridge_schema_versions(workspace_id,schema_version,durable_revision,updated_at) values
      ('workspace-main',1,0,'${AT}'),('workspace-other',1,0,'${AT}');
    insert into outcome_private.bridge_enrollment_challenges(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,challenge_digest,idempotency_digest,state,issued_at,expires_at,revision) values
      ('workspace-main','project-outcome','planner',1,'source_plan_01',1,1,'${digest('9')}','${digest('8')}','pending','${AT}','${EXPIRES}',1);
    insert into outcome_private.bridge_source_scopes(workspace_id,project_id,role,binding_version,source_ref,source_version,created_at) values
      ('workspace-main','project-outcome','builder',1,'source_main_01',1,'${AT}'),
      ('workspace-other','project-outcome','builder',1,'source_other_01',1,'${AT}');
    insert into outcome_private.bridge_sources(workspace_id,project_id,role,binding_version,source_ref,source_version,active_key_version,certificate_digest,state,revision,created_at,updated_at) values
      ('workspace-main','project-outcome','builder',1,'source_main_01',1,1,'${digest('a')}','active',1,'${AT}','${AT}'),
      ('workspace-other','project-outcome','builder',1,'source_other_01',1,1,'${digest('b')}','active',1,'${AT}','${AT}');
    insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values
      ('workspace-main','project-outcome','builder',1,'source_main_01',1,1,'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','${digest('c')}','active','${AT}'),
      ('workspace-other','project-outcome','builder',1,'source_other_01',1,1,'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','${digest('d')}','active','${AT}');
    insert into outcome_private.bridge_projections(workspace_id,project_id,role,binding_version,source_ref,source_version,status_code,freshness_class,observed_time_class,ledger_revision,accepted_count,conflict_count,durable_revision,cache_revision,updated_at) values
      ('workspace-main','project-outcome','builder',1,'source_main_01',1,null,'unknown','unavailable',0,0,0,0,0,'${AT}'),
      ('workspace-other','project-outcome','builder',1,'source_other_01',1,null,'unknown','unavailable',0,0,0,0,0,'${AT}');
  `)
  return db
}

function transactionPort(db, failPattern = null, effectiveRole = 'outcome_bridge_backend', emptyPattern = null) {
  return async (context, operation) => {
    assert.deepEqual(context, { effective_role: effectiveRole })
    await db.exec('begin')
    try {
      if (effectiveRole) await db.exec(`set local role ${effectiveRole}`)
      const result = await operation({ query: async (sql, params) => {
        if (failPattern?.test(sql)) throw new Error('forced storage failure')
        if (emptyPattern?.test(sql)) return { rows: [] }
        return db.query(sql, params)
      } })
      await db.exec('commit')
      return result
    } catch (error) {
      await db.exec('rollback')
      throw error
    }
  }
}

const eventInput = (changes = {}) => ({
  workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'builder', binding_version: 1,
  source_ref: 'source_main_01', source_version: 1, key_version: 1,
  request_digest: digest('e'), nonce_digest: digest('f'), event_digest: digest('1'), sequence: 1,
  status_code: '구현 진행 중', observed_at: AT, expires_at: EXPIRES, expected_ledger_revision: 0,
  ...changes,
})

test('exact migrations execute and every bridge table has forced RLS with explicit least grants', async () => {
  const migration = await readFile(migrationUrl, 'utf8')
  assert.doesNotMatch(migration, /security\s+definer|auth\.role\(|service_role/i)
  const db = await createDatabase()
  try {
    const flags = (await db.query(`select relname,relrowsecurity,relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='outcome_private' and relname like 'bridge_%' and relkind='r' order by relname`)).rows
    assert.equal(flags.length, 12)
    assert.equal(flags.every((row) => row.relrowsecurity && row.relforcerowsecurity), true)
    const grants = (await db.query(`select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='outcome_private' and table_name like 'bridge_%' order by grantee,table_name,privilege_type`)).rows
    assert.equal(grants.some((row) => row.grantee === 'anon'), false)
    assert.deepEqual(grants.filter((row) => row.grantee === 'authenticated').map((row) => `${row.table_name}:${row.privilege_type}`), ['bridge_projections:SELECT'])
    assert.equal(grants.some((row) => row.grantee === 'outcome_bridge_backend' && row.table_name === 'bridge_events' && row.privilege_type === 'UPDATE'), false)
    assert.equal(grants.some((row) => row.grantee === 'outcome_bridge_backend' && row.table_name === 'bridge_events' && row.privilege_type === 'DELETE'), true)
    assert.equal(grants.some((row) => row.grantee === 'outcome_bridge_backend' && row.table_name === 'bridge_audit' && ['UPDATE', 'DELETE'].includes(row.privilege_type)), false)
    assert.equal(grants.some((row) => row.grantee === 'outcome_bridge_backend' && row.table_name === 'bridge_backup_manifests' && ['UPDATE', 'DELETE'].includes(row.privilege_type)), false)
    const policies = (await db.query(`select policyname from pg_policies where schemaname='outcome_private' and tablename like 'bridge_%' order by policyname`)).rows
    assert.equal(policies.length, 13)
    assert.deepEqual((await db.query(`select rolname from pg_roles where rolname like 'outcome_bridge_%' order by rolname`)).rows, [{ rolname: 'outcome_bridge_backend' }])
    const migrationSql = await readFile(migrationUrl, 'utf8')
    assert.equal(await denied(() => db.exec(migrationSql)), true)
    await db.exec('rollback')
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_sources`)).rows[0].count), 2)
  } finally { await db.close() }
})

test('authenticated and anon RLS expose only own projection and deny raw tables and every write', async () => {
  const db = await createDatabase()
  try {
    await db.exec(`set role authenticated; set request.jwt.claims='{"sub":"subject-main"}';`)
    const projections = (await db.query('select workspace_id from outcome_private.bridge_projections')).rows
    assert.deepEqual(projections, [{ workspace_id: 'workspace-main' }])
    assert.equal(await denied(() => db.query('select * from outcome_private.bridge_events')), true)
    assert.equal(await denied(() => db.exec(`insert into outcome_private.bridge_projections(workspace_id,project_id,role,binding_version,source_ref,source_version,freshness_class,observed_time_class,ledger_revision,accepted_count,conflict_count,durable_revision,cache_revision,updated_at) values ('workspace-main','project-outcome','builder',2,'source_main_01',1,'unknown','unavailable',0,0,0,0,0,'${AT}')`)), true)
    await db.exec(`set request.jwt.claims='{"sub":"subject-other"}';`)
    assert.deepEqual((await db.query('select workspace_id from outcome_private.bridge_projections')).rows, [{ workspace_id: 'workspace-other' }])
    await db.exec(`reset role; update outcome_private.workspace_memberships set state='revoked' where identity_subject='subject-main'; set role authenticated; set request.jwt.claims='{"sub":"subject-main"}';`)
    assert.equal((await db.query('select * from outcome_private.bridge_projections')).rows.length, 0)
    await db.exec('reset role; set role anon;')
    assert.equal(await denied(() => db.query('select * from outcome_private.bridge_projections')), true)
  } finally { await db.close() }
})

test('dedicated backend is NOLOGIN NOBYPASSRLS, forced-RLS compatible and event-update denied', async () => {
  const db = await createDatabase()
  try {
    const role = (await db.query(`select rolcanlogin,rolbypassrls from pg_roles where rolname='outcome_bridge_backend'`)).rows[0]
    assert.deepEqual(role, { rolcanlogin: false, rolbypassrls: false })
    await db.exec('set role outcome_bridge_backend')
    assert.equal((await db.query('select workspace_id from outcome_private.bridge_sources')).rows.length, 2)
    await db.exec(`select set_config('outcome.bridge.workspace_id','workspace-other',false)`)
    assert.equal((await db.query('select workspace_id from outcome_private.bridge_sources')).rows.length, 2)
    await db.exec(`insert into outcome_private.bridge_events(event_id,workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values ('${uuid7('1')}','workspace-main','project-outcome','builder',1,'source_main_01',1,1,1,1,'구현 진행 중','${AT}','${EXPIRES}','${digest('0')}','ed25519_verified','${AT}')`)
    assert.equal((await db.query('select count(*)::int count from outcome_private.bridge_events')).rows[0].count, 1)
    assert.equal(await denied(() => db.exec(`update outcome_private.bridge_events set status_code='테스트 실행 중'`)), true)
    await db.exec('reset role; create schema outcome_unrelated; create table outcome_unrelated.private_rows(value integer); revoke all on schema outcome_unrelated from public; revoke all on outcome_unrelated.private_rows from public; set role outcome_bridge_backend')
    assert.equal(await denied(() => db.query('select * from outcome_unrelated.private_rows')), true)
  } finally { await db.close() }
})

test('constraints deny invalid state, duplicate active scope and cross-workspace foreign scope', async () => {
  const db = await createDatabase()
  try {
    assert.equal(await denied(() => db.exec(`insert into outcome_private.bridge_sources(workspace_id,project_id,role,binding_version,source_ref,source_version,active_key_version,certificate_digest,state,revision,created_at,updated_at) values ('workspace-main','project-outcome','builder',1,'source_second_01',2,1,'${digest('3')}','active',1,'${AT}','${AT}')`)), true)
    assert.equal(await denied(() => db.exec(`insert into outcome_private.bridge_audit(workspace_id,project_id,role,binding_version,action_code,reason_code,revision,occurred_at) values ('workspace-missing','project-outcome','builder',1,'event_accepted','ok',1,'${AT}')`)), true)
    assert.equal(await denied(() => db.exec(`insert into outcome_private.bridge_events(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values ('workspace-main','project-outcome','builder',1,'source_main_01',1,1,1,1,'free text','${AT}','${EXPIRES}','${digest('4')}','ed25519_verified','${AT}')`)), true)
  } finally { await db.close() }
})

test('Postgres adapter appends replay event projection audit atomically with CAS and duplicate semantics', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    assert.deepEqual(await adapter.appendEvent(eventInput()), { status: 'accepted', ledger_revision: 1, accepted_count: 1 })
    assert.deepEqual(await adapter.appendEvent(eventInput({ expected_ledger_revision: 1 })), { status: 'duplicate', ledger_revision: 1 })
    assert.deepEqual(await adapter.appendEvent(eventInput({ request_digest: digest('5'), nonce_digest: digest('6'), event_digest: digest('7'), sequence: 2, expected_ledger_revision: 1, status_code: '테스트 실행 중' })), { status: 'accepted', ledger_revision: 2, accepted_count: 2 })
    await expectCode(() => adapter.appendEvent(eventInput({ request_digest: digest('8'), nonce_digest: digest('9'), event_digest: digest('a'), sequence: 4, expected_ledger_revision: 2 })), 'sequence_conflict')
    for (const change of [{ role: 'planner' }, { binding_version: 2 }, { source_ref: 'source_other_01' }, { key_version: 2 }]) await expectCode(() => adapter.appendEvent(eventInput({ ...change, request_digest: digest('b'), nonce_digest: digest('c'), event_digest: digest('d'), sequence: 3, expected_ledger_revision: 2 })), 'access_denied')
    const counts = {}
    for (const table of ['bridge_events', 'bridge_request_replay', 'bridge_audit']) counts[table] = Number((await db.query(`select count(*)::int count from outcome_private.${table}`)).rows[0].count)
    assert.deepEqual(counts, { bridge_events: 2, bridge_request_replay: 2, bridge_audit: 2 })
    const ids = (await db.query('select event_id::text id from outcome_private.bridge_events union all select audit_id::text id from outcome_private.bridge_audit')).rows.map(({ id }) => id)
    assert.equal(ids.length, 4)
    assert.equal(ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)), true)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(Number((await db.query(`select ledger_revision::int from outcome_private.bridge_projections where workspace_id='workspace-other'`)).rows[0].ledger_revision), 0)
  } finally { await db.close() }
})

test('challenge activation, rotation and revocation are transaction and revision bound', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    const activated = await adapter.activateSource({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'planner', binding_version: 1, source_ref: 'source_plan_01', source_version: 1, key_version: 1, challenge_digest: digest('9'), expected_challenge_revision: 1, certificate_digest: digest('7'), public_key_spki: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', public_key_digest: digest('6'), activated_at: '2026-08-27T00:00:30.000Z' })
    assert.deepEqual(activated, { status: 'source_activated', source_version: 1, key_version: 1, source_revision: 1 })
    await expectCode(() => adapter.activateSource({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'planner', binding_version: 1, source_ref: 'source_plan_01', source_version: 1, key_version: 1, challenge_digest: digest('9'), expected_challenge_revision: 1, certificate_digest: digest('7'), public_key_spki: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', public_key_digest: digest('6'), activated_at: '2026-08-27T00:00:31.000Z' }), 'enrollment_invalid')
    assert.deepEqual(await adapter.rotateSource({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'planner', binding_version: 1, source_ref: 'source_plan_01', source_version: 1, expected_source_revision: 1, expected_key_version: 1, new_key_version: 2, public_key_spki: 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', public_key_digest: digest('5'), rotated_at: '2026-08-27T00:00:40.000Z' }), { status: 'source_rotated', source_revision: 2, key_version: 2 })
    await expectCode(() => adapter.rotateSource({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'planner', binding_version: 1, source_ref: 'source_plan_01', source_version: 1, expected_source_revision: 1, expected_key_version: 1, new_key_version: 2, public_key_spki: 'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', public_key_digest: digest('4'), rotated_at: '2026-08-27T00:00:41.000Z' }), 'revision_conflict')
    assert.deepEqual(await adapter.revokeSource({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'planner', binding_version: 1, source_ref: 'source_plan_01', source_version: 1, expected_source_revision: 2, revoked_at: '2026-08-27T00:00:50.000Z' }), { status: 'source_revoked', source_revision: 3 })
    const states = (await db.query(`select key_version,state from outcome_private.bridge_source_keys where role='planner' order by key_version`)).rows
    assert.deepEqual(states, [{ key_version: 1, state: 'replaced' }, { key_version: 2, state: 'revoked' }])
  } finally { await db.close() }
})

test('failed transactions expose no opaque ID rows or revision while random identity has no contiguity claim', async () => {
  const db = await createDatabase()
  try {
    let generated = 0
    const forced = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db, /insert into outcome_private\.bridge_audit/), new_row_id: () => uuid7((++generated).toString(16)) })
    await expectCode(() => forced.appendEvent(eventInput()), 'storage_unavailable')
    assert.equal(generated, 2)
    for (const table of ['bridge_events', 'bridge_request_replay', 'bridge_audit']) assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.${table}`)).rows[0].count), 0)
    assert.equal(Number((await db.query(`select durable_revision::int from outcome_private.bridge_schema_versions where workspace_id='workspace-main'`)).rows[0].durable_revision), 0)
    const stale = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    await expectCode(() => stale.appendEvent(eventInput({ expected_ledger_revision: 1 })), 'revision_conflict')
    const substituted = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db), clone: (value) => ({ ...structuredClone(value), progress: 100 }) })
    await expectCode(() => substituted.appendEvent(eventInput()), 'materialization_failed')
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_events`)).rows[0].count), 0)
  } finally { await db.close() }
})

test('tombstone transaction purges raw scope, preserves safe audit and restore denies resurrection', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    await adapter.appendEvent(eventInput())
    const deletionReceipt = digest('2')
    assert.deepEqual(await adapter.tombstone({ ...MAIN_SCOPE, deletion_revision: 2, deletion_receipt_digest: deletionReceipt, purge_before: AT, tombstoned_at: EXPIRES, expected_durable_revision: 1 }), { status: 'tombstoned', durable_revision: 2 })
    for (const table of ['bridge_events', 'bridge_request_replay', 'bridge_source_keys', 'bridge_projections', 'bridge_sources']) assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.${table} where workspace_id='workspace-main' and project_id='project-outcome' and role='builder' and binding_version=1`)).rows[0].count), 0)
    const tombstones = (await db.query(`select workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,deletion_receipt_digest from outcome_private.bridge_tombstones where workspace_id='workspace-main'`)).rows
    assert.equal(tombstones.length, 1)
    const coverage = computeTombstoneCoverageDigest(tombstones)
    const manifestRef = uuid7('a')
    const restoreReceiptRef = uuid7('b')
    const missing = { restore_receipt_ref: restoreReceiptRef, manifest_ref: manifestRef, manifest_digest: digest('3'), ...MAIN_SCOPE, deletion_revision: 2, expected_schema_version: 1, expected_durable_revision: 2, restored_at: EXPIRES }
    await expectCode(() => adapter.verifyRestore(missing), 'restore_denied')
    const stored = await adapter.storeManifest({ manifest_ref: manifestRef, ...MAIN_SCOPE, deletion_revision: 2, manifest_schema_version: 1, bridge_schema_version: 1, durable_revision: 2, tombstone_count: 1, tombstone_coverage_digest: coverage, stored_at: EXPIRES })
    await expectCode(() => adapter.storeManifest({ manifest_ref: uuid7('f'), ...MAIN_SCOPE, deletion_revision: 2, manifest_schema_version: 1, bridge_schema_version: 1, durable_revision: 2, tombstone_count: 0, tombstone_coverage_digest: coverage, stored_at: EXPIRES }), 'input_invalid')
    await db.exec('begin; set local role outcome_bridge_backend')
    assert.equal(await denied(() => db.exec(`update outcome_private.bridge_backup_manifests set durable_revision=3 where manifest_ref='${manifestRef}'`)), true)
    await db.exec('rollback')
    const restore = { ...missing, manifest_digest: stored.manifest_digest }
    await expectCode(() => adapter.verifyRestore({ ...restore, manifest_digest: digest('4') }), 'restore_denied')
    await expectCode(() => adapter.verifyRestore({ ...restore, expected_durable_revision: 1 }), 'restore_denied')
    assert.equal(await denied(() => db.exec(`delete from outcome_private.bridge_tombstones where workspace_id='workspace-main'`)), true)
    const incomplete = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db, null, 'outcome_bridge_backend', /from outcome_private\.bridge_tombstones/) })
    await expectCode(() => incomplete.verifyRestore({ ...restore, restore_receipt_ref: uuid7('d') }), 'restore_denied')
    const inaccessible = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db, /bridge_backup_manifests/) })
    await expectCode(() => inaccessible.verifyRestore({ ...restore, restore_receipt_ref: uuid7('c') }), 'storage_unavailable')
    await db.exec(`insert into outcome_private.bridge_sources(workspace_id,project_id,role,binding_version,source_ref,source_version,active_key_version,certificate_digest,state,revision,created_at,updated_at) values ('workspace-main','project-outcome','builder',1,'source_main_01',1,1,'${digest('5')}','active',1,'${AT}','${AT}'); insert into outcome_private.bridge_source_keys(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,public_key_spki,public_key_digest,state,created_at) values ('workspace-main','project-outcome','builder',1,'source_main_01',1,1,'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR','${digest('6')}','active','${AT}')`)
    assert.deepEqual(await adapter.verifyRestore(restore), { status: 'restore_verified', durable_revision: 2, schema_version: 1, tombstone_count: 1, raw_resurrection_count: 0 })
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_sources where workspace_id='workspace-main' and role='builder'`)).rows[0].count), 0)
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_restore_receipts where workspace_id='workspace-main'`)).rows[0].count), 1)
  } finally { await db.close() }
})

test('adapter SQL is constant parameterized and serialized outputs contain zero prohibited authority', async () => {
  const calls = []
  const adapter = createObserverBridgePostgresAdapter({ with_transaction: async (context, operation) => {
    assert.deepEqual(context, { effective_role: OBSERVER_BRIDGE_EFFECTIVE_ROLE })
    return operation({ query: async (sql, params) => {
    calls.push({ sql, params })
    if (sql.startsWith('select schema_version')) return { rows: [{ schema_version: 1, durable_revision: 0 }] }
    if (sql.startsWith('select state')) return { rows: [{ state: 'active', active_key_version: 1 }] }
    if (sql.startsWith('select event_digest')) return { rows: [] }
    if (sql.startsWith('select sequence')) return { rows: [] }
    if (sql.startsWith('insert into outcome_private.bridge_projections')) return { rows: [{ ledger_revision: 1, accepted_count: 1 }] }
    if (sql.startsWith('update outcome_private.bridge_schema_versions')) return { rows: [{ durable_revision: 1 }] }
    return { rows: [], rowCount: 1 }
    } })
  } })
  const output = await adapter.appendEvent(eventInput())
  assert.equal(calls.every(({ sql, params }) => !sql.includes('workspace-main') && Array.isArray(params)), true)
  assert.doesNotMatch(JSON.stringify(output), /workspace|project|source|digest|signature|prompt|result|session|thread|turn|path|credential|progress|gate|approval|completion/i)
})

test('Option A uses one dedicated backend role and no mutable GUC authority', async () => {
  const migration = await readFile(migrationUrl, 'utf8')
  assert.doesNotMatch(migration, /current_setting\s*\(\s*'outcome\.bridge\./i)
  assert.match(migration, /create role outcome_bridge_backend nologin nobypassrls/i)
  assert.doesNotMatch(migration, /create role outcome_bridge_(?:ingest|operations)/i)
})

test('restore rejects caller assertion when no immutable manifest or tombstone exists', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    await expectCode(() => adapter.verifyRestore({ restore_receipt_ref: uuid7('d'), manifest_ref: uuid7('e'), manifest_digest: digest('7'), ...MAIN_SCOPE, deletion_revision: 1, expected_schema_version: 1, expected_durable_revision: 0, restored_at: AT }), 'restore_denied')
  } finally { await db.close() }
})

test('event and audit identity is opaque UUID and ordering belongs to revision and sequence', async () => {
  const migration = await readFile(migrationUrl, 'utf8')
  assert.match(migration, /event_id uuid[^,]*primary key/i)
  assert.match(migration, /audit_id uuid[^,]*primary key/i)
  assert.doesNotMatch(migration, /generated always as identity/i)
})

test('Postgres projection rejects future observations above the same finite skew boundary', async () => {
  const db = await createDatabase()
  try {
    assert.equal(OBSERVER_BRIDGE_POSTGRES_FUTURE_SKEW_MS, 5_000)
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db), now: () => Date.parse(AT), future_skew_ms: OBSERVER_BRIDGE_POSTGRES_FUTURE_SKEW_MS })
    assert.equal((await adapter.appendEvent(eventInput({ observed_at: new Date(Date.parse(AT) + 4_999).toISOString() }))).status, 'accepted')
    assert.equal((await adapter.appendEvent(eventInput({ request_digest: digest('2'), nonce_digest: digest('3'), event_digest: digest('4'), sequence: 2, expected_ledger_revision: 1, observed_at: new Date(Date.parse(AT) + 5_000).toISOString() }))).status, 'accepted')
    await expectCode(() => adapter.appendEvent(eventInput({ request_digest: digest('5'), nonce_digest: digest('6'), event_digest: digest('7'), sequence: 3, expected_ledger_revision: 2, observed_at: new Date(Date.parse(AT) + 5_001).toISOString() })), 'future_observation')
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_events where workspace_id='workspace-main'`)).rows[0].count), 2)
    assert.equal(Number((await db.query(`select ledger_revision::int from outcome_private.bridge_projections where workspace_id='workspace-main'`)).rows[0].ledger_revision), 2)
  } finally { await db.close() }
})

test('tombstone purges source and certificate residue instead of retaining deleted raw rows', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    await adapter.tombstone({ ...MAIN_SCOPE, deletion_revision: 1, deletion_receipt_digest: digest('8'), purge_before: AT, tombstoned_at: EXPIRES, expected_durable_revision: 0 })
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_sources where workspace_id='workspace-main' and project_id='project-outcome' and role='builder' and binding_version=1`)).rows[0].count), 0)
  } finally { await db.close() }
})

test('canonical six-state persistence vocabulary accepts exact contract and rejects replacements', async () => {
  const approved = ['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중']
  const rejected = ['기획 진행 중', '사용성·제품 검수 중', '출시 감사 중', '결정 대기 중']
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db), now: () => Date.parse(AT) })
    for (const [index, status_code] of approved.entries()) {
      assert.equal((await adapter.appendEvent(eventInput({ status_code, sequence: index + 1, expected_ledger_revision: index, request_digest: digest((index + 1).toString(16)), nonce_digest: digest((index + 7).toString(16)), event_digest: digest((index + 10).toString(16)) }))).status, 'accepted')
    }
    for (const status_code of rejected) await expectCode(() => adapter.appendEvent(eventInput({ status_code, sequence: 7, expected_ledger_revision: 6, request_digest: digest('d'), nonce_digest: digest('e'), event_digest: digest('f') })), 'input_invalid')
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_events where workspace_id='workspace-main'`)).rows[0].count), 6)
  } finally { await db.close() }
})

test('tombstone exact target locks a nonempty source and denies missing cross-scope without mutation', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    const base = { ...MAIN_SCOPE, deletion_revision: 1, deletion_receipt_digest: digest('8'), purge_before: AT, tombstoned_at: EXPIRES, expected_durable_revision: 0 }
    for (const change of [{ project_id: 'project-missing' }, { role: 'release_audit' }, { binding_version: 999 }, { source_ref: 'source_missing_01' }, { source_version: 2 }, { workspace_id: 'workspace-other' }]) await expectCode(() => adapter.tombstone({ ...base, ...change }), 'access_denied')
    const missingSource = { ...base }
    delete missingSource.source_ref
    await expectCode(() => adapter.tombstone(missingSource), 'input_invalid')
    const counts = {}
    for (const table of ['bridge_tombstones', 'bridge_audit', 'bridge_restore_receipts']) counts[table] = Number((await db.query(`select count(*)::int count from outcome_private.${table}`)).rows[0].count)
    counts.durable_revision = Number((await db.query(`select durable_revision::int from outcome_private.bridge_schema_versions where workspace_id='workspace-main'`)).rows[0].durable_revision)
    counts.unrelated_sources = Number((await db.query(`select count(*)::int count from outcome_private.bridge_sources`)).rows[0].count)
    assert.deepEqual(counts, { bridge_tombstones: 0, bridge_audit: 0, bridge_restore_receipts: 0, durable_revision: 0, unrelated_sources: 2 })
    assert.equal(await denied(() => db.exec(`insert into outcome_private.bridge_tombstones(workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,deletion_receipt_digest,purge_before,tombstoned_at,restore_redelete_required) values ('workspace-main','project-outcome','release_audit',999,'source_missing_01',1,1,'${digest('9')}','${AT}','${EXPIRES}',true)`)), true)
    assert.deepEqual(await adapter.tombstone(base), { status: 'tombstoned', durable_revision: 1 })
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_sources where workspace_id='workspace-other'`)).rows[0].count), 1)
    const exactRows = (await db.query(`select workspace_id,project_id,role,binding_version,source_ref,source_version from outcome_private.bridge_tombstones union all select workspace_id,project_id,role,binding_version,source_ref,source_version from outcome_private.bridge_audit where action_code='tombstone_written' order by workspace_id`)).rows
    assert.equal(exactRows.length, 2)
    assert.equal(exactRows.every((row) => row.workspace_id === MAIN_SCOPE.workspace_id && row.project_id === MAIN_SCOPE.project_id && row.role === MAIN_SCOPE.role && Number(row.binding_version) === MAIN_SCOPE.binding_version && row.source_ref === MAIN_SCOPE.source_ref && Number(row.source_version) === MAIN_SCOPE.source_version), true)
  } finally { await db.close() }
})

test('restore exact scope rejects a caller scope unrelated to manifest coverage', async () => {
  const db = await createDatabase()
  try {
    const adapter = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db) })
    await adapter.tombstone({ ...MAIN_SCOPE, deletion_revision: 1, deletion_receipt_digest: digest('8'), purge_before: AT, tombstoned_at: EXPIRES, expected_durable_revision: 0 })
    const tombstones = (await db.query(`select workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision,deletion_receipt_digest from outcome_private.bridge_tombstones where workspace_id='workspace-main'`)).rows
    const manifestRef = uuid7('d')
    const stored = await adapter.storeManifest({ manifest_ref: manifestRef, ...MAIN_SCOPE, deletion_revision: 1, manifest_schema_version: 1, bridge_schema_version: 1, durable_revision: 1, tombstone_count: 1, tombstone_coverage_digest: computeTombstoneCoverageDigest(tombstones), stored_at: EXPIRES })
    const restore = { restore_receipt_ref: uuid7('e'), manifest_ref: manifestRef, manifest_digest: stored.manifest_digest, ...MAIN_SCOPE, deletion_revision: 1, expected_schema_version: 1, expected_durable_revision: 1, restored_at: EXPIRES }
    for (const change of [{ project_id: 'project-missing' }, { role: 'ux_product_qa' }, { binding_version: 777 }, { source_ref: 'source_missing_01' }, { source_version: 2 }, { deletion_revision: 2 }]) await expectCode(() => adapter.verifyRestore({ ...restore, ...change, restore_receipt_ref: uuid7('f') }), 'restore_denied')
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_restore_receipts`)).rows[0].count), 0)
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_audit where action_code='restore_verified'`)).rows[0].count), 0)
    assert.deepEqual(await adapter.verifyRestore(restore), { status: 'restore_verified', durable_revision: 1, schema_version: 1, tombstone_count: 1, raw_resurrection_count: 0 })
    const receipt = (await db.query(`select workspace_id,project_id,role,binding_version,source_ref,source_version,deletion_revision from outcome_private.bridge_restore_receipts`)).rows[0]
    assert.deepEqual({ ...receipt, binding_version: Number(receipt.binding_version), source_version: Number(receipt.source_version), deletion_revision: Number(receipt.deletion_revision) }, { ...MAIN_SCOPE, deletion_revision: 1 })
  } finally { await db.close() }
})
