# OUTCOME Phase 3 · Observer Bridge Hosted Builder Brief

Status: **LOCAL SYNTHETIC QA PASS / HOSTED HANDOFF READY / IMPLEMENTATION AND DEPLOYMENT LOCKED**

Observed: 2026-08-27 KST

## Authority and source boundary

- documentation source commit: `f864cdbe71e7d3e449bac2217a3ab17fa2034692`
- documentation source tree: `8bf47c3a42e2eacaabc3ec38447c0b2982726d80`
- hosted architecture: `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md`
- local synthetic QA: `docs/PHASE3_OBSERVER_BRIDGE_FRESH_INDEPENDENT_V2_QA_3B0852A.md`
- local QA verdict: `PASS_INDEPENDENT_QA_ONLY`

This is a future Builder handoff, not an implementation authorization. No hosted implementation source pin has been issued. A later instruction must name an exact post-documentation HEAD/tree and exact allowed paths. Until then every proposed path below is **NOT YET AUTHORIZED**.

No Vercel, Clerk, Supabase, environment, secret, domain, deployment, real browser/device, companion or network mutation is authorized by this brief.

## Candidate objective

Prepare a disabled-by-default hosted Observer Bridge candidate that preserves the corrected local domain semantics while adding:

- owner-authenticated enrollment/revoke/rotation authority;
- companion proof-of-possession and signed request authentication without browser credentials;
- durable append-only events, deterministic projection and exact-version operations;
- account/project-authorized private viewer reads;
- RLS/transaction/privacy/retention/rollback evidence.

The candidate must not activate hosting, close O2, infer progress or claim real two-viewer use.

## Proposed future paths — not authorized

Prefer new bridge-specific files. A future Planner may narrow this list further; it may not silently broaden it.

| Proposed path | Narrow reason |
| --- | --- |
| `server/phase3-observer-bridge-hosted.mjs` | Compose the corrected domain module with source/enrollment/event stores and server-derived authorization ports. |
| `server/phase3-observer-bridge-hosted.test.mjs` | H1 adapter/storage synthetic and fail-closed composition tests. |
| `server/phase3-observer-bridge-api.mjs` | Pure request/response boundary for owner enrollment, companion ingest, viewer read and operations controls. |
| `server/phase3-observer-bridge-api.test.mjs` | H2 authentication, Origin/CSRF, signature/replay and public-405 tests. |
| `server/phase3-observer-bridge-postgres.mjs` | Narrow persistence adapter with transaction/CAS methods; no provider or HTTP ownership. |
| `server/phase3-observer-bridge-postgres.test.mjs` | H3 real PostgreSQL migration, RLS, transaction and rollback tests. |
| `supabase/migrations/<authorized_timestamp>_observer_bridge.sql` | Reviewed bridge tables, constraints, policies, grants and rollback-compatible schema. |
| `server/phase3-observer-bridge-operations.mjs` | H4 feature-off, ingest disable/read-only, retention/tombstone, metrics and restore controls. |
| `server/phase3-observer-bridge-operations.test.mjs` | H4 privacy, rate/cost, backup/restore and no-replay rollback assertions. |
| `api/index.mjs` | Minimal explicit private route dispatch only after all new boundaries pass; existing public GET/405 behavior byte-compatible. |
| `server/stable-host.test.mjs` | Regression proof that anonymous project presence, public mutations and stable payload remain unchanged. |
| `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_RECEIPT.md` | Immutable candidate evidence and limitations only. |

No broad account-access refactor, dashboard/UI change, existing migration rewrite, Contract/Map/Gate change or environment/config file is proposed. If integration cannot stay within a separately approved exact list, return `SAFE_HOLD_SCOPE_EXPANSION`.

## Implementation slices

### H1 · domain adapter and storage synthetic

- Reuse `server/phase3-observer-bridge.mjs` as the finite domain state-machine contract; do not rewrite its semantics into HTTP/database code.
- Define primitive ports for enrollment challenge, source/key registry, replay state, event append, projection fold and safe audit.
- Provide deterministic in-memory hostile tests for transaction drafts, CAS, duplicate/conflict/gap, clock, response materialization and disabled/read-only state.
- Keep all feature bindings off and expose no HTTP route.

### H2 · private API authentication and enrollment

- Owner endpoints require verified current account identity, active membership/project binding, exact Origin/CSRF and idempotency.
- Companion endpoints accept no ambient cookie or Clerk token; require challenge/source certificate, fixed canonical request signature, nonce/request ID and replay state.
- Viewer reads require server-derived workspace/project authorization; viewer location class is metadata only.
- Unknown/revoked/wrong-scope errors are finite and non-enumerating.
- Existing public routes and mutations remain unchanged; anonymous private project payload and presence hits remain `0`.

### H3 · PostgreSQL, RLS and migration

- Add new private bridge tables without mutating the existing migration.
- Test exact constraints, foreign keys, one-active-source uniqueness, key/source versions, append-only event/audit rules, replay uniqueness, projection revision and tombstone state.
- Execute real PostgreSQL tests for owner viewer allow/deny, anonymous deny, wrong workspace/project/role/binding deny and server-only ingest transaction authority.
- Prove event/replay/projection/audit atomicity under constraint, serialization and forced adapter failure.
- Prove migration apply, schema version check, backup/dump boundary, compensating rollback or restore plan and deletion-ledger replay.

### H4 · operations, rollback and privacy

- Feature flag defaults off; separate ingest kill switch and read-only fallback.
- Test rate/body/cost limits, clock skew, stale/offline thresholds, key/source revoke, rotation, retention, export, tombstone deletion and no raw resurrection.
- Metrics/logs expose finite reason/count/freshness/revision classes only.
- Rollback never replays events or refreshes NOW; cache revision cannot exceed durable revision.
- Provider outage, database failure, cache split brain and migration mismatch fail closed.

### H5 · candidate evidence and fresh QA handoff

- Record exact source/candidate commit/tree/parent, changed paths, migration hash, RED/GREEN counts, prohibited hits, rollback and residual unknowns.
- Candidate remains disabled and undeployed.
- Fresh independent QA runs from an immutable worktree and treats the Builder receipt as a claim.
- Even QA PASS only makes separately authorized hosted preview work eligible.

## RED-first matrix

The future Builder must record real failing tests before each implementation slice.

### R1 · actor and authority separation

- anonymous, wrong owner, stale/revoked session, wrong workspace/project, wrong role/binding and viewer-class-only attempts;
- owner trying companion ingest; companion trying owner/viewer operations; viewer trying mutation;
- client-supplied workspace/project/source selector cannot grant authority;
- account provider outage and membership conflict fail without project/source existence disclosure.

### R2 · enrollment and key custody

- expired, reused, wrong-scope, concurrently consumed and guessed challenge;
- stolen challenge without private-key proof;
- wrong algorithm, malformed/decorated/Proxy/duplicate key, stale source/key version and same-key rotation;
- callback/accessor/trap hits `0`, private/static bearer output `0`, one completion winner;
- revoke, rotate and re-enroll preserve distinct histories with no automatic inheritance.

### R3 · companion request authentication

- missing/malformed/oversized body, content type, certificate, request ID, nonce or signature;
- tamper each request-envelope and event field;
- wrong/revoked/replaced certificate, binding, source or key version;
- request replay, exact duplicate, conflict, lower sequence and gap;
- cookie/owner token supplied to companion path does not grant access;
- rate and clock-skew boundaries fail before persistence where required.

### R4 · viewer and public boundary

- authenticated owner reads only actively bound project projections;
- workstation and remote-device labels cannot authorize by themselves;
- two authorized viewer classes receive the same immutable revision;
- anonymous/private wrong-scope responses expose project/source/event presence `0`;
- existing public GET remains sanitized and every public mutation remains exact `405 read_only`.

### R5 · database, RLS and atomicity

- real PostgreSQL anonymous/cross-workspace/cross-project/wrong-role/wrong-binding negatives;
- direct client insert/update/delete denied; server ingest role is least privilege;
- challenge consume + source create, event + replay + projection + audit, rotate/revoke and tombstone transactions are all-or-nothing;
- duplicate key/source/sequence/request constraints, CAS loser and forced partial failure consume no revision/ID;
- migration mismatch and restore without tombstone replay keep feature unavailable.

### R6 · privacy, retention and observability

- prompt/result/session/thread/turn/path/credential/private-key/free-text fixtures rejected before storage;
- database rows, API output, errors, logs, metrics, audit, export and backups contain prohibited hits `0` where projected/loggable;
- retention expiry and deletion purge raw state while a finite deletion receipt remains;
- restore re-applies tombstones and cannot resurrect raw material;
- no event, heartbeat, count or viewer read creates progress, Gate, QA, Audit, approval or completion authority.

### R7 · operations and failure recovery

- feature-off, ingest-disabled and read-only modes;
- source/key compromise revoke, key rotation, stale/offline heartbeat loss and explicit re-enrollment;
- database outage, serialization conflict, crypto/clock/clone failure, cache split brain, rate abuse and cost stop;
- exact-revision restore and rollback preserve last verified revision without replay or false NOW;
- immutable safe audit and monotonic IDs across failures.

### R8 · candidate scope and non-authority

- exact authorized path set and migration hash;
- no environment values, provider resources, deploy configuration or client bundle additions;
- public boundary/security/account/full regressions unchanged;
- O2, progress, routing T1–T7, Evidence E1–E6, QA, Audit, acceptance, release and external completion remain open.

## Required future validation

The exact commands may be refreshed at authorization time, but the future minimum is:

```sh
node --test server/phase3-observer-bridge.test.mjs
node --test server/phase3-observer-bridge-hosted.test.mjs
node --test server/phase3-observer-bridge-api.test.mjs
node --test server/phase3-observer-bridge-postgres.test.mjs
node --test server/phase3-observer-bridge-operations.test.mjs
npm run test:package-model
npm run check:mutations
npm run test:security
npm test
node --test scripts/*.test.mjs server/*.test.mjs
npm run build
npm run check:scope
npm run check:runbook
git diff --check
```

PostgreSQL/RLS claims require an actual authorized local PostgreSQL-compatible execution with the exact migration; static SQL inspection is not sufficient. If that runtime is unavailable, return `BLOCKED_POSTGRES_RLS_PROOF` and do not claim H3.

## Evidence and rollback requirements

The future receipt must contain:

- exact authorization/source/candidate commit, tree and parent;
- exact paths and migration SHA-256;
- actual RED and GREEN commands/counts per H1–H4;
- real PostgreSQL/RLS operation counts and negative matrix;
- endpoint/auth/CSRF/signature/replay/status measurements;
- prohibited data, callback/trap, anonymous presence and public mutation hits;
- feature-off/default behavior, backup/restore/tombstone and rollback evidence;
- zero provider/resource/environment/deploy operations;
- terminal `HOSTED_CODE_CANDIDATE_READY_ONLY` or exact `BLOCKED` reason.

Rollback is code/migration-candidate rollback only until a later external authorization. Feature remains off, no event is replayed, no environment is changed and no provider resource is created. A future migration candidate must include a reviewed compensating/restore procedure before any remote application is authorized.

## Locked completion boundary

A passing hosted code candidate cannot close O2. A later authorization must separately cover hosted preview resources, account-auth runtime, real companion enrollment and the ten-minute two-viewer proof. Provider-native introspection stays zero. Chat/dispatch and Planner Routing T1–T7 remain locked.

## ABANDON

**ABANDON:** this brief is hosted Builder handoff documentation only. It provides no implementation source pin, file authority, migration execution, account/provider/environment/resource/deploy permission, O2 evidence, progress, routing, QA, Audit, release or Cherry acceptance.
