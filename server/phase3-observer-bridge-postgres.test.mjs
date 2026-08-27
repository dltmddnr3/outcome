import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { createObserverBridgePostgresAdapter, ObserverBridgePostgresError } from './phase3-observer-bridge-postgres.mjs'

const foundationUrl = new URL('../supabase/migrations/202608250001_account_access_foundation.sql', import.meta.url)
const migrationUrl = new URL('../supabase/migrations/20260827000756_observer_bridge.sql', import.meta.url)
const AT = '2026-08-27T00:00:00.000Z'
const EXPIRES = '2026-08-27T00:01:00.000Z'
const digest = (character) => character.repeat(64)
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

function transactionPort(db, failPattern = null) {
  return async (operation) => {
    await db.exec('begin')
    try {
      const result = await operation({ query: async (sql, params) => {
        if (failPattern?.test(sql)) throw new Error('forced storage failure')
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
    assert.equal(flags.length, 9)
    assert.equal(flags.every((row) => row.relrowsecurity && row.relforcerowsecurity), true)
    const grants = (await db.query(`select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='outcome_private' and table_name like 'bridge_%' order by grantee,table_name,privilege_type`)).rows
    assert.equal(grants.some((row) => row.grantee === 'anon'), false)
    assert.deepEqual(grants.filter((row) => row.grantee === 'authenticated').map((row) => `${row.table_name}:${row.privilege_type}`), ['bridge_projections:SELECT'])
    assert.equal(grants.some((row) => row.grantee === 'outcome_bridge_ingest' && row.table_name === 'bridge_events' && ['UPDATE', 'DELETE'].includes(row.privilege_type)), false)
    assert.equal(grants.some((row) => row.grantee === 'outcome_bridge_operations' && row.table_name === 'bridge_audit' && row.privilege_type === 'DELETE'), false)
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

test('nologin nobypassrls ingest role is scope-bound and append-only', async () => {
  const db = await createDatabase()
  try {
    const role = (await db.query(`select rolcanlogin,rolbypassrls from pg_roles where rolname='outcome_bridge_ingest'`)).rows[0]
    assert.deepEqual(role, { rolcanlogin: false, rolbypassrls: false })
    await db.exec(`select set_config('outcome.bridge.workspace_id','workspace-main',false); select set_config('outcome.bridge.project_id','project-outcome',false); set role outcome_bridge_ingest;`)
    assert.equal((await db.query('select workspace_id from outcome_private.bridge_sources')).rows.length, 1)
    await db.exec(`insert into outcome_private.bridge_events(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values ('workspace-main','project-outcome','builder',1,'source_main_01',1,1,1,1,'구현 진행 중','${AT}','${EXPIRES}','${digest('0')}','ed25519_verified','${AT}')`)
    assert.equal((await db.query('select count(*)::int count from outcome_private.bridge_events')).rows[0].count, 1)
    assert.equal(await denied(() => db.exec(`insert into outcome_private.bridge_events(workspace_id,project_id,role,binding_version,source_ref,source_version,key_version,sequence,ledger_revision,status_code,observed_at,expires_at,event_digest,signature_class,created_at) values ('workspace-other','project-outcome','builder',1,'source_other_01',1,1,1,1,'구현 진행 중','${AT}','${EXPIRES}','${digest('2')}','ed25519_verified','${AT}')`)), true)
    assert.equal(await denied(() => db.exec(`update outcome_private.bridge_events set status_code='테스트 실행 중'`)), true)
    assert.equal(await denied(() => db.exec(`delete from outcome_private.bridge_events`)), true)
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
    const counts = {}
    for (const table of ['bridge_events', 'bridge_request_replay', 'bridge_audit']) counts[table] = Number((await db.query(`select count(*)::int count from outcome_private.${table}`)).rows[0].count)
    assert.deepEqual(counts, { bridge_events: 2, bridge_request_replay: 2, bridge_audit: 2 })
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

test('forced partial failure, stale CAS and clone substitution roll back without ID or revision consumption', async () => {
  const db = await createDatabase()
  try {
    const forced = createObserverBridgePostgresAdapter({ with_transaction: transactionPort(db, /insert into outcome_private\.bridge_audit/) })
    await expectCode(() => forced.appendEvent(eventInput()), 'storage_unavailable')
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
    assert.deepEqual(await adapter.tombstone({ workspace_id: 'workspace-main', project_id: 'project-outcome', role: 'builder', binding_version: 1, deletion_revision: 2, purge_before: AT, tombstoned_at: EXPIRES, expected_durable_revision: 1 }), { status: 'tombstoned', durable_revision: 2 })
    for (const table of ['bridge_events', 'bridge_request_replay', 'bridge_source_keys', 'bridge_projections']) assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.${table} where workspace_id='workspace-main'`)).rows[0].count), 0)
    assert.equal(Number((await db.query(`select count(*)::int count from outcome_private.bridge_tombstones where workspace_id='workspace-main'`)).rows[0].count), 1)
    await expectCode(() => adapter.verifyRestore({ workspace_id: 'workspace-main', expected_schema_version: 1, expected_durable_revision: 2, backup_schema_version: 1, backup_durable_revision: 2, tombstones_applied: false }), 'restore_denied')
    assert.deepEqual(await adapter.verifyRestore({ workspace_id: 'workspace-main', expected_schema_version: 1, expected_durable_revision: 2, backup_schema_version: 1, backup_durable_revision: 2, tombstones_applied: true }), { status: 'restore_verified', durable_revision: 2, schema_version: 1 })
  } finally { await db.close() }
})

test('adapter SQL is constant parameterized and serialized outputs contain zero prohibited authority', async () => {
  const calls = []
  const adapter = createObserverBridgePostgresAdapter({ with_transaction: async (operation) => operation({ query: async (sql, params) => {
    calls.push({ sql, params })
    if (sql.startsWith('select schema_version')) return { rows: [{ schema_version: 1, durable_revision: 0 }] }
    if (sql.startsWith('select state')) return { rows: [{ state: 'active', active_key_version: 1 }] }
    if (sql.startsWith('select event_digest')) return { rows: [] }
    if (sql.startsWith('select sequence')) return { rows: [] }
    if (sql.startsWith('insert into outcome_private.bridge_projections')) return { rows: [{ ledger_revision: 1, accepted_count: 1 }] }
    if (sql.startsWith('update outcome_private.bridge_schema_versions')) return { rows: [{ durable_revision: 1 }] }
    return { rows: [], rowCount: 1 }
  } }) })
  const output = await adapter.appendEvent(eventInput())
  assert.equal(calls.every(({ sql, params }) => !sql.includes('workspace-main') && Array.isArray(params)), true)
  assert.doesNotMatch(JSON.stringify(output), /workspace|project|source|digest|signature|prompt|result|session|thread|turn|path|credential|progress|gate|approval|completion/i)
})
