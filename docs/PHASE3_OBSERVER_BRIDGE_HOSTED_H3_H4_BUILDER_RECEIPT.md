# Phase 3 Observer Bridge H3-H4 Option A QA Correction Builder Receipt

Status: `HOSTED_CODE_CANDIDATE_READY_ONLY`

## Immutable boundary

- Planner correction authorization: commit `a9d8a180701bf9e976e4eae49d13a70ed24d1e73`, tree `6063c6f8012436583250aad112f61a5ad21edc57`.
- Authorization parent / QA FAIL carrier: commit `ee149ee855477479fc8c17e26bffec0c0e3e4b19`, tree `c3438690630bf5baf66a8def00526e09db433ce2`.
- QA report SHA-256: `2fd54b6f3fd148a9ad8e05547d1ee7d115c83dd173de2401072c1f8136d72584`.
- QA correction amendment SHA-256: `5afd84983536867a2547b6b7f473346ac9898a7a9ae284c409581eb5e83f85f8`.
- Failed semantic/receipt history: `99697927dbdd19269fb0f83ce603d36948bdb6b2` / `bd778037b368cd89bce5449776b8a787e4a7f686`.
- Exact authorization objects and hashes were verified in a new isolated worktree before mutation. Object drift: 0; scope drift: 0.
- QA correction semantic candidate: commit `5a368643aa33348673c5d90511a1c28c39baf1c5`, tree `0245ed2ff9e8a3d204b33232ce14faeafce2bac3`, parent `a9d8a180701bf9e976e4eae49d13a70ed24d1e73`.
- Exact corrected migration SHA-256: `f45201e873962b6ade35af6e8c8964c8bca312795d885ac422515daca77d7258`.

## Q1-Q3 RED-first evidence

Before implementation, the new adversarial tests ran with:

```text
node --test --test-name-pattern='canonical six-state persistence vocabulary|tombstone exact target|restore exact scope' server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs
tests 4; pass 0; fail 4; duration 1755.393 ms
```

- Q1 RED: both persistence adapters rejected approved canonical states.
- Q2 RED: one nonexistent `release_audit`/binding target produced one tombstone, one audit, and one durable-revision increment while purging zero intended rows.
- Q3 RED: one caller scope unrelated to the stored tombstone/manifest was accepted and produced restore truth.
- The same four named tests then passed 4/4 in 1813.694 ms without weakening the assertions.

## Corrected contract and effective-role evidence

- Q1 canonical vocabulary is exactly `작업 준비 중 / 구현 진행 중 / 테스트 실행 중 / 검수 진행 중 / 결과 정리 중 / 응답 대기 중` in the migration and both adapters. All six persist/project; the four rejected replacements fail before publication.
- Q2 adds an immutable private source-scope ledger. Source, tombstone, scoped audit, manifest, and receipt rows form a composite workspace/project/role/binding/source/version FK chain.
- Tombstone resolves and locks the exact retained source row, purges only that six-field scope, requires exactly one deleted source row, and advances durable revision only afterward. Missing project/role/binding/source/version, cross-workspace combinations, missing required fields, direct fabricated tombstone rows, and zero-target sets produce zero tombstone/audit/receipt/revision or unrelated mutation.
- Q3 manifests bind one exact tombstone including deletion revision and coverage digest. Restore lookup, coverage, re-delete, receipt, and audit use the same immutable exact scope. Wrong project/role/binding/source/source-version/deletion-revision fails before receipt/audit creation.
- Restore re-delete remains exact-scope and raw resurrection count is 0. Source/key/certificate-bearing rows are purged; only the private immutable scope coordinate and one-way deletion digest remain for recovery proof.
- Effective-role operation matrix remains 7/7: activate, append, rotate, revoke, tombstone, manifest, restore, all through `SET LOCAL ROLE outcome_bridge_backend` and forced RLS.
- Executed catalog: 12/12 private bridge tables have RLS enabled and forced; 13 policies; exactly one bridge backend role with `NOLOGIN` and `NOBYPASSRLS`; `authenticated` retains only owner-filtered projection SELECT; `anon` has no bridge grant.
- Prior F2-F6 hostile proof remains GREEN: mutable GUC substitution RED -> GREEN with substitution denied as authority; cross-scope adapter selectors/unrelated schema denied; missing, conflicting, stale, incomplete, inaccessible manifest evidence fails closed; UUIDv7-shaped random identity; 5000 ms below/at/above future boundary; raw resurrection 0.
- Operational source scan hits for `service_role`, `SECURITY DEFINER`, `auth.role()`, or bridge custom `current_setting(...)`: 0. Credential/token/password scan hits across the five semantic paths: 0.

## GREEN and proportional regression

| Command | Measured result |
|---|---|
| Q1-Q3 focused adversarial selector | 4/4 PASS; 1813.694 ms |
| Postgres + operations focused files | 27/27 PASS; 7157.107 ms |
| observer domain/API/hosted/Postgres/operations + account Postgres | 73/73 PASS; 7372.805 ms |
| `npm run test:package-model` | 39/39 PASS; 701.217 ms |
| `npm run test:security` | 29/29 PASS; prohibited disclosures 0; Gate evidence 0; client env leaks 0/6 |
| `npm run check:mutations` | local 32/32 exact 405; API 28/28 `read_only`; page-body boundary 0/4 |
| `npm test` | frontend 89/89 + Node 216/216 = 305/305 PASS |
| `node --test scripts/*.test.mjs server/*.test.mjs` | 244/244 PASS; 7376.079 ms |
| `npm run build` | PASS; 1652 modules transformed |
| `npm run check:scope` | PASS; 45 approved product/runtime/test files |
| `npm run check:runbook` | PASS |
| `npm run check:public-boundary` | PASS; API/HTML/bundle/rendered UI prohibited identifiers 0 |
| `git diff --check` | PASS |

The database evidence is actual local PostgreSQL-compatible PGlite execution of the exact foundation and corrected migration under the declared effective role and forced RLS. It is not a remote or managed-database result.

## Exact changed paths

- `supabase/migrations/20260827000756_observer_bridge.sql`
- `server/phase3-observer-bridge-postgres.mjs`
- `server/phase3-observer-bridge-postgres.test.mjs`
- `server/phase3-observer-bridge-operations.mjs`
- `server/phase3-observer-bridge-operations.test.mjs`
- `GATES_PHASE3_OBSERVER_BRIDGE_H3_H4_OPTION_A_CORRECTION.md`
- `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md`

## Rollback, residual risk, and locked outcomes

- Rollback before external wiring is Git-only: revert this receipt carrier, then revert semantic commit `5a368643aa33348673c5d90511a1c28c39baf1c5`. No external compensation exists or is needed.
- Accepted residual risk: full compromise of the trusted backend process or its effective-role credential defeats isolation among bridge rows. Composite relations defend normal scope drift; they do not claim containment after total backend compromise.
- PGlite is PostgreSQL-compatible local evidence; managed Supabase parity, hosted wiring, and real persistence remain unproven. The feature remains disabled by default and locally unwired.
- Fresh UX & Product Re-QA and later fresh Release Audit remain required. This Builder did not self-QA, self-audit, accept, promote, deploy, or release.
- O2 remains `OPEN/LOCKED`; Phase 3 remains `17/43`; `EXTERNAL_OUTCOME_COMPLETE=false`. Contract, Map, progress, Cherry acceptance, and release state were not modified.
- External mutation ledger: remote DB/Supabase/provider/account/project 0; credential/env/network 0; browser/device/session 0; hosted wiring/deploy/push/release/public message 0. Total external operations: 0.

## False-completion and learning receipt

`false_completion_count: 6`

1. Canonical vocabulary GREEN is not complete recovery correctness.
2. Adapter target validation without relational schema binding is insufficient.
3. Exact manifest integrity does not authorize a mismatched caller scope.
4. Local Builder GREEN is not fresh Product Re-QA.
5. Re-QA is not Release Audit, O2 proof, Cherry acceptance, deployment, or release.
6. A dedicated backend role does not preserve row isolation after full process or credential compromise.

`learning_receipt:` deletion truth needs a locked nonempty target before revision consumption; exact recovery scope must be carried by schema relations, coverage, receipt, re-delete and audit together; canonical state vocabularies are persistence contracts rather than display aliases.
