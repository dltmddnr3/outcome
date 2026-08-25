# Phase 2 · Account Access Outcome Contract

Status: `K1-K2 APPROVED · K3-K6 CHERRY DECISION REQUIRED`
Updated: 2026-08-25 KST

Decision boundary: `NO_ACCOUNT_IMPLEMENTATION_BEFORE_K1_K6`

## Outcome

Cherry가 고정 공개 주소의 정제된 결과 지도는 계속 안전하게 볼 수 있고, 인증된 private workspace에서는 자신에게 허용된 프로젝트만 같은 OUTCOME Package 의미로 조회한다. 로그인이나 세션 활동은 Gate 진행·Cherry acceptance·release authority를 만들지 않는다.

## Current inherited truth

- The fixed public snapshot is available at `https://outcome-five.vercel.app/cherry-note-dashboard` and remains sanitized, GET-only, mutation-denied, and deployment-pinned.
- Registered Package portfolio foundation is evidence-closed for a validated registry and three-project fixture; the actual public registry still contains Cherry Note and OUTCOME only.
- The current deployment is a snapshot. It is not a durable database, live session relay, multi-PC collector, dispatch service, or completion authority.
- Phase 1 C1-C2 and the internal-use Local MVP scope were accepted by Cherry on 2026-08-25 KST. This does not approve an external public MVP, release, or `EXTERNAL_OUTCOME_COMPLETE`.

## Recommended v1 boundary

Approved K1 boundary: start with a **Cherry-only private workspace** behind one verified owner identity while preserving the current public sanitized snapshot as a separate read-only surface.

Why this is the smallest useful step:

1. It gives Cherry stable authenticated access across MacBook and mobile without first inventing teams, invitations, billing, or organization administration.
2. It keeps the already verified public feedback URL available while private project metadata can fail closed behind authentication.
3. It allows the data model to carry a tenant/workspace key from day one without claiming that multi-tenant sharing is implemented.

Deferred alternative: a general multi-tenant account service with invitations, member roles, shared projects, organization ownership, billing, and support operations. This requires a separate approved Stage after the owner-only workspace is proven.

## Approved K2 authentication contract

Approved 2026-08-25 KST: use **Clerk** with **Google primary**, **Apple linked access**, and **email verification code fallback** for the first Cherry-only private workspace. Keep password login, public self-signup, invitations, organizations, multi-user membership, and provider installation deferred.

### Identity and access sequence

1. A private operator bootstrap creates exactly one Cherry owner from an approved verified email. No public sign-up route exists.
2. The canonical account identity is the resulting Clerk user ID stored only in private runtime configuration. Email, Google subject, and Apple subject are credentials linked to that owner; none independently grants workspace ownership.
3. Google is the primary sign-in action. If the current environment is an embedded user-agent that Google rejects, OUTCOME opens the system browser or offers email verification code fallback without weakening owner matching.
4. Apple is linked from an already authenticated owner session before it becomes a sign-in action. This prevents Apple Private Relay email from silently creating a second owner account.
5. Email verification code remains the passwordless fallback and recovery entry when Google or Apple is unavailable.

### Approved session and security boundary

- Provider: Clerk production instance with Google, Apple, and email verification code; no password.
- Owner identity: one canonical Clerk user ID bootstrapped from one exact verified Cherry email. Exact identifiers are supplied later through private runtime configuration and never written to Git, Package documents, snapshots, logs, or the public dashboard.
- Access creation: no public sign-up route; the sole owner is provisioned through an approved private operator step. Any unbound provider identity fails closed.
- Session: seven-day maximum lifetime for v1; no custom inactivity timeout in the first implementation.
- Logout and revocation: local sign-out plus operator-visible revocation of every active session for the owner.
- Request protection: `SameSite=Lax`, no mutation on GET/navigation, server-side identity verification, and explicit Origin/CSRF/idempotency controls before any later state-changing route.
- Recovery: regain access through the linked email verification code, or an already linked Google/Apple credential. If all linked credentials are lost, access stays denied until Cherry approves a private operator recovery procedure. No password reset exists in this passwordless v1.
- Account-link collision: an email or social identity that is not already bound to the canonical owner never creates or inherits a workspace.

Official provider references reviewed on 2026-08-25 KST:

- Clerk sign-in options: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
- Clerk email code flow: https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp
- Clerk session options: https://clerk.com/docs/guides/secure/session-options
- Clerk session revocation: https://clerk.com/docs/reference/backend/sessions/revoke-session
- Clerk CSRF protection: https://clerk.com/docs/guides/secure/best-practices/csrf-protection
- Clerk cookie and token model: https://clerk.com/docs/guides/how-clerk-works/overview
- Clerk account linking: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking
- Clerk Apple connection: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple
- Google embedded user-agent policy: https://developers.google.com/identity/protocols/oauth2/native-app
- Apple web configuration: https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple
- Supabase SSR comparison: https://supabase.com/docs/guides/auth/server-side/advanced-guide

Comparison boundary: Supabase remains a candidate for K4 durable data and tenant-row isolation. It is not selected for K2 because its browser session maintenance requires browser access to the refresh token, adding a larger auth/session integration surface than the owner-only v1 needs.

## Surface contract

### Public snapshot

- No login required.
- Sanitized Package hierarchy and deployment receipt only.
- No local paths, credentials, private source metadata, role/session IDs, raw Gate evidence, email, account identifier, or mutation controls.
- GET-only; every mutation returns the existing read-only denial.

### Authenticated private workspace

- One verified Cherry owner in v1; self-signup and invitations disabled.
- Shows only projects explicitly bound to the owner's workspace.
- Read-only project inspection in the first implementation Stage.
- Account state, login recency, or project visibility never closes a Gate.
- Unknown workspace/project membership fails closed without falling back to the public or another workspace's project set.

## Required security and privacy contract

- Auth provider and credential handling must be approved before integration; OUTCOME never stores provider passwords.
- Long-lived session credentials are provider-held and `HttpOnly` where the approved provider architecture supports it. Any app-domain bearer/session token must be short-lived, `Secure`, `SameSite=Lax`, never persisted in local storage by OUTCOME code, bounded by the approved session lifetime, revocable, and rotated by the provider.
- State-changing routes remain absent in the first Stage; any later mutation requires explicit CSRF protection, re-authentication for sensitive actions, idempotency, and audit evidence.
- Every private query is scoped by server-derived workspace identity; client-provided workspace/project IDs cannot grant access.
- Tenant isolation is proven with negative cross-workspace tests even while v1 has one owner.
- Secrets remain deployment/runtime configuration and never enter Package documents, snapshots, browser bundles, logs, or Git.
- Privacy contract must define collected account fields, purpose, retention, deletion/export, incident notification, and log redaction.
- Authentication outage, stale membership, missing secret, and storage conflict fail closed.

## Data and operation contract to decide

- Durable source of truth for account, workspace, project registration, and deployment snapshot versions.
- Separation between Package documents, runtime registry, account membership, and immutable deployment receipts.
- Snapshot freshness and refresh authority; no live state may be inferred from last successful sync.
- Migration versioning, backup/restore evidence, rollback, audit retention, observability, alert ownership, incident response, and recovery objectives.
- Hosting region, privacy jurisdiction, expected project/snapshot volume, and monthly cost ceiling.
- Exact initial private projects; Cherry Note/OUTCOME inclusion does not authorize NOL AX or Cherry Picker registration.

## Cherry decisions required

1. **Approved 2026-08-25 KST:** Cherry-only owner workspace beside the public sanitized snapshot; self-signup and invitations disabled.
2. **Approved 2026-08-25 KST:** Clerk with Google primary, Apple linked access, email verification code fallback, canonical private owner identity, seven-day session, revocation, CSRF boundary, and recovery procedure.
3. **Approved with K1:** keep the current public sanitized snapshot publicly reachable beside the private workspace.
4. Approve collected account fields, retention window, deletion/export process, and audit retention.
5. Approve storage/hosting region, operational owner, recovery objective, and monthly cost ceiling.
6. Name the first projects permitted in the private workspace and provide their Package root/source authority separately.

## Builder entry condition

Builder work may start only after K1-K6 in `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` are evidence-closed by Cherry decisions. K1-K2 approval alone does not authorize provider installation or product code. The first implementation contract must then name provider, environment, exact allowed paths, red-first isolation tests, secret boundary, migration/rollback, preview verification, fresh UX & Product QA, and separate Release Audit. It must not add live collector relay, dispatch, project creation, billing, or release mutation by implication.
