# OUTCOME Phase 3 · Observer Bridge Hosted H3-H4 Fresh QA

Status: **FAIL / BUILDER CORRECTION REQUIRED / HOSTED WIRING AND O2 LOCKED**

Observed: 2026-08-27 KST

## Immutable candidate verification

- candidate commit: `b0aef3a1af681c554d7c898e0e1d44a54466a456`
- candidate tree: `04ba7320c7b9eb09f232f3f38d2f3aa5c50eb3dc`
- direct parent: `515b3954f5dfc28a062f9b3026fcaacc3eba7336`
- exact changed paths: `6`
  - `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H3_H4_BUILDER_RECEIPT.md`
  - `server/phase3-observer-bridge-operations.mjs`
  - `server/phase3-observer-bridge-operations.test.mjs`
  - `server/phase3-observer-bridge-postgres.mjs`
  - `server/phase3-observer-bridge-postgres.test.mjs`
  - `supabase/migrations/20260827000756_observer_bridge.sql`
- SHA-256 in the same order:
  - `0b2404eb829287cac52b2914b8e2967d23dd72d03b275a72c33bba9bd1cf0c7d`
  - `d47decba6cb9037fabe752b0e15f910920abbe0711f1860203aec3a3b670b6f4`
  - `205b1ba4c8697b6e858646c33139199e943c63254b5658f3b63e7500654b6417`
  - `f7054c93a7a8250bd2b699581b801c3ce03bf2e9fa4ed8e70ae7b068f99d2468`
  - `0efd2b33eda6389e202d51af4cd24d8e6c53e15a6215d4dcf1c1d81fdc2e7efa`
  - `48f9c9c375821181ceed51c1ac82a76de26eba6287432b6cb883c969aaed1f5f`

Commit, tree, parent, six-path boundary, blob identity and file SHA-256 all matched the dispatch in a fresh detached worktree. The hosted architecture and Builder brief, prior H1-H2 correction QA and receipt, exact foundation migration/test, new migration, both adapters/tests, H1-H2/API/domain sources and Builder receipt were read directly. Builder statements were treated as claims.

## Verdict

`FAIL`

The candidate has independently reproducible authorization, operations, restore, revision-identity, retention and false-NOW defects. Existing suites remain green because the Postgres adapter success and rollback tests run as the PGlite superuser rather than under the declared ingest/operations roles, and the existing RLS test covers workspace/project only. A correction must precede any hosted wiring candidate.

This FAIL does not modify O2, Phase 3 progress, Contract, Map or Gates. It grants no QA PASS, Release Audit, Cherry acceptance, deployment, release or completion authority.

## Findings

### F1 · P1 · RLS scope is mutable by the role and omits role/binding/source predicates

Expected: ingest and operations authority is bound to one server-derived workspace/project/role/binding/source scope. A role must not be able to select another scope by changing session input.

Actual:

- all ingest/operations policies compare only `workspace_id` and `project_id` to custom settings;
- no RLS predicate binds `role`, `binding_version`, `source_ref`, `source_version` or `key_version`;
- an `outcome_bridge_ingest` session scoped to `workspace-main/project-shared` selected both Builder binding `1` and Planner binding `2`, then updated the Planner source to `revoked` (`1` unauthorized read row and `1` unauthorized write row);
- the same role executed `set_config('outcome.bridge.workspace_id','workspace-other',false)` and selected the other workspace source (`1` cross-workspace row).

Impact: database-role compromise, a future unsafe query surface, or scope-setting drift converts the RLS layer into caller-selected authority. `NOLOGIN`/`NOBYPASSRLS` does not make a mutable custom GUC immutable. This violates the requested SQL-bypass and exact-scope defense.

Correction owner: Builder. Bind scope through a trusted transaction role/context that the effective role cannot rewrite, and include every intended role/binding/source/key predicate in policies. Add hostile same-project lower-scope and post-`SET ROLE` GUC-rewrite tests.

### F2 · P1 · Declared operations role cannot execute the tombstone adapter

Expected: `outcome_bridge_operations` can atomically tombstone one exact scope, purge the intended raw rows and advance the durable revision.

Actual: running the checked-in `tombstone()` adapter inside a transaction with `SET LOCAL ROLE outcome_bridge_operations` returned mapped `access_denied`. Tombstone rows and durable revision remained `0`. The adapter deletes with predicates over challenge/event/replay tables, but the role lacks the read privileges needed by the operation. The existing success test runs as the database owner and therefore bypasses this role/grant incompatibility.

Adjacent evidence: operations has `SELECT` grants on audit/tombstone tables but no SELECT policies; seeded rows were silently invisible (`0/1` visible on each table). It therefore cannot independently inspect the receipts needed for restore/tombstone verification.

Impact: the production rollback/retention path fails precisely when needed, while the owner-run test reports green.

Correction owner: Builder. Make grants and policies match the exact transaction SQL without broadening scope, then run activate/append/rotate/revoke/tombstone/restore under their declared effective roles with forced RLS.

### F3 · P1 · Restore accepts caller assertions instead of a verified backup/tombstone manifest

Expected: restore verifies an immutable backup manifest and actual application of all tombstones before any read resumption; missing tombstone evidence must deny.

Actual:

- with `0` tombstone rows, `PostgresAdapter.verifyRestore(... tombstones_applied: true)` returned `restore_verified`;
- the in-memory operations module accepted any syntactically valid 64-hex `backup_digest` and the same caller boolean, without comparing the digest to stored/loaded manifest evidence;
- operations could not read the seeded tombstone/audit rows under its declared RLS policies.

Measured restore/no-resurrection bypass acceptances: `2`.

Impact: a caller can attest its own restore safety; deleted data resurrection is not prevented or detected by the candidate.

Correction owner: Builder. Add a versioned backup-manifest record/port, content-addressed tombstone set and transactionally verified restore receipt. Remove boolean-as-proof semantics.

### F4 · P1 · Rollback consumes event and audit identity IDs

Expected: constraint, adapter, clone or materialization failure consumes no durable revision or ID.

Actual: an append reached both identity inserts, response clone substitution then failed, and the transaction rolled back all rows and durable revision. PostgreSQL sequence semantics still advanced both `bridge_events_event_id_seq` and `bridge_audit_audit_id_seq`. Consumed identity sequences: `2`; persisted failed rows: `0`; durable revision inflation: `0`.

Impact: the Builder test name and requested invariant claim no ID consumption, but only row counts are asserted. Immutable evidence identifiers can contain unexplained gaps after failed transactions.

Correction owner: Planner/Builder. Either remove the no-ID-consumption requirement and explicitly define gaps as valid PostgreSQL behavior, or replace sequence-derived evidence identity with a transaction-safe contract. Add sequence-state assertions.

### F5 · P1 · A one-hour future observation is reported as fresh NOW

Expected: future/clock-skewed observations fail closed or become unavailable; they must never produce current status.

Actual: with clock `00:00`, `observed_at=01:00` and `expires_at=01:01`, H4 projection returned `status_code='구현 진행 중'` and `freshness_class='fresh'`. Future false-NOW acceptances: `1`.

Impact: a clock error or forged future time can hold a false current activity projection until the future expiry.

Correction owner: Builder. Pin an allowed skew interval, reject observations beyond it, and test exact negative-age boundaries.

### F6 · P2 · Tombstone retains raw source reference and certificate digest

Expected: after tombstone, raw scoped source/key/challenge/replay/event material is purged and only a safe deletion receipt remains.

Actual: `tombstone()` deleted events, replay, keys, challenges and projection, but retained the source row with `state='deleted'`, raw `source_ref` and `certificate_digest`. Retained scoped identifier values: `2`.

Impact: retention is incomplete and restore handling has no proof that retained lifecycle identifiers are intended safe residue.

Correction owner: Planner/Builder. Specify the retained-source privacy class explicitly or purge/redact it transactionally and cover restore replay.

## Positive evidence and measured catalog

- exact foundation then candidate migration applied in PGlite;
- bridge tables: `9`; RLS enabled: `9`; forced RLS: `9`;
- explicit policies: `23` = ALL `8`, SELECT `5`, INSERT `5`, DELETE `5`;
- table grant rows excluding owner: authenticated `1`, ingest `19`, operations `21`; anon `0`;
- authenticated grants: projection SELECT only; raw tables and all ordinary authenticated writes denied;
- both server roles: `NOLOGIN=true`, `NOBYPASSRLS=true`;
- constraints: CHECK `58`, FK `9`, PK `9`, UNIQUE `6`, NOT NULL catalog constraints `100`; nullable workspace/project/role/binding scoped columns `0`;
- same-project two-workspace authenticated owner: own projection only; other/unknown/revoked rows `0`; anon access denied;
- checked source/migration hits for `SECURITY DEFINER`, `auth.role()`, `user_metadata`, `service_role`: `0`;
- malformed/null/finite-vocabulary/time/cache/FK/unique hostile statements denied: `12/12`;
- activation, rotation, revocation and tombstone forced-failure durable row/revision rollback checks: `4/4` passed;
- missing schema row returned `schema_mismatch` with failed-write rows `0`;
- adapter SQL uses fixed parameterized statements; its only dynamic identifier is the internal five-member tombstone table allowlist, not caller input.

PGlite reproduced role/grant/RLS and transaction behavior, but no local `psql`, `postgres` or `initdb` binary was available. The permitted dependency boundary excluded Docker and remote Supabase. Real managed PostgreSQL/Supabase parity therefore remains unproven in addition to the concrete failures above; no inference upgrades this FAIL into hosted proof.

## Privacy and authority counts

- unauthorized lower-scope/cross-workspace row hits in hostile role SQL: `3` (`2` reads, `1` write);
- unauthorized authenticated projection rows across other/unknown/revoked cases: `0`;
- anon readable bridge rows: `0`;
- direct ordinary authenticated write acceptances: `0`;
- prohibited prompt/result/chat/provider/session/thread/turn/path/credential/private-key fields in inspected API-like adapter outputs, audit/metrics outputs and finite projection serialization: `0`;
- progress/Gate/approval/completion authority hits in inspected source outputs: `0`;
- restore-without-recorded-tombstone acceptances: `2`;
- rollback row/revision leaks in asserted adapter failures: `0`; rollback identity-sequence consumptions: `2`;
- false future NOW acceptances: `1`;
- retained tombstoned source/certificate identifiers: `2`.

## Test and regression ledger

| Command | Exact result |
| --- | --- |
| `node --test server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs` | `17/17 PASS` |
| domain + H1/H2/API + H3/H4 + account-Postgres focused set | `63/63 PASS` |
| fresh independent temporary hostile probe | `13/13 PASS`; includes six candidate defect reproductions and catalog/constraint/rollback checks |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | PASS; local `32/32=405`; API `read_only` JSON `28/28`; empty page bodies `0/4` |
| `npm run test:security` | `29/29 PASS`; snapshot prohibited disclosures `0`; Gate evidence `0`; client payload leaks `0/6` |
| `npm test` | frontend `89/89` plus Node `206/206`, total `295/295 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `234/234 PASS` |
| `npm run build` | PASS; `1652` modules; expected JS/CSS assets |
| `npm run check:scope` | PASS; `45` product/runtime/test files |
| `npm run check:runbook` | PASS |
| candidate `git diff --check` and final report `git diff --check` | PASS |

The Builder receipt's `npm test` Node count `205` is stale; the exact rerun produced `206`. This does not cause the verdict, but the report uses remeasured values.

## Operation ledger and residual boundary

- fresh isolated worktrees: `1`;
- temporary QA files outside the repository: `3` (Gate ledger, hostile probe, catalog metrics);
- temporary dependency symlink attach/remove: `1/1`;
- candidate source/test mutations by QA: `0`;
- repository mutations: exactly this report and its single commit;
- dependency installs: `0`;
- actual external database/Supabase/project/network/MCP operations: `0`;
- provider/account/session/browser/device/companion/private-store/credential operations: `0`;
- environment/config/secret mutations: `0`;
- push/deploy/release/external messages: `0`;
- canonical integration and Contract/Map/Gate/progress mutations: `0`.

Rollback remains removal of the additive, unwired candidate before application. There is no executed or independently verified down migration or post-apply production rollback. Hosted wiring, real PostgreSQL/Supabase RLS proof, real backup/restore, H5 correction QA, hosted auth/persistence, two-viewer O2, Release Audit and Cherry acceptance remain open and locked.

This report's own commit, tree and SHA-256 are measured after the single-file commit and returned outside this file to avoid a circular identity.

## ABANDON

**ABANDON:** candidate `b0aef3a1af681c554d7c898e0e1d44a54466a456` is not eligible for hosted wiring planning or promotion. This FAIL is independent QA evidence only; it is not O2 proof, progress, Gate closure, Release Audit, Cherry acceptance, deployment, release or external completion authority.
