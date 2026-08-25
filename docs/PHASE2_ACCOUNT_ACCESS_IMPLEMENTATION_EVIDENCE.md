# Phase 2 · Account Access Implementation Evidence

Status: `CANDIDATE_READY_ONLY · I1-I8 BUILDER EVIDENCE COMPLETE`

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
4. `server/account-access-postgres.test.mjs` first failed with `ERR_MODULE_NOT_FOUND` before the pinned PGlite dependency was installed. With the dependency present, the exact migration then exposed a real cross-workspace RLS defect: the unqualified `workspace_id` in `binding_owner_read` resolved to the membership row and returned both bindings. The test passed only after qualifying the policy reference to `outcome_private.project_bindings.workspace_id`.

## Final local evidence

- `npm test`: 62 frontend and 96 Node tests passed.
- `npm run test:account-access`: 17 Node and 3 UI tests passed, including exact migration execution on PGlite 0.5.7/PostgreSQL 18.3 with real roles, forced RLS, owner-only reads, duplicate subject rejection, and anonymous/unknown/revoked/write denial.
- `npm run test:account-access-browser`: two viewports, nine settled states, loading, 200% zoom, touch targets at least 44 px, and zero horizontal overflow/intersection passed.
- `npm run test:security`: 28 tests passed; stable snapshot disclosure scan found zero prohibited disclosures and zero Gate evidence fields.
- `npm run check:public-boundary`: API, HTML, bundle and rendered UI prohibited identifier hits were zero.
- `npm run check:mutations`: 32/32 mutations returned 405; 28/28 API mutations returned canonical `read_only` JSON.
- `npm run build` and `npm run build:isolated`: TypeScript and Vite production builds passed.
- `npm run check:scope` and `npm run check:runbook`: passed.
- The tracked three-project portfolio fixture passed desktop/mobile navigation. The default detached-worktree generic browser command could not resolve the external Cherry Note Package from its relative registry; a worktree-contained synthetic registry run passed four viewports. This is not relabeled as canonical Package browser PASS.
- `npm run test:stable-browser`: all four viewports passed every Cherry Note and OUTCOME hierarchy state. Desktop 1440×900 and landscape 844×390 remain 164 px; mobile 390×844 and phone 375×812 measure 351.98 px for the Cherry Note conflict Hero and 313.05 px for OUTCOME. Across the four runs, text is at least 11 px, controls at least 44 px, contrast at least 4.5, and English fallback, clipping, ellipsis, intersections, viewport escape and document overflow are zero. Reduced motion is static and keyboard/mobile hierarchy assertions pass.

## Migration and fixture receipts

- `supabase/migrations/202608250001_account_access_foundation.sql`: SHA-256 `832e8fc117d7c5b1b403cbe8f4e34ca3f4ceeb3f23904c82daefd56b96cae5a7`
- `test/fixtures/account-access.json`: SHA-256 `6d27b23601739071bd60f78cc3caa84ed988742e5b0e21c1fe29fad0893d8522`

## Changed paths

- `GATES_PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION.md` (evidence fields only)
- `api/index.mjs`
- `docs/PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION_EVIDENCE.md`
- `package.json`
- `package-lock.json`
- `scripts/account-access-browser-check.mjs`
- `scripts/browser-assertions.mjs`
- `scripts/browser-assertions.test.mjs`
- `scripts/check-mutation-matrix.mjs`
- `server/account-access-api.mjs`
- `server/account-access-api.test.mjs`
- `server/account-access-postgres.test.mjs`
- `server/account-access.mjs`
- `server/account-access.test.mjs`
- `server/index.mjs`
- `server/index.test.mjs`
- `server/stable-host.test.mjs`
- `src/OutcomeApp.tsx`
- `src/components/AccountWorkspace.test.tsx`
- `src/components/AccountWorkspace.tsx`
- `src/components/OutcomeDashboard.test.ts`
- `src/components/OutcomeDashboard.tsx`
- `src/components/outcomeKorean.ts`
- `src/lib/api.ts`
- `src/styles.css`
- `supabase/migrations/202608250001_account_access_foundation.sql`
- `test/fixtures/account-access.json`
- `vercel.json`

## Local RLS proof and candidate boundary

The exact pinned migration now executes in-process on official `@electric-sql/pglite` 0.5.7 (PostgreSQL 18.3). The committed test provisions only the Supabase platform prerequisites (`anon`, `authenticated`, and an `auth.jwt()` compatibility function), then applies the unchanged migration and exercises actual PostgreSQL roles and policies. It proves forced RLS on all eight tables, one canonical owner in exactly one workspace through the v1 `identity_subject` uniqueness constraint, owner-only reads, and denial for duplicate membership, anonymous, unknown, revoked and authenticated-write cases.

This closes the local implementation proof for I4 only. It is not Supabase preview, Clerk integration, hosted backup/restore, or provider proof. The Builder did not start Docker or create a Supabase/Clerk/Google/Apple/Vercel resource.

The I7 correction first reproduced the canonical Cherry Note `conflict` Hero above the 360 px contract; the exact clean e61b5fc reproduction measured 399.4375 px in this run (the prior handoff recorded 393.4375 px under the earlier diagnostic layout). The corrected mobile layout places source status, NOW and the existing 44 px refresh control in one responsive row while keeping project identity, all source text, all four role rows and the full warning visible. Final 390×844 and 375×812 measurements are 351.98 px with no clipping, ellipsis, intersection, overflow, undersized text or undersized controls. The assertion remains unchanged and now includes the measured Hero height in future failure output.

All I1-I8 Builder evidence is now reproducible locally, so the result is `CANDIDATE_READY_ONLY`. This is not independent QA, Release Audit, Cherry acceptance, hosted provider proof, deployment authority or Phase completion.

## Rollout

1. Keep `OUTCOME_PRIVATE_SURFACE_ENABLED` disabled; verify public page/API/health, redaction and mutation 405 on the exact committed build.
2. Under separate resource authorization, repeat the pinned migration and negative RLS matrix in Supabase preview; the committed PGlite test is the local reproducible baseline, not hosted proof.
3. Under separate provider authorization, bind the named Clerk adapter configuration in preview with synthetic Package projections only; verify Google, linked Apple, email code, logout, expiry, revocation and outage states.
4. Route the exact candidate to fresh UX & Product QA, then a separate Release Audit. Cherry decides any production resource mutation and release separately.

## Rollback

Set the private-surface binding off, return `/api/private/workspace` to fail-closed denial, and select the last verified public deployment. If a provider was later authorized, revoke affected sessions. If a database was later authorized, use a reviewed compensating migration or the approved restore/deletion-ledger procedure. Rollback is incomplete until public health, 405/redaction, private deny, receipt parity and data integrity are rechecked.

## Limitations

- No real provider login, account linking, OAuth callback, session cookie issuance or revocation was executed.
- No hosted Supabase migration/RLS, backup, restore, export purge, retention job, WAF rule, alert, cost integration or incident notification was executed. Local PostgreSQL role/RLS execution is limited to the committed PGlite test.
- Provider buttons are state-contract controls only; they intentionally do not begin OAuth without an approved adapter and runtime configuration.
- No deploy, push, release, external project registration, project/session mutation, QA, Release Audit or Cherry acceptance is claimed.

## Parent promotion verification

Parent preserved exact Builder candidate `f7d3467ecf9f` and merged it as `f8bae555970c` without squashing its immutable history. The first Parent run intentionally exposed two environment-order failures: the canonical dependency installation did not yet contain the new PGlite package, and the standalone account browser read a pre-merge `dist`. Parent used an isolated exact-lock npm cache/install, reproduced PostgreSQL/RLS PASS, built the canonical asset, then reran the affected browser command and all remaining suites.

Final Parent evidence: frontend 62/62, Node 96/96, account Node 17/17 plus UI 3/3, account browser MacBook/mobile × nine states plus loading/200%, stable browser four viewports across both projects and every hierarchy selection, security 28/28, mutation 32/32=405 and API 28/28 canonical read-only JSON, prohibited disclosure 0, scope/runbook PASS, and Vercel build/stable-host 8/8. These results close only the local disabled-by-default Implementation candidate. Fresh UX & Product QA, separate Release Audit, real Supabase/Clerk preview, Cherry acceptance and release remain open.
