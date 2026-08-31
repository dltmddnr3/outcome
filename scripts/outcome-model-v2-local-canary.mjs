import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { projectOutcomeV2, validateOutcomeGraph } from '../server/outcome-model-v2.mjs'
import { validateOutcomeSourceManifest } from '../server/outcome-context-bootstrap.mjs'

const finalProductCandidate = '28db58fd5018dc4094c9cbbf764d0e86e83cbea4'
const sources = Object.freeze({
  agents: 'AGENTS.md', contract: 'docs/OUTCOME_CONTRACT.md', map: 'docs/OUTCOME_MAP.md',
  'slice-contract': 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md', gate: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md',
  'builder-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_PUBLIC_MILESTONE_LABEL_CORRECTION_BUILDER_RECEIPT.md',
  'qa-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_PUBLIC_MILESTONE_LABEL_CORRECTION_FRESH_REQA_RECEIPT.md',
  'promotion-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_EVIDENCE_PROMOTION_RECEIPT.md',
  'failed-audit': 'docs/OUTCOME_MODEL_V2_A5_COHERENT_CANDIDATE_FRESH_RELEASE_AUDIT_RECEIPT.md',
})
const pinnedDigests = Object.freeze({
  agents: 'cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93', contract: 'c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442', map: 'da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3',
  'slice-contract': 'b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657', gate: '659fb65fafce7403a89b126ae91c9ef81aa6ce73a293b9f9244b9dd5a93ad1c5',
  'builder-receipt': '80a01e7597941d21b281da26b711005421831670ff4668ce80d2e6302a90acad', 'qa-receipt': '41f80e48b9475f59fabb636768470f87bf9d49cef22544e8b26f558fa0c0e8a3',
  'promotion-receipt': '75cae693bad35f8a7791941eefbd008605162073ee817fa3c7632d73c8b98dfb', 'failed-audit': '9e77063cfbc09517fa5e8376846902075a449205006ff021eff91765c279ba5b',
})
const gateOrder = Object.freeze(['D1', 'D2', 'A1', 'A2', 'A3', 'A4', 'Q1', 'B1', 'B2', 'B3', 'Q2', 'A5', 'C1'])
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value)
const digest = (value) => createHash('sha256').update(value).digest('hex')
const failClosed = (reason) => { process.stdout.write(`${JSON.stringify({ schema_version: 2, outcome: 'cold_compile_required', reason, automatic_retry_count: 0, safety: { duplicate_execution_count: 0, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 } }, null, 2)}\n`); process.exitCode = 2 }

const args = process.argv.slice(2)
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--source-root' || !args[1])) failClosed('invalid_source_root')
else {
  const sourceRoot = resolve(args[1] ?? '.')
  let sourceBytes
  try { sourceBytes = Object.fromEntries(Object.entries(sources).map(([key, path]) => [key, readFileSync(resolve(sourceRoot, path))])) } catch { failClosed('source_input_missing') }
  if (sourceBytes) {
    const actualDigests = Object.fromEntries(Object.entries(sourceBytes).map(([key, bytes]) => [key, digest(bytes)]))
    const manifestValidation = validateOutcomeSourceManifest(actualDigests, pinnedDigests)
    if (manifestValidation.outcome !== 'ready') failClosed(manifestValidation.reason)
    else {
      const rows = [...sourceBytes.gate.toString('utf8').matchAll(/^- \[([ x])\] (D1|D2|A[1-5]|B[1-3]|Q[1-2]|C1):\s*(.+)$/gm)].map((match) => ({ id: match[2], closed: match[1] === 'x', title: match[3] }))
      if (rows.length !== gateOrder.length || rows.some((row, index) => row.id !== gateOrder[index])) throw new Error('current_gate_shape_invalid')
      const authority = (id) => id.startsWith('Q') ? 'independent-qa' : id === 'A5' ? 'release-audit' : id === 'C1' ? 'cherry' : id.startsWith('D') ? 'planner' : 'builder'
      const milestoneId = (id) => `outcome-milestone-${id.toLowerCase()}`; const predicateId = (id) => `predicate-${id.toLowerCase()}`
      const graph = validateOutcomeGraph({ schema_version: 2, project: { id: 'outcome', name: 'OUTCOME', terminal_outcome: 'Model v2 local default and service projection' }, destinations: [{ id: 'destination-model-v2-service', project_id: 'outcome', title: 'Model v2 service', outcome: 'Outcome projection is the local default', depends_on: [], primary: true }], milestones: rows.map((row, index) => ({ id: milestoneId(row.id), destination_id: 'destination-model-v2-service', title: row.id, expected_user_delta: row.title, depends_on: index === 0 ? [] : [milestoneId(rows[index - 1].id)], predicate_ids: [predicateId(row.id)] })), acceptance_predicates: rows.map((row) => ({ id: predicateId(row.id), milestone_id: milestoneId(row.id), description: row.title, check: null, expect: 'evidence_closed', authority: authority(row.id) })), evidence_claims: rows.filter((row) => row.closed).map((row) => ({ id: `claim-${row.id.toLowerCase()}`, predicate_id: predicateId(row.id), source_ref: sources.gate, producer: authority(row.id), freshness: 'source-pinned', reproducible: true })) })
      const sourceManifestDigest = digest(stable(pinnedDigests)); const candidateIdentity = digest(stable({ final_product_candidate: finalProductCandidate, source_manifest_digest: sourceManifestDigest }))
      const work = { id: 'work-a5-release-audit', milestone_id: milestoneId('A5'), fingerprint: candidateIdentity, acceptance_gap_delta: 1, uncertainty_delta: 1, blocker_delta: 0, user_value_delta: 1, reversible: true, cost: 1 }
      const projection = projectOutcomeV2({ graph, source_revision: candidateIdentity, expected_source_revision: candidateIdentity, observed_at: '2026-08-31T00:00:00.000Z', work_items: [work] })
      const content = { schema_version: 2, candidate_identity: candidateIdentity, final_product_candidate: finalProductCandidate, source_manifest_digest: sourceManifestDigest, source_digests: actualDigests, manifest_sources: Object.values(sources), loaded_sources: ['AGENTS.md', 'active-bootstrap-snapshot', sources.gate, 'skill:karpathy-guidelines', 'skill:unlazy', 'skill:mango-implementation-engineer', sources.contract, sources.map, sources['slice-contract'], sources['builder-receipt'], sources['qa-receipt'], sources['promotion-receipt'], sources['failed-audit']], excluded_source_classes: ['historical_gate_families', 'historical_q1_canary_inputs', 'correction_chains', 'raw_conversation', 'roadmap_2', 'unrelated_skills'], gate_model: { predicate_count: rows.length, closed_count: rows.filter((row) => row.closed).length, ready_predicate: 'A5', locked_predicates: ['C1'] }, projection: { primary_destination: projection.primary_destination, acceptance_gap: { remaining: projection.progress.total - projection.progress.closed, ...projection.progress }, ready_frontier: projection.ready_frontier, active_work: null, next_action: projection.next_action, cherry_action: projection.cherry_action }, outcome: projection.next_action === work.id ? 'next_action_selected' : 'no_eligible_action', safety: { duplicate_execution_count: projection.blockers.duplicate_fingerprints, automatic_retry_count: projection.automatic_retry_count, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 } }
      const result = { ...content, snapshot_digest: digest(stable(content)) }
      if (result.gate_model.closed_count !== 11 || result.projection.acceptance_gap.closed !== 11 || result.projection.acceptance_gap.total !== 13 || result.projection.ready_frontier.join(',') !== milestoneId('A5') || result.projection.next_action !== work.id || result.projection.cherry_action !== null) throw new Error('final_frontier_invalid')
      const serialized = JSON.stringify(result); if (/\/Users\/|\.outcome-runtime|docs\/ROADMAP 2\.md|(?:thread|session|task|turn)[_-]?id/i.test(serialized)) throw new Error('public_output_invalid')
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    }
  }
}
