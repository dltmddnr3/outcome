import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { createOutcomeChatPostgresRepository } from './outcome-chat-postgres.mjs'

test('exact migration chain enforces chat role, RLS and public access boundaries', async () => {
  const db = await PGlite.create('memory://')
  try {
    await db.exec(`create role anon nologin; create role authenticated nologin;
      create schema auth; create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      grant usage on schema auth to authenticated; grant execute on function auth.jwt() to authenticated;`)
    for (const name of ['202608250001_account_access_foundation.sql','20260827000756_observer_bridge.sql','20260901082821_observer_bridge_durable_v2.sql','20260903030000_outcome_chat_durable_relay.sql','20260907152652_outcome_chat_planner_responses.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'))
    }
    const tables = (await db.query(`select relname, relrowsecurity, relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='outcome_private' and relname in ('chat_streams','chat_messages','chat_planner_responses') order by relname`)).rows
    assert.equal(tables.length, 3)
    assert.ok(tables.every(row => row.relrowsecurity && row.relforcerowsecurity))
    for (const role of ['anon','authenticated','outcome_chat_runtime','outcome_bridge_backend']) {
      const privileges = (await db.query(`select has_table_privilege($1,'outcome_private.chat_messages','SELECT') as read, has_table_privilege($1,'outcome_private.chat_messages','INSERT') as write`, [role])).rows[0]
      assert.deepEqual(privileges, { read:false, write:false })
      assert.deepEqual((await db.query(`select has_table_privilege($1,'outcome_private.chat_planner_responses','SELECT') as read, has_table_privilege($1,'outcome_private.chat_planner_responses','INSERT') as write`, [role])).rows[0], { read:false, write:false })
    }
    await db.exec('set role outcome_chat_backend')
    assert.deepEqual((await db.query('select * from outcome_private.chat_messages')).rows, [])
    await db.exec('reset role')
    const membership = (await db.query(`select admin_option,inherit_option,set_option from pg_auth_members m join pg_roles r on r.oid=m.member where r.rolname='outcome_chat_runtime'`)).rows
    assert.deepEqual(membership, [{ admin_option:false, inherit_option:false, set_option:true }])
    await db.exec(`insert into outcome_private.workspaces(id,state) values('workspace-one','active');
      insert into outcome_private.projects(id,package_id,state) values('outcome','package-one','active');
      insert into outcome_private.project_bindings(workspace_id,project_id,state) values('workspace-one','outcome','active');`)
    const repository = createOutcomeChatPostgresRepository({ transact: operation => db.transaction(async tx => {
      await tx.exec('set local role outcome_chat_backend')
      return operation({ query:(sql,params) => tx.query(sql,params) })
    }) })
    const input = { workspace_id:'workspace-one', project_id:'outcome', binding_version:3,
      idempotency_key:'message-0000000000000001', request_fingerprint:'a'.repeat(64), message:'owner question', observed_at:'2026-09-08T00:00:00.000Z' }
    const question = await repository.reserve(input)
    const pendingScope={workspace_id:input.workspace_id,project_id:input.project_id,binding_version:3}
    assert.deepEqual(await repository.pendingPlannerResponses(pendingScope),[])
    await db.query(`update outcome_private.chat_messages set dispatch_state='invoked', dispatch_intent_at=$2, transport_invoked=true,transport_invoked_at=$2 where message_id=$1`, [question.event_id,input.observed_at])
    assert.deepEqual(await repository.pendingPlannerResponses(pendingScope),[{correlation_id:input.idempotency_key,message:input.message}])
    assert.deepEqual(await repository.pendingPlannerResponses({...pendingScope,workspace_id:'workspace-other'}),[])
    const answer = await repository.appendPlannerResponse({ workspace_id:input.workspace_id, project_id:input.project_id, binding_version:3, correlation_id:input.idempotency_key, source_digest:'b'.repeat(64),message:'stored answer',observed_at:'2026-09-08T00:00:01.000Z' })
    assert.equal(answer.sequence, 2)
    assert.deepEqual(await repository.pendingPlannerResponses(pendingScope),[])
    assert.equal((await repository.timeline({ workspace_id:input.workspace_id,project_id:input.project_id,binding_version:3,after_sequence:0 }))[1].payload.private_content.text, 'stored answer')
    await db.exec('set role outcome_chat_backend')
    await assert.rejects(db.query('update outcome_private.chat_planner_responses set private_message=$1', ['tampered']), /permission denied/)
    await db.exec('reset role')
    await db.query('delete from outcome_private.chat_messages where message_id=$1', [question.event_id])
    assert.equal((await db.query('select count(*)::int count from outcome_private.chat_planner_responses')).rows[0].count, 0)
  } finally { await db.close() }
})

// Repository SQL integration only; this fixture does not certify hosted migration or roles.
test('PostgreSQL reserve survives service reload, deduplicates and isolates workspaces', async () => {
  const db = await PGlite.create('memory://')
  try {
    await db.exec(`create schema outcome_private;
      create table outcome_private.chat_streams (
        workspace_id text, project_id text, role text, binding_version bigint,
        created_at timestamptz, next_sequence bigint not null default 1,
        primary key(workspace_id,project_id,binding_version));
      create table outcome_private.chat_messages (
        message_id text primary key, workspace_id text, project_id text, role text,
        binding_version bigint, sequence bigint, idempotency_key text, request_fingerprint text,
        private_message text, observed_at timestamptz, transport_invoked boolean default false,
        dispatch_state text default 'not_invoked', delivery text default 'delivery_unknown',
        unique(workspace_id,project_id,binding_version,idempotency_key));
      create table outcome_private.chat_planner_responses (
        event_id text primary key, workspace_id text, project_id text, binding_version bigint,
        sequence bigint, source_digest text, content_digest text, correlation_id text,
        private_message text, observed_at timestamptz,
        unique(workspace_id,project_id,binding_version,source_digest));`)
    const transact = operation => db.transaction(tx => operation({ query: (sql, values) => tx.query(sql, values) }))
    const repository = () => createOutcomeChatPostgresRepository({ transact })
    const input = { workspace_id:'workspace-one', project_id:'outcome', binding_version:3,
      idempotency_key:'message-0000000000000001', request_fingerprint:'a'.repeat(64),
      message:'durable message', observed_at:'2026-09-08T00:00:00.000Z' }
    const first = await repository().reserve(input)
    assert.equal(first.sequence, 1)
    assert.deepEqual(await repository().reserve(input), first)
    await assert.rejects(repository().reserve({ ...input, request_fingerprint:'b'.repeat(64) }), /idempotency_conflict/)
    const scope = { workspace_id:input.workspace_id, project_id:input.project_id, binding_version:3, after_sequence:0 }
    const timeline = await repository().timeline(scope)
    assert.equal(timeline.length, 1)
    assert.equal(timeline[0].payload.private_content.text, input.message)
    assert.equal(timeline[0].delivery, 'delivery_unknown')
    assert.deepEqual(await repository().timeline({ ...scope, workspace_id:'workspace-two' }), [])
    assert.equal((await repository().reserve({ ...input, workspace_id:'workspace-two' })).sequence, 1)
    assert.equal((await repository().reserve({ ...input, idempotency_key:'message-0000000000000002' })).sequence, 2)
    const response = { workspace_id:input.workspace_id, project_id:input.project_id, binding_version:3,
      correlation_id:input.idempotency_key, source_digest:'c'.repeat(64), message:'Planner answer', observed_at:'2026-09-08T00:00:01.000Z' }
    await assert.rejects(repository().appendPlannerResponse(response), /chat_unavailable/)
    await db.query('update outcome_private.chat_messages set transport_invoked=true where message_id=$1', [first.event_id])
    const answer = await repository().appendPlannerResponse(response)
    assert.equal(answer.sequence, 3)
    assert.deepEqual(await repository().appendPlannerResponse(response), answer)
    assert.deepEqual(await repository().appendPlannerResponse({...response,observed_at:'2026-09-08T00:00:05.000Z'}),answer)
    await assert.rejects(repository().appendPlannerResponse({ ...response, message:'different answer' }), /idempotency_conflict/)
    await assert.rejects(repository().appendPlannerResponse({ ...response, source_digest:'d'.repeat(64), workspace_id:'workspace-two' }), /chat_unavailable/)
    await assert.rejects(repository().appendPlannerResponse({ ...response, source_digest:'d'.repeat(64), message:'token=secret-value' }), /invalid_response/)
    const reloaded = await repository().timeline(scope)
    assert.deepEqual(reloaded.map(event => event.sequence), [1,2,3])
    assert.equal(reloaded[2].kind, 'assistant_message')
    assert.equal(reloaded[2].payload.private_content.text, 'Planner answer')
    assert.equal(reloaded[2].correlation_id, input.idempotency_key)
    assert.equal(Object.hasOwn(reloaded[2], 'delivery'), false)
    assert.deepEqual(await repository().timeline({ ...scope, after_sequence:2 }), [reloaded[2]])
  } finally { await db.close() }
})
