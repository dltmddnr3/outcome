import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { projectOutcomeV2, validateOutcomeGraph } from '../server/outcome-model-v2.mjs'
import { compileOutcomeContextBootstrap, selectOutcomeBootstrapContext, validateOutcomeContextBootstrap } from '../server/outcome-context-bootstrap.mjs'

const sourceRevision = 'ca1229488dd4311c6beeddcc846eb3b326580664'
const sources = {
  agents: 'AGENTS.md',
  contract: 'docs/OUTCOME_CONTRACT.md',
  map: 'docs/OUTCOME_MAP.md',
  slice_contract: 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md',
  gate: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md',
  handoff: 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_BUILDER_HANDOFF.md',
}
const digests = Object.fromEntries(Object.entries(sources).map(([key, path]) => [key.replace('_', '-'), createHash('sha256').update(readFileSync(path)).digest('hex')]))
const gateText = readFileSync(sources.gate, 'utf8')
const gateState = Object.fromEntries([...gateText.matchAll(/^- \[([ x])\] (A[1-4]):\s*(.+)$/gm)].map((match) => [match[2], { closed: match[1] === 'x', title: match[3] }]))
if (Object.keys(gateState).length !== 4) throw new Error('current_gate_shape_invalid')
const predicateIds = Object.keys(gateState).map((id) => `predicate-${id.toLowerCase()}`)
const graph = validateOutcomeGraph({
  schema_version: 2,
  project: { id: 'outcome', name: 'OUTCOME', terminal_outcome: 'Model v2 local default and service projection' },
  destinations: [{ id: 'destination-model-v2-service', project_id: 'outcome', title: 'Model v2 service', outcome: 'Outcome projection is the local default', depends_on: [], primary: true }],
  milestones: [{ id: 'outcome-milestone-model-v2-local-default-projection', destination_id: 'destination-model-v2-service', title: 'Slice A', expected_user_delta: 'Selective context and local default', depends_on: [], predicate_ids: predicateIds }],
  acceptance_predicates: Object.entries(gateState).map(([id, gate]) => ({ id: `predicate-${id.toLowerCase()}`, milestone_id: 'outcome-milestone-model-v2-local-default-projection', description: gate.title, check: null, expect: 'evidence_closed', authority: 'predicate-policy' })),
  evidence_claims: Object.entries(gateState).filter(([, gate]) => gate.closed).map(([id]) => ({ id: `claim-${id.toLowerCase()}`, predicate_id: `predicate-${id.toLowerCase()}`, source_ref: sources.gate, producer: 'builder', freshness: 'source-pinned', reproducible: true })),
})
const work = { id: 'work-slice-a-local-default-canary', milestone_id: 'outcome-milestone-model-v2-local-default-projection', fingerprint: digests.gate, acceptance_gap_delta: 4 - graph.evidence_claims.length, uncertainty_delta: 0, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
const projection = projectOutcomeV2({ graph, source_revision: sourceRevision, observed_at: '2026-08-31T00:00:00.000Z', work_items: [work] })
const snapshot = compileOutcomeContextBootstrap({
  source_digests: digests,
  destination_version: 'model-v2-local-default-v1',
  projection: { primary_destination: projection.primary_destination, progress: projection.progress, ready_frontier: projection.ready_frontier, next_action: projection.next_action, cherry_action: projection.cherry_action },
  active_work: { work_id: work.id, state: 'execution-started' },
  current_gate_ref: sources.gate,
  current_handoff_ref: sources.handoff,
})
const validation = validateOutcomeContextBootstrap(snapshot, digests)
if (validation.outcome !== 'ready') throw new Error('cold_compile_required')
const context = selectOutcomeBootstrapContext(snapshot, { role_skill: 'mango-implementation-engineer', expansions: [
  { source_ref: sources.contract, reason: 'cold-compile-source-verification', source_digest: digests.contract, work_id: work.id },
  { source_ref: sources.map, reason: 'cold-compile-source-verification', source_digest: digests.map, work_id: work.id },
  { source_ref: sources.slice_contract, reason: 'cold-compile-source-verification', source_digest: digests['slice-contract'], work_id: work.id },
] })
const result = {
  schema_version: 1,
  source_revision: sourceRevision,
  snapshot_digest: snapshot.snapshot_digest,
  loaded_sources: context.loaded_sources,
  excluded_source_classes: context.excluded_source_classes,
  expansion_count: context.expansion_count,
  expansion_reasons: context.expansion_reasons,
  projection: { primary_destination: snapshot.primary_destination, acceptance_gap: snapshot.acceptance_gap, ready_frontier: snapshot.ready_frontier, active_work: snapshot.active_work, next_action: snapshot.next_action, cherry_action: snapshot.cherry_action },
  outcome: snapshot.next_action ? 'next_action_selected' : 'no_eligible_action',
  safety: { duplicate_execution_count: projection.blockers.duplicate_fingerprints, automatic_retry_count: projection.automatic_retry_count, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 },
}
const serialized = JSON.stringify(result)
if (/\/Users\/|\.outcome-runtime|docs\/ROADMAP 2\.md|(?:thread|session|task|turn)[_-]?id/i.test(serialized)) throw new Error('public_output_invalid')
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
