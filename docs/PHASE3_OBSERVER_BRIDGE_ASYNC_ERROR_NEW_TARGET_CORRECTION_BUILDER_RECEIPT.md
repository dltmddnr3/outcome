# Phase 3 Observer Bridge · Async Error Exact-New-Target Correction Builder Receipt

Terminal: `BUILDER_CORRECTION_CANDIDATE_READY_ONLY`

## Immutable identity

- source QA FAIL carrier: `3be5f146928ef0543b29d350b8d5751d2432eea0`
- source tree: `6d7ca5b749ce584c26f3688e048998cac43f2e84`
- source parent: `e10fe0f463303721ebe6e763c6964135a0e7defc`
- source report SHA-256: `92389a8a90e6ca06fac7267e33a735f5ddf56f56092bc11eb9322aad19915d1a`
- semantic correction: `5d7d99a2dfa9845152dd02821749460671a03cee`
- semantic tree: `884114d05f98962c009fca88c0412eac48c4e294`
- semantic parent: `3be5f146928ef0543b29d350b8d5751d2432eea0`

The QA FAIL report and every earlier QA/Audit report are unchanged.

## Correction

`HostedObserverBridgeError` now registers its module-private identity only when `new.target === HostedObserverBridgeError`. Direct construction and `Reflect.construct` with the exact class retain the fixed finite mappings. An alternate same-prototype newTarget, subclass, bound or proxied alternate newTarget, proxied constructor, or post-construction prototype mutation remains unbranded and settles as finite `503 {error:'bridge_unavailable'}`.

No API implementation, stable-host implementation, package, migration, runtime configuration, or UI changed. The request boundary still invokes one bridge operation with retry 0 and retains its residual finite catch.

## RED and GREEN

- RED: exact QA shared-prototype alternate-newTarget probe 0/2; direct API and stable host both exposed the specific 429 mapping before the correction.
- GREEN: exact QA probe 2/2; 6 endpoints x sync/async x 2 layers = 24/24 finite generic responses.
- Exact genuine admission: 14 fixed codes x direct/Reflect exact-class construction = 28/28.
- Construction-hostility matrix: 6 variants x 6 endpoints x sync/async x 2 layers = 144/144 generic responses; hosted classifier variants 6/6 null.
- Existing hostile matrix: 432/432 PASS.
- Existing genuine matrix: 336/336 PASS.
- Invocation/retry/unhandled/leak ledger: call 1 per request; retry 0; unhandled rejection 0; raw error/stack/identifier leak 0.

## Regression evidence

- focused hosted/API/stable: 71/71 PASS.
- targeted bridge/hosted/Postgres/operations/account: 134/134 PASS.
- full Node: PASS, 255/255.
- full frontend: PASS, 89/89 across 5 files.
- build: PASS, TypeScript plus Vite, 1,652 modules transformed.
- security/public/mutation/scope/runbook/boundary/diff: PASS; security 46/46, public 4/4, local mutations 32/32 and API read-only 28/28, scope 47 files, prohibited public identifiers 0, diff errors 0.
- source report hash: exact match.
- Gate: 7/7 executable checks PASS after this receipt carrier.

## Scope and mutation ledger

- changed paths: exactly the four allowed source/test paths, the correction Gate, and this receipt.
- external mutations: 0.
- Supabase/provider/account/project/billing/database/migration/credential/env/network/browser/session mutations: 0.
- deploy/push/release/public message: 0.
- O2: OPEN/LOCKED.
- Phase 3: 17/43.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## Rollback

Revert the final receipt carrier, then revert semantic correction `5d7d99a2dfa9845152dd02821749460671a03cee`. This restores the exact source carrier without touching external state because no external mutation occurred.

## Open boundaries

Fresh independent QA and fresh Release Audit remain required. Supabase/database parity, hosted activation, O2 evidence, Phase 3 progress, Cherry acceptance, deploy, push, release, and external completion remain unproven and unauthorized.

## False completion and learning receipt

`false_completion_count=9`

1. Builder GREEN is not fresh QA PASS.
2. Fresh QA PASS would not be Release Audit PASS.
3. Release Audit PASS would not be Cherry acceptance.
4. Local error-boundary proof is not hosted database proof.
5. Disabled code is not runtime activation.
6. A finite 503 is not successful bridge persistence.
7. A semantic commit is not deploy or release.
8. Phase 3 remains 17/43 and O2 remains OPEN/LOCKED.
9. `EXTERNAL_OUTCOME_COMPLETE` remains false.

Learning: a private WeakSet brand proves constructor execution, not exact construction authority. Brand admission must be gated at construction time by the exact `new.target`, while classification continues to verify the immutable expected instance shape. The smallest correction is therefore the two-line registration guard plus adversarial construction coverage at both API layers.
