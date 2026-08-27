# OUTCOME Phase 3 · Observer Bridge H3-H4 Option A Fresh UX & Product QA

Status: **FAIL / BUILDER CORRECTION REQUIRED / HOSTED WIRING AND O2 LOCKED**

Observed: 2026-08-27 KST

## Immutable boundary

- receipt carrier: commit `bd778037b368cd89bce5449776b8a787e4a7f686`, tree `fc5e21d8b8c140402a528b88691bd2d394cfd1d4`;
- semantic candidate: commit `99697927dbdd19269fb0f83ce603d36948bdb6b2`, tree `7d0adb6fef6be891240a836087db5fc0a2189d08`, direct parent `515c829e1bc2857535d405effbae0edacd0b6de0`;
- Planner authorization: commit `515c829e1bc2857535d405effbae0edacd0b6de0`, tree `ae741ba4c467931caa085d1b4b00522cfd814328`;
- failed candidate: commit `b0aef3a1af681c554d7c898e0e1d44a54466a456`, tree `04ba7320c7b9eb09f232f3f38d2f3aa5c50eb3dc`;
- authorization is an ancestor of the semantic candidate and the semantic candidate is the direct parent of the receipt carrier;
- semantic changed paths: exactly `5` — the migration, Postgres adapter/test and operations adapter/test;
- receipt-carrier-only changed paths: exactly `2` — the correction Gate and Builder receipt;
- migration SHA-256: `300cb7222329ff6b15daea10752f195748c8a593cd0290f7784c98fc95dd3953`;
- semantic source/test SHA-256, in Postgres adapter/test then operations adapter/test order: `a17d74e755c4b0247729e4d36c39a00ad8ff8b5b1fb77dc0fac13a4547d4b280`, `ee10bab903937ce1a6e2d7e2eea4bea2c339e50d8cfe77154fff9d6268588019`, `471812d650d695d6cb35a5fabb5250612c291d4688aaa22520585530d53eeda2`, `1e4049187abf1205207c22819630ac07e583b841221363764a5a9822deed3f2`.

The exact amendment, correction brief, Gate, failed QA report, Builder receipt, migration, adapters, tests, hosted and base architectures, and relevant Contract/Map boundaries were read from a fresh detached worktree. Builder statements were treated as claims. The candidate and receipt diffs pass `git diff --check`.

## Verdict

`FAIL`

The Option A correction closes the previously reported mutable-GUC, role compatibility, identity, future-skew and raw-purge defects in its exercised happy paths, but it is not semantically eligible for promotion. A fresh hostile PGlite execution found three independently reproducible defects: the persistence layer contradicts the approved six-state Observer Bridge vocabulary, tombstone accepts a nonexistent role/binding scope and advances durable truth, and restore accepts a caller role/binding unrelated to the stored manifest/tombstone coverage. The checked-in suites remain green because they do not make these cross-contract and cross-scope assertions.

This FAIL closes neither Release Audit nor O2, progress, Cherry acceptance, deploy/release, `MVP_SCOPE_CLOSED`, or `EXTERNAL_OUTCOME_COMPLETE`.

## Findings

### F1 · P1 · Postgres/operations status vocabulary contradicts the approved Observer Bridge contract

Expected: the exact approved finite vocabulary is `작업 준비 중`, `구현 진행 중`, `테스트 실행 중`, `검수 진행 중`, `결과 정리 중`, `응답 대기 중`. The base Observer Bridge implementation and its tests retain that exact set.

Actual: the new migration and both new adapters instead allow `기획 진행 중`, `구현 진행 중`, `테스트 실행 중`, `사용성·제품 검수 중`, `출시 감사 중`, `결정 대기 중`. The hosted architecture calls the prior local module's exact six-state vocabulary reusable, but the persistence candidate silently replaces four of six values without an approved amendment.

Fresh hostile execution under `outcome_bridge_backend` measured:

- approved `작업 준비 중` append denials: `1` (`input_invalid`);
- unapproved `기획 진행 중` append acceptances: `1` (`accepted`);
- existing domain suite still separately proves the approved six-state vocabulary.

Impact: a valid signed Observer Bridge event cannot be persisted, while an event outside the approved contract can become a fresh projection/NOW. This is semantic and operator-facing state drift, not a cosmetic label issue.

Correction owner: Planner must reconcile the conflicting hosted-planning vocabulary with the approved O2 amendment; Builder may then implement only the newly pinned exact vocabulary. No natural-language inference may select between them.

### F2 · P1 · Tombstone accepts a nonexistent role/binding scope and advances durable truth

Expected: tombstone is bound to an exact verified workspace/project/role/binding/source scope. A missing or cross-scope selector must fail atomically with no tombstone, audit row, or durable revision consumption.

Actual: `tombstone()` validates only finite field shapes and workspace durable revision, then inserts a tombstone whose only foreign key is workspace/project. It does not resolve an existing binding or source before deletion. A hostile call for existing `workspace-main/project-outcome` but nonexistent `release_audit` binding version `999` returned `tombstoned`, advanced durable revision from `1` to `2`, and wrote the corresponding tombstone/audit. The unrelated real Builder source survived, proving that no intended raw scope was deleted.

Fresh measurements:

- nonexistent-scope tombstone acceptances: `1`;
- durable revision inflation: `1`;
- unrelated real source rows surviving the claimed deletion: `1`;
- raw rows deleted from the claimed nonexistent scope: `0`.

Impact: a malformed or scope-drifted server transaction can create false deletion evidence, consume the workspace-wide durable revision and enter a fabricated tombstone into future backup coverage. This is outside the explicitly accepted full-backend-compromise residual risk: the mandatory composite-scope safeguards are intended to defend ordinary mistakes and scope drift.

Correction owner: Builder. Resolve and lock an exact existing binding/source deletion target, bind the tombstone/audit through composite constraints, require a measured intended purge set, and test missing/cross-role/cross-binding selectors for zero mutation.

### F3 · P1 · Restore receipt and audit are not bound to the caller's project/role/binding

Expected: restore validates an immutable manifest and complete tombstone coverage, then records a receipt for the exact restored scope. Caller-supplied project/role/binding cannot create restore truth for an unrelated scope.

Actual: `verifyRestore()` correctly matches workspace manifest, schema revision and tombstone coverage, but its input `project_id`, `role` and `binding_version` do not participate in manifest lookup, coverage comparison, re-delete selection or the restore receipt. They are used only to write the final audit row. `bridge_restore_receipts` itself stores workspace but no project/role/binding. With the fabricated `release_audit/999` tombstone in the manifest, a restore request declaring unrelated `ux_product_qa/777` returned `restore_verified` and wrote that mismatched audit row.

Fresh measurements:

- mismatched restore-scope acceptances: `1`;
- mismatched `restore_verified` audit rows: `1`;
- exact source/binding fields in restore receipt rows: `0`.

Impact: immutable manifest integrity does not make the operation's declared scope true. Operators can receive a valid-looking restore result and audit for a scope that was neither tombstoned nor restored, defeating exact-scope understandability and transactional recovery evidence.

Correction owner: Builder. Either define restore as workspace-wide and remove misleading project/role/binding inputs and scoped audit claims, or bind manifest, tombstone coverage, restore receipt and audit to one exact immutable scope. Add wrong-project/role/binding hostile tests.

## Positive independent evidence

### Authority, RLS and seven-path execution

- dedicated role: exactly one `outcome_bridge_backend`, `NOLOGIN=true`, `NOBYPASSRLS=true`;
- bridge tables with RLS enabled/forced: `11/11`; explicit policies: `12`;
- table-grant catalog rows: backend `32`, authenticated `1` (projection `SELECT` only), anon `0`;
- authenticated owner projection returned exactly its own workspace; the other owner returned exactly the other workspace; revoked/unknown access and anon access denied;
- backend effective role saw two scoped source rows before and after mutating custom GUCs for workspace/project/role/binding/source/key: `2/2`. Therefore custom GUC text no longer substitutes for authority; backend access remains global by the explicitly accepted Option A trust model;
- an unrelated schema read under the backend role denied in the checked-in hostile test;
- all seven adapter operations executed under `SET LOCAL ROLE outcome_bridge_backend`: activate, append, rotate, revoke, tombstone, manifest and restore. The latter two scope defects above prevent PASS;
- static hits across the migration and two adapters for `service_role`, `SECURITY DEFINER`, `auth.role()` or bridge custom `current_setting(...)`: `0`;
- credential/private-key/password/token literals in those three semantic sources: `0`.

The Builder receipt truthfully states the accepted residual risk: full compromise of the trusted backend process or effective-role credential defeats bridge-row isolation. It makes no post-compromise row-isolation claim. PGlite is PostgreSQL-compatible local evidence only; managed PostgreSQL/Supabase parity remains unproven.

### F2-F6 regression evidence

- manifest/restore tests deny missing manifest/tombstone, conflicting digest, stale revision, incomplete coverage and inaccessible evidence; valid exact coverage remains immutable under backend grants;
- event and audit identities are random UUIDv7-shaped values, ordering remains ledger revision/sequence, and no contiguity claim remains;
- forced storage, CAS and response-materialization failures persisted `0` event/audit/replay rows and advanced durable revision by `0`;
- future skew is exactly `5,000 ms`: below and at the boundary accept; `5,001 ms` denies before projection/NOW/progress publication;
- valid tombstone purges event, replay, source key, challenge, projection and source rows, retains the one-way deletion receipt digest, and a covered restore re-deletes injected raw source/key material with raw-resurrection count `0`;
- the hostile defects do not contradict those positive mechanisms; they show that fabricated or mismatched scope can still pass around them.

## Product, privacy and regression boundary

- feature defaults `off`, ingest defaults `disabled`, and mode defaults `read_only`;
- with no injected bridge, private projection GET returns finite `404 bridge_unavailable` without project presence; public mutation returns exact `405 read_only`;
- candidate modules have no production runtime import/wiring outside their own definitions; public dashboard GET and existing stable host remain unchanged;
- API errors are finite and non-enumerating; serialized adapter outputs contain prohibited prompt/result/chat/provider/session/thread/turn/path/credential/progress/Gate/approval/completion fields: `0` in the exercised scans/tests;
- this candidate adds no UI. Existing accessibility regressions retain semantic loading/status/alert regions, explicit labels, selected/current states, keyboard focus indicators and `44px` touch targets; frontend tests remain green. F1 nevertheless makes the new operator vocabulary internally contradictory and therefore not understandable enough to pass UX/Product QA;
- no Contract, Map, progress, `docs/ROADMAP 2.md`, public runtime, environment or external resource was modified by this QA.

## Fresh command ledger

| Command | Fresh result |
|---|---|
| focused Postgres + operations | `23/23 PASS` |
| observer domain/API/hosted/Postgres/operations + account Postgres | `69/69 PASS` |
| independent hostile Option A probe | all seven paths executed; `3` candidate defects reproduced |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local `32/32=405`; API `28/28 read_only`; page-body boundary `0/4` |
| `npm run test:security` | `29/29 PASS`; prohibited disclosures `0`; Gate evidence `0`; client env leak `0/6` |
| `npm test` | frontend `89/89` + Node `212/212` = `301/301 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `240/240 PASS` |
| `npm run build` | PASS; `1,652` modules transformed |
| `npm run check:scope` | PASS; `45` approved product/runtime/test files |
| `npm run check:runbook` | PASS |
| candidate/receipt `git diff --check` | PASS |

The Builder receipt's reproducible counts match these fresh measurements. Its external-mutation `0` statement is consistent with an unwired Git-only candidate but is not reconstructible from repository bytes alone and remains a Builder receipt claim. This QA performed external database/Supabase/provider/account/project/credential/env/network/browser/device/session/deploy/push/release/public-message operations: `0`.

## Rollback and locked outcomes

Rollback before any external application remains Git-only: revert receipt carrier `bd778037b368cd89bce5449776b8a787e4a7f686`, then semantic candidate `99697927dbdd19269fb0f83ce603d36948bdb6b2`. No down migration or post-apply production rollback was executed or independently proven, because remote application is forbidden and remains `0`.

O2 remains `OPEN/LOCKED`; Phase 3 remains `17/43`; Planner Routing T1-T7 remains locked; fresh Release Audit, Cherry acceptance, deployment and release remain open; `EXTERNAL_OUTCOME_COMPLETE=false`.

## ABANDON

**ABANDON:** candidate `99697927dbdd19269fb0f83ce603d36948bdb6b2` and receipt carrier `bd778037b368cd89bce5449776b8a787e4a7f686` are not eligible for Release Audit promotion until F1-F3 are corrected under a new exact authorization and immutable candidate. This QA FAIL is evidence only, not implementation, acceptance, O2 proof, progress, deploy/release or external completion authority.
