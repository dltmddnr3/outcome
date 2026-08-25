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

## K3 workspace isolation recommendation · not approved

Recommendation: keep authentication, workspace membership, project visibility, operator authority, and public snapshot access as separate decisions. A valid Clerk session proves identity only; it never grants a project by itself.

### Capability boundary

| Actor | Allowed in the first implementation Stage | Explicitly denied |
| --- | --- | --- |
| Anonymous public visitor | Sanitized public snapshot GET | Private workspace, private project metadata, membership, raw Gate evidence, every mutation |
| Canonical Cherry owner | Read-only private workspace and explicitly bound projects | Unbound projects, membership/admin UI, Gate/approval/release mutation, dispatch |
| Private operator | Provision or revoke the one owner and manage provider/runtime secrets through approved external consoles | Using the OUTCOME dashboard as an implicit admin or completion surface |
| Runtime/collector | No private account capability in v1 | Reusing Cherry's browser session, cross-PC relay, autonomous project registration |

A later sync service requires its own machine identity, least-privilege scope, rotation and audit contract. It cannot inherit owner access by implication.

### Workspace and project authorization

- Verify the Clerk session token on every private request and derive the canonical Clerk user ID server-side.
- Resolve `Clerk user ID → active workspace membership → workspace ID` on the server. A client-provided workspace ID is a selector only and never an authority.
- Scope every private project read by both server-derived workspace ID and an explicit active project binding. Guessing or changing a project ID cannot widen visibility.
- Recommended initial private allowlist: Cherry Note and OUTCOME only. NOL AX, Cherry Picker and any other Package require a later explicit registration receipt.
- Google, Apple and email code remain linked credentials for the same canonical owner. A new Clerk user, Apple Private Relay identity, email mismatch or unlinked social subject receives no workspace membership.
- Missing, stale, revoked, duplicate or conflicting membership fails closed. An authenticated private-route failure never falls back to another workspace or silently substitutes the public project set.
- v1 has one `owner-viewer` capability: private read only. No team role, invitation, organization, write capability or role editor exists.

### Required negative authorization tests

1. Anonymous request to every private route is denied.
2. The canonical owner can read each explicitly bound project and no other project.
3. A guessed project ID, client-swapped workspace ID and cross-workspace binding are denied.
4. Revoked/stale membership and a valid but different Clerk user are denied immediately according to the approved freshness source.
5. A separately created Apple relay identity or unlinked Google identity cannot inherit the owner workspace.
6. Missing secret, invalid token, provider outage and membership-source conflict fail closed without leaking whether a private project exists.
7. Public snapshot access remains separately sanitized and read-only; it is never used as a private authorization fallback.

### Secret ownership

- Clerk publishable key is the only browser-visible provider configuration.
- Clerk secret key, Google client secret, Apple Services ID/private key/Key ID, exact owner email and canonical owner ID are private operator-owned runtime values.
- Private values live only in approved provider/Vercel environment storage. They never use a `VITE_` public prefix and never enter Git, Package documents, snapshots, browser bundles, screenshots, logs or Gate evidence.
- Cherry owns approval of creation and rotation. Builder may wire named environment contracts only after K1-K6 closure; it never receives or records raw credentials in handoff evidence.
- Rotation invalidates or replaces affected credentials, revokes impacted sessions where applicable, redeploys the pinned environment, and produces a redacted receipt. Exact rotation cadence belongs to K5.

### Audit boundary

Record only security-relevant event types: authentication outcome and provider category, authorization denial reason code, owner provision/revocation, workspace/project binding change, session revocation, secret-rotation receipt, and deployed contract version.

Never log raw email, OAuth authorization code, access/refresh/session token, session ID, provider subject, Apple private key, client secret, local path, raw Gate evidence or private project payload. Retention, export/deletion and alert thresholds remain K4-K5 decisions; K3 does not imply an audit database.

Official references reviewed on 2026-08-25 KST:

- OWASP authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP logging: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Clerk session verification: https://clerk.com/docs/guides/sessions/manual-jwt-verification
- Clerk session tokens: https://clerk.com/docs/guides/sessions/session-tokens
- Clerk environment variables: https://clerk.com/docs/guides/development/clerk-environment-variables

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
6. Approve or revise the K3 recommendation: one owner-viewer workspace, server-derived membership, Cherry Note/OUTCOME-only private allowlist, capability matrix, negative authorization tests, secret ownership and audit boundary.

## Builder entry condition

Builder work may start only after K1-K6 in `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` are evidence-closed by Cherry decisions. K1-K2 approval alone does not authorize provider installation or product code. The first implementation contract must then name provider, environment, exact allowed paths, red-first isolation tests, secret boundary, migration/rollback, preview verification, fresh UX & Product QA, and separate Release Audit. It must not add live collector relay, dispatch, project creation, billing, or release mutation by implication.
