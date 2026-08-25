import { AccountAccessError, createAccountAccessService } from './account-access.mjs'
import { createClerkClient } from '@clerk/backend'
import { TokenVerificationErrorReason } from '@clerk/backend/errors'

const DAY_MS = 86_400_000
const ALLOWED_PROJECTS = Object.freeze(['cherry-note', 'outcome'])
const CLERK_AUTH_REASONS = new Set([
  ...Object.values(TokenVerificationErrorReason),
  'client-uat-but-no-session-token',
  'dev-browser-missing',
  'dev-browser-sync',
  'primary-responds-to-syncing',
  'primary-domain-cross-origin-sync',
  'satellite-needs-syncing',
  'session-token-and-uat-missing',
  'session-token-missing',
  'session-token-expired',
  'session-token-iat-before-client-uat',
  'session-token-nbf',
  'session-token-iat-in-the-future',
  'session-token-but-no-client-uat',
  'active-organization-mismatch',
  'token-type-mismatch',
  'unexpected-error',
])
export const safeClerkAuthReason = (value) => typeof value === 'string' && CLERK_AUTH_REASONS.has(value) ? value : undefined

export const HOSTED_IDENTITY_ENV = Object.freeze({
  privateSurfaceEnabled: 'OUTCOME_PRIVATE_SURFACE_ENABLED',
  clerkPublishableKey: 'OUTCOME_CLERK_PUBLISHABLE_KEY',
  clerkSecretKey: 'OUTCOME_CLERK_SECRET_KEY',
  ownerSubject: 'OUTCOME_OWNER_SUBJECT',
  privateAllowedOrigin: 'OUTCOME_PRIVATE_ALLOWED_ORIGIN',
  rollbackDeployment: 'OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT',
})

export const HOSTED_DATA_ENV = Object.freeze({
  supabaseUrl: 'OUTCOME_SUPABASE_URL',
  supabasePublishableKey: 'OUTCOME_SUPABASE_PUBLISHABLE_KEY',
})

export const HOSTED_PREVIEW_ENV = Object.freeze({ ...HOSTED_IDENTITY_ENV, ...HOSTED_DATA_ENV })

const readBindings = (environment, inventory = HOSTED_PREVIEW_ENV) => Object.fromEntries(Object.entries(inventory).map(([key, name]) => [key, typeof environment?.[name] === 'string' ? environment[name].trim() : '']))
const validHttps = (value) => { try { return new URL(value).protocol === 'https:' } catch { return false } }

export function readHostedIdentityConfiguration(environment = {}) {
  const value = readBindings(environment, HOSTED_IDENTITY_ENV)
  const complete = value.privateSurfaceEnabled === '1'
    && Object.entries(value).every(([key, item]) => key === 'privateSurfaceEnabled' || Boolean(item))
    && validHttps(value.privateAllowedOrigin)
  return { enabled: complete }
}

export function readHostedDataConfiguration(environment = {}) {
  const value = readBindings(environment, HOSTED_DATA_ENV)
  return { enabled: Object.values(value).every(Boolean) && validHttps(value.supabaseUrl) }
}

export const readHostedPreviewConfiguration = readHostedIdentityConfiguration

const accountError = (code, status) => new AccountAccessError(code, status)
export function createClerkHostedAuthProvider({ gateway, ownerSubject, now = Date.now } = {}) {
  if (!gateway?.verifySession || !gateway?.revokeSession || !gateway?.revokeAllSessions || !ownerSubject) throw new Error('hosted_provider_configuration_missing')
  const verifiedIdentity = (value) => {
    if (!value) throw accountError('authentication_required', 401)
    if (value.revoked) throw accountError('session_revoked', 401)
    if (!Number.isFinite(value.expiresAt) || value.expiresAt <= now() || !Number.isFinite(value.issuedAt) || value.issuedAt > now() || now() - value.issuedAt > 7 * DAY_MS) throw accountError('session_expired', 401)
    if (value.subject !== ownerSubject) throw accountError('owner_mismatch', 403)
    return value
  }
  const verify = async (token) => {
    if (!token) throw accountError('authentication_required', 401)
    try { return verifiedIdentity(await gateway.verifySession(token)) } catch (error) { if (error instanceof AccountAccessError) throw error; throw accountError('authentication_unavailable', 503) }
  }
  return {
    verify,
    async signOut({ token } = {}) {
      const identity = await verify(token)
      try { await gateway.revokeSession({ subject: identity.subject, sessionId: identity.sessionId }) } catch { throw accountError('authentication_unavailable', 503) }
      return { state: 'signed_out' }
    },
    async revokeAll({ operatorAuthorized = false } = {}) {
      if (!operatorAuthorized) throw accountError('operator_authorization_required', 403)
      try { await gateway.revokeAllSessions({ subject: ownerSubject }) } catch { throw accountError('authentication_unavailable', 503) }
      return { state: 'revoked' }
    },
  }
}

const sessionTokenFromRequest = (request) => request.headers.get('cookie')?.split(';').map((item) => item.trim().split('=')).find(([key]) => key === '__session')?.[1] ?? ''
const clerkIdentity = async ({ client, auth }) => {
  if (!auth?.isAuthenticated || !auth.userId || !auth.sessionId || !auth.sessionClaims) return null
  const session = await client.sessions.getSession(auth.sessionId)
  return {
    subject: auth.userId,
    sessionId: auth.sessionId,
    issuedAt: Number(auth.sessionClaims.iat) * 1_000,
    expiresAt: Number(auth.sessionClaims.exp) * 1_000,
    revoked: session?.status !== 'active' || session?.userId !== auth.userId,
    linkedProviders: [],
  }
}

export function createClerkBackendGateway({ environment = {}, clerkClientFactory = createClerkClient } = {}) {
  if (!readHostedIdentityConfiguration(environment).enabled || typeof clerkClientFactory !== 'function') throw new Error('hosted_identity_configuration_missing')
  const bindings = readBindings(environment, HOSTED_IDENTITY_ENV)
  const client = clerkClientFactory({ secretKey: bindings.clerkSecretKey, publishableKey: bindings.clerkPublishableKey })
  if (!client?.authenticateRequest || !client?.sessions?.getSession || !client?.sessions?.revokeSession || !client?.sessions?.getSessionList) throw new Error('clerk_runtime_invalid')
  const authenticate = async (request) => {
    const token = sessionTokenFromRequest(request)
    if (!token) return null
    const state = await client.authenticateRequest(request, { authorizedParties: [bindings.privateAllowedOrigin], acceptsToken: 'session_token' })
    const identity = await clerkIdentity({ client, auth: state.toAuth() })
    const sdkReason = safeClerkAuthReason(state.reason)
    if (!identity && sdkReason) {
      const error = accountError('authentication_required', 401)
      error.sdkReason = sdkReason
      throw error
    }
    return identity
  }
  return {
    authenticationOptions: { acceptsToken: 'session_token', authorizedParties: [bindings.privateAllowedOrigin] },
    verifySession: (token) => authenticate(new Request(`${bindings.privateAllowedOrigin}/api/private/session`, { headers: { cookie: `__session=${token}` } })),
    revokeSession: ({ sessionId }) => client.sessions.revokeSession(sessionId),
    async revokeAllSessions({ subject }) {
      const sessions = await client.sessions.getSessionList({ userId: subject })
      await Promise.all((sessions?.data ?? []).map((session) => client.sessions.revokeSession(session.id)))
    },
  }
}

export function createSupabaseHostedStore({ gateway, allowedProjects = ALLOWED_PROJECTS } = {}) {
  if (!gateway?.membershipsForSubject || !gateway?.workspace || !gateway?.projectsForWorkspace) throw new Error('hosted_store_configuration_missing')
  const invoke = async (operation) => { try { return await operation() } catch { throw accountError('private_store_unavailable', 503) } }
  return {
    membershipsForSubject(subject, context = {}) { return invoke(() => gateway.membershipsForSubject({ subject, token: context.token })) },
    workspace(id, context = {}) { return invoke(() => gateway.workspace({ id, token: context.token })) },
    async projectsForWorkspace(workspaceId, context = {}) {
      const projects = await invoke(() => gateway.projectsForWorkspace({ workspaceId, token: context.token }))
      return Array.isArray(projects) ? projects.filter((project) => allowedProjects.includes(project.id) && project.workspaceId === workspaceId) : []
    },
  }
}

export function createSupabaseRestGateway({ url, publishableKey, fetchImpl = fetch } = {}) {
  if (!validHttps(url) || !publishableKey || typeof fetchImpl !== 'function') throw new Error('supabase_gateway_configuration_missing')
  const read = async (table, query, token) => {
    if (!token) throw accountError('authentication_required', 401)
    const response = await fetchImpl(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}`, 'accept-profile': 'outcome_private', accept: 'application/json' } })
    if (!response.ok) throw new Error('supabase_read_denied')
    const body = await response.json()
    if (!Array.isArray(body)) throw new Error('supabase_response_invalid')
    return body
  }
  return {
    membershipsForSubject: ({ subject, token }) => read('workspace_memberships', `select=workspace_id,identity_subject,role,state&identity_subject=eq.${encodeURIComponent(subject)}`, token).then((rows) => rows.map((row) => ({ workspaceId: row.workspace_id, subject: row.identity_subject, role: row.role, state: row.state }))),
    workspace: ({ id, token }) => read('workspaces', `select=id,state&id=eq.${encodeURIComponent(id)}`, token).then((rows) => rows.length === 1 ? rows[0] : null),
    async projectsForWorkspace({ workspaceId, token }) {
      const bindings = await read('project_bindings', `select=project_id&workspace_id=eq.${encodeURIComponent(workspaceId)}&state=eq.active`, token)
      if (!bindings.length) return []
      const projectIds = bindings.map((row) => row.project_id)
      const projects = await read('projects', `select=id,package_id,state,current_snapshot_id&id=in.(${projectIds.map(encodeURIComponent).join(',')})`, token)
      const snapshotIds = projects.map((row) => row.current_snapshot_id).filter((id) => id !== null && id !== undefined)
      if (snapshotIds.length !== projects.length) throw new Error('supabase_current_snapshot_missing')
      const snapshots = await read('package_snapshots', `select=id,projection&id=in.(${snapshotIds.map(encodeURIComponent).join(',')})`, token)
      const projections = new Map(snapshots.map((row) => [String(row.id), row.projection]))
      return projects.map((row) => {
        const projection = projections.get(String(row.current_snapshot_id))
        if (!projection) throw new Error('supabase_current_snapshot_missing')
        return { id: row.package_id, workspaceId, state: row.state, projection }
      })
    },
  }
}

export function createHostedPreviewRuntime({ environment = {}, providerGateway, storeGateway, now = Date.now } = {}) {
  if (!readHostedIdentityConfiguration(environment).enabled || !readHostedDataConfiguration(environment).enabled || !providerGateway || !storeGateway) return null
  const bindings = readBindings(environment)
  const provider = createClerkHostedAuthProvider({ gateway: providerGateway, ownerSubject: bindings.ownerSubject, now })
  const store = createSupabaseHostedStore({ gateway: storeGateway, allowedProjects: ALLOWED_PROJECTS })
  const service = createAccountAccessService({ authProvider: { verify: provider.verify, signOut: provider.signOut, revokeAll: ({ subject: _subject }) => provider.revokeAll({ operatorAuthorized: true }) }, store, ownerSubject: bindings.ownerSubject, now })
  return {
    service,
    allowedOrigin: bindings.privateAllowedOrigin,
    publishableKey: bindings.clerkPublishableKey,
    rollbackDeployment: bindings.rollbackDeployment,
    mode: 'hosted_preview_adapter',
  }
}

export function createHostedIdentityRuntime({ environment = {}, clerkClientFactory = createClerkClient, now = Date.now } = {}) {
  if (!readHostedIdentityConfiguration(environment).enabled) return null
  const bindings = readBindings(environment, HOSTED_IDENTITY_ENV)
  const gateway = createClerkBackendGateway({ environment, clerkClientFactory })
  const provider = createClerkHostedAuthProvider({ gateway, ownerSubject: bindings.ownerSubject, now })
  const store = {
    async membershipsForSubject() { throw accountError('private_workspace_unavailable', 503) },
    async workspace() { throw accountError('private_workspace_unavailable', 503) },
    async projectsForWorkspace() { throw accountError('private_workspace_unavailable', 503) },
  }
  const service = createAccountAccessService({ authProvider: { verify: provider.verify, signOut: provider.signOut, revokeAll: ({ subject: _subject }) => provider.revokeAll({ operatorAuthorized: true }) }, store, ownerSubject: bindings.ownerSubject, now })
  return {
    service,
    allowedOrigin: bindings.privateAllowedOrigin,
    publishableKey: bindings.clerkPublishableKey,
    rollbackDeployment: bindings.rollbackDeployment,
    dataReady: false,
    mode: 'hosted_identity_adapter',
  }
}
