import { createHash, timingSafeEqual } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { AccountAccessError, accountAccessPublicContract } from './account-access.mjs'
import { accountModelV2SourceRevision } from './account-model-v2-projection.mjs'

const response = (status, body, headers) => ({ status, body, ...(headers ? { headers } : {}) })
const header = (headers, name) => String(headers?.[name] ?? headers?.[name.toLowerCase()] ?? '')
const constantEqual = (left, right) => { const a = Buffer.from(String(left)); const b = Buffer.from(String(right)); return a.length === b.length && timingSafeEqual(a, b) }
const workspaceRevision = (workspace) => createHash('sha256').update(JSON.stringify((workspace.projects ?? []).map((project) => [project.project?.id, accountModelV2SourceRevision(project.modelV2)]))).digest('hex')
const workspaceHeaders = (workspace, decisionRuntime) => {
  if (!decisionRuntime?.csrfSecret) return undefined
  const headers = { etag: `"${workspaceRevision(workspace)}"` }
  headers['x-outcome-csrf'] = decisionRuntime.csrfSecret
  return headers
}
const decisionBody = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Object.getPrototypeOf({}) || Object.getOwnPropertySymbols(value).length) return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const allowed = new Set(['projectId', 'eventId', 'sequence', 'decision', 'rejectionReason', 'nonce', 'supersedesId', 'withdrawsId'])
  if (Object.keys(descriptors).some((key) => !allowed.has(key))) return null
  const output = {}
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return null
    output[key] = descriptor.value
  }
  return output
}
export const privateAccessPublicConfig = (enabled) => ({
  enabled,
  access: accountAccessPublicContract.access,
  providers: accountAccessPublicContract.providers,
  sessionMaximumDays: accountAccessPublicContract.sessionMaximumDays,
  completionAuthority: false,
})

export async function handlePrivateAccessRequest({ method = 'GET', pathname = '/', token, service, decisionRuntime, headers = {}, origin = '', body } = {}) {
  if (pathname === '/api/private/decisions') {
    if (method !== 'POST') return response(405, { error: 'read_only' })
    if (!service) return response(401, { error: 'authentication_required' })
    let identity
    let workspace
    try {
      identity = await service.authenticate(token)
      workspace = await service.readWorkspace({ token })
    } catch (error) {
      if (error instanceof AccountAccessError) return response(error.status, { error: error.code })
      return response(503, { error: 'private_workspace_unavailable' })
    }
    if (!decisionRuntime?.service?.record || !decisionRuntime.allowedOrigin || !decisionRuntime.csrfSecret) return response(503, { error: 'decision_store_unavailable' })
    if (header(headers, 'content-type').toLowerCase() !== 'application/json') return response(415, { error: 'content_type_invalid' })
    if (!constantEqual(origin || header(headers, 'origin'), decisionRuntime.allowedOrigin)) return response(403, { error: 'origin_forbidden' })
    if (!constantEqual(header(headers, 'x-outcome-csrf'), decisionRuntime.csrfSecret)) return response(403, { error: 'csrf_invalid' })
    const request = decisionBody(body)
    if (!request) return response(400, { error: 'invalid_request' })
    let currentRevision
    try { currentRevision = `"${workspaceRevision(workspace)}"` } catch { return response(503, { error: 'decision_store_unavailable' }) }
    const project = (workspace.projects ?? []).find((candidate) => candidate.project?.id === request.projectId)
    if (request.withdrawsId !== undefined) {
      if (!project || Object.keys(request).some((key) => !['projectId', 'withdrawsId', 'nonce'].includes(key)) || typeof decisionRuntime.service.withdraw !== 'function') return response(400, { error: 'invalid_request' })
      try {
        return await decisionRuntime.service.withdraw({ actorSubject: identity.subject, workspaceId: workspace.workspace.id, projectId: project.project.id, decisionId: request.withdrawsId, nonce: request.nonce, sourcePrecondition: header(headers, 'if-match'), currentSourcePrecondition: currentRevision })
      } catch { return response(503, { error: 'decision_store_unavailable' }) }
    }
    const event = project?.modelV2?.events?.find((candidate) => candidate.id === request.eventId && candidate.sequence === request.sequence)
    if (!project || !event) return response(409, { error: 'decision_target_ineligible' })
    try {
      return await decisionRuntime.service.record({
        actorSubject: identity.subject,
        workspaceId: workspace.workspace.id,
        decision: request.decision,
        rejectionReason: request.rejectionReason ?? null,
        nonce: request.nonce,
        supersedesId: request.supersedesId ?? null,
        sourcePrecondition: header(headers, 'if-match'),
        currentSourcePrecondition: currentRevision,
        target: { projectId: project.project.id, state: project.modelV2.state, eventId: event.id, sequence: event.sequence, role: event.role, status: event.status, sourceRevision: accountModelV2SourceRevision(project.modelV2) },
      })
    } catch { return response(503, { error: 'decision_store_unavailable' }) }
  }
  if (method !== 'GET') return response(405, { error: 'read_only' })
  if (pathname === '/api/private/config') return response(200, privateAccessPublicConfig(Boolean(service)))
  if (pathname !== '/api/private/workspace') return response(404, { error: 'not_found' })
  if (!service) return response(401, { error: 'authentication_required' })
  try {
    const workspace = await service.readWorkspace({ token })
    return response(200, { workspace }, workspaceHeaders(workspace, decisionRuntime))
  } catch (error) {
    if (error instanceof AccountAccessError) return response(error.status, { error: error.code })
    return response(503, { error: 'private_workspace_unavailable' })
  }
}
