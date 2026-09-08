import assert from 'node:assert/strict'
import test from 'node:test'
import { createDecisionRecordService, createInMemoryDecisionRecordStore } from './outcome-decision-record.mjs'

const request = () => ({ actorSubject: 'owner-a', workspaceId: 'workspace-a', decision: 'approved', rejectionReason: null, nonce: 'nonce-value-that-is-long-enough-123', sourcePrecondition: 'revision', currentSourcePrecondition: 'revision', target: { projectId: 'outcome', state: 'blocked', eventId: 'event-blocked', sequence: 7, role: 'planner', status: 'safe_hold', sourceRevision: 'a'.repeat(64) } })

test('same-scope concurrent replay preserves exactly one immutable receipt', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store })
  const responses = await Promise.all([service.record(request()), service.record(request())])
  assert.equal(responses[0].status, 201)
  assert.deepEqual(responses[1], responses[0])
  assert.equal(store.snapshot().decisions.length, 1)
  assert.equal(responses[0].body.completionAuthority, false)
})

for (const scope of ['actor', 'workspace', 'both']) test(`replay identity isolates ${scope}`, async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store })
  const first = await service.record(request())
  const other = request()
  if (scope !== 'workspace') other.actorSubject = 'owner-b'
  if (scope !== 'actor') other.workspaceId = 'workspace-b'
  const response = await service.record(other)
  assert.notEqual(response.body.decisionId, first.body.decisionId)
  assert.equal(response.status, scope === 'actor' ? 409 : 201)
})

test('changed exact target cannot replay the original nonce', async () => {
  for (const delta of [{ sourceRevision: 'b'.repeat(64) }, { role: 'builder' }, { status: 'failed' }, { state: 'ready' }]) {
    const service = createDecisionRecordService({ store: createInMemoryDecisionRecordStore() })
    await service.record(request())
    const changed = request()
    Object.assign(changed.target, delta)
    assert.deepEqual(await service.record(changed), { status: 409, body: { error: 'replay_detected' } })
  }
})

test('withdrawal replay never returns another workspace receipt', async () => {
  const store = createInMemoryDecisionRecordStore()
  const service = createDecisionRecordService({ store })
  const recorded = await service.record(request())
  const withdrawal = { actorSubject: 'owner-a', workspaceId: 'workspace-a', projectId: 'outcome', decisionId: recorded.body.decisionId, nonce: 'withdrawal-nonce-that-is-long-enough-123', sourcePrecondition: 'revision', currentSourcePrecondition: 'revision' }
  const first = await service.withdraw(withdrawal)
  assert.equal(first.status, 201)
  assert.deepEqual(await service.withdraw(withdrawal), first)
  assert.deepEqual(await service.withdraw({ ...withdrawal, actorSubject: 'owner-b', workspaceId: 'workspace-b' }), { status: 409, body: { error: 'decision_relation_invalid' } })
  assert.equal(store.snapshot().tombstones.length, 1)
  const history = await service.history({actorSubject:'owner-a',workspaceId:'workspace-a',projectIds:['outcome']})
  assert.equal(history.status,200)
  assert.deepEqual(history.body.decisions,[{receipt:recorded.body,target:{projectId:'outcome',eventId:'event-blocked',sequence:7},withdrawn:true}])
  assert.deepEqual((await service.history({actorSubject:'owner-a',workspaceId:'workspace-a',projectIds:[]})).body.decisions,[])
  assert.deepEqual((await service.history({actorSubject:'owner-b',workspaceId:'workspace-b',projectIds:['outcome']})).body.decisions,[])
  assert.doesNotMatch(JSON.stringify(history.body),/actor_subject|source_revision|nonce|digest|workspace_id/)
})
