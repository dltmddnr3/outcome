import test from 'node:test'
import assert from 'node:assert/strict'

import {
  EXECUTION_CONTROL_AUTHORITIES,
  EXECUTION_CONTROL_SERVICES,
  ExecutionControlError,
  createOutcomeExecutionControlPlane,
} from './outcome-execution-control-plane.mjs'

const registry = (overrides = []) => ({
  bindings: [
    { project_id: 'outcome', role: 'planner', version: 2, state: 'active', health: 'fresh' },
    { project_id: 'outcome', role: 'builder', version: 1, state: 'active', health: 'fresh' },
    { project_id: 'outcome', role: 'ux_product_qa', version: 2, state: 'active', health: 'fresh' },
    { project_id: 'outcome', role: 'release_audit', version: 2, state: 'active', health: 'fresh' },
    ...overrides,
  ],
})

const startCommand = (overrides = {}) => ({
  project_id: 'outcome',
  role: 'builder',
  instruction_id: 'synthetic_instruction_alpha',
  attempt_id: 'synthetic_attempt_1',
  expected_binding_version: 1,
  action: 'implement',
  risk_class: 'standard',
  source_state: 'matched',
  stage_gate_present: true,
  authority: 'within_scope',
  retry_of_attempt_id: null,
  ...overrides,
})

const transition = (event, overrides = {}) => ({
  instruction_id: 'synthetic_instruction_alpha',
  attempt_id: 'synthetic_attempt_1',
  event,
  ...overrides,
})

const code = (expected) => (error) => error instanceof ExecutionControlError && error.code === expected
const canonicalFingerprint = (value) => JSON.stringify(value, Object.keys(value).sort())
const retryIdentityDrifts = [
  ['project drift', { project_id: 'second' }],
  ['role and action drift', { role: 'planner', expected_binding_version: 2, action: 'plan' }],
  ['action drift', { action: 'verify' }],
  ['action and risk drift', { action: 'explain', risk_class: 'lightweight', stage_gate_present: false }],
]

test('F1 authority and service ownership are exact and projection cannot acquire authority', () => {
  assert.deepEqual(Object.keys(EXECUTION_CONTROL_AUTHORITIES), ['outcome', 'stage_acceptance', 'current_session', 'now', 'instruction', 'rotation', 'role_result', 'qa', 'audit', 'acceptance'])
  assert.deepEqual(EXECUTION_CONTROL_SERVICES, ['package_reader', 'session_directory', 'instruction_lifecycle', 'continuity_manager', 'eligibility_engine', 'evidence_engine', 'public_safe_projection'])
  assert.equal(Object.isFrozen(EXECUTION_CONTROL_AUTHORITIES), true)
  assert.equal(Object.isFrozen(EXECUTION_CONTROL_SERVICES), true)
  const projection = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 }).projectPublic()
  assert.equal(projection.authority, 'projection_only')
  assert.equal(projection.can_dispatch, false)
  assert.equal(projection.can_accept, false)
  assert.equal(projection.can_release, false)
})

test('F1 exact own-data primitive envelopes reject unknown accessor Proxy and caller authority fields atomically', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  for (const value of [
    { ...startCommand(), progress: 100 },
    { ...startCommand(), approval: true },
    { ...startCommand(), release: true },
    { ...startCommand(), gate_pass: true },
    { ...startCommand(), automatic_retry: true },
    new Proxy(startCommand(), { get() { assert.fail('Proxy trap must not execute') } }),
  ]) assert.throws(() => plane.start(value), code('invalid_command'))
  const accessor = startCommand()
  Object.defineProperty(accessor, 'action', { get() { assert.fail('accessor must not execute') } })
  assert.throws(() => plane.start(accessor), code('invalid_command'))
  assert.equal(plane.exportPrivateState().events.length, 0)
})

test('F1 finite role action risk and state vocabularies reject semantic drift', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  for (const value of [
    startCommand({ role: 'operator' }),
    startCommand({ action: 'invented_action' }),
    startCommand({ risk_class: 'urgent' }),
    startCommand({ source_state: 'probably_matched' }),
    startCommand({ action: 'deploy', risk_class: 'standard' }),
  ]) assert.throws(() => plane.start(value), code('invalid_command'))
  assert.deepEqual(plane.start(startCommand({ source_state: 'conflict' })), { outcome: 'safe_hold', reason: 'source_conflict' })
  assert.equal(plane.exportPrivateState().events.length, 0)
})

test('F1 registry and work arrays reject Proxy sparse accessor and decorated shapes without execution', () => {
  const trap = () => assert.fail('array trap must not execute')
  const proxied = new Proxy([], { get: trap, getOwnPropertyDescriptor: trap, ownKeys: trap })
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: { bindings: proxied }, clock: () => 100 }), code('invalid_registry'))
  const accessor = []
  Object.defineProperty(accessor, '0', { get: trap, enumerable: true })
  accessor.length = 1
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: { bindings: accessor }, clock: () => 100 }), code('invalid_registry'))
  const sparse = new Array(1)
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: { bindings: sparse }, clock: () => 100 }), code('invalid_registry'))
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  assert.throws(() => plane.selectNext(proxied), code('invalid_command'))
})

test('F2 logical role address snapshots exact current binding and rejects unhealthy wrong or cross-project targets', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  const started = plane.start(startCommand())
  assert.deepEqual(started, { outcome: 'started', role: 'builder', binding_version: 1, lifecycle: 'start_validated', gate_policy: 'reuse_stage_gate', idempotent: false })
  assert.equal(plane.exportPrivateState().attempts[0].binding_version, 1)

  for (const [entry, command, reason] of [
    [[], startCommand({ project_id: 'other' }), 'binding_missing'],
    [[{ project_id: 'other', role: 'builder', version: 1, state: 'active', health: 'fresh' }], startCommand(), 'binding_cross_project'],
    [[{ project_id: 'outcome', role: 'builder', version: 2, state: 'active', health: 'fresh' }], startCommand(), 'binding_version_conflict'],
    [[{ project_id: 'outcome', role: 'builder', version: 1, state: 'active', health: 'stale' }], startCommand(), 'binding_stale'],
    [[{ project_id: 'outcome', role: 'builder', version: 1, state: 'active', health: 'offline' }], startCommand(), 'binding_offline'],
    [[{ project_id: 'outcome', role: 'builder', version: 1, state: 'replaced', health: 'fresh' }], startCommand(), 'binding_replaced'],
    [[{ project_id: 'outcome', role: 'builder', version: 1, state: 'revoked', health: 'fresh' }], startCommand(), 'binding_revoked'],
    [[{ project_id: 'outcome', role: 'builder', version: 1, state: 'conflict', health: 'fresh' }], startCommand(), 'binding_conflict'],
  ]) {
    const isolated = createOutcomeExecutionControlPlane({ registry: { bindings: entry }, clock: () => 100 })
    assert.deepEqual(isolated.start(command), { outcome: 'safe_hold', reason })
    assert.equal(isolated.exportPrivateState().events.length, 0)
  }
})

test('F3 lifecycle is append-only observed-receipt bound and exact duplicates are idempotent', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: (() => { let value = 100; return () => value++ })() })
  plane.start(startCommand())
  assert.throws(() => plane.transition(transition('dispatch_observed', { receipt_observed: false, receipt_class: 'provider_ack' })), code('receipt_required'))
  assert.throws(() => plane.transition(transition('execution_started', { receipt_observed: true, receipt_class: 'target_started' })), code('invalid_transition'))
  const dispatched = transition('dispatch_observed', { receipt_observed: true, receipt_class: 'provider_ack' })
  assert.equal(plane.transition(dispatched).lifecycle, 'dispatch_observed')
  assert.equal(plane.transition(dispatched).idempotent, true)
  assert.equal(plane.transition(transition('execution_started', { receipt_observed: true, receipt_class: 'target_started' })).lifecycle, 'execution_started')
  assert.equal(plane.transition(transition('role_result_recorded', { result_class: 'candidate_ready' })).lifecycle, 'role_result_recorded')
  assert.equal(plane.transition(transition('handoff_accepted', { decision: 'accepted' })).lifecycle, 'handoff_accepted')
  const state = plane.exportPrivateState()
  assert.deepEqual(state.events.map((event) => event.lifecycle), ['start_validated', 'dispatch_observed', 'execution_started', 'role_result_recorded', 'handoff_accepted'])
  assert.deepEqual(state.events.map((event) => event.sequence), [1, 2, 3, 4, 5])
  assert.throws(() => plane.transition(transition('handoff_rejected', { decision: 'rejected' })), code('terminal_attempt'))
})

test('F3 canonical hyphenated project ID completes and replays one five-event lifecycle', () => {
  const cherryRegistry = { bindings: [{ project_id: 'cherry-note', role: 'builder', version: 1, state: 'active', health: 'fresh' }] }
  const command = startCommand({ project_id: 'cherry-note', action: 'read_only', risk_class: 'lightweight', stage_gate_present: false })
  const plane = createOutcomeExecutionControlPlane({ registry: cherryRegistry, clock: (() => { let value = 100; return () => value++ })() })
  plane.start(command)
  plane.transition(transition('dispatch_observed', { receipt_observed: true, receipt_class: 'provider_ack' }))
  plane.transition(transition('execution_started', { receipt_observed: true, receipt_class: 'target_started' }))
  plane.transition(transition('role_result_recorded', { result_class: 'candidate_ready' }))
  plane.transition(transition('handoff_accepted', { decision: 'accepted' }))

  const snapshot = plane.exportPrivateState()
  assert.deepEqual(snapshot.events.map((event) => event.lifecycle), ['start_validated', 'dispatch_observed', 'execution_started', 'role_result_recorded', 'handoff_accepted'])
  const restarted = createOutcomeExecutionControlPlane({ registry: cherryRegistry, snapshot, clock: () => 200 })
  assert.deepEqual(restarted.exportPrivateState(), snapshot)
  assert.deepEqual(restarted.start(command), { outcome: 'started', role: 'builder', binding_version: 1, lifecycle: 'start_validated', gate_policy: 'no_task_gate', idempotent: true })
  assert.equal(restarted.projectPublic().roles[0].project_id, 'cherry-note')
})

test('F3 project ID grammar rejects malformed values without widening internal identifiers', () => {
  for (const project_id of ['-cherry', 'cherry-', 'cherry--note', 'Cherry-note', 'cherry.note', `a${'-b'.repeat(48)}`]) {
    assert.throws(() => createOutcomeExecutionControlPlane({ registry: { bindings: [{ project_id, role: 'builder', version: 1, state: 'active', health: 'fresh' }] }, clock: () => 100 }), code('invalid_registry'))
  }
  const plane = createOutcomeExecutionControlPlane({ registry: { bindings: [{ project_id: 'cherry-note', role: 'builder', version: 1, state: 'active', health: 'fresh' }] }, clock: () => 100 })
  assert.throws(() => plane.start(startCommand({ project_id: 'cherry-note', instruction_id: 'invalid-instruction' })), code('invalid_command'))
})

test('F3 delivery unknown is terminal and retry requires a new explicit Planner attempt plus current binding revalidation', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.start(startCommand())
  assert.equal(plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' })).lifecycle, 'delivery_unknown')
  assert.throws(() => plane.transition(transition('dispatch_observed', { receipt_observed: true, receipt_class: 'provider_ack' })), code('terminal_attempt'))
  assert.throws(() => plane.start(startCommand({ attempt_id: 'synthetic_attempt_2' })), code('retry_reference_required'))
  const retry = plane.start(startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1' }))
  assert.equal(retry.lifecycle, 'start_validated')
  assert.equal(plane.exportPrivateState().attempts.length, 2)
})

const rotationCommand = (overrides = {}) => ({
  project_id: 'outcome', role: 'builder', expected_binding_version: 1,
  reason_class: 'context_loss', checkpoint_digest: 'a'.repeat(64),
  source_pinned: true, candidate_pinned: true, receipt_pinned: true, authority_pinned: true,
  closed_evidence_count: 3, open_gate_count: 2, next_action_class: 'continue_builder',
  stop_condition_class: 'scope_or_authority_drift', rollback_class: 'revert_candidate',
  external_mutation_count: 0, false_completion_count: 4,
  ...overrides,
})

test('F4 rotation requires complete checkpoint successor continuity and registry read-after-write before archive eligibility', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  assert.throws(() => plane.recommendRotation(rotationCommand({ receipt_pinned: false })), code('checkpoint_incomplete'))
  assert.equal(plane.recommendRotation(rotationCommand()).rotation_state, 'handoff_required')
  assert.throws(() => plane.verifySuccessor({ project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), started: true, continuity_ready: false }), code('successor_not_ready'))
  assert.equal(plane.verifySuccessor({ project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), started: true, continuity_ready: true }).rotation_state, 'successor_verified')
  assert.throws(() => plane.confirmReplacement({ project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), registry_read_after_write: false }), code('registry_readback_required'))
  assert.deepEqual(plane.confirmReplacement({ project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), registry_read_after_write: true }), { outcome: 'rotation_plan', rotation_state: 'replacement_confirmed', binding_switch_eligible: true, predecessor_archive_eligible: true })
})

test('F5 proportional policy creates no lightweight Gate reuses standard Gate and safe-holds high risk', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  const light = plane.start(startCommand({ instruction_id: 'light', attempt_id: 'light_1', action: 'explain', risk_class: 'lightweight', stage_gate_present: false }))
  assert.equal(light.gate_policy, 'no_task_gate')
  const standard = plane.start(startCommand({ instruction_id: 'standard', attempt_id: 'standard_1' }))
  assert.equal(standard.gate_policy, 'reuse_stage_gate')
  const high = plane.start(startCommand({ instruction_id: 'high', attempt_id: 'high_1', action: 'deploy', risk_class: 'high_risk', stage_gate_present: true, authority: 'cherry_approved' }))
  assert.deepEqual(high, { outcome: 'safe_hold', reason: 'high_risk_boundary' })
  assert.equal(plane.exportPrivateState().attempts.length, 2)
})

test('F5 next selection skips blocked workstreams without dispatch or normal-path human approval', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  const plan = plane.selectNext([
    { project_id: 'outcome', role: 'planner', action: 'plan', risk_class: 'standard', source_state: 'matched', expected_binding_version: 2, dependency_state: 'blocked', authority: 'within_scope', stage_gate_present: true },
    { project_id: 'outcome', role: 'builder', action: 'implement', risk_class: 'standard', source_state: 'matched', expected_binding_version: 1, dependency_state: 'satisfied', authority: 'within_scope', stage_gate_present: true },
    { project_id: 'outcome', role: 'release_audit', action: 'release', risk_class: 'high_risk', source_state: 'matched', expected_binding_version: 2, dependency_state: 'satisfied', authority: 'missing', stage_gate_present: true },
  ])
  assert.deepEqual(plan, { outcome: 'selection_plan', selected: { project_id: 'outcome', role: 'builder', action: 'implement', risk_class: 'standard', gate_policy: 'reuse_stage_gate' }, blocked_count: 2, can_dispatch: false, requires_human_approval: false })
  assert.equal(plane.exportPrivateState().events.length, 0)
})

test('F6 duplicate attempt conflicts consume no sequence and exact duplicate start is idempotent', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  assert.equal(plane.start(startCommand()).idempotent, false)
  assert.equal(plane.start(startCommand()).idempotent, true)
  assert.throws(() => plane.start(startCommand({ action: 'verify' })), code('duplicate_attempt_conflict'))
  const state = plane.exportPrivateState()
  assert.equal(state.attempts.length, 1)
  assert.equal(state.events.length, 1)
  assert.equal(state.events[0].sequence, 1)
})

test('F6 clock materialization and reentry failures are atomic', () => {
  let plane
  plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => { plane.projectPublic(); plane.start(startCommand({ instruction_id: 'nested' })); return 100 } })
  assert.throws(() => plane.start(startCommand()), code('reentry_detected'))
  assert.equal(plane.exportPrivateState().events.length, 0)

  const badClock = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => { throw new Error('clock unavailable') } })
  assert.throws(() => badClock.start(startCommand()), code('clock_unavailable'))
  assert.equal(badClock.exportPrivateState().events.length, 0)

  const badClone = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100, materialize: () => { throw new Error('clone unavailable') } })
  assert.throws(() => badClone.start(startCommand()), code('materialization_failed'))
  assert.equal(badClone.exportPrivateState().events.length, 0)

  const substituted = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100, materialize: () => ({ schema_version: 1, attempts: [], events: [], rotations: [] }) })
  assert.throws(() => substituted.start(startCommand()), code('materialization_failed'))
  assert.equal(substituted.exportPrivateState().events.length, 0)

  let tick = 101
  const backwards = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => tick-- })
  backwards.start(startCommand())
  assert.throws(() => backwards.transition(transition('dispatch_observed', { receipt_observed: true, receipt_class: 'provider_ack' })), code('clock_unavailable'))
  assert.equal(backwards.exportPrivateState().events.length, 1)
})

test('QF-1 hostile in-place materializer mutation is rejected without state or sequence consumption', () => {
  let corruptDraft = true
  const plane = createOutcomeExecutionControlPlane({
    registry: registry(),
    clock: () => 100,
    materialize: (next) => {
      if (corruptDraft) {
        next.attempts.length = 0
        next.events.length = 0
      }
      return next
    },
  })

  assert.throws(() => plane.start(startCommand()), code('materialization_failed'))
  assert.deepEqual(plane.exportPrivateState(), { schema_version: 1, attempts: [], events: [], rotations: [] })

  corruptDraft = false
  assert.equal(plane.start(startCommand()).idempotent, false)
  assert.equal(plane.exportPrivateState().events[0].sequence, 1)
})

test('F6 restart replay is byte-parity and corrupt or out-of-order events fail closed', () => {
  const first = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  first.start(startCommand())
  first.transition(transition('dispatch_observed', { receipt_observed: true, receipt_class: 'provider_ack' }))
  const snapshot = first.exportPrivateState()
  const restarted = createOutcomeExecutionControlPlane({ registry: registry(), snapshot, clock: () => 200 })
  assert.deepEqual(restarted.exportPrivateState(), snapshot)
  assert.deepEqual(restarted.projectPublic(), first.projectPublic())
  const corrupt = structuredClone(snapshot)
  corrupt.events[1].sequence = 9
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: corrupt, clock: () => 200 }), code('corrupt_snapshot'))
  const semanticCorrupt = structuredClone(snapshot)
  semanticCorrupt.attempts[0].action = 'invented_action'
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: semanticCorrupt, clock: () => 200 }), code('corrupt_snapshot'))
})

test('QF-2 replay derives canonical fingerprints and preserves exact duplicate idempotency', () => {
  const dispatched = transition('dispatch_observed', { receipt_observed: true, receipt_class: 'provider_ack' })
  const first = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  first.start(startCommand())
  first.transition(dispatched)
  const snapshot = first.exportPrivateState()

  const restarted = createOutcomeExecutionControlPlane({ registry: registry(), snapshot, clock: () => 200 })
  assert.deepEqual(restarted.transition(dispatched), { outcome: 'event_recorded', lifecycle: 'dispatch_observed', idempotent: true })

  for (const corrupt of [
    (() => { const value = structuredClone(snapshot); value.events[0].fingerprint = 'poison'; return value })(),
    (() => { const value = structuredClone(snapshot); value.events[1].fingerprint = 'poison'; value.attempts[0].last_fingerprint = 'poison'; return value })(),
    (() => { const value = structuredClone(snapshot); value.attempts[0].start_fingerprint = 'poison'; return value })(),
    (() => { const value = structuredClone(snapshot); value.attempts[0].last_fingerprint = value.events[0].fingerprint; return value })(),
  ]) assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: corrupt, clock: () => 200 }), code('corrupt_snapshot'))
})

test('QF-3 replacement confirmation first and duplicate responses match persisted state', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.recommendRotation(rotationCommand())
  plane.verifySuccessor({ project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), started: true, continuity_ready: true })
  const confirmation = { project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), registry_read_after_write: true }
  const expected = { outcome: 'rotation_plan', rotation_state: 'replacement_confirmed', binding_switch_eligible: true, predecessor_archive_eligible: true }

  assert.deepEqual(plane.confirmReplacement(confirmation), expected)
  assert.equal(plane.exportPrivateState().rotations[0].history.at(-1).state, 'replacement_confirmed')
  assert.deepEqual(plane.confirmReplacement(confirmation), expected)
})

test('RQF-1 retry replay requires its start sequence after referenced delivery unknown', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.start(startCommand())
  plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' }))
  const retry = startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1' })
  plane.start(retry)
  const valid = plane.exportPrivateState()
  const restarted = createOutcomeExecutionControlPlane({ registry: registry(), snapshot: valid, clock: () => 200 })
  assert.equal(restarted.start(retry).idempotent, true)

  const reordered = structuredClone(valid)
  reordered.events = [reordered.events[0], reordered.events[2], reordered.events[1]]
  reordered.events.forEach((event, index) => { event.sequence = index + 1 })

  assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: reordered, clock: () => 200 }), code('corrupt_snapshot'))
})

test('RQF-2 rotation replay validates recommendation fingerprint and remains idempotent', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  assert.equal(plane.recommendRotation(rotationCommand()).idempotent, false)
  const snapshot = plane.exportPrivateState()
  const restarted = createOutcomeExecutionControlPlane({ registry: registry(), snapshot, clock: () => 200 })
  assert.deepEqual(restarted.recommendRotation(rotationCommand()), { outcome: 'rotation_plan', rotation_state: 'handoff_required', binding_switch_eligible: false, predecessor_archive_eligible: false, idempotent: true })

  const corrupt = structuredClone(snapshot)
  corrupt.rotations[0].fingerprint = 'poison'
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: corrupt, clock: () => 200 }), code('corrupt_snapshot'))
  const factsCorrupt = structuredClone(snapshot)
  factsCorrupt.rotations[0].recommendation.false_completion_count += 1
  assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: factsCorrupt, clock: () => 200 }), code('corrupt_snapshot'))
})

test('RQF-3 successor re-verification returns persisted confirmed state and archive eligibility', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.recommendRotation(rotationCommand())
  const verification = { project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), started: true, continuity_ready: true }
  plane.verifySuccessor(verification)
  plane.confirmReplacement({ project_id: 'outcome', role: 'builder', expected_binding_version: 1, successor_binding_version: 2, checkpoint_digest: 'a'.repeat(64), registry_read_after_write: true })

  assert.deepEqual(plane.verifySuccessor(verification), { outcome: 'rotation_plan', rotation_state: 'replacement_confirmed', binding_switch_eligible: true, predecessor_archive_eligible: true, idempotent: true })
})

test('V2F-1 retry lineage consumes each unknown attempt once and extends only the latest attempt', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.start(startCommand())
  plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' }))
  plane.start(startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1' }))
  const beforeSibling = plane.exportPrivateState()
  assert.throws(() => plane.start(startCommand({ attempt_id: 'synthetic_attempt_3', retry_of_attempt_id: 'synthetic_attempt_1' })), code('invalid_retry_reference'))
  assert.deepEqual(plane.exportPrivateState(), beforeSibling)
  plane.transition(transition('delivery_unknown', { attempt_id: 'synthetic_attempt_2', reason_class: 'missing_ack' }))
  assert.throws(() => plane.start(startCommand({ attempt_id: 'synthetic_attempt_3', retry_of_attempt_id: 'synthetic_attempt_1' })), code('invalid_retry_reference'))
  assert.equal(plane.start(startCommand({ attempt_id: 'synthetic_attempt_3', retry_of_attempt_id: 'synthetic_attempt_2' })).idempotent, false)
})

test('V2F-1 replay rejects sibling retry branches independent of attempt row order', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.start(startCommand())
  plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' }))
  plane.start(startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1' }))
  const branched = plane.exportPrivateState()
  const command = startCommand({ attempt_id: 'synthetic_attempt_3', retry_of_attempt_id: 'synthetic_attempt_1' })
  const nextFingerprint = canonicalFingerprint(command)
  branched.attempts.push({ ...branched.attempts[1], attempt_id: command.attempt_id, start_fingerprint: nextFingerprint, last_fingerprint: nextFingerprint })
  branched.events.push({ ...branched.events[2], sequence: 4, attempt_id: command.attempt_id, fingerprint: nextFingerprint })
  for (const attempts of [branched.attempts, [...branched.attempts].reverse()]) {
    const candidate = structuredClone(branched)
    candidate.attempts = attempts
    assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: candidate, clock: () => 200 }), code('corrupt_snapshot'))
  }
})

test('V2F-2 replay rejects duplicate logical rotation keys in every record order', () => {
  const first = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  first.recommendRotation(rotationCommand())
  const firstRotation = first.exportPrivateState().rotations[0]
  const second = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  second.recommendRotation(rotationCommand({ checkpoint_digest: 'b'.repeat(64), reason_class: 'source_drift' }))
  const secondRotation = second.exportPrivateState().rotations[0]

  for (const rotations of [
    [firstRotation, structuredClone(firstRotation)],
    [firstRotation, secondRotation],
    [secondRotation, firstRotation],
  ]) assert.throws(() => createOutcomeExecutionControlPlane({ registry: registry(), snapshot: { schema_version: 1, attempts: [], events: [], rotations }, clock: () => 200 }), code('corrupt_snapshot'))
})

test('V2F-2 unique rotation records normalize to logical-key order', () => {
  const builder = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  builder.recommendRotation(rotationCommand())
  const planner = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  planner.recommendRotation(rotationCommand({ role: 'planner', expected_binding_version: 2, checkpoint_digest: 'b'.repeat(64) }))
  const rotations = [planner.exportPrivateState().rotations[0], builder.exportPrivateState().rotations[0]]
  const snapshot = { schema_version: 1, attempts: [], events: [], rotations }

  const normalized = createOutcomeExecutionControlPlane({ registry: registry(), snapshot, clock: () => 200 }).exportPrivateState().rotations
  assert.deepEqual(normalized.map((rotation) => rotation.role), ['builder', 'planner'])
  assert.deepEqual(createOutcomeExecutionControlPlane({ registry: registry(), snapshot: { ...snapshot, rotations: [...rotations].reverse() }, clock: () => 200 }).exportPrivateState().rotations, normalized)
})

test('V2F-3 public current role state folds latest event sequence independent of attempt storage order', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.start(startCommand())
  plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' }))
  plane.start(startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1' }))
  const snapshot = plane.exportPrivateState()
  snapshot.attempts.reverse()
  const restarted = createOutcomeExecutionControlPlane({ registry: registry(), snapshot, clock: () => 200 })

  assert.equal(restarted.projectPublic().roles.find((role) => role.role === 'builder').state, 'start_validated')
  assert.deepEqual(restarted.exportPrivateState().attempts.map((attempt) => attempt.attempt_id), ['synthetic_attempt_1', 'synthetic_attempt_2'])

  restarted.start(startCommand({ instruction_id: 'synthetic_instruction_beta', attempt_id: 'synthetic_attempt_beta' }))
  assert.equal(restarted.projectPublic().roles.find((role) => role.role === 'builder').state, 'start_validated')
})

for (const [label, drift] of retryIdentityDrifts) {
  test(`V3F-1 retry rejects ${label} atomically`, () => {
    const plane = createOutcomeExecutionControlPlane({ registry: registry([{ project_id: 'second', role: 'builder', version: 1, state: 'active', health: 'fresh' }]), clock: () => 100 })
    plane.start(startCommand())
    plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' }))
    const before = plane.exportPrivateState()
    const retry = startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1', ...drift })

    assert.throws(() => plane.start(retry), code('invalid_retry_reference'))
    assert.deepEqual(plane.exportPrivateState(), before)
  })
}

test('V3F-1 replay rejects identity-drifted retries in either attempt row order', () => {
  const replayRegistry = registry([{ project_id: 'second', role: 'builder', version: 1, state: 'active', health: 'fresh' }])
  const plane = createOutcomeExecutionControlPlane({ registry: replayRegistry, clock: () => 100 })
  plane.start(startCommand())
  plane.transition(transition('delivery_unknown', { reason_class: 'missing_ack' }))
  plane.start(startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1' }))
  const valid = plane.exportPrivateState()

  for (const [, drift] of retryIdentityDrifts) {
    const retry = startCommand({ attempt_id: 'synthetic_attempt_2', retry_of_attempt_id: 'synthetic_attempt_1', ...drift })
    const fingerprint = canonicalFingerprint(retry)
    const corrupt = structuredClone(valid)
    const child = corrupt.attempts.find((attempt) => attempt.attempt_id === retry.attempt_id)
    Object.assign(child, { project_id: retry.project_id, role: retry.role, binding_version: retry.expected_binding_version, action: retry.action, risk_class: retry.risk_class, start_fingerprint: fingerprint, last_fingerprint: fingerprint })
    const startEvent = corrupt.events.find((event) => event.attempt_id === retry.attempt_id)
    Object.assign(startEvent, { binding_version: retry.expected_binding_version, fingerprint })
    for (const attempts of [corrupt.attempts, [...corrupt.attempts].reverse()]) {
      const candidate = structuredClone(corrupt)
      candidate.attempts = attempts
      assert.throws(() => createOutcomeExecutionControlPlane({ registry: replayRegistry, snapshot: candidate, clock: () => 200 }), code('corrupt_snapshot'))
    }
  }
})

test('F7 public projection serializes zero private identifiers digests content paths credentials or completion authority', () => {
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  plane.start(startCommand({ instruction_id: 'private_instruction_marker', attempt_id: 'private_attempt_marker' }))
  plane.recommendRotation(rotationCommand({ checkpoint_digest: 'b'.repeat(64) }))
  const serialized = JSON.stringify(plane.projectPublic())
  for (const pattern of [/private_instruction_marker/, /private_attempt_marker/, /b{64}/, /locator/i, /prompt|raw_content|result_content/i, /\/Users\/|\/tmp\//, /token|password|credential|secret/i, /gate_pass|approval|release_authority|dispatch_authority/i]) assert.doesNotMatch(serialized, pattern)
  assert.match(serialized, /projection_only/)
})

test('F8 exported surface is local-only and has no provider dispatch session archive or retry operation', async () => {
  const module = await import('./outcome-execution-control-plane.mjs')
  assert.deepEqual(Object.keys(module).sort(), ['EXECUTION_CONTROL_AUTHORITIES', 'EXECUTION_CONTROL_SERVICES', 'ExecutionControlError', 'createOutcomeExecutionControlPlane'])
  const plane = createOutcomeExecutionControlPlane({ registry: registry(), clock: () => 100 })
  for (const name of ['dispatch', 'sendMessage', 'createSession', 'archiveSession', 'retry', 'deploy', 'release']) assert.equal(plane[name], undefined)
})
