# OUTCOME Model v2 A5 Release role-skill coherence correction — Builder receipt

- Status: `A5_RELEASE_ROLE_SKILL_COHERENCE_CORRECTION_CANDIDATE_READY_BUILDER_ONLY`
- Predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md#A5`
- Authority: Builder candidate only. Fresh independent Release Audit remains mandatory; this is not Gate promotion, QA, Audit, A5/C1 closure, Cherry acceptance, activation, deployment, Production, release, or Phase transition.
- Handoff SHA-256: `1036a8bb11c992f447e37891dd795d8a9d67bd84fada1612449452337f7f8b75`

## Immutable input and candidate

- Source / tree / parent: `a8c1a6d7083ef3461367513a14fd0936df58e0c8` / `a04aff99f41ab9a158ef663c969e5130945b8e61` / `93400aae75ddc17bc65de704dd4b3006735c0414`
- Failed re-audit report SHA-256: `e60ca1c75c4b97fb7c855edafb2dd91b65fd118d82ee7e6690629c8fff58d451`
- Underlying product/test candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`
- Correction commit: `1ad8dd432ab4cf17e1692d66ece584ac7b595d82`
- Tree: `ce4c05884aa3272320d12eff2b9663b250901054`
- Parent: `a8c1a6d7083ef3461367513a14fd0936df58e0c8`
- Changed path: `scripts/outcome-model-v2-local-canary.mjs`

## RED → GREEN

RED on the exact source selected `work-a5-release-audit` while loading common skills plus `skill:mango-implementation-engineer`; `unrelated_skills` was simultaneously declared excluded.

GREEN derives the role-specific source from A5 predicate authority and loads exactly `skill:lime-release-auditor`. A deterministic assertion filters out the two common skills and requires the remaining role-skill list to contain exactly that one value. Therefore `skill:mango-implementation-engineer` and every other unrelated role skill occur `0` times in the A5 snapshot.

Two corrected canary runs were byte-identical:

- output SHA-256: `93c3c696dc70ee9b89991d6356da34520aaf083cf83c66c91e49c2deaba5cd95`
- candidate identity: `4d6f6671e98dabeed77bb8384d83c36f9abb43d3071c86215824cdb104e3a5e5`
- snapshot digest: `3a56aa237e1bdae3af6250066040511f96dd93ed12e982e832adeb756822f945`
- common skills: `skill:karpathy-guidelines`, `skill:unlazy`
- only role skill: `skill:lime-release-auditor`
- frontier: `11/13` closed, A5 ready/open, C1 locked, next action `work-a5-release-audit`, Cherry action `null`
- duplicate execution, automatic retry, unauthorized transition, registry/provider/environment mutation and false completion: `0`

One disposable Gate byte drift returned exit `2`, `cold_compile_required/source_digest_drift`; one missing required `AGENTS.md` returned exit `2`, `cold_compile_required/source_input_missing`. Both retained retry and safety counters `0` with no fallback.

## Regression, scope, and rollback

- Focused Model v2/bootstrap/package/control-plane/role-transport: `88/88 PASS`.
- Full server: `392/392 PASS`.
- Full frontend: `99/99 PASS` across `7/7` files.
- Account/projection: `48/48 PASS`.
- Production build: PASS, `1,654` modules transformed.
- Built browser: PASS; account-only convergence `6/6`, three viewports across eight non-ready states plus loading and ready, 200% equivalent reflow, overflow `0`, controls at least `44px`, project switching preserved.
- Default Model v2, explicit byte/object-compatible v1 rollback, privacy/redaction and hostile accessor/Proxy behavior remain green.
- Canonical dirty fingerprint before and after: `f310691558a58bca119e22a3b66bd95177b978ddfc5e26ae4b68e60dd078c32c`.
- Product/test/Gate/Contract/Model/Map, registry/provider/runtime/environment/credential/data/deployment/release/acceptance/external mutation, push, QA/Audit, automatic retry, automatic resend/replay and false completion: `0`.
- Task-owned dependency/build/probe/output residue: `0`.
- Rollback: revert correction commit `1ad8dd432ab4cf17e1692d66ece584ac7b595d82` to exact parent `a8c1a6d7083ef3461367513a14fd0936df58e0c8`; no runtime rollback is required.

A5 and C1 remain unpromoted. Fresh independent Release Audit must reproduce this exact correction and receipt carrier.
