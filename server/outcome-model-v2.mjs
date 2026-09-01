import { createHash } from 'node:crypto'
import { isProxy } from 'node:util/types'

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/
const PLAIN = Object.getPrototypeOf({})
const ownRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === PLAIN && Object.values(Object.getOwnPropertyDescriptors(value)).every((descriptor) => Object.hasOwn(descriptor, 'value'))
const array = (value, code) => { if (!Array.isArray(value) || Object.keys(value).length !== value.length || Object.values(Object.getOwnPropertyDescriptors(value)).some((descriptor) => !Object.hasOwn(descriptor, 'value'))) throw new Error(code); return value }
const record = (value, code) => { if (!ownRecord(value)) throw new Error(code); return value }
const id = (value, code = 'invalid_id') => { if (typeof value !== 'string' || !ID.test(value)) throw new Error(code); return value }
const text = (value, code) => { if (typeof value !== 'string' || !value.trim()) throw new Error(code); return value.trim() }
const exactKeys = (value, required, optional = []) => {
  const keys = Object.keys(record(value, 'invalid_shape'))
  if (required.some((key) => !Object.hasOwn(value, key)) || keys.some((key) => !required.includes(key) && !optional.includes(key))) throw new Error('invalid_shape')
  return value
}
const unique = (rows, key, code) => { if (new Set(rows.map((row) => row[key])).size !== rows.length) throw new Error(code) }
const frozen = (value) => Object.freeze(value)
const rejectProxyTree = (value, seen = new WeakSet()) => {
  if (value === null || typeof value !== 'object') return value
  if (isProxy(value)) throw new Error('proxy_forbidden')
  if (seen.has(value)) return value
  seen.add(value)
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!Object.hasOwn(descriptor, 'value')) throw new Error('accessor_forbidden')
    rejectProxyTree(descriptor.value, seen)
  }
  return value
}
const acyclic = (rows, code) => {
  const dependencies = new Map(rows.map((row) => [row.id, row.depends_on])); const visiting = new Set(); const visited = new Set()
  const visit = (key) => { if (visiting.has(key)) throw new Error(code); if (visited.has(key)) return; visiting.add(key); for (const dependency of dependencies.get(key) ?? []) visit(dependency); visiting.delete(key); visited.add(key) }
  for (const row of rows) visit(row.id)
}

export function validateOutcomeGraph(value) {
  rejectProxyTree(value)
  exactKeys(value, ['schema_version', 'project', 'destinations', 'milestones', 'acceptance_predicates', 'evidence_claims'])
  if (value.schema_version !== 2) throw new Error('invalid_schema_version')
  exactKeys(value.project, ['id', 'name', 'terminal_outcome'])
  const project = frozen({ id: id(value.project.id), name: text(value.project.name, 'invalid_project'), terminal_outcome: text(value.project.terminal_outcome, 'invalid_project') })
  const destinations = array(value.destinations, 'invalid_destinations').map((row) => {
    exactKeys(row, ['id', 'project_id', 'title', 'outcome', 'depends_on'], ['primary'])
    return frozen({ id: id(row.id), project_id: id(row.project_id), title: text(row.title, 'invalid_destination'), outcome: text(row.outcome, 'invalid_destination'), depends_on: frozen(array(row.depends_on, 'invalid_dependencies').map((item) => id(item))), primary: row.primary === true })
  })
  const milestones = array(value.milestones, 'invalid_milestones').map((row) => {
    exactKeys(row, ['id', 'destination_id', 'title', 'expected_user_delta', 'depends_on', 'predicate_ids'])
    return frozen({ id: id(row.id), destination_id: id(row.destination_id), title: text(row.title, 'invalid_milestone'), expected_user_delta: text(row.expected_user_delta, 'invalid_milestone'), depends_on: frozen(array(row.depends_on, 'invalid_dependencies').map((item) => id(item))), predicate_ids: frozen(array(row.predicate_ids, 'invalid_predicates').map((item) => id(item))) })
  })
  const acceptancePredicates = array(value.acceptance_predicates, 'invalid_predicates').map((row) => {
    exactKeys(row, ['id', 'milestone_id', 'description', 'check', 'expect', 'authority'])
    return frozen({ id: id(row.id), milestone_id: id(row.milestone_id), description: text(row.description, 'invalid_predicate'), check: row.check === null ? null : text(row.check, 'invalid_predicate'), expect: text(row.expect, 'invalid_predicate'), authority: id(row.authority) })
  })
  const evidenceClaims = array(value.evidence_claims, 'invalid_evidence').map((row) => {
    exactKeys(row, ['id', 'predicate_id', 'source_ref', 'producer', 'freshness', 'reproducible'])
    return frozen({ id: id(row.id), predicate_id: id(row.predicate_id), source_ref: text(row.source_ref, 'invalid_evidence'), producer: id(row.producer), freshness: id(row.freshness), reproducible: row.reproducible === true })
  })
  for (const rows of [[destinations, 'id', 'duplicate_destination'], [milestones, 'id', 'duplicate_milestone'], [acceptancePredicates, 'id', 'duplicate_predicate'], [evidenceClaims, 'id', 'duplicate_evidence']]) unique(...rows)
  const destinationIds = new Set(destinations.map((row) => row.id)); const milestoneIds = new Set(milestones.map((row) => row.id)); const predicateIds = new Set(acceptancePredicates.map((row) => row.id))
  if (destinations.some((row) => row.project_id !== project.id || row.depends_on.some((dependency) => !destinationIds.has(dependency) || dependency === row.id))) throw new Error('destination_reference_conflict')
  if (milestones.some((row) => !destinationIds.has(row.destination_id) || row.depends_on.some((dependency) => !milestoneIds.has(dependency) || dependency === row.id) || row.predicate_ids.some((predicate) => !predicateIds.has(predicate) || acceptancePredicates.find((candidate) => candidate.id === predicate)?.milestone_id !== row.id))) throw new Error('milestone_reference_conflict')
  if (acceptancePredicates.some((row) => !milestoneIds.has(row.milestone_id)) || evidenceClaims.some((row) => !predicateIds.has(row.predicate_id))) throw new Error('predicate_reference_conflict')
  if (destinations.filter((row) => row.primary).length > 1) throw new Error('primary_destination_conflict')
  acyclic(destinations, 'destination_cycle'); acyclic(milestones, 'milestone_cycle')
  return frozen({ schema_version: 2, project, destinations: frozen(destinations), milestones: frozen(milestones), acceptance_predicates: frozen(acceptancePredicates), evidence_claims: frozen(evidenceClaims) })
}

const stable = (value, fallback) => ID.test(String(value ?? '')) ? value : fallback
export function translateV1Package(value) {
  rejectProxyTree(value)
  record(value, 'invalid_v1_package')
  const projectId = id(value.project?.id, 'invalid_v1_project')
  const phases = array(value.phases ?? [], 'invalid_v1_phases')
  const destinations = []; const milestones = []; const predicates = []; const evidence = []
  for (const [phaseIndex, phase] of phases.entries()) {
    record(phase, 'invalid_v1_phase')
    const destinationId = stable(phase.id, `${projectId}-destination-${phaseIndex + 1}`)
    destinations.push({ id: destinationId, project_id: projectId, title: String(phase.title ?? destinationId), outcome: String(phase.purpose ?? phase.title ?? destinationId), depends_on: [], primary: value.current?.phaseId === phase.id })
    for (const scope of array(phase.scopes ?? [], 'invalid_v1_scopes')) for (const stage of array(scope.stages ?? [], 'invalid_v1_stages')) {
      record(stage, 'invalid_v1_stage')
      const milestoneId = id(stage.id, 'invalid_v1_stage')
      const stagePredicates = array(stage.gate?.gates ?? [], 'invalid_v1_gates').map((gate, gateIndex) => {
        record(gate, 'invalid_v1_gate')
        const predicateId = stable(`${milestoneId}-${String(gate.id ?? gateIndex + 1).toLowerCase()}`, `${milestoneId}-predicate-${gateIndex + 1}`)
        predicates.push({ id: predicateId, milestone_id: milestoneId, description: String(gate.title ?? predicateId), check: null, expect: gate.closed === true ? 'evidence_closed' : 'pending', authority: 'predicate-policy' })
        if (gate.closed === true && gate.evidence && !/^pending\b/i.test(gate.evidence)) evidence.push({ id: `${predicateId}-claim`, predicate_id: predicateId, source_ref: String(stage.gate.sourceRef ?? 'v1-gate-ledger'), producer: 'v1-translator', freshness: 'source-pinned', reproducible: true })
        return predicateId
      })
      milestones.push({ id: milestoneId, destination_id: destinationId, title: String(stage.title ?? milestoneId), expected_user_delta: String(stage.purpose ?? stage.title ?? milestoneId), depends_on: array(stage.dependsOn ?? [], 'invalid_v1_dependencies'), predicate_ids: stagePredicates })
    }
  }
  return validateOutcomeGraph({ schema_version: 2, project: { id: projectId, name: String(value.project.name ?? projectId), terminal_outcome: String(value.project.outcome ?? value.project.name ?? projectId) }, destinations, milestones, acceptance_predicates: predicates, evidence_claims: evidence })
}

export function coherentCandidateIdentity(value) {
  rejectProxyTree(value)
  exactKeys(value, ['source_tree', 'dependency_lock', 'config_class', 'predicate_ids'])
  if (!SHA.test(value.source_tree) || !SHA.test(value.dependency_lock)) throw new Error('invalid_candidate_pin')
  const canonical = JSON.stringify({ source_tree: value.source_tree, dependency_lock: value.dependency_lock, config_class: id(value.config_class), predicate_ids: [...array(value.predicate_ids, 'invalid_predicates').map((item) => id(item))].sort() })
  return createHash('sha256').update(canonical).digest('hex')
}

class CompiledOutcomeV2Snapshot {
  constructor({ graph, projection, sourceRevision, candidateIdentity, observedAt }) {
    this.schema_version = 2; this.graph = graph; this.projection = projection; this.source_revision = sourceRevision; this.candidate_identity = candidateIdentity; this.observed_at = observedAt
    Object.freeze(this)
  }
}

export function compileOutcomeV2Snapshot(value) {
  rejectProxyTree(value)
  exactKeys(value, ['v1_package', 'source_revision', 'observed_at', 'candidate'])
  const graph = translateV1Package(value.v1_package)
  const candidateIdentity = coherentCandidateIdentity(value.candidate)
  const projection = projectOutcomeV2({ graph, source_revision: value.source_revision, observed_at: value.observed_at })
  return new CompiledOutcomeV2Snapshot({ graph, projection, sourceRevision: value.source_revision, candidateIdentity, observedAt: value.observed_at })
}

export function startOutcomeV2FromSnapshot(snapshot, value) {
  if (isProxy(snapshot)) throw new Error('proxy_forbidden')
  rejectProxyTree(value)
  if (!(snapshot instanceof CompiledOutcomeV2Snapshot) || !Object.isFrozen(snapshot)) throw new Error('invalid_compiled_snapshot')
  exactKeys(value, ['expected_source_revision', 'candidate_identity', 'observed_at', 'authority_state', 'work_items', 'attempts', 'leases', 'mission_envelope'])
  if (value.expected_source_revision !== snapshot.source_revision) return frozen({ outcome: 'cold_compile_required', reason: 'source_revision_drift', automatic_retry_count: 0 })
  if (value.candidate_identity !== snapshot.candidate_identity) return frozen({ outcome: 'cold_compile_required', reason: 'candidate_identity_drift', automatic_retry_count: 0 })
  const now = Date.parse(value.observed_at); if (!Number.isFinite(now)) throw new Error('invalid_observed_at')
  if (value.authority_state !== 'active') return frozen({ outcome: 'decision_required', cherry_action: 'renew_mission_envelope', automatic_retry_count: 0 })
  const envelope = value.mission_envelope
  if (envelope !== null && (!ownRecord(envelope) || !Number.isFinite(Date.parse(envelope.expires_at)) || Date.parse(envelope.expires_at) <= now)) return frozen({ outcome: 'decision_required', cherry_action: 'renew_mission_envelope', automatic_retry_count: 0 })
  const attempts = array(value.attempts, 'invalid_attempts')
  for (const attempt of attempts) exactKeys(attempt, ['id', 'work_id', 'fingerprint', 'state', 'automatic_retry_count'])
  if (attempts.some((attempt) => attempt.automatic_retry_count !== 0)) throw new Error('automatic_retry_forbidden')
  if (attempts.some((attempt) => attempt.state === 'delivery_unknown')) return frozen({ outcome: 'decision_required', cherry_action: 'resolve_delivery_unknown', automatic_retry_count: 0 })
  const activeFingerprints = new Set(attempts.filter((attempt) => !['blocked', 'failed', 'transition_committed', 'transition_rejected'].includes(attempt.state)).map((attempt) => attempt.fingerprint))
  const leaseKeys = new Set()
  for (const lease of array(value.leases, 'invalid_leases')) {
    exactKeys(lease, ['work_id', 'key', 'expires_at'])
    if (Date.parse(lease.expires_at) > now) { if (leaseKeys.has(lease.key)) return frozen({ outcome: 'decision_required', cherry_action: 'resolve_blocker', automatic_retry_count: 0 }); leaseKeys.add(lease.key) }
  }
  const ready = new Set(snapshot.projection.ready_frontier); const seen = new Set(); let selected = null; let zeroDeltaCount = 0
  for (const item of array(value.work_items, 'invalid_work_items')) {
    exactKeys(item, ['id', 'milestone_id', 'fingerprint', 'acceptance_gap_delta', 'uncertainty_delta', 'blocker_delta', 'user_value_delta', 'reversible', 'cost'])
    if (seen.has(item.fingerprint)) return frozen({ outcome: 'decision_required', cherry_action: 'resolve_blocker', automatic_retry_count: 0 })
    seen.add(item.fingerprint)
    const hasDelta = [item.acceptance_gap_delta, item.uncertainty_delta, item.blocker_delta, item.user_value_delta].some((delta) => delta > 0)
    if (!hasDelta) { zeroDeltaCount += 1; continue }
    if (!selected && ready.has(item.milestone_id) && !activeFingerprints.has(item.fingerprint)) selected = item
  }
  if (!selected) return frozen({ outcome: 'decision_required', cherry_action: zeroDeltaCount ? 'review_no_outcome_delta' : 'resolve_blocker', automatic_retry_count: 0 })
  return frozen({ outcome: 'started', state: 'start_validated', work_id: selected.id, fingerprint: selected.fingerprint, automatic_retry_count: 0 })
}

export function projectOutcomeV2(value) {
  rejectProxyTree(value)
  const { graph: input, source_revision, expected_source_revision = source_revision, observed_at, work_items = [], attempts = [], mission_envelope = null, leases = [], verification_history = [] } = value
  const graph = validateOutcomeGraph(input)
  if (!SHA.test(source_revision) || !SHA.test(expected_source_revision)) throw new Error('invalid_source_revision')
  const stale = source_revision !== expected_source_revision
  const now = Date.parse(observed_at); if (!Number.isFinite(now)) throw new Error('invalid_observed_at')
  const claimPredicates = new Set(graph.evidence_claims.filter((claim) => claim.reproducible).map((claim) => claim.predicate_id))
  const closedMilestones = new Set(graph.milestones.filter((milestone) => milestone.predicate_ids.length > 0 && milestone.predicate_ids.every((predicate) => claimPredicates.has(predicate))).map((milestone) => milestone.id))
  const ready = graph.milestones.filter((milestone) => !closedMilestones.has(milestone.id) && milestone.depends_on.every((dependency) => closedMilestones.has(dependency)))
  const fingerprints = new Map(); const duplicateFingerprints = new Set()
  for (const item of array(work_items, 'invalid_work_items')) { exactKeys(item, ['id', 'milestone_id', 'fingerprint', 'acceptance_gap_delta', 'uncertainty_delta', 'blocker_delta', 'user_value_delta', 'reversible', 'cost']); id(item.id); id(item.milestone_id); if (fingerprints.has(item.fingerprint)) duplicateFingerprints.add(item.fingerprint); fingerprints.set(item.fingerprint, item.id) }
  const activeAttempts = array(attempts, 'invalid_attempts').filter((attempt) => { exactKeys(attempt, ['id', 'work_id', 'fingerprint', 'state', 'automatic_retry_count']); return !['delivery_unknown', 'blocked', 'failed', 'transition_committed', 'transition_rejected'].includes(attempt.state) })
  const activeLeaseKeys = new Set(); const overlappingLeases = []
  for (const lease of array(leases, 'invalid_leases')) { exactKeys(lease, ['work_id', 'key', 'expires_at']); if (Date.parse(lease.expires_at) > now) { if (activeLeaseKeys.has(lease.key)) overlappingLeases.push(lease.key); activeLeaseKeys.add(lease.key) } }
  const envelopeExpired = mission_envelope !== null && (!ownRecord(mission_envelope) || !Number.isFinite(Date.parse(mission_envelope.expires_at)) || Date.parse(mission_envelope.expires_at) <= now)
  const blocked = new Set()
  const hasOutcomeDelta = (item) => [item.acceptance_gap_delta, item.uncertainty_delta, item.blocker_delta, item.user_value_delta].some((delta) => delta > 0)
  for (const item of work_items) if (!ready.some((milestone) => milestone.id === item.milestone_id) || !hasOutcomeDelta(item) || duplicateFingerprints.has(item.fingerprint) || activeAttempts.some((attempt) => attempt.fingerprint === item.fingerprint) || overlappingLeases.length || envelopeExpired || stale) blocked.add(item.id)
  const eligible = work_items.filter((item) => !blocked.has(item.id)).sort((a, b) => b.acceptance_gap_delta - a.acceptance_gap_delta || b.blocker_delta - a.blocker_delta || b.uncertainty_delta - a.uncertainty_delta || b.user_value_delta - a.user_value_delta || Number(b.reversible) - Number(a.reversible) || a.cost - b.cost || a.id.localeCompare(b.id))
  const primary = graph.destinations.find((destination) => destination.primary) ?? graph.destinations.find((destination) => graph.milestones.some((milestone) => milestone.destination_id === destination.id && ready.includes(milestone))) ?? graph.destinations[0] ?? null
  const terminalUnknown = attempts.filter((attempt) => attempt.state === 'delivery_unknown')
  if (terminalUnknown.some((attempt) => attempt.automatic_retry_count !== 0)) throw new Error('automatic_retry_forbidden')
  const zeroDeltaOnly = work_items.length > 0 && work_items.every((item) => !hasOutcomeDelta(item))
  return frozen({ schema_version: 2, source_revision, observed_at, stale, conflict: stale || duplicateFingerprints.size > 0 || overlappingLeases.length > 0, primary_destination: primary?.id ?? null, ready_frontier: frozen(ready.map((milestone) => milestone.id)), progress: frozen({ closed: claimPredicates.size, total: graph.acceptance_predicates.length }), next_action: eligible[0]?.id ?? null, cherry_action: envelopeExpired ? 'renew_mission_envelope' : stale ? 'resolve_source_revision' : zeroDeltaOnly ? 'review_no_outcome_delta' : eligible.length || ready.length === 0 ? null : 'resolve_blocker', blockers: frozen({ duplicate_fingerprints: duplicateFingerprints.size, overlapping_leases: overlappingLeases.length, envelope_expired: envelopeExpired, stale_source: stale, zero_outcome_delta: work_items.filter((item) => !hasOutcomeDelta(item)).length }), delivery_unknown_count: terminalUnknown.length, automatic_retry_count: 0, verification_required: frozen([...new Set(array(verification_history, 'invalid_verification_history').filter((row) => ownRecord(row) && row.semantic_delta === true && row.verified !== true).map((row) => row.candidate_identity))]) })
}

export function applyOutcomeModelV2Pilot(value, options = {}) {
  rejectProxyTree(value); rejectProxyTree(options)
  const { environment = process.env, source_revision, observed_at = value.observedAt } = options
  const configured = environment.OUTCOME_MODEL_V2_ENABLED
  if (configured === '0') return value
  if (configured !== undefined && configured !== '1') throw new Error('invalid_model_v2_configuration')
  const projects = array(value.projects, 'invalid_package_collection').map((project) => { const graph = translateV1Package(project); return { project_id: project.project.id, graph, projection: projectOutcomeV2({ graph, source_revision, observed_at }) } })
  return { ...value, modelV2: { schemaVersion: 2, authority: 'projection_only', projects } }
}

const SELECTIVE_CONTEXT_ROLES = Object.freeze({
  planner: 'berry-product-partner',
  builder: 'mango-implementation-engineer',
  ux_product_qa: 'lime-independent-qa',
  release_audit: 'lime-release-auditor',
  no_role: null,
})
const SELECTIVE_CONTEXT_COMMON_SKILLS = Object.freeze(['karpathy-guidelines', 'unlazy'])
const SELECTIVE_CONTEXT_SOURCE_KEYS = Object.freeze(['agents', 'active_snapshot', 'current_gate', 'current_handoff'])
const SELECTIVE_CONTEXT_HANDOFF_REFS = new Set(['current-planner-checkpoint', 'current-builder-checkpoint', 'current-ux-product-qa-checkpoint', 'current-release-audit-checkpoint'])
const SELECTIVE_CONTEXT_SKILLS = new Set([...SELECTIVE_CONTEXT_COMMON_SKILLS, ...Object.values(SELECTIVE_CONTEXT_ROLES).filter(Boolean)])
const SELECTIVE_CONTEXT_DOCUMENT_REFS = new Set([
  'docs/OUTCOME_CONTRACT.md',
  'docs/OUTCOME_MAP.md',
  'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md',
  'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_FRESH_QA_RECEIPT.md',
  'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_MANIFEST_RECOMPILE_FRESH_REQA_RECEIPT.md',
])
const selectiveContextHold = (reason) => frozen({
  schema_version: 2,
  authority: 'projection_only',
  outcome: 'safe_hold',
  reason,
  loaded_sources: frozen([]),
  skipped_sources: frozen([]),
  safety: frozen({ execution_started_count: 0, automatic_retry_count: 0, duplicate_execution_count: 0, persistent_setting_mutation_count: 0, registry_provider_environment_mutation_count: 0, unauthorized_canonical_transition_count: 0, false_completion_count: 0 }),
})
const contextSourceClass = (value) => {
  if (value === 'AGENTS.md') return 'project_instructions'
  if (value === 'active-bootstrap-snapshot') return 'active_snapshot'
  if (value === 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md') return 'current_gate'
  if (SELECTIVE_CONTEXT_HANDOFF_REFS.has(value)) return 'current_handoff'
  if (SELECTIVE_CONTEXT_DOCUMENT_REFS.has(value)) return 'approved_document'
  if (value.startsWith('skill:') && SELECTIVE_CONTEXT_SKILLS.has(value.slice(6))) return SELECTIVE_CONTEXT_COMMON_SKILLS.includes(value.slice(6)) ? 'common_skill' : 'role_skill'
  throw new Error('invalid_context_source_ref')
}
const contextRef = (value) => { if (typeof value !== 'string') throw new Error('invalid_context_source_ref'); contextSourceClass(value); return value }
const contextDigest = (value) => { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('invalid_context_source_digest'); return value }
const contextSource = (value) => {
  exactKeys(value, ['source_ref', 'source_digest'])
  return frozen({ source_ref: contextRef(value.source_ref), source_digest: contextDigest(value.source_digest) })
}
const contextReceipt = (plan, outcome) => frozen({
  schema_version: 2,
  authority: 'projection_only',
  outcome,
  plan_digest: plan.plan_digest,
  loaded_sources: frozen(plan.loaded_sources.map((row) => frozen({ source_class: contextSourceClass(row.source_ref), content_addressed: row.source_digest !== null }))),
  skipped_sources: frozen(plan.skipped_sources.map((row) => frozen({ source_class: contextSourceClass(row.source_ref), content_addressed: row.source_digest !== null }))),
  expansion_count: plan.expansion_count,
  safety: plan.safety,
})
const duplicateContextPlanHold = () => frozen({
  schema_version: 2,
  authority: 'projection_only',
  outcome: 'safe_hold',
  reason: 'duplicate_context_plan',
  loaded_sources: frozen([]),
  skipped_sources: frozen([]),
  safety: frozen({ execution_started_count: 0, automatic_retry_count: 0, duplicate_execution_count: 1, persistent_setting_mutation_count: 0, registry_provider_environment_mutation_count: 0, unauthorized_canonical_transition_count: 0, false_completion_count: 0 }),
})
const consumedContextPlanDigests = new WeakMap()
const exactPlanRecord = (value, keys, code = 'invalid_selective_context_plan') => {
  if (!ownRecord(value) || Object.getOwnPropertySymbols(value).length) throw new Error(code)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const actual = Object.getOwnPropertyNames(value).sort(); const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]) || Object.values(descriptors).some((descriptor) => descriptor.enumerable !== true)) throw new Error(code)
  return value
}
const exactPlanArray = (value) => {
  if (!Array.isArray(value) || Object.getOwnPropertySymbols(value).length) throw new Error('invalid_selective_context_plan')
  const descriptors = Object.getOwnPropertyDescriptors(value); const expected = new Set(['length', ...Array.from({ length: value.length }, (_, index) => String(index))])
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !expected.has(key)) || Array.from({ length: value.length }, (_, index) => descriptors[index]).some((descriptor) => !descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true)) throw new Error('invalid_selective_context_plan')
  return value
}
const validatePlanSourceRow = (value) => {
  exactPlanRecord(value, ['source_ref', 'source_digest'])
  const source_ref = contextRef(value.source_ref); const sourceClass = contextSourceClass(source_ref)
  const source_digest = value.source_digest === null && (sourceClass === 'common_skill' || sourceClass === 'role_skill') ? null : contextDigest(value.source_digest)
  return frozen({ source_ref, source_digest })
}
const validateOutcomeSelectiveContextPlan = (plan) => {
  rejectProxyTree(plan)
  exactPlanRecord(plan, ['schema_version', 'authority', 'outcome', 'work_type', 'loaded_sources', 'skipped_sources', 'expansion_count', 'expansion_reasons', 'safety', 'plan_digest'])
  if (plan.schema_version !== 2 || plan.authority !== 'projection_only' || plan.outcome !== 'ready' || !Object.hasOwn(SELECTIVE_CONTEXT_ROLES, plan.work_type)) throw new Error('invalid_selective_context_plan')
  const loaded_sources = frozen(exactPlanArray(plan.loaded_sources).map(validatePlanSourceRow)); const skipped_sources = frozen(exactPlanArray(plan.skipped_sources).map(validatePlanSourceRow))
  unique(loaded_sources, 'source_ref', 'invalid_selective_context_plan'); unique(skipped_sources, 'source_ref', 'invalid_selective_context_plan')
  if (skipped_sources.some((row) => contextSourceClass(row.source_ref) !== 'approved_document' || loaded_sources.some((loaded) => loaded.source_ref === row.source_ref))) throw new Error('invalid_selective_context_plan')
  const expectedRoleSkill = SELECTIVE_CONTEXT_ROLES[plan.work_type]; let cursor = 0
  for (const expected of ['AGENTS.md', 'active-bootstrap-snapshot', 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md']) if (loaded_sources[cursor++]?.source_ref !== expected) throw new Error('invalid_selective_context_plan')
  if (loaded_sources[cursor] && contextSourceClass(loaded_sources[cursor].source_ref) === 'current_handoff') cursor += 1
  for (const skill of SELECTIVE_CONTEXT_COMMON_SKILLS) if (loaded_sources[cursor++]?.source_ref !== `skill:${skill}`) throw new Error('invalid_selective_context_plan')
  if (expectedRoleSkill && loaded_sources[cursor++]?.source_ref !== `skill:${expectedRoleSkill}`) throw new Error('invalid_selective_context_plan')
  const expansionRows = loaded_sources.slice(cursor)
  if (expansionRows.some((row) => contextSourceClass(row.source_ref) !== 'approved_document')) throw new Error('invalid_selective_context_plan')
  if (!Number.isSafeInteger(plan.expansion_count) || plan.expansion_count < 0 || plan.expansion_count !== expansionRows.length) throw new Error('invalid_selective_context_plan')
  const expansion_reasons = frozen(exactPlanArray(plan.expansion_reasons).map((reason) => id(reason, 'invalid_selective_context_plan')))
  if (expansion_reasons.length !== plan.expansion_count) throw new Error('invalid_selective_context_plan')
  exactPlanRecord(plan.safety, ['execution_started_count', 'automatic_retry_count', 'duplicate_execution_count', 'persistent_setting_mutation_count', 'registry_provider_environment_mutation_count', 'unauthorized_canonical_transition_count', 'false_completion_count'])
  if (Object.values(plan.safety).some((value) => value !== 0)) throw new Error('invalid_selective_context_plan')
  const safety = frozen({ ...plan.safety })
  const content = { schema_version: 2, authority: 'projection_only', outcome: 'ready', work_type: plan.work_type, loaded_sources, skipped_sources, expansion_count: plan.expansion_count, expansion_reasons, safety }
  const plan_digest = createHash('sha256').update(JSON.stringify(content)).digest('hex')
  if (plan.plan_digest !== plan_digest) throw new Error('selective_context_plan_digest_mismatch')
  return frozen({ ...content, plan_digest })
}

export function compileOutcomeSelectiveContextPlan(value) {
  rejectProxyTree(value)
  exactKeys(value, ['environment', 'work_id', 'work_type', 'role_skill', 'sources', 'available_source_digests', 'expansion_allowlist', 'expansions'])
  record(value.environment, 'invalid_context_environment')
  const configured = value.environment.OUTCOME_MODEL_V2_ENABLED
  if (configured === '0') return frozen({ schema_version: 1, outcome: 'v1_rollback', original_value_required: true })
  if (configured !== undefined && configured !== '1') return selectiveContextHold('invalid_model_v2_configuration')
  const expectedRoleSkill = SELECTIVE_CONTEXT_ROLES[value.work_type]
  if (!Object.hasOwn(SELECTIVE_CONTEXT_ROLES, value.work_type)) return selectiveContextHold('unknown_work_type')
  if (value.role_skill !== expectedRoleSkill) return selectiveContextHold('wrong_role_skill')
  id(value.work_id, 'invalid_work_id')
  exactKeys(value.sources, SELECTIVE_CONTEXT_SOURCE_KEYS)
  const sourceRows = {}
  for (const key of SELECTIVE_CONTEXT_SOURCE_KEYS) {
    const row = value.sources[key]
    if (key === 'current_handoff' && row === null) { sourceRows[key] = null; continue }
    try { sourceRows[key] = contextSource(row) } catch (error) {
      if (error.message === 'invalid_shape' || error.message === 'invalid_context_source_digest') return selectiveContextHold('source_input_missing')
      throw error
    }
  }
  if (sourceRows.agents.source_ref !== 'AGENTS.md' || sourceRows.active_snapshot.source_ref !== 'active-bootstrap-snapshot' || !/^GATES_[A-Z0-9_]+\.md$/.test(sourceRows.current_gate.source_ref)) return selectiveContextHold('unrelated_source_forbidden')
  record(value.available_source_digests, 'invalid_available_source_digests')
  for (const row of Object.values(sourceRows).filter(Boolean)) if (value.available_source_digests[row.source_ref] !== row.source_digest) return selectiveContextHold('source_digest_drift')
  const allowlistRows = array(value.expansion_allowlist, 'invalid_expansion_allowlist').map(contextSource)
  unique(allowlistRows, 'source_ref', 'duplicate_expansion')
  const allowlist = new Map(allowlistRows.map((row) => [row.source_ref, row.source_digest]))
  const expansions = array(value.expansions, 'invalid_expansions').map((row) => {
    exactKeys(row, ['source_ref', 'source_digest', 'reason', 'work_id'])
    const source_ref = contextRef(row.source_ref); const source_digest = contextDigest(row.source_digest)
    if (row.work_id !== value.work_id || !ID.test(row.reason)) throw new Error('invalid_expansion_contract')
    if (allowlist.get(source_ref) !== source_digest || value.available_source_digests[source_ref] !== source_digest) throw new Error('unrelated_expansion_forbidden')
    return frozen({ source_ref, source_digest, reason: row.reason })
  })
  unique(expansions, 'source_ref', 'duplicate_expansion')
  const loaded = [sourceRows.agents, sourceRows.active_snapshot, sourceRows.current_gate, sourceRows.current_handoff, ...SELECTIVE_CONTEXT_COMMON_SKILLS.map((skill) => ({ source_ref: `skill:${skill}`, source_digest: null })), ...(expectedRoleSkill ? [{ source_ref: `skill:${expectedRoleSkill}`, source_digest: null }] : []), ...expansions.map(({ source_ref, source_digest }) => ({ source_ref, source_digest }))].filter(Boolean).map(frozen)
  const skipped = allowlistRows.filter((row) => !expansions.some((candidate) => candidate.source_ref === row.source_ref))
  const content = { schema_version: 2, authority: 'projection_only', outcome: 'ready', work_type: value.work_type, loaded_sources: frozen(loaded), skipped_sources: frozen(skipped), expansion_count: expansions.length, expansion_reasons: frozen(expansions.map(({ reason }) => reason)), safety: selectiveContextHold('unused').safety }
  return frozen({ ...content, plan_digest: createHash('sha256').update(JSON.stringify(content)).digest('hex') })
}

export function consumeOutcomeSelectiveContextPlan(adapter, plan) {
  rejectProxyTree(adapter); rejectProxyTree(plan)
  const validatedPlan = validateOutcomeSelectiveContextPlan(plan)
  if (!adapter || adapter.selectiveContextCapability !== 'content-addressed-plan-v1' || typeof adapter.consumeContextPlan !== 'function') return selectiveContextHold('unsupported_adapter_capability')
  let consumedDigests = consumedContextPlanDigests.get(adapter)
  if (!consumedDigests) { consumedDigests = new Set(); consumedContextPlanDigests.set(adapter, consumedDigests) }
  if (consumedDigests.has(validatedPlan.plan_digest)) return duplicateContextPlanHold()
  const result = adapter.consumeContextPlan(validatedPlan)
  if (!ownRecord(result) || Object.keys(result).length !== 1 || result.accepted !== true) return selectiveContextHold('adapter_context_rejected')
  consumedDigests.add(validatedPlan.plan_digest)
  return contextReceipt(validatedPlan, 'locally_consumed')
}

export function createCodexRuntimeAdapter(controlPlane) {
  if (isProxy(controlPlane)) throw new Error('proxy_forbidden')
  if (!controlPlane || typeof controlPlane.selectNext !== 'function' || typeof controlPlane.start !== 'function' || typeof controlPlane.transition !== 'function' || typeof controlPlane.projectPublic !== 'function') throw new Error('invalid_control_plane')
  const guarded = (callback, value) => { rejectProxyTree(value); return callback(value) }
  const supportsSelectiveContext = controlPlane.selectiveContextCapability === 'content-addressed-plan-v1' && typeof controlPlane.consumeContextPlan === 'function'
  return frozen({ select: (work) => guarded(controlPlane.selectNext.bind(controlPlane), work), startValidated: (command) => guarded(controlPlane.start.bind(controlPlane), command), recordObserved: (event) => guarded(controlPlane.transition.bind(controlPlane), event), recordEvidenceEvaluation: (event) => guarded(controlPlane.transition.bind(controlPlane), event), projectRuntime: () => controlPlane.projectPublic(), selectiveContextCapability: supportsSelectiveContext ? controlPlane.selectiveContextCapability : null, consumeContextPlan: supportsSelectiveContext ? (plan) => guarded(controlPlane.consumeContextPlan.bind(controlPlane), plan) : null, canCommitCanonicalTransition: false })
}
