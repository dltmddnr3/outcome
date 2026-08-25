# Phase 2 · Hosted Identity Runtime Correction Evidence

Status: `IDENTITY CODE CANDIDATE · NO_EXTERNAL_MUTATION`

## Immutable boundary

- Base commit: `6cdb845f3cd3e5d58a267375f1f2ca73a9843185`
- Base tree: `68db092f7cfeb0874f987d7b832de81bb6831c66`
- Candidate commit/tree and post-commit asset are resolved from the final Git object containing this document and reported in the Builder handoff.
- Work was performed in a fresh isolated worktree. No Clerk, Google, Apple, Supabase or Vercel account, resource, secret, environment, domain, deployment, push or release mutation was performed.

## Red-first receipt

`node --test server/account-access-identity-runtime.test.mjs` failed before implementation with tests 1, pass 0, fail 1: `account-access-hosted.mjs` did not export the required HP1/HP2 configuration split. Source inspection independently confirmed that the existing configuration required Supabase bindings and the Vercel default handler had no runtime factory.

The browser correction was also red first: the new component test failed because no Clerk browser integration module existed, while the server test failed 4/4 because the old implementation still required hosted-page URLs and minted a long-lived cookie. Parent review then found the Core 3 redirect destinations reversed and Apple linking incorrectly coupled to HP2 workspace readiness. Exact mapping and verified-owner/unavailable UI regressions now cover both findings. After correction, the focused identity runtime suite is 4/4 and focused account UI suites are 10/10. They prove complete identity-only selection, official browser/backend adapter construction, SDK-owned callback/session lifecycle, opaque-signup denial, Apple link-only, owner/expiry/revocation/provider failure denial, HP2 workspace blocking and default/partial/construction failure behavior.

## Implemented contract

- HP1 identity bindings and HP2 data bindings are evaluated independently. A complete HP1 does not read or require a Supabase name or value.
- The Vercel handler defaults to the concrete hosted identity runtime. Complete HP1 configuration creates the official Clerk backend client; absent/partial configuration or construction failure returns the unchanged disabled config, workspace `401` and mutation `405` boundary.
- The server uses Clerk request authentication with an exact authorized party and the session-only token class, then checks the backend Session resource before accepting the canonical owner. Browser logout uses the Clerk React SDK. The backend provider retains explicit single-session and all-session revocation primitives only for separately authorized rollback/operator use; they are not exposed through a current public POST route, and every private POST remains `405 read_only`.
- `@clerk/react` mounts `ClerkProvider` from the credential-free runtime config and exclusively owns the app-domain `__session` cookie and its refresh. The server never mints, copies, extends or clears this cookie, and every private POST route stays `405 read_only`.
- Google SSO and email-code sign-in use the Clerk browser SDK. Core 3 receives `redirectCallbackUrl=/workspace/sso-callback` and completed-session `redirectUrl=/workspace`; an absent/unready sign-in resource cannot advance email-code state. The OAuth callback mounts `AuthenticateWithRedirectCallback transferable={false}`, so an unknown Google identity cannot silently transfer into an opaque signup. Apple cannot start sign-in; `user.createExternalAccount({ strategy: 'oauth_apple' })` is rendered only after the server has verified the canonical owner, including the intentional HP1 workspace-503 state, and remains hidden for owner/session denial.
- With HP1 ready and HP2 absent, unauthenticated workspace reads remain `401`; authenticated reads return the same generic `503 private_workspace_unavailable` without project, workspace or data-existence disclosure.
- Public dashboard reads, read-only mutation rejection, redaction, deployment receipt and two-project result map are unchanged.

## Dependency rationale

`@clerk/backend` is pinned exactly at `3.16.12` for `createClerkClient()`, `authenticateRequest()` with authorized-party validation, and backend Session read/revocation. `@clerk/react` is pinned exactly at `6.14.7` because Clerk's browser SDK must create and refresh the one-minute app-domain session token; server-only redirects cannot do that safely. No Supabase SDK was added. Credential-free fakes exercise the boundary but are not labelled as real OAuth proof.

## Environment-name inventory

HP1 identity:

- `OUTCOME_PRIVATE_SURFACE_ENABLED`
- `OUTCOME_CLERK_PUBLISHABLE_KEY`
- `OUTCOME_CLERK_SECRET_KEY`
- `OUTCOME_OWNER_SUBJECT`
- `OUTCOME_PRIVATE_ALLOWED_ORIGIN`
- `OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT`

HP2 data, not required or selected by this candidate:

- `OUTCOME_SUPABASE_URL`
- `OUTCOME_SUPABASE_PUBLISHABLE_KEY`

Only names are recorded. No value, email, provider subject, token, cookie, code, session identifier or private payload is present in this evidence.

## Verification

- Focused red-first final: 4/4 PASS.
- `npm run test:account-access`: Node 29/29 and UI/API 12/12 PASS.
- `npm run test:account-access-browser`: production asset contains the Clerk Google/Apple/callback markers and no server callback/session-token handoff; 3 viewports × 9 settled states plus loading and ready injected-adapter journey PASS; mobile/phone 200% zoom overflow 0; touch targets at least 44px.
- `npm run test:security`: 28/28 PASS; prohibited disclosures 0 and Gate evidence fields 0.
- `npm test`: frontend 71/71 and Node 108/108 PASS.
- `npm run test:stable-browser`: two projects, 4 viewports, 54 hierarchy selections per viewport; overflow, clipping, intersection and unexpected English 0; text at least 11px and controls at least 44px.
- `npm run check:public-boundary`: prohibited identifiers 0.
- `npm run check:mutations`: 32/32 mutation statuses are 405; API read-only JSON 28/28.
- `npm run check:scope`: PASS with only the exact approved Clerk backend provider dependency and no Supabase runtime dependency.
- `npm run check:runbook`: PASS.
- `npm run build:vercel`: PASS; 8/8 stable-host assertions. The exact post-commit receipt is reported in the handoff.

## Rollout and rollback

- Rollout remains separately authorized HP1 work: bind only the documented HP1 names to a development identity Preview and verify real system-browser/provider behavior on the exact candidate.
- HP2 remains separately authorized and blocked; identity readiness never enables workspace data.
- Rollback before any later binding: revert only the exact candidate commit.
- Rollback after separately authorized HP1 binding: remove `OUTCOME_PRIVATE_SURFACE_ENABLED`, confirm disabled config/workspace `401`/mutations `405`, revoke development sessions, remove Preview bindings, and return to the separately recorded rollback deployment.

## Limitations and authority boundary

No real OAuth, provider account/configuration, external callback, hosted session refresh, email delivery, Apple linking, Supabase resource/RLS, Preview environment or deployment was observed. The responsive browser journey remains the injected local adapter; a separate production-asset guard proves the real Clerk browser integration is present but does not relabel it as live provider proof. B9-B12 remain Parent-owned promotion decisions; fresh QA, Release Audit, Cherry acceptance, release, Phase completion and `EXTERNAL_OUTCOME_COMPLETE` remain open.
