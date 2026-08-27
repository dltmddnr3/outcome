# Phase 3 Observer Bridge Hosted H3-H4 Builder Receipt

Status: `HOSTED_H3_H4_CODE_CANDIDATE_READY_ONLY`

## Immutable source boundary

- Authorized source commit: `515b3954f5dfc28a062f9b3026fcaacc3eba7336`
- Authorized source tree: `feed3d7cbceba0b5526959f8d3f74bdf45d23475`
- Prior H1-H2 correction QA: `PASS_INDEPENDENT_QA_ONLY`; this receipt does not promote that verdict into hosted or real-use proof.
- Allowed candidate paths: the Postgres adapter and test, the one CLI-generated migration, the operations adapter and test, and this receipt only.

## Supabase CLI and primary contract check

- Installed CLI: `supabase 2.109.1`.
- Read-only help inspected: `supabase --help`, `supabase migration --help`, `supabase migration new --help`.
- Migration was created only by `supabase migration new observer_bridge` as `supabase/migrations/20260827000756_observer_bridge.sql`.
- No login, link, start, project enumeration, remote SQL, `db push`, `--linked`, MCP, dashboard, or provider operation occurred.
- Primary semantics checked 2026-08-27 KST: grants and RLS are separate authorization layers; policies use explicit roles and `USING`/`WITH CHECK`; browser-facing authorization derives from immutable server auth claims, not `auth.role()` or mutable user metadata.
  - https://supabase.com/docs/guides/database/postgres/row-level-security
  - https://supabase.com/docs/guides/api/securing-your-api

## RED-first evidence

With repository dependencies attached read-only and before either implementation module existed:

```text
node --test server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs
tests 2; pass 0; fail 2
ERR_MODULE_NOT_FOUND: phase3-observer-bridge-postgres.mjs
ERR_MODULE_NOT_FOUND: phase3-observer-bridge-operations.mjs
```

The failing tests already exercised the intended migration/RLS, transaction/CAS, privacy, rollback, and operations contracts; implementation followed the failure rather than preceding it.

## H3 data and RLS evidence

- Exact migration SHA-256: `48f9c9c375821181ceed51c1ac82a76de26eba6287432b6cb883c969aaed1f5f`.
- PGlite executed the checked-in account foundation migration and then the exact new migration, not a SQL substring simulation.
- 9 bridge tables; all 9 have RLS enabled and forced; 23 explicit policies.
- Every scoped row carries `workspace_id` and the applicable project/role/binding/source/version boundary. Composite foreign keys prevent same-project cross-workspace attachment.
- `anon`: schema/table grants 0. `authenticated`: `bridge_projections SELECT` only, filtered by active workspace membership and project ownership. Raw/enrollment/key/event/replay/audit/tombstone writes and reads are denied.
- `outcome_bridge_ingest`: `NOLOGIN`, `NOBYPASSRLS`, exact workspace/project policies, append-only event access, event update/delete grants 0.
- `outcome_bridge_operations`: `NOLOGIN`, `NOBYPASSRLS`, bounded lifecycle/tombstone grants; audit and tombstone deletion grants 0.
- `service_role`, `SECURITY DEFINER`, `auth.role()`, mutable user metadata, and browser-held server credentials occur 0 times.
- Actual two-workspace/same-project RLS proof: own projection visible; cross-workspace, unknown, revoked, anon, raw-table, and authenticated-write access denied. Re-applying the migration fails transactionally and retains the prior rows.
- Constraints deny non-finite roles/status/reasons, duplicate active scope, invalid version/order/digest/signature classes, and cross-workspace foreign scope.

## Adapter and operations evidence

- Postgres adapter uses an injected transaction/query port and constant parameterized statements only; it performs schema/revision checks, challenge consume/source creation, event+replay+projection+audit, key rotation/revocation, tombstone purge, and restore verification atomically.
- Duplicate request+digest is idempotent; conflicting replay, sequence gap, stale CAS, schema mismatch, partial failure, clone substitution, and restore without tombstone application fail closed with no durable revision or row consumption.
- Response materialization completes inside the transaction boundary before commit publication.
- Operations defaults: feature `off`, ingest `disabled`, mode `read_only`. Body/rate/cost limits, freshness decay, source-compromise disable, exact-revision restore, bounded retention, privacy-minimal export receipt, cache-not-ahead, and tombstone/no-resurrection rules are tested.
- Projection/export/metrics contain only finite status/freshness/revision/count/reason classes. Prohibited progress, Gate, approval, completion, prompt/result, provider/session/thread/turn, path, credential, signature/key material, and raw identifier hits: 0.

## GREEN and regression evidence

| Command | Result |
|---|---|
| `node --test server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs` | 17/17 PASS |
| domain + H1/H2/API + H3/H4 + account Postgres focused set | 63/63 PASS |
| `npm run test:package-model` | 39/39 PASS |
| `npm run check:mutations` | 32/32 local mutations 405; 28/28 API `read_only`; 0/4 page JSON bodies expected |
| `npm run test:security` | 29/29 PASS; stable snapshot prohibited 0; Gate evidence 0; client env leaks 0 |
| `npm test` | frontend 89/89; Node 205/205 PASS |
| `node --test scripts/*.test.mjs server/*.test.mjs` | 234/234 PASS |
| `npm run build` | PASS; `dist/assets/index-DgbgRsT8.js`, `dist/assets/index-R1nuadtV.css` |
| `npm run check:scope` | PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

## Rollback and residual boundary

- Rollback is removal of this additive migration/module/test candidate before any wiring. No existing account schema or runtime path was modified.
- The migration is not remotely applied and the adapters are not wired into an API or runtime. H5 fresh QA, hosted integration, real auth, real persistence, deployment, and real two-viewer proof remain open.
- `O2` remains OPEN. Phase 3 remains `17/43`. H3-H4 candidate evidence is not O2, QA, Audit, Cherry acceptance, release, progress, or `EXTERNAL_OUTCOME_COMPLETE` authority.
- External/provider/account/session/browser/device/private-store/credential/network/deploy/push/message operations: 0.
