# Phase 2 · Account Access Implementation Evidence

Status: `BLOCKED · PROVIDER-NEUTRAL CANDIDATE COMMITTED FOR REVIEW`

Base: `0f88e71d2c8c` / tree `65c419a440b4`

## Implemented boundary

- Added a provider-neutral identity adapter with Google-primary, Apple-linked-only and email-code recovery semantics, a seven-day session maximum, synthetic logout/revocation, and fail-closed provider errors.
- Added server-derived one-owner membership resolution, two-workspace negative fixtures and a strict Cherry Note/OUTCOME allowlist. Client workspace selectors are ignored and project selectors cannot widen access.
- Added a deterministic private Postgres schema contract for workspace membership, project bindings, append-only Package snapshots/current pointer, deployment receipts, redacted security events and deletion jobs.
- Added rate, idempotency, payload, cost, incident and rollback contracts. The 512 KiB payload ceiling is above the measured 161,422-byte current sanitized Package fixture and is enforced before ingestion work.
- Added `/workspace` with Korean-first login/loading/empty/stale/conflict/unavailable/session-expired/access-denied/safe-degraded/ready states. The public dashboard and public GET/read-only boundary remain separate.
- Added a disabled-by-default Vercel private configuration surface. No provider account, credential, database or external resource is created by this candidate.

## Red-first evidence

1. `node --test server/account-access.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for the absent account-access core.
2. `node --test server/account-access-api.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for the absent private API boundary.
3. `vitest run src/components/AccountWorkspace.test.tsx` was added before the component existed; the first combined invocation could not start Vitest because this detached worktree had no dependency link. After linking the existing local dependency installation, the component remained a new implementation target and passed only after the component was added.

## Final local evidence

- `npm test`: 60 frontend and 95 Node tests passed.
- `npm run test:account-access`: 16 Node and 3 UI tests passed.
- `npm run test:account-access-browser`: two viewports, nine settled states, loading, 200% zoom, touch targets at least 44 px, and zero horizontal overflow/intersection passed.
- `npm run test:security`: 28 tests passed; stable snapshot disclosure scan found zero prohibited disclosures and zero Gate evidence fields.
- `npm run check:public-boundary`: API, HTML, bundle and rendered UI prohibited identifier hits were zero.
- `npm run check:mutations`: 32/32 mutations returned 405; 28/28 API mutations returned canonical `read_only` JSON.
- `npm run build` and `npm run build:isolated`: TypeScript and Vite production builds passed.
- `npm run check:scope` and `npm run check:runbook`: passed.
- The tracked three-project portfolio fixture passed desktop/mobile navigation. The default detached-worktree generic browser command could not resolve the external Cherry Note Package from its relative registry; a worktree-contained synthetic registry run passed four viewports. This is not relabeled as canonical Package browser PASS.

## Migration and fixture receipts

- `supabase/migrations/202608250001_account_access_foundation.sql`: SHA-256 `62976bad06bab4b0f917e7be67bbc49791c505a6f855f13f57de458291336231`
- `test/fixtures/account-access.json`: SHA-256 `6d27b23601739071bd60f78cc3caa84ed988742e5b0e21c1fe29fad0893d8522`

## Changed paths

- `GATES_PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION.md` (evidence fields only)
- `api/index.mjs`
- `docs/PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION_EVIDENCE.md`
- `package.json`
- `scripts/account-access-browser-check.mjs`
- `scripts/check-mutation-matrix.mjs`
- `server/account-access-api.mjs`
- `server/account-access-api.test.mjs`
- `server/account-access.mjs`
- `server/account-access.test.mjs`
- `server/index.mjs`
- `server/index.test.mjs`
- `server/stable-host.test.mjs`
- `src/OutcomeApp.tsx`
- `src/components/AccountWorkspace.test.tsx`
- `src/components/AccountWorkspace.tsx`
- `src/lib/api.ts`
- `src/styles.css`
- `supabase/migrations/202608250001_account_access_foundation.sql`
- `test/fixtures/account-access.json`
- `vercel.json`

## Blocking proof

Actual Postgres migration application and RLS execution are not evidenced. `supabase --version` returned `2.109.1`, while `docker info --format '{{.ServerVersion}}'` exited nonzero with `Cannot connect to the Docker daemon ... Is the docker daemon running?` (the local socket path is deliberately omitted from committed evidence).

The Builder did not start Docker or create a Supabase/Clerk/Google/Apple/Vercel resource. Static SQL assertions and the two-workspace synthetic store prove the intended contract but do not substitute for Postgres/RLS execution. I4 therefore remains open and the result is `BLOCKED`, not `CANDIDATE_READY_ONLY`.

## Rollout

1. Keep `OUTCOME_PRIVATE_SURFACE_ENABLED` disabled; verify public page/API/health, redaction and mutation 405 on the exact committed build.
2. Under separate resource authorization, run the pinned migration in an isolated local/preview Postgres and execute real RLS negative tests for anonymous, wrong owner, stale membership, forged project and cross-workspace access.
3. Under separate provider authorization, bind the named Clerk adapter configuration in preview with synthetic Package projections only; verify Google, linked Apple, email code, logout, expiry, revocation and outage states.
4. Route the exact candidate to fresh UX & Product QA, then a separate Release Audit. Cherry decides any production resource mutation and release separately.

## Rollback

Set the private-surface binding off, return `/api/private/workspace` to fail-closed denial, and select the last verified public deployment. If a provider was later authorized, revoke affected sessions. If a database was later authorized, use a reviewed compensating migration or the approved restore/deletion-ledger procedure. Rollback is incomplete until public health, 405/redaction, private deny, receipt parity and data integrity are rechecked.

## Limitations

- No real provider login, account linking, OAuth callback, session cookie issuance or revocation was executed.
- No real Postgres migration, RLS, backup, restore, export purge, retention job, WAF rule, alert, cost integration or incident notification was executed.
- Provider buttons are state-contract controls only; they intentionally do not begin OAuth without an approved adapter and runtime configuration.
- No deploy, push, release, external project registration, project/session mutation, QA, Release Audit or Cherry acceptance is claimed.
