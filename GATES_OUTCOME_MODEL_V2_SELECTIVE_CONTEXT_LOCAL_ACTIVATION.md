# OUTCOME Model v2 selective-context local activation

Outcome: The exact Cherry-accepted Model v2 carrier becomes the verified local session-bootstrap default, loading only the current snapshot, Gate, handoff and proportional skills; unsupported enforcement, source drift and role mismatch fail closed. Preview, Production, release and Phase transition are excluded.

Status: **Q1/O1/O2 EVIDENCE PROMOTED · BUILDER ONLY · FRESH A1 RELEASE RE-AUDIT REQUIRED**

- [x] D1: Exact accepted source and authority boundary are fixed.
  CHECK: git cat-file -e d726e200a9500658ae1fee5781d1d908a6b1a522^{commit} && git show d726e200a9500658ae1fee5781d1d908a6b1a522:GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md | rg -q 'MODEL V2 13/13 CHERRY ACCEPTED' && echo D1_PASS
  EXPECT: `D1_PASS`
  EVIDENCE: Accepted carrier `d726e200a9500658ae1fee5781d1d908a6b1a522`; Cherry instructed `추천 실행 순서대로 진행해줘`. This authorizes local activation work only, not Preview, Production, release or Phase transition.

- [x] B1: Local startup uses the accepted Model v2 selective-context bootstrap with no opt-in flag and no persistent/shared environment mutation.
  CHECK: task_root="$(mktemp -d)" && git archive 7ec07d48958b95c780d03f0ade376b9faf5a66de | tar -x -C "$task_root" && git show 66cf3cb6dedf4d7de91a1910f357af647f48bbfa:GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md > "$task_root/GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md" && { check_status=0; (cd "$task_root" && node --test server/outcome-model-v2.test.mjs && node scripts/outcome-model-v2-local-canary.mjs) || check_status=$?; node -e 'require("node:fs").rmSync(process.argv[1], { recursive: true, force: true })' "$task_root"; exit "$check_status"; }
  EXPECT: default schema `2`, authority `projection_only`, persistent mutation `0`
  EVIDENCE: RED first failed because `compileOutcomeSelectiveContextPlan` was absent. GREEN defaults to schema 2 and projection-only authority, and the canary proves the snapshot plan is accepted by the capability-bound local adapter without setting shared or persistent environment state.

- [x] B2: Exact explicit rollback returns the unchanged v1 object and serialized bytes and leaves no listener, process, flag or task-owned residue.
  CHECK: node --test --test-name-pattern='unset configuration defaults to v2|role selection no-role rollback' server/outcome-model-v2.test.mjs
  EXPECT: identity and byte equality; residue `0`
  EVIDENCE: Explicit `OUTCOME_MODEL_V2_ENABLED=0` retains exact v1 object identity and serialized bytes. The candidate exports no listener, process, dispatch, archive or persistent-setting operation.

- [x] B3: The compiled default load set contains only `AGENTS.md`, one content-addressed current snapshot, one current canonical Gate, at most one current handoff/checkpoint, common substantial-work skills and at most one work-type role skill.
  CHECK: node --test --test-name-pattern='selective context plan|role selection no-role' server/outcome-model-v2.test.mjs
  EXPECT: no unrelated Gate, correction chain, raw conversation, archived receipt sweep or unrelated skill
  EVIDENCE: Builder canary loads exactly AGENTS, active snapshot, this Gate, two common skills and one Builder skill. A null handoff loads zero checkpoint; no-role loads only the common skills.

- [x] B4: Planner, Builder, UX & Product QA and Release Audit work types deterministically select an allowlisted role context; no-role work selects no role skill, and mismatches fail closed before execution.
  CHECK: node --test --test-name-pattern='role selection no-role' server/outcome-model-v2.test.mjs
  EXPECT: exact role mapping; wrong-role and unknown-work negative controls fail closed
  EVIDENCE: Exact Planner, Builder, UX Product QA and Release Audit mappings each load one allowlisted role skill; no-role loads none. Unknown work and wrong-role controls return finite holds before adapter consumption.

- [x] B5: Every on-demand source or skill expansion requires a reason, exact source digest and work ID; source digest drift, missing input or unsupported session-enforcement capability produces a finite hold rather than simulated activation.
  CHECK: node --test --test-name-pattern='selective context plan|role selection no-role' server/outcome-model-v2.test.mjs
  EXPECT: deterministic finite holds; retry/fallback/false completion `0`
  EVIDENCE: Expansion requires exact allowlist digest, reason and matching work ID. Duplicate and unrelated expansions are denied; drift, missing input and unsupported adapter capability stop before callback with retry, fallback and false completion 0.

- [x] B6: The local adapter emits a public-safe loaded/skipped-source receipt and never exposes physical task/session identifiers, locators, local paths, raw prompts/results, credentials or canonical-transition authority.
  CHECK: task_root="$(mktemp -d)" && git archive 7ec07d48958b95c780d03f0ade376b9faf5a66de | tar -x -C "$task_root" && git show 66cf3cb6dedf4d7de91a1910f357af647f48bbfa:GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md > "$task_root/GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md" && { check_status=0; (cd "$task_root" && node --test --test-name-pattern='selective context plan|QA correction|pre-consume|re-QA RED' server/outcome-model-v2.test.mjs && node scripts/outcome-model-v2-local-canary.mjs) || check_status=$?; node -e 'require("node:fs").rmSync(process.argv[1], { recursive: true, force: true })' "$task_root"; exit "$check_status"; }
  EXPECT: private survival `0`; authority remains projection-only
  EVIDENCE: Failed QA carrier `78f089fbd9fd32b1b00bde43dd354e21a1d2ff0f` proved three hostile source-ref classes survived the original receipt. First correction used positive source allowlists and finite public source-class projection. Failed re-QA carrier `6f77c6abef3c9f41ee6be9304b9d122ee4aae7b1` then proved a caller-forged ready plan reached the adapter once before receipt rejection. Pre-consume correction RED reproduced callback 1. GREEN deeply snapshots exact plan/nested shapes, validates source grammar and role/work ordering, requires zero finite safety counters, recomputes the canonical digest, and only then calls the adapter with the validated frozen plan. Direct invalid-ref, digest, role/work, missing/extra/decorated, Proxy and accessor plans have callback/trap/receipt survival 0. The prior 23-class privacy matrix remains green; execution-start, mutation and false-completion counters remain 0.

- [x] Q1: Fresh independent UX & Product QA reproduces default activation, rollback, all four role manifests, on-demand expansion, privacy and fail-closed negative controls on the exact immutable candidate.
  CHECK: verify the pinned fresh re-QA verdict and SHA-256 in `docs/OUTCOME_MODEL_V2_LOCAL_ACTIVATION_EVIDENCE_PROMOTION_BUILDER_RECEIPT.md`
  EXPECT: `PASS_SELECTIVE_CONTEXT_PRECONSUME_VALIDATION_REQA_ONLY`
  EVIDENCE: Both prior candidate verdicts remain preserved as `FAIL_UX_PRODUCT_QA_ONLY`. The later fresh selective-context pre-consume re-QA terminal receipt is pinned at SHA-256 `5312466d07b46a7f0c50a15a48f3cd23cdbeb0099bd8af4af411b3d1445c7353`; it reproduced fail-closed hostile-input behavior before callback and the valid compiled path with callback exactly `1`, verdict `PASS_SELECTIVE_CONTEXT_PRECONSUME_VALIDATION_REQA_ONLY`. This closes Q1 only for the local selective-context candidate and grants no Audit, activation, deployment, release, Phase or acceptance authority.

- [x] O1: Existing bound role tasks receive one non-mutating canary handoff each and observed turns prove the compact context contract without duplicate dispatch or claiming unobservable reads.
  CHECK: verify all four role rows and their callback/receipt and safety counters in `docs/OUTCOME_MODEL_V2_LOCAL_ACTIVATION_EVIDENCE_PROMOTION_BUILDER_RECEIPT.md`
  EXPECT: four singular bindings; new turns observed; duplicate/replay `0`; unsupported observation held explicitly
  EVIDENCE: Builder, UX & Product QA and Release Audit terminal receipts are pinned respectively at SHA-256 `056abc1b072117fc69e635dcd51208f9ba49cab851dab19996004fd3e542fdcf`, `b9c3bea741d15b8bc4aaf405f19ff8eb756ce223a7cd323b918877db0d961154` and `7675339a19c553f480ce71779a515f294f2d5daf797f5815d5cbca37d95dea1d`. The compact Planner observation is pinned by plan digest `c875c14405396fba078cb1a4e7b44ab04f62f12d8e66b1a4069ccf9a8534f89e`. Every role loaded the seven allowlisted source classes, callback/receipt was `1/1`, and duplicate/replay, persistent-setting, registry/provider/environment, unauthorized-transition and false-completion counters were `0`.

- [x] O2: One safe same-role session replacement uses only the content-addressed snapshot, current Gate, active work and next action; successor readiness is observed before predecessor archival.
  CHECK: verify corrected CAS and recoverable archive readbacks in `docs/OUTCOME_MODEL_V2_LOCAL_ACTIVATION_EVIDENCE_PROMOTION_BUILDER_RECEIPT.md`
  EXPECT: continuity ready; raw-history replay `0`; predecessor recoverable
  EVIDENCE: The corrected protected self-binding CAS invoked/mutated/retried `1/1/0` and read back registry revision `104`, mode `0600`, doctor clean, lock clear, successor active at version/history `3/3` with protected self-match `1`, predecessor version `2` replaced and recoverable, other project/role changes `0`, and private-output/false-completion hits `0/0`. The predecessor was recoverably archived only after successor readiness and this readback; the successor remained singular, loadable and unarchived. Raw-history replay and archive retry were `0`.

- [ ] A1: Separate fresh Release Audit validates the coherent implementation and operational evidence without inferring Preview, Production, release or Phase transition.
  CHECK: pending fresh Audit receipt
  EXPECT: `PASS_RELEASE_AUDIT_ONLY`
  EVIDENCE: pending

- [ ] C1: Cherry accepts the exact locally activated selective-context result; Preview, Production, release and Phase transition remain separate decisions.
  CHECK: manual authority
  EXPECT: exact bounded Cherry acceptance
  EVIDENCE: pending

## Stop conditions

- Do not infer actual Codex context enforcement from a generated manifest or prompt.
- Do not replay an unobserved dispatch. Revalidate binding and create a new attempt only after changed evidence.
- Do not overwrite, reset, clean or absorb the current user-owned dirty checkout.
- Do not activate Preview, Production, release or Phase transition under this Gate.
