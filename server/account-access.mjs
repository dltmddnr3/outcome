import { createAccountModelV2Projection } from './account-model-v2-projection.mjs'

const DAY_MS = 24 * 60 * 60 * 1000
const PRIVATE_PROJECT_ALLOWLIST = Object.freeze(['cherry-note', 'outcome'])
export const DEFAULT_PACKAGE_PAYLOAD_LIMIT_BYTES = 524_288

export const ACCOUNT_ACCESS_ENV = Object.freeze({
  clerkPublishableKey: 'OUTCOME_CLERK_PUBLISHABLE_KEY',
  clerkSecretKey: 'OUTCOME_CLERK_SECRET_KEY',
  ownerSubject: 'OUTCOME_OWNER_SUBJECT',
  privateSurfaceEnabled: 'OUTCOME_PRIVATE_SURFACE_ENABLED',
  rollbackDeployment: 'OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT',
})

export class AccountAccessError extends Error {
  constructor(code, status = 403) {
    super(code)
    this.name = 'AccountAccessError'
    this.code = code
    this.status = status
  }
}

const clone = (value) => structuredClone(value)

export function createInMemoryAccountStore(seed = {}) {
  const workspaces = clone(seed.workspaces ?? [])
  const memberships = clone(seed.memberships ?? [])
  const projects = clone(seed.projects ?? [])
  const snapshots = []
  const currentPointers = new Map()
  const activity = []
  const deletions = []

  return {
    membershipsForSubject(subject) { return memberships.filter((item) => item.subject === subject).map(clone) },
    workspace(id) { const value = workspaces.find((item) => item.id === id); return value ? clone(value) : null },
    projectsForWorkspace(workspaceId) { return projects.filter((item) => item.workspaceId === workspaceId).map(clone) },
    appendSnapshot(input) {
      if (!input.valid) throw new Error('snapshot_invalid')
      if (!/^[a-f0-9]{64}$/i.test(input.sourceDigest ?? '')) throw new Error('snapshot_digest_invalid')
      const project = projects.find((item) => item.id === input.projectId && item.workspaceId === input.workspaceId && item.state === 'active')
      if (!project) throw new Error('project_binding_invalid')
      const value = Object.freeze({
        id: `snapshot-${snapshots.length + 1}`,
        schemaVersion: 1,
        projectId: input.projectId,
        workspaceId: input.workspaceId,
        sourceDigest: input.sourceDigest,
        observedAt: input.observedAt,
        capturedAt: input.capturedAt,
        projection: clone(input.projection),
        validationState: 'valid',
      })
      snapshots.push(value)
      currentPointers.set(input.projectId, value.id)
      return clone(value)
    },
    currentSnapshot(projectId) {
      const id = currentPointers.get(projectId)
      const value = snapshots.find((item) => item.id === id)
      return value ? clone(value) : null
    },
    recordSessionActivity(value) { activity.push(clone(value)) },
    exportWorkspace(workspaceId) {
      return {
        schemaVersion: 1,
        workspace: clone(workspaces.find((item) => item.id === workspaceId) ?? null),
        memberships: memberships.filter((item) => item.workspaceId === workspaceId).map(({ subject: _subject, ...item }) => clone(item)),
        projects: projects.filter((item) => item.workspaceId === workspaceId).map(({ projection: _projection, ...item }) => clone(item)),
        snapshots: snapshots.filter((item) => item.workspaceId === workspaceId).map(clone),
        deletionJobs: deletions.filter((item) => item.workspaceId === workspaceId).map(clone),
      }
    },
    requestDeletion({ workspaceId, requestedAt }) {
      const purgeAfter = new Date(Date.parse(requestedAt) + 30 * DAY_MS).toISOString()
      const value = { id: `deletion-${deletions.length + 1}`, workspaceId, requestedAt, accessRevokedAt: requestedAt, purgeAfter, state: 'recoverable' }
      deletions.push(value)
      return clone(value)
    },
  }
}

const verifyIdentity = async ({ authProvider, token, ownerSubject, now }) => {
  if (!token) throw new AccountAccessError('authentication_required', 401)
  let identity
  try { identity = await authProvider.verify(token) } catch (error) { if (error instanceof AccountAccessError) throw error; throw new AccountAccessError('authentication_unavailable', 503) }
  if (!identity) throw new AccountAccessError('authentication_required', 401)
  if (identity.revoked) throw new AccountAccessError('session_revoked', 401)
  if (!Number.isFinite(identity.expiresAt) || identity.expiresAt <= now()) throw new AccountAccessError('session_expired', 401)
  if (!Number.isFinite(identity.issuedAt) || identity.issuedAt > now() || now() - identity.issuedAt > 7 * DAY_MS) throw new AccountAccessError('session_expired', 401)
  if (identity.subject !== ownerSubject) throw new AccountAccessError('owner_mismatch', 403)
  return identity
}

export function createAccountAccessService({ authProvider, store, ownerSubject, now = Date.now } = {}) {
  if (!authProvider?.verify || !store || !ownerSubject) throw new Error('account_access_configuration_missing')

  const authenticate = (token) => verifyIdentity({ authProvider, token, ownerSubject, now })
  return {
    authenticationOptions: () => [
      { id: 'google', mode: 'primary' },
      { id: 'apple', mode: 'linked_only' },
      { id: 'email_code', mode: 'fallback_recovery' },
    ],
    async authorizeSignIn({ provider, token } = {}) {
      if (provider === 'google') return { provider, allowed: true, primary: true }
      if (provider === 'email_code') return { provider, allowed: true, recovery: true }
      if (provider !== 'apple') throw new AccountAccessError('provider_not_allowed', 400)
      if (!token) throw new AccountAccessError('apple_link_required', 403)
      const identity = await authenticate(token)
      return identity.linkedProviders?.includes('apple')
        ? { provider, allowed: true }
        : { provider, allowed: false, reason: 'provider_not_linked' }
    },
    authenticate,
    async endSession({ token } = {}) {
      const identity = await authenticate(token)
      if (!authProvider.signOut) throw new AccountAccessError('authentication_unavailable', 503)
      try { await authProvider.signOut({ subject: identity.subject, token }) } catch { throw new AccountAccessError('authentication_unavailable', 503) }
      return { state: 'signed_out' }
    },
    async revokeOwnerSessions({ operatorAuthorized = false } = {}) {
      if (!operatorAuthorized) throw new AccountAccessError('operator_authorization_required', 403)
      if (!authProvider.revokeAll) throw new AccountAccessError('authentication_unavailable', 503)
      try { await authProvider.revokeAll({ subject: ownerSubject }) } catch { throw new AccountAccessError('authentication_unavailable', 503) }
      return { state: 'revoked' }
    },
    async readWorkspace({ token, requestedProjectId } = {}) {
      const identity = await authenticate(token)
      const context = { token, subject: identity.subject }
      const memberships = await store.membershipsForSubject(identity.subject, context)
      if (memberships.length > 1) throw new AccountAccessError('membership_conflict', 403)
      const membership = memberships[0]
      if (!membership || membership.state !== 'active' || membership.role !== 'owner-viewer') throw new AccountAccessError('membership_inactive', 403)
      const workspace = await store.workspace(membership.workspaceId, context)
      if (!workspace || workspace.state !== 'active') throw new AccountAccessError('workspace_inactive', 403)
      const projects = (await store.projectsForWorkspace(workspace.id, context))
        .filter((project) => project.state === 'active' && PRIVATE_PROJECT_ALLOWLIST.includes(project.id))
      if (requestedProjectId && !projects.some((project) => project.id === requestedProjectId)) throw new AccountAccessError('project_access_denied', 403)
      const selected = requestedProjectId ? projects.filter((project) => project.id === requestedProjectId) : projects
      const dashboard = typeof store.workspaceProjection === 'function'
        ? await store.workspaceProjection(workspace.id, context)
        : undefined
      return {
        access: 'private_read_only',
        workspace: { id: workspace.id, role: membership.role },
        projects: selected.map((project) => {
          const modelV2 = createAccountModelV2Projection(project.projection, { observedAt: new Date(now()).toISOString() })
          const projection = clone(project.projection)
          return { ...projection, modelV2 }
        }),
        ...(dashboard ? { dashboard: clone(dashboard) } : {}),
        session: { expiresAt: new Date(Math.min(identity.expiresAt, now() + 7 * DAY_MS)).toISOString(), revocable: true },
        completionAuthority: false,
      }
    },
  }
}

const sanitizedIncident = (value, detectedAt) => ({ severity: value.severity, reasonCode: value.reasonCode, detectedAt })

export function createOperationsGuard({ now = Date.now, privateSurfaceEnabled = false, rollbackDeployment = null, payloadLimitBytes = DEFAULT_PACKAGE_PAYLOAD_LIMIT_BYTES } = {}) {
  const windows = new Map()
  const syncKeys = new Set()
  const activeProjects = new Set()
  const syncWindows = new Map()
  return {
    allowRequest({ path, source }) {
      if (!path.startsWith('/api/private/')) return { allowed: true }
      const key = `${source}:${Math.floor(now() / 600_000)}`
      const count = windows.get(key) ?? 0
      if (count >= 120) return { allowed: false, retryAfter: 600 }
      windows.set(key, count + 1)
      return { allowed: true }
    },
    beginSync({ projectId, idempotencyKey, payloadBytes = 0 }) {
      if (!Number.isFinite(payloadBytes) || payloadBytes < 0 || payloadBytes > payloadLimitBytes) return { accepted: false, reason: 'payload_too_large' }
      const key = `${projectId}:${idempotencyKey}`
      if (syncKeys.has(key)) return { accepted: false, reason: 'duplicate' }
      if (activeProjects.has(projectId)) return { accepted: false, reason: 'concurrent' }
      const windowKey = `${projectId}:${Math.floor(now() / 3_600_000)}`
      const attempts = syncWindows.get(windowKey) ?? 0
      if (attempts >= 6) return { accepted: false, reason: 'rate_limited' }
      syncWindows.set(windowKey, attempts + 1)
      syncKeys.add(key); activeProjects.add(projectId)
      return { accepted: true }
    },
    finishSync(projectId) { activeProjects.delete(projectId) },
    costState(cost) {
      if (cost >= 75) return 'stop_new_work'
      if (cost >= 60) return 'restrict_ingestion'
      if (cost >= 40) return 'notify'
      return 'normal'
    },
    incidentReceipt(value) { return sanitizedIncident(value, new Date(now()).toISOString()) },
    rollbackBinding({ trigger }) { return { privateSurfaceEnabled: false, deployment: rollbackDeployment, trigger } },
    privateSurfaceEnabled: Boolean(privateSurfaceEnabled),
  }
}

export const accountAccessPublicContract = Object.freeze({
  enabled: false,
  access: 'private_read_only',
  providers: [
    { id: 'google', mode: 'primary' },
    { id: 'apple', mode: 'linked_only' },
    { id: 'email_code', mode: 'fallback_recovery' },
  ],
  projects: [...PRIVATE_PROJECT_ALLOWLIST],
  sessionMaximumDays: 7,
  completionAuthority: false,
})

export const accountAccessOperationsContract = Object.freeze({
  metrics: ['availability', 'http_5xx', 'authentication_outcome', 'authorization_denial', 'snapshot_age', 'sync_failure', 'validation_conflict', 'receipt_parity', 'database_failure', 'migration_version', 'restore_receipt_age', 'public_mutation_status', 'prohibited_disclosure', 'daily_provider_usage', 'projected_monthly_cost'],
  alerts: { sev1: ['private_data_exposure', 'cross_workspace_access', 'secret_disclosure', 'public_mutation_not_405', 'receipt_mismatch'], sev2: ['five_consecutive_probe_failures', 'three_consecutive_sync_failures', 'snapshot_age_over_24h', 'database_unavailable', 'restore_evidence_missing'] },
  costUsd: { notify: 40, restrictIngestion: 60, stopNewWork: 75 },
})
