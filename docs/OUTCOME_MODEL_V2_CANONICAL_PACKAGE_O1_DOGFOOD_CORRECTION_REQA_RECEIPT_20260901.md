# OUTCOME Model v2 canonical package O1 dogfood correction — fresh UX & Product re-QA receipt

Status: **PASS_UX_PRODUCT_QA_ONLY**

Authority: fresh independent read-only re-QA of Builder receipt carrier `c874bfd2309fc6be512f9aac1a04e2f0f75b5ddb`. This receipt does not promote or fast-forward the active root, perform final dogfood consumption, close O1, activate, deploy, release, accept the candidate, or mutate provider/runtime/environment state.

## Exact subject, lineage, and scope

- Fresh QA FAIL carrier/tree/parent: `dbc1a03c8e8a867a394b037c15ea6bc5780843ab` / `d1b6293edb8f7647197c30e01ee8c1b425ff778e` / `895922e8552e3a5a467cb7d2e5aef7480a839df1`.
- Correction candidate/tree/parent: `5239046157e1458e077a04a27459b6e32174b96e` / `46983cf90baf4497b8fc68e14bb9b84586fe1ca8` / QA FAIL carrier.
- Builder receipt carrier/tree/parent: `c874bfd2309fc6be512f9aac1a04e2f0f75b5ddb` / `6214962500c0717d3e416107ceb5770393607f3c` / correction candidate.
- QA FAIL receipt SHA-256: `7a1dd0635dfc463a300ef2dd27bebd4a3dd2d6becd0660711ce91aa447cadbab`.
- Correction Builder receipt SHA-256: `e4339aef9c5d4044a10ff8005703384e08d2050d2d1b39dc1692e8c035185c3e`.
- Fresh re-QA handoff SHA-256: `34cbf6c6acb2a9d6c4674d1ae020f523bd103d3834bb1a9d65b9f673a5f6fb80`.
- Correction candidate changes exactly four authorized implementation paths: `server/outcome-model-v2.mjs`, `server/outcome-model-v2.test.mjs`, `scripts/outcome-model-v2-local-canary.mjs`, and `server/outcome-current-projection.test.mjs`. The Builder carrier adds only its correction handoff and receipt.

## RED-before-GREEN

- Prior RED `2/2` reproduced on exact first candidate `dd47570e9feec5c125e4f83e23368a9c92888399` before correction testing.
- Same-adapter duplicate RED: first and second calls both returned `locally_consumed`; callback count `2`; duplicate count `0`; plan `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Snapshot drift RED: one appended whitespace byte produced snapshot `914ced4779f25318a150c67550c2b5ac91310a0b253d118cab8f50712e58ebda`, exit `0`, accepted consumption `1`, and drifted plan `e77fa76597b9c3ce6515fd11dae216d484d4d268838bcde8e436468e090f2f84`.

## Independent correction evidence

- Same correction adapter: first call `locally_consumed`; second call `safe_hold/duplicate_context_plan`; callback count `1`; duplicate count `1`. Retry, execution-started, persistent-setting, registry/provider/environment, unauthorized-transition, and false-completion counters remained `0`.
- Fresh adapter: the same immutable plan was accepted exactly once with callback count `1`; no listener, file, registry, provider, environment, or persistent setting was created.
- Snapshot whitespace drift: exit `2`, `cold_compile_required/source_digest_drift`, consumption `0`, retry `0`.
- Missing snapshot: exit `2`, `cold_compile_required/source_input_missing`, consumption `0`, retry `0`.
- Hostile accessor, Proxy, hidden/decorated, extra-key, wrong-role, expansion, and forged-plan boundaries failed closed before traps or callbacks in the focused suite.
- Two normal canary outputs were byte-identical. Each consumed once in a fresh in-memory adapter and reported all ordinary safety counters `0`.
- Focused/core suite: `39/39` passed. Full regression: `508/508` passed (`99` UI/library plus `409` server). `git diff --check`: PASS.

## Preserved projection and source authority

- Accepted product candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`.
- Projection digest: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`.
- Projection source-manifest digest: `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`.
- Corrected selector source-manifest digest: `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361`.
- Snapshot digest: `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`.
- Plan digest: `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Projection remained `7/8`, ready frontier `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action and active work null, rollback available, and safety zero.
- Loaded/skipped source classes were exactly `6/6`; sole role skill remained `mango-implementation-engineer`; expansion allowlist and expansions were empty; current handoff was null.
- Candidate Contract and Map remained the immutable source bytes; active-root user-owned differing bytes were not copied into the candidate or serialized evidence.
- Public projection, plan receipt, canary output, and evidence receipt scans found `0` private locator, local path, raw prompt/result, credential value, registry payload, or active-root user-owned byte disclosures.

## Isolation, durable evidence, and counters

- Re-QA ran only in disposable detached clones. Active root remained at `75e449de24b01e56df7b896cd2b89e849df17efe`; index entries remained `0`.
- Excluding exactly the six named Planner O1 handoffs/checkpoints introduced by this chain, the active-root structured dirty manifest remained `396` entries / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- Protected QA binding remained version/history `32/32`; no QA-turn registry mutation occurred.
- Active-root, product/source, final-dogfood, automatic-retry, Preview, Production, deployment, release, external activation, provider/runtime/environment, Phase-transition, unauthorized-transition, and false-completion mutation counts: all `0`.
- This receipt is the only QA evidence path. Its single-parent carrier is published unchanged under durable local branch `codex/o1-dogfood-correction-fresh-reqa-pass-20260901`.

Terminal boundary: `PASS_UX_PRODUCT_QA_ONLY`. Separate Release Audit is the next authorized verification boundary; promotion, active-root dogfood consumption, O1 closure, acceptance, activation, deployment, and release remain unauthorized.
