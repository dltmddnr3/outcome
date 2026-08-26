# OUTCOME Phase 3 · Observer Bridge Synthetic Builder Brief

Status: **CHERRY-APPROVED DIRECTION / SYNTHETIC BUILDER HANDOFF READY / HOSTED AND REAL-USE LOCKED**

Observed: 2026-08-27 KST

## Authority and pin boundary

- documentation source commit: `70ecfef812ad89b0ed93bdaf5d2deae3cb02ff70`
- documentation source tree: `4071afbd48d14b0cd2505b942834daf82e06d408`
- architecture: `docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md`
- approved amendment: `docs/PHASE3_O2_OBSERVER_BRIDGE_CONTRACT_AMENDMENT.md`

This document is a complete future Builder handoff, but **the implementation source pin is not issued in this documentation slice**. A future Builder authorization must pin the exact HEAD/tree after these documents land. Until then, no code mutation is authorized.

## Future allowed paths — exactly three

1. `server/phase3-observer-bridge.mjs`
2. `server/phase3-observer-bridge.test.mjs`
3. `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_RECEIPT.md`

No existing module, document, Gate, Contract, Map, Package, API, UI or runtime file may change. In particular, do not modify `server/phase3-private-session-registry.mjs`, `server/phase3-observation-relay.mjs` or `server/account-access.mjs`.

The future implementation commit must contain only the module and focused test. The receipt must be a separate direct-child commit containing only the receipt.

## Candidate outcome

Build one in-memory, local-only Observer Bridge ledger that implements the architecture exactly:

- constructor-only source/key and synthetic viewer registrations;
- Node Ed25519 verification over fixed canonical bytes;
- strict exact event schema and six-state vocabulary;
- private append-only ledger, deterministic projection and finite safe audit;
- sequence/idempotency/quarantine/resync;
- read authorization for synthetic location classes;
- revoke, rotate, disable/read-only, restore and tombstone state;
- atomic fail-closed behavior with ID/revision continuity.

It must expose no network listener, HTTP route, account adapter, provider adapter, filesystem/private-store reader, browser integration, dashboard UI or dispatch channel.

## RED-first hostile matrix

Write failing tests against the absent implementation before implementation. The final focused suite must cover every group below.

### R1 · construction and primitive materialization

- absent, null, array, inherited, accessor-bearing and Proxy configuration;
- empty/duplicate/malformed source or viewer registrations;
- duplicate active project/role/binding/source generation;
- boxed strings/numbers, Symbol, bigint, NaN/infinity/unsafe integers;
- unknown, missing, non-enumerable or symbol event keys;
- accessor/Proxy traps are not invoked, including nested reentry attempts.

### R2 · exact schema and vocabulary

- one valid event with all twelve exact fields;
- each unknown or missing field rejected;
- all six exact Korean states accepted and preserved byte-for-byte;
- every other string rejected, including whitespace/case/NFKC/fullwidth variants, empty/long values, URLs, paths and prior free-text controls;
- noncanonical ISO, integer and base64url representations rejected rather than normalized.

### R3 · canonical bytes and signature tampering

- deterministic canonical byte fixture and SHA-256 digest fixture;
- valid memory-only Ed25519 signature accepted;
- tamper each of the eleven signed fields individually and prove denial;
- signature replacement, padding, alternate encoding, wrong key, malformed length and crypto error denied;
- event-supplied key material cannot influence verification;
- private or public key material never appears in serialized responses, audit or test logs.

### R4 · scope, versions and lifecycle denial

- wrong project, role, binding, source, source version and key version;
- revoked/replaced source and old key after rotation;
- wrong expected registry/ledger revision;
- viewer class without authorized private viewer record;
- revoked, cross-project, missing and malformed viewer denial is non-enumerating.

### R5 · sequence and recovery

- first baseline and exact next sequence accepted;
- exact duplicate digest returns one logical ledger revision;
- same sequence/different digest quarantines;
- lower sequence does not replace projection;
- gap quarantines and ordinary ingest cannot bypass it;
- explicit resync requires exact binding/source/key/last-sequence CAS;
- no automatic replay, redelivery, sequence/ID reuse or false accepted count.

### R6 · time and heartbeat

- exact future tolerance boundaries `+5_000ms` accepted and `+5_001ms` denied where otherwise valid;
- exact freshness/expiry boundaries, observed-after-expiry, already-expired and stale-at-ingest cases;
- read before and after heartbeat loss yields fresh then stale/offline with `status_code: null`;
- throwing, non-finite, regressing and out-of-ISO-range clock failures are atomic.

### R7 · failure atomicity and reentry

- signature verifier, digest, clock and response `structuredClone` throw/fail cases;
- input/config/viewer accessor and Proxy reentry against ingest and every lifecycle operation;
- nested mutation sees a finite reentry failure;
- outer failure leaves deep-equal state, ledger, audit, revisions, accepted counts and allocated IDs unchanged;
- public-safe errors contain no submitted private values and do not distinguish missing from unauthorized private scope.

### R8 · privacy, operations and non-authority

- projections contain only the architecture allowlist and omit source/key/signature/digest/event/viewer IDs and raw timestamps;
- anonymous projection exposes no project presence;
- `workstation` and `remote_device` read the same immutable revision without becoming identity/authority;
- revoke, rotate, disable/read-only, exact-revision restore and tombstone behavior;
- retention/tombstone leaves only finite safe counts/reasons and cannot resurrect private material;
- serialized state/loggable responses have prohibited content/identifier/path/credential/provider/UI-scrape hits `0`;
- output has progress, percentage, Gate, approval, dispatch, result/evidence sufficiency and completion authority fields `0`.

## Minimum public-safe reason vocabulary

The future module may return only finite codes required by the matrix, such as `input_invalid`, `configuration_invalid`, `scope_denied`, `signature_invalid`, `timestamp_invalid`, `expired`, `duplicate`, `duplicate_conflict`, `out_of_order`, `sequence_gap`, `resync_required`, `source_revoked`, `key_revoked`, `bridge_disabled`, `cas_mismatch`, `clock_unavailable`, `crypto_unavailable`, `materialization_failed` and `reentrant_mutation`. The Builder must minimize and freeze the exact set in tests; no submitted value or raw provider error is included.

## Required future validation

After a future exact-pin implementation authorization, run at minimum:

```sh
node --test server/phase3-observer-bridge.test.mjs
npm run test:package-model
npm run test:security
npm test
npm run build:isolated
npm run check:scope
npm run check:runbook
git diff --check
```

If the repository scripts drift before authorization, the Builder must report source drift and obtain a refreshed handoff rather than silently narrowing checks. Browser execution is not required for the local module, but existing browser/UI regressions included by the then-current full check must not be weakened.

## Operation and dependency boundary

- Ephemeral Ed25519 test keys are generated in memory only and never exported, printed or written.
- No dependency install is expected; use the Node standard `crypto` module.
- Network, provider, account, real device, browser, credential and private-store operations are `0`.
- No local companion process, HTTP server, hosted database, auth resource, environment, deploy, release, push or external message.
- No prompt/result/chat/message/dispatch path.
- No edits outside the exact future allowed paths.

## Receipt requirements

The future receipt must record exact source/implementation commit, tree and parent; changed paths; canonical fixture digest; focused RED and GREEN counts; all regression/build results; prohibited disclosure/operation counts; rollback; residual unknowns; and the terminal status `SYNTHETIC_CANDIDATE_READY_ONLY` or `BLOCKED`.

It may not mark O2, hosted readiness, real two-viewer evidence, Routing T1–T7, Evidence E1–E6, QA, Audit, Cherry acceptance, Phase 3, release or external completion closed.

## Rollback and terminal boundary

Rollback is a revert of the future implementation commit followed by its receipt commit. Because the candidate is in-memory and local-only, there is no external state to undo.

A passing synthetic candidate still requires fresh independent QA. Even a fresh QA PASS only makes a separately authorized hosted account-auth stage eligible; it does not close O2 or authorize hosting/real use.

**ABANDON:** this brief is documentation handoff readiness, not an implementation pin or authority. Do not start until a future exact HEAD/tree authorization is issued.
