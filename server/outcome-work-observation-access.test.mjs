import test from 'node:test'
import assert from 'node:assert/strict'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import { readScopedWorkObservation } from './outcome-work-observation-access.mjs'
import { createAccountAccessService, createInMemoryAccountStore } from './account-access.mjs'
import { handlePrivateAccessRequest } from './account-access-api.mjs'
import { createOutcomeServer } from './index.mjs'
import { once } from 'node:events'
const now = 20000
const bound = { accountRef: 'a'.repeat(64), workspaceId: 'workspace-cherry', projectId: 'outcome' }
function envelope(binding = bound) {
  const scope = { projectId: binding.projectId, workId: 'work-one', runId: 'run-one', sessionRef: '11111111-1111-4111-8111-111111111111', bindingVersion: 1 }
  const queued = { sequence: 1, observedAt: new Date(now - 100).toISOString(), stage: 'queued', attempt: 1, activity: 'waiting', candidateCommit: null, candidateTree: null, evidenceRef: null, nextAction: null, blocker: null }
  return { ...binding, observedAtMs: now, scopeJson: JSON.stringify(scope),
    journalJson: JSON.stringify({ schemaVersion: 1, scope, events: [queued, { ...queued, sequence: 2, stage: 'implementing', activity: 'running' }] }),
    runtimeJson: JSON.stringify({ thread: { id: scope.sessionRef, status: { type: 'active', activeFlags: [] }, turns: [{ text: 'private prompt must not escape' }] } }) }
}
test('observation-only HTTP refresh is scoped, read-only and does not load workspace or issue control bindings', async () => {
  let sourceCalls = 0, sourceTime = now, unavailable = false
  const baseStore = createInMemoryAccountStore(fixture)
  const before = baseStore.exportWorkspace('workspace-cherry')
  const store = { ...baseStore, workspaceProjection: () => { throw Error('workspace projection must not run') } }
  const authProvider = { verify: async token => token ? { subject: token === 'valid' ? 'synthetic-owner' : 'other-owner', issuedAt: now, expiresAt: now + 60000 } : null }
  const service = createAccountAccessService({ authProvider, store, ownerSubject: 'synthetic-owner', now: () => sourceTime, workObservationSource: async scope => {
    sourceCalls++; assert.equal(scope.projectId, 'outcome')
    if (unavailable) throw Error('private connection detail')
    return JSON.stringify({ ...envelope(scope), observedAtMs: sourceTime })
  } })
  const server = createOutcomeServer({ publicReadOnly: true, accountAccess: service,
    collect: () => { throw Error('collector must not run') }, collectPackages: () => { throw Error('collector must not run') },
    decisionRuntime: { csrfSecret: 'synthetic-decision-secret' }, destinationRuntime: { csrfSecret: 'synthetic-destination-secret', repository: {} } })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/private/work-observation/`
    for (const [path, token, method, expected] of [['outcome', '', 'GET', 401], ['outcome', 'other', 'GET', 403], ['foreign', 'valid', 'GET', 404], ['outcome/extra', 'valid', 'GET', 404], ['outcome', 'valid', 'POST', 405]]) {
      const response = await fetch(base + path, { method, headers: token ? { cookie: `__session=${token}` } : {} })
      assert.equal(response.status, expected); await response.arrayBuffer()
    }
    assert.equal(sourceCalls, 0)
    for (let pass = 0; pass < 2; pass++) {
      const response = await fetch(base + 'outcome', { headers: { cookie: '__session=valid' } })
      assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/)
      for (const header of ['etag', 'x-outcome-csrf', 'x-outcome-destination-csrf', 'set-cookie']) assert.equal(response.headers.get(header), null)
      const body = await response.json()
      assert.deepEqual(Object.keys(body).sort(), ['completionAuthority', 'observation', 'projectId'])
      assert.equal(body.projectId, 'outcome'); assert.equal(body.completionAuthority, false)
      assert.equal(body.observation.observedAtMs, now - 100) // Never replace original event time with poll time.
      assert.equal(body.observation.executionState, pass === 0 ? 'running' : 'stage_unconfirmed')
      assert.equal(body.observation.work.freshness, pass === 0 ? 'fresh' : 'stale')
      for (const value of ['private prompt', 'synthetic-owner', 'workspace-cherry', 'sessionRef', 'csrf']) assert(!JSON.stringify(body).includes(value))
      sourceTime += 20000
    }
    unavailable = true
    const missing = await fetch(base + 'outcome', { headers: { cookie: '__session=valid' } })
    assert.deepEqual(await missing.json(), { projectId: 'outcome', observation: null, completionAuthority: false })
    assert.equal(sourceCalls, 3); assert.deepEqual(baseStore.exportWorkspace('workspace-cherry'), before)
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
test('hosted observation route skips decision and Destination runtime factories', async () => {
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  let calls = 0, mutationRuntimeCalls = 0
  const environment = { OUTCOME_PRIVATE_SURFACE_ENABLED: '1', OUTCOME_CLERK_PUBLISHABLE_KEY: 'pk_test_synthetic',
    OUTCOME_CLERK_SECRET_KEY: 'sk_test_synthetic', OUTCOME_OWNER_SUBJECT: 'synthetic-owner',
    OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://preview.invalid', OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT: 'previous-preview' }
  const service = createAccountAccessService({ ownerSubject: 'synthetic-owner', now: () => now,
    authProvider: { verify: async token => token === 'valid' ? { subject: 'synthetic-owner', issuedAt: now, expiresAt: now + 60000 } : null },
    store: createInMemoryAccountStore(fixture), workObservationSource: async scope => { calls++; return JSON.stringify(envelope(scope)) } })
  service.readWorkspace = () => { throw Error('workspace must not be refreshed') }
  const forbidden = () => { mutationRuntimeCalls++; throw Error('mutation runtime must not be initialized') }
  const request = createStableHostRequestHandler({ environment, runtimeFactory: () => ({ service, allowedOrigin: 'https://preview.invalid', publishableKey: 'pk_test_synthetic' }),
    decisionRuntimeFactory: forbidden, destinationRuntimeFactory: forbidden, chatRuntimeFactory: forbidden })
  for (const headers of [{ cookie: '__session=valid' }, { authorization: 'Bearer valid' }]) {
    const response = await request({ pathname: '/api/private/work-observation/outcome', headers })
    assert.equal(response.status, 200); assert.equal(response.body.observation.executionState, 'running')
    assert.deepEqual(Object.keys(response.headers).sort(), ['cache-control', 'vary'])
  }
  assert.equal((await request({ pathname: '/api/private/work-observation/outcome' })).status, 401)
  assert.equal((await request({ method: 'POST', pathname: '/api/private/work-observation/outcome', headers: { authorization: 'Bearer valid' } })).status, 405)
  assert.equal(calls, 2); assert.equal(mutationRuntimeCalls, 0)
})
test('observation scope denies inactive, duplicate or foreign bindings before consulting source', async () => {
  let calls = 0
  for (const change of [seed => { seed.memberships = [] }, seed => { seed.memberships.push(seed.memberships[0]) }, seed => { seed.workspaces[0].state = 'inactive' }, seed => { seed.projects = seed.projects.filter(project => project.id !== 'outcome') }]) {
    const seed = structuredClone(fixture); change(seed)
    const service = createAccountAccessService({ ownerSubject: 'synthetic-owner', now: () => now,
      authProvider: { verify: async () => ({ subject: 'synthetic-owner', issuedAt: now, expiresAt: now + 60000 }) },
      store: createInMemoryAccountStore(seed), workObservationSource: async () => { calls++; return '{}' } })
    const response = await handlePrivateAccessRequest({ pathname: '/api/private/work-observation/outcome', token: 'valid', service })
    assert.equal(response.status, 403)
  }
  assert.equal(calls, 0)
})
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
