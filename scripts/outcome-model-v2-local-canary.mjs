import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileOutcomeSelectiveContextPlan, consumeOutcomeSelectiveContextPlan, createCodexRuntimeAdapter } from '../server/outcome-model-v2.mjs'
import { validateOutcomeSourceManifest } from '../server/outcome-context-bootstrap.mjs'

const finalProductCandidate = '28db58fd5018dc4094c9cbbf764d0e86e83cbea4'
const sources = Object.freeze({
  agents: 'AGENTS.md', contract: 'docs/OUTCOME_CONTRACT.md', map: 'docs/OUTCOME_MAP.md',
  'slice-contract': 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md', gate: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md',
  'builder-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_PUBLIC_MILESTONE_LABEL_CORRECTION_BUILDER_RECEIPT.md',
  'qa-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_PUBLIC_MILESTONE_LABEL_CORRECTION_FRESH_REQA_RECEIPT.md',
  'promotion-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_EVIDENCE_PROMOTION_RECEIPT.md',
  'failed-audit': 'docs/OUTCOME_MODEL_V2_A5_COHERENT_CANDIDATE_FRESH_RELEASE_AUDIT_RECEIPT.md',
  'activation-gate': 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md',
})
const pinnedDigests = Object.freeze({
  agents: 'cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93', contract: 'c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442', map: 'da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3',
  'slice-contract': 'b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657', gate: 'b6c156c60cfca729c261641a96401590f44d9e47845d5ae34dd4a028790e7357',
  'builder-receipt': '80a01e7597941d21b281da26b711005421831670ff4668ce80d2e6302a90acad', 'qa-receipt': '41f80e48b9475f59fabb636768470f87bf9d49cef22544e8b26f558fa0c0e8a3',
  'promotion-receipt': '75cae693bad35f8a7791941eefbd008605162073ee817fa3c7632d73c8b98dfb', 'failed-audit': '9e77063cfbc09517fa5e8376846902075a449205006ff021eff91765c279ba5b',
  'activation-gate': '50987cbba74c275ce5143c26d4ecb20c2fad377dfea2b7f50b75c621a989628f',
})
const snapshotSource = 'snapshot/outcome-model-v2-current.json'
const skippedSourceClasses = Object.freeze(['historical_gate_families', 'historical_q1_canary_inputs', 'correction_chains', 'raw_conversation', 'roadmap_2', 'unrelated_skills'])
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value)
const digest = (value) => createHash('sha256').update(value).digest('hex')
const failClosed = (reason) => { process.stdout.write(`${JSON.stringify({ schema_version: 2, outcome: 'cold_compile_required', reason, automatic_retry_count: 0, safety: { duplicate_execution_count: 0, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 } }, null, 2)}\n`); process.exitCode = 2 }

const args = process.argv.slice(2)
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--source-root' || !args[1])) failClosed('invalid_source_root')
else {
  const sourceRoot = resolve(args[1] ?? '.')
  let sourceBytes; let snapshotBytes
  try { sourceBytes = Object.fromEntries(Object.entries(sources).map(([key, path]) => [key, readFileSync(resolve(sourceRoot, path))])); snapshotBytes = readFileSync(resolve(sourceRoot, snapshotSource)) } catch { failClosed('source_input_missing') }
  if (sourceBytes) {
    const actualDigests = Object.fromEntries(Object.entries(sourceBytes).map(([key, bytes]) => [key, digest(bytes)]))
    const manifestValidation = validateOutcomeSourceManifest(actualDigests, pinnedDigests)
    if (manifestValidation.outcome !== 'ready') failClosed(manifestValidation.reason)
    else {
      canary: {
      let snapshot
      try { snapshot = JSON.parse(snapshotBytes) } catch { snapshot = null }
      if (snapshot?.outcome !== 'current_projection' || snapshot.candidate_commit !== finalProductCandidate || snapshot.current?.acceptance_gap?.closed !== 7 || snapshot.current?.acceptance_gap?.total !== 8 || snapshot.current?.ready_frontier?.length !== 1 || snapshot.current.ready_frontier[0] !== 'milestone-o1' || snapshot.current.next_action !== 'work-o1-selective-context-dogfood' || snapshot.current.cherry_action !== null || snapshot.current.active_work !== null || snapshot.rollback?.available !== true || Object.values(snapshot.safety ?? {}).some((value) => value !== 0)) failClosed('snapshot_projection_invalid')
      if (process.exitCode) break canary
      const snapshotDigest = digest(snapshotBytes)
      const selectivePlan = compileOutcomeSelectiveContextPlan({
        environment: {}, work_id: snapshot.current.next_action, work_type: 'builder', role_skill: 'mango-implementation-engineer',
        sources: {
          agents: { source_ref: 'AGENTS.md', source_digest: actualDigests.agents },
          active_snapshot: { source_ref: 'active-bootstrap-snapshot', source_digest: snapshotDigest },
          current_gate: { source_ref: sources['activation-gate'], source_digest: actualDigests['activation-gate'] },
          current_handoff: null,
        },
        available_source_digests: { 'AGENTS.md': actualDigests.agents, 'active-bootstrap-snapshot': snapshotDigest, [sources['activation-gate']]: actualDigests['activation-gate'] },
        expansion_allowlist: [], expansions: [],
      })
      let consumedPlanDigest = null
      const localAdapter = createCodexRuntimeAdapter({
        selectNext: (value) => value, start: (value) => value, transition: (value) => value, projectPublic: () => ({ authority: 'projection_only' }),
        selectiveContextCapability: 'content-addressed-plan-v1', consumeContextPlan: (plan) => { consumedPlanDigest = plan.plan_digest; return { accepted: true } },
      })
      const selectiveContextReceipt = consumeOutcomeSelectiveContextPlan(localAdapter, selectivePlan)
      if (selectiveContextReceipt.outcome !== 'locally_consumed' || consumedPlanDigest !== selectivePlan.plan_digest) throw new Error('selective_context_not_consumed')
      const result = { schema_version: 2, outcome: 'o1_local_dogfood_probe_consumed', final_product_candidate: finalProductCandidate, projection_digest: snapshot.projection_digest, source_manifest_digest: snapshot.source_manifest_digest, selector_source_manifest_digest: digest(stable(pinnedDigests)), snapshot_digest: snapshotDigest, plan_digest: selectivePlan.plan_digest, projected_next_action: snapshot.current.next_action, loaded_sources: selectiveContextReceipt.loaded_sources, skipped_sources: skippedSourceClasses.map((source_class) => ({ source_class, content_addressed: false })), local_consumption_count: 1, selective_context_receipt: selectiveContextReceipt, safety: { execution_started_count: selectiveContextReceipt.safety.execution_started_count, automatic_retry_count: selectiveContextReceipt.safety.automatic_retry_count, duplicate_execution_count: selectiveContextReceipt.safety.duplicate_execution_count, persistent_setting_mutation_count: 0, registry_provider_environment_mutation_count: 0, unauthorized_canonical_transition_count: selectiveContextReceipt.safety.unauthorized_canonical_transition_count, false_completion_count: 0 } }
      const serialized = JSON.stringify(result); if (/\/Users\/|\.outcome-runtime|docs\/ROADMAP 2\.md|(?:thread|session|task|turn)[_-]?id|credential|password|secret|token|raw[_-]?(?:prompt|result)|source_ref|locator_ref|registry_payload/i.test(serialized)) throw new Error('public_output_invalid')
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      }
    }
  }
}
