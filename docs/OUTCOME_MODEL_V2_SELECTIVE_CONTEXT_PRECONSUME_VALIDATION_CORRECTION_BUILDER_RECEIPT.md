# OUTCOME Model v2 selective-context pre-consume validation correction — Builder receipt

Status: `SELECTIVE_CONTEXT_PRECONSUME_VALIDATION_CORRECTION_CANDIDATE_READY_BUILDER_ONLY`

## Immutable envelope

- Correction source / tree / parent: `6f77c6abef3c9f41ee6be9304b9d122ee4aae7b1` / `457f12b51ce5f1115335e4b6590fde36a8648c19` / `881a91afe94291ce36e32c47e91d08f3794a83e3`
- Failed QA receipt SHA-256, preserved: `d8c3d09e6295a99518dbfbdccdd10679b1eb8c6e169ec861d2d74adb839752cd`
- Failed re-QA receipt SHA-256, preserved: `dbd009a7057fb5b833ef3946de660b1b319d4d1f6c0e5efedbfdd729e7e269fc`
- Correction commit / tree / parent: `d152fc9a37dac880b022b64dd81e7d5bdc487d73` / `ae3c01e69b43a82e57b102aeb8c2bbe5ab4d135c` / `6f77c6abef3c9f41ee6be9304b9d122ee4aae7b1`
- Corrected Gate SHA-256: `3432c69edc63f40547454090fbc0e4c381ec4addde6e7d68100a25e28b8b4c34`
- Changed paths: existing selective-context Gate, Model v2 module and test, and local canary only.

## RED → GREEN

- RED reproduced the failed re-QA result: a caller-forged ready plan containing a private thread source ref invoked the capable adapter callback exactly once before receipt projection rejected it.
- GREEN deeply snapshots and validates the plan before callback: exact top-level and nested keys, undecorated dense arrays, positive source grammar, role/work ordering, expansion counts and reasons, zero finite safety counters, and recomputed canonical `plan_digest`.
- The adapter receives only the reconstructed frozen validated plan. Caller `outcome`, frozen state or supplied digest is not treated as compiler provenance.
- Direct-consume matrix covers invalid private ref, digest mismatch, role/work mismatch, missing key, extra authority key, hidden nested key, nested accessor and Proxy. Callback `0`, trap `0`, receipt survival `0`.
- A valid compiler-produced plan invokes the callback exactly once and returns the deterministic finite source-class public receipt.
- Prior 23-class privacy matrix, default v2, exact v1 rollback, four roles/no-role, minimal load set and all previous finite holds remain green.
- Two corrected canary outputs are byte-identical at SHA-256 `51845f9ee237eec80aa5b32f723351141ab3afbe3bd75b22e88b1cb4c2309b62`.

## Regression evidence

- Focused Model v2/control-plane: `57/57` PASS.
- Full server with isolated dependency link: `398/398` PASS.
- Frontend: `99/99` PASS.
- Account access: server `33/33` PASS; component/API `32/32` PASS.
- Production build: PASS, `1654` modules transformed.
- Browser assertions: `22/22` PASS; current-candidate desktop, tablet, mobile and landscape browser fixture PASS.
- The pre-existing stable-host snapshot gap remains separately recorded. No stable-host or snapshot path was repaired or modified.

## Safety, rollback and remaining authority

- Canonical dirty fingerprint before and after: `c71951330736e9d76c88dfad8bdf54ff260e0606df578725c4169d5c5bd6e63b`.
- Task-owned dependency link was removed; both failed QA receipts remained byte-identical.
- Automatic resend/replay/retry, execution start, duplicate execution, registry/provider/runtime/shared-environment mutation, canonical transition and false completion: `0`.
- No role dispatch, session replacement, stable-host repair, Preview, deployment, Production, release, Phase transition, push, QA, Audit or acceptance occurred.
- Rollback: stop using correction commit `d152fc9a37dac880b022b64dd81e7d5bdc487d73` and return to failed re-QA source `6f77c6abef3c9f41ee6be9304b9d122ee4aae7b1`; explicit compatibility rollback remains `OUTCOME_MODEL_V2_ENABLED=0`.
- Fresh independent re-QA is mandatory. This Builder candidate is not QA, Audit, activation, Cherry acceptance, deployment, release or Phase transition.
