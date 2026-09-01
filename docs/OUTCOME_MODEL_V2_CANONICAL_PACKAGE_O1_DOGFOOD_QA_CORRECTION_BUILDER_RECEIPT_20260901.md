# OUTCOME Model v2 canonical package O1 dogfood — QA correction Builder receipt

Status: **O1_CORRECTION_CANDIDATE_READY · AWAITING FRESH INDEPENDENT RE-QA**

This receipt covers one isolated correction candidate above the fresh-QA FAIL carrier. It does not promote or fast-forward the active root, perform final dogfood consumption, start or claim re-QA or Release Audit, close O1, activate, deploy, release, or mutate external state.

## Immutable lineage and scope

- Failed subject carrier/tree/parent: `dbc1a03c8e8a867a394b037c15ea6bc5780843ab` / `d1b6293edb8f7647197c30e01ee8c1b425ff778e` / `895922e8552e3a5a467cb7d2e5aef7480a839df1`.
- Correction candidate/tree/parent: `5239046157e1458e077a04a27459b6e32174b96e` / `46983cf90baf4497b8fc68e14bb9b84586fe1ca8` / `dbc1a03c8e8a867a394b037c15ea6bc5780843ab`.
- QA FAIL receipt SHA-256: `7a1dd0635dfc463a300ef2dd27bebd4a3dd2d6becd0660711ce91aa447cadbab`.
- Correction handoff SHA-256: `c08947ebf49c9d22659b38dcd5f7491e63c11e162acb976be8d0c8ebb625152e`.
- Candidate changes exactly four allowed implementation paths: `server/outcome-model-v2.mjs`, `server/outcome-model-v2.test.mjs`, `scripts/outcome-model-v2-local-canary.mjs`, and `server/outcome-current-projection.test.mjs`.

## RED and correction evidence

- Duplicate RED: exact plan `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a` returned `locally_consumed` twice on one adapter, callback count `2`, duplicate count `0`.
- Snapshot RED: one appended whitespace byte changed snapshot digest from `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295` to `914ced4779f25318a150c67550c2b5ac91310a0b253d118cab8f50712e58ebda`, but the failed candidate exited `0`, consumed once, and produced drifted plan `e77fa76597b9c3ce6515fd11dae216d484d4d268838bcde8e436468e090f2f84`.
- Correction: a process-local weak adapter-instance ledger records an accepted plan digest only after the underlying callback accepts it. Same-adapter replay returns projection-only `safe_hold/duplicate_context_plan` before callback with duplicate count `1`; a fresh adapter can consume the immutable plan once.
- Snapshot bytes are now a statically pinned selector-manifest source at digest `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`; the plan uses that validated manifest value.

## GREEN evidence

- Full focused/core set: `39` passed, `0` failed; `git diff --check`: PASS.
- Same adapter: first result `locally_consumed`, second result `safe_hold`, reason `duplicate_context_plan`, callback count `1`, duplicate count `1`; all other safety counters `0`.
- Fresh adapter: same immutable plan accepted once, callback count `1`.
- Snapshot whitespace drift: exit `2`, `cold_compile_required/source_digest_drift`, automatic retry `0`, consumption field absent and callback count `0`.
- Missing snapshot: exit `2`, `cold_compile_required/source_input_missing`, automatic retry `0`, consumption field absent and callback count `0`.
- Explicit rollback remains `v1_compatible/rollback_selected`, original value required, persistent state unchanged, automatic retry `0`.

## Preserved projection and content addresses

- Accepted product candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`.
- Projection digest: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`.
- Projection source-manifest digest: `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`.
- Corrected selector source-manifest digest: `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361`.
- Snapshot digest: `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`.
- Plan digest: `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Projection remains `7/8`, ready `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action and active work `null`, rollback available.
- Loaded/skipped classes remain exactly `6/6`; Builder role skill, accepted selector Gate, null handoff and empty expansion allowlist remain unchanged.

## Isolation and counters

- Before candidate commit, active root remained at `75e449de24b01e56df7b896cd2b89e849df17efe`; excluding exactly the four authorized handoff/checkpoint files, structured unrelated dirty manifest remained `396` / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- Protected Builder registry remained doctor clean, lock clear, current count `1`, binding version `18`, exact self-match `1`.
- Execution-started, automatic-retry, persistent-setting, registry/provider/environment, unauthorized-transition, active-root, final-dogfood, Preview, Production, deployment, release, external activation, Phase-transition and false-completion mutation counts: all `0`.
- Duplicate hostile probe is represented only by its expected duplicate counter `1`; no second callback or accepted consumption occurred after correction.

Required next boundary: fresh independent re-QA on the exact correction candidate, then separate Release Audit only after re-QA PASS. Neither is started or claimed here.
