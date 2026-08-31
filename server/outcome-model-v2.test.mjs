import assert from 'node:assert/strict'
import test from 'node:test'
import { applyOutcomeModelV2Pilot, coherentCandidateIdentity, compileOutcomeSelectiveContextPlan, compileOutcomeV2Snapshot, consumeOutcomeSelectiveContextPlan, createCodexRuntimeAdapter, projectOutcomeV2, startOutcomeV2FromSnapshot, translateV1Package, validateOutcomeGraph } from './outcome-model-v2.mjs'

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

test('A1 unset configuration defaults to v2 explicit zero rolls back exact v1 and invalid values fail closed', () => {
  const project = v1(); const collection = { schemaVersion: 2, observedAt: project.observedAt, projects: [project] }
  const bytes = JSON.stringify(collection)
  const defaulted = applyOutcomeModelV2Pilot(collection, { environment: {}, source_revision: source })
  assert.equal(defaulted.modelV2.authority, 'projection_only'); assert.equal(Object.hasOwn(collection, 'modelV2'), false)
  assert.equal(applyOutcomeModelV2Pilot(collection, { environment: { OUTCOME_MODEL_V2_ENABLED: '0' }, source_revision: source }), collection)
  assert.equal(JSON.stringify(collection), bytes)
  for (const flag of ['', 'true', '01', ' 1', '1 ']) assert.throws(() => applyOutcomeModelV2Pilot(collection, { environment: { OUTCOME_MODEL_V2_ENABLED: flag }, source_revision: source }), /invalid_model_v2_configuration/)
  const enabled = applyOutcomeModelV2Pilot(collection, { environment: { OUTCOME_MODEL_V2_ENABLED: '1' }, source_revision: source })
  assert.equal(enabled.modelV2.authority, 'projection_only'); assert.equal(Object.hasOwn(collection, 'modelV2'), false)
})

test('B1-B6 selective context plan is content addressed and consumed only by a capable local adapter', () => {
  const digest = (character) => character.repeat(64)
  const sources = {
    agents: { source_ref: 'AGENTS.md', source_digest: digest('a') },
    active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: digest('b') },
    current_gate: { source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: digest('c') },
    current_handoff: { source_ref: 'current-builder-checkpoint', source_digest: digest('d') },
  }
  const base = { environment: {}, work_id: 'selective-context-activation', work_type: 'builder', role_skill: 'mango-implementation-engineer', sources, available_source_digests: { ...Object.fromEntries(Object.values(sources).map((row) => [row.source_ref, row.source_digest])), 'docs/OUTCOME_CONTRACT.md': digest('e') }, expansion_allowlist: [{ source_ref: 'docs/OUTCOME_CONTRACT.md', source_digest: digest('e') }], expansions: [{ source_ref: 'docs/OUTCOME_CONTRACT.md', source_digest: digest('e'), reason: 'acceptance-contract', work_id: 'selective-context-activation' }] }
  const plan = compileOutcomeSelectiveContextPlan(base)
  assert.equal(plan.schema_version, 2); assert.equal(plan.authority, 'projection_only'); assert.equal(plan.outcome, 'ready')
  assert.deepEqual(plan.loaded_sources.map((row) => row.source_ref), ['AGENTS.md', 'active-bootstrap-snapshot', 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', 'current-builder-checkpoint', 'skill:karpathy-guidelines', 'skill:unlazy', 'skill:mango-implementation-engineer', 'docs/OUTCOME_CONTRACT.md'])
  let consumed = 0
  const adapter = createCodexRuntimeAdapter({ selectNext(value) { return value }, start(value) { return value }, transition(value) { return value }, projectPublic() { return { authority: 'projection_only' } }, selectiveContextCapability: 'content-addressed-plan-v1', consumeContextPlan(value) { consumed += 1; return { accepted: value.outcome === 'ready' } } })
  const receipt = consumeOutcomeSelectiveContextPlan(adapter, plan)
  assert.equal(consumed, 1); assert.equal(receipt.outcome, 'locally_consumed'); assert.equal(receipt.safety.execution_started_count, 0)
  const serialized = JSON.stringify(receipt)
  for (const pattern of [/\/Users\/|\/private\/tmp\//, /(?:thread|session|task|turn)[_-]?id/i, /credential|password|secret|token/i, /raw[_-]?(?:prompt|result)/i, /dispatch_authority|release_authority|canonical_transition_authority/i]) assert.doesNotMatch(serialized, pattern)
  assert.deepEqual(receipt, consumeOutcomeSelectiveContextPlan(adapter, plan)); assert.equal(consumed, 2)
  const unsupported = consumeOutcomeSelectiveContextPlan(createCodexRuntimeAdapter({ selectNext(value) { return value }, start(value) { return value }, transition(value) { return value }, projectPublic() { return { authority: 'projection_only' } } }), plan)
  assert.equal(unsupported.outcome, 'safe_hold'); assert.equal(unsupported.reason, 'unsupported_adapter_capability'); assert.equal(consumed, 2)
})

test('B3-B5 role selection no-role rollback and negative controls are deterministic', () => {
  const digest = (character) => character.repeat(64)
  const sources = { agents: { source_ref: 'AGENTS.md', source_digest: digest('a') }, active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: digest('b') }, current_gate: { source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: digest('c') }, current_handoff: null }
  const available = Object.fromEntries(Object.values(sources).filter(Boolean).map((row) => [row.source_ref, row.source_digest]))
  const make = (work_type, role_skill) => ({ environment: {}, work_id: 'bounded-work', work_type, role_skill, sources, available_source_digests: available, expansion_allowlist: [], expansions: [] })
  for (const [workType, skill] of Object.entries({ planner: 'berry-product-partner', builder: 'mango-implementation-engineer', ux_product_qa: 'lime-independent-qa', release_audit: 'lime-release-auditor' })) {
    const plan = compileOutcomeSelectiveContextPlan(make(workType, skill))
    assert.equal(plan.loaded_sources.filter((row) => row.source_ref.startsWith('skill:')).length, 3)
    assert.equal(plan.loaded_sources.at(-1).source_ref, `skill:${skill}`)
  }
  const noRole = compileOutcomeSelectiveContextPlan(make('no_role', null))
  assert.equal(noRole.loaded_sources.filter((row) => row.source_ref.startsWith('skill:')).length, 2)
  assert.equal(compileOutcomeSelectiveContextPlan(make('unknown', null)).reason, 'unknown_work_type')
  assert.equal(compileOutcomeSelectiveContextPlan(make('builder', 'lime-independent-qa')).reason, 'wrong_role_skill')
  assert.equal(compileOutcomeSelectiveContextPlan({ ...make('builder', 'mango-implementation-engineer'), available_source_digests: { ...available, 'AGENTS.md': digest('f') } }).reason, 'source_digest_drift')
  assert.equal(compileOutcomeSelectiveContextPlan({ ...make('builder', 'mango-implementation-engineer'), sources: { ...sources, agents: {} } }).reason, 'source_input_missing')
  const rollbackInput = make('builder', 'mango-implementation-engineer'); rollbackInput.environment = { OUTCOME_MODEL_V2_ENABLED: '0' }
  assert.deepEqual(compileOutcomeSelectiveContextPlan(rollbackInput), { schema_version: 1, outcome: 'v1_rollback', original_value_required: true })
  const duplicate = { source_ref: 'docs/OUTCOME_CONTRACT.md', source_digest: digest('d'), reason: 'acceptance-contract', work_id: 'bounded-work' }
  assert.throws(() => compileOutcomeSelectiveContextPlan({ ...make('builder', 'mango-implementation-engineer'), available_source_digests: { ...available, 'docs/OUTCOME_CONTRACT.md': digest('d') }, expansion_allowlist: [{ source_ref: duplicate.source_ref, source_digest: duplicate.source_digest }], expansions: [duplicate, duplicate] }), /duplicate_expansion/)
})

test('QA correction rejects hostile source refs before callback and projects no refs into public receipts', () => {
  const digest = 'a'.repeat(64)
  const sources = { agents: { source_ref: 'AGENTS.md', source_digest: digest }, active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: digest }, current_gate: { source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: digest }, current_handoff: null }
  const hostileRefs = ['thread-private-marker', 'registry-locator-ref', 'provider-payload-ref', 'TASK_ID_private', 'Session-Id-private', 'turn.id.private', '<THREAD_ID>', 'REGISTRY_REF', 'Locator_Ref', '.outcome-runtime/private', 'Provider_Payload', 'vercel-response', 'credential-ref', 'PASSWORD_FILE', 'secret-token', 'raw-prompt', 'RAW_RESULT', '/Users/private/source', '/tmp/private-source', 'C:\\Users\\private\\source', 'provider\\payload', '<docs/OUTCOME_CONTRACT.md>', 'docs/THREAD_ID.md']
  let callbacks = 0
  const adapter = createCodexRuntimeAdapter({ selectNext: (value) => value, start: (value) => value, transition: (value) => value, projectPublic: () => ({ authority: 'projection_only' }), selectiveContextCapability: 'content-addressed-plan-v1', consumeContextPlan() { callbacks += 1; return { accepted: true } } })
  for (const source_ref of hostileRefs) {
    const available_source_digests = { ...Object.fromEntries(Object.values(sources).filter(Boolean).map((row) => [row.source_ref, row.source_digest])), [source_ref]: digest }
    const expansion = { source_ref, source_digest: digest, reason: 'predicate-evidence', work_id: 'bounded-work' }
    assert.throws(() => compileOutcomeSelectiveContextPlan({ environment: {}, work_id: 'bounded-work', work_type: 'builder', role_skill: 'mango-implementation-engineer', sources, available_source_digests, expansion_allowlist: [{ source_ref, source_digest: digest }], expansions: [expansion] }), /invalid_context_source_ref/)
  }
  assert.equal(callbacks, 0)
  const validRef = 'docs/OUTCOME_CONTRACT.md'
  const available_source_digests = { ...Object.fromEntries(Object.values(sources).filter(Boolean).map((row) => [row.source_ref, row.source_digest])), [validRef]: digest }
  const plan = compileOutcomeSelectiveContextPlan({ environment: {}, work_id: 'bounded-work', work_type: 'builder', role_skill: 'mango-implementation-engineer', sources, available_source_digests, expansion_allowlist: [{ source_ref: validRef, source_digest: digest }], expansions: [{ source_ref: validRef, source_digest: digest, reason: 'predicate-evidence', work_id: 'bounded-work' }] })
  const receipt = consumeOutcomeSelectiveContextPlan(adapter, plan)
  assert.equal(callbacks, 1)
  assert.deepEqual(receipt.loaded_sources.map((row) => Object.keys(row).sort()), receipt.loaded_sources.map(() => ['content_addressed', 'source_class']))
  assert.doesNotMatch(JSON.stringify(receipt), /source_ref|AGENTS\.md|OUTCOME_CONTRACT|mango-implementation-engineer/)
})

test('QA correction rejects Proxy and accessor refs with zero traps and callbacks', () => {
  let traps = 0
  const digest = 'a'.repeat(64)
  const base = { environment: {}, work_id: 'bounded-work', work_type: 'builder', role_skill: 'mango-implementation-engineer', sources: { agents: { source_ref: 'AGENTS.md', source_digest: digest }, active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: digest }, current_gate: { source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: digest }, current_handoff: null }, available_source_digests: { 'AGENTS.md': digest, 'active-bootstrap-snapshot': digest, 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md': digest }, expansion_allowlist: [], expansions: [] }
  const proxy = new Proxy({ source_ref: 'docs/OUTCOME_CONTRACT.md', source_digest: digest }, { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  assert.throws(() => compileOutcomeSelectiveContextPlan({ ...base, expansion_allowlist: [proxy] }), /proxy_forbidden/)
  const accessor = {}; Object.defineProperty(accessor, 'source_ref', { enumerable: true, get() { traps += 1; return 'docs/OUTCOME_CONTRACT.md' } }); Object.defineProperty(accessor, 'source_digest', { enumerable: true, value: digest })
  assert.throws(() => compileOutcomeSelectiveContextPlan({ ...base, expansion_allowlist: [accessor] }), /accessor_forbidden/)
  assert.equal(traps, 0)
})

test('re-QA RED forged ready plan is rejected before adapter callback', () => {
  const digest = 'a'.repeat(64)
  const sources = { agents: { source_ref: 'AGENTS.md', source_digest: digest }, active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: digest }, current_gate: { source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: digest }, current_handoff: null }
  const available_source_digests = Object.fromEntries(Object.values(sources).filter(Boolean).map((row) => [row.source_ref, row.source_digest]))
  const valid = compileOutcomeSelectiveContextPlan({ environment: {}, work_id: 'bounded-work', work_type: 'builder', role_skill: 'mango-implementation-engineer', sources, available_source_digests, expansion_allowlist: [], expansions: [] })
  const forged = structuredClone(valid)
  forged.loaded_sources[0].source_ref = 'thread-private-marker'
  forged.plan_digest = 'f'.repeat(64)
  let callbacks = 0
  const adapter = createCodexRuntimeAdapter({ selectNext: (value) => value, start: (value) => value, transition: (value) => value, projectPublic: () => ({ authority: 'projection_only' }), selectiveContextCapability: 'content-addressed-plan-v1', consumeContextPlan() { callbacks += 1; return { accepted: true } } })
  assert.throws(() => consumeOutcomeSelectiveContextPlan(adapter, forged), /invalid_context_source_ref/)
  assert.equal(callbacks, 0)
})

test('pre-consume validation rejects hostile direct plans before traps callbacks or receipts', () => {
  const digest = 'a'.repeat(64)
  const sources = { agents: { source_ref: 'AGENTS.md', source_digest: digest }, active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: digest }, current_gate: { source_ref: 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md', source_digest: digest }, current_handoff: null }
  const available_source_digests = Object.fromEntries(Object.values(sources).filter(Boolean).map((row) => [row.source_ref, row.source_digest]))
  const valid = compileOutcomeSelectiveContextPlan({ environment: {}, work_id: 'bounded-work', work_type: 'builder', role_skill: 'mango-implementation-engineer', sources, available_source_digests, expansion_allowlist: [], expansions: [] })
  let callbacks = 0; let traps = 0; let receipts = 0
  const adapter = createCodexRuntimeAdapter({ selectNext: (value) => value, start: (value) => value, transition: (value) => value, projectPublic: () => ({ authority: 'projection_only' }), selectiveContextCapability: 'content-addressed-plan-v1', consumeContextPlan() { callbacks += 1; return { accepted: true } } })
  const privateRef = structuredClone(valid); privateRef.loaded_sources[0].source_ref = 'thread-private-marker'
  const digestMismatch = structuredClone(valid); digestMismatch.loaded_sources[1].source_digest = 'b'.repeat(64)
  const roleMismatch = structuredClone(valid); roleMismatch.work_type = 'planner'
  const missingKey = structuredClone(valid); delete missingKey.safety
  const extraKey = structuredClone(valid); extraKey.caller_authority = 'ready'
  const decoratedRow = structuredClone(valid); Object.defineProperty(decoratedRow.loaded_sources[0], 'hidden', { value: true })
  for (const forged of [privateRef, digestMismatch, roleMismatch, missingKey, extraKey, decoratedRow]) {
    assert.throws(() => { const receipt = consumeOutcomeSelectiveContextPlan(adapter, forged); receipts += receipt ? 1 : 0 }, /invalid_|mismatch/)
  }
  const accessor = structuredClone(valid); Object.defineProperty(accessor.loaded_sources[0], 'source_ref', { enumerable: true, get() { traps += 1; return 'AGENTS.md' } })
  assert.throws(() => consumeOutcomeSelectiveContextPlan(adapter, accessor), /accessor_forbidden/)
  const proxy = new Proxy(structuredClone(valid), { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  assert.throws(() => consumeOutcomeSelectiveContextPlan(adapter, proxy), /proxy_forbidden/)
  assert.equal(callbacks, 0); assert.equal(traps, 0); assert.equal(receipts, 0)
  const receipt = consumeOutcomeSelectiveContextPlan(adapter, valid)
  assert.equal(callbacks, 1); assert.equal(receipt.outcome, 'locally_consumed'); assert.doesNotMatch(JSON.stringify(receipt), /source_ref|AGENTS\.md|mango-implementation-engineer/)
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

test('D1 rejects every accepted Proxy before any trap or adapter callback executes', () => {
  let traps = 0; let callbacks = 0
  const proxied = (value) => new Proxy(value, { get() { traps += 1; return undefined }, ownKeys() { traps += 1; return [] }, getOwnPropertyDescriptor() { traps += 1; return undefined }, getPrototypeOf() { traps += 1; return null } })
  const variants = []
  for (const key of ['project', 'destinations', 'milestones', 'acceptance_predicates', 'evidence_claims']) variants.push({ ...graph(), [key]: proxied(graph()[key]) })
  variants.push({ ...graph(), destinations: [proxied(graph().destinations[0])] }, { ...graph(), milestones: [proxied(graph().milestones[0])] }, { ...graph(), acceptance_predicates: [proxied(graph().acceptance_predicates[0])] }, { ...graph(), evidence_claims: [proxied({ id: 'claim-one', predicate_id: 'predicate-one', source_ref: 'source', producer: 'builder', freshness: 'source-pinned', reproducible: true })] })
  for (const value of [proxied(graph()), ...variants]) assert.throws(() => validateOutcomeGraph(value), /proxy_forbidden/)
  const projectionBase = { graph: graph(), source_revision: source, observed_at: '2026-08-31T00:00:00.000Z' }
  const work = { id: 'work-one', milestone_id: 'milestone-one', fingerprint: 'same', acceptance_gap_delta: 1, uncertainty_delta: 0, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
  const attempt = { id: 'attempt-one', work_id: 'work-one', fingerprint: 'same', state: 'delivery_unknown', automatic_retry_count: 0 }
  const lease = { work_id: 'work-one', key: 'builder', expires_at: '2026-09-01T00:00:00.000Z' }
  const history = { candidate_identity: 'candidate-one', semantic_delta: true, verified: false }
  assert.throws(() => projectOutcomeV2(proxied(projectionBase)), /proxy_forbidden/)
  for (const overrides of [{ work_items: [proxied(work)] }, { attempts: [proxied(attempt)] }, { leases: [proxied(lease)] }, { mission_envelope: proxied({ expires_at: '2026-09-01T00:00:00.000Z' }) }, { verification_history: [proxied(history)] }]) assert.throws(() => projectOutcomeV2({ ...projectionBase, ...overrides }), /proxy_forbidden/)
  const adapter = createCodexRuntimeAdapter({ selectNext() { callbacks += 1 }, start() { callbacks += 1 }, transition() { callbacks += 1 }, projectPublic() { callbacks += 1 } })
  for (const invoke of [() => adapter.select(proxied([])), () => adapter.select([{ command: proxied({}) }]), () => adapter.startValidated(proxied({})), () => adapter.recordObserved(proxied({})), () => adapter.recordEvidenceEvaluation(proxied({}))]) assert.throws(invoke, /proxy_forbidden/)
  assert.equal(traps, 0); assert.equal(callbacks, 0)
})

test('S1 explicit immutable compile snapshot separates cold validation from hot start', () => {
  const candidate = { source_tree: source, dependency_lock: 'b'.repeat(40), config_class: 'default-off', predicate_ids: ['predicate-one'] }
  const snapshot = compileOutcomeV2Snapshot({ v1_package: v1(), source_revision: source, observed_at: '2026-08-31T00:00:00.000Z', candidate })
  assert.equal(Object.isFrozen(snapshot), true); assert.equal(Object.isFrozen(snapshot.graph), true); assert.equal(snapshot.candidate_identity, coherentCandidateIdentity(candidate))
  const item = { id: 'work-one', milestone_id: 'milestone-one', fingerprint: 'same', acceptance_gap_delta: 1, uncertainty_delta: 0, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
  const input = { expected_source_revision: source, candidate_identity: snapshot.candidate_identity, observed_at: '2026-08-31T00:00:00.000Z', authority_state: 'active', work_items: [item], attempts: [], leases: [], mission_envelope: null }
  assert.deepEqual(startOutcomeV2FromSnapshot(snapshot, input), { outcome: 'started', state: 'start_validated', work_id: 'work-one', fingerprint: 'same', automatic_retry_count: 0 })
  assert.equal(startOutcomeV2FromSnapshot(snapshot, { ...input, expected_source_revision: 'c'.repeat(40) }).reason, 'source_revision_drift')
  assert.equal(startOutcomeV2FromSnapshot(snapshot, { ...input, candidate_identity: 'd'.repeat(64) }).reason, 'candidate_identity_drift')
  assert.equal(startOutcomeV2FromSnapshot(snapshot, { ...input, attempts: [{ id: 'attempt-one', work_id: 'work-one', fingerprint: 'same', state: 'delivery_unknown', automatic_retry_count: 0 }] }).cherry_action, 'resolve_delivery_unknown')
  assert.throws(() => startOutcomeV2FromSnapshot(snapshot, { ...input, attempts: [{ id: 'attempt-one', work_id: 'work-one', fingerprint: 'same', state: 'delivery_unknown', automatic_retry_count: 1 }] }), /automatic_retry_forbidden/)
})

test('S1 compile and hot start reject Proxy inputs before traps', () => {
  let traps = 0; const proxy = new Proxy(v1(), { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  assert.throws(() => compileOutcomeV2Snapshot({ v1_package: proxy, source_revision: source, observed_at: '2026-08-31T00:00:00.000Z', candidate: { source_tree: source, dependency_lock: 'b'.repeat(40), config_class: 'default-off', predicate_ids: ['predicate-one'] } }), /proxy_forbidden/)
  assert.equal(traps, 0)
})
