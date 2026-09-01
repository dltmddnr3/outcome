# OUTCOME Model v2 canonical package O1 dogfood — Builder receipt

Status: **O1_CANDIDATE_READY · AWAITING INDEPENDENT QA AND RELEASE AUDIT**

This receipt covers an isolated Builder candidate only. It does not promote the candidate, mutate the active root, perform the final dogfood consumption, authorize QA or Release Audit verdicts, close O1, activate a runtime, deploy, or release.

## Immutable lineage and scope

- Starting commit/tree/parent: `75e449de24b01e56df7b896cd2b89e849df17efe` / `a35ff3cbabdbd578ea9085844ed32ff8403e15de` / `4e8f155852595effed4c054904fb03ac8f386fff`.
- Candidate commit/tree/parent: `dd47570e9feec5c125e4f83e23368a9c92888399` / `5a054fedb469103f18200cc436e4d539debbb646` / `75e449de24b01e56df7b896cd2b89e849df17efe`.
- Accepted product candidate retained: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`.
- Corrected handoff SHA-256: `47e08cf37d71517f1a4036e81995bcc8874eda68b60dd3a710061511c27334b6`.
- Candidate changed exactly four implementation paths: `server/outcome-current-projection.mjs`, `server/outcome-current-projection.test.mjs`, `scripts/outcome-model-v2-local-canary.mjs`, and `snapshot/outcome-model-v2-current.json`.

## RED and GREEN evidence

- Pre-edit current projection: `cold_compile_required/source_digest_drift`, automatic retry `0`; sole stale source class `current_gate`, expected `5f55db737076632db4f4e1f831cca560e5f9c2db5f84d93317539fc4aff3b022`, actual `87b43ff38fa397d4832894960274d31715b68078c47166281612d7fadf29140c`.
- Pre-edit local canary: exit `2`, `cold_compile_required/source_digest_drift`, automatic retry and consumption `0`; sole stale manifest pin was the selector Gate.
- Pre-edit frontier mismatch: ready `milestone-o1`, work milestone `milestone-b1`, `next_action=null`, `cherry_action=resolve_blocker`, `7/8` closed.
- Immutable-candidate tests: `26` passed, `0` failed, including deterministic double compilation, both Gate drifts, O1 milestone mismatch, wrong role, unapproved/nonempty expansion, source drift, single-consumption receipt, privacy, hostile inputs, explicit rollback, and zero retry.
- `git diff --check`: PASS.
- Rollback probe: exact `v1_compatible / rollback_selected`, original value required, persistent state unchanged, automatic retry `0`.

## Projection and local dogfood probe

- Projection digest: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`.
- Projection source-manifest digest: `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`.
- Selector source-manifest digest: `cdb68b9c02146620e7cbe7a3f501b2dfcfaec97b8594b2b57ee6dfd9dab020f4`.
- Snapshot byte digest: `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`.
- Selective-context plan digest: `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Projection result: `7/8` closed, ready `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action `null`, active work `null`, rollback available.
- Loaded source classes: `project_instructions` (content-addressed), `active_snapshot` (content-addressed), `current_gate` (content-addressed), two `common_skill` entries and one `role_skill` entry (bounded non-content-addressed skill identifiers).
- Skipped source classes: `historical_gate_families`, `historical_q1_canary_inputs`, `correction_chains`, `raw_conversation`, `roadmap_2`, `unrelated_skills`.
- Each isolated canary invocation created a fresh in-memory adapter and returned one `locally_consumed` receipt with `local_consumption_count=1`; no persistent or active-root dogfood state was written.

## Isolation and safety readback

- Immediately before candidate commit, the active root remained at `75e449de24b01e56df7b896cd2b89e849df17efe`; excluding exactly the corrected Planner handoff, its structured unrelated dirty manifest remained `396` entries / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- Protected registry readback: doctor clean, lock clear, exactly one current Builder, binding version `18`, exact self-match count `1`.
- Candidate staged residue after commit: `0`.
- Execution-started, automatic-retry, duplicate-execution, persistent-setting, registry/provider/environment, unauthorized-canonical-transition, active-root mutation, Preview, Production, deployment, release, external activation, Phase-transition and false-completion counts: all `0`.

The required next boundary is fresh independent UX & Product QA on the exact candidate, followed by separate fresh Release Audit. Neither is started or claimed by this receipt.
