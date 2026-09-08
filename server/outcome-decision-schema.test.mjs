import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

test('additive PostgreSQL migration executes with forced RLS and append-only backend grants', async () => {
  const db = await PGlite.create('memory://')
  try {
    await db.exec('create role anon nologin; create role authenticated nologin; create schema auth; create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting(\'request.jwt.claims\', true), \'\'), \'{}\')::jsonb $$; grant usage on schema auth to authenticated; grant execute on function auth.jwt() to authenticated;')
    await db.exec(await readFile(new URL('../supabase/migrations/202608250001_account_access_foundation.sql', import.meta.url), 'utf8'))
    await db.exec(await readFile(new URL('../supabase/migrations/202609040001_decision_records.sql', import.meta.url), 'utf8'))
    const tables = (await db.query("select relname, relrowsecurity, relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='outcome_private' and relname like 'decision_%' and relkind='r' order by relname")).rows
    assert.deepEqual(tables.map((row) => row.relname), ['decision_audit', 'decision_records', 'decision_request_replay', 'decision_tombstones'])
    assert.equal(tables.every((row) => row.relrowsecurity && row.relforcerowsecurity), true)
    const grants = (await db.query("select table_name, privilege_type from information_schema.role_table_grants where grantee='outcome_decision_backend' and table_name like 'decision_%' order by table_name, privilege_type")).rows
    assert.equal(grants.some((row) => ['UPDATE', 'DELETE', 'TRUNCATE'].includes(row.privilege_type)), false)
    assert.equal(grants.filter((row) => row.privilege_type === 'INSERT').length, 4)
    await db.exec(`
      insert into outcome_private.workspaces(id,state) values ('workspace-one','active');
      insert into outcome_private.projects(id,package_id,state) values ('outcome','outcome','active'),('other','other','active');
      insert into outcome_private.project_bindings(workspace_id,project_id,state) values ('workspace-one','outcome','active'),('workspace-one','other','active');
      insert into outcome_private.decision_records(decision_id,workspace_id,project_id,event_id,event_sequence,source_revision,decision,rejection_reason,actor_subject,actor_class,revision,request_digest,nonce_digest,decided_at)
        values ('00000000-0000-4000-8000-000000000001','workspace-one','outcome','event-builder-one',1,repeat('a',64),'approved',null,'owner','owner',1,repeat('1',64),repeat('2',64),now());
      insert into outcome_private.decision_records(decision_id,workspace_id,project_id,event_id,event_sequence,source_revision,decision,rejection_reason,actor_subject,actor_class,revision,supersedes_id,supersedes_revision,request_digest,nonce_digest,decided_at)
        values ('00000000-0000-4000-8000-000000000002','workspace-one','outcome','event-builder-two',2,repeat('b',64),'rejected','evidence_insufficient','owner','owner',2,'00000000-0000-4000-8000-000000000001',1,repeat('3',64),repeat('4',64),now());
      insert into outcome_private.decision_tombstones(tombstone_id,workspace_id,project_id,decision_id,decision_revision,reason_code,receipt_digest,tombstoned_at)
        values ('00000000-0000-4000-8000-000000000003','workspace-one','outcome','00000000-0000-4000-8000-000000000002',2,'superseded',repeat('5',64),now());
    `)
    const rejected = async (sql) => { try { await db.exec(sql); return false } catch { return true } }
    assert.equal(await rejected("update outcome_private.decision_records set decision='rejected', rejection_reason='evidence_insufficient' where revision=1"), true)
    assert.equal(await rejected("delete from outcome_private.decision_tombstones"), true)
    assert.equal(await rejected("insert into outcome_private.decision_records(decision_id,workspace_id,project_id,event_id,event_sequence,source_revision,decision,rejection_reason,actor_subject,actor_class,revision,supersedes_id,supersedes_revision,request_digest,nonce_digest,decided_at) values ('00000000-0000-4000-8000-000000000004','workspace-one','other','event-builder-three',3,repeat('c',64),'approved',null,'owner','owner',3,'00000000-0000-4000-8000-000000000002',2,repeat('6',64),repeat('7',64),now())"), true)
    assert.equal(await rejected("insert into outcome_private.decision_records(decision_id,workspace_id,project_id,event_id,event_sequence,source_revision,decision,rejection_reason,actor_subject,actor_class,revision,supersedes_id,supersedes_revision,request_digest,nonce_digest,decided_at) values ('00000000-0000-4000-8000-000000000005','workspace-one','outcome','event-builder-four',4,repeat('d',64),'approved',null,'owner','owner',3,'00000000-0000-4000-8000-000000000001',1,repeat('8',64),repeat('9',64),now())"), true)
  } finally { await db.close() }
})
