import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { handleStableHostRequest } from '../api/index.mjs'
import { createAccountAccessService, createInMemoryAccountStore } from '../server/account-access.mjs'
import { createOutcomeServer } from '../server/index.mjs'
import { createDecisionRecordService, createInMemoryDecisionRecordStore } from '../server/outcome-decision-record.mjs'

const paths = ['/api/dashboard', '/api/dashboard/cherry-note', '/api/auth/login', '/api/auth/logout', '/api/private/config', '/api/private/workspace', '/api/unknown', '/cherry-note-dashboard']
const privatePaths = ['/api/private/chat/timeline', '/api/private/chat/messages', '/api/private/bridge/admin/viewers/register', '/api/private/bridge/admin/viewers/revoke', '/api/private/bridge/admin/challenges/cleanup', '/api/private/bridge/admin/readiness']
const allowedPrivateRoute = 'GET /api/private/chat/timeline'
const methods = ['POST', 'PUT', 'PATCH', 'DELETE']
const rejectedDecisionMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']
const canonicalBody = '{"error":"read_only"}'

const isCanonicalReadOnly = (text) => {
  try { return JSON.stringify(JSON.parse(text)) === canonicalBody } catch { return false }
}

export function assertMutationResponse({ label, method, path, status, text }) {
  if (status !== 405) throw new Error(`${label} ${method} ${path} expected 405, received ${status}`)
  if (path.startsWith('/api/')) {
    if (!isCanonicalReadOnly(text)) throw new Error(`${label} ${method} ${path} expected API read-only JSON`)
    return
  }
  if (text.trim() && !isCanonicalReadOnly(text)) throw new Error(`${label} ${method} ${path} unexpected page mutation body`)
}

export function assertDecisionMutationResponse({ method, status, text, postExpectation = 'public_read_only' }) {
  const expectedStatus = method !== 'POST' || postExpectation === 'public_read_only' ? 405 : postExpectation === 'unavailable' ? 503 : 201
  const expectedError = expectedStatus === 405 ? 'read_only' : expectedStatus === 503 ? 'decision_store_unavailable' : null
  if (method === 'HEAD' && text === '') {
    if (status !== expectedStatus) throw new Error(`decision HEAD expected ${expectedStatus}`)
    return
  }
  let body
  try { body = JSON.parse(text) } catch { throw new Error(`decision ${method} response is not canonical JSON`) }
  if (status !== expectedStatus || (expectedError ? JSON.stringify(body) !== JSON.stringify({ error: expectedError }) : body?.decisionState !== 'recorded' || body?.completionAuthority !== false)) throw new Error(`decision ${method} expected ${expectedStatus} ${expectedError ?? 'recorded'}`)
}

export async function checkDecisionMethodMatrix(base, label, { postExpectation = 'public_read_only', postHeaders = {}, postBody = {} } = {}, fetchImpl = fetch) {
  let count = 0
  for (const method of [...rejectedDecisionMethods, 'POST']) {
    const response = await fetchImpl(`${base}/api/private/decisions`, { method, headers: method === 'POST' ? { 'content-type': 'application/json', ...postHeaders } : undefined, body: method === 'POST' ? JSON.stringify(postBody) : undefined })
    assertDecisionMutationResponse({ method, status: response.status, text: await response.text(), postExpectation })
    count += 1
  }
  console.log(`${label} decision method matrix ${count}/7 verified; POST=${postExpectation}`)
  return count
}

export async function checkMutationMatrix(base, label, fetchImpl = fetch) {
  let count = 0; let apiBodies = 0; let emptyPageBodies = 0
  for (const path of paths) for (const method of methods) {
    const response = await fetchImpl(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: '{}' })
    const text = await response.text()
    assertMutationResponse({ label, method, path, status: response.status, text })
    if (path.startsWith('/api/')) apiBodies += 1
    else if (!text.trim()) emptyPageBodies += 1
    count += 1
  }
  const decisionRows = await checkDecisionMethodMatrix(base, label, {}, fetchImpl)
  console.log(`${label} mutation ${count}/32 existing rows verified; API read_only JSON=${apiBodies}/28; empty page boundary=${emptyPageBodies}/4`)
  return { count, apiBodies, emptyPageBodies, decisionRows }
}

export function checkStablePrivateMutationMatrix(handler = handleStableHostRequest) {
  let count = 0
  for (const path of privatePaths) for (const method of methods) {
    const response = handler({ method, pathname: path })
    assertMutationResponse({ label: 'stable-private', method, path, status: response.status, text: JSON.stringify(response.body) })
    count += 1
  }
  console.log(`stable private mutation ${count}/24 rows verified; allowed read=${allowedPrivateRoute}`)
  return count
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const publicServer = createOutcomeServer({ publicReadOnly: true })
  publicServer.listen(0, '127.0.0.1'); await once(publicServer, 'listening')
  try {
    await checkMutationMatrix(`http://127.0.0.1:${publicServer.address().port}`, 'public-local')
    if (process.env.OUTCOME_PUBLIC_URL) await checkMutationMatrix(process.env.OUTCOME_PUBLIC_URL, 'public')
  } finally { publicServer.close(); await once(publicServer, 'close') }

  for (const method of [...rejectedDecisionMethods, 'POST']) {
    const stable = handleStableHostRequest({ method, pathname: '/api/private/decisions' })
    assertDecisionMutationResponse({ method, status: stable.status, text: JSON.stringify(stable.body) })
  }
  checkStablePrivateMutationMatrix()

  const privateUnavailable = createOutcomeServer({ publicReadOnly: false, password: 'private-test-password', secret: 'private-test-secret-that-is-long-enough' })
  privateUnavailable.listen(0, '127.0.0.1'); await once(privateUnavailable, 'listening')
  try { await checkDecisionMethodMatrix(`http://127.0.0.1:${privateUnavailable.address().port}`, 'private-unavailable', { postExpectation: 'unavailable' }) }
  finally { privateUnavailable.close(); await once(privateUnavailable, 'close') }

  const now = () => Date.parse('2026-09-04T03:00:00.000Z')
  const source = { project: { id: 'outcome', name: 'OUTCOME', outcome: 'One safe outcome' }, blocked: true, events: [{ id: 'event-builder-blocked', sequence: 7, role: 'builder', type: 'result_observed', summary: '고정 근거가 없어 안전 보류', observedAt: '2026-09-04T02:00:00.000Z', status: 'safe_hold' }] }
  const accountAccess = createAccountAccessService({ now, ownerSubject: 'owner', authProvider: { verify: async (token) => token === 'valid' ? { subject: 'owner', issuedAt: now(), expiresAt: now() + 60_000 } : null }, store: createInMemoryAccountStore({ workspaces: [{ id: 'workspace', state: 'active' }], memberships: [{ subject: 'owner', workspaceId: 'workspace', role: 'owner-viewer', state: 'active' }], projects: [{ id: 'outcome', workspaceId: 'workspace', state: 'active', projection: source }] }) })
  const decisionRuntime = { allowedOrigin: '', csrfSecret: 'matrix-csrf-secret', service: createDecisionRecordService({ store: createInMemoryDecisionRecordStore(), now }) }
  const privateEnabled = createOutcomeServer({ publicReadOnly: false, password: 'private-test-password', secret: 'private-test-secret-that-is-long-enough', accountAccess, decisionRuntime })
  privateEnabled.listen(0, '127.0.0.1'); await once(privateEnabled, 'listening')
  try {
    const base = `http://127.0.0.1:${privateEnabled.address().port}`
    decisionRuntime.allowedOrigin = base
    const workspace = await fetch(`${base}/api/private/workspace`, { headers: { cookie: '__session=valid' } })
    await checkDecisionMethodMatrix(base, 'private-enabled', { postExpectation: 'recorded', postHeaders: { cookie: '__session=valid', origin: base, 'x-outcome-csrf': workspace.headers.get('x-outcome-csrf'), 'if-match': workspace.headers.get('etag') }, postBody: { projectId: 'outcome', eventId: 'event-builder-blocked', sequence: 7, decision: 'approved', rejectionReason: null, nonce: 'matrix-nonce-that-is-long-enough-123' } })
  } finally { privateEnabled.close(); await once(privateEnabled, 'close') }
}
