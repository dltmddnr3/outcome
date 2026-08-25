import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import test from 'node:test'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { finalizeDeploymentSnapshot } from '../scripts/finalize-stable-snapshot.mjs'
import {
  HOSTED_PREVIEW_ENV,
  createClerkHostedAuthProvider,
  createHostedPreviewRuntime,
  createSupabaseRestGateway,
  createSupabaseHostedStore,
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
  ['OUTCOME_CLERK_SIGN_IN_URL', 'https://identity.invalid/sign-in'],
  ['OUTCOME_CLERK_ACCOUNT_URL', 'https://identity.invalid/user'],
  ['OUTCOME_PRIVATE_ALLOWED_ORIGIN', 'https://preview.invalid'],
  ['OUTCOME_SUPABASE_URL', 'https://database.invalid'],
  ['OUTCOME_SUPABASE_PUBLISHABLE_KEY', 'database-publishable-test-value'],
  ['OUTCOME_SUPABASE_SECRET_KEY', 'database-server-test-value'],
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
  assert.deepEqual(Object.values(HOSTED_PREVIEW_ENV), Object.keys(completeEnvironment))
  assert.equal(readHostedPreviewConfiguration({}).enabled, false)
  assert.equal(readHostedPreviewConfiguration({ ...completeEnvironment, OUTCOME_PRIVATE_SURFACE_ENABLED: '0' }).enabled, false)
  for (const name of Object.keys(completeEnvironment)) {
    const partial = { ...completeEnvironment }; delete partial[name]
    assert.deepEqual(readHostedPreviewConfiguration(partial), { enabled: false })
  }
  const enabled = readHostedPreviewConfiguration(completeEnvironment)
  assert.equal(enabled.enabled, true)
  assert.equal(JSON.stringify(enabled).includes('server-test-value'), false)
})

test('Clerk boundary preserves canonical owner, approved starts, Apple link-only, logout and revocation', async () => {
  const calls = []
  const provider = createClerkHostedAuthProvider({ gateway: providerGateway({
    startSignIn: async ({ provider }) => { calls.push(['start', provider]); return { redirectUrl: `https://identity.invalid/${provider}` } },
    startAppleLink: async ({ subject }) => { calls.push(['apple', subject]); return { redirectUrl: 'https://identity.invalid/user' } },
    revokeSession: async ({ sessionId }) => { calls.push(['logout', sessionId]); return { state: 'revoked' } },
    revokeAllSessions: async ({ subject }) => { calls.push(['revoke', subject]); return { state: 'revoked' } },
  }), ownerSubject: owner, allowedRedirectOrigins: ['https://identity.invalid'], now })
  assert.equal((await provider.verify('valid')).subject, owner)
  await assert.rejects(() => provider.verify('wrong-owner'), /owner_mismatch/)
  await assert.rejects(() => provider.verify('expired'), /session_expired/)
  await assert.rejects(() => provider.verify('revoked'), /session_revoked/)
  assert.equal((await provider.begin({ provider: 'google' })).redirectUrl, 'https://identity.invalid/google')
  assert.equal((await provider.begin({ provider: 'email_code' })).redirectUrl, 'https://identity.invalid/email_code')
  await assert.rejects(() => provider.begin({ provider: 'apple' }), /provider_not_allowed/)
  await assert.rejects(() => provider.beginAppleLink({}), /apple_link_required/)
  assert.equal((await provider.beginAppleLink({ token: 'valid' })).redirectUrl, 'https://identity.invalid/user')
  assert.deepEqual(await provider.signOut({ token: 'valid' }), { state: 'signed_out' })
  assert.deepEqual(await provider.revokeAll({ operatorAuthorized: true }), { state: 'revoked' })
  assert.deepEqual(calls, [['start', 'google'], ['start', 'email_code'], ['apple', owner], ['logout', 'synthetic-session'], ['revoke', owner]])

  const hostileRedirect = createClerkHostedAuthProvider({ gateway: providerGateway({ startSignIn: async () => ({ redirectUrl: 'https://attacker.invalid/sign-in' }) }), ownerSubject: owner, allowedRedirectOrigins: ['https://identity.invalid'], now })
  await assert.rejects(() => hostileRedirect.begin({ provider: 'google' }), /authentication_unavailable/)
})

test('provider and hosted store outages fail closed without cross-project fallback', async () => {
  const unavailable = createClerkHostedAuthProvider({ gateway: providerGateway({ verifySession: async () => { throw new Error('provider unavailable') } }), ownerSubject: owner, allowedRedirectOrigins: ['https://identity.invalid'], now })
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

test('Vercel handler stays disabled for absent or partial env and selects only complete injected adapters', async () => {
  for (const environment of [{}, { ...completeEnvironment, OUTCOME_SUPABASE_SECRET_KEY: undefined }]) {
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
  const login = await request({ method: 'POST', pathname: '/api/private/auth/login', origin: 'https://preview.invalid', body: { provider: 'google' } })
  assert.equal(login.status, 200)
  assert.equal(login.body.mode, 'hosted_provider_redirect')
  assert.deepEqual(await request({ method: 'POST', pathname: '/api/private/auth/login', origin: 'https://attacker.invalid', body: { provider: 'google' } }), { status: 403, body: { error: 'request_origin_denied' } })
  const callback = await request({ method: 'POST', pathname: '/api/private/auth/callback', origin: 'https://preview.invalid', body: { sessionToken: 'valid' } })
  assert.equal(callback.status, 200)
  assert.match(callback.headers['set-cookie'], /HttpOnly; Secure; SameSite=Lax; Max-Age=604800/)
  const logout = await request({ method: 'POST', pathname: '/api/private/auth/logout', origin: 'https://preview.invalid', headers: { cookie: '__session=valid' } })
  assert.equal(logout.status, 200)
  assert.match(logout.headers['set-cookie'], /Max-Age=0/)
  assert.deepEqual(await request({ method: 'POST', pathname: '/api/dashboard' }), { status: 405, body: { error: 'read_only' } })
})

test('default stable Vercel boundary remains disabled, private-denied and mutation-closed', async () => {
  const request = createStableHostRequestHandler({ environment: {} })
  const serialized = JSON.stringify([
    await request({ method: 'GET', pathname: '/api/private/config' }),
    await request({ method: 'GET', pathname: '/api/private/workspace' }),
  ])
  assert.doesNotMatch(serialized, /synthetic-owner|server-test-value|database-server-test-value/)
  for (const pathname of ['/api/dashboard', '/api/private/config', '/api/private/workspace', '/api/private/auth/login']) {
    assert.equal((await request({ method: 'POST', pathname })).status, 405)
  }
})
