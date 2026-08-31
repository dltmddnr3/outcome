import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { projectOutcomeV2, validateOutcomeGraph } from '../server/outcome-model-v2.mjs'
import { compileCurrentGateFrontier, compileOutcomeContextBootstrap, selectOutcomeBootstrapContext, validateOutcomeContextBootstrap, validateOutcomeSourceManifest } from '../server/outcome-context-bootstrap.mjs'

const sourceRevision = 'c8728dcacf36c93ad0933e5de95b8c917074ee26'
const sources = {
  agents: 'AGENTS.md',
  contract: 'docs/OUTCOME_CONTRACT.md',
  map: 'docs/OUTCOME_MAP.md',
  'slice-contract': 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md',
  gate: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md',
  handoff: 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_SELECTOR_BOUNDARY_CORRECTION_BUILDER_HANDOFF.md',
  'qa-receipt': 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_FRESH_QA_RECEIPT.md',
  'latest-qa-receipt': 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_MANIFEST_RECOMPILE_FRESH_REQA_RECEIPT.md',
}
const pinnedDigests = Object.freeze({
  agents: 'cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93',
  contract: '36860ad7e0103170c6f1be3eaa25a221b873ccf1b46b668f0d684c385412851f',
  gate: '098c48bef05b2219b68acd2c308309b04bd91ca82a1eeb7ba80552a7caca7b0d',
  handoff: 'c75e51e812eddefa1cebceef30a8a7098ef0e95e2fb3a0b8dc8eab1c879f0d62',
  'latest-qa-receipt': '50918294d3756a2b9482991c2036f4de5da8e358f3db82c48e794eebefce7256',
  map: '10bfe76927a044f87612666b1976ff34b145bd8f5b471dff676f32716396bc94',
  'qa-receipt': 'bbc13889eb1c0af9a51d545d2daae7bf1b2c1d5a935e01eee3f347775388f9f5',
  'slice-contract': 'b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657',
})
const sourceBytes = Object.fromEntries(Object.entries(sources).map(([key, path]) => [key, readFileSync(path)]))
const actualDigests = Object.fromEntries(Object.entries(sourceBytes).map(([key, bytes]) => [key, createHash('sha256').update(bytes).digest('hex')]))
const manifestValidation = validateOutcomeSourceManifest(actualDigests, pinnedDigests)
if (manifestValidation.outcome !== 'ready') {
  process.stdout.write(`${JSON.stringify({ schema_version: 1, outcome: manifestValidation.outcome, reason: manifestValidation.reason, automatic_retry_count: 0, safety: { registry_provider_environment_mutation_count: 0, false_completion_count: 0 } }, null, 2)}\n`)
  process.exitCode = 2
} else {
  const frontier = compileCurrentGateFrontier(sourceBytes.gate.toString('utf8'), sourceBytes['latest-qa-receipt'].toString('utf8'))
  const milestoneId = (id) => `outcome-milestone-${id.toLowerCase()}`
  const predicateId = (id) => `predicate-${id.toLowerCase()}`
  const graph = validateOutcomeGraph({
    schema_version: 2,
    project: { id: 'outcome', name: 'OUTCOME', terminal_outcome: 'Model v2 local default and service projection' },
    destinations: [{ id: 'destination-model-v2-service', project_id: 'outcome', title: 'Model v2 service', outcome: 'Outcome projection is the local default', depends_on: [], primary: true }],
    milestones: frontier.map((row) => ({ id: milestoneId(row.id), destination_id: 'destination-model-v2-service', title: row.id, expected_user_delta: row.title, depends_on: row.depends_on.map(milestoneId), predicate_ids: [predicateId(row.id)] })),
    acceptance_predicates: frontier.map((row) => ({ id: predicateId(row.id), milestone_id: milestoneId(row.id), description: row.title, check: null, expect: 'evidence_closed', authority: row.authority })),
    evidence_claims: frontier.filter((row) => row.closed).map((row) => ({ id: `claim-${row.id.toLowerCase()}`, predicate_id: predicateId(row.id), source_ref: sources.gate, producer: row.authority, freshness: 'source-pinned', reproducible: true })),
  })
  const work = { id: 'work-q1-independent-qa', milestone_id: milestoneId('Q1'), fingerprint: actualDigests.gate, acceptance_gap_delta: 1, uncertainty_delta: 1, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
  const projection = projectOutcomeV2({ graph, source_revision: sourceRevision, expected_source_revision: sourceRevision, observed_at: '2026-08-31T00:00:00.000Z', work_items: [work] })
  const snapshot = compileOutcomeContextBootstrap({
    source_digests: actualDigests,
    destination_version: 'model-v2-local-default-v1',
    projection: { primary_destination: projection.primary_destination, progress: projection.progress, ready_frontier: projection.ready_frontier, next_action: projection.next_action, cherry_action: projection.cherry_action },
    active_work: { work_id: 'work-slice-a-qa-correction', state: 'candidate-evidence-ready' },
    current_gate_ref: sources.gate,
    current_handoff_ref: sources.handoff,
  })
  const validation = validateOutcomeContextBootstrap(snapshot, pinnedDigests)
  if (validation.outcome !== 'ready') throw new Error('cold_compile_required')
  const context = selectOutcomeBootstrapContext(snapshot, { role_skill: 'mango-implementation-engineer', expansions: [
    { source_ref: sources.contract, reason: 'cold-compile-source-verification', source_digest: actualDigests.contract, work_id: work.id },
    { source_ref: sources.map, reason: 'cold-compile-source-verification', source_digest: actualDigests.map, work_id: work.id },
    { source_ref: sources['slice-contract'], reason: 'cold-compile-source-verification', source_digest: actualDigests['slice-contract'], work_id: work.id },
    { source_ref: sources['qa-receipt'], reason: 'predicate-evidence-required', source_digest: actualDigests['qa-receipt'], work_id: work.id },
    { source_ref: sources['latest-qa-receipt'], reason: 'predicate-evidence-required', source_digest: actualDigests['latest-qa-receipt'], work_id: work.id },
  ] })
  const result = {
    schema_version: 1,
    source_revision: sourceRevision,
    source_manifest_digest: createHash('sha256').update(JSON.stringify(pinnedDigests)).digest('hex'),
    manifest_sources: Object.values(sources),
    snapshot_digest: snapshot.snapshot_digest,
    loaded_sources: context.loaded_sources,
    excluded_source_classes: context.excluded_source_classes,
    expansion_count: context.expansion_count,
    expansion_reasons: context.expansion_reasons,
    gate_model: { predicate_count: frontier.length, closed_count: frontier.filter((row) => row.closed).length, ready_predicate: 'Q1', locked_predicates: frontier.filter((row) => ['B1', 'B2', 'B3', 'Q2', 'A5', 'C1'].includes(row.id)).map((row) => row.id) },
    projection: { primary_destination: snapshot.primary_destination, acceptance_gap: snapshot.acceptance_gap, ready_frontier: snapshot.ready_frontier, active_work: snapshot.active_work, next_action: snapshot.next_action, cherry_action: snapshot.cherry_action },
    outcome: snapshot.next_action ? 'next_action_selected' : 'no_eligible_action',
    safety: { duplicate_execution_count: projection.blockers.duplicate_fingerprints, automatic_retry_count: projection.automatic_retry_count, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 },
  }
  const serialized = JSON.stringify(result)
  if (/\/Users\/|\.outcome-runtime|docs\/ROADMAP 2\.md|(?:thread|session|task|turn)[_-]?id/i.test(serialized)) throw new Error('public_output_invalid')
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}
