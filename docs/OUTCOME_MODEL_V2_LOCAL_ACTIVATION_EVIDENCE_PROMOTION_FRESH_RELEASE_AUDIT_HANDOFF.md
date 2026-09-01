# OUTCOME Model v2 local activation evidence promotion — fresh Release Audit handoff

## Role and immutable subject

You are a fresh independent OUTCOME Release Audit task. Audit only; do not modify the candidate or inherit Builder, QA or prior Audit conclusions.

- Evidence candidate commit: `354a7c602d2ec0c1621e13ccc405265936783d33`.
- Evidence candidate tree / parent: `544cd7a7f1e6350bc9911124226e62e93d353c00` / `7ec07d48958b95c780d03f0ade376b9faf5a66de`.
- Original corrected source candidate: `7ec07d48958b95c780d03f0ade376b9faf5a66de`.
- Builder evidence receipt: `docs/OUTCOME_MODEL_V2_LOCAL_ACTIVATION_EVIDENCE_PROMOTION_BUILDER_RECEIPT.md`.
- Current Gate: `GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md`.

The handoff carrier commit containing this file is not the audit subject. Reproduce the exact evidence candidate above in a fresh isolated checkout.

## Evidence pins to falsify

- Source Gate SHA-256: `d2062c8f6186df6dce1f15e019a7de4f1368315fe70cca30b29b32d0e23ebf54`.
- Evidence-promotion Builder handoff SHA-256: `2ddd727e70e9e2b511b2d5fed2dddc38d5e85fd9b6966c52061fee6b4b004c45`.
- Protected-binding correction receipt SHA-256: `6f716a5beb269eaf425674b537b8adc797c902cc2ebe271ab6cad7e08b29f2c7`.
- Fresh pre-consume re-QA report SHA-256: `5312466d07b46a7f0c50a15a48f3cd23cdbeb0099bd8af4af411b3d1445c7353`.
- O1 Builder / UX & Product QA / Release Audit receipts: `056abc1b072117fc69e635dcd51208f9ba49cab851dab19996004fd3e542fdcf` / `b9c3bea741d15b8bc4aaf405f19ff8eb756ce223a7cd323b918877db0d961154` / `7675339a19c553f480ce71779a515f294f2d5daf797f5815d5cbca37d95dea1d`.
- O1 Planner plan digest: `c875c14405396fba078cb1a4e7b44ab04f62f12d8e66b1a4069ccf9a8534f89e`.
- Corrected CAS checkpoint SHA-256: `3ca1d2da767372ec0af08bd9730120a05d3c1bf19cfa846bda37a81d48ba029d`.

## Required independent audit

1. Verify exact commit/tree/parent and that the evidence candidate changes only the activation Gate and Builder evidence receipt from its parent.
2. Verify implementation, protected adapter, tests and runtime code are byte-identical to parent `7ec07d48958b95c780d03f0ade376b9faf5a66de`.
3. Falsify Q1 evidence provenance, exact QA verdict/hash, negative-control semantics and authority boundary.
4. Falsify all four O1 role receipts: role coherence, seven allowlisted source classes, callback/receipt `1/1`, and duplicate/replay/persistent-setting/registry-provider-environment/unauthorized-transition/false-completion counters `0`.
5. Falsify O2 ordering and readback: readiness before archive; CAS invocation/mutation/retry `1/1/0`; registry revision `104`, mode `0600`, doctor clean, lock clear; successor active `3/3`, self-match `1`; predecessor v2 replaced and recoverably archived only afterward; other-role/private-output/replay/false-completion counts `0`.
6. Scan the candidate for private task/session identifiers, locators, credentials, raw prompts/results and local physical evidence paths. Require zero public survival.
7. Confirm A1 and C1 remain open and Preview, Production, deployment, release and Phase transition remain excluded.

Do not rerun operational canaries, mutate the protected registry, archive/unarchive tasks, change provider/environment/runtime state, deploy, release, accept or promote the Gate. Missing or non-reproducible evidence is a failure or precise safe hold, never an inferred pass.

## Terminal contract

Return `PASS_RELEASE_AUDIT_ONLY`, `FAIL_RELEASE_AUDIT_ONLY`, or `SAFE_HOLD_RELEASE_AUDIT`, with exact audit subject commit/tree, independent checks, findings, residual gaps, and `false_completion_count`.

Audit PASS authorizes only return to Planner for a separate Cherry acceptance decision. It does not close C1 or authorize Preview, Production, deployment, release or Phase transition.
