# OUTCOME Phase 3 · Observer Bridge H3-H4 Option A Fresh Semantic UX & Product Re-QA

Status: **PASS_INDEPENDENT_QA_ONLY / RELEASE AUDIT, HOSTED WIRING, AND O2 OPEN**

Observed: 2026-08-27 KST

## Immutable boundary

- receipt carrier: commit `863fb61fa076482bfe5b7e2b3535def9509e463a`, tree `3f820d2f1e6a8224a3f7e1fb612ed35df563e842`;
- semantic candidate: commit `5a368643aa33348673c5d90511a1c28c39baf1c5`, tree `0245ed2ff9e8a3d204b33232ce14faeafce2bac3`, direct parent `a9d8a180701bf9e976e4eae49d13a70ed24d1e73`;
- Planner correction authorization: commit `a9d8a180701bf9e976e4eae49d13a70ed24d1e73`, tree `6063c6f8012436583250aad112f61a5ad21edc57`, direct parent `ee149ee855477479fc8c17e26bffec0c0e3e4b19`;
- prior QA FAIL carrier: commit `ee149ee855477479fc8c17e26bffec0c0e3e4b19`, tree `c3438690630bf5baf66a8def00526e09db433ce2`;
- prior failed semantic candidate: `99697927dbdd19269fb0f83ce603d36948bdb6b2`;
- prior QA report SHA-256: `2fd54b6f3fd148a9ad8e05547d1ee7d115c83dd173de2401072c1f8136d72584`;
- correction amendment SHA-256: `5afd84983536867a2547b6b7f473346ac9898a7a9ae284c409581eb5e83f85f8`;
- corrected migration SHA-256: `f45201e873962b6ade35af6e8c8964c8bca312795d885ac422515daca77d7258`.

All named objects exist. Authorization is the semantic candidate's direct parent, and the semantic candidate is the receipt carrier's direct parent. Semantic changed paths are exactly `5`: the migration, Postgres adapter/test, and operations adapter/test. Receipt-carrier-only changed paths are exactly `2`: the correction Gate and Builder receipt. Both diffs pass `git diff --check`.

The O2 amendment, Option A authority and QA-correction amendments, correction brief, Gate, prior QA FAIL, new Builder receipt, exact migration, both adapters and tests, base bridge contract, and hosted architecture were read from a new detached worktree. Builder claims were treated as hypotheses and remeasured.

## Verdict

`PASS_INDEPENDENT_QA_ONLY`

The corrected candidate closes prior QA findings F1-F3 at the approved semantic boundary without weakening the hostile Option A/F2-F6 evidence. The exact canonical six-state vocabulary persists and projects, nonexistent or cross-scope tombstone targets cannot create deletion truth, and restore truth is bound to the same exact immutable project/role/binding/source/version/deletion scope as its manifest, coverage, receipt, re-delete, and audit.

This is a local PostgreSQL-compatible semantic and product-contract PASS only. It is not managed PostgreSQL/Supabase parity, hosted wiring, a real signed companion flow, O2 evidence, Release Audit, progress, Cherry acceptance, deploy, release, or external completion.

## Prior F1-F3 correction evidence

### F1 · Canonical activity meaning is exact and understandable

The approved vocabulary remains exactly:

1. `작업 준비 중`
2. `구현 진행 중`
3. `테스트 실행 중`
4. `검수 진행 중`
5. `결과 정리 중`
6. `응답 대기 중`

Fresh focused execution accepted all six through the Postgres event/projection path and preserved each exact primitive string in the operations projection. It denied all four unapproved replacements — `기획 진행 중`, `사용성·제품 검수 중`, `출시 감사 중`, `결정 대기 중` — before durable publication. The migration has the same exact allowlist for event and projection rows. The separate signed-domain/hosted tests retain Ed25519 semantic-field coverage and the same vocabulary. No translation, display-alias, or normalization ambiguity was introduced.

Focused correction selector: `4/4 PASS`; persisted canonical events: `6`; rejected replacement publications: `0`.

### F2 · Tombstone requires one locked, nonempty exact target

The adapter resolves and locks one existing non-deleted source using the exact six-field composite scope before writing a tombstone. The schema binds source, tombstone, scoped audit, manifest, and receipt through workspace/project/role/binding/source/version relations. Source deletion must return exactly one row before durable revision and audit publication.

Fresh hostile probes covered wrong project, role, binding version, source reference, source version, and workspace, plus an absent required source field and a fabricated direct SQL tombstone. Before the valid operation, measured state remained:

- tombstones `0`;
- scoped audits `0`;
- restore receipts `0`;
- durable revision `0`;
- unrelated sources `2`.

An additional fresh transaction probe forced storage failure at the final tombstone audit insertion after the earlier delete statements. The transaction rolled back to tombstones `0`, audits `0`, sources `2`, durable revision `0`. A stale-CAS loser against a second exact source also mutated nothing; only the valid winner produced tombstone `1`, audit `1`, durable revision `1`, while leaving the unrelated source present. This independently covers zero-target, forced-failure, and CAS/race-loser atomicity.

### F3 · Restore truth is exact-scope and privacy-safe

Manifest lookup, tombstone coverage, restore re-delete, receipt, and final audit all use the same immutable workspace/project/role/binding/source/source-version/deletion-revision scope. The restore receipt persists all seven scope coordinates and has a composite foreign key to the exact manifest.

Fresh hostile probes for wrong project, role, binding, source, source version, and deletion revision produced restore receipts `0` and `restore_verified` audits `0`. Missing fields are rejected by exact-own-field validation before evidence lookup. Missing, conflicting, stale, incomplete, and inaccessible manifest evidence fails closed. The valid restore produced one scope-equal receipt, remained read-only with ingest disabled, re-deleted injected source/key material, and returned raw resurrection count `0`.

Retained recovery evidence is limited to the required opaque scope coordinate, immutable revisions, finite classes, and one-way digests. Raw event, replay, key, certificate-bearing source, challenge, and projection rows are purged/re-deleted; no private key, credential, provider/session identifier, path, prompt, result, chat, progress, Gate, approval, or completion authority is projected.

## Hostile Option A and F2-F6 evidence

- Effective roles/RLS: exactly one `outcome_bridge_backend`; `NOLOGIN=true`, `NOBYPASSRLS=true`; all `12/12` bridge tables have RLS enabled and forced; explicit policies `13`.
- Least privilege: `anon` has no bridge grant; `authenticated` has owner-filtered projection `SELECT` only; backend event `UPDATE` is denied, audit/manifest mutation is append-only, and unrelated-schema access is denied.
- Seven operations paths execute under `SET LOCAL ROLE outcome_bridge_backend`: activate, append, rotate, revoke, tombstone, manifest, restore — `7/7` exercised.
- Mutable GUCs are non-authoritative: changing bridge-shaped GUC text does not change backend scope visibility; operational migration/adapters contain bridge custom `current_setting(...)` authority hits `0`.
- Immutable recovery: manifest and exact coverage cannot be updated through the effective role; missing/conflicting/stale/incomplete/inaccessible cases fail closed.
- Opaque identity: event and audit identities are random UUIDv7-shaped values; order is ledger revision/sequence, with no contiguous-row-ID claim. Forced transaction and response-materialization failures publish IDs/rows/revisions `0`.
- Clock boundary: future skew is exactly `5,000ms`; `4,999ms` and `5,000ms` accept, `5,001ms` denies with no extra projection/NOW/revision.
- Tombstone privacy: raw source/key/certificate-bearing rows are purged; restore re-delete leaves raw resurrection `0`.
- Residual truth: full compromise of the trusted backend process or effective-role credential defeats bridge-row isolation. This accepted Option A MVP risk is stated accurately and is not represented as an RLS containment property.

## Public, product, and privacy boundary

- Feature defaults `off`; ingest defaults `disabled`; mode defaults `read_only`; the candidate remains locally unwired.
- No injected bridge yields finite `bridge_unavailable` without private-project presence.
- Public mutation matrix remains local `32/32 = 405`, API `28/28 read_only`, empty page-body boundary `0/4`.
- Public API/HTML/bundle/rendered-UI prohibited identifiers: `0`.
- Security scans report prohibited disclosures `0`, Gate evidence fields `0`, and client-environment leaks `0/6`.
- The candidate adds no UI. Existing loading/status/alert semantics, labels, keyboard/focus behavior, and touch-target regressions remain green. The corrected state vocabulary is consistent across the signed domain, persistence constraint, adapter, and projection layers.
- No remote database, Supabase, provider, account, project, credential, environment, network, browser, device, session, hosted wiring, deploy, push, release, or public-message operation was performed by this Re-QA.

## Fresh command ledger

| Command/probe | Fresh result |
|---|---|
| exact F1-F3 selector | `4/4 PASS` |
| Postgres + operations files | `27/27 PASS` |
| observer domain/API/hosted/Postgres/operations + account Postgres | `73/73 PASS` |
| ad-hoc tombstone forced-failure/CAS probe | PASS; failure/loser mutation `0`, winner tombstone/audit/revision `1/1/1` |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run test:security` | `29/29 PASS`; privacy counters `0` |
| `npm run check:mutations` | local `32/32=405`; API `28/28 read_only`; empty page boundary `0/4` |
| frontend Vitest | `89/89 PASS` |
| `node --test server/*.test.mjs` | `216/216 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `244/244 PASS` |
| `npm run build` | PASS; `1,652` modules transformed |
| `npm run check:scope` | PASS; `45` product/runtime/test files |
| `npm run check:runbook` | PASS |
| `npm run check:public-boundary` | PASS; prohibited identifiers `0` |
| semantic/receipt `git diff --check` | PASS |

The Builder receipt's command counts, exact migration hash, changed-path scope, local PGlite qualification, accepted residual risk, and Git-only rollback are accurate against this fresh run. Its external-operation count is consistent with the unwired repository candidate but remains a Builder-recorded operational claim rather than something reconstructible solely from Git bytes.

## Rollback and locked outcomes

Before any separately authorized external application, rollback remains Git-only: revert receipt carrier `863fb61fa076482bfe5b7e2b3535def9509e463a`, then semantic candidate `5a368643aa33348673c5d90511a1c28c39baf1c5`. No down migration or post-apply rollback was executed or proven because external application remained forbidden and `0`.

Fresh Release Audit remains open and must inspect this same promoted receipt carrier, semantic candidate, artifact/privacy/runtime/rollback/scope evidence. O2 remains `OPEN/LOCKED`; Phase 3 remains `17/43`; Planner Routing T1-T7 remains locked; Cherry acceptance, hosted wiring, deploy, release, and external completion remain open; `EXTERNAL_OUTCOME_COMPLETE=false`.

## ABANDON

**ABANDON:** `PASS_INDEPENDENT_QA_ONLY` validates only the immutable local candidate's semantic UX/Product contract and proportional regressions. It does not close Release Audit, managed-database parity, hosted runtime, real signed companion/two-viewer O2, progress, Cherry acceptance, deployment, release, `MVP_SCOPE_CLOSED`, or external completion.
