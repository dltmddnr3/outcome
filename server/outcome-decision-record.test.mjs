import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { createDecisionRecordService, createInMemoryDecisionRecordStore } from './outcome-decision-record.mjs'

const target = Object.freeze({ projectId: 'outcome', state: 'blocked', eventId: 'event-builder-blocked', sequence: 7, role: 'builder', status: 'safe_hold', sourceRevision: 'a'.repeat(64) })
const input = Object.freeze({ actorSubject: 'owner', workspaceId: 'workspace', decision: 'rejected', rejectionReason: 'evidence_insufficient', nonce: 'nonce-value-that-is-long-enough-123', sourcePrecondition: 'workspace-revision-a', currentSourcePrecondition: 'workspace-revision-a', target })
const DRAFT5_PINS = Object.freeze({ composite: '1448c91c7684e88bb9e119d61dc4d9c5ecf09cb5a6892460ddb68980f0c0814e', manifest: '469a67bb48fd5c344d765e95cd3fca1cb8ac4192b49fe72a31609a52f14a5a4a', canvas: 'aa2f97168940481948d9469154c1a1cf036ad7b0a7778545901adbb8f9529688', qaBodySeal: '3f96552234d3e529f2eefe9604ac81a58e32b84ac8a4a2b55faaa0d72bd92cf1' })

test('implementation evidence uses only the approved full Draft 5 pins', () => {
  assert.deepEqual(Object.keys(DRAFT5_PINS), ['composite', 'manifest', 'canvas', 'qaBodySeal'])
  assert.equal(Object.values(DRAFT5_PINS).every((value) => /^[a-f0-9]{64}$/.test(value)), true)
})

test('records one append-only owner decision with only the closed public receipt', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store, now: () => Date.parse('2026-09-04T03:00:00.000Z') })
  const response = await service.record(input)
  assert.equal(response.status, 201)
  assert.match(response.body.decisionId, /^[0-9a-f-]{36}$/)
  assert.deepEqual(response.body, { decisionState: 'recorded', decisionId: response.body.decisionId, decision: 'rejected', rejectionReason: 'evidence_insufficient', decidedAt: '2026-09-04T03:00:00.000Z', decisionActorClass: 'owner', notice: '기록됨 · 전달은 이 범위 밖', supersedesId: null, completionAuthority: false })
  assert.doesNotMatch(JSON.stringify(response.body), /subject|workspace|project|eventId|sourceRevision|digest|nonce/i)
  assert.equal(store.snapshot().decisions.length, 1)
  assert.equal(store.snapshot().audits.at(-1).outcome, 'accepted')
})

test('returns the byte-equivalent original response for an exact replay and audits the duplicate', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store, now: () => Date.parse('2026-09-04T03:00:00.000Z') })
  const first = await service.record(input)
  const replay = await service.record(input)
  assert.deepEqual(replay, first)
  assert.deepEqual(store.snapshot().audits.map((row) => row.outcome), ['accepted', 'duplicate'])
  assert.equal(store.snapshot().decisions.length, 1)
})

test('serializes concurrent exact submissions to one decision and one duplicate audit', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store, now: () => Date.parse('2026-09-04T03:00:00.000Z') })
  const [left, right] = await Promise.all([service.record(input), service.record(input)])
  assert.deepEqual(left, right)
  assert.equal(store.snapshot().decisions.length, 1)
  assert.deepEqual(store.snapshot().audits.map((row) => row.outcome).sort(), ['accepted', 'duplicate'])
})

test('rejects nonce reuse, stale source, ineligible targets, and invalid rejection reasons', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store })
  await service.record(input)
  assert.deepEqual(await service.record({ ...input, decision: 'approved', rejectionReason: null }), { status: 409, body: { error: 'replay_detected' } })
  assert.deepEqual(await service.record({ ...input, nonce: 'different-nonce-that-is-long-enough-123', sourcePrecondition: 'stale' }), { status: 409, body: { error: 'stale_source_revision' } })
  assert.deepEqual(await service.record({ ...input, nonce: 'different-nonce-that-is-long-enough-456', target: { ...target, role: 'release_audit' } }), { status: 409, body: { error: 'decision_target_ineligible' } })
  assert.deepEqual(await service.record({ ...input, nonce: 'different-nonce-that-is-long-enough-789', rejectionReason: 'free text' }), { status: 400, body: { error: 'invalid_rejection_reason' } })
})

test('prevents a second decision for the same immutable event and lists only safe public records', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store, now: () => Date.parse('2026-09-04T03:00:00.000Z') })
  const first = await service.record(input)
  const second = await service.record({ ...input, nonce: 'different-nonce-that-is-long-enough-123', decision: 'approved', rejectionReason: null })
  assert.deepEqual(second, { status: 409, body: { error: 'decision_already_recorded', completionAuthority: false } })
  assert.deepEqual(await service.list({ actorSubject: 'owner', workspaceId: 'workspace' }), { status: 200, body: { decisions: [first.body], completionAuthority: false } })
})

test('records one append-only correction and one append-only withdrawal with closed relation checks', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store, now: () => Date.parse('2026-09-04T03:00:00.000Z') })
  const first = await service.record(input)
  const correction = await service.record({ ...input, target: { ...target, eventId: 'event-builder-corrected', sequence: 8 }, nonce: 'correction-nonce-that-is-long-enough-123', decision: 'approved', rejectionReason: null, supersedesId: first.body.decisionId })
  assert.equal(correction.status, 201)
  assert.equal(correction.body.supersedesId, first.body.decisionId)
  assert.equal(store.snapshot().decisions[1].revision > store.snapshot().decisions[0].revision, true)
  assert.deepEqual(await service.withdraw({ actorSubject: 'owner', workspaceId: 'workspace', projectId: 'outcome', decisionId: correction.body.decisionId, nonce: 'withdrawal-nonce-that-is-long-enough-123', sourcePrecondition: 'workspace-revision-a', currentSourcePrecondition: 'workspace-revision-a' }), { status: 201, body: { decisionState: 'withdrawn', decisionId: correction.body.decisionId, completionAuthority: false } })
  assert.equal(store.snapshot().decisions.length, 2)
  assert.equal(store.snapshot().tombstones.length, 1)
})

test('rejects missing cross-project self fork and repeated correction or withdrawal relations', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store })
  const first = await service.record(input)
  const correction = { ...input, target: { ...target, eventId: 'event-builder-corrected', sequence: 8 }, nonce: 'correction-nonce-that-is-long-enough-123', supersedesId: first.body.decisionId }
  assert.equal((await service.record(correction)).status, 201)
  assert.deepEqual(await service.record({ ...correction, target: { ...target, eventId: 'event-builder-fork', sequence: 9 }, nonce: 'fork-nonce-that-is-long-enough-123' }), { status: 409, body: { error: 'decision_already_recorded' } })
  assert.deepEqual(await service.record({ ...correction, target: { ...target, projectId: 'other', eventId: 'event-builder-other', sequence: 9 }, nonce: 'cross-project-nonce-long-enough-123' }), { status: 409, body: { error: 'decision_relation_invalid' } })
  assert.deepEqual(await service.record({ ...correction, target: { ...target, eventId: 'event-builder-missing', sequence: 10 }, nonce: 'missing-relation-nonce-long-enough-123', supersedesId: '00000000-0000-4000-8000-000000000099' }), { status: 409, body: { error: 'decision_relation_invalid' } })
  const withdrawal = { actorSubject: 'owner', workspaceId: 'workspace', projectId: 'outcome', decisionId: first.body.decisionId, nonce: 'withdrawal-nonce-that-is-long-enough-123', sourcePrecondition: 'workspace-revision-a', currentSourcePrecondition: 'workspace-revision-a' }
  assert.equal((await service.withdraw(withdrawal)).status, 201)
  assert.deepEqual(await service.withdraw({ ...withdrawal, nonce: 'second-withdrawal-nonce-long-123' }), { status: 409, body: { error: 'decision_already_recorded' } })
})

test('fails closed when durable transaction support is absent or unavailable', async () => {
  await assert.rejects(() => createDecisionRecordService({ store: {} }).record(input), /decision_store_unavailable/)
  const service = createDecisionRecordService({ store: { transaction: async () => { throw new Error('db down') } } })
  await assert.rejects(() => service.record(input), /decision_store_unavailable/)
})

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
