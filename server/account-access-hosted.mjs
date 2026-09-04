import { AccountAccessError, createAccountAccessService } from './account-access.mjs'
import { createClerkClient, verifyToken } from '@clerk/backend'
import { TokenVerificationError, TokenVerificationErrorReason } from '@clerk/backend/errors'
import { isProxy } from 'node:util/types'

const DAY_MS = 86_400_000
const ALLOWED_PROJECTS = Object.freeze(['cherry-note', 'outcome'])
const PRIVATE_PREVIEW_WORKSPACE = 'account-only-preview'
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

const readBindings = (environment, inventory = HOSTED_PREVIEW_ENV) => {
  if (typeof environment !== 'object' || environment === null || isProxy(environment)) return Object.fromEntries(Object.keys(inventory).map((key) => [key, '']))
  return Object.fromEntries(Object.entries(inventory).map(([key, name]) => {
    let descriptor
    try { descriptor = Object.getOwnPropertyDescriptor(environment, name) } catch { return [key, ''] }
    return [key, descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' ? descriptor.value.trim() : '']
  }))
}
const validHttps = (value) => { try { return new URL(value).protocol === 'https:' } catch { return false } }

export function readHostedIdentityConfiguration(environment = {}, { allowedOrigin } = {}) {
  const value = readBindings(environment, HOSTED_IDENTITY_ENV)
  if (allowedOrigin !== undefined) value.privateAllowedOrigin = allowedOrigin
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

const clerkIdentity = async ({ client, claims }) => {
  if (typeof claims?.sub !== 'string' || !claims.sub || typeof claims?.sid !== 'string' || !claims.sid || !Number.isFinite(claims.iat) || !Number.isFinite(claims.exp)) return null
  const session = await client.sessions.getSession(claims.sid)
  return {
    subject: claims.sub,
    sessionId: claims.sid,
    issuedAt: claims.iat * 1_000,
    expiresAt: claims.exp * 1_000,
    revoked: session?.status !== 'active' || session?.userId !== claims.sub,
    linkedProviders: [],
  }
}

export function createClerkBackendGateway({ environment = {}, allowedOrigin, clerkClientFactory = createClerkClient, tokenVerifier = verifyToken } = {}) {
  if (!readHostedIdentityConfiguration(environment, { allowedOrigin }).enabled || typeof clerkClientFactory !== 'function' || typeof tokenVerifier !== 'function') throw new Error('hosted_identity_configuration_missing')
  const bindings = readBindings(environment, HOSTED_IDENTITY_ENV)
  if (allowedOrigin !== undefined) bindings.privateAllowedOrigin = allowedOrigin
  const client = clerkClientFactory({ secretKey: bindings.clerkSecretKey, publishableKey: bindings.clerkPublishableKey })
  if (!client?.sessions?.getSession || !client?.sessions?.revokeSession || !client?.sessions?.getSessionList) throw new Error('clerk_runtime_invalid')
  const authenticate = async (token) => {
    if (!token) return null
    let verifiedClaims
    try {
      verifiedClaims = await tokenVerifier(token, { secretKey: bindings.clerkSecretKey, authorizedParties: [bindings.privateAllowedOrigin] })
    } catch (cause) {
      if (!(cause instanceof TokenVerificationError)) throw cause
      const error = accountError('authentication_required', 401)
      const sdkReason = safeClerkAuthReason(cause.reason)
      if (sdkReason) error.sdkReason = sdkReason
      throw error
    }
    return clerkIdentity({ client, claims: verifiedClaims })
  }
  return {
    authenticationOptions: { acceptsToken: 'session_token', authorizedParties: [bindings.privateAllowedOrigin] },
    verifySession: authenticate,
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

export function createSealedPackageStore({ sealedSnapshot, ownerSubject } = {}) {
  const projects = Array.isArray(sealedSnapshot?.projects) ? sealedSnapshot.projects : []
  const byId = new Map(projects.map((projection) => [projection?.project?.id, projection]))
  if (!ownerSubject || projects.length !== ALLOWED_PROJECTS.length || byId.size !== ALLOWED_PROJECTS.length || !ALLOWED_PROJECTS.every((id) => byId.has(id))) throw new Error('sealed_package_snapshot_invalid')
  const sealedProjects = ALLOWED_PROJECTS.map((id) => Object.freeze({ id, workspaceId: PRIVATE_PREVIEW_WORKSPACE, state: 'active', projection: structuredClone(byId.get(id)) }))
  return Object.freeze({
    membershipsForSubject(subject) { return subject === ownerSubject ? [{ workspaceId: PRIVATE_PREVIEW_WORKSPACE, subject, role: 'owner-viewer', state: 'active' }] : [] },
    workspace(id) { return id === PRIVATE_PREVIEW_WORKSPACE ? { id, state: 'active' } : null },
    projectsForWorkspace(id) { return id === PRIVATE_PREVIEW_WORKSPACE ? sealedProjects.map((project) => structuredClone(project)) : [] },
    workspaceProjection(id) { return id === PRIVATE_PREVIEW_WORKSPACE ? structuredClone(sealedSnapshot) : null },
  })
}

export function createHostedIdentityRuntime({ environment = {}, allowedOrigin, sealedSnapshot, clerkClientFactory = createClerkClient, tokenVerifier = verifyToken, now = Date.now } = {}) {
  if (!readHostedIdentityConfiguration(environment, { allowedOrigin }).enabled) return null
  const bindings = readBindings(environment, HOSTED_IDENTITY_ENV)
  if (allowedOrigin !== undefined) bindings.privateAllowedOrigin = allowedOrigin
  const gateway = createClerkBackendGateway({ environment, allowedOrigin, clerkClientFactory, tokenVerifier })
  const provider = createClerkHostedAuthProvider({ gateway, ownerSubject: bindings.ownerSubject, now })
  const store = createSealedPackageStore({ sealedSnapshot, ownerSubject: bindings.ownerSubject })
  const service = createAccountAccessService({ authProvider: { verify: provider.verify, signOut: provider.signOut, revokeAll: ({ subject: _subject }) => provider.revokeAll({ operatorAuthorized: true }) }, store, ownerSubject: bindings.ownerSubject, now })
  return {
    service,
    allowedOrigin: bindings.privateAllowedOrigin,
    publishableKey: bindings.clerkPublishableKey,
    rollbackDeployment: bindings.rollbackDeployment,
    dataReady: true,
    mode: 'account_only_private_snapshot',
  }
}
