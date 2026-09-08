import test from 'node:test'
import assert from 'node:assert/strict'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import { createAccountAccessService, createInMemoryAccountStore } from './account-access.mjs'
import { handlePrivateAccessRequest } from './account-access-api.mjs'

const now = 20000
function makeService(seed = fixture, options = {}) {
  return createAccountAccessService({ ownerSubject: 'synthetic-owner', now: () => now,
    authProvider: { verify: async token => ({ subject: token === 'valid' ? 'synthetic-owner' : 'other', issuedAt: now, expiresAt: now + 60000 }) },
    store: createInMemoryAccountStore(seed), ...options })
}
test('connection inventory proves only scoped access; missing probes are not connected', async () => {
  const service = makeService()
  service.readWorkspace = () => { throw Error('must not issue workspace control bindings') }
  const response = await handlePrivateAccessRequest({ pathname: '/api/private/connections/outcome', token: 'valid', service })
  assert.equal(response.status, 200)
  assert.deepEqual(response.headers, { 'cache-control': 'private, no-store', vary: 'Cookie, Authorization' })
  assert.deepEqual(response.body, { schemaVersion: 1, projectId: 'outcome', completionAuthority: false, executionAuthority: false, entries: [
    { id: 'workspace_api', state: 'access_verified', observedAtMs: now },
    ...['execution_observer', 'mcp', 'provider_api', 'cli', 'environment', 'deployment'].map(id => ({ id, state: 'not_observed', observedAtMs: null })),
  ] })
  for (const value of ['synthetic-owner', 'workspace-cherry', 'token', 'credential', 'csrf']) assert(!JSON.stringify(response).includes(value))
})
test('trusted observation keeps original time and does not imply CLI availability', async () => {
  let timestamp = now - 100, runtimeType = 'idle'
  const service = makeService(fixture, { workObservationSource: async binding => {
    const scope = { projectId: binding.projectId, workId: 'one', runId: 'one', sessionRef: '11111111-1111-4111-8111-111111111111', bindingVersion: 1 }
    return JSON.stringify({ ...binding, observedAtMs: timestamp, scopeJson: JSON.stringify(scope),
      journalJson: JSON.stringify({ schemaVersion: 1, scope, events: [] }),
      runtimeJson: JSON.stringify({ thread: { id: scope.sessionRef, status: { type: runtimeType }, privatePrompt: 'never-return-this' } }) })
  } })
  for (const [time, type, state, observed] of [[now - 100, 'idle', 'source_observed', now - 100], [1000, 'idle', 'stale', 1000], [now, 'notLoaded', 'not_observed', null], [now, 'systemError', 'not_observed', null], [now, 'invalid', 'not_observed', null]]) {
    timestamp = time; runtimeType = type
    const result = await service.readConnectionInventory({ token: 'valid', requestedProjectId: 'outcome' })
    assert.deepEqual(result.entries[1], { id: 'execution_observer', state, observedAtMs: observed })
    assert.equal(result.entries.find(e => e.id === 'cli').state, 'not_observed')
    assert(!JSON.stringify(result).includes('never-return-this'))
  }
})
test('hosted inventory bypasses all mutation runtime factories and emits no control bindings', async () => {
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  let calls = 0
  const forbidden = () => { calls++; throw Error('must not initialize') }
  const environment = { OUTCOME_PRIVATE_SURFACE_ENABLED: '1', OUTCOME_CLERK_PUBLISHABLE_KEY: 'pk_test_synthetic', OUTCOME_CLERK_SECRET_KEY: 'sk_test_synthetic', OUTCOME_OWNER_SUBJECT: 'synthetic-owner', OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://preview.invalid', OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT: 'previous-preview' }
  const handler = createStableHostRequestHandler({ environment,
    runtimeFactory: () => ({ service: makeService(), allowedOrigin: 'https://preview.invalid', publishableKey: 'pk_test_synthetic' }),
    decisionRuntimeFactory: forbidden, destinationRuntimeFactory: forbidden, chatRuntimeFactory: forbidden })
  for (const headers of [{ cookie: '__session=valid' }, { authorization: 'Bearer valid' }]) {
    const result = await handler({ pathname: '/api/private/connections/outcome', headers })
    assert.equal(result.status, 200)
    assert.deepEqual(Object.keys(result.headers).sort(), ['cache-control', 'vary'])
  }
  assert.equal(calls, 0)
})
test('inventory denies missing identity, foreign owner/project, inactive and duplicate bindings', async () => {
  for (const [token, project, expected] of [[undefined, 'outcome', 401], ['other', 'outcome', 403], ['valid', 'foreign', 404]]) {
    assert.equal((await handlePrivateAccessRequest({ pathname: `/api/private/connections/${project}`, token, service: makeService() })).status, expected)
  }
  for (const mutate of [seed => { seed.memberships = [] }, seed => { seed.memberships.push(seed.memberships[0]) }, seed => { seed.workspaces[0].state = 'inactive' }, seed => { seed.projects = seed.projects.filter(p => p.id !== 'outcome') }]) {
    const seed = structuredClone(fixture); mutate(seed)
    assert.equal((await handlePrivateAccessRequest({ pathname: '/api/private/connections/outcome', token: 'valid', service: makeService(seed) })).status, 403)
  }
  assert.equal((await handlePrivateAccessRequest({ method: 'POST', pathname: '/api/private/connections/outcome', token: 'valid', service: makeService() })).status, 405)
})
test('stored Package cannot forge inventory or leak arbitrary source properties', async () => {
  const seed = structuredClone(fixture)
  for (const p of seed.projects) p.projection.connections = { secret: 'private-locator', state: 'connected', observedAtMs: now }
  const result = await makeService(seed).readConnectionInventory({ token: 'valid', requestedProjectId: 'outcome' })
  assert(!JSON.stringify(result).includes('private-locator'))
  assert(result.entries.slice(1).every(e => e.state === 'not_observed' && e.observedAtMs === null))
})
