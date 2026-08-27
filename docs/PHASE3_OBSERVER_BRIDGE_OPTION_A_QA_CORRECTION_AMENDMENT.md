# Phase 3 Observer Bridge · Option A QA Correction Amendment

Status: **PLANNER CORRECTION AUTHORIZED / LOCAL ONLY / RELEASE AUDIT LOCKED**

Decision date: 2026-08-27 KST

## Exact evidence boundary

- failed QA report carrier: `ee149ee855477479fc8c17e26bffec0c0e3e4b19`
- failed QA report tree: `c3438690630bf5baf66a8def00526e09db433ce2`
- failed QA report SHA-256: `2fd54b6f3fd148a9ad8e05547d1ee7d115c83dd173de2401072c1f8136d72584`
- failed receipt carrier: `bd778037b368cd89bce5449776b8a787e4a7f686`
- failed semantic candidate: `99697927dbdd19269fb0f83ce603d36948bdb6b2`

The independent QA verdict is `FAIL`. This amendment resolves the one Planner-owned semantic ambiguity and fixes the Builder correction contract for all three findings. It makes no product correction and grants no Release Audit, hosted wiring, provider/database application, O2 or progress authority.

## Q1 · Canonical finite status vocabulary

The exact approved six-state Observer Bridge vocabulary remains:

1. `작업 준비 중`
2. `구현 진행 중`
3. `테스트 실행 중`
4. `검수 진행 중`
5. `결과 정리 중`
6. `응답 대기 중`

The hosted candidate must preserve these exact values end to end. `기획 진행 중`, `사용성·제품 검수 중`, `출시 감사 중`, `결정 대기 중` are not approved persistence replacements and must be rejected by the migration and adapters. This is a contract reconciliation, not a translation or display alias.

## Q2 · Tombstone exact-target existence

Tombstone is an exact project/role/binding/source deletion operation, not a declaration that a caller-provided scope was deleted. Before durable revision consumption, it must resolve and lock an existing binding and active or retained source target through composite scope relations. The measured purge set must be nonempty and correspond to that exact target. Missing project, role, binding, source or version; any cross-scope combination; or a zero-target purge fails atomically with no tombstone, audit, deletion receipt, durable revision or unrelated-row mutation.

The tombstone row, deletion receipt and audit must remain bound to the same immutable exact scope. Workspace/project-only foreign keys are insufficient for the role/binding/source claim.

## Q3 · Restore is exact-scope, not workspace-wide

For the MVP, restore verification remains exact project/role/binding/source scope. Do not reinterpret it as workspace-wide.

The immutable manifest, tombstone coverage digest, restore receipt, re-delete set and final audit must bind the same workspace/project/role/binding/source and relevant versions. A caller scope is not authority. Wrong or absent project, role, binding, source or version fails before receipt/audit creation and before reads resume. A valid manifest for one scope cannot authorize a `restore_verified` result or audit for another scope.

The restore receipt schema must carry enough immutable scope fields to prove which exact tombstoned scope was verified. If legacy rows cannot meet this contract, feature-off/fail-closed is required; silent inference is forbidden.

## Builder correction acceptance

- Add RED-first tests reproducing QA F1-F3 exactly, then GREEN them without weakening F2-F6 or public/privacy boundaries.
- Execute the corrected exact migration under declared effective roles and forced RLS.
- Keep changes within the previously approved migration, two adapters, two tests, Gate and Builder receipt.
- Record zero durable revision, tombstone, receipt, audit and unrelated mutation for every missing/cross-scope/zero-target denial.
- Preserve Option A residual-risk wording and all prior local regression evidence.
- Produce a new semantic candidate and new receipt carrier; the failed candidate/receipt remain historical evidence.

## Locked boundary

No remote DB/Supabase/provider/account/credential/environment/network/browser/device/session operation, deploy, push, release, hosted wiring or real data is authorized. O2 remains `OPEN/LOCKED`, Phase 3 remains `17/43`, Release Audit remains locked until fresh UX & Product Re-QA PASS, and `EXTERNAL_OUTCOME_COMPLETE=false`.

## ABANDON

**ABANDON:** this amendment resolves status and exact-scope semantics only. It is not a correction implementation, QA PASS, Release Audit, O2 proof, progress, Cherry acceptance, deploy, release or external completion.
