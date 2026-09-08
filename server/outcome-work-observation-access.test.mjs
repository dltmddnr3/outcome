import test from 'node:test'
import assert from 'node:assert/strict'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import { readScopedWorkObservation } from './outcome-work-observation-access.mjs'
import { createAccountAccessService, createInMemoryAccountStore } from './account-access.mjs'
import { handlePrivateAccessRequest } from './account-access-api.mjs'
const now = 20000
const bound = { accountRef: 'a'.repeat(64), workspaceId: 'workspace-cherry', projectId: 'outcome' }
function envelope(binding = bound) {
  const scope = { projectId: binding.projectId, workId: 'work-one', runId: 'run-one', sessionRef: '11111111-1111-4111-8111-111111111111', bindingVersion: 1 }
  const queued = { sequence: 1, observedAt: new Date(now - 100).toISOString(), stage: 'queued', attempt: 1, activity: 'waiting', candidateCommit: null, candidateTree: null, evidenceRef: null, nextAction: null, blocker: null }
  return { ...binding, observedAtMs: now, scopeJson: JSON.stringify(scope),
    journalJson: JSON.stringify({ schemaVersion: 1, scope, events: [queued, { ...queued, sequence: 2, stage: 'implementing', activity: 'running' }] }),
    runtimeJson: JSON.stringify({ thread: { id: scope.sessionRef, status: { type: 'active', activeFlags: [] }, turns: [{ text: 'private prompt must not escape' }] } }) }
}
test('scoped source projects only finite observation and retains original older time', async () => {
  const result = await readScopedWorkObservation({ ...bound, now: () => now, readSource: async (scope) => {
    assert.deepEqual(scope, bound); assert(Object.isFrozen(scope)); return JSON.stringify(envelope(scope))
  } })
  assert.equal(result.executionState, 'running'); assert.equal(result.observedAtMs, now - 100)
  assert.equal(result.completionAuthority, false); assert.equal(result.executionAuthority, false)
  for (const secret of ['private prompt', bound.accountRef, bound.workspaceId, '11111111-1111']) assert(!JSON.stringify(result).includes(secret))
})
test('cross account/workspace/project, invalid source and timeout never return caller data', async () => {
  const inputs = ['null', '{', 'x'.repeat(600001), JSON.stringify({ ...envelope(), privateLocator: 'secret' })]
  for (const key of ['accountRef', 'workspaceId', 'projectId']) inputs.push(JSON.stringify({ ...envelope(), [key]: 'foreign' }))
  for (const observedAtMs of [null, -1, now + 1, '20000']) inputs.push(JSON.stringify({ ...envelope(), observedAtMs }))
  inputs.push(JSON.stringify({ ...envelope(), scopeJson: JSON.stringify({ ...JSON.parse(envelope().scopeJson), projectId: 'foreign' }) }))
  for (const raw of inputs) assert.equal(await readScopedWorkObservation({ ...bound, now: () => now, readSource: async () => raw }), null)
  let signal
  assert.equal(await readScopedWorkObservation({ ...bound, timeoutMs: 5, readSource: (_, options) => { signal = options.signal; return new Promise(() => {}) } }), null)
  assert.equal(signal.aborted, true)
  assert.equal(await readScopedWorkObservation({ ...bound, readSource: async () => { throw Error('private secret') } }), null)
})
test('workspace authenticates and selects server project before source access; stored Package cannot spoof observation', async () => {
  const calls = []
  const source = async binding => { calls.push(binding); return JSON.stringify(envelope(binding)) }
  const store = createInMemoryAccountStore(fixture)
  const authProvider = { verify: async token => token === 'valid' ? { subject: 'synthetic-owner', issuedAt: now, expiresAt: now + 60000, linkedProviders: ['google'] } : null }
  const service = createAccountAccessService({ authProvider, store, ownerSubject: 'synthetic-owner', now: () => now, workObservationSource: source })
  for (const request of [{ token: 'invalid' }, { token: 'valid', requestedProjectId: 'foreign' }]) await assert.rejects(() => service.readWorkspace(request))
  assert.equal(calls.length, 0)
  const workspace = await service.readWorkspace({ token: 'valid', requestedProjectId: 'outcome' })
  assert.equal(calls.length, 1); assert.equal(calls[0].projectId, 'outcome')
  assert.equal(calls[0].workspaceId, 'workspace-cherry'); assert.match(calls[0].accountRef, /^[a-f0-9]{64}$/)
  assert(!JSON.stringify(calls).includes('synthetic-owner')); assert(!JSON.stringify(calls).includes('valid'))
  assert.equal(workspace.projects[0].workObservation.executionState, 'running')
  const denied = await handlePrivateAccessRequest({ pathname: '/api/private/workspace', service })
  assert.equal(denied.status, 401); assert.equal(calls.length, 1)
  const response = await handlePrivateAccessRequest({ pathname: '/api/private/workspace', service, token: 'valid' })
  assert.equal(response.status, 200)
  assert(response.body.workspace.projects.every(project => project.workObservation.executionState === 'running'))
  assert(!JSON.stringify(response).includes('private prompt'))
  const seeded = structuredClone(fixture)
  for (const project of seeded.projects) project.projection.workObservation = { executionState: 'running' }
  const disconnected = createAccountAccessService({ authProvider, store: createInMemoryAccountStore(seeded), ownerSubject: 'synthetic-owner', now: () => now })
  await assert.rejects(() => disconnected.readWorkspace({ token: 'valid' }), /account_model_v2_unexpected_key/)
  const clean = createAccountAccessService({ authProvider, store: createInMemoryAccountStore(fixture), ownerSubject: 'synthetic-owner', now: () => now })
  assert((await clean.readWorkspace({ token: 'valid' })).projects.every(project => project.workObservation === null))
  for (const project of seeded.projects) project.projection.workObservation.privateLocator = 'secret'
  const hostile = createAccountAccessService({ authProvider, store: createInMemoryAccountStore(seeded), ownerSubject: 'synthetic-owner', now: () => now })
  await assert.rejects(() => hostile.readWorkspace({ token: 'valid' }), /account_model_v2_private_key/)
})
