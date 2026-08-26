# OUTCOME Phase 3 · Observer Bridge Synthetic Builder Receipt

Status: **SYNTHETIC_CANDIDATE_READY_ONLY / LOCAL IN-MEMORY ONLY / O2 OPEN**

Observed: 2026-08-27 KST

## Exact authority and candidate boundary

- authorized source commit: `300d48bfc8af321bf92182a144178859596ef962`
- authorized source tree: `ad995fbbbe7d476af3da669660c49161be87e117`
- architecture: `docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md`
- Builder brief: `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md`
- implementation paths: exactly `server/phase3-observer-bridge.mjs`, `server/phase3-observer-bridge.test.mjs`
- receipt path: exactly `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_RECEIPT.md`

The final commit/tree are intentionally reported by the Builder after commit and are not embedded here, avoiding a circular self-hash claim.

## Implemented candidate

The local-only module implements:

- constructor-bound active source/public-key registration and exactly two synthetic viewer registrations/classes;
- Ed25519 verification with server-held public `KeyObject` only;
- exact twelve-field event, fixed-order length-prefixed UTF-8 canonical bytes and canonical 64-byte unpadded base64url signature;
- exact six-state Korean activity vocabulary;
- descriptor-first primitive materialization with Proxy detection before traps and whole-operation reentry guard;
- project/role/binding/source/key/time/signature/sequence validation before atomic draft publication;
- append-only safe audit, private event ledger, deterministic privacy-minimal viewer projection and heartbeat freshness decay;
- duplicate idempotency, conflict/gap quarantine, out-of-order denial and explicit revision/sequence-bound resync;
- source/key revoke, key rotation, disable/read-only, exact-revision restore and tombstone deletion semantics;
- atomic clock, crypto, digest, response-clone, materialization and reentry failure behavior.

The key-rotation review found and corrected one implementation defect before final verification: rotation initially left the previous status visible until resync. The final candidate projects `unknown` with `status_code: null` until a valid newly signed resync baseline is accepted.

## File hashes before receipt

- `server/phase3-observer-bridge.mjs`: SHA-256 `2240ca3a88f989c5ca4265b061582da49cacc9f33e82be7704fc8b9a2ff3f42b`
- `server/phase3-observer-bridge.test.mjs`: SHA-256 `78a3c63dcdc2fa53169a3d847c897fa79c8e1cbe42f23c489eb68dbef6d4e402`
- canonical signed-byte fixture SHA-256: `392d32bb5f1084fae349846415ee398ca76aae42cd04af85f11d20fe533999ae`

Ephemeral Ed25519 test keys remained memory-only. No key value was exported, printed, written or recorded in this receipt.

## RED-first evidence

1. Before either allowed implementation path existed:
   - command: `node --test server/phase3-observer-bridge.test.mjs`
   - result: exit `1`; `Could not find 'server/phase3-observer-bridge.test.mjs'`.
2. After adding the hostile test file but before adding the module:
   - command: `node --test server/phase3-observer-bridge.test.mjs`
   - result: exit `1`; `ERR_MODULE_NOT_FOUND` for `server/phase3-observer-bridge.mjs`; top-level test `0 pass / 1 fail`.
3. First executable implementation against the hostile matrix:
   - command: `node --test server/phase3-observer-bridge.test.mjs`
   - result: `7 pass / 5 fail / 12 total`.
   - real failures covered canonical byte/digest expectation, canonical signature representation, stale/expiry classification, tombstone projection and injected crypto failure reachability.

No RED result was fabricated or relabeled as PASS.

## Final focused evidence

- focused Observer Bridge: `13/13 PASS`.
- exact vocabulary: `6/6` accepted and byte-preserved; non-members and normalization/whitespace/case variants rejected.
- signed semantic fields tampered: `11/11` denied.
- viewer classes: `2/2` received one deep-equal minimal projection and ledger revision; wrong/missing/revoked/cross-project inputs returned one `access_denied` class.
- lifecycle Proxy envelopes: `7/7` rejected with trap hits `0` and ledger revision consumption `0`.
- canonical signature decoded length: exactly `64` bytes.
- source/key/signature/viewer/raw-time/progress/Gate/approval/completion sentinel hits in serialized public responses and audit: `0`.
- module/test console, network, HTTP, filesystem and child-process imports/calls: `0`.

## Full validation evidence

The first package/security attempt failed at module resolution because the fresh worktree had no `node_modules` (`yaml` and `@clerk/backend` unavailable). No dependency was installed. The existing canonical `node_modules` was connected with a temporary read-only worktree symlink, and all commands were rerun. The symlink is excluded and removed before commit.

| Command | Final result |
| --- | --- |
| `node --test server/phase3-observer-bridge.test.mjs` | `13/13 PASS` |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local mutation `32/32 = 405`; API read-only JSON `28/28`; page boundary `0/4` |
| `npm run test:security` | `29/29 PASS`; stable snapshot prohibited disclosures `0`; Gate evidence fields `0`; client env leaks `0` |
| `npm test` | frontend `89/89 PASS`; server Node `157/157 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `185/185 PASS` |
| `npm run build` | `1652 modules · PASS`; assets `index-DgbgRsT8.js`, `index-R1nuadtV.css` |
| `npm run check:scope` | `PASS · 37 files`; no unapproved relay/provider dependency |
| `npm run check:runbook` | `PASS` |
| `git diff --check` | `PASS` |

No product/API/UI/runtime/browser test was weakened or skipped.

## Privacy and operation counts

- provider-native introspection: `0`
- provider/session/thread/turn read, list, resume or mutation: `0`
- prompt/result/chat/message/dispatch operation: `0`
- real account/token/browser/device/private-store/credential operation: `0`
- network, HTTP server, hosted database or companion process operation: `0`
- dependency install: `0`
- existing module, Gate, Map, Contract, Package, API, UI or runtime mutation: `0`
- push, deploy, release or external message: `0`

## Rollback and residual boundary

Rollback is a revert of the single candidate commit. The candidate owns no external state, persistent key, provider resource, server process or hosted data.

Residual work remains deliberately open:

- fresh independent QA of the immutable synthetic candidate;
- separately authorized hosted account-auth adapter and hosted QA;
- real authenticated `workstation` plus `remote_device` O2 proof;
- Planner Routing T1–T7 and Evidence Continuity E1–E6;
- Release Audit and Cherry acceptance.

Phase 3 remains `17/43`, O2 remains `OPEN/LOCKED`, and `EXTERNAL_OUTCOME_COMPLETE=false`.

## ABANDON

**ABANDON:** this receipt proves only a local in-memory synthetic Builder candidate. It is not provider-native activity proof, hosted readiness, account authorization, real two-viewer evidence, O2 PASS, progress, QA, Audit, routing, release, Cherry acceptance or external completion.
