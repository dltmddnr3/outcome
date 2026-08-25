import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const migrationUrl = new URL('../supabase/migrations/202608250001_account_access_foundation.sql', import.meta.url)
const count = async (db, table) => Number((await db.query(`select count(*)::int as count from outcome_private.${table}`)).rows[0].count)
const denied = async (operation) => {
  try { await operation(); return false } catch (error) { return /permission denied|row-level security|duplicate key/i.test(String(error.message)) }
}

test('exact migration enforces PostgreSQL roles and RLS across two synthetic workspaces', async () => {
  const db = await PGlite.create('memory://')
  try {
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
    await db.exec(await readFile(migrationUrl, 'utf8'))
    const policyFlags = (await db.query(`
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where nspname = 'outcome_private' and relkind = 'r'
      order by relname
    `)).rows
    assert.equal(policyFlags.length, 8)
    assert.equal(policyFlags.every((row) => row.relrowsecurity && row.relforcerowsecurity), true)

    await db.exec(`
      insert into outcome_private.workspaces(id,state) values ('workspace-owner','active'),('workspace-other','active');
      insert into outcome_private.workspace_memberships(workspace_id,identity_subject,role,state) values
        ('workspace-owner','subject-owner','owner-viewer','active'),
        ('workspace-other','subject-other','owner-viewer','active');
      insert into outcome_private.projects(id,package_id,state) values
        ('project-owner','outcome','active'),('project-other','other','active');
      insert into outcome_private.project_bindings(workspace_id,project_id,state) values
        ('workspace-owner','project-owner','active'),('workspace-other','project-other','active');
      insert into outcome_private.package_snapshots(workspace_id,project_id,schema_version,source_digest,observed_at,captured_at,projection,validation_state) values
        ('workspace-owner','project-owner',1,repeat('a',64),now(),now(),'{}','valid'),
        ('workspace-other','project-other',1,repeat('b',64),now(),now(),'{}','valid');
      insert into outcome_private.deployment_receipts(snapshot_id,git_commit,git_tree,built_asset,deployment_id,deployed_at)
        select id,'commit','tree','asset','deployment-' || id,now() from outcome_private.package_snapshots;
    `)
    assert.equal(await denied(() => db.exec(`insert into outcome_private.workspace_memberships(workspace_id,identity_subject,role,state) values ('workspace-other','subject-owner','owner-viewer','active')`)), true)

    await db.exec(`set role authenticated; set request.jwt.claims='{"sub":"subject-owner"}';`)
    for (const table of ['workspaces', 'workspace_memberships', 'projects', 'project_bindings', 'package_snapshots', 'deployment_receipts']) assert.equal(await count(db, table), 1, table)
    assert.equal(await denied(() => db.exec(`insert into outcome_private.workspaces(id,state) values ('forged','active')`)), true)

    await db.exec(`set request.jwt.claims='{"sub":"subject-unknown"}';`)
    for (const table of ['workspaces', 'workspace_memberships', 'projects', 'project_bindings', 'package_snapshots', 'deployment_receipts']) assert.equal(await count(db, table), 0, table)

    await db.exec(`reset role; update outcome_private.workspace_memberships set state='revoked' where identity_subject='subject-owner'; set role authenticated; set request.jwt.claims='{"sub":"subject-owner"}';`)
    for (const table of ['workspaces', 'workspace_memberships', 'projects', 'project_bindings', 'package_snapshots', 'deployment_receipts']) assert.equal(await count(db, table), 0, `revoked ${table}`)

    await db.exec('reset role; set role anon;')
    assert.equal(await denied(() => db.query('select * from outcome_private.workspaces')), true)
  } finally { await db.close() }
})
