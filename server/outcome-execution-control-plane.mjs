import { isProxy } from 'node:util/types'

export const EXECUTION_CONTROL_AUTHORITIES = Object.freeze({
  outcome: 'contract_map',
  stage_acceptance: 'gates_and_immutable_evidence',
  current_session: 'private_session_registry',
  now: 'latest_valid_observation',
  instruction: 'append_only_instruction_events',
  rotation: 'continuity_receipt_and_registry_replace',
  role_result: 'role_owned_immutable_receipt',
  qa: 'fresh_ux_product_qa',
  audit: 'fresh_release_audit',
  acceptance: 'cherry',
})

export const EXECUTION_CONTROL_SERVICES = Object.freeze([
  'package_reader',
  'session_directory',
  'instruction_lifecycle',
  'continuity_manager',
  'eligibility_engine',
  'evidence_engine',
  'public_safe_projection',
])

export class ExecutionControlError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ExecutionControlError'
    this.code = code
  }
}

const fail = (code) => { throw new ExecutionControlError(code) }
const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const BINDING_STATES = new Set(['active', 'replaced', 'revoked', 'conflict'])
const HEALTH = new Set(['fresh', 'stale', 'offline'])
const LIGHT_ACTIONS = new Set(['explain', 'copy_cleanup', 'read_only'])
const STANDARD_ACTIONS = new Set(['plan', 'implement', 'verify', 'audit'])
const HIGH_ACTIONS = new Set(['deploy', 'release', 'credential', 'payment', 'real_data', 'destructive', 'security_privacy', 'outcome_change'])
const RISK = new Set(['lightweight', 'standard', 'high_risk'])
const AUTHORITIES = new Set(['within_scope', 'missing', 'conflict', 'cherry_approved'])
const RESULT_CLASSES = new Set(['candidate_ready', 'blocked', 'safe_hold', 'failed'])
const TERMINAL = new Set(['handoff_accepted', 'handoff_rejected', 'delivery_unknown', 'cancelled', 'failed', 'quarantined', 'safe_hold'])
const LIFECYCLE = new Set(['start_validated', 'dispatch_observed', 'execution_started', 'role_result_recorded', ...TERMINAL])
const ROTATION_REASONS = new Set(['repeated_timeout', 'context_loss', 'source_drift', 'role_drift', 'candidate_drift', 'cherry_maintenance'])
const IDENTIFIER = /^[a-z][a-z0-9_]{0,95}$/
const PROJECT_IDENTIFIER = /^[a-z][a-z0-9_]*(?:-[a-z0-9_]+)*$/
const DIGEST = /^[a-f0-9]{64}$/
const ROLE_TRANSPORTS = new Set(['codex_app_peer_thread', 'bounded_read_only_subagent'])

const snapshotRecord = (value, code = 'invalid_command') => {
  if (typeof value !== 'object' || value === null || isProxy(value)) fail(code)
  let prototype
  let descriptors
  try {
    prototype = Object.getPrototypeOf(value)
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string')) fail(code)
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) fail(code)
    result[key] = descriptor.value
  }
  return result
}

const exactRecord = (value, expected, code = 'invalid_command') => {
  const record = snapshotRecord(value, code)
  const actual = Object.keys(record).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(code)
  return record
}

const safeArray = (value, code = 'invalid_command') => {
  if (isProxy(value) || !Array.isArray(value)) fail(code)
  let prototype
  let descriptors
  try {
    prototype = Object.getPrototypeOf(value)
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch { fail(code) }
  if (prototype !== Array.prototype) fail(code)
  const length = descriptors.length
  if (!length || !Object.hasOwn(length, 'value') || !Number.isSafeInteger(length.value) || length.value < 0) fail(code)
  const expected = new Set(['length', ...Array.from({ length: length.value }, (_, index) => String(index))])
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !expected.has(key))) fail(code)
  const result = []
  for (let index = 0; index < length.value; index += 1) {
    const descriptor = descriptors[index]
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) fail(code)
    result.push(descriptor.value)
  }
  return result
}
const identifier = (value, code = 'invalid_command') => {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) fail(code)
  return value
}
const projectIdentifier = (value, code = 'invalid_command') => {
  if (typeof value !== 'string' || value.length > 96 || !PROJECT_IDENTIFIER.test(value)) fail(code)
  return value
}
const member = (value, set, code = 'invalid_command') => {
  if (typeof value !== 'string' || !set.has(value)) fail(code)
  return value
}
const integer = (value, minimum = 0, code = 'invalid_command') => {
  if (!Number.isSafeInteger(value) || value < minimum) fail(code)
  return value
}
const bool = (value, code = 'invalid_command') => {
  if (typeof value !== 'boolean') fail(code)
  return value
}
const nullableIdentifier = (value, code = 'invalid_command') => value === null ? null : identifier(value, code)
const fingerprint = (value) => JSON.stringify(value, Object.keys(value).sort())

const actionRisk = (action) => LIGHT_ACTIONS.has(action) ? 'lightweight' : STANDARD_ACTIONS.has(action) ? 'standard' : HIGH_ACTIONS.has(action) ? 'high_risk' : null
const sameInstructionIdentity = (left, right) => left.project_id === right.project_id && left.role === right.role && left.action === right.action && left.risk_class === right.risk_class && left.transport_class === right.transport_class && left.public_alias === right.public_alias

const normalizeBinding = (value) => {
  const row = exactRecord(value, ['project_id', 'role', 'version', 'state', 'health', 'public_alias', 'transport_class'], 'invalid_registry')
  return {
    project_id: projectIdentifier(row.project_id, 'invalid_registry'),
    role: member(row.role, ROLES, 'invalid_registry'),
    version: integer(row.version, 1, 'invalid_registry'),
    state: member(row.state, BINDING_STATES, 'invalid_registry'),
    health: member(row.health, HEALTH, 'invalid_registry'),
    public_alias: identifier(row.public_alias, 'invalid_registry'),
    transport_class: member(row.transport_class, new Set(['codex_app_peer_thread']), 'invalid_registry'),
  }
}

const normalizeRegistry = (value) => {
  const source = exactRecord(value, ['bindings'], 'invalid_registry')
  const bindings = safeArray(source.bindings, 'invalid_registry').map(normalizeBinding)
  const keys = new Set()
  for (const binding of bindings) {
    const key = `${binding.project_id}\u0000${binding.role}`
    if (keys.has(key)) fail('invalid_registry')
    keys.add(key)
  }
  return bindings
}

const ATTEMPT_KEYS = ['instruction_id', 'attempt_id', 'project_id', 'role', 'binding_version', 'action', 'risk_class', 'source_state', 'stage_gate_present', 'authority', 'retry_of_attempt_id', 'transport_class', 'public_alias', 'public_binding_state', 'peer_thread_match_count', 'peer_thread_binding_verified', 'state', 'start_fingerprint', 'last_fingerprint', 'result_class', 'started_at']
const EVENT_KEYS = ['sequence', 'instruction_id', 'attempt_id', 'lifecycle', 'binding_version', 'observed_at', 'fingerprint', 'detail_class']
const ROTATION_KEYS = ['project_id', 'role', 'predecessor_version', 'successor_version', 'checkpoint_digest', 'fingerprint', 'recommendation', 'history']
const ROTATION_EVENT_KEYS = ['state', 'observed_at']
const ROTATION_RECOMMENDATION_KEYS = ['project_id', 'role', 'expected_binding_version', 'reason_class', 'checkpoint_digest', 'source_pinned', 'candidate_pinned', 'receipt_pinned', 'authority_pinned', 'closed_evidence_count', 'open_gate_count', 'next_action_class', 'stop_condition_class', 'rollback_class', 'external_mutation_count', 'false_completion_count']

const transitionAllowed = (current, next) => {
  if (next === 'dispatch_observed') return current === 'start_validated'
  if (next === 'execution_started') return current === 'dispatch_observed'
  if (next === 'role_result_recorded') return current === 'execution_started'
  if (next === 'handoff_accepted' || next === 'handoff_rejected') return current === 'role_result_recorded'
  if (next === 'delivery_unknown') return current === 'start_validated' || current === 'dispatch_observed'
  if (['cancelled', 'failed', 'quarantined', 'safe_hold'].includes(next)) return !TERMINAL.has(current)
  return false
}

const startFingerprintFromStoredFacts = (attempt) => fingerprint({
  project_id: attempt.project_id,
  role: attempt.role,
  instruction_id: attempt.instruction_id,
  attempt_id: attempt.attempt_id,
  expected_binding_version: attempt.binding_version,
  action: attempt.action,
  risk_class: attempt.risk_class,
  source_state: attempt.source_state,
  stage_gate_present: attempt.stage_gate_present,
  authority: attempt.authority,
  retry_of_attempt_id: attempt.retry_of_attempt_id,
  transport_class: attempt.transport_class,
  public_alias: attempt.public_alias,
  public_binding_version: attempt.binding_version,
  public_binding_state: attempt.public_binding_state,
  peer_thread_match_count: attempt.peer_thread_match_count,
  peer_thread_binding_verified: attempt.peer_thread_binding_verified,
})

const eventFingerprintFromStoredFacts = (event) => {
  const command = {
    instruction_id: event.instruction_id,
    attempt_id: event.attempt_id,
    event: event.lifecycle,
  }
  if (event.lifecycle === 'dispatch_observed' || event.lifecycle === 'execution_started') {
    command.receipt_observed = true
    command.receipt_class = member(event.detail_class, new Set(event.lifecycle === 'dispatch_observed' ? ['provider_ack'] : ['target_started']), 'corrupt_snapshot')
  } else if (event.lifecycle === 'role_result_recorded') {
    command.result_class = member(event.detail_class, RESULT_CLASSES, 'corrupt_snapshot')
  } else if (event.lifecycle === 'handoff_accepted' || event.lifecycle === 'handoff_rejected') {
    command.decision = member(event.detail_class, new Set([event.lifecycle === 'handoff_accepted' ? 'accepted' : 'rejected']), 'corrupt_snapshot')
  } else {
    command.reason_class = member(event.detail_class, new Set(['timeout', 'missing_ack', 'operator_cancelled', 'execution_failed', 'evidence_conflict', 'authority_boundary']), 'corrupt_snapshot')
  }
  return fingerprint(command)
}

const normalizeStoredRotationRecommendation = (value) => {
  const row = exactRecord(value, ROTATION_RECOMMENDATION_KEYS, 'corrupt_snapshot')
  const recommendation = {
    project_id: projectIdentifier(row.project_id, 'corrupt_snapshot'),
    role: member(row.role, ROLES, 'corrupt_snapshot'),
    expected_binding_version: integer(row.expected_binding_version, 1, 'corrupt_snapshot'),
    reason_class: member(row.reason_class, ROTATION_REASONS, 'corrupt_snapshot'),
    checkpoint_digest: typeof row.checkpoint_digest === 'string' && DIGEST.test(row.checkpoint_digest) ? row.checkpoint_digest : fail('corrupt_snapshot'),
    source_pinned: bool(row.source_pinned, 'corrupt_snapshot'),
    candidate_pinned: bool(row.candidate_pinned, 'corrupt_snapshot'),
    receipt_pinned: bool(row.receipt_pinned, 'corrupt_snapshot'),
    authority_pinned: bool(row.authority_pinned, 'corrupt_snapshot'),
    closed_evidence_count: integer(row.closed_evidence_count, 0, 'corrupt_snapshot'),
    open_gate_count: integer(row.open_gate_count, 0, 'corrupt_snapshot'),
    next_action_class: identifier(row.next_action_class, 'corrupt_snapshot'),
    stop_condition_class: identifier(row.stop_condition_class, 'corrupt_snapshot'),
    rollback_class: identifier(row.rollback_class, 'corrupt_snapshot'),
    external_mutation_count: integer(row.external_mutation_count, 0, 'corrupt_snapshot'),
    false_completion_count: integer(row.false_completion_count, 0, 'corrupt_snapshot'),
  }
  if (![recommendation.source_pinned, recommendation.candidate_pinned, recommendation.receipt_pinned, recommendation.authority_pinned].every(Boolean) || recommendation.external_mutation_count !== 0) fail('corrupt_snapshot')
  return recommendation
}

const normalizeSnapshot = (value) => {
  const root = exactRecord(value, ['schema_version', 'attempts', 'events', 'rotations'], 'corrupt_snapshot')
  if (root.schema_version !== 1) fail('corrupt_snapshot')
  const attempts = safeArray(root.attempts, 'corrupt_snapshot').map((item) => {
    const row = exactRecord(item, ATTEMPT_KEYS, 'corrupt_snapshot')
    return {
      instruction_id: identifier(row.instruction_id, 'corrupt_snapshot'),
      attempt_id: identifier(row.attempt_id, 'corrupt_snapshot'),
      project_id: projectIdentifier(row.project_id, 'corrupt_snapshot'),
      role: member(row.role, ROLES, 'corrupt_snapshot'),
      binding_version: integer(row.binding_version, 1, 'corrupt_snapshot'),
      action: identifier(row.action, 'corrupt_snapshot'),
      risk_class: member(row.risk_class, RISK, 'corrupt_snapshot'),
      source_state: member(row.source_state, new Set(['matched', 'conflict']), 'corrupt_snapshot'),
      stage_gate_present: bool(row.stage_gate_present, 'corrupt_snapshot'),
      authority: member(row.authority, AUTHORITIES, 'corrupt_snapshot'),
      retry_of_attempt_id: nullableIdentifier(row.retry_of_attempt_id, 'corrupt_snapshot'),
      transport_class: member(row.transport_class, new Set(['codex_app_peer_thread']), 'corrupt_snapshot'),
      public_alias: identifier(row.public_alias, 'corrupt_snapshot'),
      public_binding_state: member(row.public_binding_state, BINDING_STATES, 'corrupt_snapshot'),
      peer_thread_match_count: integer(row.peer_thread_match_count, 0, 'corrupt_snapshot'),
      peer_thread_binding_verified: bool(row.peer_thread_binding_verified, 'corrupt_snapshot'),
      state: member(row.state, LIFECYCLE, 'corrupt_snapshot'),
      start_fingerprint: typeof row.start_fingerprint === 'string' ? row.start_fingerprint : fail('corrupt_snapshot'),
      last_fingerprint: typeof row.last_fingerprint === 'string' ? row.last_fingerprint : fail('corrupt_snapshot'),
      result_class: row.result_class === null ? null : member(row.result_class, RESULT_CLASSES, 'corrupt_snapshot'),
      started_at: Number.isFinite(row.started_at) ? row.started_at : fail('corrupt_snapshot'),
    }
  })
  if (attempts.some((attempt) => attempt.public_binding_state !== 'active' || attempt.peer_thread_match_count !== 1 || !attempt.peer_thread_binding_verified)) fail('corrupt_snapshot')
  if (attempts.some((attempt) => actionRisk(attempt.action) !== attempt.risk_class)) fail('corrupt_snapshot')
  const events = safeArray(root.events, 'corrupt_snapshot').map((item) => {
    const row = exactRecord(item, EVENT_KEYS, 'corrupt_snapshot')
    return {
      sequence: integer(row.sequence, 1, 'corrupt_snapshot'),
      instruction_id: identifier(row.instruction_id, 'corrupt_snapshot'),
      attempt_id: identifier(row.attempt_id, 'corrupt_snapshot'),
      lifecycle: member(row.lifecycle, LIFECYCLE, 'corrupt_snapshot'),
      binding_version: integer(row.binding_version, 1, 'corrupt_snapshot'),
      observed_at: Number.isFinite(row.observed_at) ? row.observed_at : fail('corrupt_snapshot'),
      fingerprint: typeof row.fingerprint === 'string' ? row.fingerprint : fail('corrupt_snapshot'),
      detail_class: row.detail_class === null ? null : identifier(row.detail_class, 'corrupt_snapshot'),
    }
  })
  const rotations = safeArray(root.rotations, 'corrupt_snapshot').map((item) => {
    const row = exactRecord(item, ROTATION_KEYS, 'corrupt_snapshot')
    const recommendation = normalizeStoredRotationRecommendation(row.recommendation)
    const history = safeArray(row.history, 'corrupt_snapshot').map((event) => {
      const normalized = exactRecord(event, ROTATION_EVENT_KEYS, 'corrupt_snapshot')
      if (!['handoff_required', 'successor_verified', 'replacement_confirmed'].includes(normalized.state) || !Number.isFinite(normalized.observed_at)) fail('corrupt_snapshot')
      return { state: normalized.state, observed_at: normalized.observed_at }
    })
    return {
      project_id: projectIdentifier(row.project_id, 'corrupt_snapshot'),
      role: member(row.role, ROLES, 'corrupt_snapshot'),
      predecessor_version: integer(row.predecessor_version, 1, 'corrupt_snapshot'),
      successor_version: row.successor_version === null ? null : integer(row.successor_version, 1, 'corrupt_snapshot'),
      checkpoint_digest: typeof row.checkpoint_digest === 'string' && DIGEST.test(row.checkpoint_digest) ? row.checkpoint_digest : fail('corrupt_snapshot'),
      fingerprint: typeof row.fingerprint === 'string' ? row.fingerprint : fail('corrupt_snapshot'),
      recommendation,
      history,
    }
  })

  const attemptKeys = new Set()
  const startSequenceByAttempt = new Map()
  for (const attempt of attempts) {
    const key = `${attempt.instruction_id}\u0000${attempt.attempt_id}`
    if (attemptKeys.has(key)) fail('corrupt_snapshot')
    attemptKeys.add(key)
    const ownEvents = events.filter((event) => event.instruction_id === attempt.instruction_id && event.attempt_id === attempt.attempt_id)
    if (ownEvents.length === 0 || ownEvents[0].lifecycle !== 'start_validated') fail('corrupt_snapshot')
    startSequenceByAttempt.set(key, ownEvents[0].sequence)
    const expectedStartFingerprint = startFingerprintFromStoredFacts(attempt)
    if (attempt.start_fingerprint !== expectedStartFingerprint || ownEvents[0].fingerprint !== expectedStartFingerprint || ownEvents[0].detail_class !== null) fail('corrupt_snapshot')
    let state = 'start_validated'
    for (const event of ownEvents.slice(1)) {
      if (!transitionAllowed(state, event.lifecycle)) fail('corrupt_snapshot')
      if (event.fingerprint !== eventFingerprintFromStoredFacts(event)) fail('corrupt_snapshot')
      state = event.lifecycle
    }
    const resultEvent = ownEvents.find((event) => event.lifecycle === 'role_result_recorded')
    if (state !== attempt.state || attempt.last_fingerprint !== ownEvents.at(-1).fingerprint || ownEvents.some((event) => event.binding_version !== attempt.binding_version) || attempt.started_at !== ownEvents[0].observed_at || (resultEvent?.detail_class ?? null) !== attempt.result_class) fail('corrupt_snapshot')
    if (attempt.retry_of_attempt_id !== null) {
      const prior = attempts.find((candidate) => candidate.instruction_id === attempt.instruction_id && candidate.attempt_id === attempt.retry_of_attempt_id)
      const priorDelivery = events.find((event) => event.instruction_id === attempt.instruction_id && event.attempt_id === attempt.retry_of_attempt_id && event.lifecycle === 'delivery_unknown')
      if (!prior || prior.state !== 'delivery_unknown' || !priorDelivery || ownEvents[0].sequence <= priorDelivery.sequence) fail('corrupt_snapshot')
    }
  }
  const attemptsByInstruction = new Map()
  for (const attempt of attempts) {
    const instructionAttempts = attemptsByInstruction.get(attempt.instruction_id) ?? []
    instructionAttempts.push(attempt)
    attemptsByInstruction.set(attempt.instruction_id, instructionAttempts)
  }
  for (const instructionAttempts of attemptsByInstruction.values()) {
    instructionAttempts.sort((left, right) => startSequenceByAttempt.get(`${left.instruction_id}\u0000${left.attempt_id}`) - startSequenceByAttempt.get(`${right.instruction_id}\u0000${right.attempt_id}`))
    if (instructionAttempts[0].retry_of_attempt_id !== null) fail('corrupt_snapshot')
    for (let index = 1; index < instructionAttempts.length; index += 1) {
      const prior = instructionAttempts[index - 1]
      const attempt = instructionAttempts[index]
      if (attempt.retry_of_attempt_id !== prior.attempt_id || prior.state !== 'delivery_unknown' || !sameInstructionIdentity(attempt, prior)) fail('corrupt_snapshot')
    }
  }
  if (events.length !== attempts.reduce((count, attempt) => count + events.filter((event) => event.instruction_id === attempt.instruction_id && event.attempt_id === attempt.attempt_id).length, 0)) fail('corrupt_snapshot')
  if (events.some((event, index) => event.sequence !== index + 1)) fail('corrupt_snapshot')
  if (events.some((event, index) => index > 0 && event.observed_at < events[index - 1].observed_at)) fail('corrupt_snapshot')
  const rotationKeys = new Set()
  for (const rotation of rotations) {
    const key = `${rotation.project_id}\u0000${rotation.role}\u0000${rotation.predecessor_version}`
    if (rotationKeys.has(key)) fail('corrupt_snapshot')
    rotationKeys.add(key)
    const states = rotation.history.map((event) => event.state)
    if (states.length === 0 || states[0] !== 'handoff_required' || states.some((state, index) => index > 0 && !(['handoff_required,successor_verified', 'successor_verified,replacement_confirmed'].includes(`${states[index - 1]},${state}`))) || rotation.history.some((event, index) => index > 0 && event.observed_at < rotation.history[index - 1].observed_at)) fail('corrupt_snapshot')
    if ((states.includes('successor_verified') || states.includes('replacement_confirmed')) !== (rotation.successor_version !== null) || (rotation.successor_version !== null && rotation.successor_version !== rotation.predecessor_version + 1)) fail('corrupt_snapshot')
    const recommendation = rotation.recommendation
    if (recommendation.project_id !== rotation.project_id || recommendation.role !== rotation.role || recommendation.expected_binding_version !== rotation.predecessor_version || recommendation.checkpoint_digest !== rotation.checkpoint_digest || rotation.fingerprint !== fingerprint(recommendation)) fail('corrupt_snapshot')
  }
  attempts.sort((left, right) => startSequenceByAttempt.get(`${left.instruction_id}\u0000${left.attempt_id}`) - startSequenceByAttempt.get(`${right.instruction_id}\u0000${right.attempt_id}`))
  rotations.sort((left, right) => {
    const leftKey = `${left.project_id}\u0000${left.role}\u0000${left.predecessor_version}`
    const rightKey = `${right.project_id}\u0000${right.role}\u0000${right.predecessor_version}`
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
  return { schema_version: 1, attempts, events, rotations }
}

const emptyState = () => ({ schema_version: 1, attempts: [], events: [], rotations: [] })
const cloneState = (value) => structuredClone(value)

export const createOutcomeExecutionControlPlane = ({ registry, snapshot, clock = Date.now, materialize = structuredClone } = {}) => {
  const bindings = normalizeRegistry(registry)
  if (typeof clock !== 'function' || typeof materialize !== 'function') fail('invalid_dependency')
  let state = snapshot === undefined ? emptyState() : normalizeSnapshot(snapshot)
  let mutating = false
  let reentryDetected = false

  const ensureMutationEntry = () => {
    if (mutating) {
      reentryDetected = true
      fail('reentry_detected')
    }
  }
  const mutate = (operation) => {
    ensureMutationEntry()
    mutating = true
    reentryDetected = false
    try {
      let observedAt
      try { observedAt = clock() } catch { fail(reentryDetected ? 'reentry_detected' : 'clock_unavailable') }
      if (!Number.isFinite(observedAt)) fail('clock_unavailable')
      const latestEventTime = state.events.at(-1)?.observed_at ?? -Infinity
      const latestRotationTime = Math.max(-Infinity, ...state.rotations.flatMap((rotation) => rotation.history.map((event) => event.observed_at)))
      if (observedAt < Math.max(latestEventTime, latestRotationTime)) fail('clock_unavailable')
      const next = cloneState(state)
      const result = operation(next, observedAt)
      const expected = normalizeSnapshot(cloneState(next))
      let published
      try { published = materialize(next) } catch { fail(reentryDetected ? 'reentry_detected' : 'materialization_failed') }
      if (reentryDetected) fail('reentry_detected')
      try {
        const actual = normalizeSnapshot(published)
        if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('materialization_failed')
        state = actual
      } catch { fail('materialization_failed') }
      return result
    } finally {
      mutating = false
      reentryDetected = false
    }
  }

  const resolveBinding = (projectId, role, expectedVersion) => {
    const matches = bindings.filter((binding) => binding.project_id === projectId && binding.role === role)
    if (matches.length === 0) return { error: bindings.some((binding) => binding.role === role && binding.project_id !== projectId) ? 'binding_cross_project' : 'binding_missing' }
    if (matches.length !== 1) return { error: 'binding_conflict' }
    const binding = matches[0]
    if (binding.state !== 'active') return { error: `binding_${binding.state}` }
    if (binding.health !== 'fresh') return { error: `binding_${binding.health}` }
    if (binding.version !== expectedVersion) return { error: 'binding_version_conflict' }
    return { binding }
  }

  const normalizeStart = (value) => {
    const row = exactRecord(value, ['project_id', 'role', 'instruction_id', 'attempt_id', 'expected_binding_version', 'action', 'risk_class', 'source_state', 'stage_gate_present', 'authority', 'retry_of_attempt_id', 'transport_class', 'public_alias', 'public_binding_version', 'public_binding_state', 'peer_thread_match_count', 'peer_thread_binding_verified'])
    const result = {
      project_id: projectIdentifier(row.project_id), role: member(row.role, ROLES), instruction_id: identifier(row.instruction_id), attempt_id: identifier(row.attempt_id),
      expected_binding_version: integer(row.expected_binding_version, 1), action: identifier(row.action), risk_class: member(row.risk_class, RISK),
      source_state: member(row.source_state, new Set(['matched', 'conflict'])),
      stage_gate_present: bool(row.stage_gate_present), authority: member(row.authority, AUTHORITIES), retry_of_attempt_id: nullableIdentifier(row.retry_of_attempt_id),
      transport_class: member(row.transport_class, ROLE_TRANSPORTS), public_alias: identifier(row.public_alias), public_binding_version: integer(row.public_binding_version, 1),
      public_binding_state: member(row.public_binding_state, BINDING_STATES), peer_thread_match_count: integer(row.peer_thread_match_count), peer_thread_binding_verified: bool(row.peer_thread_binding_verified),
    }
    if (actionRisk(result.action) !== result.risk_class) fail('invalid_command')
    return result
  }

  const startedResult = (attempt, idempotent) => ({ outcome: 'started', role: attempt.role, binding_version: attempt.binding_version, lifecycle: 'start_validated', gate_policy: attempt.risk_class === 'lightweight' ? 'no_task_gate' : 'reuse_stage_gate', idempotent })

  const start = (value) => {
    ensureMutationEntry()
    const command = normalizeStart(value)
    if (command.transport_class !== 'codex_app_peer_thread') return { outcome: 'safe_hold', reason: 'role_transport_denied' }
    if (command.source_state === 'conflict') return { outcome: 'safe_hold', reason: 'source_conflict' }
    if (command.authority === 'missing' || command.authority === 'conflict') return { outcome: 'safe_hold', reason: `authority_${command.authority}` }
    if (command.risk_class === 'high_risk') return { outcome: 'safe_hold', reason: 'high_risk_boundary' }
    if (command.risk_class === 'standard' && !command.stage_gate_present) return { outcome: 'safe_hold', reason: 'stage_gate_missing' }
    if (command.risk_class === 'lightweight' && command.stage_gate_present) fail('invalid_command')
    const resolution = resolveBinding(command.project_id, command.role, command.expected_binding_version)
    if (resolution.error) return { outcome: 'safe_hold', reason: resolution.error }
    if (resolution.binding.transport_class !== command.transport_class) return { outcome: 'safe_hold', reason: 'binding_transport_mismatch' }
    if (resolution.binding.public_alias !== command.public_alias) return { outcome: 'safe_hold', reason: 'binding_alias_mismatch' }
    if (command.public_binding_version !== resolution.binding.version) return { outcome: 'safe_hold', reason: 'public_binding_version_conflict' }
    if (command.public_binding_state !== resolution.binding.state) return { outcome: 'safe_hold', reason: 'public_binding_state_conflict' }
    if (command.peer_thread_match_count !== 1) return { outcome: 'safe_hold', reason: command.peer_thread_match_count === 0 ? 'peer_thread_missing' : 'peer_thread_conflict' }
    if (!command.peer_thread_binding_verified) return { outcome: 'safe_hold', reason: 'peer_thread_binding_unverified' }
    const startFingerprint = fingerprint(command)
    const existing = state.attempts.find((attempt) => attempt.instruction_id === command.instruction_id && attempt.attempt_id === command.attempt_id)
    if (existing) {
      if (existing.start_fingerprint !== startFingerprint) fail('duplicate_attempt_conflict')
      return startedResult(existing, true)
    }
    const instructionAttempts = state.attempts.filter((attempt) => attempt.instruction_id === command.instruction_id)
    if (instructionAttempts.length > 0) {
      if (command.retry_of_attempt_id === null) fail('retry_reference_required')
      const prior = instructionAttempts.at(-1)
      if (command.retry_of_attempt_id !== prior.attempt_id || prior.state !== 'delivery_unknown' || instructionAttempts.some((attempt) => attempt.retry_of_attempt_id === prior.attempt_id) || !sameInstructionIdentity(command, prior)) fail('invalid_retry_reference')
    } else if (command.retry_of_attempt_id !== null) fail('invalid_retry_reference')
    return mutate((next, observedAt) => {
      const attempt = {
        instruction_id: command.instruction_id, attempt_id: command.attempt_id, project_id: command.project_id, role: command.role,
        binding_version: resolution.binding.version, action: command.action, risk_class: command.risk_class, source_state: command.source_state, stage_gate_present: command.stage_gate_present,
        authority: command.authority, retry_of_attempt_id: command.retry_of_attempt_id, state: 'start_validated', start_fingerprint: startFingerprint,
        transport_class: command.transport_class, public_alias: command.public_alias, public_binding_state: command.public_binding_state,
        peer_thread_match_count: command.peer_thread_match_count, peer_thread_binding_verified: command.peer_thread_binding_verified,
        last_fingerprint: startFingerprint, result_class: null, started_at: observedAt,
      }
      next.attempts.push(attempt)
      next.events.push({ sequence: next.events.length + 1, instruction_id: attempt.instruction_id, attempt_id: attempt.attempt_id, lifecycle: 'start_validated', binding_version: attempt.binding_version, observed_at: observedAt, fingerprint: startFingerprint, detail_class: null })
      return startedResult(attempt, false)
    })
  }

  const normalizeTransition = (value) => {
    const base = snapshotRecord(value)
    const event = member(base.event, new Set(['dispatch_observed', 'execution_started', 'role_result_recorded', 'handoff_accepted', 'handoff_rejected', 'delivery_unknown', 'cancelled', 'failed', 'quarantined', 'safe_hold']))
    let keys
    if (event === 'dispatch_observed' || event === 'execution_started') keys = ['instruction_id', 'attempt_id', 'event', 'receipt_observed', 'receipt_class']
    else if (event === 'role_result_recorded') keys = ['instruction_id', 'attempt_id', 'event', 'result_class']
    else if (event === 'handoff_accepted' || event === 'handoff_rejected') keys = ['instruction_id', 'attempt_id', 'event', 'decision']
    else keys = ['instruction_id', 'attempt_id', 'event', 'reason_class']
    const row = exactRecord(value, keys)
    const command = { instruction_id: identifier(row.instruction_id), attempt_id: identifier(row.attempt_id), event }
    if (event === 'dispatch_observed' || event === 'execution_started') {
      command.receipt_observed = bool(row.receipt_observed)
      command.receipt_class = member(row.receipt_class, new Set(event === 'dispatch_observed' ? ['provider_ack'] : ['target_started']))
      if (!command.receipt_observed) fail('receipt_required')
    } else if (event === 'role_result_recorded') command.result_class = member(row.result_class, RESULT_CLASSES)
    else if (event === 'handoff_accepted' || event === 'handoff_rejected') {
      command.decision = member(row.decision, new Set(['accepted', 'rejected']))
      if (command.decision !== (event === 'handoff_accepted' ? 'accepted' : 'rejected')) fail('invalid_command')
    } else command.reason_class = member(row.reason_class, new Set(['timeout', 'missing_ack', 'operator_cancelled', 'execution_failed', 'evidence_conflict', 'authority_boundary']))
    return command
  }

  const transition = (value) => {
    ensureMutationEntry()
    const command = normalizeTransition(value)
    const attempt = state.attempts.find((item) => item.instruction_id === command.instruction_id && item.attempt_id === command.attempt_id)
    if (!attempt) fail('attempt_missing')
    const eventFingerprint = fingerprint(command)
    if (attempt.last_fingerprint === eventFingerprint) return { outcome: 'event_recorded', lifecycle: attempt.state, idempotent: true }
    if (TERMINAL.has(attempt.state)) fail('terminal_attempt')
    if (!transitionAllowed(attempt.state, command.event)) fail('invalid_transition')
    return mutate((next, observedAt) => {
      const mutable = next.attempts.find((item) => item.instruction_id === command.instruction_id && item.attempt_id === command.attempt_id)
      mutable.state = command.event
      mutable.last_fingerprint = eventFingerprint
      if (command.result_class) mutable.result_class = command.result_class
      const detailClass = command.receipt_class ?? command.result_class ?? command.decision ?? command.reason_class ?? null
      next.events.push({ sequence: next.events.length + 1, instruction_id: mutable.instruction_id, attempt_id: mutable.attempt_id, lifecycle: command.event, binding_version: mutable.binding_version, observed_at: observedAt, fingerprint: eventFingerprint, detail_class: detailClass })
      return { outcome: 'event_recorded', lifecycle: command.event, idempotent: false }
    })
  }

  const normalizeRotation = (value) => {
    const row = exactRecord(value, ['project_id', 'role', 'expected_binding_version', 'reason_class', 'checkpoint_digest', 'source_pinned', 'candidate_pinned', 'receipt_pinned', 'authority_pinned', 'closed_evidence_count', 'open_gate_count', 'next_action_class', 'stop_condition_class', 'rollback_class', 'external_mutation_count', 'false_completion_count'])
    const command = {
      project_id: projectIdentifier(row.project_id), role: member(row.role, ROLES), expected_binding_version: integer(row.expected_binding_version, 1), reason_class: member(row.reason_class, ROTATION_REASONS),
      checkpoint_digest: typeof row.checkpoint_digest === 'string' && DIGEST.test(row.checkpoint_digest) ? row.checkpoint_digest : fail('invalid_command'),
      source_pinned: bool(row.source_pinned), candidate_pinned: bool(row.candidate_pinned), receipt_pinned: bool(row.receipt_pinned), authority_pinned: bool(row.authority_pinned),
      closed_evidence_count: integer(row.closed_evidence_count), open_gate_count: integer(row.open_gate_count), next_action_class: identifier(row.next_action_class), stop_condition_class: identifier(row.stop_condition_class), rollback_class: identifier(row.rollback_class),
      external_mutation_count: integer(row.external_mutation_count), false_completion_count: integer(row.false_completion_count),
    }
    if (![command.source_pinned, command.candidate_pinned, command.receipt_pinned, command.authority_pinned].every(Boolean) || command.external_mutation_count !== 0) fail('checkpoint_incomplete')
    return command
  }

  const recommendRotation = (value) => {
    ensureMutationEntry()
    const command = normalizeRotation(value)
    const resolution = resolveBinding(command.project_id, command.role, command.expected_binding_version)
    if (resolution.error) return { outcome: 'safe_hold', reason: resolution.error }
    const commandFingerprint = fingerprint(command)
    const existing = state.rotations.find((rotation) => rotation.project_id === command.project_id && rotation.role === command.role && rotation.predecessor_version === command.expected_binding_version)
    if (existing) {
      if (existing.fingerprint !== commandFingerprint) fail('rotation_conflict')
      return { outcome: 'rotation_plan', rotation_state: existing.history.at(-1).state, binding_switch_eligible: existing.history.at(-1).state !== 'handoff_required', predecessor_archive_eligible: existing.history.at(-1).state === 'replacement_confirmed', idempotent: true }
    }
    return mutate((next, observedAt) => {
      next.rotations.push({ project_id: command.project_id, role: command.role, predecessor_version: command.expected_binding_version, successor_version: null, checkpoint_digest: command.checkpoint_digest, fingerprint: commandFingerprint, recommendation: command, history: [{ state: 'handoff_required', observed_at: observedAt }] })
      return { outcome: 'rotation_plan', rotation_state: 'handoff_required', binding_switch_eligible: false, predecessor_archive_eligible: false, idempotent: false }
    })
  }

  const normalizeSuccessor = (value, confirmation = false) => {
    const keys = ['project_id', 'role', 'expected_binding_version', 'successor_binding_version', 'checkpoint_digest', ...(confirmation ? ['registry_read_after_write'] : ['started', 'continuity_ready'])]
    const row = exactRecord(value, keys)
    return {
      project_id: projectIdentifier(row.project_id), role: member(row.role, ROLES), expected_binding_version: integer(row.expected_binding_version, 1), successor_binding_version: integer(row.successor_binding_version, 1),
      checkpoint_digest: typeof row.checkpoint_digest === 'string' && DIGEST.test(row.checkpoint_digest) ? row.checkpoint_digest : fail('invalid_command'),
      ...(confirmation ? { registry_read_after_write: bool(row.registry_read_after_write) } : { started: bool(row.started), continuity_ready: bool(row.continuity_ready) }),
    }
  }

  const rotationFor = (command) => {
    const rotation = state.rotations.find((item) => item.project_id === command.project_id && item.role === command.role && item.predecessor_version === command.expected_binding_version)
    if (!rotation || rotation.checkpoint_digest !== command.checkpoint_digest) fail('rotation_missing')
    if (command.successor_binding_version !== command.expected_binding_version + 1) fail('binding_version_conflict')
    return rotation
  }

  const verifySuccessor = (value) => {
    ensureMutationEntry()
    const command = normalizeSuccessor(value)
    if (!command.started || !command.continuity_ready) fail('successor_not_ready')
    const rotation = rotationFor(command)
    const current = rotation.history.at(-1).state
    if (current === 'successor_verified' || current === 'replacement_confirmed') return { outcome: 'rotation_plan', rotation_state: current, binding_switch_eligible: true, predecessor_archive_eligible: current === 'replacement_confirmed', idempotent: true }
    if (current !== 'handoff_required') fail('rotation_conflict')
    return mutate((next, observedAt) => {
      const mutable = next.rotations.find((item) => item.project_id === command.project_id && item.role === command.role && item.predecessor_version === command.expected_binding_version)
      mutable.successor_version = command.successor_binding_version
      mutable.history.push({ state: 'successor_verified', observed_at: observedAt })
      return { outcome: 'rotation_plan', rotation_state: 'successor_verified', binding_switch_eligible: true, predecessor_archive_eligible: false, idempotent: false }
    })
  }

  const confirmReplacement = (value) => {
    ensureMutationEntry()
    const command = normalizeSuccessor(value, true)
    if (!command.registry_read_after_write) fail('registry_readback_required')
    const rotation = rotationFor(command)
    const current = rotation.history.at(-1).state
    if (current === 'replacement_confirmed') return { outcome: 'rotation_plan', rotation_state: 'replacement_confirmed', binding_switch_eligible: true, predecessor_archive_eligible: true }
    if (current !== 'successor_verified' || rotation.successor_version !== command.successor_binding_version) fail('successor_not_verified')
    return mutate((next, observedAt) => {
      const mutable = next.rotations.find((item) => item.project_id === command.project_id && item.role === command.role && item.predecessor_version === command.expected_binding_version)
      mutable.history.push({ state: 'replacement_confirmed', observed_at: observedAt })
      return { outcome: 'rotation_plan', rotation_state: 'replacement_confirmed', binding_switch_eligible: true, predecessor_archive_eligible: true }
    })
  }

  const normalizeWork = (value) => {
    const row = exactRecord(value, ['project_id', 'role', 'action', 'risk_class', 'source_state', 'expected_binding_version', 'dependency_state', 'authority', 'stage_gate_present'])
    const command = { project_id: projectIdentifier(row.project_id), role: member(row.role, ROLES), action: identifier(row.action), risk_class: member(row.risk_class, RISK), source_state: member(row.source_state, new Set(['matched', 'conflict'])), expected_binding_version: integer(row.expected_binding_version, 1), dependency_state: member(row.dependency_state, new Set(['satisfied', 'blocked'])), authority: member(row.authority, AUTHORITIES), stage_gate_present: bool(row.stage_gate_present) }
    if (actionRisk(command.action) !== command.risk_class) fail('invalid_command')
    return command
  }

  const selectNext = (value) => {
    if (mutating) { reentryDetected = true; fail('reentry_detected') }
    const work = safeArray(value).map(normalizeWork)
    const decisions = work.map((item) => {
      if (item.dependency_state !== 'satisfied') return { item, blocked: true }
      if (item.source_state !== 'matched') return { item, blocked: true }
      if (item.authority !== 'within_scope') return { item, blocked: true }
      if (item.risk_class === 'high_risk') return { item, blocked: true }
      if (item.risk_class === 'standard' && !item.stage_gate_present) return { item, blocked: true }
      if (resolveBinding(item.project_id, item.role, item.expected_binding_version).error) return { item, blocked: true }
      return { item, blocked: false }
    })
    const eligible = decisions.find((decision) => !decision.blocked)?.item
    return {
      outcome: 'selection_plan',
      selected: eligible ? { project_id: eligible.project_id, role: eligible.role, action: eligible.action, risk_class: eligible.risk_class, gate_policy: eligible.risk_class === 'lightweight' ? 'no_task_gate' : 'reuse_stage_gate' } : null,
      blocked_count: decisions.filter((decision) => decision.blocked).length,
      can_dispatch: false,
      requires_human_approval: false,
    }
  }

  const projectPublic = () => {
    const attemptByKey = new Map(state.attempts.map((attempt) => [`${attempt.instruction_id}\u0000${attempt.attempt_id}`, attempt]))
    return {
      status: 'available', authority: 'projection_only', can_dispatch: false, can_accept: false, can_release: false,
      counts: { instructions: new Set(state.attempts.map((attempt) => attempt.instruction_id)).size, attempts: state.attempts.length, events: state.events.length, rotations: state.rotations.length },
      roles: bindings.map((binding) => {
        const latestEvent = state.events.findLast((event) => {
          const attempt = attemptByKey.get(`${event.instruction_id}\u0000${event.attempt_id}`)
          return attempt?.project_id === binding.project_id && attempt.role === binding.role
        })
        return { project_id: binding.project_id, role: binding.role, binding_version: binding.version, state: latestEvent?.lifecycle ?? (binding.state === 'active' ? binding.health : binding.state) }
      }),
      next_boundary: 'fresh_qa_required',
    }
  }

  return Object.freeze({
    start,
    transition,
    recommendRotation,
    verifySuccessor,
    confirmReplacement,
    selectNext,
    projectPublic,
    exportPrivateState: () => cloneState(state),
  })
}
