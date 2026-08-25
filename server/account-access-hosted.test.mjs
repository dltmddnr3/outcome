import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import test from 'node:test'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { finalizeDeploymentSnapshot } from '../scripts/finalize-stable-snapshot.mjs'
import {
  HOSTED_PREVIEW_ENV,
  HOSTED_DATA_ENV,
  HOSTED_IDENTITY_ENV,
  createClerkHostedAuthProvider,
  createHostedPreviewRuntime,
  createSupabaseRestGateway,
  createSupabaseHostedStore,
  readHostedDataConfiguration,
  readHostedIdentityConfiguration,
  readHostedPreviewConfiguration,
} from './account-access-hosted.mjs'

const deploymentFixture = finalizeDeploymentSnapshot({ source, commit: '1'.repeat(40), tree: '2'.repeat(40), asset: 'index-test.js' })
writeFileSync(new URL('../api/deployment-snapshot.mjs', import.meta.url), `export default ${JSON.stringify(deploymentFixture)}\n`, 'utf8')
const { createStableHostRequestHandler } = await import('../api/index.mjs')

const now = () => Date.parse('2026-08-25T00:00:00.000Z')
const owner = 'synthetic-owner'
const completeEnvironment = Object.fromEntries([
  ['OUTCOME_PRIVATE_SURFACE_ENABLED', '1'],
  ['OUTCOME_CLERK_PUBLISHABLE_KEY', 'publishable-test-value'],
  ['OUTCOME_CLERK_SECRET_KEY', 'server-test-value'],
  ['OUTCOME_OWNER_SUBJECT', owner],
  ['OUTCOME_PRIVATE_ALLOWED_ORIGIN', 'https://preview.invalid'],
  ['OUTCOME_SUPABASE_URL', 'https://database.invalid'],
  ['OUTCOME_SUPABASE_PUBLISHABLE_KEY', 'database-publishable-test-value'],
  ['OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT', 'last-verified-preview'],
])

const identity = ({ subject = owner, expired = false, revoked = false, linkedProviders = ['google', 'email_code'] } = {}) => ({
  subject,
  issuedAt: now() - 1_000,
  expiresAt: expired ? now() - 1 : now() + 60_000,
  revoked,
  linkedProviders,
  sessionId: 'synthetic-session',
})

const providerGateway = (overrides = {}) => ({
  verifySession: async (token) => token === 'valid' ? identity() : token === 'wrong-owner' ? identity({ subject: 'other-owner' }) : token === 'expired' ? identity({ expired: true }) : token === 'revoked' ? identity({ revoked: true }) : null,
  verifyRequest: async (request) => {
    const token = request.headers.get('cookie')?.match(/(?:^|;\s*)__session=([^;]+)/)?.[1]
    const value = token === 'valid' ? identity() : token === 'wrong-owner' ? identity({ subject: 'other-owner' }) : token === 'expired' ? identity({ expired: true }) : token === 'revoked' ? identity({ revoked: true }) : null
    return value ? { ...value, sessionToken: token } : null
  },
  startSignIn: async ({ provider }) => ({ redirectUrl: `https://identity.invalid/sign-in?provider=${provider}` }),
  startAppleLink: async () => ({ redirectUrl: 'https://identity.invalid/user' }),
  revokeSession: async () => ({ state: 'revoked' }),
  revokeAllSessions: async () => ({ state: 'revoked' }),
  ...overrides,
})

const storeGateway = (overrides = {}) => ({
  membershipsForSubject: async ({ subject }) => fixture.memberships.filter((item) => item.subject === subject),
  workspace: async ({ id }) => fixture.workspaces.find((item) => item.id === id) ?? null,
  projectsForWorkspace: async ({ workspaceId }) => fixture.projects.filter((item) => item.workspaceId === workspaceId),
  ...overrides,
})

test('exact hosted environment inventory enables only complete explicit configuration', () => {
  assert.deepEqual(new Set(Object.values(HOSTED_PREVIEW_ENV)), new Set(Object.keys(completeEnvironment)))
  assert.equal(Object.values(HOSTED_IDENTITY_ENV).some((name) => name.includes('SUPABASE')), false)
  assert.deepEqual(Object.values(HOSTED_DATA_ENV), ['OUTCOME_SUPABASE_URL', 'OUTCOME_SUPABASE_PUBLISHABLE_KEY'])
  assert.equal(readHostedPreviewConfiguration({}).enabled, false)
  assert.equal(readHostedPreviewConfiguration({ ...completeEnvironment, OUTCOME_PRIVATE_SURFACE_ENABLED: '0' }).enabled, false)
  for (const name of Object.values(HOSTED_IDENTITY_ENV)) {
    const partial = { ...completeEnvironment }; delete partial[name]
    assert.deepEqual(readHostedIdentityConfiguration(partial), { enabled: false })
  }
  const identityOnly = Object.fromEntries(Object.values(HOSTED_IDENTITY_ENV).map((name) => [name, completeEnvironment[name]]))
  const enabled = readHostedIdentityConfiguration(identityOnly)
  assert.equal(enabled.enabled, true)
  assert.equal(readHostedDataConfiguration(identityOnly).enabled, false)
  assert.equal(readHostedDataConfiguration(completeEnvironment).enabled, true)
  assert.equal(JSON.stringify(enabled).includes('server-test-value'), false)
})

test('Clerk backend boundary preserves canonical owner, logout and revocation while browser SDK owns provider transitions', async () => {
  const calls = []
  const provider = createClerkHostedAuthProvider({ gateway: providerGateway({
    revokeSession: async ({ sessionId }) => { calls.push(['logout', sessionId]); return { state: 'revoked' } },
    revokeAllSessions: async ({ subject }) => { calls.push(['revoke', subject]); return { state: 'revoked' } },
  }), ownerSubject: owner, now })
  assert.equal((await provider.verify('valid')).subject, owner)
  await assert.rejects(() => provider.verify('wrong-owner'), /owner_mismatch/)
  await assert.rejects(() => provider.verify('expired'), /session_expired/)
  await assert.rejects(() => provider.verify('revoked'), /session_revoked/)
  assert.deepEqual(await provider.signOut({ token: 'valid' }), { state: 'signed_out' })
  assert.deepEqual(await provider.revokeAll({ operatorAuthorized: true }), { state: 'revoked' })
  assert.deepEqual(calls, [['logout', 'synthetic-session'], ['revoke', owner]])
})

test('provider and hosted store outages fail closed without cross-project fallback', async () => {
  const unavailable = createClerkHostedAuthProvider({ gateway: providerGateway({ verifySession: async () => { throw new Error('provider unavailable') } }), ownerSubject: owner, now })
  await assert.rejects(() => unavailable.verify('valid'), /authentication_unavailable/)
  const store = createSupabaseHostedStore({ gateway: storeGateway(), allowedProjects: ['cherry-note', 'outcome'] })
  assert.equal((await store.membershipsForSubject(owner, { token: 'valid' })).length, 1)
  assert.deepEqual((await store.projectsForWorkspace('workspace-cherry', { token: 'valid' })).map((item) => item.id), ['cherry-note', 'outcome'])
  const broken = createSupabaseHostedStore({ gateway: storeGateway({ projectsForWorkspace: async () => { throw new Error('RLS denied') } }), allowedProjects: ['cherry-note', 'outcome'] })
  await assert.rejects(() => broken.projectsForWorkspace('workspace-cherry', { token: 'valid' }), /private_store_unavailable/)
})

test('Supabase REST gateway uses the existing private schema with the verified session token and publishable key', async () => {
  const calls = []
  const responses = {
    workspace_memberships: [{ workspace_id: 'workspace-cherry', identity_subject: owner, role: 'owner-viewer', state: 'active' }],
    workspaces: [{ id: 'workspace-cherry', state: 'active' }],
    project_bindings: [{ project_id: 'project-cherry' }, { project_id: 'project-outcome' }],
    projects: [{ id: 'project-cherry', package_id: 'cherry-note', state: 'active', current_snapshot_id: 1 }, { id: 'project-outcome', package_id: 'outcome', state: 'active', current_snapshot_id: 2 }],
    package_snapshots: [{ id: 1, projection: fixture.projects[0].projection }, { id: 2, projection: fixture.projects[1].projection }],
  }
  const gateway = createSupabaseRestGateway({ url: 'https://database.invalid', publishableKey: 'publishable-test-value', fetchImpl: async (url, options) => {
    calls.push({ url, headers: options.headers })
    const table = new URL(url).pathname.split('/').at(-1)
    return { ok: true, json: async () => responses[table] }
  } })
  assert.equal((await gateway.membershipsForSubject({ subject: owner, token: 'valid' }))[0].workspaceId, 'workspace-cherry')
  assert.equal((await gateway.workspace({ id: 'workspace-cherry', token: 'valid' })).id, 'workspace-cherry')
  assert.deepEqual((await gateway.projectsForWorkspace({ workspaceId: 'workspace-cherry', token: 'valid' })).map((item) => item.id), ['cherry-note', 'outcome'])
  assert.equal(calls.every((call) => call.headers.authorization === 'Bearer valid' && call.headers.apikey === 'publishable-test-value' && call.headers['accept-profile'] === 'outcome_private'), true)
  assert.equal(calls.some((call) => call.url.includes('database-server-test-value')), false)
})

test('Vercel handler stays disabled for absent or partial identity env and selects only complete injected adapters', async () => {
  for (const environment of [{}, { ...completeEnvironment, OUTCOME_CLERK_SECRET_KEY: undefined }]) {
    const request = createStableHostRequestHandler({ environment })
    assert.equal((await request({ method: 'GET', pathname: '/api/private/config' })).body.enabled, false)
    assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/workspace' }), { status: 401, body: { error: 'authentication_required' } })
    assert.deepEqual(await request({ method: 'POST', pathname: '/api/private/auth/login' }), { status: 405, body: { error: 'read_only' } })
  }
  const runtimeFactory = ({ environment }) => createHostedPreviewRuntime({ environment, providerGateway: providerGateway(), storeGateway: storeGateway(), now })
  const request = createStableHostRequestHandler({ environment: completeEnvironment, runtimeFactory })
  assert.equal((await request({ method: 'GET', pathname: '/api/private/config' })).body.enabled, true)
  const workspace = await request({ method: 'GET', pathname: '/api/private/workspace', headers: { cookie: '__session=valid' } })
  assert.equal(workspace.status, 200)
  assert.deepEqual(workspace.body.workspace.projects.map((item) => item.project.id), ['cherry-note', 'outcome'])
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/workspace', headers: { cookie: '__session=wrong-owner' } }), { status: 403, body: { error: 'owner_mismatch' } })
  assert.deepEqual(await request({ method: 'POST', pathname: '/api/private/auth/login', origin: 'https://preview.invalid', body: { provider: 'google' } }), { status: 405, body: { error: 'read_only' } })
  assert.deepEqual(await request({ method: 'POST', pathname: '/api/private/auth/login', origin: 'https://attacker.invalid', body: { provider: 'google' } }), { status: 405, body: { error: 'read_only' } })
  const callback = await request({ method: 'POST', pathname: '/api/private/auth/callback', origin: 'https://preview.invalid', headers: { cookie: '__session=valid' }, body: { sessionToken: 'unverified-json-token' } })
  assert.deepEqual(callback, { status: 405, body: { error: 'read_only' } })
  const logout = await request({ method: 'POST', pathname: '/api/private/auth/logout', origin: 'https://preview.invalid', headers: { cookie: '__session=valid' } })
  assert.deepEqual(logout, { status: 405, body: { error: 'read_only' } })
  assert.deepEqual(await request({ method: 'POST', pathname: '/api/dashboard' }), { status: 405, body: { error: 'read_only' } })
})

test('rejected null or malformed runtime factories preserve the exact disabled boundary', async () => {
  const factories = [
    async () => { throw new Error('adapter initialization failed') },
    async () => null,
    async () => ({}),
    async () => ({ service: {}, transition: {}, allowedOrigin: 'https://preview.invalid' }),
  ]
  for (const runtimeFactory of factories) {
    const request = createStableHostRequestHandler({ environment: completeEnvironment, runtimeFactory })
    assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/config' }), { status: 200, body: { enabled: false, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false } })
    assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/workspace' }), { status: 401, body: { error: 'authentication_required' } })
    assert.deepEqual(await request({ method: 'POST', pathname: '/api/private/auth/login' }), { status: 405, body: { error: 'read_only' } })
  }
})

test('default stable Vercel boundary remains disabled, private-denied and mutation-closed', async () => {
  const request = createStableHostRequestHandler({ environment: {} })
  const serialized = JSON.stringify([
    await request({ method: 'GET', pathname: '/api/private/config' }),
    await request({ method: 'GET', pathname: '/api/private/workspace' }),
  ])
  assert.doesNotMatch(serialized, /synthetic-owner|server-test-value/)
  for (const pathname of ['/api/dashboard', '/api/private/config', '/api/private/workspace', '/api/private/auth/login']) {
    assert.equal((await request({ method: 'POST', pathname })).status, 405)
  }
})
