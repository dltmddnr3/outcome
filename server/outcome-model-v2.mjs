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
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if (Object.hasOwn(descriptor, 'value')) rejectProxyTree(descriptor.value, seen)
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
  if (environment.OUTCOME_MODEL_V2_ENABLED !== '1') return value
  const projects = array(value.projects, 'invalid_package_collection').map((project) => ({ project_id: project.project.id, graph: translateV1Package(project), projection: projectOutcomeV2({ graph: translateV1Package(project), source_revision, observed_at }) }))
  return { ...value, modelV2: { schemaVersion: 2, authority: 'projection_only', projects } }
}

export function createCodexRuntimeAdapter(controlPlane) {
  if (isProxy(controlPlane)) throw new Error('proxy_forbidden')
  if (!controlPlane || typeof controlPlane.selectNext !== 'function' || typeof controlPlane.start !== 'function' || typeof controlPlane.transition !== 'function' || typeof controlPlane.projectPublic !== 'function') throw new Error('invalid_control_plane')
  const guarded = (callback, value) => { rejectProxyTree(value); return callback(value) }
  return frozen({ select: (work) => guarded(controlPlane.selectNext.bind(controlPlane), work), startValidated: (command) => guarded(controlPlane.start.bind(controlPlane), command), recordObserved: (event) => guarded(controlPlane.transition.bind(controlPlane), event), recordEvidenceEvaluation: (event) => guarded(controlPlane.transition.bind(controlPlane), event), projectRuntime: () => controlPlane.projectPublic(), canCommitCanonicalTransition: false })
}
