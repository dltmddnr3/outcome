import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import fixture from '../test/fixtures/account-access.json' with { type: 'json' }
import {
  ACCOUNT_ACCESS_ENV,
  AccountAccessError,
  DEFAULT_PACKAGE_PAYLOAD_LIMIT_BYTES,
  accountAccessOperationsContract,
  createAccountAccessService,
  createInMemoryAccountStore,
  createOperationsGuard,
} from './account-access.mjs'

const now = () => Date.parse('2026-08-25T00:00:00.000Z')
const owner = 'synthetic-owner'
const workspace = 'workspace-cherry'
const baseStore = () => createInMemoryAccountStore(fixture)

const auth = ({ subject = owner, issuedAt = now(), expiresAt = now() + 60_000, revoked = false, linked = ['google', 'email_code'] } = {}) => ({
  verify: async (token) => {
    if (token === 'outage') throw new Error('provider_down')
    if (token !== 'valid') return null
    return { subject, issuedAt, expiresAt, revoked, linkedProviders: linked }
  },
})

test('named runtime contract contains no secret defaults and exposes approved provider order', () => {
  assert.deepEqual(ACCOUNT_ACCESS_ENV, {
    clerkPublishableKey: 'OUTCOME_CLERK_PUBLISHABLE_KEY',
    clerkSecretKey: 'OUTCOME_CLERK_SECRET_KEY',
    ownerSubject: 'OUTCOME_OWNER_SUBJECT',
    privateSurfaceEnabled: 'OUTCOME_PRIVATE_SURFACE_ENABLED',
    rollbackDeployment: 'OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT',
  })
  assert.equal(JSON.stringify(ACCOUNT_ACCESS_ENV).includes('VITE_'), false)
})

test('owner session resolves membership server-side and returns only Cherry Note and OUTCOME', async () => {
  const service = createAccountAccessService({ authProvider: auth(), store: baseStore(), ownerSubject: owner, now })
  const result = await service.readWorkspace({ token: 'valid', requestedWorkspaceId: 'forged', requestedProjectId: null })
  assert.equal(result.workspace.id, workspace)
  assert.deepEqual(result.projects.map((project) => project.project.id), ['cherry-note', 'outcome'])
  assert.equal(JSON.stringify(result).includes('nol-ax'), false)
  assert.deepEqual(result.projects.map((project) => [project.project.id, project.modelV2.modelVersion, project.modelV2.state]), [['cherry-note', 2, 'no_active_work'], ['outcome', 2, 'no_active_work']])
  assert.equal(result.projects.every((project) => project.modelV2.project.id === project.project.id), true)
})

test('bridge authority is freshly server-derived, bearer-free and sorted', async () => {
  const service = createAccountAccessService({ authProvider: auth(), store: baseStore(), ownerSubject: owner, now })
  const authority = await service.resolveBridgeAuthority({ token: 'valid' })
  assert.match(authority.account_ref, /^[a-f0-9]{64}$/)
  assert.equal(authority.workspace_id, workspace)
  assert.deepEqual(authority.project_ids, ['cherry-note', 'outcome'])
  assert.equal(JSON.stringify(authority).includes('valid'), false)
  assert.equal(JSON.stringify(authority).includes(owner), false)
})

test('hostile project projection is rejected before traps and exposes no workspace payload', async () => {
  let traps = 0
  const projection = new Proxy({}, { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  const store = {
    membershipsForSubject: async () => [{ subject: owner, workspaceId: workspace, role: 'owner-viewer', state: 'active' }],
    workspace: async () => ({ id: workspace, state: 'active' }),
    projectsForWorkspace: async () => [{ id: 'outcome', workspaceId: workspace, state: 'active', projection }],
  }
  const service = createAccountAccessService({ authProvider: auth(), store, ownerSubject: owner, now })
  await assert.rejects(() => service.readWorkspace({ token: 'valid' }), /account_model_v2_proxy_forbidden/)
  assert.equal(traps, 0)
})

for (const [name, options, request, code] of [
  ['anonymous', {}, {}, 'authentication_required'],
  ['wrong owner', { subject: 'other_subject' }, { token: 'valid' }, 'owner_mismatch'],
  ['expired', { expiresAt: now() - 1 }, { token: 'valid' }, 'session_expired'],
  ['revoked', { revoked: true }, { token: 'valid' }, 'session_revoked'],
]) test(`${name} private access fails closed`, async () => {
  const service = createAccountAccessService({ authProvider: auth(options), store: baseStore(), ownerSubject: owner, now })
  await assert.rejects(() => service.readWorkspace(request), (error) => error instanceof AccountAccessError && error.code === code)
})

test('forged project, stale membership, cross-workspace binding, conflict and provider outage deny without existence leakage', async () => {
  const cases = [
    [baseStore(), { token: 'valid', requestedProjectId: 'unregistered-probe' }, 'project_access_denied'],
    [createInMemoryAccountStore({ workspaces: [{ id: workspace, state: 'active' }], memberships: [{ subject: owner, workspaceId: workspace, role: 'owner-viewer', state: 'revoked' }], projects: [] }), { token: 'valid' }, 'membership_inactive'],
    [createInMemoryAccountStore({ workspaces: [{ id: workspace, state: 'active' }], memberships: [{ subject: owner, workspaceId: workspace, role: 'owner-viewer', state: 'active' }], projects: [{ id: 'outcome', workspaceId: 'workspace_other', state: 'active', projection: {} }] }), { token: 'valid', requestedProjectId: 'outcome' }, 'project_access_denied'],
    [createInMemoryAccountStore({ workspaces: [{ id: workspace, state: 'active' }], memberships: [{ subject: owner, workspaceId: workspace, role: 'owner-viewer', state: 'active' }, { subject: owner, workspaceId: 'workspace_other', role: 'owner-viewer', state: 'active' }], projects: [] }), { token: 'valid' }, 'membership_conflict'],
  ]
  for (const [store, request, code] of cases) {
    const service = createAccountAccessService({ authProvider: auth(), store, ownerSubject: owner, now })
    await assert.rejects(() => service.readWorkspace(request), (error) => error.code === code && error.status === 403)
  }
  const unavailable = createAccountAccessService({ authProvider: auth(), store: baseStore(), ownerSubject: owner, now })
  await assert.rejects(() => unavailable.readWorkspace({ token: 'outage' }), (error) => error.code === 'authentication_unavailable' && error.status === 503)
})

test('Google is primary, Apple requires an authenticated linked owner, and email code is recovery fallback', async () => {
  const service = createAccountAccessService({ authProvider: auth(), store: baseStore(), ownerSubject: owner, now })
  assert.deepEqual(service.authenticationOptions(), [
    { id: 'google', mode: 'primary' },
    { id: 'apple', mode: 'linked_only' },
    { id: 'email_code', mode: 'fallback_recovery' },
  ])
  await assert.rejects(() => service.authorizeSignIn({ provider: 'apple' }), (error) => error.code === 'apple_link_required')
  assert.deepEqual(await service.authorizeSignIn({ provider: 'apple', token: 'valid' }), { provider: 'apple', allowed: false, reason: 'provider_not_linked' })
  const linked = createAccountAccessService({ authProvider: auth({ linked: ['google', 'apple', 'email_code'] }), store: baseStore(), ownerSubject: owner, now })
  assert.deepEqual(await linked.authorizeSignIn({ provider: 'apple', token: 'valid' }), { provider: 'apple', allowed: true })
  assert.deepEqual(await service.authorizeSignIn({ provider: 'email_code' }), { provider: 'email_code', allowed: true, recovery: true })
})

test('seven-day session maximum, logout and operator revocation transitions fail closed', async () => {
  const transitions = []
  const provider = { ...auth(), signOut: async (value) => transitions.push(['sign_out', value.subject]), revokeAll: async (value) => transitions.push(['revoke', value.subject]) }
  const service = createAccountAccessService({ authProvider: provider, store: baseStore(), ownerSubject: owner, now })
  assert.deepEqual(await service.endSession({ token: 'valid' }), { state: 'signed_out' })
  await assert.rejects(() => service.revokeOwnerSessions(), (error) => error.code === 'operator_authorization_required')
  assert.deepEqual(await service.revokeOwnerSessions({ operatorAuthorized: true }), { state: 'revoked' })
  assert.deepEqual(transitions, [['sign_out', owner], ['revoke', owner]])
  const expiredByMaximum = createAccountAccessService({ authProvider: auth({ issuedAt: now() - 7 * 86_400_000 - 1, expiresAt: now() + 60_000 }), store: baseStore(), ownerSubject: owner, now })
  await assert.rejects(() => expiredByMaximum.readWorkspace({ token: 'valid' }), (error) => error.code === 'session_expired')
})

test('append-only snapshots move current pointer only after validation and activity never changes evidence time', () => {
  const store = baseStore()
  const first = store.appendSnapshot({ projectId: 'outcome', workspaceId: workspace, sourceDigest: 'a'.repeat(64), observedAt: '2026-08-24T23:00:00.000Z', capturedAt: '2026-08-24T23:01:00.000Z', projection: { safe: true }, valid: true })
  assert.equal(store.currentSnapshot('outcome').id, first.id)
  assert.throws(() => store.appendSnapshot({ projectId: 'outcome', workspaceId: workspace, sourceDigest: 'b'.repeat(64), observedAt: '2026-08-25T00:00:00.000Z', capturedAt: '2026-08-25T00:01:00.000Z', projection: {}, valid: false }), /snapshot_invalid/)
  assert.equal(store.currentSnapshot('outcome').id, first.id)
  store.recordSessionActivity({ projectId: 'outcome', at: '2026-08-25T01:00:00.000Z' })
  assert.equal(store.currentSnapshot('outcome').observedAt, '2026-08-24T23:00:00.000Z')
  assert.equal(store.exportWorkspace(workspace).secrets, undefined)
  const deletion = store.requestDeletion({ workspaceId: workspace, requestedAt: '2026-08-25T00:00:00.000Z' })
  assert.equal(deletion.purgeAfter, '2026-09-24T00:00:00.000Z')
})

test('operations guard enforces path rate, sync idempotency, cost stops, redaction and rollback', () => {
  const guard = createOperationsGuard({ now, privateSurfaceEnabled: true, rollbackDeployment: 'last-verified' })
  for (let index = 0; index < 120; index += 1) assert.equal(guard.allowRequest({ path: '/api/private/workspace', source: '203.0.113.1' }).allowed, true)
  assert.deepEqual(guard.allowRequest({ path: '/api/private/workspace', source: '203.0.113.1' }), { allowed: false, retryAfter: 600 })
  assert.equal(guard.allowRequest({ path: '/assets/app.js', source: '203.0.113.1' }).allowed, true)
  assert.equal(guard.beginSync({ projectId: 'outcome', idempotencyKey: 'sync-1' }).accepted, true)
  assert.equal(guard.beginSync({ projectId: 'outcome', idempotencyKey: 'sync-1' }).reason, 'duplicate')
  assert.equal(guard.beginSync({ projectId: 'outcome', idempotencyKey: 'sync-2' }).reason, 'concurrent')
  assert.deepEqual([39, 40, 60, 75].map((cost) => guard.costState(cost)), ['normal', 'notify', 'restrict_ingestion', 'stop_new_work'])
  const incident = guard.incidentReceipt({ severity: 'SEV1', token: 'secret', email: 'owner@example.com', reasonCode: 'public_mutation_not_405' })
  assert.deepEqual(incident, { severity: 'SEV1', reasonCode: 'public_mutation_not_405', detectedAt: '2026-08-25T00:00:00.000Z' })
  assert.deepEqual(guard.rollbackBinding({ trigger: 'isolation_failed' }), { privateSurfaceEnabled: false, deployment: 'last-verified', trigger: 'isolation_failed' })
  for (let index = 0; index < 5; index += 1) { guard.finishSync('cherry-note'); assert.equal(guard.beginSync({ projectId: 'cherry-note', idempotencyKey: `sync-${index}` }).accepted, true) }
  guard.finishSync('cherry-note')
  assert.equal(guard.beginSync({ projectId: 'cherry-note', idempotencyKey: 'sync-sixth' }).accepted, true)
  guard.finishSync('cherry-note')
  assert.equal(guard.beginSync({ projectId: 'cherry-note', idempotencyKey: 'sync-seventh' }).reason, 'rate_limited')
  assert.equal(guard.beginSync({ projectId: 'outcome-large', idempotencyKey: 'large', payloadBytes: DEFAULT_PACKAGE_PAYLOAD_LIMIT_BYTES + 1 }).reason, 'payload_too_large')
  assert.equal(accountAccessOperationsContract.costUsd.stopNewWork, 75)
  assert.equal(accountAccessOperationsContract.metrics.includes('public_mutation_status'), true)
})

test('migration pins deny-by-default RLS, append-only snapshots and two-workspace synthetic proof surface', () => {
  const sql = readFileSync(new URL('../supabase/migrations/202608250001_account_access_foundation.sql', import.meta.url), 'utf8')
  for (const fragment of ['enable row level security', 'force row level security', 'workspace_memberships', 'project_bindings', 'package_snapshots', 'deployment_receipts', 'security_events', 'deletion_jobs', 'current_snapshot_id', 'outcome_workspace_project_visible']) assert.match(sql.toLowerCase(), new RegExp(fragment))
  assert.doesNotMatch(sql, /service_role|owner@example|clerk_/i)
})
