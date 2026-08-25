import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import test from 'node:test'
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { finalizeDeploymentSnapshot } from '../scripts/finalize-stable-snapshot.mjs'
import {
  HOSTED_DATA_ENV,
  HOSTED_IDENTITY_ENV,
  createClerkBackendGateway,
  createHostedIdentityRuntime,
  readHostedDataConfiguration,
  readHostedIdentityConfiguration,
} from './account-access-hosted.mjs'

const deploymentFixture = finalizeDeploymentSnapshot({ source, commit: '1'.repeat(40), tree: '2'.repeat(40), asset: 'index-test.js' })
writeFileSync(new URL('../api/deployment-snapshot.mjs', import.meta.url), `export default ${JSON.stringify(deploymentFixture)}\n`, 'utf8')

const now = () => Date.parse('2026-08-25T00:00:00.000Z')
const owner = 'synthetic-owner'
const identityEnvironment = {
  OUTCOME_PRIVATE_SURFACE_ENABLED: '1',
  OUTCOME_CLERK_PUBLISHABLE_KEY: 'pk_test_synthetic',
  OUTCOME_CLERK_SECRET_KEY: 'sk_test_synthetic',
  OUTCOME_OWNER_SUBJECT: owner,
  OUTCOME_PRIVATE_ALLOWED_ORIGIN: 'https://preview.invalid',
  OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT: 'last-verified-preview',
}

const claims = ({ subject = owner, expired = false, sessionId = subject === owner ? 'synthetic-session' : 'other-session' } = {}) => ({
  sub: subject,
  sid: sessionId,
  iat: Math.floor((now() - 1_000) / 1_000),
  exp: Math.floor((expired ? now() - 1 : now() + 60_000) / 1_000),
})

const clerkClientFactory = ({ unavailable = false, revoked = false } = {}) => () => ({
  async authenticateRequest(request) {
    if (unavailable) throw new Error('provider unavailable')
    const token = request.headers.get('cookie')?.match(/(?:^|;\s*)__session=([^;]+)/)?.[1]
    const value = token === 'sdk-valid' ? claims() : token === 'wrong-owner' ? claims({ subject: 'other-owner' }) : token === 'expired' ? claims({ expired: true }) : null
    return { toAuth: () => value ? { isAuthenticated: true, userId: value.sub, sessionId: value.sid, sessionClaims: value } : { isAuthenticated: false } }
  },
  sessions: {
    async getSession(sessionId) { return { id: sessionId, status: revoked ? 'revoked' : 'active', userId: sessionId === 'other-session' ? 'other-owner' : owner } },
    async revokeSession() { return { status: 'revoked' } },
    async getSessionList() { return { data: [{ id: 'synthetic-session', userId: owner }] } },
  },
})

test('HP1 identity configuration is complete without any HP2 or hosted-page URL binding', () => {
  assert.deepEqual(Object.values(HOSTED_IDENTITY_ENV), Object.keys(identityEnvironment))
  assert.equal(Object.values(HOSTED_IDENTITY_ENV).some((name) => name.includes('SUPABASE') || name.includes('SIGN_IN_URL') || name.includes('ACCOUNT_URL')), false)
  assert.equal(readHostedIdentityConfiguration(identityEnvironment).enabled, true)
  assert.equal(readHostedDataConfiguration(identityEnvironment).enabled, false)
  assert.deepEqual(Object.values(HOSTED_DATA_ENV), ['OUTCOME_SUPABASE_URL', 'OUTCOME_SUPABASE_PUBLISHABLE_KEY'])
  for (const name of Object.keys(identityEnvironment)) {
    const partial = { ...identityEnvironment }; delete partial[name]
    assert.deepEqual(readHostedIdentityConfiguration(partial), { enabled: false })
  }
})

test('official backend adapter consumes only Clerk SDK same-origin session state', async () => {
  const gateway = createClerkBackendGateway({ environment: identityEnvironment, clerkClientFactory: clerkClientFactory() })
  assert.equal((await gateway.verifySession('sdk-valid')).subject, owner)
  assert.equal(await gateway.verifySession('client-json-token'), null)
  assert.deepEqual(gateway.authenticationOptions, { acceptsToken: 'session_token', authorizedParties: ['https://preview.invalid'] })
})

test('identity-only handler exposes publishable key, verifies owner, denies HP2 data, and never mints session cookies', async () => {
  const runtimeFactory = ({ environment }) => createHostedIdentityRuntime({ environment, clerkClientFactory: clerkClientFactory(), now })
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  const request = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory })

  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/config' }), { status: 200, body: { enabled: true, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false, publishableKey: 'pk_test_synthetic' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session' }), { status: 401, body: { error: 'authentication_required' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=sdk-valid' } }), { status: 200, body: { authenticated: true, owner: true } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=wrong-owner' } }), { status: 403, body: { error: 'owner_mismatch' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/workspace', headers: { cookie: '__session=sdk-valid' } }), { status: 503, body: { error: 'private_workspace_unavailable' } })

  for (const body of [{ sessionToken: 'sdk-valid' }, { sessionToken: 'client-json-token' }]) {
    const callback = await request({ method: 'POST', pathname: '/api/private/auth/callback', origin: 'https://preview.invalid', body })
    assert.deepEqual(callback, { status: 405, body: { error: 'read_only' } })
    assert.equal(callback.headers, undefined)
  }

  const revoked = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory: ({ environment }) => createHostedIdentityRuntime({ environment, clerkClientFactory: clerkClientFactory({ revoked: true }), now }) })
  assert.deepEqual(await revoked({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=sdk-valid' } }), { status: 401, body: { error: 'session_revoked' } })
  const unavailable = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory: ({ environment }) => createHostedIdentityRuntime({ environment, clerkClientFactory: clerkClientFactory({ unavailable: true }), now }) })
  assert.deepEqual(await unavailable({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=sdk-valid' } }), { status: 503, body: { error: 'authentication_unavailable' } })
})

test('default production creation point selects complete HP1 and fails partial or construction error closed', async () => {
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  const officialDefault = createStableHostRequestHandler({ environment: identityEnvironment })
  assert.equal((await officialDefault({ method: 'GET', pathname: '/api/private/config' })).body.enabled, true)
  const selected = createStableHostRequestHandler({ environment: identityEnvironment, clerkClientFactory: clerkClientFactory() })
  assert.equal((await selected({ method: 'GET', pathname: '/api/private/config' })).body.enabled, true)

  const partial = { ...identityEnvironment }; delete partial.OUTCOME_CLERK_SECRET_KEY
  for (const request of [
    createStableHostRequestHandler({ environment: partial, clerkClientFactory: clerkClientFactory() }),
    createStableHostRequestHandler({ environment: identityEnvironment, clerkClientFactory: () => { throw new Error('construction failed') } }),
  ]) {
    assert.equal((await request({ method: 'GET', pathname: '/api/private/config' })).body.enabled, false)
    assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session' }), { status: 401, body: { error: 'authentication_required' } })
    assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/workspace' }), { status: 401, body: { error: 'authentication_required' } })
    assert.deepEqual(await request({ method: 'POST', pathname: '/api/private/auth/login' }), { status: 405, body: { error: 'read_only' } })
  }
})
