# OUTCOME Model v2 A5 coherent canary correction — Builder receipt

- Status: `A5_COHERENT_CANARY_CORRECTION_CANDIDATE_READY_BUILDER_ONLY`
- Predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md#A5`
- Authority: Builder candidate only; fresh Release Audit remains required. This is not Gate promotion, QA, Audit, A5/C1 closure, Cherry acceptance, deployment, Production, release, or Phase transition.
- Handoff SHA-256: `042efce0e1365bc92590a906b526f47065647a219ed043516094c8a55c103ebc`

## Immutable input and candidate

- Source / tree / parent: `3051dc966a74c0c2d1d73a30bacbcbe12b42af90` / `94ff0f694a204bd6464239e3bedbaf59835727fc` / `7b25b801da4e971a837b302f0ffff02d0e2d64fc`
- Failed Audit report SHA-256: `9e77063cfbc09517fa5e8376846902075a449205006ff021eff91765c279ba5b`
- Product/test candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`
- Product/evidence-source commit: `f4bd8c4427f903f4a3d050e7a0d15a9f244e77bf`
- Tree: `8e6c82baf2082e25d53644be0116ed38b780a57b`
- Parent: `3051dc966a74c0c2d1d73a30bacbcbe12b42af90`
- Changed paths:
  - `AGENTS.md`, exact materialized SHA-256 `cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93`
  - `docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md`, exact materialized SHA-256 `b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657`
  - `scripts/outcome-model-v2-local-canary.mjs`

## RED → GREEN

RED on the exact failed-Audit carrier after the two authorized files were materialized: the canary still terminated on a missing historical Q1 handoff before it could validate current inputs. The Audit F1 was reproduced: its source set was incomplete and retained historical Q1 revision/digests/frontier.

GREEN uses only immutable final-candidate inputs. Contract/Map/promoted Gate digests are respectively `c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442`, `da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3`, and `659fb65fafce7403a89b126ae91c9ef81aa6ce73a293b9f9244b9dd5a93ad1c5`. Historical Q1 canary inputs and Gate families are explicitly excluded.

Two runs were byte-identical, output SHA-256 `a811501305e209c0d70c8f417b14187a68b1015e5c83e30c5132542a68948f97`:

- canonical source-manifest digest: `16c566529b94761de22d04e23f547d837126733006cc89540837b3a26b561499`
- candidate identity: `4d6f6671e98dabeed77bb8384d83c36f9abb43d3071c86215824cdb104e3a5e5`
- snapshot digest: `767327ad71533a6b380f5868ee71c07f91fb662d73f2505c754c1af9c000ffc2`
- frontier: `11/13` closed, A5 ready/open, C1 locked, next action `work-a5-release-audit`, Cherry action `null`
- duplicate execution, automatic retry, unauthorized transition, registry/provider/environment mutation and false completion: `0`

A disposable Gate byte mutation returned exit `2`, `cold_compile_required/source_digest_drift`, retry and safety counters `0`. A disposable missing `AGENTS.md` returned exit `2`, `cold_compile_required/source_input_missing`, retry and safety counters `0`.

## Regression, safety, and rollback

- Focused Model v2/bootstrap/package/control-plane: `80/80 PASS`; hostile accessor/Proxy tests execute traps `0`; explicit v1 rollback remains byte-compatible.
- Full server: `392/392 PASS`.
- Full frontend: `99/99 PASS` across `7/7` files.
- Account/projection: `48/48 PASS`.
- Production build: PASS, `1,654` modules transformed.
- Built browser: PASS; three ready viewports, eight non-ready states plus loading, 200% equivalent reflow, overflow `0`, minimum controls `44px`, project switching preserved.
- Canonical dirty fingerprint before and after: `9719d2890932296f49140012321929db9e53b49a44a1e5602b3b152614d92a6a`.
- Product retry, automatic resend/replay, registry/provider/runtime/environment/deployment/release/acceptance/external mutation, push and false completion: `0`.
- QA/Audit performed by Builder: `0`.
- Test-harness setup error count: `1` (a disposable-copy loop temporarily reused zsh's special `path` variable; it created no copied input, was removed exactly, and the corrected setup ran once).
- Task-owned dependency, build, drift-probe and temporary-output residue: `0`.
- Rollback: revert candidate `f4bd8c4427f903f4a3d050e7a0d15a9f244e77bf` to exact parent `3051dc966a74c0c2d1d73a30bacbcbe12b42af90`; no runtime rollback is required.

A5 and C1 remain unpromoted. Fresh independent Release Audit must reproduce this exact candidate and receipt carrier.
