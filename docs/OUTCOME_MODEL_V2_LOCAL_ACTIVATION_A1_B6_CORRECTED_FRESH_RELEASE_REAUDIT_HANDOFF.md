# OUTCOME Model v2 local activation A1 B6 correction — fresh Release re-audit handoff

## Role and changed-evidence subject

You are a fresh independent OUTCOME Release Audit task. Audit only; do not modify the candidate or inherit Builder conclusions.

- Corrected candidate commit: `a5703600eefa974836f71b4ac267970a47ec2091`.
- Candidate tree / parent: `1700a3e7900bbf30cfc0eeb5fb8fb241e4253170` / `4fbe7fcc891f122c253fda21862e40490e74011b`.
- Immutable implementation source: `7ec07d48958b95c780d03f0ade376b9faf5a66de`.
- B6 correction receipt SHA-256: `55dc6649f239aaa2523bee4f1399afffb5ca89c81d4f5030d408e6a7b9cae78e`.
- B6 correction handoff SHA-256: `b5d7f2ce596ebccadba01175920b148684e2e3e0303cedd0a4f934441b546054`.

The handoff carrier commit containing this file is not the audit subject.

## Preserved failed Audit history

- Release Audit v19 returned `FAIL_RELEASE_AUDIT_ONLY` for subject `354a7c602d2ec0c1621e13ccc405265936783d33`; its checkpoint recorded Q1 EXPECT, Gate status and B1 CHECK failures.
- Release Audit v21 returned `FAIL_RELEASE_AUDIT_ONLY` for subject `7923b834d737e306e085f2250e439de8c65a1c0c`; checkpoint SHA-256 `54641911e60ebc0e7b088cd25e44191049f28745beb1ac690e4c615463e9b135`. It reproduced v19, verified corrected B1, and found B6's focused tests `5/5` followed by `cold_compile_required / source_digest_drift`.

This is a changed-evidence fresh re-audit after the B6 correction. Neither prior failure is erased, superseded or described as unobservable.

## Required independent re-audit

1. Verify exact candidate commit/tree/parent and its two-path delta: B6's Gate CHECK and the B6 correction receipt only.
2. Reproduce v21's B6 RED against subject `7923b834d737e306e085f2250e439de8c65a1c0c`: focused tests `5/5`, then canary exit `2`, `cold_compile_required / source_digest_drift`.
3. Run corrected B6 CHECK exactly as written. Require focused tests `5/5`, `locally_consumed`, projection-only authority, privacy survival `0`, and every retry/mutation/false-completion counter `0`.
4. Run corrected B1 CHECK exactly as written. Require `19/19`, the same locally consumed plan digest, projection-only authority and zero safety counters.
5. Confirm both checks reconstruct exact implementation source plus immutable activation-Gate input SHA-256 `3432c69edc63f40547454090fbc0e4c381ec4addde6e7d68100a25e28b8b4c34`, preserve hostile digest-drift controls and remove disposable exports.
6. Verify B1, status, Q1/O1/O2 evidence and all implementation/runtime/adapter/test bytes are unchanged; scan public evidence for private identifiers, locators, credentials and physical paths.
7. Confirm A1 and C1 remain open and Preview, Production, deployment, release, Phase transition and Cherry acceptance remain excluded.

Do not rerun operational role canaries, mutate registry/runtime/provider/environment state, change refs, archive tasks, deploy, release, accept or close A1/C1. Missing or non-reproducible evidence is a failure or precise safe hold, never an inferred pass.

## Terminal contract

Return `PASS_RELEASE_AUDIT_ONLY`, `FAIL_RELEASE_AUDIT_ONLY`, or `SAFE_HOLD_RELEASE_AUDIT`, with exact subject pins, independent checks, findings, residual gaps and `false_completion_count`.

A PASS authorizes only return to Planner for a separate Cherry acceptance decision. It does not close C1 or authorize Preview, Production, deployment, release or Phase transition.
