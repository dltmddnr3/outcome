# OUTCOME Builder receipt · O2 workspace schema bootstrap V2

Status: `WORKSPACE_SCHEMA_BOOTSTRAP_V2_CANDIDATE_READY_FOR_FRESH_QA`

## Immutable input

- Parent commit: `b19ac7b8a42f7af2f89efe252ccbf89329414b97`
- Parent tree: `18b789a4e8f8c426c6a683795524ade1a7b7100c`
- Parent parent: `4e51a25c3883855f88722245bf38c1d2c92981b6`
- Builder handoff SHA-256: `3d4569ec2364f27010717e7fd12aa75ebb75fa57a03e2b2d32fdb3fa99e37f84`
- Source-only hold carrier SHA-256: `8353be687b8a815122c982ae81427a3bc2336115fcf33578fa26ae939f09e585`

## Changed scope

- The additive migration grants `outcome_bridge_backend` only the missing `INSERT` privilege on `bridge_schema_versions`, retains `SELECT, UPDATE`, rejects forbidden privilege, role, membership, ownership, RLS, or policy drift, and creates or updates no rows.
- Viewer registration inserts schema version `2`, durable revision `0`, and the trusted registration timestamp with `ON CONFLICT DO NOTHING` inside its existing transaction, then immediately uses the existing strict schema validator.
- Managed-runtime migration reproduction includes the additive migration. No route, API field, environment variable, function, supplemental SQL, or runtime authority was added.

## RED and verification

- Immutable parent RED: after all migrations, the empty schema ledger caused the unchanged first viewer registration to fail with `schema_mismatch`.
- Focused bootstrap and migration cases: `5/5` passed.
- Targeted PostgreSQL, managed-runtime, and API hostile suites: `64/64` passed.
- Full repository suite: Vitest `99/99` plus Node `435/435` passed (`534/534` total).
- Production build: `tsc -b && vite build` passed; `1654` modules transformed.
- Security boundary: backend effective table privileges are exactly `INSERT, SELECT, UPDATE`; `PUBLIC`, `anon`, `authenticated`, and `outcome_bridge_runtime` have no direct table grants; forced RLS and the exact backend policy remain present; no `SECURITY DEFINER` function exists.

## File digests before commit

- `server/phase3-observer-bridge-postgres.mjs`: `f1615fd9c80c1c8c204ea97a34007c4ae8cfd4fe6fee4dc9acdde20ba2d6be41`
- `server/phase3-observer-bridge-postgres.test.mjs`: `7e995e69143dc24c6cd2979b9778ac77b34274cfae070db60cc2d2b7809d320e`
- `server/phase3-observer-bridge-managed-runtime.test.mjs`: `9dd996a4dc2d4b8643f19bc3a2df97fbeb06202da191ef33b1f56fba17e67f38`
- `supabase/migrations/20260902100000_observer_bridge_workspace_bootstrap_v2.sql`: `91b7d711c64b47b1026c3a02f803d0de0a131d3a0dfbebea5f118b61923f1c7c`

## Boundaries and handoff

- No provider, browser, live database, live migration, environment, deployment, participant, registry, canonical root, push, retry, acceptance, Gate closure, Production, or release mutation occurred.
- The pre-existing `.gitignore` change remains user-owned and unstaged; its preserved SHA-256 is `878d329371358937aac1a835fc915c3fafe2767d2b4c0d767ca348080f6c1f88`.
- Rollback is the candidate commit revert before any separately authorized migration application.
- This Builder candidate requires fresh independent QA and a separate fresh Release Audit. It is not accepted, deployed, activated, or released.
