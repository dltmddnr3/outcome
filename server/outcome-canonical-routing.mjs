import { isProxy } from 'node:util/types'
import { createOutcomeExecutionControlPlane } from './outcome-execution-control-plane.mjs'

const IDENTIFIER = /^[a-z][a-z0-9_]{0,95}$/
const SHA256 = /^[a-f0-9]{64}$/
const GIT_OBJECT = /^[a-f0-9]{40}$/
const INTENTS = new Set(['read_only_status'])
const SCOPES = new Set(['approved_package_and_git_status'])
const BINDING_KEYS = ['project_id', 'role', 'version', 'state', 'health', 'public_alias', 'transport_class']
const BINDING_STATES = new Set(['active', 'replaced', 'revoked', 'conflict', 'blocked'])

const fail = (code) => { throw new Error(code) }
const clone = (value) => structuredClone(value)
const id = (value) => typeof value === 'string' && IDENTIFIER.test(value) ? value : fail('invalid_command')
const digest = (value) => typeof value === 'string' && SHA256.test(value) ? value : fail('invalid_command')
const gitObject = (value) => typeof value === 'string' && GIT_OBJECT.test(value) ? value : fail('invalid_command')
const integer = (value) => Number.isSafeInteger(value) && value > 0 ? value : fail('invalid_command')

const exact = (value, keys, code = 'invalid_command') => {
  if (!value || typeof value !== 'object' || isProxy(value)) fail(code)
  let prototype
  let descriptors
  try { prototype = Object.getPrototypeOf(value); descriptors = Object.getOwnPropertyDescriptors(value) } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const actual = Reflect.ownKeys(descriptors)
  if (actual.some((key) => typeof key !== 'string')) fail(code)
  const sorted = actual.sort(); const expected = [...keys].sort()
  if (sorted.length !== expected.length || sorted.some((key, index) => key !== expected[index])) fail(code)
  const result = Object.create(null)
  for (const key of sorted) {
    const descriptor = descriptors[key]
    if (!Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) fail(code)
    result[key] = descriptor.value
  }
  return result
}

const safeArrayValues = (value, code) => {
  if (!Array.isArray(value) || isProxy(value)) fail(code)
  let descriptors
  try { descriptors = Object.getOwnPropertyDescriptors(value) } catch { fail(code) }
  const length = descriptors.length?.value
  if (!Number.isSafeInteger(length) || length < 0) fail(code)
  const expected = new Set(['length', ...Array.from({ length }, (_, index) => String(index))])
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !expected.has(key))) fail(code)
  return Array.from({ length }, (_, index) => {
    const descriptor = descriptors[index]
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) fail(code)
    return descriptor.value
  })
}

const array = (value, code = 'corrupt_snapshot') => {
  if (!Array.isArray(value) || isProxy(value)) fail(code)
  return value.map((item) => clone(item))
}

const instructionIdentity = (row) => JSON.stringify({
  instruction_id: row.instruction_id,
  idempotency_key: row.idempotency_key,
  project_id: row.project_id,
  planner_binding_version: row.planner_binding_version,
  target_role: row.target_role,
  target_binding_version: row.target_binding_version,
  intent_class: row.intent_class,
  scope_class: row.scope_class,
})

const normalizeSnapshot = (value) => {
  if (value === undefined) return { schema_version: 1, control_plane: undefined, instructions: [], transport_receipts: [], role_results: [], evidence_pointers: [], gate_decisions: [], automatic_retry_count: 0 }
  const row = exact(value, ['schema_version', 'control_plane', 'instructions', 'transport_receipts', 'role_results', 'evidence_pointers', 'gate_decisions', 'automatic_retry_count'])
  if (row.schema_version !== 1 || row.automatic_retry_count !== 0) fail('corrupt_snapshot')
  const state = {
    schema_version: 1,
    control_plane: clone(row.control_plane),
    instructions: array(row.instructions),
    transport_receipts: array(row.transport_receipts),
    role_results: array(row.role_results),
    evidence_pointers: array(row.evidence_pointers),
    gate_decisions: array(row.gate_decisions),
    automatic_retry_count: 0,
  }
  if (new Set(state.instructions.map(({ instruction_id }) => instruction_id)).size !== state.instructions.length) fail('corrupt_snapshot')
  if (new Set(state.instructions.map(({ idempotency_key }) => idempotency_key)).size !== state.instructions.length) fail('corrupt_snapshot')
  if (state.gate_decisions.length !== 0) fail('corrupt_snapshot')
  return state
}

const boundaryFor = (lifecycle) => ({
  start_validated: 'trusted_provider_send_required',
  dispatch_observed: 'destination_started_observation_required',
  execution_started: 'role_result_required',
  role_result_recorded: 'evidence_attachment_required',
  delivery_unknown: 'planner_recovery_decision_required',
}[lifecycle] ?? 'fresh_qa_required')

const bindingGuidance = Object.freeze({
  ready: { next_boundary: 'read_only_instruction_required', cherry_action: 'none' },
  stale: { next_boundary: 'planner_binding_revalidation_required', cherry_action: 'revalidate_builder_binding' },
  blocked: { next_boundary: 'binding_blocker_resolution_required', cherry_action: 'resolve_builder_blocker' },
  replaced: { next_boundary: 'current_binding_resolution_required', cherry_action: 'resolve_current_builder_binding' },
  unavailable: { next_boundary: 'manual_navigation_or_recovery_required', cherry_action: 'recover_builder_binding' },
})

export function createOutcomeCanonicalRouting({ registry, evidenceResolver, snapshot, clock = Date.now } = {}) {
  const restored = normalizeSnapshot(snapshot)
  const registryRow = exact(registry, ['bindings'], 'invalid_registry')
  const bindings = safeArrayValues(registryRow.bindings, 'invalid_registry').map((binding) => exact(binding, BINDING_KEYS, 'invalid_registry'))
  if (bindings.some((binding) => !BINDING_STATES.has(binding.state))) fail('invalid_registry')
  const planners = bindings.filter((binding) => binding?.project_id === 'outcome' && binding?.role === 'planner')
  const builders = bindings.filter((binding) => binding?.project_id === 'outcome' && binding?.role === 'builder')
  if (planners.length !== 1 || builders.length > 1 || (builders.length === 0 && bindings.some((binding) => binding.role === 'builder'))) fail('invalid_registry')
  const planner = planners[0]
  const builder = builders[0] ?? null
  const bindingCondition = builder === null ? 'unavailable' : builder.state === 'blocked' ? 'blocked' : builder.state === 'replaced' ? 'replaced' : builder.state !== 'active' || builder.health === 'offline' ? 'unavailable' : builder.health === 'stale' ? 'stale' : 'ready'
  const controlRegistry = { bindings: bindings.map((binding) => binding.state === 'blocked' ? { ...binding, state: 'conflict' } : { ...binding }) }
  const controlPlane = createOutcomeExecutionControlPlane({ registry: controlRegistry, evidenceResolver, snapshot: restored.control_plane, clock })
  const state = {
    schema_version: 1,
    instructions: restored.instructions,
    transport_receipts: restored.transport_receipts,
    role_results: restored.role_results,
    evidence_pointers: restored.evidence_pointers,
    gate_decisions: restored.gate_decisions,
    automatic_retry_count: 0,
  }

  const exportPrivateState = () => ({ ...clone(state), control_plane: controlPlane.exportPrivateState() })

  const createInstruction = (value) => {
    const row = exact(value, ['instruction_id', 'attempt_id', 'idempotency_key', 'project_id', 'planner_binding_version', 'target_role', 'target_binding_version', 'target_public_alias', 'intent_class', 'scope_class', 'retry_of_attempt_id', 'trusted_evidence'])
    const command = {
      instruction_id: id(row.instruction_id), attempt_id: id(row.attempt_id), idempotency_key: id(row.idempotency_key), project_id: id(row.project_id),
      planner_binding_version: integer(row.planner_binding_version), target_role: id(row.target_role), target_binding_version: integer(row.target_binding_version),
      target_public_alias: id(row.target_public_alias), intent_class: INTENTS.has(row.intent_class) ? row.intent_class : fail('invalid_command'),
      scope_class: SCOPES.has(row.scope_class) ? row.scope_class : fail('invalid_command'), retry_of_attempt_id: row.retry_of_attempt_id === null ? null : id(row.retry_of_attempt_id),
    }
    if (command.project_id !== 'outcome' || planner.role !== 'planner' || planner.version !== command.planner_binding_version || planner.state !== 'active' || planner.health !== 'fresh') fail('planner_binding_mismatch')
    if (command.target_role !== 'builder') fail('route_denied')
    if (builder === null) return { outcome: 'safe_hold', reason: 'binding_unavailable' }
    if (builder.version !== command.target_binding_version || builder.public_alias !== command.target_public_alias) fail('route_denied')
    const existingByKey = state.instructions.find((item) => item.idempotency_key === command.idempotency_key)
    if (existingByKey && instructionIdentity(existingByKey) !== instructionIdentity(command)) fail('idempotency_conflict')
    const existingByInstruction = state.instructions.find((item) => item.instruction_id === command.instruction_id)
    if (existingByInstruction && instructionIdentity(existingByInstruction) !== instructionIdentity(command)) fail('instruction_conflict')
    const result = controlPlane.start({
      project_id: command.project_id, role: command.target_role, instruction_id: command.instruction_id, attempt_id: command.attempt_id,
      expected_binding_version: command.target_binding_version, action: 'read_only', risk_class: 'lightweight', source_state: 'matched', stage_gate_present: false,
      authority: 'within_scope', retry_of_attempt_id: command.retry_of_attempt_id, transport_class: 'codex_app_peer_thread', public_alias: command.target_public_alias,
      trusted_evidence: row.trusted_evidence,
    })
    if (result.outcome !== 'started') return result
    if (!existingByInstruction) {
      const attempt = controlPlane.exportPrivateState().attempts.find((item) => item.instruction_id === command.instruction_id && item.attempt_id === command.attempt_id)
      state.instructions.push({
        instruction_id: command.instruction_id, idempotency_key: command.idempotency_key, project_id: command.project_id,
        planner_binding_version: command.planner_binding_version, target_role: command.target_role, target_binding_version: command.target_binding_version,
        intent_class: command.intent_class, scope_class: command.scope_class, created_at: attempt.started_at,
      })
    }
    return { outcome: 'started', lifecycle: 'start_validated', idempotent: result.idempotent }
  }

  const transport = (value, event, kind) => {
    const row = exact(value, ['instruction_id', 'attempt_id', 'trusted_evidence'])
    const instructionId = id(row.instruction_id); const attemptId = id(row.attempt_id)
    const result = controlPlane.transition({ instruction_id: instructionId, attempt_id: attemptId, event, trusted_evidence: row.trusted_evidence })
    if (!result.idempotent) {
      const recorded = controlPlane.exportPrivateState().events.at(-1)
      state.transport_receipts.push({ instruction_id: instructionId, attempt_id: attemptId, kind, receipt_id: recorded.receipt_id, observation_cursor: recorded.observation_cursor, observed_at: recorded.observed_at })
    }
    return result
  }

  const recordDeliveryUnknown = (value) => {
    const row = exact(value, ['instruction_id', 'attempt_id', 'reason_class'])
    if (row.reason_class !== 'timeout' && row.reason_class !== 'missing_ack') fail('invalid_command')
    return controlPlane.transition({ instruction_id: id(row.instruction_id), attempt_id: id(row.attempt_id), event: 'delivery_unknown', reason_class: row.reason_class })
  }

  const recordRoleResult = (value) => {
    const row = exact(value, ['instruction_id', 'attempt_id', 'result_class', 'result_receipt_sha256'])
    const instructionId = id(row.instruction_id); const attemptId = id(row.attempt_id); const receipt = digest(row.result_receipt_sha256)
    if (!['candidate_ready', 'blocked', 'safe_hold', 'failed'].includes(row.result_class)) fail('invalid_command')
    const existing = state.role_results.find((item) => item.instruction_id === instructionId && item.attempt_id === attemptId)
    if (existing) {
      if (existing.result_class !== row.result_class || existing.result_receipt_sha256 !== receipt) fail('role_result_conflict')
      return { outcome: 'event_recorded', lifecycle: 'role_result_recorded', idempotent: true }
    }
    const result = controlPlane.transition({ instruction_id: instructionId, attempt_id: attemptId, event: 'role_result_recorded', result_class: row.result_class })
    const observedAt = controlPlane.exportPrivateState().events.at(-1).observed_at
    state.role_results.push({ instruction_id: instructionId, attempt_id: attemptId, result_class: row.result_class, result_receipt_sha256: receipt, observed_at: observedAt })
    return result
  }

  const attachEvidence = (value) => {
    const row = exact(value, ['instruction_id', 'attempt_id', 'result_receipt_sha256', 'evidence_receipt_sha256', 'candidate_commit', 'candidate_tree'])
    const instructionId = id(row.instruction_id); const attemptId = id(row.attempt_id)
    const resultReceipt = digest(row.result_receipt_sha256); const evidenceReceipt = digest(row.evidence_receipt_sha256)
    const commit = gitObject(row.candidate_commit); const tree = gitObject(row.candidate_tree)
    if (builder === null || builder.state !== 'active' || builder.health !== 'fresh') fail('binding_revoked')
    const roleResult = state.role_results.find((item) => item.instruction_id === instructionId && item.attempt_id === attemptId)
    if (!roleResult) fail('role_result_missing')
    if (roleResult.result_receipt_sha256 !== resultReceipt) fail('result_receipt_mismatch')
    const existing = state.evidence_pointers.find((item) => item.instruction_id === instructionId && item.attempt_id === attemptId)
    const pointer = { instruction_id: instructionId, attempt_id: attemptId, result_receipt_sha256: resultReceipt, evidence_receipt_sha256: evidenceReceipt, candidate_commit: commit, candidate_tree: tree }
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(pointer)) fail('evidence_conflict')
      return { outcome: 'evidence_attached', idempotent: true }
    }
    state.evidence_pointers.push(pointer)
    return { outcome: 'evidence_attached', idempotent: false }
  }

  const queryPrivate = () => {
    const control = controlPlane.exportPrivateState()
    const current = control.attempts.at(-1) ?? null
    return {
      current_attempt: current ? { instruction_id: current.instruction_id, attempt_id: current.attempt_id, lifecycle: current.state } : null,
      entity_counts: { instructions: state.instructions.length, attempts: control.attempts.length, transport_receipts: state.transport_receipts.length, role_results: state.role_results.length, evidence_pointers: state.evidence_pointers.length, gate_decisions: 0 },
      automatic_retry_count: 0,
    }
  }

  const projectDashboard = () => {
    const current = controlPlane.exportPrivateState().attempts.at(-1)
    const lifecycle = current?.state ?? 'idle'
    const guidance = bindingCondition === 'ready' && lifecycle !== 'idle'
      ? { next_boundary: boundaryFor(lifecycle), cherry_action: lifecycle === 'role_result_recorded' ? 'review_candidate_after_independent_checks' : 'none' }
      : bindingGuidance[bindingCondition]
    return {
      objective: 'phase3_read_only_vertical_slice', lifecycle, binding_condition: bindingCondition, ...guidance,
      authority: 'projection_only', can_dispatch: false, can_accept: false, can_release: false,
    }
  }

  return Object.freeze({
    createInstruction,
    recordProviderSend: (value) => transport(value, 'dispatch_observed', 'provider_send'),
    recordDestinationStarted: (value) => transport(value, 'execution_started', 'destination_start'),
    recordDeliveryUnknown,
    recordRoleResult,
    attachEvidence,
    queryPrivate,
    projectDashboard,
    exportPrivateState,
  })
}
