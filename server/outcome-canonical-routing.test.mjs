import test from 'node:test'
import assert from 'node:assert/strict'

const actualDateNow = Date.now
Date.now = () => 50
const { createTrustedRoleEvidenceVerifier } = await import('./outcome-role-transport-evidence.mjs')
const { createOutcomeCanonicalRouting } = await import('./outcome-canonical-routing.mjs')
Date.now = actualDateNow
import { createFixtureEvidenceAuthority } from './outcome-role-transport-evidence-fixtures.test.mjs'

const registry = (builder = {}, { includeBuilder = true, extraBindings = [] } = {}) => ({ bindings: [
  { project_id: 'outcome', role: 'planner', version: 2, state: 'active', health: 'fresh', public_alias: 'outcome_planner', transport_class: 'codex_app_peer_thread' },
  ...(includeBuilder ? [{ project_id: 'outcome', role: 'builder', version: 3, state: 'active', health: 'fresh', public_alias: 'builder_successor', transport_class: 'codex_app_peer_thread', ...builder }] : []),
  ...extraBindings,
] })

const setup = ({ snapshot, builder, includeBuilder, extraBindings, clock = () => 100 } = {}) => {
  const verifier = createTrustedRoleEvidenceVerifier()
  const authority = createFixtureEvidenceAuthority(verifier)
  const routing = createOutcomeCanonicalRouting({ registry: registry(builder, { includeBuilder, extraBindings }), evidenceResolver: verifier, snapshot, clock })
  return { routing, authority }
}

const command = (authority, overrides = {}) => ({
  instruction_id: 'instruction_alpha',
  attempt_id: 'attempt_alpha',
  idempotency_key: 'planner_read_only_status_1',
  project_id: 'outcome',
  planner_binding_version: 2,
  target_role: 'builder',
  target_binding_version: 3,
  target_public_alias: 'builder_successor',
  intent_class: 'read_only_status',
  scope_class: 'approved_package_and_git_status',
  retry_of_attempt_id: null,
  trusted_evidence: authority.resolveStart({ project_id: 'outcome', role: 'builder', binding_version: 3, public_alias: 'builder_successor', instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha' }),
  ...overrides,
})

const start = (routing, authority, overrides) => routing.createInstruction(command(authority, overrides))
const provider = (routing, authority, startToken, cursor = 8) => routing.recordProviderSend({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', trusted_evidence: authority.providerSend(startToken, { observation_cursor: cursor }) })
const destination = (routing, authority, providerToken, cursor = 9) => routing.recordDestinationStarted({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', trusted_evidence: authority.destinationStart(providerToken, { observation_cursor: cursor, observation_kind: 'new_turn' }) })

test('T1-T3 exact Planner route stores immutable instruction and idempotent attempt', () => {
  const { routing, authority } = setup()
  const input = command(authority)
  assert.deepEqual(routing.createInstruction(input), { outcome: 'started', lifecycle: 'start_validated', idempotent: false })
  assert.deepEqual(routing.createInstruction(input), { outcome: 'started', lifecycle: 'start_validated', idempotent: true })
  const snapshot = routing.exportPrivateState()
  assert.equal(snapshot.instructions.length, 1)
  assert.equal(snapshot.control_plane.attempts.length, 1)
  assert.deepEqual(snapshot.instructions[0], {
    instruction_id: 'instruction_alpha', idempotency_key: 'planner_read_only_status_1', project_id: 'outcome', planner_binding_version: 2,
    target_role: 'builder', target_binding_version: 3, intent_class: 'read_only_status', scope_class: 'approved_package_and_git_status', created_at: 100,
  })
  const before = structuredClone(snapshot)
  assert.throws(() => routing.createInstruction(command(authority, { scope_class: 'private_prompt_body' })), /idempotency_conflict|invalid_command/)
  assert.deepEqual(routing.exportPrivateState(), before)
})

test('T2 wrong Planner project role and binding fail closed before lifecycle allocation', () => {
  for (const overrides of [
    { project_id: 'cherry-note' },
    { planner_binding_version: 1 },
    { target_role: 'planner', target_binding_version: 2, target_public_alias: 'outcome_planner' },
  ]) {
    const { routing, authority } = setup()
    assert.throws(() => start(routing, authority, overrides), /planner_binding_mismatch|route_denied|invalid_command/)
    assert.equal(routing.exportPrivateState().control_plane.events.length, 0)
  }
})

test('T4 trusted receipts alone advance send and destination STARTED', () => {
  const { routing, authority } = setup()
  const startToken = command(authority).trusted_evidence
  routing.createInstruction(command(authority, { trusted_evidence: startToken }))
  assert.throws(() => routing.recordProviderSend({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', trusted_evidence: { receipt_observed: true } }), /trusted_evidence_required/)
  const providerToken = authority.providerSend(startToken, { observation_cursor: 8 })
  provider(routing, authority, startToken)
  assert.throws(() => routing.recordDestinationStarted({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', trusted_evidence: { started: true } }), /trusted_evidence_required/)
  destination(routing, authority, providerToken)
  const snapshot = routing.exportPrivateState()
  assert.deepEqual(snapshot.transport_receipts.map(({ kind }) => kind), ['provider_send', 'destination_start'])
  assert.equal(snapshot.control_plane.attempts[0].state, 'execution_started')
})

test('T5 E4 E6 delivery_unknown is terminal across restart and never retries automatically', () => {
  const { routing, authority } = setup()
  start(routing, authority)
  routing.recordDeliveryUnknown({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', reason_class: 'timeout' })
  const snapshot = routing.exportPrivateState()
  assert.equal(snapshot.control_plane.attempts.length, 1)
  assert.equal(snapshot.control_plane.attempts[0].state, 'delivery_unknown')
  const restarted = setup({ snapshot, clock: () => 200 }).routing
  assert.equal(restarted.exportPrivateState().control_plane.attempts.length, 1)
  assert.equal(restarted.queryPrivate().current_attempt.lifecycle, 'delivery_unknown')
  assert.equal(restarted.queryPrivate().automatic_retry_count, 0)

  const retrySetup = setup({ snapshot, clock: () => 200 })
  const retryToken = retrySetup.authority.resolveStart({ project_id: 'outcome', role: 'builder', binding_version: 3, public_alias: 'builder_successor', instruction_id: 'instruction_alpha', attempt_id: 'attempt_stale' })
  assert.deepEqual(retrySetup.routing.createInstruction(command(retrySetup.authority, { attempt_id: 'attempt_stale', retry_of_attempt_id: 'attempt_alpha', trusted_evidence: retryToken })), { outcome: 'started', lifecycle: 'start_validated', idempotent: false })
  assert.equal(retrySetup.routing.exportPrivateState().instructions.length, 1)
  assert.equal(retrySetup.routing.exportPrivateState().control_plane.attempts.length, 2)
  assert.equal(retrySetup.routing.queryPrivate().automatic_retry_count, 0)
})

test('E1-E3 role result evidence and Gate decision remain distinct and mismatches are atomic', () => {
  const { routing, authority } = setup()
  const startToken = command(authority).trusted_evidence
  routing.createInstruction(command(authority, { trusted_evidence: startToken }))
  const providerToken = authority.providerSend(startToken, { observation_cursor: 8 })
  routing.recordProviderSend({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', trusted_evidence: providerToken })
  routing.recordDestinationStarted({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', trusted_evidence: authority.destinationStart(providerToken, { observation_cursor: 9, observation_kind: 'new_turn' }) })
  routing.recordRoleResult({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', result_class: 'candidate_ready', result_receipt_sha256: 'a'.repeat(64) })
  const beforeMismatch = routing.exportPrivateState()
  assert.throws(() => routing.attachEvidence({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', result_receipt_sha256: 'b'.repeat(64), evidence_receipt_sha256: 'c'.repeat(64), candidate_commit: 'd'.repeat(40), candidate_tree: 'e'.repeat(40) }), /result_receipt_mismatch/)
  assert.deepEqual(routing.exportPrivateState(), beforeMismatch)
  routing.attachEvidence({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', result_receipt_sha256: 'a'.repeat(64), evidence_receipt_sha256: 'c'.repeat(64), candidate_commit: 'd'.repeat(40), candidate_tree: 'e'.repeat(40) })
  const snapshot = routing.exportPrivateState()
  assert.equal(snapshot.role_results.length, 1)
  assert.equal(snapshot.evidence_pointers.length, 1)
  assert.equal(snapshot.gate_decisions.length, 0)

  const replaced = setup({ snapshot, builder: { state: 'replaced' }, clock: () => 200 }).routing
  const beforeRevoked = replaced.exportPrivateState()
  assert.throws(() => replaced.attachEvidence({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', result_receipt_sha256: 'a'.repeat(64), evidence_receipt_sha256: 'c'.repeat(64), candidate_commit: 'd'.repeat(40), candidate_tree: 'e'.repeat(40) }), /binding_revoked/)
  assert.deepEqual(replaced.exportPrivateState(), beforeRevoked)
})

test('E5 private dashboard projection is finite and excludes identifiers, bodies, paths and authority', () => {
  const { routing, authority } = setup()
  start(routing, authority)
  const projection = routing.projectDashboard()
  assert.deepEqual(projection, {
    objective: 'phase3_read_only_vertical_slice', lifecycle: 'start_validated', binding_condition: 'ready', next_boundary: 'trusted_provider_send_required', cherry_action: 'none',
    authority: 'projection_only', can_dispatch: false, can_accept: false, can_release: false,
  })
  const text = JSON.stringify(projection)
  for (const forbidden of ['instruction_alpha', 'attempt_alpha', 'destination_', '/Users/', 'prompt', 'result_body', 'locator']) assert.equal(text.includes(forbidden), false)
})

test('QA RED selected Builder conditions project distinct public-safe recovery guidance', () => {
  const cases = {
    ready: setup(),
    stale: setup({ builder: { health: 'stale' } }),
    blocked: setup({ builder: { state: 'blocked' } }),
    replaced: setup({ builder: { state: 'replaced' } }),
    unavailable: setup({ includeBuilder: false }),
  }
  const projections = Object.fromEntries(Object.entries(cases).map(([key, value]) => [key, value.routing.projectDashboard()]))
  assert.deepEqual(Object.fromEntries(Object.entries(projections).map(([key, value]) => [key, [value.binding_condition, value.next_boundary, value.cherry_action]])), {
    ready: ['ready', 'read_only_instruction_required', 'none'],
    stale: ['stale', 'planner_binding_revalidation_required', 'revalidate_builder_binding'],
    blocked: ['blocked', 'binding_blocker_resolution_required', 'resolve_builder_blocker'],
    replaced: ['replaced', 'current_binding_resolution_required', 'resolve_current_builder_binding'],
    unavailable: ['unavailable', 'manual_navigation_or_recovery_required', 'recover_builder_binding'],
  })
  assert.equal(new Set(Object.values(projections).map((value) => JSON.stringify(value))).size, 5)
  for (const projection of Object.values(projections)) {
    assert.equal(projection.can_dispatch, false)
    assert.equal(projection.can_accept, false)
    assert.equal(projection.can_release, false)
    const text = JSON.stringify(projection)
    for (const forbidden of ['instruction_alpha', 'attempt_alpha', 'destination_', '/Users/', 'credential', 'prompt', 'result_body', 'locator', 'session_id', 'thread_id', 'task_id', 'turn_id']) assert.equal(text.includes(forbidden), false)
  }
  assert.deepEqual(cases.stale.routing.createInstruction(command(cases.stale.authority)), { outcome: 'safe_hold', reason: 'binding_stale' })
  assert.deepEqual(cases.blocked.routing.createInstruction(command(cases.blocked.authority)), { outcome: 'safe_hold', reason: 'binding_conflict' })
  assert.deepEqual(cases.replaced.routing.createInstruction(command(cases.replaced.authority)), { outcome: 'safe_hold', reason: 'binding_replaced' })
  assert.deepEqual(cases.unavailable.routing.createInstruction(command(cases.unavailable.authority)), { outcome: 'safe_hold', reason: 'binding_unavailable' })
  for (const key of ['stale', 'blocked', 'replaced', 'unavailable']) {
    assert.equal(cases[key].routing.exportPrivateState().control_plane.events.length, 0)
    assert.throws(() => cases[key].routing.attachEvidence({ instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', result_receipt_sha256: 'a'.repeat(64), evidence_receipt_sha256: 'b'.repeat(64), candidate_commit: 'c'.repeat(40), candidate_tree: 'd'.repeat(40) }), /binding_revoked/)
  }
})

test('QA RED malformed non-unique and cross-project Builder inputs remain fail-closed', () => {
  const duplicate = { project_id: 'outcome', role: 'builder', version: 4, state: 'active', health: 'fresh', public_alias: 'builder_other', transport_class: 'codex_app_peer_thread' }
  const crossProject = { project_id: 'other', role: 'builder', version: 3, state: 'active', health: 'fresh', public_alias: 'builder_successor', transport_class: 'codex_app_peer_thread' }
  assert.throws(() => setup({ extraBindings: [duplicate] }), /invalid_registry/)
  assert.throws(() => setup({ includeBuilder: false, extraBindings: [crossProject] }), /invalid_registry/)
  assert.throws(() => setup({ builder: { version: 'three' } }), /invalid_registry/)
})
