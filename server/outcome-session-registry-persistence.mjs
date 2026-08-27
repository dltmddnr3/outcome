import { closeSync, constants, fchmodSync, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import { sanitizeEvidenceText } from './cherry-note-dashboard.mjs'

export const SESSION_ROLES = Object.freeze(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const CURRENT_STATUSES = new Set(['active', 'idle', 'stale', 'rotating', 'blocked'])
const ALL_STATUSES = new Set([...CURRENT_STATUSES, 'replaced', 'revoked'])
const ACTIONS = new Set(['assign', 'replace', 'revoke', 'observe', 'checkpoint'])
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHA256 = /^[a-f0-9]{64}$/
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SAFE_CLASS = /^[a-z][a-z0-9_-]{0,63}$/
const SAFE_REASON = /^[a-z0-9_:-]{1,96}$/
const PUBLIC_IDENTIFIER = /(?:\b[a-z][a-z0-9+.-]*:\/\/|\b(?:session|thread|task|turn)_id(?:[:=]|%[0-9a-f]{2})|\b(?:sess|thread|task|turn)_[a-z0-9])/i
const REGISTRY_KEYS = new Set(['schema_version', 'revision', 'next_event_sequence', 'project_ids', 'bindings', 'events'])
const BINDING_KEYS = new Set(['binding_ref', 'public_alias', 'project_id', 'role', 'provider_class', 'locator_ref', 'binding_version', 'status', 'phase_id', 'scope_id', 'stage_id', 'bound_at', 'observed_at', 'predecessor_binding_ref', 'successor_binding_ref', 'continuity_handoff_sha256', 'last_checkpoint_ref', 'replaced_at', 'revoked_at', 'activity', 'predecessor_archive_eligible'])
const BINDING_REQUIRED_KEYS = ['binding_ref', 'public_alias', 'project_id', 'role', 'provider_class', 'locator_ref', 'binding_version', 'status', 'phase_id', 'scope_id', 'stage_id', 'bound_at', 'observed_at', 'predecessor_binding_ref', 'successor_binding_ref', 'continuity_handoff_sha256', 'last_checkpoint_ref']
const EVENT_KEYS = new Set(['event_ref', 'sequence', 'project_id', 'role', 'action', 'before_version', 'after_version', 'actor_class', 'reason_class', 'occurred_at', 'stage_id', 'handoff_sha256', 'evidence_receipt_ref', 'observation_status'])
const EVENT_REQUIRED_KEYS = ['event_ref', 'sequence', 'project_id', 'role', 'action', 'before_version', 'after_version', 'actor_class', 'reason_class', 'occurred_at', 'stage_id']
const LOCK_KEYS = new Set(['schema_version', 'owner_pid', 'owner_uid', 'process_start_identity', 'created_at', 'owner_nonce'])
const LOCK_STALE_MILLISECONDS = 30_000
const clone = (value) => structuredClone(value)
const fail = (code) => { throw new Error(code) }
const hasExactKeys = (value, allowed, required) => Object.keys(value).every((key) => allowed.has(key)) && required.every((key) => Object.hasOwn(value, key))
const isoTime = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
const nullableIsoTime = (value) => value === null || isoTime(value)
const publicStableId = (value) => typeof value === 'string' && PROJECT_ID.test(value) && !UUID.test(value) && !PUBLIC_IDENTIFIER.test(value)
const nullableStableId = (value) => value === null || publicStableId(value)
const nullablePrivateRef = (value) => value === null || typeof value === 'string' && UUID.test(value)
const safePublicText = (value) => typeof value === 'string' && value.length <= 512 && !PUBLIC_IDENTIFIER.test(value) && sanitizeEvidenceText(value) === value
const safePublicId = (value) => publicStableId(value) ? value : null
const safePublicReason = (value) => typeof value === 'string' && SAFE_REASON.test(value) && !UUID.test(value) && !PUBLIC_IDENTIFIER.test(value) ? value : 'invalid_reason'
const sanitizedPublicText = (value) => value == null ? null : safePublicText(value) ? value : null
const safePublicTime = (value) => isoTime(value) ? value : null
const PRIVATE_ALIAS_SEGMENTS = new Set(['codex', 'openai', 'chatgpt', 'provider', 'anthropic', 'claude', 'google', 'gemini', 'session', 'sess', 'thread', 'task', 'turn', 'conversation', 'chat', 'run', 'message', 'msg', 'assistant', 'asst'])
export const isPublicSessionAlias = (value) => {
  if (typeof value !== 'string' || value.length > 64) return false
  const segments = value.split('-')
  return segments.length >= 2 && segments.length <= 5 && segments.every((segment) => /^[a-z][a-z0-9]{0,23}$/.test(segment) && !PRIVATE_ALIAS_SEGMENTS.has(segment))
}
const exactPrivateMode = (metadata) => process.platform !== 'win32' && (metadata.mode & 0o777) === 0o600
const sameFile = (left, right) => left.dev === right.dev && left.ino === right.ino

function readExactPrivateFile(path, errorCode = 'registry_unavailable') {
  let metadata; let descriptor
  try {
    metadata = lstatSync(path)
    if (!metadata.isFile() || metadata.isSymbolicLink() || !exactPrivateMode(metadata) || !Number.isInteger(constants.O_NOFOLLOW)) fail(errorCode)
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    if (!sameFile(metadata, fstatSync(descriptor))) fail(errorCode)
    return readFileSync(descriptor)
  } catch (error) {
    if (error instanceof Error && error.message === errorCode) throw error
    fail(errorCode)
  } finally { if (descriptor !== undefined) closeSync(descriptor) }
}

function validateLifecycle(value) {
  const histories = new Map()
  for (const binding of value.bindings) {
    const key = `${binding.project_id}:${binding.role}`
    if (!histories.has(key)) histories.set(key, [])
    histories.get(key).push(binding)
  }
  const folded = new Map()
  for (const event of value.events) {
    const key = `${event.project_id}:${event.role}`; const bindings = histories.get(key) ?? []
    const state = folded.get(key) ?? { version: 0, current: null, records: new Map() }
    const record = state.current == null ? null : state.records.get(state.current)
    const hasHandoff = Object.hasOwn(event, 'handoff_sha256'); const hasEvidence = Object.hasOwn(event, 'evidence_receipt_ref'); const hasObservation = Object.hasOwn(event, 'observation_status')
    if (event.action === 'assign') {
      const binding = bindings.find(({ binding_version }) => binding_version === event.after_version)
      const previous = bindings.find(({ binding_version }) => binding_version === event.before_version)
      if (state.current !== null || event.after_version !== state.version + 1 || !binding || hasHandoff || hasEvidence || hasObservation || binding.bound_at !== event.occurred_at || (state.version === 0 ? binding.predecessor_binding_ref !== null : !previous || previous.status !== 'revoked' || binding.predecessor_binding_ref !== previous.binding_ref)) fail('registry_conflict')
      state.version = event.after_version; state.current = binding.binding_version
      state.records.set(binding.binding_version, { status: 'active', stageId: event.stage_id, handoff: null, checkpoint: null })
    } else if (event.action === 'replace') {
      const binding = bindings.find(({ binding_version }) => binding_version === event.after_version)
      const previous = bindings.find(({ binding_version }) => binding_version === event.before_version)
      if (!record || !binding || !previous || event.after_version !== state.version + 1 || !hasHandoff || hasEvidence || hasObservation || binding.bound_at !== event.occurred_at || previous.replaced_at !== event.occurred_at || previous.successor_binding_ref !== binding.binding_ref || binding.predecessor_binding_ref !== previous.binding_ref) fail('registry_conflict')
      record.status = 'replaced'; state.version = event.after_version; state.current = binding.binding_version
      state.records.set(binding.binding_version, { status: 'active', stageId: event.stage_id ?? record.stageId, handoff: event.handoff_sha256, checkpoint: null })
    } else if (event.action === 'revoke') {
      if (!record || event.after_version !== state.version || hasHandoff || hasEvidence || hasObservation) fail('registry_conflict')
      record.status = 'revoked'; record.terminalAt = event.occurred_at; state.current = null
    } else if (event.action === 'observe') {
      if (!record || event.after_version !== state.version || hasHandoff || hasEvidence || !hasObservation) fail('registry_conflict')
      record.status = event.observation_status; if (event.stage_id !== null) record.stageId = event.stage_id
    } else {
      if (!record || event.after_version !== state.version || !hasHandoff || !hasEvidence || hasObservation) fail('registry_conflict')
      record.handoff = event.handoff_sha256; record.checkpoint = event.evidence_receipt_ref
    }
    folded.set(key, state)
  }
  for (const [key, bindings] of histories) {
    const state = folded.get(key)
    if (!state || state.records.size !== bindings.length) fail('registry_conflict')
    for (const binding of bindings) {
      const record = state.records.get(binding.binding_version)
      if (!record || binding.status !== record.status || binding.stage_id !== record.stageId || binding.continuity_handoff_sha256 !== record.handoff || binding.last_checkpoint_ref !== record.checkpoint) fail('registry_conflict')
      if (binding.status === 'replaced') {
        if (!isoTime(binding.replaced_at) || binding.revoked_at !== undefined || !UUID.test(binding.successor_binding_ref ?? '')) fail('registry_conflict')
      } else if (binding.status === 'revoked') {
        if (binding.revoked_at !== record.terminalAt || binding.replaced_at !== undefined || binding.successor_binding_ref !== null) fail('registry_conflict')
      } else if (binding.replaced_at !== undefined || binding.revoked_at !== undefined || binding.successor_binding_ref !== null) fail('registry_conflict')
    }
  }
}

function validateRegistry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema_version !== 2) fail('registry_unavailable')
  if (!hasExactKeys(value, REGISTRY_KEYS, [...REGISTRY_KEYS]) || !Number.isInteger(value.revision) || value.revision < 0 || !Array.isArray(value.project_ids) || !Array.isArray(value.bindings) || !Array.isArray(value.events)) fail('registry_conflict')
  if (new Set(value.project_ids).size !== value.project_ids.length || value.project_ids.some((id) => !publicStableId(id))) fail('registry_conflict')
  const active = new Set(); const versions = new Map(); const bindingRefs = new Set(); const eventRefs = new Set(); let expectedSequence = 1; const eventVersions = new Map()
  for (const binding of value.bindings) {
    if (!binding || typeof binding !== 'object' || Array.isArray(binding) || !hasExactKeys(binding, BINDING_KEYS, BINDING_REQUIRED_KEYS) || !value.project_ids.includes(binding.project_id) || !SESSION_ROLES.includes(binding.role) || !ALL_STATUSES.has(binding.status) || !Number.isInteger(binding.binding_version) || binding.binding_version < 1 || typeof binding.binding_ref !== 'string' || !UUID.test(binding.binding_ref) || bindingRefs.has(binding.binding_ref) || !(binding.public_alias === null || isPublicSessionAlias(binding.public_alias)) || typeof binding.locator_ref !== 'string' || !binding.locator_ref || typeof binding.provider_class !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(binding.provider_class) || UUID.test(binding.provider_class) || PUBLIC_IDENTIFIER.test(binding.provider_class) || !isoTime(binding.bound_at) || !nullableIsoTime(binding.observed_at) || !nullableStableId(binding.phase_id) || !nullableStableId(binding.scope_id) || !nullableStableId(binding.stage_id) || !nullablePrivateRef(binding.predecessor_binding_ref) || !nullablePrivateRef(binding.successor_binding_ref) || !(binding.continuity_handoff_sha256 === null || SHA256.test(binding.continuity_handoff_sha256)) || !(binding.last_checkpoint_ref === null || typeof binding.last_checkpoint_ref === 'string' && binding.last_checkpoint_ref.length > 0) || !(binding.replaced_at === undefined || isoTime(binding.replaced_at)) || !(binding.revoked_at === undefined || isoTime(binding.revoked_at)) || !(binding.activity === undefined || binding.activity === null || safePublicText(binding.activity)) || !(binding.predecessor_archive_eligible === undefined || typeof binding.predecessor_archive_eligible === 'boolean')) fail('registry_conflict')
    bindingRefs.add(binding.binding_ref)
    const key = `${binding.project_id}:${binding.role}`; const prior = versions.get(key) ?? 0
    if (binding.binding_version !== prior + 1) fail('registry_conflict')
    versions.set(key, binding.binding_version)
    if (CURRENT_STATUSES.has(binding.status)) { if (active.has(key)) fail('registry_conflict'); active.add(key) }
  }
  for (const event of value.events) {
    if (!event || typeof event !== 'object' || Array.isArray(event) || !hasExactKeys(event, EVENT_KEYS, EVENT_REQUIRED_KEYS) || event.sequence !== expectedSequence || typeof event.event_ref !== 'string' || !UUID.test(event.event_ref) || eventRefs.has(event.event_ref) || !value.project_ids.includes(event.project_id) || !SESSION_ROLES.includes(event.role) || !ACTIONS.has(event.action) || !isoTime(event.occurred_at) || !SAFE_CLASS.test(event.actor_class) || UUID.test(event.actor_class) || PUBLIC_IDENTIFIER.test(event.actor_class) || !SAFE_REASON.test(event.reason_class) || UUID.test(event.reason_class) || PUBLIC_IDENTIFIER.test(event.reason_class) || !nullableStableId(event.stage_id) || !(event.handoff_sha256 === undefined || event.handoff_sha256 === null || SHA256.test(event.handoff_sha256)) || !(event.evidence_receipt_ref === undefined || typeof event.evidence_receipt_ref === 'string' && event.evidence_receipt_ref.length > 0) || !(event.observation_status === undefined || CURRENT_STATUSES.has(event.observation_status))) fail('registry_conflict')
    eventRefs.add(event.event_ref)
    const key = `${event.project_id}:${event.role}`; const before = eventVersions.get(key) ?? 0
    if (event.before_version !== before || !Number.isInteger(event.after_version) || event.after_version < before || event.after_version > before + 1) fail('registry_conflict')
    if (['assign', 'replace'].includes(event.action) && event.after_version !== before + 1) fail('registry_conflict')
    if (!['assign', 'replace'].includes(event.action) && event.after_version !== before) fail('registry_conflict')
    eventVersions.set(key, event.after_version)
    expectedSequence += 1
  }
  if (value.next_event_sequence !== expectedSequence || value.revision !== value.events.length) fail('registry_conflict')
  for (const [key, version] of versions) if (eventVersions.get(key) !== version) fail('registry_conflict')
  validateLifecycle(value)
  return value
}

function atomicWrite(path, value) {
  if (process.platform === 'win32' || !Number.isInteger(constants.O_NOFOLLOW)) fail('registry_unavailable')
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`
  const descriptor = openSync(temp, 'wx', 0o600)
  try {
    fchmodSync(descriptor, 0o600)
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    fsyncSync(descriptor)
  } finally { closeSync(descriptor) }
  renameSync(temp, path)
  const directory = openSync(dirname(path), 'r')
  try { fsyncSync(directory) } finally { closeSync(directory) }
}

function atomicCreate(path, value) {
  if (process.platform === 'win32' || !Number.isInteger(constants.O_NOFOLLOW)) fail('registry_unavailable')
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`
  const descriptor = openSync(temp, 'wx', 0o600)
  try {
    fchmodSync(descriptor, 0o600); writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); fsyncSync(descriptor)
  } finally { closeSync(descriptor) }
  try { linkSync(temp, path) } catch (error) { rmSync(temp, { force: true }); if (error && typeof error === 'object' && error.code === 'EEXIST') fail('registry_exists'); fail('registry_unavailable') }
  rmSync(temp, { force: true })
  const directory = openSync(dirname(path), 'r'); try { fsyncSync(directory) } finally { closeSync(directory) }
}

const processIdentity = (pid) => {
  try {
    const value = execFileSync('ps', ['-p', String(pid), '-o', 'uid=', '-o', 'lstart='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1000 }).trim()
    return value ? value.replace(/\s+/g, ' ') : null
  } catch { return null }
}
const lockRef = (bytes) => createHash('sha256').update(bytes).digest('hex')
const lockNow = (value = new Date()) => value instanceof Date ? value : new Date(value)
const directoryEntryExists = (path) => { try { lstatSync(path); return true } catch (error) { return !(error && typeof error === 'object' && error.code === 'ENOENT') } }

function inspectRegistryLock(path, options = {}) {
  const lockPath = `${path}.lock`
  let metadata
  try { metadata = lstatSync(lockPath) } catch (error) { return error && typeof error === 'object' && error.code === 'ENOENT' ? { state: 'clear', recoveryRef: null, ageSeconds: null } : { state: 'invalid', recoveryRef: null, ageSeconds: null } }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null
  if (!metadata.isFile() || metadata.isSymbolicLink() || !exactPrivateMode(metadata) || currentUid !== null && metadata.uid !== currentUid || !Number.isInteger(constants.O_NOFOLLOW)) return { state: 'invalid', recoveryRef: null, ageSeconds: null }
  let descriptor; let bytes; let value
  try {
    descriptor = openSync(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW)
    if (!sameFile(metadata, fstatSync(descriptor))) return { state: 'invalid', recoveryRef: null, ageSeconds: null }
    bytes = readFileSync(descriptor)
    value = JSON.parse(bytes.toString('utf8'))
  } catch { return { state: 'invalid', recoveryRef: null, ageSeconds: null } } finally { if (descriptor !== undefined) closeSync(descriptor) }
  const recoveryRef = lockRef(bytes); const age = lockNow(options.now).getTime() - Date.parse(value?.created_at)
  if (!value || typeof value !== 'object' || Array.isArray(value) || !hasExactKeys(value, LOCK_KEYS, [...LOCK_KEYS]) || value.schema_version !== 1 || !Number.isInteger(value.owner_pid) || value.owner_pid < 1 || value.owner_uid !== currentUid || typeof value.process_start_identity !== 'string' || !value.process_start_identity || !isoTime(value.created_at) || !UUID.test(value.owner_nonce) || !Number.isFinite(age) || age < 0) return { state: 'invalid', recoveryRef, ageSeconds: null }
  const ageSeconds = Math.floor(age / 1000)
  if (processIdentity(value.owner_pid) === value.process_start_identity) return { state: 'live', recoveryRef, ageSeconds }
  if (age < LOCK_STALE_MILLISECONDS) return { state: 'unconfirmed', recoveryRef, ageSeconds }
  return { state: 'orphaned', recoveryRef, ageSeconds }
}

function withLock(path, operation) {
  const lockPath = `${path}.lock`; const identity = processIdentity(process.pid)
  if (!identity) fail('registry_lock_identity_unavailable')
  const candidatePath = `${lockPath}.candidate-${process.pid}-${randomUUID()}`
  const descriptor = openSync(candidatePath, 'wx', 0o600)
  try {
    fchmodSync(descriptor, 0o600)
    writeFileSync(descriptor, `${JSON.stringify({ schema_version: 1, owner_pid: process.pid, owner_uid: typeof process.getuid === 'function' ? process.getuid() : null, process_start_identity: identity, created_at: new Date().toISOString(), owner_nonce: randomUUID() })}\n`, 'utf8'); fsyncSync(descriptor)
  } finally { closeSync(descriptor) }
  try { linkSync(candidatePath, lockPath) } catch (error) { rmSync(candidatePath, { force: true }); if (error && typeof error === 'object' && error.code === 'EEXIST') fail('registry_busy'); fail('registry_lock_unavailable') }
  rmSync(candidatePath, { force: true })
  try { return operation() } finally { rmSync(lockPath, { force: true }) }
}

export function createEmptyRegistry(path, projectIds) {
  if (!Array.isArray(projectIds) || !projectIds.length || new Set(projectIds).size !== projectIds.length || projectIds.some((id) => !publicStableId(id))) fail('invalid_project_registry')
  const registry = { schema_version: 2, revision: 0, next_event_sequence: 1, project_ids: [...projectIds], bindings: [], events: [] }
  atomicCreate(path, registry)
  return clone(registry)
}

export function loadRegistry(path) {
  try {
    return clone(validateRegistry(JSON.parse(readExactPrivateFile(path).toString('utf8'))))
  } catch (error) {
    if (error instanceof Error && ['registry_conflict', 'registry_unavailable'].includes(error.message)) throw error
    fail('registry_unavailable')
  }
}

const currentFor = (registry, projectId, role) => registry.bindings.find((binding) => binding.project_id === projectId && binding.role === role && CURRENT_STATUSES.has(binding.status)) ?? null
const historyFor = (registry, projectId, role) => registry.bindings.filter((binding) => binding.project_id === projectId && binding.role === role)

function validateInput(registry, input) {
  if (!ACTIONS.has(input.action)) fail('unsupported_action')
  if (!registry.project_ids.includes(input.projectId)) fail('project_not_found')
  if (!SESSION_ROLES.includes(input.role)) fail('unsupported_role')
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) fail('expected_version_required')
  if (typeof input.actorClass !== 'string' || !SAFE_CLASS.test(input.actorClass) || UUID.test(input.actorClass) || PUBLIC_IDENTIFIER.test(input.actorClass) || typeof input.reasonClass !== 'string' || !SAFE_REASON.test(input.reasonClass) || UUID.test(input.reasonClass) || PUBLIC_IDENTIFIER.test(input.reasonClass)) fail('mutation_metadata_required')
  if (typeof input.occurredAt !== 'string' || !Number.isFinite(Date.parse(input.occurredAt))) fail('occurred_at_required')
  for (const value of [input.phaseId, input.scopeId, input.stageId]) if (value != null && !publicStableId(value)) fail('invalid_stage_placement')
  if (input.providerClass != null && (typeof input.providerClass !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(input.providerClass) || UUID.test(input.providerClass) || PUBLIC_IDENTIFIER.test(input.providerClass))) fail('unsupported_provider')
  if (['assign', 'replace'].includes(input.action) && !isPublicSessionAlias(input.publicAlias)) fail('public_alias_required')
  if (input.action === 'replace' && input.role === 'planner' && !(input.routingFreeze === true && input.handoffVerified === true && input.started === true && input.continuityReady === true && SHA256.test(input.handoffSha256 ?? ''))) fail('planner_rotation_unsafe')
}

function appendEvent(registry, input, beforeVersion, afterVersion, extras = {}) {
  registry.events.push({
    event_ref: randomUUID(), sequence: registry.next_event_sequence, project_id: input.projectId, role: input.role,
    action: input.action, before_version: beforeVersion, after_version: afterVersion, actor_class: input.actorClass,
    reason_class: input.reasonClass, occurred_at: input.occurredAt, stage_id: input.stageId ?? null, ...extras,
  })
  registry.next_event_sequence += 1; registry.revision += 1
}

export function mutateRegistry(path, input) {
  return withLock(path, () => {
    const registry = loadRegistry(path); validateInput(registry, input)
    const current = currentFor(registry, input.projectId, input.role)
    const history = historyFor(registry, input.projectId, input.role)
    const currentVersion = current?.binding_version ?? history.at(-1)?.binding_version ?? 0
    if (input.expectedVersion !== currentVersion) fail('stale_version')
    let result
    if (input.action === 'assign') {
      if (current) fail('duplicate_active_binding')
      if (typeof input.locator !== 'string' || !input.locator) fail('locator_private_input_required')
      const version = currentVersion + 1
      result = { binding_ref: randomUUID(), public_alias: input.publicAlias, project_id: input.projectId, role: input.role, provider_class: input.providerClass ?? 'codex', locator_ref: input.locator, binding_version: version, status: 'active', phase_id: input.phaseId ?? null, scope_id: input.scopeId ?? null, stage_id: input.stageId ?? null, bound_at: input.occurredAt, observed_at: null, predecessor_binding_ref: history.at(-1)?.binding_ref ?? null, successor_binding_ref: null, continuity_handoff_sha256: null, last_checkpoint_ref: null }
      registry.bindings.push(result); appendEvent(registry, input, currentVersion, version)
    } else if (input.action === 'replace') {
      if (!current) fail('binding_not_active')
      if (typeof input.locator !== 'string' || !input.locator) fail('locator_private_input_required')
      if (input.publicAlias === current.public_alias) fail('public_alias_conflict')
      const version = currentVersion + 1
      result = { binding_ref: randomUUID(), public_alias: input.publicAlias, project_id: current.project_id, role: current.role, provider_class: input.providerClass ?? current.provider_class, locator_ref: input.locator, binding_version: version, status: 'active', phase_id: input.phaseId ?? current.phase_id, scope_id: input.scopeId ?? current.scope_id, stage_id: input.stageId ?? current.stage_id, bound_at: input.occurredAt, observed_at: null, predecessor_binding_ref: current.binding_ref, successor_binding_ref: null, continuity_handoff_sha256: input.handoffSha256 ?? null, last_checkpoint_ref: null, predecessor_archive_eligible: false }
      current.status = 'replaced'; current.replaced_at = input.occurredAt; current.successor_binding_ref = result.binding_ref
      registry.bindings.push(result); appendEvent(registry, input, currentVersion, version, { handoff_sha256: input.handoffSha256 ?? null })
    } else if (input.action === 'revoke') {
      if (!current) fail('binding_not_active')
      current.status = 'revoked'; current.revoked_at = input.occurredAt; result = current
      appendEvent(registry, input, currentVersion, currentVersion)
    } else if (input.action === 'observe') {
      if (!current) fail('binding_not_active')
      if (!['active', 'idle', 'stale', 'rotating', 'blocked'].includes(input.status) || typeof input.observedAt !== 'string' || !Number.isFinite(Date.parse(input.observedAt))) fail('invalid_observation')
      current.status = input.status; current.observed_at = input.observedAt; current.activity = typeof input.activity === 'string' ? input.activity : null
      current.phase_id = input.phaseId ?? current.phase_id; current.scope_id = input.scopeId ?? current.scope_id; current.stage_id = input.stageId ?? current.stage_id; result = current
      appendEvent(registry, input, currentVersion, currentVersion, { observation_status: input.status })
    } else {
      if (!current) fail('binding_not_active')
      if (!SHA256.test(input.handoffSha256 ?? '') || typeof input.checkpointRef !== 'string' || !input.checkpointRef) fail('invalid_checkpoint')
      current.continuity_handoff_sha256 = input.handoffSha256; current.last_checkpoint_ref = input.checkpointRef; result = current
      appendEvent(registry, input, currentVersion, currentVersion, { handoff_sha256: input.handoffSha256, evidence_receipt_ref: input.checkpointRef })
    }
    validateRegistry(registry); atomicWrite(path, registry)
    return clone(result)
  })
}

export function publicRegistryProjection(registry, projectId) {
  validateRegistry(registry)
  return SESSION_ROLES.map((role) => {
    const bindings = historyFor(registry, projectId, role); const current = bindings.find((binding) => CURRENT_STATUSES.has(binding.status)) ?? null
    const events = registry.events.filter((event) => event.project_id === projectId && event.role === role)
    return {
      project_id: safePublicId(projectId), role, public_alias: current?.public_alias && isPublicSessionAlias(current.public_alias) ? current.public_alias : null, status: current?.status ?? 'unbound', binding_version: current?.binding_version ?? bindings.at(-1)?.binding_version ?? 0,
      history_count: bindings.length, bound_at: safePublicTime(current?.bound_at), observed_at: safePublicTime(current?.observed_at), activity: sanitizedPublicText(current?.activity),
      phase_id: safePublicId(current?.phase_id), scope_id: safePublicId(current?.scope_id), stage_id: safePublicId(current?.stage_id),
      rotating: current?.status === 'rotating', has_predecessor: Boolean(current?.predecessor_binding_ref),
      history: events.map((event) => ({ action: event.action, before_version: event.before_version, after_version: event.after_version, occurred_at: safePublicTime(event.occurred_at), reason_class: safePublicReason(event.reason_class), stage_id: safePublicId(event.stage_id) })),
    }
  })
}

export function doctorRegistry(path, projectIds, options = {}) {
  let metadata
  try { metadata = lstatSync(path) } catch { return { ok: false, schemaVersion: null, revision: null, projects: 0, roleSlots: 0, issues: ['registry_unavailable'], lock: inspectRegistryLock(path, options) } }
  if (!metadata.isFile() || metadata.isSymbolicLink()) return { ok: false, schemaVersion: null, revision: null, projects: 0, roleSlots: 0, issues: ['registry_unavailable'], lock: inspectRegistryLock(path, options) }
  if (!exactPrivateMode(metadata)) return { ok: false, schemaVersion: null, revision: null, projects: 0, roleSlots: 0, issues: ['registry_permissions_invalid'], lock: inspectRegistryLock(path, options) }
  let registry
  try { registry = loadRegistry(path) } catch (error) { return { ok: false, schemaVersion: null, revision: null, projects: 0, roleSlots: 0, issues: [error instanceof Error && error.message === 'registry_conflict' ? 'registry_conflict' : 'registry_unavailable'], lock: inspectRegistryLock(path, options) } }
  const issues = []; const lock = inspectRegistryLock(path, options)
  if (lock.state !== 'clear') issues.push(`registry_lock_${lock.state}`)
  if (Array.isArray(projectIds) && projectIds.some((id) => !registry.project_ids.includes(id))) issues.push('project_missing')
  for (const projectId of registry.project_ids) for (const role of SESSION_ROLES) if (!publicRegistryProjection(registry, projectId).find((row) => row.role === role)) issues.push(`role_missing:${projectId}:${role}`)
  return { ok: issues.length === 0, schemaVersion: 2, revision: registry.revision, projects: registry.project_ids.length, roleSlots: registry.project_ids.length * SESSION_ROLES.length, issues, lock }
}

export function recoverRegistryLock(path, { recoveryRef, now = new Date() } = {}) {
  const diagnosis = inspectRegistryLock(path, { now })
  if (diagnosis.state === 'clear') fail('registry_lock_missing')
  if (diagnosis.state === 'live') fail('registry_lock_live')
  if (diagnosis.state !== 'orphaned') fail(`registry_lock_${diagnosis.state}`)
  if (typeof recoveryRef !== 'string' || recoveryRef !== diagnosis.recoveryRef) fail('registry_lock_changed')
  const lockPath = `${path}.lock`; const quarantine = `${lockPath}.recovery-${randomUUID()}`
  try {
    renameSync(lockPath, quarantine)
    if (lockRef(readExactPrivateFile(quarantine, 'registry_lock_changed')) !== recoveryRef) {
      if (!directoryEntryExists(lockPath)) renameSync(quarantine, lockPath)
      fail('registry_lock_changed')
    }
    rmSync(quarantine)
  } catch (error) {
    if (error instanceof Error && error.message === 'registry_lock_changed') throw error
    fail('registry_lock_changed')
  }
  return { ok: true, recovered: true }
}

export function migrateLegacyRegistry({ legacyPath, registryPath, projectIds, occurredAt }) {
  if (directoryEntryExists(registryPath)) fail('registry_exists')
  const bytes = readFileSync(legacyPath); let legacy
  try { legacy = JSON.parse(bytes.toString('utf8')) } catch { fail('registry_unavailable') }
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy) || Object.hasOwn(legacy, 'schema_version') || !Array.isArray(legacy.bindings)) fail('legacy_schema_invalid')
  const registry = { schema_version: 2, revision: 0, next_event_sequence: 1, project_ids: [...projectIds], bindings: [], events: [] }; const seen = new Set()
  for (const row of legacy.bindings) {
    if (!row || !projectIds.includes(row.project_id) || !SESSION_ROLES.includes(row.role)) fail('legacy_schema_invalid')
    const key = `${row.project_id}:${row.role}`; if (seen.has(key)) fail('registry_conflict'); seen.add(key)
    const binding = { binding_ref: randomUUID(), public_alias: null, project_id: row.project_id, role: row.role, provider_class: typeof row.provider_class === 'string' ? row.provider_class : 'codex', locator_ref: typeof row.locator_ref === 'string' ? row.locator_ref : 'legacy-unresolved', binding_version: 1, status: 'stale', phase_id: row.phase_id ?? null, scope_id: row.scope_id ?? null, stage_id: row.stage_id ?? null, bound_at: typeof row.bound_at === 'string' ? row.bound_at : occurredAt, observed_at: null, predecessor_binding_ref: null, successor_binding_ref: null, continuity_handoff_sha256: null, last_checkpoint_ref: null }
    registry.bindings.push(binding)
    const migrationInput = { projectId: row.project_id, role: row.role, action: 'assign', actorClass: 'migration', reasonClass: 'legacy_stale_migration', occurredAt, stageId: binding.stage_id }
    appendEvent(registry, migrationInput, 0, 1)
    appendEvent(registry, { ...migrationInput, action: 'observe' }, 1, 1, { observation_status: 'stale' })
  }
  validateRegistry(registry); atomicWrite(registryPath, registry)
  return { source_sha256: createHash('sha256').update(bytes).digest('hex'), source_mode: (statSync(legacyPath).mode & 0o777).toString(8).padStart(4, '0'), migrated_bindings: registry.bindings.length, stale_by_default: true }
}
