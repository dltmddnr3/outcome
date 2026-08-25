# Phase 2 · Account Access Outcome Contract

Status: `K1-K6 APPROVED · BUILDER HANDOFF OPEN`
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

## Approved K3 workspace isolation contract

Approved 2026-08-25 KST: keep authentication, workspace membership, project visibility, operator authority, and public snapshot access as separate decisions. A valid Clerk session proves identity only; it never grants a project by itself.

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

## Approved K4 durable data contract

Approved 2026-08-25 KST: use **Supabase managed Postgres Pro in Northeast Asia (Seoul, `ap-northeast-2`)** as the durable account/workspace/project/snapshot source. Keep the fixed Vercel public dashboard as a deployment-pinned sanitized projection, not as the database authority.

Why Pro is the minimum operational recommendation: managed Pro projects receive daily backups with the latest seven days available. Free projects require operator-maintained exports and do not provide the same managed restore evidence. PITR is deferred until the write rate or public multi-user risk justifies its compute/add-on cost.

### State ownership and minimum schema

| State | Owner | Required behavior |
| --- | --- | --- |
| `workspaces` | OUTCOME database | One v1 Cherry workspace; stable internal ID, lifecycle state, timestamps |
| `workspace_memberships` | OUTCOME database | Canonical Clerk user ID to workspace relationship; one active `owner-viewer` in v1 |
| `projects` and `project_bindings` | OUTCOME database | Explicit Package identity, workspace binding, visibility and lifecycle; no path/credential authority in browser data |
| `package_snapshots` | OUTCOME database | Append-only Package projection with schema version, source digest, observed/captured time and validation state |
| current snapshot pointer | `projects` | Updated transactionally only after a complete validated snapshot insert |
| `deployment_receipts` | OUTCOME database | Immutable snapshot ID + Git commit/tree + built asset + deployment ID/created time; never completion authority |
| deletion ledger | OUTCOME database | Request, access-revoked time, purge deadline, purge receipt and restore re-delete marker |

Security boundary:

- Configure Supabase's current Clerk third-party authentication integration; do not use the deprecated shared-JWT-secret/JWT-template integration.
- Browser reads use the Supabase publishable key plus the verified Clerk session token. The Supabase secret/service-role key is server-only and never enters a `VITE_` variable or browser bundle.
- Exposed tables/views require explicit Data API exposure/grants and RLS. `TO authenticated` alone is insufficient: every policy must match the validated Clerk subject to an active workspace membership and the requested project binding.
- Anonymous receives no private-table grants. Service-role ingestion is a separate server-side capability with exact project binding checks and no user-facing reuse.
- Views use invoker security or remain in an unexposed schema. No public `SECURITY DEFINER` function is introduced to bypass policy failures.

### Snapshot freshness and deployment projection

1. A sync attempt writes a new append-only snapshot only after Package parsing, identity, hierarchy, Gate-source and redaction validation succeed.
2. The project `current_snapshot_id` changes in the same transaction. A partial or failed ingest leaves the prior pointer intact and records failure separately.
3. Every private response exposes `observed_at`, `captured_at`, snapshot ID/schema version and freshness state. Session/NOW activity never refreshes Package evidence.
4. A public deployment selects one validated snapshot, sanitizes it, and binds its immutable snapshot ID to Git commit/tree/asset and Vercel deployment receipt.
5. A failed sync or deploy never relabels old data as current. The UI keeps the last valid snapshot with explicit stale/error state.
6. v1 refresh authority is the approved private operator or an explicitly invoked read-only ingestion job. Live multi-PC relay and autonomous polling remain deferred.

### Retention, export and deletion recommendation

- Active workspace/project identity and current snapshot: retained while active.
- Superseded private Package snapshots: retain 90 days, except a snapshot referenced by a deployment receipt or acceptance evidence.
- Deployment receipts and their referenced sanitized snapshots: retain while the project is active and for 365 days after project removal.
- On-demand owner export: versioned JSON archive containing workspace/project registration, allowed account metadata, Package snapshots, deployment receipts and deletion ledger. Exclude secrets, raw provider tokens, session identifiers and operator credentials.
- Deletion request: revoke private access immediately, create a 30-day recoverable deletion ledger entry, then hard-delete workspace membership, project bindings and unretained snapshots.
- After hard deletion, data may remain only in provider backups until the seven-day managed backup window expires. Any restore must replay the deletion ledger before service reopening so deleted data is not resurrected.
- Exact security-audit retention remains K5; K4 covers durable product/account/snapshot data only.

### Migration and recovery recommendation

- Schema is reproduced exclusively from reviewed, timestamped SQL under `supabase/migrations/`; production Dashboard edits are drift and must be captured or rejected before the next change.
- Each change runs locally with `supabase db reset`, generates current types, executes RLS negative tests, and previews remote application with `supabase db push --dry-run` before an approved production push.
- Before a destructive or irreversible production migration, take a logical dump and record its encrypted private location and checksum. Never run `db reset --linked` against production.
- Rollback uses a reviewed compensating migration when data-compatible; otherwise restore the closest backup and replay accepted migrations plus the deletion ledger.
- OUTCOME operational objectives for v1: `RPO ≤ 24h`, `RTO ≤ 8h`. These are acceptance targets, not a Supabase SLA.
- Restore evidence is required before external MVP: restore into an isolated non-production project, replay migrations/deletion ledger, validate row counts and snapshot/receipt referential integrity, and record elapsed time. Repeat quarterly after launch and before any high-risk migration.

Fail closed: missing Clerk integration, missing Supabase secret, RLS/policy conflict, schema-version mismatch, stale membership, failed transaction, backup unavailable or restore verification failure prevents private workspace service or deployment promotion; it never substitutes the public snapshot as authenticated data.

Official references reviewed on 2026-08-25 KST:

- Supabase Clerk integration: https://supabase.com/docs/guides/auth/third-party/clerk
- Supabase backups/PITR: https://supabase.com/docs/guides/platform/backups
- Supabase regions: https://supabase.com/docs/guides/platform/regions
- Supabase local migration workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase Data API security: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase changelog: https://supabase.com/changelog.md

Changelog boundary: the 2026 Data API change means new tables are not assumed to be exposed automatically; grants/exposure and RLS are both explicit. Current management-log, extension pinning and self-hosted gateway breaking changes do not alter this managed-Postgres recommendation.

## K5 operations contract · approved 2026-08-25 KST

Recommendation: operate the first account service as a Cherry-only read-only private surface with explicit abuse caps, minimal security telemetry, a monthly infrastructure ceiling, staged promotion and one-command-equivalent private-surface rollback. Provider defaults are not completion evidence.

### Abuse and request controls

- Keep public snapshot routes GET-only and preserve the existing canonical 405 response for all mutations.
- Keep public self-signup and invitation routes absent. Clerk's provider rate limits protect its authentication endpoints; OUTCOME honors `429` and `Retry-After` without retry storms.
- Apply one Vercel WAF rate-limit rule to OUTCOME private/API paths for the initial Hobby/preview surface: 120 requests per 10 minutes per source IP. Provider callbacks and static assets are excluded by exact path matching.
- Limit manual/scheduled Package ingestion to 6 attempts per project per hour, require an idempotency key and reject concurrent sync for the same project.
- Reject unknown content types, oversized payloads and unregistered project IDs before database work. The implementation contract must set the payload cap from measured Package fixtures rather than inventing it here.
- Supabase Pro Spend Cap stays enabled. No PITR, custom domain, read replica, branch compute, additional disk/IOPS or paid Clerk add-on is activated by implication.

### Operational metrics and alert contract

Track exact counts/ages, never an invented progress percentage:

- page/API/health availability and 5xx count;
- authentication success/failure/429 counts by provider category without user identifiers;
- authorization-denial count by reason code and cross-workspace negative-test result;
- current snapshot age, consecutive sync failures and validation conflict count;
- deployment commit/tree/asset/snapshot receipt parity;
- database connection/query failures, migration version and latest verified backup/restore receipt age;
- public mutation status and prohibited-disclosure scan result;
- daily provider usage and projected monthly OUTCOME infrastructure cost.

Alert thresholds for v1:

- Immediate SEV1: any private-data exposure, cross-workspace access, secret/token disclosure, public mutation not 405, or deployment receipt mismatch.
- SEV2: page/API/health fails 5 consecutive probes, three consecutive sync failures, current snapshot age exceeds 24 hours without an explicit paused state, database unavailable, or backup/restore evidence missing at a required gate.
- Cost alert: notify at `$40`, restrict nonessential ingestion at `$60`, and stop new sync/deployment work at the `$75` monthly ceiling. Existing sanitized public read-only delivery remains available when safe.

### Incident ownership and response

- Cherry is decision owner. The assigned Builder/operator performs containment only within the approved runbook. Fresh UX & Product QA and Release Audit remain independent and cannot be replaced by the operator.
- SEV1 target: acknowledge/notify Cherry within 15 minutes; disable the private surface, revoke affected sessions, rotate exposed secrets, preserve evidence without raw credentials, and keep the public snapshot only if redaction/isolation is independently unaffected.
- SEV2 target: acknowledge within 1 hour and restore or establish a safe degraded read-only state within the K4 eight-hour RTO.
- SEV3 documentation/UX drift is triaged by the next working day and cannot silently change a Gate.
- Every incident receipt records severity, detected/contained/recovered timestamps, affected deployment/snapshot IDs, actions, verification and follow-up owner. It never includes tokens, email or secret values.

### Cost and purchasing boundary

- OUTCOME recurring infrastructure ceiling for this phase: **USD 75 per month**, including new Supabase, Vercel, Clerk and supporting metered usage attributable to OUTCOME.
- Existing Apple Developer membership and separately approved domain registration are outside the monthly ceiling; any new annual, one-time or paid add-on purchase still requires explicit Cherry approval.
- Supabase Pro's current base price is USD 25/month with a default spend cap for covered overages. PITR currently starts at an additional USD 100/month and is therefore outside this phase.
- Vercel Spend Management requires Pro; the current Hobby project does not upgrade automatically. If a later approved Pro upgrade occurs, configure spend alerts/action before promotion.

### Staged rollout and rollback acceptance

1. Local: migrations, synthetic fixtures, RLS/authorization negatives and provider adapters without production secrets.
2. Isolated preview: development provider instances and synthetic/non-private Package data only.
3. Cherry-only production read-only: one canonical owner and Cherry Note/OUTCOME allowlist; no mutations or background autonomous sync.
4. Fresh affected UX & Product QA on the exact candidate.
5. Separate fresh Release Audit covering auth, RLS, deletion/export, restore, cost and rollback receipts.
6. Cherry MacBook/mobile acceptance on the exact production candidate.
7. External public MVP remains a separate explicit release decision.

Rollback triggers: any SEV1, failed isolation test, migration/receipt mismatch, failed restore verification, uncontrolled cost, or candidate regression. Rollback disables the private surface/feature binding, re-points to the last verified deployment when safe, revokes affected sessions, and restores the last verified database state only through the approved K4 runbook. Rollback success requires page/API health, private deny checks, public 405/redaction, receipt parity and data-integrity evidence.

Official references reviewed on 2026-08-25 KST:

- Clerk rate limits: https://clerk.com/docs/guides/how-clerk-works/system-limits
- Vercel WAF rate limiting: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Vercel Spend Management: https://vercel.com/docs/spend-management
- Supabase cost controls: https://supabase.com/docs/guides/platform/cost-control
- Supabase pricing: https://supabase.com/pricing
- Supabase backups: https://supabase.com/docs/guides/platform/backups

## K6 result acceptance contract · approved 2026-08-25 KST

Recommendation: K6 approval opens one bounded Builder implementation Stage for a Cherry-only, authenticated, read-only workspace. It approves the result contract and implementation scope below; it does not itself create provider tenants, OAuth credentials, Apple keys, paid resources, production databases, custom domains, accounts or a release.

### Allowed first implementation scope

- Preserve the existing public sanitized dashboard and canonical mutation `405` behavior without login.
- Add one private entry and authenticated workspace shell for the canonical Cherry owner, with Google primary, Apple linked access and email verification-code fallback behind the approved Clerk contract.
- Resolve workspace membership on the server and expose only the explicitly registered Cherry Note and OUTCOME Package projections.
- Read the approved Supabase schema through server-owned access with RLS and deny-by-default authorization; no client-provided workspace/project identifier grants visibility.
- Provide login, loading, empty, stale, conflict, unavailable, session-expired, access-denied and safe degraded read-only states on MacBook and mobile.
- Add the K4 lifecycle and K5 operational contracts: append-only snapshots/current pointer, deletion/export workflow hooks, redacted telemetry, alert/receipt fields and rollback binding.
- Add red-first automated tests, migrations, synthetic fixtures, preview configuration contracts, operator runbook and rollback procedure. Use placeholders or named environment contracts only; never commit secret values.

### Explicitly outside this implementation authorization

- Self-signup, invitations, organizations, multiple users/workspaces, admin or billing UI.
- Project creation, Package authoring, session relay/chat, role dispatch, live multi-PC collector or autonomous sync.
- Gate, approval, release, Git, database-content or project-state mutation from the dashboard.
- NOL AX, Cherry Picker or any project beyond the two-project allowlist.
- Public-service release, external public MVP, paid-plan purchase, provider tenant/account creation, OAuth consent publication, Apple key issuance, production secret entry, domain mutation or production database creation without a separate exact mutation approval.

### K6 acceptance evidence

K6 may close only when Cherry explicitly approves this exact result contract. That approval opens Builder work; it is not implementation PASS. The later implementation Stage must prove all of the following independently:

1. Public regression: page/API/health remain available, public payload stays sanitized, every mutation remains `405`, and receipt commit/tree/asset/snapshot parity is exact.
2. Authentication: approved Google, Apple and email-code paths plus logout, seven-day expiry, revocation, recovery and provider-failure states pass without leaking credentials or account identifiers.
3. Authorization: unauthenticated, wrong-owner, forged workspace/project, unregistered project and stale-membership probes all deny; only the two-project allowlist is visible.
4. Data: migrations and RLS are pinned; append-only snapshot/current-pointer behavior, retention, export, deletion and tested restore meet K4 without inferring freshness.
5. Operations: K5 rate limits, metrics, alerts, incident receipts, cost thresholds, staged rollout and rollback are reproducible with exact evidence.
6. UX: MacBook and mobile clearly distinguish public/private, current/touched hierarchy, loading/empty/error/stale/conflict/access-denied/session-expired states, and preserve 200% zoom/keyboard/touch accessibility.
7. Boundaries: account/session activity never closes a Gate; provider defaults, tests, deployment and operator statements never substitute for independent QA, Release Audit or Cherry acceptance.

### Role and promotion sequence

1. Planner pins the immutable K1-K6 contract and issues one exact Builder ticket.
2. Builder implements only the allowed scope in an isolated candidate and supplies tests, migrations, receipts, rollout and rollback evidence.
3. Fresh UX & Product QA independently verifies the affected public/private journeys on the exact candidate.
4. A separate fresh Release Audit verifies auth, RLS, privacy/data lifecycle, operations, costs, runtime identity and rollback on the same pins.
5. Cherry physically accepts MacBook and mobile behavior and separately decides any production resource mutation and release.

No role may self-promote its own result. A QA PASS grants only its named downstream review; a Release Audit PASS is not Cherry acceptance or release approval.

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
4. **Approved 2026-08-25 KST:** minimal account fields, 90/365-day retention, 30-day deletion, JSON export and redacted security-audit retention boundary.
5. **Approved 2026-08-25 KST:** Supabase Pro Seoul, Cherry decision ownership, Builder/operator containment, RPO 24h/RTO 8h and USD 75 monthly ceiling.
6. **Approved 2026-08-25 KST:** one owner-viewer workspace, server-derived membership, Cherry Note/OUTCOME-only private allowlist, capability matrix, negative authorization tests, secret ownership and audit boundary.
7. **Approved 2026-08-25 KST:** Supabase Pro Seoul, durable schema ownership, append-only snapshots, 90/365-day retention, 30-day deletion window, JSON export, managed backups, migration/restore procedure and RPO/RTO targets.
8. **Approved 2026-08-25 KST:** K5 public/private abuse caps, exact operational metrics/alerts, incident ownership, USD 75 monthly ceiling, seven-step rollout and fail-closed rollback acceptance.
9. **Approved 2026-08-25 KST:** K6 one bounded Builder Stage, explicit non-scope, seven evidence dimensions, independent UX/Product QA, separate Release Audit and Cherry physical acceptance.

## Builder entry condition

K1-K6 definition decisions are now evidence-closed. Builder work may start only from the exact pushed Planner handoff in `docs/PHASE2_ACCOUNT_ACCESS_BUILDER_HANDOFF.md`; it must use the named allowed paths, red-first isolation tests, secret boundary, migration/rollback, preview verification, fresh UX & Product QA, and separate Release Audit. This authorization does not create provider installation, production resource/secret/database/domain mutation, deployment, release, live collector relay, dispatch, project creation or billing authority by implication.
