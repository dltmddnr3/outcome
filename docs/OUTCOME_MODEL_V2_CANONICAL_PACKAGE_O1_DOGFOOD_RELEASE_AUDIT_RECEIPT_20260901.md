# OUTCOME Model v2 canonical package O1 dogfood correction — Release Audit receipt

Status: **PASS_RELEASE_AUDIT_ONLY**

Authority: fresh independent read-only Release Audit of exact re-QA carrier `62ddcec5c9c42a5219bb721e4a271c8d27428913`. This receipt does not promote or fast-forward the active root, perform final dogfood consumption, close O1, accept the candidate, activate, deploy, release, or mutate provider/runtime/environment state.

## Exact subject, lineage, and scope

- Re-QA carrier/tree/parent: `62ddcec5c9c42a5219bb721e4a271c8d27428913` / `978e043d53a9fb784d9c86f3785120b3e61ac9ce` / `c874bfd2309fc6be512f9aac1a04e2f0f75b5ddb`.
- Builder receipt carrier/tree/parent: `c874bfd2309fc6be512f9aac1a04e2f0f75b5ddb` / `6214962500c0717d3e416107ceb5770393607f3c` / `5239046157e1458e077a04a27459b6e32174b96e`.
- Correction candidate/tree/parent: `5239046157e1458e077a04a27459b6e32174b96e` / `46983cf90baf4497b8fc68e14bb9b84586fe1ca8` / `dbc1a03c8e8a867a394b037c15ea6bc5780843ab`.
- The exact single-parent chain continues through QA FAIL `dbc1a03c8e8a867a394b037c15ea6bc5780843ab`, first Builder carrier `895922e8552e3a5a467cb7d2e5aef7480a839df1`, first candidate `dd47570e9feec5c125e4f83e23368a9c92888399`, and active-root base `75e449de24b01e56df7b896cd2b89e849df17efe`.
- Builder receipt SHA-256: `e4339aef9c5d4044a10ff8005703384e08d2050d2d1b39dc1692e8c035185c3e`.
- Re-QA receipt SHA-256: `7732ea3539682d3f7c7f5f0bbcdf536d9032eaca11a39233f7721fad82d6c011`.
- Correction candidate changes exactly `scripts/outcome-model-v2-local-canary.mjs`, `server/outcome-current-projection.test.mjs`, `server/outcome-model-v2.mjs`, and `server/outcome-model-v2.test.mjs`. Builder and QA carriers add only their authorized evidence paths. `git diff --check` passed.

## Independent RED, hostile, and regression evidence

- Prior duplicate RED reproduced on exact first candidate: one adapter returned `locally_consumed` twice, callback count `2`, duplicate count `0`.
- Prior snapshot RED reproduced: one appended whitespace byte yielded snapshot `914ced4779f25318a150c67550c2b5ac91310a0b253d118cab8f50712e58ebda`, exit `0`, consumption `1`, and drifted plan `e77fa76597b9c3ce6515fd11dae216d484d4d268838bcde8e436468e090f2f84`.
- Corrected same-adapter hostile case: first call consumed once; second returned `safe_hold/duplicate_context_plan` before callback; callback count `1`, duplicate count `1`, retry and execution-started counts `0`.
- A fresh adapter consumed the same immutable plan once. Snapshot whitespace drift returned exit `2`, `cold_compile_required/source_digest_drift`, consumption `0`; missing snapshot returned exit `2`, `cold_compile_required/source_input_missing`, consumption `0`.
- Hostile Proxy, accessor, hidden/decorated, extra-key, wrong-role, expansion, private-ref and forged-plan cases failed closed before traps or callbacks.
- Focused/core suite passed `39/39`. Full regression passed `508/508`: `99/99` UI/library and `409/409` server. The correction has no UI product delta; the full UI/library pass is the applicable accessibility/regression boundary.

## Deterministic projection, privacy, runtime, and rollback

- Two normal canary outputs were byte-identical at SHA-256 `64d97a643fe3ef67b43db1e6c7303ac11e52d042e3c1105cc7cd8ddd51912652`.
- Projection / source manifest / selector manifest / snapshot / plan digests: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea` / `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c` / `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361` / `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295` / `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Projection remained `7/8`, frontier `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action and active work null, rollback available, and ordinary safety counters zero.
- Loaded/skipped classes were exactly `6/6`; sole role skill is `mango-implementation-engineer`; expansion allowlist and expansions are empty; current handoff input is null.
- Projection, snapshot, canary, Builder and QA evidence scans found `0` local paths, private task/thread/session/turn locators, raw prompts/results, credentials, registry payloads, or user-owned active-root Contract/Map byte disclosures.
- Feature remains default-off outside the explicit local in-memory probe. The adapter ledger is process-local; no listener, file-backed state, persistent setting, registry, provider, environment, Preview, Production, deployment, release, external activation, or canonical transition was created. Rollback remains `OUTCOME_MODEL_V2_ENABLED=0` or unset plus process restart, with no migration or cleanup.

## Active-root isolation, release scope, and counters

- Active root remained `75e449de24b01e56df7b896cd2b89e849df17efe`; index entries remained `0`.
- Excluding exactly the eight named Planner O1 handoffs/checkpoints present at this audit boundary, unrelated structured dirty state remained `396` entries / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- No final active-root dogfood consumption occurred. Active-root, product/source, final-dogfood, automatic-retry, execution-started, persistent-setting, registry/provider/environment, Preview, Production, deployment, release, external-activation, unauthorized-transition, Phase-transition, and false-completion mutation counts are all `0`.
- This is a local package Audit only. External provider/runtime authorization and release readiness were not exercised and remain residual unknowns; they cannot be inferred from local tests. Cherry acceptance and a separately bounded Builder promotion/dogfood step remain required.

Terminal boundary: `PASS_RELEASE_AUDIT_ONLY`.
