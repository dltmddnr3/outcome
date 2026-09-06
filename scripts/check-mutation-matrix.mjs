import { once } from 'node:events'
import { closeSync, constants, fstatSync, fsyncSync, ftruncateSync, lstatSync, openSync, readSync, rmSync, writeSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import source from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { createAccountAccessService, createInMemoryAccountStore } from '../server/account-access.mjs'
import { createOutcomeServer } from '../server/index.mjs'
import { createDecisionRecordService, createInMemoryDecisionRecordStore } from '../server/outcome-decision-record.mjs'
import { finalizeDeploymentSnapshot } from './finalize-stable-snapshot.mjs'

const paths = ['/api/dashboard', '/api/dashboard/cherry-note', '/api/auth/login', '/api/auth/logout', '/api/private/config', '/api/private/workspace', '/api/unknown', '/cherry-note-dashboard']
const privatePaths = ['/api/private/chat/timeline', '/api/private/chat/messages', '/api/private/bridge/admin/viewers/register', '/api/private/bridge/admin/viewers/revoke', '/api/private/bridge/admin/challenges/cleanup', '/api/private/bridge/admin/readiness']
const allowedPrivateRoute = 'GET /api/private/chat/timeline'
const methods = ['POST', 'PUT', 'PATCH', 'DELETE']
const rejectedDecisionMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']
const canonicalBody = '{"error":"read_only"}'
const carrierPath = fileURLToPath(new URL('../api/deployment-snapshot.mjs', import.meta.url))
const carrierLockPath = `${carrierPath}.matrix-lock`
const matrixCommit = '1'.repeat(40)
const matrixTree = '2'.repeat(40)
const matrixAsset = 'index-test.js'

const sameFile = (left, right) => left.dev === right.dev && left.ino === right.ino
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const readDescriptor = (descriptor) => {
  const bytes = Buffer.alloc(fstatSync(descriptor).size)
  let offset = 0
  while (offset < bytes.length) {
    const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset)
    if (count === 0) throw new Error('matrix_carrier_read_incomplete')
    offset += count
  }
  return bytes
}
const writeDescriptor = (descriptor, bytes) => {
  ftruncateSync(descriptor, 0)
  let offset = 0
  while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset)
  fsyncSync(descriptor)
}
const assertDescriptorIdentity = (path, descriptor, identity, errorMessage) => {
  const pathIdentity = lstatSync(path)
  const descriptorIdentity = fstatSync(descriptor)
  if (!pathIdentity.isFile() || pathIdentity.isSymbolicLink() || !sameFile(identity, descriptorIdentity) || !sameFile(pathIdentity, descriptorIdentity)) throw new Error(errorMessage)
}
const processIsAlive = (pid) => {
  try { process.kill(pid, 0); return true } catch (error) {
    if (error?.code === 'ESRCH') return false
    return null
  }
}
const acquireCarrierLock = () => {
  const bytes = Buffer.from(`${JSON.stringify({ schemaVersion: 1, ownerPid: process.pid })}\n`, 'utf8')
  const expectedDigest = digest(bytes)
  const create = () => {
    let descriptor
    try {
      descriptor = openSync(carrierLockPath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW, 0o600)
      const identity = fstatSync(descriptor)
      writeDescriptor(descriptor, bytes)
      return { descriptor, identity, bytes, expectedDigest }
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor)
      throw error
    }
  }
  try { return create() } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }

  let descriptor
  try {
    const metadata = lstatSync(carrierLockPath)
    if (!metadata.isFile() || metadata.isSymbolicLink() || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())) throw new Error('matrix_carrier_lock_uncertain')
    descriptor = openSync(carrierLockPath, constants.O_RDONLY | constants.O_NOFOLLOW)
    const identity = fstatSync(descriptor)
    if (!sameFile(metadata, identity) || !identity.isFile()) throw new Error('matrix_carrier_lock_uncertain')
    const existingBytes = readDescriptor(descriptor)
    let owner
    try { owner = JSON.parse(existingBytes.toString('utf8')) } catch { throw new Error('matrix_carrier_lock_uncertain') }
    if (!owner || Object.keys(owner).sort().join(',') !== 'ownerPid,schemaVersion' || owner.schemaVersion !== 1 || !Number.isInteger(owner.ownerPid) || owner.ownerPid < 1) throw new Error('matrix_carrier_lock_uncertain')
    if (processIsAlive(owner.ownerPid) !== false) throw new Error('matrix_carrier_busy')
    assertDescriptorIdentity(carrierLockPath, descriptor, identity, 'matrix_carrier_lock_uncertain')
    if (digest(existingBytes) !== digest(readDescriptor(descriptor)) || !readDescriptor(descriptor).equals(existingBytes)) throw new Error('matrix_carrier_lock_uncertain')
    rmSync(carrierLockPath)
  } finally { if (descriptor !== undefined) closeSync(descriptor) }
  try { return create() } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('matrix_carrier_busy')
    throw error
  }
}
const releaseCarrierLock = (lock) => {
  try {
    assertDescriptorIdentity(carrierLockPath, lock.descriptor, lock.identity, 'matrix_carrier_lock_ownership_lost')
    const bytes = readDescriptor(lock.descriptor)
    if (digest(bytes) !== lock.expectedDigest || !bytes.equals(lock.bytes)) throw new Error('matrix_carrier_lock_ownership_lost')
    rmSync(carrierLockPath)
  } finally { closeSync(lock.descriptor) }
}
const validateCarrierSnapshot = (snapshot, expected = {}) => {
  const text = JSON.stringify(snapshot)
  if (snapshot?.snapshot?.boundary !== 'deployment_snapshot' || snapshot.snapshot?.source !== 'sanitized_public_projection' || snapshot.snapshot?.liveSessionRelay !== false || !Array.isArray(snapshot.projects) || snapshot.projects.length < 2 || !/^[0-9a-f]{12}$/.test(snapshot.build?.commit ?? '') || !/^[0-9a-f]{12}$/.test(snapshot.build?.tree ?? '') || !/^index-[A-Za-z0-9_-]+\.js$/.test(snapshot.build?.asset ?? '')) throw new Error('matrix_carrier_shape_invalid')
  if (expected.commit && snapshot.build.commit !== expected.commit.slice(0, 12) || expected.tree && snapshot.build.tree !== expected.tree.slice(0, 12) || expected.asset && snapshot.build.asset !== expected.asset) throw new Error('matrix_carrier_shape_invalid')
  for (const pattern of [/\/Users\//, /\/tmp\//, /(?:session|thread|turn|task)[_-]?id/i, /\b[0-9a-f]{40}\b/i, /\b[0-9a-f]{64}\b/i, /(?:token|secret|password|authorization)\s*[:=]/i]) if (pattern.test(text)) throw new Error('matrix_carrier_disclosure_invalid')
  for (const project of snapshot.projects) for (const phase of project.phases ?? []) for (const scope of phase.scopes ?? []) for (const stage of scope.stages ?? []) for (const gate of stage.gate?.gates ?? []) if (Object.hasOwn(gate, 'evidence')) throw new Error('matrix_carrier_gate_evidence_invalid')
}
const deterministicCarrier = () => {
  const snapshot = finalizeDeploymentSnapshot({ source, commit: matrixCommit, tree: matrixTree, asset: matrixAsset })
  validateCarrierSnapshot(snapshot, { commit: matrixCommit, tree: matrixTree, asset: matrixAsset })
  return Buffer.from(`export default ${JSON.stringify(snapshot)}\n`, 'utf8')
}
const loadStableHostRequest = async () => {
  if (!Number.isInteger(constants.O_NOFOLLOW)) throw new Error('matrix_carrier_nofollow_unavailable')
  const carrier = deterministicCarrier()
  const carrierDigest = digest(carrier)
  const lock = acquireCarrierLock()
  let descriptor
  let taskOwned = false
  let priorBytes
  let priorMode
  let identity
  try {
    let existing
    try { existing = lstatSync(carrierPath) } catch (error) { if (error?.code !== 'ENOENT') throw error }
    if (existing) {
      if (!existing.isFile() || existing.isSymbolicLink()) throw new Error('matrix_carrier_ownership_uncertain')
      descriptor = openSync(carrierPath, constants.O_RDONLY | constants.O_NOFOLLOW)
      identity = fstatSync(descriptor)
      if (!sameFile(existing, identity) || !identity.isFile()) throw new Error('matrix_carrier_ownership_uncertain')
      priorBytes = readDescriptor(descriptor)
      priorMode = identity.mode & 0o7777
      taskOwned = digest(priorBytes) === carrierDigest && priorBytes.equals(carrier)
    } else {
      descriptor = openSync(carrierPath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW, 0o600)
      identity = fstatSync(descriptor)
      taskOwned = true
      writeDescriptor(descriptor, carrier)
    }
    assertDescriptorIdentity(carrierPath, descriptor, identity, 'matrix_carrier_ownership_lost')
    if (digest(readDescriptor(descriptor)) !== digest(priorBytes ?? carrier) || !readDescriptor(descriptor).equals(priorBytes ?? carrier)) throw new Error('matrix_carrier_ownership_lost')
    const snapshotModule = await import(`${pathToFileURL(carrierPath).href}?matrix-validation=${digest(priorBytes ?? carrier)}`)
    validateCarrierSnapshot(snapshotModule.default)
    const module = await import('../api/index.mjs')
    if (typeof module.handleStableHostRequest !== 'function') throw new Error('matrix_stable_handler_unavailable')
    return module.handleStableHostRequest
  } finally {
    try {
      if (descriptor !== undefined) {
        try {
          assertDescriptorIdentity(carrierPath, descriptor, identity, 'matrix_carrier_ownership_lost')
          const finalBytes = readDescriptor(descriptor)
          const expectedBytes = priorBytes ?? carrier
          if (digest(finalBytes) !== digest(expectedBytes) || !finalBytes.equals(expectedBytes) || (fstatSync(descriptor).mode & 0o7777) !== priorMode && priorMode !== undefined) throw new Error('matrix_carrier_ownership_lost')
          if (taskOwned) rmSync(carrierPath)
        } finally { closeSync(descriptor) }
      }
    } finally { releaseCarrierLock(lock) }
  }
}

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

export function checkStablePrivateMutationMatrix(handler) {
  if (typeof handler !== 'function') throw new Error('stable handler is required')
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
  const handleStableHostRequest = await loadStableHostRequest()
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
  checkStablePrivateMutationMatrix(handleStableHostRequest)

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
