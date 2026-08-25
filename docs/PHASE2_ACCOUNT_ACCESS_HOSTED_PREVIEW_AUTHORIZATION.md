# Phase 2 · Account Access Hosted Preview Authorization

Status: `HP0 PUBLIC BASELINE VERIFIED · HP1 DECISION READY · NO EXTERNAL MUTATION AUTHORIZED`

Prepared: 2026-08-25 KST

Purpose: 현재 비공개 기능이 비활성인 공개 기준선의 검증 결과를 과장하지 않고, Cherry가 실제 구글·애플 로그인과 호스팅 작업공간을 직접 검수하려 할 때 필요한 코드 준비, 외부 자원 생성, 비밀값 연결, 미리보기 검증과 운영 환경 활성화를 각각 독립된 승인 단위로 만든다.

## Source-grounded current gap

현재 공개 배포는 HP0 코드 준비를 포함하지만 환경값만 넣어 로그인이 활성화되는 상태가 아니다.

- `api/index.mjs`는 완전한 환경 계약과 별도로 주입된 `runtimeFactory`가 함께 있을 때만 비공개 실행 경계를 선택한다. 현재 Vercel 기본 내보내기는 실제 실행 연결기를 주입하지 않으므로 비공개 설정은 비활성이고 작업공간은 `401`로 차단된다.
- `package.json`에는 Clerk나 Supabase 실행 SDK가 없다. HP0는 자격증명 없는 제공자·저장소 경계와 수파베이스 REST 게이트웨이만 준비했으며 실제 외부 제공자 연결은 없다.
- `server/account-access-hosted.mjs`는 활성화 표식과 완전한 명명 환경 계약을 검증하지만, 누락·부분 설정·실행 연결기 오류는 모두 동일한 비활성 경계로 닫힌다.
- 현재 공개 기준선 `d4d0438036a8`은 페이지/API 200, 비공개 설정 비활성, 비공개 작업공간 401, 변경 요청 405를 유지한다.
- `supabase/migrations/202608250001_account_access_foundation.sql` is verified locally through PGlite/PostgreSQL roles. It has never been applied to a hosted Supabase project.
- 이전 사용성·제품 재검수와 출시 재감사는 비활성 선행 후보와 격리된 합성 전환만 증명한다. HP0 이후 현재 후보의 실제 외부 로그인, 제공자 쿠키, 호스팅 행 단위 접근 제어, 복원, 방화벽, 경보 또는 비용 통제를 증명하지 않는다.

Consequence: 선행 후보의 C1 증거는 현재 HP0 이후 후보에 재사용되지 않으며 C1-C4는 0/4로 열려 있다. HP1 또는 HP2 외부 변경은 다시 새 후보를 만들고, 새 사용성·제품 검수와 별도 출시 감사 및 새 Cherry 승인 영수증을 요구한다.

## Recommended progression

### HP0 · credential-free code readiness

Status: `CODE_READY_ONLY · PUBLIC DEFAULT-DISABLED BASELINE VERIFIED` at `d4d0438036a8`; [public baseline receipt](./PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_PUBLIC_BASELINE.md).

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
