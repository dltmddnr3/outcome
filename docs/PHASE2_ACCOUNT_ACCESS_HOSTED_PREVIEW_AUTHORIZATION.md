# Phase 2 · Account Access Hosted Preview Authorization

Status: `DECISION READY · NO EXTERNAL MUTATION AUTHORIZED`

Prepared: 2026-08-25 KST

Purpose: 현재 disabled-public candidate의 독립 검증 결과를 과장하지 않고, Cherry가 실제 Google·Apple 로그인과 hosted workspace를 직접 검수하려 할 때 필요한 product-code 준비, provider/resource 생성, secret binding, preview 검증과 production enablement를 각각 독립된 승인 단위로 만든다.

## Source-grounded current gap

현재 공개 배포에 environment value만 넣어도 로그인이 생기는 상태가 아니다.

- `api/index.mjs` private config is hard-coded disabled and `/api/private/workspace` is hard-coded `401`; the Vercel deployment path does not instantiate the account service.
- `package.json` has no Clerk or Supabase runtime SDK. The current implementation has no Clerk or Supabase runtime SDK binding.
- `server/account-access.mjs` declares five named environment contracts, but the deployed serverless path does not load them or connect them to a real provider.
- `server/index.mjs` can exercise login/logout only when a caller explicitly injects `privateTransitionAdapter`; production supplies no such adapter.
- `supabase/migrations/202608250001_account_access_foundation.sql` is verified locally through PGlite/PostgreSQL roles. It has never been applied to a hosted Supabase project.
- Current UX/Product re-QA and Release re-Audit prove the disabled public deployment and an isolated synthetic transition. They do not prove OAuth callbacks, real provider cookies, hosted RLS, restore, WAF, alerts or cost controls.

Consequence: the current C1 evidence remains valid only for the disabled candidate. Any hosted-preview code or configuration change creates a new candidate and requires fresh UX & Product QA, a separate fresh Release Audit and a new Cherry acceptance receipt before C2-C4 can close.

## Recommended progression

### HP0 · credential-free code readiness

Authority: covered only as repository-local Builder work under the approved K6 implementation boundary. It creates no external account, resource, secret, domain, deployment or release.

Required result:

1. Add a real-provider adapter boundary for Clerk session verification, login redirect/callback, logout and revoke-all without embedding credentials.
2. Add a Supabase adapter boundary for server-derived owner/workspace reads and the existing RLS schema without applying a hosted migration.
3. Make the Vercel API capable of selecting the private adapter only when all required Preview bindings exist and `OUTCOME_PRIVATE_SURFACE_ENABLED=1`; missing or partial binding remains the current disabled/401 behavior.
4. Keep Google primary, email-code fallback and Apple linked-only. Apple cannot create a new owner or become a direct sign-in path before it is linked from the canonical owner session.
5. Keep public routes GET-only, existing mutation denial, two-project allowlist, redaction and `completionAuthority=false` unchanged.
6. Prove the provider adapter with fakes and contract tests. No test result may be labelled real OAuth or hosted Supabase evidence.

Promotion result: `CODE_READY_ONLY`. It does not authorize HP1, deployment, QA PASS, Cherry acceptance or release.

### HP1 · development identity preview

External mutation authority required: `HP1 승인`.

Create only:

- one Clerk development instance for OUTCOME;
- Invite-only access mode and exactly one privately created Cherry owner; no public invitation UI and no organization;
- Google development social connection using Clerk's shared development credentials;
- email verification-code fallback;
- Apple development connection configured as link-only until the already authenticated canonical owner links it;
- Vercel Preview-only environment bindings and one immutable Preview deployment from the HP0 candidate.

Do not create or change:

- Google Cloud production OAuth app, consent publication or production client secret;
- Apple Services ID, Apple private key, production return URL, Private Relay source or DNS;
- Supabase project, production environment values, fixed production alias or custom domain;
- public registry, Gate state, release or billing plan.

Acceptance evidence:

- Clerk instance mode, access mode and enabled method names, with identifiers and raw values redacted;
- exactly one canonical owner receipt; a different email/social identity is denied workspace membership;
- MacBook and mobile system-browser Google login, email-code recovery, Apple link, subsequent linked Apple login, logout, expiry/revocation and provider-failure results;
- the Preview deployment commit/tree/asset and environment-name presence only, never values;
- default production URL remains private-disabled and unchanged.

Official constraint: Clerk development instances may use shared Google/Apple OAuth credentials. Social sign-in and sign-up are otherwise equivalent, so Invite-only/manual-owner restriction and OUTCOME's server-side canonical owner check are both required. Google does not permit OAuth in embedded WebViews; mobile validation must use the system browser.

### HP2 · hosted data preview

External mutation authority required: `HP2 승인` after HP1 evidence.

Create only:

- one isolated non-production Supabase project in Seoul when the provider offers that region for the selected preview plan;
- current Clerk third-party authentication integration;
- the exact pinned migration and explicit grants/RLS;
- one synthetic Cherry workspace, one owner membership and the Cherry Note/OUTCOME project bindings with sanitized Package projections;
- Preview-only Supabase environment bindings.

No real private Package payload, raw Gate evidence, session/thread identifier or production owner email is inserted into the database evidence. Restore rehearsal uses a separate isolated target and synthetic data.

Acceptance evidence:

- project region/plan receipt and migration checksum/version;
- Clerk issuer integration receipt without keys;
- real hosted negative matrix for anonymous, wrong owner, forged workspace/project, unregistered project, revoked/stale membership and authenticated writes;
- append-only snapshot/current-pointer transaction, export/deletion ledger and restore elapsed-time receipt;
- two-project private workspace on MacBook/mobile after real identity authentication;
- measured cost against the approved USD 75 monthly ceiling.

Promotion result: `HOSTED_PREVIEW_CANDIDATE_ONLY`. It requires fresh UX & Product QA and a separate fresh Release Audit on the exact hosted candidate before Cherry acceptance.

### HP3 · production enablement

External mutation authority required: a later exact `HP3 승인`. HP1 or HP2 does not imply it.

Potential production mutations, each separately itemized before execution:

- Clerk production instance and production API keys;
- Google Cloud project/OAuth web client, authorized origin/redirect URI and consent publishing state;
- Apple Team ID, Services ID, Key ID, one-time-download private key, return URL and Private Relay email source;
- Supabase Pro Seoul production project, managed backup and tested restore receipt;
- Vercel Production environment values and production private-surface enablement;
- any custom domain, DNS, Vercel/Clerk plan change or new recurring/one-time purchase.

Production activation is a release mutation and remains separate from HP3 resource preparation. It follows fresh affected QA, separate Release Audit and Cherry production acceptance.

## Mutation inventory and receipts

| Unit | Exact mutable surface | Receipt required | Explicit rollback |
| --- | --- | --- | --- |
| HP0 | Git worktree only | commit/tree, changed paths, tests, default-disabled proof | revert exact candidate commit |
| HP1 | Clerk development instance, Preview env, Preview deployment | instance mode/config names, redacted owner count, env-name inventory, deployment pin, login state matrix | disable private preview, revoke sessions, remove Preview env, delete preview instance only after evidence export |
| HP2 | isolated Supabase preview project and synthetic rows | region/plan, migration SHA/version, RLS matrix, restore/export/deletion receipts, cost | disable preview, revoke sessions, preserve redacted evidence, delete synthetic project after verified export when approved |
| HP3 | production provider/data/host resources | per-provider resource IDs, no secret values, billing/region/domain, deployment pin, QA/Audit/Cherry receipts | disable private surface first, revoke sessions/keys, restore or compensating migration, return to last verified public deployment |

Every receipt is metadata-only. It must not contain email, Clerk subject, OAuth code, token, cookie, client secret, Apple private key, Supabase secret, local path, raw Gate evidence or private project payload.

## Secret inventory

Existing named code contracts:

- browser-visible, non-secret by provider design: `OUTCOME_CLERK_PUBLISHABLE_KEY`;
- server-only: `OUTCOME_CLERK_SECRET_KEY`, `OUTCOME_OWNER_SUBJECT`, `OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT`;
- activation flag: `OUTCOME_PRIVATE_SURFACE_ENABLED`, default absent/false.

HP0 must define any required Supabase names in code and tests before HP2. Recommended names are `OUTCOME_SUPABASE_URL`, browser-eligible `OUTCOME_SUPABASE_PUBLISHABLE_KEY`, and server-only `OUTCOME_SUPABASE_SECRET_KEY`; names are contract metadata, values never enter Git or Gate evidence.

Vercel bindings are project-scoped and Preview-only in HP1/HP2. A changed environment value affects only a new deployment, so the receipt must bind variable-name inventory to the resulting immutable deployment. Production values are not copied or inferred from Preview.

## Verification and promotion sequence

1. Planner closes this preparation Gate and pins the HP0 handoff.
2. Builder returns `CODE_READY_ONLY` from an isolated candidate with no external mutation.
3. Parent re-runs credential-free tests and verifies default production remains disabled.
4. Cherry explicitly approves HP1 before any Clerk instance, owner or Preview environment is created.
5. After HP1 evidence, Cherry separately approves or rejects HP2.
6. Fresh UX & Product QA tests the exact hosted candidate on MacBook and mobile.
7. A separate fresh Release Audit verifies auth, isolation/RLS, redaction, runtime identity, cost and rollback.
8. Cherry physically accepts the new candidate; C1 must reference the new QA/Audit pins before C2-C4 can close.
9. HP3, production activation, public-service release and Phase completion remain later separate decisions.

## Rollback contract

- First action for any identity/data/config failure: set the preview/private surface disabled and verify `/workspace` fails closed while the public snapshot stays readable and mutations stay 405.
- Revoke affected Clerk sessions before rotating/removing provider credentials.
- Never delete a hosted database as the first rollback action. Export the required evidence and validate restore or compensating migration first.
- Re-point only to a previously verified deployment receipt; a green build without receipt parity is insufficient.
- Rollback is complete only after page/API/health, public redaction, mutation denial, private deny, receipt parity and data integrity are rechecked.

## Decision now required from Cherry

Recommended next authority is HP1 only after HP0 is independently verified. The exact decision text is:

> `HP1 승인: OUTCOME Clerk development instance, Invite-only one-owner setup, shared development Google/Apple connections, email code, Vercel Preview-only env and Preview deployment creation을 승인. Production provider, Supabase, paid plan, domain/DNS, release는 미승인.`

Until that statement or an equally exact approval exists: `NO_EXTERNAL_MUTATION`, Cherry acceptance C2-C4 stay open, release stays open, Phase 2 stays open and `EXTERNAL_OUTCOME_COMPLETE=false`.

## Official references checked

- Clerk production deployment: https://clerk.com/docs/guides/development/deployment/production
- Clerk Google connection: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google
- Clerk Apple connection: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple
- Clerk social connection modes: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview
- Clerk access restriction: https://clerk.com/docs/guides/secure/restricting-access
- Clerk authentication options: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
- Supabase third-party authentication: https://supabase.com/docs/guides/auth/third-party/overview
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel deployment environments: https://vercel.com/docs/deployments/environments
