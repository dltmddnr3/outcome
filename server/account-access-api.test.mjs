import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { handlePrivateAccessRequest } from './account-access-api.mjs'
import { createAccountAccessService, createInMemoryAccountStore } from './account-access.mjs'
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
  assert.equal((await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', token: 'valid', service })).status, 200)
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace?workspace=forged', token: 'valid', service }), { status: 404, body: { error: 'not_found' } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'POST', pathname: '/api/private/workspace', token: 'valid', service }), { status: 405, body: { error: 'read_only' } })
})

test('missing provider adapter and authentication fail closed without project existence leaks', async () => {
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/config' }), { status: 200, body: { enabled: false, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', service }), { status: 401, body: { error: 'authentication_required' } })
  assert.deepEqual(await handlePrivateAccessRequest({ method: 'GET', pathname: '/api/private/workspace', token: 'invalid', service }), { status: 401, body: { error: 'authentication_required' } })
})

test('local runtime routes private config and HttpOnly provider session without changing public mutation denial', async () => {
  const server = createOutcomeServer({ publicReadOnly: true, accountAccess: service })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    assert.equal((await fetch(`${base}/api/private/config`)).status, 200)
    const workspace = await fetch(`${base}/api/private/workspace`, { headers: { cookie: '__session=valid' } })
    assert.equal(workspace.status, 200)
    assert.deepEqual((await workspace.json()).workspace.projects.map((project) => project.project.id), ['cherry-note', 'outcome'])
    const mutation = await fetch(`${base}/api/private/workspace`, { method: 'POST' })
    assert.equal(mutation.status, 405)
    assert.deepEqual(await mutation.json(), { error: 'read_only' })
  } finally { server.close(); await once(server, 'close') }
})
