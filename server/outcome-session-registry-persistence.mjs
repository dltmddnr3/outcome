import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
const BINDING_KEYS = new Set(['binding_ref', 'project_id', 'role', 'provider_class', 'locator_ref', 'binding_version', 'status', 'phase_id', 'scope_id', 'stage_id', 'bound_at', 'observed_at', 'predecessor_binding_ref', 'successor_binding_ref', 'continuity_handoff_sha256', 'last_checkpoint_ref', 'replaced_at', 'revoked_at', 'activity', 'predecessor_archive_eligible'])
const BINDING_REQUIRED_KEYS = ['binding_ref', 'project_id', 'role', 'provider_class', 'locator_ref', 'binding_version', 'status', 'phase_id', 'scope_id', 'stage_id', 'bound_at', 'observed_at', 'predecessor_binding_ref', 'successor_binding_ref', 'continuity_handoff_sha256', 'last_checkpoint_ref']
const EVENT_KEYS = new Set(['event_ref', 'sequence', 'project_id', 'role', 'action', 'before_version', 'after_version', 'actor_class', 'reason_class', 'occurred_at', 'stage_id', 'handoff_sha256', 'evidence_receipt_ref', 'observation_status'])
const EVENT_REQUIRED_KEYS = ['event_ref', 'sequence', 'project_id', 'role', 'action', 'before_version', 'after_version', 'actor_class', 'reason_class', 'occurred_at', 'stage_id']
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

function validateRegistry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema_version !== 2) fail('registry_unavailable')
  if (!hasExactKeys(value, REGISTRY_KEYS, [...REGISTRY_KEYS]) || !Number.isInteger(value.revision) || value.revision < 0 || !Array.isArray(value.project_ids) || !Array.isArray(value.bindings) || !Array.isArray(value.events)) fail('registry_conflict')
  if (new Set(value.project_ids).size !== value.project_ids.length || value.project_ids.some((id) => !publicStableId(id))) fail('registry_conflict')
  const active = new Set(); const versions = new Map(); const bindingRefs = new Set(); const eventRefs = new Set(); let expectedSequence = 1; const eventVersions = new Map()
  for (const binding of value.bindings) {
    if (!binding || typeof binding !== 'object' || Array.isArray(binding) || !hasExactKeys(binding, BINDING_KEYS, BINDING_REQUIRED_KEYS) || !value.project_ids.includes(binding.project_id) || !SESSION_ROLES.includes(binding.role) || !ALL_STATUSES.has(binding.status) || !Number.isInteger(binding.binding_version) || binding.binding_version < 1 || typeof binding.binding_ref !== 'string' || !UUID.test(binding.binding_ref) || bindingRefs.has(binding.binding_ref) || typeof binding.locator_ref !== 'string' || !binding.locator_ref || typeof binding.provider_class !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(binding.provider_class) || UUID.test(binding.provider_class) || PUBLIC_IDENTIFIER.test(binding.provider_class) || !isoTime(binding.bound_at) || !nullableIsoTime(binding.observed_at) || !nullableStableId(binding.phase_id) || !nullableStableId(binding.scope_id) || !nullableStableId(binding.stage_id) || !nullablePrivateRef(binding.predecessor_binding_ref) || !nullablePrivateRef(binding.successor_binding_ref) || !(binding.continuity_handoff_sha256 === null || SHA256.test(binding.continuity_handoff_sha256)) || !(binding.last_checkpoint_ref === null || typeof binding.last_checkpoint_ref === 'string' && binding.last_checkpoint_ref.length > 0) || !(binding.replaced_at === undefined || isoTime(binding.replaced_at)) || !(binding.revoked_at === undefined || isoTime(binding.revoked_at)) || !(binding.activity === undefined || binding.activity === null || safePublicText(binding.activity)) || !(binding.predecessor_archive_eligible === undefined || typeof binding.predecessor_archive_eligible === 'boolean')) fail('registry_conflict')
    bindingRefs.add(binding.binding_ref)
    const key = `${binding.project_id}:${binding.role}`; const prior = versions.get(key) ?? 0
    if (binding.binding_version <= prior) fail('registry_conflict')
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
  return value
}

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`
  const descriptor = openSync(temp, 'wx', 0o600)
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    fsyncSync(descriptor)
  } finally { closeSync(descriptor) }
  renameSync(temp, path)
  const directory = openSync(dirname(path), 'r')
  try { fsyncSync(directory) } finally { closeSync(directory) }
}

function withLock(path, operation) {
  const lockPath = `${path}.lock`; let descriptor
  try { descriptor = openSync(lockPath, 'wx', 0o600) } catch { fail('registry_busy') }
  try { return operation() } finally { closeSync(descriptor); rmSync(lockPath, { force: true }) }
}

export function createEmptyRegistry(path, projectIds) {
  if (!Array.isArray(projectIds) || !projectIds.length || new Set(projectIds).size !== projectIds.length || projectIds.some((id) => !publicStableId(id))) fail('invalid_project_registry')
  if (existsSync(path)) fail('registry_exists')
  const registry = { schema_version: 2, revision: 0, next_event_sequence: 1, project_ids: [...projectIds], bindings: [], events: [] }
  atomicWrite(path, registry)
  return clone(registry)
}

export function loadRegistry(path) {
  try { return clone(validateRegistry(JSON.parse(readFileSync(path, 'utf8')))) } catch (error) {
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
      result = { binding_ref: randomUUID(), project_id: input.projectId, role: input.role, provider_class: input.providerClass ?? 'codex', locator_ref: input.locator, binding_version: version, status: 'active', phase_id: input.phaseId ?? null, scope_id: input.scopeId ?? null, stage_id: input.stageId ?? null, bound_at: input.occurredAt, observed_at: null, predecessor_binding_ref: history.at(-1)?.binding_ref ?? null, successor_binding_ref: null, continuity_handoff_sha256: null, last_checkpoint_ref: null }
      registry.bindings.push(result); appendEvent(registry, input, currentVersion, version)
    } else if (input.action === 'replace') {
      if (!current) fail('binding_not_active')
      if (typeof input.locator !== 'string' || !input.locator) fail('locator_private_input_required')
      const version = currentVersion + 1
      result = { ...current, binding_ref: randomUUID(), locator_ref: input.locator, binding_version: version, status: 'active', bound_at: input.occurredAt, observed_at: null, predecessor_binding_ref: current.binding_ref, successor_binding_ref: null, continuity_handoff_sha256: input.handoffSha256 ?? null, last_checkpoint_ref: null, predecessor_archive_eligible: input.role === 'planner' }
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
      project_id: safePublicId(projectId), role, status: current?.status ?? 'unbound', binding_version: current?.binding_version ?? bindings.at(-1)?.binding_version ?? 0,
      history_count: bindings.length, bound_at: safePublicTime(current?.bound_at), observed_at: safePublicTime(current?.observed_at), activity: sanitizedPublicText(current?.activity),
      phase_id: safePublicId(current?.phase_id), scope_id: safePublicId(current?.scope_id), stage_id: safePublicId(current?.stage_id),
      rotating: current?.status === 'rotating', has_predecessor: Boolean(current?.predecessor_binding_ref),
      history: events.map((event) => ({ action: event.action, before_version: event.before_version, after_version: event.after_version, occurred_at: safePublicTime(event.occurred_at), reason_class: safePublicReason(event.reason_class), stage_id: safePublicId(event.stage_id) })),
    }
  })
}

export function doctorRegistry(path, projectIds) {
  const registry = loadRegistry(path); const issues = []
  if ((statSync(path).mode & 0o077) !== 0) issues.push('registry_permissions_too_open')
  if (Array.isArray(projectIds) && projectIds.some((id) => !registry.project_ids.includes(id))) issues.push('project_missing')
  for (const projectId of registry.project_ids) for (const role of SESSION_ROLES) if (!publicRegistryProjection(registry, projectId).find((row) => row.role === role)) issues.push(`role_missing:${projectId}:${role}`)
  return { ok: issues.length === 0, schemaVersion: 2, revision: registry.revision, projects: registry.project_ids.length, roleSlots: registry.project_ids.length * SESSION_ROLES.length, issues }
}

export function migrateLegacyRegistry({ legacyPath, registryPath, projectIds, occurredAt }) {
  if (existsSync(registryPath)) fail('registry_exists')
  const bytes = readFileSync(legacyPath); let legacy
  try { legacy = JSON.parse(bytes.toString('utf8')) } catch { fail('registry_unavailable') }
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy) || Object.hasOwn(legacy, 'schema_version') || !Array.isArray(legacy.bindings)) fail('legacy_schema_invalid')
  const registry = { schema_version: 2, revision: 0, next_event_sequence: 1, project_ids: [...projectIds], bindings: [], events: [] }; const seen = new Set()
  for (const row of legacy.bindings) {
    if (!row || !projectIds.includes(row.project_id) || !SESSION_ROLES.includes(row.role)) fail('legacy_schema_invalid')
    const key = `${row.project_id}:${row.role}`; if (seen.has(key)) fail('registry_conflict'); seen.add(key)
    const binding = { binding_ref: randomUUID(), project_id: row.project_id, role: row.role, provider_class: typeof row.provider_class === 'string' ? row.provider_class : 'codex', locator_ref: typeof row.locator_ref === 'string' ? row.locator_ref : 'legacy-unresolved', binding_version: 1, status: 'stale', phase_id: row.phase_id ?? null, scope_id: row.scope_id ?? null, stage_id: row.stage_id ?? null, bound_at: typeof row.bound_at === 'string' ? row.bound_at : occurredAt, observed_at: null, predecessor_binding_ref: null, successor_binding_ref: null, continuity_handoff_sha256: null, last_checkpoint_ref: null }
    registry.bindings.push(binding)
    appendEvent(registry, { projectId: row.project_id, role: row.role, action: 'assign', actorClass: 'migration', reasonClass: 'legacy_stale_migration', occurredAt }, 0, 1)
  }
  validateRegistry(registry); atomicWrite(registryPath, registry)
  return { source_sha256: createHash('sha256').update(bytes).digest('hex'), source_mode: (statSync(legacyPath).mode & 0o777).toString(8).padStart(4, '0'), migrated_bindings: registry.bindings.length, stale_by_default: true }
}
