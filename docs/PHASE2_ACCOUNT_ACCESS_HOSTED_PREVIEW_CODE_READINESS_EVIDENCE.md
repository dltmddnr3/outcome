# Phase 2 · Account Access Hosted Preview HP0 Code Readiness Evidence

Status: `CODE CANDIDATE · NO_EXTERNAL_MUTATION`

## Immutable boundary

- Base commit: `32d3df6cd0a52476e899fd644032810abb862123`
- Base tree: `153c38c58442086a1e9ede3aacc8681b4d4e8289`
- Candidate commit/tree and built asset are resolved from the final Git object containing this document and reported in the Builder handoff after a post-commit build.
- Work was performed in a fresh isolated worktree. No provider account, resource, secret, environment, database, domain, deployment, push or release mutation was performed.

## Red-first receipts

1. `node --test server/account-access-hosted.test.mjs`
   - RED: exit 1, `ERR_MODULE_NOT_FOUND` for the intentionally absent `server/account-access-hosted.mjs`; tests 1, pass 0, fail 1.
   - GREEN: tests 6, pass 6, fail 0.
2. `npx vitest run src/lib/api.test.ts`
   - RED: tests 2, pass 1, fail 1 because the hosted redirect was not consumed.
   - GREEN: tests 2, pass 2, fail 0; hosted redirect is consumed while the injected synthetic transition does not navigate.
3. A hostile provider redirect is rejected by the provider boundary; only the configured Clerk origins are accepted.
4. Runtime factory rejection was reproduced as an escaped `adapter initialization failed` error before correction. Null and malformed adapters are now normalized to the same disabled config, workspace `401` and mutation `405` boundary.

## Implemented contract

- Complete least-privilege configuration plus an explicitly supplied valid hosted runtime adapter is required before the private handler can become enabled. Absent configuration, any partial binding, flag removal, missing adapter, rejected factory or malformed adapter returns the existing disabled config, workspace `401` and mutation `405` contract.
- The credential-free Clerk boundary verifies canonical subject, seven-day maximum/expiry, revocation and wrong-owner denial; starts Google or email-code; permits Apple only as an authenticated owner link operation; supports logout and operator revocation; and maps provider failure closed.
- The hosted store boundary passes the verified session token and server-derived subject/workspace into the `outcome_private` REST/RLS surface, filters to Cherry Note and OUTCOME, and maps store/RLS failure to one deny-by-default error without fallback.
- The Vercel private route enforces explicit activation, complete bindings, allowed origin, secure HttpOnly SameSite cookie attributes and provider redirect origin validation. The unchanged public handler remains the default and preserves its existing response bodies.
- The client API consumes a hosted redirect in its allowed binding layer while retaining the current explicitly injected synthetic transition used by credential-free browser tests.
- No Clerk or Supabase runtime SDK was added. HP0 defines and tests provider/store boundaries with built-in fetch; actual Clerk request verification and hosted Supabase execution remain HP1/HP2 work and cannot be claimed by this candidate.

## Environment-name inventory

- `OUTCOME_PRIVATE_SURFACE_ENABLED`
- `OUTCOME_CLERK_PUBLISHABLE_KEY`
- `OUTCOME_CLERK_SECRET_KEY`
- `OUTCOME_OWNER_SUBJECT`
- `OUTCOME_CLERK_SIGN_IN_URL`
- `OUTCOME_CLERK_ACCOUNT_URL`
- `OUTCOME_PRIVATE_ALLOWED_ORIGIN`
- `OUTCOME_SUPABASE_URL`
- `OUTCOME_SUPABASE_PUBLISHABLE_KEY`
- `OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT`

Only names are recorded. No values, email, provider subject, token, cookie, connection string or private project payload is present in this evidence.

`OUTCOME_SUPABASE_SECRET_KEY` is reserved only as a possible future server-ingestion contract. The verified-user read-only REST/RLS gateway does not use it, and it is not an HP0 activation binding or prerequisite.

## Final verification

- `npm run test:account-access`: Node 25/25 and Vitest 7/7 PASS.
- `npm run test:account-access-browser`: 3 viewports × 9 settled states plus loading and ready login/logout hierarchy PASS; mobile and phone 200% zoom overflow 0; touch targets at least 44px.
- `npm run test:security`: 28/28 PASS; stable snapshot prohibited disclosures 0 and Gate evidence fields 0.
- `npm test`: frontend 66/66 and Node 104/104 PASS.
- `npm run test:browser`: assertion tests 16/16 and deterministic 3-project fixture across 4 viewports PASS; overflow, clipping and unexpected English 0.
- `npm run test:stable-browser`: 2-project snapshot across 4 viewports PASS; source groups 8/8, overflow, clipping and unexpected English 0.
- `npm run check:public-boundary`: prohibited identifiers 0.
- `npm run check:mutations`: local mutation 32/32 = 405; API read-only JSON 28/28.
- `npm run check:scope`: PASS with no provider dependency.
- `npm run check:runbook`: PASS.
- `npm run build:isolated`: PASS.
- `npm run build:vercel`: PASS; final post-commit receipt is reported in the handoff.

## Rollout and rollback

- Rollout: Parent independently verifies the exact candidate commit/tree. Only a separately authorized HP1 may supply a real Clerk adapter and Preview bindings; only a separately authorized HP2 may bind an isolated Supabase preview.
- Rollback before any later binding: revert only the exact candidate commit.
- Rollback after a separately authorized preview binding: remove `OUTCOME_PRIVATE_SURFACE_ENABLED` first, confirm disabled config/workspace `401`/mutations `405`, revoke preview sessions and return to the separately recorded rollback deployment.

## Limitations and authority boundary

- No real Clerk SDK, OAuth, Google, Apple, email delivery, hosted session, callback, provider outage, Supabase resource, hosted PostgreSQL/RLS, secret, Preview environment or deployment was observed.
- The default Vercel export deliberately has no real runtime factory, so environment names or values alone cannot activate the private surface. HP1 must implement and verify the real provider binding under new authority.
- Existing credential-free browser evidence is synthetic and is not relabeled as hosted-provider proof.
- B8 Parent promotion remains open. QA, Audit, Cherry acceptance, release, Phase completion, MVP closure and `EXTERNAL_OUTCOME_COMPLETE` remain open.
