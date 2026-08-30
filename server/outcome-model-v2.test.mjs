import assert from 'node:assert/strict'
import test from 'node:test'
import { applyOutcomeModelV2Pilot, coherentCandidateIdentity, createCodexRuntimeAdapter, projectOutcomeV2, translateV1Package, validateOutcomeGraph } from './outcome-model-v2.mjs'

const source = 'a'.repeat(40)
const graph = () => ({ schema_version: 2, project: { id: 'outcome', name: 'OUTCOME', terminal_outcome: 'One current outcome' }, destinations: [{ id: 'destination-one', project_id: 'outcome', title: 'One', outcome: 'Done', depends_on: [], primary: true }], milestones: [{ id: 'milestone-one', destination_id: 'destination-one', title: 'Pilot', expected_user_delta: 'One projection', depends_on: [], predicate_ids: ['predicate-one'] }], acceptance_predicates: [{ id: 'predicate-one', milestone_id: 'milestone-one', description: 'Evidence exists', check: 'test', expect: 'pass', authority: 'predicate-policy' }], evidence_claims: [] })
const v1 = () => ({ schemaVersion: 2, observedAt: '2026-08-31T00:00:00.000Z', project: { id: 'outcome', name: 'OUTCOME', outcome: 'One current outcome' }, current: { phaseId: 'destination-one' }, phases: [{ id: 'destination-one', title: 'One', purpose: 'Done', scopes: [{ id: 'derived-scope', stages: [{ id: 'milestone-one', title: 'Pilot', purpose: 'One projection', dependsOn: [], gate: { sourceRef: 'GATES.md', gates: [{ id: 'P1', title: 'Evidence exists', closed: false, evidence: 'pending' }] } }] }] }] })

test('P1 validates the five canonical entity types without Scope', () => {
  const value = validateOutcomeGraph(graph())
  assert.equal(Object.hasOwn(value, 'scopes'), false)
  assert.deepEqual(Object.keys(value).sort(), ['acceptance_predicates', 'destinations', 'evidence_claims', 'milestones', 'project', 'schema_version'])
})

test('P1 hostile shapes prototypes accessors duplicates and dangling references fail closed', () => {
  for (const value of [Object.create(null), new Proxy(graph(), { get() { assert.fail('proxy trap') } }), { ...graph(), extra: true }, { ...graph(), destinations: [...graph().destinations, graph().destinations[0]] }, { ...graph(), milestones: [{ ...graph().milestones[0], destination_id: 'missing' }] }]) assert.throws(() => validateOutcomeGraph(value))
  const accessor = graph(); Object.defineProperty(accessor.project, 'name', { get() { assert.fail('accessor') }, enumerable: true }); assert.throws(() => validateOutcomeGraph(accessor))
  const cycle = graph(); cycle.milestones.push({ id: 'milestone-two', destination_id: 'destination-one', title: 'Two', expected_user_delta: 'Two', depends_on: ['milestone-one'], predicate_ids: [] }); cycle.milestones[0].depends_on = ['milestone-two']; assert.throws(() => validateOutcomeGraph(cycle), /milestone_cycle/)
})

test('P2 translates v1 without mutating source bytes or requiring Scope canonically', () => {
  const input = v1(); const before = JSON.stringify(input); const translated = translateV1Package(input)
  assert.equal(JSON.stringify(input), before); assert.equal(translated.milestones[0].destination_id, 'destination-one'); assert.equal(Object.hasOwn(translated, 'scopes'), false)
})

test('P3 P5 P6 projector is versioned deterministic and denies drift duplicates leases expiry retry', () => {
  const work = { id: 'work-one', milestone_id: 'milestone-one', fingerprint: 'same', acceptance_gap_delta: 1, uncertainty_delta: 0, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
  const base = { graph: graph(), source_revision: source, observed_at: '2026-08-31T00:00:00.000Z', work_items: [work] }
  assert.equal(projectOutcomeV2(base).next_action, 'work-one')
  assert.deepEqual(projectOutcomeV2(base), projectOutcomeV2(base))
  assert.equal(projectOutcomeV2({ ...base, expected_source_revision: 'b'.repeat(40) }).next_action, null)
  assert.equal(projectOutcomeV2({ ...base, work_items: [work, { ...work, id: 'work-two' }] }).blockers.duplicate_fingerprints, 1)
  assert.equal(projectOutcomeV2({ ...base, leases: [{ work_id: 'work-one', key: 'builder', expires_at: '2026-09-01T00:00:00.000Z' }, { work_id: 'work-two', key: 'builder', expires_at: '2026-09-01T00:00:00.000Z' }] }).blockers.overlapping_leases, 1)
  assert.equal(projectOutcomeV2({ ...base, mission_envelope: { expires_at: '2026-08-30T00:00:00.000Z' } }).cherry_action, 'renew_mission_envelope')
  assert.equal(projectOutcomeV2({ ...base, attempts: [{ id: 'attempt-one', work_id: 'work-one', fingerprint: 'same', state: 'delivery_unknown', automatic_retry_count: 0 }] }).delivery_unknown_count, 1)
  assert.throws(() => projectOutcomeV2({ ...base, attempts: [{ id: 'attempt-one', work_id: 'work-one', fingerprint: 'same', state: 'delivery_unknown', automatic_retry_count: 1 }] }), /automatic_retry_forbidden/)
})

test('P4 adapter reuses control-plane boundary and cannot commit canonical transitions', () => {
  const calls = []; const adapter = createCodexRuntimeAdapter({ selectNext(value) { calls.push('select'); return value }, start(value) { calls.push('start'); return value }, transition(value) { calls.push(value.event); return value }, projectPublic() { return { authority: 'projection_only' } } })
  adapter.select([]); adapter.startValidated({}); for (const event of ['dispatch_observed', 'execution_started', 'role_result_recorded']) adapter.recordObserved({ event }); adapter.recordEvidenceEvaluation({ event: 'handoff_accepted' })
  assert.deepEqual(calls, ['select', 'start', 'dispatch_observed', 'execution_started', 'role_result_recorded', 'handoff_accepted']); assert.equal(adapter.canCommitCanonicalTransition, false); assert.equal(adapter.projectRuntime().authority, 'projection_only'); assert.equal(adapter.commitCanonicalTransition, undefined)
})

test('P5 active duplicate attempt denies allocation', () => {
  const work = { id: 'work-one', milestone_id: 'milestone-one', fingerprint: 'same', acceptance_gap_delta: 1, uncertainty_delta: 0, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
  const projection = projectOutcomeV2({ graph: graph(), source_revision: source, observed_at: '2026-08-31T00:00:00.000Z', work_items: [work], attempts: [{ id: 'attempt-one', work_id: 'other', fingerprint: 'same', state: 'execution_started', automatic_retry_count: 0 }] })
  assert.equal(projection.next_action, null)
})

test('P7 candidate identity and verification trigger ignore no-semantic-delta history', () => {
  const identity = coherentCandidateIdentity({ source_tree: source, dependency_lock: 'b'.repeat(40), config_class: 'default-off', predicate_ids: ['predicate-one'] })
  assert.equal(identity.length, 64)
  const projection = projectOutcomeV2({ graph: graph(), source_revision: source, observed_at: '2026-08-31T00:00:00.000Z', verification_history: [{ candidate_identity: identity, semantic_delta: false, verified: false }, { candidate_identity: identity, semantic_delta: true, verified: false }] })
  assert.deepEqual(projection.verification_required, [identity])
})

test('P8 default-off returns the exact v1 object and enabled mode is projection-only', () => {
  const project = v1(); const collection = { schemaVersion: 2, observedAt: project.observedAt, projects: [project] }
  assert.equal(applyOutcomeModelV2Pilot(collection, { environment: {} }), collection)
  const enabled = applyOutcomeModelV2Pilot(collection, { environment: { OUTCOME_MODEL_V2_ENABLED: '1' }, source_revision: source })
  assert.equal(enabled.modelV2.authority, 'projection_only'); assert.equal(Object.hasOwn(collection, 'modelV2'), false)
})

test('S2 S4 duplicate and zero-delta work allocate nothing and request an exact decision', () => {
  const zero = { id: 'work-zero', milestone_id: 'milestone-one', fingerprint: 'zero', acceptance_gap_delta: 0, uncertainty_delta: 0, blocker_delta: 0, user_value_delta: 0, reversible: true, cost: 0 }
  const projection = projectOutcomeV2({ graph: graph(), source_revision: source, observed_at: '2026-08-31T00:00:00.000Z', work_items: [zero] })
  assert.equal(projection.next_action, null); assert.equal(projection.cherry_action, 'review_no_outcome_delta'); assert.equal(projection.blockers.zero_outcome_delta, 1); assert.equal(projection.automatic_retry_count, 0)
})

test('S3 correction handoff and status artifacts stay outside active graph while v1 remains recoverable', () => {
  const input = v1(); input.corrections = [{ id: 'correction-one' }]; input.handoffs = [{ id: 'handoff-one' }]; input.status_history = [{ id: 'status-one' }]
  const translated = translateV1Package(input); const serialized = JSON.stringify(translated)
  assert.doesNotMatch(serialized, /correction-one|handoff-one|status-one/); assert.match(JSON.stringify(input), /correction-one|handoff-one|status-one/)
})
