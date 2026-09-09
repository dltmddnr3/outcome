import { createHash } from 'node:crypto'
import { readScopedWorkObservation } from './outcome-work-observation-access.mjs'

const fail = () => { throw Error('preview_identity_unavailable') }
// previewOrigin and expected identities come only from protected, independently
// verified configuration. This does not discover a host from an untrusted token.
export function createPreviewWorkIdentity({ previewOrigin, accountRef, workspaceId, projectId, workObservationSource, fetchImpl = fetch, now = Date.now }) {
  if (typeof previewOrigin !== 'string' || !/^https:\/\/outcome-[a-z0-9]+-white-castle\.vercel\.app$/.test(previewOrigin)
    || !/^[a-f0-9]{64}$/.test(accountRef) || typeof workspaceId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(workspaceId) || projectId !== 'outcome') fail()
  const resolveBridgeAuthority = async ({ token }) => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000)
    try {
      if (typeof token !== 'string' || token.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) fail()
      // Unverified claims are a rejection filter only. Authority below requires
      // the same token to pass the existing remote server's authentication.
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
      if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 256 || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now()
        || createHash('sha256').update('outcome-bridge-account-v1\0').update(claims.sub).digest('hex') !== accountRef) fail()
      const response = await fetchImpl(`${previewOrigin}/api/private/workspace`, { method: 'GET', headers: { authorization: `Bearer ${token}` }, redirect: 'error', cache: 'no-store', credentials: 'omit', signal: controller.signal })
      if (response.status !== 200 || response.redirected || !/application\/json/i.test(response.headers.get('content-type') ?? '') || !/no-store/i.test(response.headers.get('cache-control') ?? '')) fail()
      const reader = response.body.getReader(), chunks = []; let size = 0
      try {
        while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 1048576 || controller.signal.aborted) fail(); chunks.push(Buffer.from(value)) }
      } finally { await reader.cancel().catch(() => {}) }
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8')).workspace
      if (controller.signal.aborted || claims.exp * 1000 <= now() || value?.access !== 'private_read_only' || value.workspace?.id !== workspaceId || value.workspace?.role !== 'owner-viewer'
        || value.completionAuthority !== false || !Array.isArray(value.projects) || value.projects.filter(item => item?.project?.id === projectId).length !== 1
        || !(Date.parse(value.session?.expiresAt) > now())) fail()
      return Object.freeze({ account_ref: accountRef, workspace_id: workspaceId, project_ids: Object.freeze([projectId]) })
    } catch { fail() } finally { clearTimeout(timer) }
  }
  return { service: Object.freeze({ resolveBridgeAuthority,
    async readWorkObservation({ token, requestedProjectId }) {
      if (requestedProjectId !== projectId) fail()
      await resolveBridgeAuthority({ token })
      const observation = await readScopedWorkObservation({ readSource: workObservationSource, accountRef, workspaceId, projectId, now })
      return { projectId, observation, completionAuthority: false }
    },
  }) }
}
