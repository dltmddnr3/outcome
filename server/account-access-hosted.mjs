import { AccountAccessError, createAccountAccessService } from './account-access.mjs'

const DAY_MS = 86_400_000
const ALLOWED_PROJECTS = Object.freeze(['cherry-note', 'outcome'])

export const HOSTED_PREVIEW_ENV = Object.freeze({
  privateSurfaceEnabled: 'OUTCOME_PRIVATE_SURFACE_ENABLED',
  clerkPublishableKey: 'OUTCOME_CLERK_PUBLISHABLE_KEY',
  clerkSecretKey: 'OUTCOME_CLERK_SECRET_KEY',
  ownerSubject: 'OUTCOME_OWNER_SUBJECT',
  clerkSignInUrl: 'OUTCOME_CLERK_SIGN_IN_URL',
  clerkAccountUrl: 'OUTCOME_CLERK_ACCOUNT_URL',
  privateAllowedOrigin: 'OUTCOME_PRIVATE_ALLOWED_ORIGIN',
  supabaseUrl: 'OUTCOME_SUPABASE_URL',
  supabasePublishableKey: 'OUTCOME_SUPABASE_PUBLISHABLE_KEY',
  rollbackDeployment: 'OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT',
})

const readBindings = (environment) => Object.fromEntries(Object.entries(HOSTED_PREVIEW_ENV).map(([key, name]) => [key, typeof environment?.[name] === 'string' ? environment[name].trim() : '']))
const validHttps = (value) => { try { return new URL(value).protocol === 'https:' } catch { return false } }

export function readHostedPreviewConfiguration(environment = {}) {
  const value = readBindings(environment)
  const complete = value.privateSurfaceEnabled === '1'
    && Object.entries(value).every(([key, item]) => key === 'privateSurfaceEnabled' || Boolean(item))
    && [value.clerkSignInUrl, value.clerkAccountUrl, value.privateAllowedOrigin, value.supabaseUrl].every(validHttps)
  return { enabled: complete }
}

const accountError = (code, status) => new AccountAccessError(code, status)
const providerRedirect = (value, allowedOrigins) => {
  try {
    const redirect = new URL(value?.redirectUrl)
    if (!allowedOrigins.includes(redirect.origin)) throw new Error('provider_redirect_denied')
    return value
  } catch {
    throw accountError('authentication_unavailable', 503)
  }
}

export function createClerkHostedAuthProvider({ gateway, ownerSubject, allowedRedirectOrigins = [], now = Date.now } = {}) {
  if (!gateway?.verifySession || !gateway?.startSignIn || !gateway?.startAppleLink || !gateway?.revokeSession || !gateway?.revokeAllSessions || !ownerSubject || !allowedRedirectOrigins.length) throw new Error('hosted_provider_configuration_missing')
  const verify = async (token) => {
    if (!token) throw accountError('authentication_required', 401)
    let value
    try { value = await gateway.verifySession(token) } catch { throw accountError('authentication_unavailable', 503) }
    if (!value) throw accountError('authentication_required', 401)
    if (value.revoked) throw accountError('session_revoked', 401)
    if (!Number.isFinite(value.expiresAt) || value.expiresAt <= now() || !Number.isFinite(value.issuedAt) || value.issuedAt > now() || now() - value.issuedAt > 7 * DAY_MS) throw accountError('session_expired', 401)
    if (value.subject !== ownerSubject) throw accountError('owner_mismatch', 403)
    return value
  }
  return {
    verify,
    async begin({ provider } = {}) {
      if (!['google', 'email_code'].includes(provider)) throw accountError('provider_not_allowed', 400)
      try { return providerRedirect(await gateway.startSignIn({ provider }), allowedRedirectOrigins) } catch { throw accountError('authentication_unavailable', 503) }
    },
    async beginAppleLink({ token } = {}) {
      if (!token) throw accountError('apple_link_required', 403)
      const identity = await verify(token)
      try { return providerRedirect(await gateway.startAppleLink({ subject: identity.subject, sessionId: identity.sessionId }), allowedRedirectOrigins) } catch { throw accountError('authentication_unavailable', 503) }
    },
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
  if (!readHostedPreviewConfiguration(environment).enabled || !providerGateway || !storeGateway) return null
  const bindings = readBindings(environment)
  const allowedRedirectOrigins = [...new Set([new URL(bindings.clerkSignInUrl).origin, new URL(bindings.clerkAccountUrl).origin])]
  const provider = createClerkHostedAuthProvider({ gateway: providerGateway, ownerSubject: bindings.ownerSubject, allowedRedirectOrigins, now })
  const store = createSupabaseHostedStore({ gateway: storeGateway, allowedProjects: ALLOWED_PROJECTS })
  const service = createAccountAccessService({ authProvider: { verify: provider.verify, signOut: provider.signOut, revokeAll: ({ subject: _subject }) => provider.revokeAll({ operatorAuthorized: true }) }, store, ownerSubject: bindings.ownerSubject, now })
  return {
    service,
    transition: { begin: (input) => provider.begin(input), appleLink: (input) => provider.beginAppleLink(input), end: (input) => provider.signOut(input) },
    allowedOrigin: bindings.privateAllowedOrigin,
    rollbackDeployment: bindings.rollbackDeployment,
    mode: 'hosted_preview_adapter',
  }
}
