import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { handlePrivateAccessRequest } from './account-access-api.mjs'
import { createAccountAccessService, createInMemoryAccountStore } from './account-access.mjs'
import { createAccountModelV2Projection } from './account-model-v2-projection.mjs'
import { createDecisionRecordService, createInMemoryDecisionRecordStore } from './outcome-decision-record.mjs'
import { createOutcomeServer } from './index.mjs'

const now = () => Date.parse('2026-08-25T00:00:00.000Z')
const service = createAccountAccessService({
  now,
  ownerSubject: 'owner',
  authProvider: { verify: async (token) => token === 'valid' ? { subject: 'owner', issuedAt: now(), expiresAt: now() + 60_000, linkedProviders: ['google', 'email_code'] } : null },
  store: createInMemoryAccountStore({
    workspaces: [{ id: 'workspace', state: 'active' }],
    memberships: [{ subject: 'owner', workspaceId: 'workspace', role: 'owner-viewer', state: 'active' }],
    projects: [
      { id: 'cherry-note', workspaceId: 'workspace', state: 'active', projection: { project: { id: 'cherry-note' } } },
      { id: 'outcome', workspaceId: 'workspace', state: 'active', projection: { project: { id: 'outcome' } } },
    ],
  }),
})

test('private config is provider-neutral and secret-free', async () => {
  const response = await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/config', service })
  assert.equal(response.status, 200)
  assert.equal(response.body.enabled, true)
  assert.deepEqual(response.body.providers.map((provider) => provider.id), ['google', 'apple', 'email_code'])
  assert.doesNotMatch(JSON.stringify(response.body), /secret|subject|token|VITE_/i)
})

test('private workspace uses server-resolved session and rejects selectors and mutations', async () => {
  const allowed = await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', token: 'valid', service })
  assert.equal(allowed.status, 200)
  assert.deepEqual(allowed.body.workspace.projects.map((project) => [project.project.id, project.modelV2.modelVersion]), [['cherry-note', 2], ['outcome', 2]])
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace?workspace=forged', token: 'valid', service }), { status: 404, body: { error: 'not_found' } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'POST', pathname: '/api/private/workspace', token: 'valid', service }), { status: 405, body: { error: 'read_only' } })
})

test('missing provider adapter and authentication fail closed without project existence leaks', async () => {
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/config' }), { status: 200, body: { enabled: false, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', service }), { status: 401, body: { error: 'authentication_required' } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', token: 'invalid', service }), { status: 401, body: { error: 'authentication_required' } })
})

test('the one decision route authenticates, enforces origin CSRF and freshness, and binds a server-owned blocker', async () => {
  const projection = createAccountModelV2Projection({
    project: { id: 'outcome', name: 'OUTCOME', outcome: 'One safe outcome' },
    blocked: true,
    events: [
      { id: 'event-builder-blocked', sequence: 7, role: 'builder', type: 'result_observed', summary: '고정 근거가 없어 안전 보류', observedAt: '2026-09-04T02:00:00.000Z', status: 'safe_hold' },
      { id: 'event-builder-corrected', sequence: 8, role: 'builder', type: 'result_observed', summary: '새 근거로 정정 필요', observedAt: '2026-09-04T02:10:00.000Z', status: 'safe_hold' },
    ],
  }, { observedAt: '2026-09-04T02:00:00.000Z' })
  const decisionService = createDecisionRecordService({ store: createInMemoryDecisionRecordStore(), now: () => Date.parse('2026-09-04T03:00:00.000Z') })
  const decisionRuntime = { service: decisionService, allowedOrigin: 'https://private.example', csrfSecret: 'csrf-secret-value' }
  const identityService = {
    authenticate: async (token) => token === 'valid' ? { subject: 'owner' } : Promise.reject(new Error('bad token')),
    readWorkspace: async ({ token }) => {
      if (token !== 'valid') throw new Error('bad token')
      return { workspace: { id: 'workspace', role: 'owner-viewer' }, projects: [{ project: { id: 'outcome', name: 'OUTCOME' }, modelV2: projection }], completionAuthority: false }
    },
  }
  const workspace = await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', token: 'valid', service: identityService, decisionRuntime })
  assert.equal(workspace.status, 200)
  assert.match(workspace.headers.etag, /^"[a-f0-9]{64}"$/)
  assert.equal(workspace.headers['x-outcome-csrf'], 'csrf-secret-value')
  assert.doesNotMatch(JSON.stringify(workspace.body), /sourceRevision|csrf-secret-value|[a-f0-9]{64}/)
  const request = { projectId: 'outcome', eventId: 'event-builder-blocked', sequence: 7, decision: 'rejected', rejectionReason: 'evidence_insufficient', nonce: 'nonce-value-that-is-long-enough-123' }
  const common = { method: 'POST', pathname: '/api/private/decisions', token: 'valid', service: identityService, decisionRuntime, body: request, origin: 'https://private.example', headers: { 'content-type': 'application/json', 'x-outcome-csrf': 'csrf-secret-value', 'if-match': workspace.headers.etag } }
  const first = await handlePrivateAccessRequest(common)
  assert.equal(first.status, 201)
  const correction = await handlePrivateAccessRequest({ ...common, body: { ...request, eventId: 'event-builder-corrected', sequence: 8, nonce: 'correction-nonce-that-is-long-enough-123', supersedesId: first.body.decisionId } })
  assert.equal(correction.status, 201)
  assert.equal(correction.body.supersedesId, first.body.decisionId)
  assert.deepEqual(await handlePrivateAccessRequest({ ...common, body: { projectId: 'outcome', withdrawsId: correction.body.decisionId, nonce: 'withdrawal-nonce-that-is-long-enough-123' } }), { status: 201, body: { decisionState: 'withdrawn', decisionId: correction.body.decisionId, completionAuthority: false } })
  assert.deepEqual(await handlePrivateAccessRequest({ ...common, headers: { ...common.headers, 'if-match': '"stale"' }, body: { ...request, nonce: 'different-nonce-that-is-long-enough-123' } }), { status: 409, body: { error: 'stale_source_revision' } })
  assert.deepEqual(await handlePrivateAccessRequest({ ...common, origin: 'https://evil.example', body: { ...request, nonce: 'different-nonce-that-is-long-enough-456' } }), { status: 403, body: { error: 'origin_forbidden' } })
  assert.deepEqual(await handlePrivateAccessRequest({ ...common, headers: { ...common.headers, 'x-outcome-csrf': 'wrong' }, body: { ...request, nonce: 'different-nonce-that-is-long-enough-789' } }), { status: 403, body: { error: 'csrf_invalid' } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'PUT', pathname: '/api/private/decisions', service: identityService, decisionRuntime }), { status: 405, body: { error: 'read_only' } })
})

test('decision recording is default-off without a hosted durable runtime', async () => {
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'POST', pathname: '/api/private/decisions', token: 'valid', service, headers: { 'content-type': 'application/json' }, body: {} }), { status: 503, body: { error: 'decision_store_unavailable' } })
})

test('only the exact decision path can reach the decision service', async () => {
  let calls = 0
  const decisionRuntime = { service: { record: async () => { calls += 1 } }, allowedOrigin: 'https://private.example', csrfSecret: 'csrf-secret-value' }
  for (const pathname of ['/api/private/decisions/', '/api/private/decisions/child', '/api/private/%64ecisions', '/api/private/decision', '/api/private/decisions%2Fchild']) {
    assert.deepEqual(await handlePrivateAccessRequest({ method: 'POST', pathname, service, decisionRuntime }), { status: 405, body: { error: 'read_only' } })
  }
  assert.equal(calls, 0)
})

test('hostile decision request objects fail before property traps', async () => {
  let traps = 0
  const body = new Proxy({}, { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  const decisionRuntime = { service: { record: async () => { throw new Error('must not run') } }, allowedOrigin: 'https://private.example', csrfSecret: 'csrf-secret-value' }
  const identityService = { authenticate: async () => ({ subject: 'owner' }), readWorkspace: async () => ({ workspace: { id: 'workspace' }, projects: [] }) }
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'POST', pathname: '/api/private/decisions', token: 'valid', service: identityService, decisionRuntime, origin: 'https://private.example', headers: { 'content-type': 'application/json', 'x-outcome-csrf': 'csrf-secret-value' }, body }), { status: 400, body: { error: 'invalid_request' } })
  assert.equal(traps, 0)
})

test('local runtime routes private config and HttpOnly provider session without changing public mutation denial', async () => {
  const server = createOutcomeServer({ publicReadOnly: true, accountAccess: service })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    assert.equal((await fetch(`${base}/api/private/config`)).status, 200)
    const workspace = await fetch(`${base}/api/private/workspace`, { headers: { cookie: '__session=valid' } })
    assert.equal(workspace.status, 200)
    const body = await workspace.json()
    assert.deepEqual(body.workspace.projects.map((project) => project.project.id), ['cherry-note', 'outcome'])
    assert.equal(body.workspace.projects.every((project) => project.modelV2.modelVersion === 2), true)
    const mutation = await fetch(`${base}/api/private/workspace`, { method: 'POST' })
    assert.equal(mutation.status, 405)
    assert.deepEqual(await mutation.json(), { error: 'read_only' })
  } finally { server.close(); await once(server, 'close') }
})

test('private login and logout require an explicit injected adapter and never expose its token', async () => {
  const denied = createOutcomeServer({ publicReadOnly: true, accountAccess: service })
  denied.listen(0, '127.0.0.1'); await once(denied, 'listening')
  try {
    const response = await fetch(`http://127.0.0.1:${denied.address().port}/api/private/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'google' }) })
    assert.equal(response.status, 405)
    assert.deepEqual(await response.json(), { error: 'read_only' })
  } finally { denied.close(); await once(denied, 'close') }

  const transitions = []
  const server = createOutcomeServer({ publicReadOnly: true, accountAccess: service, secureCookies: false, privateTransitionAdapter: {
    begin: async ({ provider }) => { transitions.push(['begin', provider]); return { token: 'valid' } },
    end: async ({ token }) => { transitions.push(['end', token]); return { state: 'signed_out' } },
  } })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const login = await fetch(`${base}/api/private/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider: 'google' }) })
    assert.equal(login.status, 200)
    const loginBody = await login.json()
    assert.deepEqual(loginBody, { state: 'authenticated', mode: 'injected_adapter' })
    assert.equal(JSON.stringify(loginBody).includes('valid'), false)
    const cookie = login.headers.get('set-cookie')
    assert.match(cookie, /__session=valid;.*HttpOnly;.*SameSite=Strict/)
    assert.equal((await fetch(`${base}/api/private/workspace`, { headers: { cookie } })).status, 200)
    const logout = await fetch(`${base}/api/private/auth/logout`, { method: 'POST', headers: { cookie } })
    assert.equal(logout.status, 200)
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
    assert.deepEqual(transitions, [['begin', 'google'], ['end', 'valid']])
  } finally { server.close(); await once(server, 'close') }
})
