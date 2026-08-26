# OUTCOME Phase 3 · Observer Bridge Hosted Architecture

Status: **LOCAL SYNTHETIC QA PASS / HOSTED HANDOFF READY / IMPLEMENTATION AND DEPLOYMENT LOCKED**

Observed: 2026-08-27 KST

## Exact evidence and authority boundary

- hosted-planning source commit: `f864cdbe71e7d3e449bac2217a3ab17fa2034692`
- hosted-planning source tree: `8bf47c3a42e2eacaabc3ec38447c0b2982726d80`
- local synthetic candidate: `3b0852a607c9eef984e72e08211d0297b9cde7f0`
- local synthetic candidate tree: `888abbd3b65323e914bad3d5655e4c662096899f`
- fresh independent QA: `docs/PHASE3_OBSERVER_BRIDGE_FRESH_INDEPENDENT_V2_QA_3B0852A.md`
- QA verdict: `PASS_INDEPENDENT_QA_ONLY`
- approved semantic source: `docs/PHASE3_O2_OBSERVER_BRIDGE_CONTRACT_AMENDMENT.md`

The corrected local module is validated domain semantics only. It proves an in-memory finite signed-event state machine; it does not prove hosted authentication, enrollment, HTTP behavior, persistence, RLS, migration, deployment, a real companion, or two real viewers. This document prepares those boundaries but authorizes none of them.

O2 remains open and Phase 3 remains `17/43`. No progress, Gate, routing, QA/Audit acceptance, release or completion follows from this architecture.

## Relationship to current source

Current files provide precedents, not an existing hosted Observer Bridge:

| Existing source | Reusable contract precedent | Explicit non-claim |
| --- | --- | --- |
| `server/phase3-observer-bridge.mjs` | Exact six-state vocabulary, Ed25519 canonical event verification, source/key lifecycle, sequence, freshness, projection and atomic failure semantics | It is local and in-memory. It has no HTTP, account, database, enrollment or real viewer implementation. |
| `server/account-access.mjs` | Server-derived owner identity, active membership, workspace/project allowlist, read-only private projection and completion-authority separation | A valid identity alone does not authorize a bridge source, publisher or project. |
| `server/account-access-hosted.mjs` | Hosted Clerk session verification and server-side private workspace adapter precedent | It supplies browser/viewer identity precedent only. It does not supply companion machine identity or bridge storage. |
| `server/account-access-api.mjs` | Fail-closed private API error mapping and preserved public read-only boundary | It has no bridge endpoint and must not be described as one. |
| `supabase/migrations/202608250001_account_access_foundation.sql` | Private schema, tenant membership/project RLS, append-only snapshot and migration precedent | It contains no bridge tables, policies or grants. |

Hosted work must add a separate private ingest/auth/ledger boundary. Existing anonymous dashboard GET behavior and every existing public mutation `405 read_only` remain unchanged. No anonymous response reveals whether a private bridge project, source or event exists.

## Actors and authority separation

| Actor | Authority | Explicit denial |
| --- | --- | --- |
| Owner browser | A currently authenticated canonical owner may initiate enrollment, revoke or rotate an allowed source within a server-derived workspace/project/role/binding scope. | It cannot submit activity as the companion, mint a binding, bypass project membership, or close progress/Gates. |
| Local companion publisher | A locally generated private Ed25519 key may prove possession for one active server-issued source certificate and publish finite signed events. | It receives no Clerk cookie, owner token, static bearer, provider credential, private-store access or viewer authority. |
| Authenticated private viewer | A valid account session plus active workspace/project membership may read the private projection. | `workstation` or `remote_device` is a location label only and never identity or authorization. |
| Server operations authority | A separately authorized operator may disable ingest, force read-only, revoke a source/key, rotate server metadata or restore an exact revision. | It cannot manufacture events, NOW, progress, evidence, QA, Audit or acceptance. |

One actor never inherits another actor's authority. The owner enrollment act binds a publisher public key; it does not turn the companion into a Clerk user or the viewer into a publisher.

## Enrollment protocol

### 1. Owner creates a challenge

The browser calls an owner-only private mutation after server verification of:

- current Clerk-backed owner session;
- exact allowed origin and CSRF proof;
- one server-derived workspace and active project binding;
- finite role and active `binding_version`;
- requested source class and next `source_version` eligibility;
- no conflicting active source version.

The server creates one opaque `challenge_ref` with a cryptographically random challenge, exact workspace/project/role/binding/source scope, requested key algorithm `Ed25519`, issued time, exact `300`-second expiry, one-use state and CAS revision. The challenge is not a source credential. The future Builder must test the exact issue/expiry boundaries without extending them by retry or clock normalization.

### 2. Companion proves possession

The local companion generates its Ed25519 key pair locally. The private key never leaves the companion. It submits:

- `challenge_ref` and exact challenge bytes/digest;
- public Ed25519 key in canonical SPKI form;
- finite source class and source version requested by the challenge;
- a signature over a domain-separated enrollment message covering challenge, workspace/project/role/binding/source scope, source/key versions and public-key digest.

The endpoint uses no ambient browser cookie and accepts no Clerk user token as companion identity. The server resolves the challenge, checks expiry and unused state, validates every scope against the challenge, verifies proof of possession, rejects replay, then atomically consumes the challenge and creates one active source/key record. Wrong account/project/binding/source, stale challenge, duplicate public key or replaced binding fails without partial registration.

### 3. Server returns non-bearer metadata

The server returns only opaque device/source certificate metadata: certificate reference class, finite lifecycle state, source/key/binding versions and expiry/rotation policy class. The reference is not a bearer secret and cannot authenticate without a valid companion signature. No private key, owner session, provider token or static API key is returned.

### Lifecycle

- One active source version exists per workspace/project/role/binding scope.
- Challenge replay and concurrent completion use one transaction and CAS; exactly one completion may win.
- Revocation immediately denies ingest and marks projection stale/offline by the defined read model; it never replays the last event as new.
- Rotation is another proof-of-possession ceremony with expected source/key version and distinct canonical public key.
- Re-enrollment creates a new source version after explicit owner reconciliation; old and new histories remain distinct.
- A replaced binding quarantines in-flight enrollment and events. Nothing inherits or rebinds automatically.
- This design does not assume or request unsupported Clerk machine tokens.

## Planned private endpoint contracts

These are planning names, not implemented routes:

| Endpoint | Actor/authentication | Purpose and fail-closed behavior |
| --- | --- | --- |
| `POST /api/private/bridge/enrollments` | Owner browser session + membership + Origin/CSRF + idempotency | Create one scoped short-lived challenge. |
| `POST /api/private/bridge/enrollments/complete` | No cookie; challenge + Ed25519 proof | Atomically consume challenge and bind one public key/source certificate. |
| `POST /api/private/bridge/sources/revoke` | Owner browser or explicit operations authority + Origin/CSRF + CAS | Revoke an exact body-resolved source/key version without placing private references in a logged URL. |
| `POST /api/private/bridge/sources/rotate` | Owner browser creates challenge; companion completes proof | Rotate to a distinct public key and version without placing private references in a logged URL. |
| `POST /api/private/bridge/events` | Companion certificate lookup + signed request envelope; no ambient cookie | Authenticate request, enforce replay/rate/body/time bounds, then invoke domain ingest. |
| `GET /api/private/bridge/projection` | Authenticated viewer + active membership/project binding | Read privacy-minimal projection for one authorized project. |
| `POST /api/private/bridge/operations/disable` | Separate operations authority + exact revision | Disable ingest or force read-only without deleting history. |
| `POST /api/private/bridge/operations/restore` | Separate operations authority + exact disabled/data/schema revisions | Restore only a verified revision after rollback checks. |

All owner browser mutations require same-origin verification and an explicit CSRF token or equivalent approved double-submit/server-bound proof. `SameSite` cookies alone are defense in depth, not the full contract. Companion endpoints do not use ambient cookies; they use certificate scope, signature, nonce/request ID and replay state. Unknown, wrong-scope and revoked source responses share finite non-enumerating errors.

## Companion ingest envelope

The hosted request wraps, but does not weaken, the local module's exact twelve-field event:

```text
schema_version
certificate_ref
request_id
nonce
event
request_signature
```

- `event` is the exact canonical Observer Bridge event and retains its existing event signature.
- `request_signature` is an Ed25519 signature over a separate fixed-domain, fixed-order, length-prefixed envelope covering certificate reference, request ID, nonce and SHA-256 digest of the exact canonical event bytes.
- The server-issued certificate reference resolves workspace/project/role/binding/source/key versions; submitted event scope must match exactly.
- `request_id` and nonce are bounded opaque primitives stored for replay denial. Neither grants authority.
- Maximum body size, request rate, clock skew and nonce retention must be measured and pinned in the implementation tests.
- Authentication order is: body cap/content type → primitive materialization → certificate scope/status → request signature → nonce/request replay → event domain validation → sequence/idempotency → atomic persistence.

No browser cookie, owner bearer, private key, provider identifier, path, prompt/result or free text is accepted. Exact duplicate event digest remains idempotent; conflicting request/event reuse is quarantined, never promoted.

## Persistence and authorization model

Future migrations should add bridge-specific entities under the private schema rather than overloading Package snapshots:

| Entity | Minimum state and invariant |
| --- | --- |
| `bridge_sources` | workspace/project/role/binding/source versions, lifecycle, active certificate reference digest, CAS revision; one active source per exact scope. |
| `bridge_keys` | source version, key version, canonical public SPKI and digest, active/revoked/replaced state; public material only. |
| `bridge_enrollment_challenges` | random challenge digest, scoped authority, issued/expires/consumed timestamps, single-use state and idempotency/CAS data. |
| `bridge_events` | append-only canonical event fields/digest/signature verification result, sequence and ledger revision; no free text or private key. |
| `bridge_projection_checkpoints` | deterministic fold revision and finite status/freshness/count classes; rebuildable from accepted event history. |
| `bridge_request_replay` | bounded request ID/nonce digest, certificate/source version, expiry and outcome class. |
| `bridge_audit` | append-only finite action/reason/revision/time classes without raw account, source, request or event values. |
| `bridge_tombstones` | deletion scope, purge revision/time, restore re-delete marker and no-raw-resurrection proof. |

Authorization is always scoped by server-derived workspace, project binding, role, binding version, source and key version. Anonymous has no grants. Authenticated viewers receive select access only through membership/project RLS or a server endpoint enforcing the same predicates. Companion writes go through a server-only least-privilege transaction role; a companion never receives database credentials. Owner mutations cannot use a client project selector as authority.

Each ingest transaction locks/resolves the source revision, consumes replay state, appends the event/audit entry and advances the fold checkpoint atomically. Database error, serialization conflict, stale CAS, schema mismatch or response materialization failure commits nothing. Projection caches are keyed by immutable ledger revision; a cache may never outrun the database revision. Backup/restore must replay migrations and tombstones before reads resume.

## Privacy and retention

Stored and projected activity uses the exact finite six-state vocabulary only. Prohibited everywhere: prompt/result/chat content, provider/session/thread/turn identifiers, email/account values in event rows, paths, credentials, browser pixels, private keys and free text.

- Private viewer projection: project-safe role, binding version, finite status/freshness, safe observed-time class, immutable ledger revision and bounded counts.
- Public logs/metrics: finite reason code, count, latency/freshness bucket and revision parity only; no raw IDs or timestamps.
- Public/anonymous dashboard: no private-project presence by default.
- Retention: challenges and replay records expire on a bounded schedule; events/audit use an approved bounded retention class; exact durations require separate implementation/operations approval.
- Export: owner-authorized private export includes versioned finite events and lifecycle receipts but no private keys, auth tokens or raw internal identifiers.
- Deletion: revoke access first, write tombstone, purge private rows/keys/challenges/replay data, retain only safe deletion receipt, and reapply tombstones after restore so raw data cannot resurrect.

## Operations and rollback

- Feature flag defaults `off`; no route or migration implies activation.
- Independent ingest kill switch and private read-only mode preserve last verified projection with explicit stale/offline state.
- Source/key revoke and expected-version rotation are immediate and auditable.
- Heartbeat loss becomes stale then offline using pinned thresholds; it never becomes progress or failure evidence by inference.
- Enforce per-source and per-account rate/body limits, database/cost ceilings, clock-skew metrics, replay/conflict/gap alerts and revision/cache parity alerts.
- Backups, migration version, restore rehearsal and tombstone replay are promotion gates.
- Rollback disables ingest first, drains no queued events, pins the last verified database/schema revision, invalidates caches and verifies denial/read-only/public-405 boundaries. It never replays events or republishes a false NOW.

## Threat and failure matrix

| Threat/failure | Required response |
| --- | --- |
| Cross-account or cross-project owner/viewer | Non-enumerating deny before source/project disclosure; zero mutation. |
| Stolen enrollment code | Short expiry, one use, exact scope and companion proof of private-key possession; revoke challenge/source if suspected. |
| Compromised companion private key | Revoke source/key, disable ingest, preserve safe audit, require new owner-approved enrollment; no silent key inheritance. |
| Duplicate, replay or nonce reuse | Idempotent only for exact digest; conflict quarantine otherwise; no revision inflation. |
| Sequence gap or stale client | Quarantine and explicit resync/re-enrollment; no automatic replay. |
| Clock drift or expired event | Finite time denial; stale/offline projection; alert by bucket only. |
| Database partial failure or serialization conflict | One transaction rolls back event, replay, projection and audit together. |
| Cache split brain | Serve only revision-equal cache or fall back to verified database/read-only; never newer synthetic state. |
| Log leakage | Structured finite allowlist, prohibited-field scans and incident rollback; no raw request dumping. |
| Rate/body abuse | Reject before crypto/database where safe, apply per-source/account limits and cost stop. |
| Migration mismatch | Feature remains off/read-only; no schema auto-repair in request path. |
| Account-auth provider outage | Viewer and owner operations fail closed; companion ingest follows separately approved operations policy and cannot grant viewer access. |

## Staged proof and non-authority

1. Hosted domain/storage synthetic candidate under a new exact source pin.
2. Private API enrollment/ingest/view authorization candidate, still disabled and local/preview-verifiable.
3. Postgres migration and real RLS/transaction proof in an isolated authorized environment.
4. Operations/privacy/rollback verification.
5. Fresh independent hosted-candidate QA.
6. Separately authorized account-authenticated hosted preview and hosted QA.
7. Only then, a real ten-minute O2 proof where authenticated Mac mini and MacBook/mobile viewers independently read the same immutable revision and freshness window.
8. Separate Audit and Cherry acceptance.

The two viewers are readers of one OUTCOME-owned signed projection, not independent provider readers. Provider-native introspection remains zero. Chat/message dispatch and Planner Routing T1–T7 remain separately locked. No stage here closes O2 without the real two-viewer evidence.

## ABANDON

**ABANDON:** this architecture proves hosted handoff documentation completeness only. It authorizes no code, migration, account/provider resource, environment, companion, database, network, deploy or real-use operation and grants no O2, progress, routing, QA, Audit, release or Cherry acceptance authority.
