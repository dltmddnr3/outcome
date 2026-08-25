import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import test from 'node:test'
import { TokenVerificationError, TokenVerificationErrorReason } from '@clerk/backend/errors'
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { finalizeDeploymentSnapshot } from '../scripts/finalize-stable-snapshot.mjs'
import {
  HOSTED_DATA_ENV,
  HOSTED_IDENTITY_ENV,
  createClerkBackendGateway,
  createHostedIdentityRuntime,
  createSealedPackageStore,
  readHostedDataConfiguration,
  readHostedIdentityConfiguration,
  safeClerkAuthReason,
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

const verificationError = (reason) => new TokenVerificationError({ message: 'synthetic verification failure', reason })
const tokenVerifier = async (token) => {
  if (token === 'sdk-valid') return claims()
  if (token === 'wrong-owner') return claims({ subject: 'other-owner' })
  if (token === 'session-mismatch') return claims({ sessionId: 'other-session' })
  if (token === 'missing-sub') return { ...claims(), sub: undefined }
  if (token === 'missing-sid') return { ...claims(), sid: undefined }
  if (token === 'missing-iat') return { ...claims(), iat: undefined }
  if (token === 'missing-exp') return { ...claims(), exp: undefined }
  if (token === 'wrong-azp') throw verificationError(TokenVerificationErrorReason.TokenInvalidAuthorizedParties)
  if (token === 'invalid-signature') throw verificationError(TokenVerificationErrorReason.TokenInvalidSignature)
  if (token === 'expired') throw verificationError(TokenVerificationErrorReason.TokenExpired)
  if (token === 'verifier-outage') throw new Error('provider unavailable')
  throw verificationError(TokenVerificationErrorReason.TokenInvalid)
}
const clerkClientFactory = ({ unavailable = false, revoked = false } = {}) => () => ({
  sessions: {
    async getSession(sessionId) {
      if (unavailable) throw new Error('provider unavailable')
      return { id: sessionId, status: revoked ? 'revoked' : 'active', userId: sessionId === 'other-session' ? 'other-owner' : owner }
    },
    async revokeSession() { return { status: 'revoked' } },
    async getSessionList() { return { data: [{ id: 'synthetic-session', userId: owner }] } },
  },
})

test('sealed Package store accepts exactly the server-owned two-project snapshot and rejects drift', () => {
  const store = createSealedPackageStore({ sealedSnapshot: deploymentFixture, ownerSubject: owner })
  assert.deepEqual(store.membershipsForSubject(owner), [{ workspaceId: 'account-only-preview', subject: owner, role: 'owner-viewer', state: 'active' }])
  assert.deepEqual(store.membershipsForSubject('other-owner'), [])
  assert.deepEqual(store.projectsForWorkspace('account-only-preview').map((project) => project.id), ['cherry-note', 'outcome'])
  assert.deepEqual(store.workspaceProjection('account-only-preview').projects.map((project) => project.project.id), ['cherry-note', 'outcome'])
  assert.equal(store.workspaceProjection('other-workspace'), null)
  for (const projects of [deploymentFixture.projects.slice(0, 1), [...deploymentFixture.projects, { project: { id: 'forged', name: 'Forged' } }], deploymentFixture.projects.map((project) => ({ ...project, project: { ...project.project, id: 'unknown' } }))]) {
    assert.throws(() => createSealedPackageStore({ sealedSnapshot: { projects }, ownerSubject: owner }), /sealed_package_snapshot_invalid/)
  }
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

test('official backend adapter verifies an explicit token with pinned secret and authorized party', async () => {
  const verifierCalls = []
  const recordingVerifier = async (token, options) => { verifierCalls.push({ token, options }); return claims() }
  const gateway = createClerkBackendGateway({ environment: identityEnvironment, clerkClientFactory: clerkClientFactory(), tokenVerifier: recordingVerifier })
  assert.equal((await gateway.verifySession('sdk-valid')).subject, owner)
  assert.deepEqual(verifierCalls, [{ token: 'sdk-valid', options: { secretKey: 'sk_test_synthetic', authorizedParties: ['https://preview.invalid'] } }])
  assert.deepEqual(gateway.authenticationOptions, { acceptsToken: 'session_token', authorizedParties: ['https://preview.invalid'] })

  for (const token of ['missing-sub', 'missing-sid', 'missing-iat', 'missing-exp']) {
    const incomplete = createClerkBackendGateway({ environment: identityEnvironment, clerkClientFactory: clerkClientFactory(), tokenVerifier: async () => tokenVerifier(token) })
    assert.equal(await incomplete.verifySession(token), null)
  }
  for (const [token, reason] of [['invalid-signature', TokenVerificationErrorReason.TokenInvalidSignature], ['wrong-azp', TokenVerificationErrorReason.TokenInvalidAuthorizedParties]]) {
    const invalid = createClerkBackendGateway({ environment: identityEnvironment, clerkClientFactory: clerkClientFactory(), tokenVerifier })
    await assert.rejects(() => invalid.verifySession(token), (error) => error.code === 'authentication_required' && error.status === 401 && error.sdkReason === reason)
  }
})

test('identity-only account mode exposes publishable key, verifies owner, serves exactly the sealed projects, and never mints session cookies', async () => {
  const runtimeFactory = ({ environment, sealedSnapshot }) => createHostedIdentityRuntime({ environment, sealedSnapshot, clerkClientFactory: clerkClientFactory(), tokenVerifier, now })
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  const request = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory })

  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/config' }), { status: 200, body: { enabled: true, access: 'private_read_only', providers: [{ id: 'google', mode: 'primary' }, { id: 'apple', mode: 'linked_only' }, { id: 'email_code', mode: 'fallback_recovery' }], sessionMaximumDays: 7, completionAuthority: false, publishableKey: 'pk_test_synthetic' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session' }), { status: 401, body: { error: 'authentication_required' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=sdk-valid' } }), { status: 200, body: { authenticated: true, owner: true } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer sdk-valid' } }), { status: 200, body: { authenticated: true, owner: true } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer invalid token', cookie: '__session=sdk-valid' } }), { status: 401, body: { error: 'authentication_required' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=wrong-owner' } }), { status: 403, body: { error: 'owner_mismatch' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer session-mismatch' } }), { status: 401, body: { error: 'session_revoked' } })
  for (const token of ['invalid-signature', 'wrong-azp', 'expired', 'missing-sub', 'missing-sid', 'missing-iat', 'missing-exp']) {
    assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: `Bearer ${token}` } }), { status: 401, body: { error: 'authentication_required' } })
  }
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer verifier-outage' } }), { status: 503, body: { error: 'authentication_unavailable' } })
  for (const headers of [{ cookie: '__session=sdk-valid' }, { authorization: 'Bearer sdk-valid' }]) {
    const workspace = await request({ method: 'GET', pathname: '/api/private/workspace', headers })
    assert.equal(workspace.status, 200)
    assert.deepEqual(workspace.body.workspace.projects.map((project) => project.project.id).sort(), ['cherry-note', 'outcome'])
    assert.deepEqual(workspace.body.workspace.dashboard.projects.map((project) => project.project.id).sort(), ['cherry-note', 'outcome'])
    assert.equal(workspace.body.workspace.completionAuthority, false)
  }
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/private/workspace?project=forged', headers: { authorization: 'Bearer sdk-valid' } }), { status: 404, body: { error: 'not_found' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/dashboard' }), { status: 404, body: { error: 'not_found' } })
  assert.deepEqual(await request({ method: 'GET', pathname: '/api/dashboard/cherry-note' }), { status: 404, body: { error: 'not_found' } })

  for (const body of [{ sessionToken: 'sdk-valid' }, { sessionToken: 'client-json-token' }]) {
    const callback = await request({ method: 'POST', pathname: '/api/private/auth/callback', origin: 'https://preview.invalid', body })
    assert.deepEqual(callback, { status: 405, body: { error: 'read_only' } })
    assert.equal(callback.headers, undefined)
  }

  const revoked = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory: ({ environment, sealedSnapshot }) => createHostedIdentityRuntime({ environment, sealedSnapshot, clerkClientFactory: clerkClientFactory({ revoked: true }), tokenVerifier, now }) })
  assert.deepEqual(await revoked({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=sdk-valid' } }), { status: 401, body: { error: 'session_revoked' } })
  assert.deepEqual(await revoked({ method: 'GET', pathname: '/api/private/workspace', headers: { cookie: '__session=sdk-valid' } }), { status: 401, body: { error: 'session_revoked' } })
  const unavailable = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory: ({ environment, sealedSnapshot }) => createHostedIdentityRuntime({ environment, sealedSnapshot, clerkClientFactory: clerkClientFactory({ unavailable: true }), tokenVerifier, now }) })
  assert.deepEqual(await unavailable({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=sdk-valid' } }), { status: 503, body: { error: 'authentication_unavailable' } })
})

test('default production creation point selects complete HP1 and fails partial or construction error closed', async () => {
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  const officialDefault = createStableHostRequestHandler({ environment: identityEnvironment })
  assert.equal((await officialDefault({ method: 'GET', pathname: '/api/private/config' })).body.enabled, true)
  const currentTokenVerifier = async () => ({ ...claims(), iat: Math.floor(Date.now() / 1_000) - 1, exp: Math.floor(Date.now() / 1_000) + 60 })
  const selected = createStableHostRequestHandler({ environment: identityEnvironment, clerkClientFactory: clerkClientFactory(), clerkTokenVerifier: currentTokenVerifier })
  assert.equal((await selected({ method: 'GET', pathname: '/api/private/config' })).body.enabled, true)
  assert.deepEqual(await selected({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer sdk-valid' } }), { status: 200, body: { authenticated: true, owner: true } })

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

test('Vercel rewrite preserves forged private selector queries for fail-closed routing', async () => {
  const { requestPath } = await import('../api/index.mjs')
  assert.equal(requestPath({ url: '/api?path=private%2Fworkspace&project=forged', query: { path: 'private/workspace', project: 'forged' } }), '/api/private/workspace?project=forged')
  assert.equal(requestPath({ url: '/api/private/workspace?project=forged', query: {} }), '/api/private/workspace?project=forged')
})

test('private session diagnostics expose only auth-source and safe error enums', async () => {
  const { createStableHostRequestHandler } = await import('../api/index.mjs')
  const diagnostics = []
  const logger = { info: (...items) => diagnostics.push(items) }
  const runtimeFactory = ({ environment, sealedSnapshot }) => createHostedIdentityRuntime({ environment, sealedSnapshot, clerkClientFactory: clerkClientFactory(), tokenVerifier, now })
  const request = createStableHostRequestHandler({ environment: identityEnvironment, runtimeFactory, logger })
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const jwt = `${encoded({ alg: 'RS256', kid: 'sensitive-key-id' })}.${encoded({ azp: identityEnvironment.OUTCOME_PRIVATE_ALLOWED_ORIGIN, exp: 4_102_444_800, iat: 1, sub: 'sensitive-subject', sid: 'sensitive-session' })}.sensitive-signature`
  const invalidClaimsJwt = `${encoded({ alg: 'RS256' })}.${encoded({ azp: 'https://wrong-origin.invalid', exp: 1, iat: 4_102_444_800 })}.other-signature`

  assert.equal((await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: 'Bearer secret-diagnostic-token' } })).status, 401)
  assert.equal((await request({ method: 'GET', pathname: '/api/private/session', headers: { cookie: '__session=secret-cookie-token' } })).status, 401)
  assert.equal((await request({ method: 'GET', pathname: '/api/private/session' })).status, 401)
  assert.equal((await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: `Bearer ${jwt}` } })).status, 401)
  assert.equal((await request({ method: 'GET', pathname: '/api/private/session', headers: { authorization: `Bearer ${invalidClaimsJwt}` } })).status, 401)

  assert.deepEqual(diagnostics, [
    ['outcome_private_session', { authSource: 'bearer', tokenShape: 'other', sdkReason: 'token-invalid', errorCode: 'authentication_required', status: 401 }],
    ['outcome_private_session', { authSource: 'cookie', tokenShape: 'other', sdkReason: 'token-invalid', errorCode: 'authentication_required', status: 401 }],
    ['outcome_private_session', { authSource: 'none', tokenShape: 'other', errorCode: 'authentication_required', status: 401 }],
    ['outcome_private_session', { authSource: 'bearer', tokenShape: 'jwt3', azpMatchesConfiguredOrigin: true, expFuture: true, iatNotFuture: true, sdkReason: 'token-invalid', errorCode: 'authentication_required', status: 401 }],
    ['outcome_private_session', { authSource: 'bearer', tokenShape: 'jwt3', azpMatchesConfiguredOrigin: false, expFuture: false, iatNotFuture: false, sdkReason: 'token-invalid', errorCode: 'authentication_required', status: 401 }],
  ])
  const serialized = JSON.stringify(diagnostics)
  assert.doesNotMatch(serialized, /sensitive|secret|signature|preview\.invalid|wrong-origin|4102444800|authorization|subject|session[_-]?id|kid|\bsub\b|\bsid\b|\bazp\b|\bexp\b|\biat\b/i)

  for (const reason of Object.values(TokenVerificationErrorReason)) assert.equal(safeClerkAuthReason(reason), reason)

  const clerkDiagnostics = []
  const withReason = (reason) => createStableHostRequestHandler({
    environment: identityEnvironment,
    runtimeFactory: ({ environment, sealedSnapshot }) => createHostedIdentityRuntime({
      environment,
      sealedSnapshot,
      clerkClientFactory: clerkClientFactory(),
      tokenVerifier: async () => { throw verificationError(reason) },
      now,
    }),
    logger: { info: (...items) => clerkDiagnostics.push(items) },
  })
  assert.equal((await withReason('token-invalid-authorized-parties')({ method: 'GET', pathname: '/api/private/session', headers: { authorization: `Bearer ${jwt}` } })).status, 401)
  assert.equal((await withReason('sensitive-unlisted-reason')({ method: 'GET', pathname: '/api/private/session', headers: { authorization: `Bearer ${jwt}` } })).status, 401)
  assert.equal(clerkDiagnostics[0][1].sdkReason, 'token-invalid-authorized-parties')
  assert.equal(Object.hasOwn(clerkDiagnostics[1][1], 'sdkReason'), false)
  assert.doesNotMatch(JSON.stringify(clerkDiagnostics), /sensitive|secret|signature|preview\.invalid|wrong-origin|4102444800|authorization|subject|session[_-]?id|kid|\bsub\b|\bsid\b|\bazp\b|\bexp\b|\biat\b/i)
})
