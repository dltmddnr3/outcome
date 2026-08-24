# Phase 2 · Account Access Outcome Contract

Status: `DRAFT · CHERRY DECISION REQUIRED`
Updated: 2026-08-25 KST

Decision boundary: `NO_ACCOUNT_IMPLEMENTATION_BEFORE_CHERRY_DECISION`

## Outcome

Cherry가 고정 공개 주소의 정제된 결과 지도는 계속 안전하게 볼 수 있고, 인증된 private workspace에서는 자신에게 허용된 프로젝트만 같은 OUTCOME Package 의미로 조회한다. 로그인이나 세션 활동은 Gate 진행·Cherry acceptance·release authority를 만들지 않는다.

## Current inherited truth

- The fixed public snapshot is available at `https://outcome-five.vercel.app/cherry-note-dashboard` and remains sanitized, GET-only, mutation-denied, and deployment-pinned.
- Registered Package portfolio foundation is evidence-closed for a validated registry and three-project fixture; the actual public registry still contains Cherry Note and OUTCOME only.
- The current deployment is a snapshot. It is not a durable database, live session relay, multi-PC collector, dispatch service, or completion authority.
- Phase 1 C1-C2 and the internal-use Local MVP scope were accepted by Cherry on 2026-08-25 KST. This does not approve an external public MVP, release, or `EXTERNAL_OUTCOME_COMPLETE`.

## Recommended v1 boundary

Recommendation: start with a **Cherry-only private workspace** behind one verified owner identity while preserving the current public sanitized snapshot as a separate read-only surface.

Why this is the smallest useful step:

1. It gives Cherry stable authenticated access across MacBook and mobile without first inventing teams, invitations, billing, or organization administration.
2. It keeps the already verified public feedback URL available while private project metadata can fail closed behind authentication.
3. It allows the data model to carry a tenant/workspace key from day one without claiming that multi-tenant sharing is implemented.

Deferred alternative: a general multi-tenant account service with invitations, member roles, shared projects, organization ownership, billing, and support operations. This requires a separate approved Stage after the owner-only workspace is proven.

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
- Session cookies are secure, HTTP-only, same-site, bounded in lifetime, revocable, and rotated after authentication.
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

1. Approve or revise the recommended Cherry-only owner workspace before general multi-tenant sharing.
2. Approve the identity provider and exact owner sign-in identity/domain.
3. Decide whether the current public sanitized snapshot remains publicly reachable beside the private workspace.
4. Approve collected account fields, retention window, deletion/export process, and audit retention.
5. Approve storage/hosting region, operational owner, recovery objective, and monthly cost ceiling.
6. Name the first projects permitted in the private workspace and provide their Package root/source authority separately.

## Builder entry condition

Builder work may start only after K1-K6 in `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` are evidence-closed by Cherry decisions. The first implementation contract must then name provider, environment, exact allowed paths, red-first isolation tests, secret boundary, migration/rollback, preview verification, fresh UX & Product QA, and separate Release Audit. It must not add live collector relay, dispatch, project creation, billing, or release mutation by implication.
