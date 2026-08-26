# OUTCOME Phase 3 · Observer Bridge Fresh Independent V2 QA

Status: **PASS_INDEPENDENT_QA_ONLY / LOCAL SYNTHETIC ONLY / O2 OPEN**

Observed: 2026-08-27 KST

## Immutable candidate verification

- candidate commit: `3b0852a607c9eef984e72e08211d0297b9cde7f0`
- candidate tree: `888abbd3b65323e914bad3d5655e4c662096899f`
- direct parent and prior QA report commit: `b615e7cf64c9c48e45065c3be5f1e43523d18333`
- subject: `fix: own observer bridge verification keys`
- correction changed paths, exactly `3`:
  - `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_CORRECTION_V2_RECEIPT.md`
  - `server/phase3-observer-bridge.mjs`
  - `server/phase3-observer-bridge.test.mjs`
- implementation SHA-256: `2fd5686f66eaf167493b9df0481eb8676d54cbb4535535eda93d21c67b436acd`
- focused-test SHA-256: `4335121d495e32cbd08dcdd5597dca308652ecb5362245d5e5e53bb4d3a6cbe6`
- V2 correction receipt SHA-256: `8f7518fb9bed3d156b1ad079541d74cdcaf7b85700220b080339ea29ec202d35`

The exact candidate was checked out detached in a new isolated temporary worktree. The contract amendment, architecture, Builder brief, both prior FAIL reports, both correction receipts, implementation and focused tests were read directly. Builder and prior reviewer claims were treated as hypotheses. Pin, tree, parent and the exact three-path correction boundary matched; no `SAFE_HOLD` condition occurred.

## Verdict

`PASS_INDEPENDENT_QA_ONLY`

The ordinary local in-memory JavaScript state-machine correction withstands fresh independent refutation within the authorized synthetic boundary. This verdict makes this local Observer Bridge candidate eligible only for Planner promotion and separately authorized hosted planning. It is not hosted readiness, O2 PASS, Release Audit, Cherry acceptance, release or external completion.

## V2 F3 · owned verification-key boundary

### Decorated non-Proxy keys

An independent temporary probe exercised `28/28` decorated-key contexts: `14` at construction and the same `14` at rotation.

- own enumerable data substitutions for `.equals`, `.export`, `type` and `asymmetricKeyType`;
- own enumerable accessors for each of those four names;
- own non-enumerable substitutions for each of those four names;
- own symbol data and own symbol accessor decorations.

Every constructor case failed as `configuration_invalid`; every rotation case failed as `input_invalid`. Caller callback/accessor executions were `0`. Failed rotation ledger revision, registry revision, audit entry and observable ID consumption were all `0`.

### Proxy and type confusion

- constructor public-key Proxy: `configuration_invalid`, trap hits `0`;
- rotation public-key Proxy: `input_invalid`, trap hits `0`;
- nested mutation calls from Proxy traps: `0`;
- RSA public key: rejected at construction and rotation;
- Ed25519 private key: rejected at construction and rotation;
- symmetric secret `KeyObject`: rejected at construction and rotation.

All failures preserved empty audit and ledger revision `0` in their isolated fixtures.

### Server-owned snapshot and later-path independence

Direct code inspection and execution confirm the server boundary is native, borrowed and brand-safe:

1. Proxy rejection and own descriptor/symbol comparison occur before caller property evaluation.
2. The captured native public-key prototype `export` function is invoked with `Reflect.apply`; caller `.export`, `.equals`, `type` and `asymmetricKeyType` are not dispatched.
3. Canonical SPKI DER is copied, reconstructed through `createPublicKey`, re-exported through the borrowed native boundary, checked as public Ed25519, and frozen.
4. State retains only the server-owned KeyObject and immutable canonical DER encoding.
5. Key identity compares decoded canonical DER with equal-length native `timingSafeEqual`; caller `.equals` is never used.

After accepted construction, replacing all four named properties on the caller's original key did not affect a valid signed ingest or same-DER denial; callback/accessor hits remained `0`. A clean new KeyObject reconstructed from identical SPKI DER was denied without caller `.equals`, and the prior ledger/audit state remained unchanged.

After a valid distinct Ed25519 rotation, replacing the caller rotation key's `.equals` and `.export` did not affect resync or revocation; caller callback hits remained `0`. The valid distinct rotation, signed resync and key revocation sequence returned exact finite results and revisions.

A static scan found direct caller-key `.equals()`, `.export()`, `.type` or `.asymmetricKeyType` dispatch in the candidate module: `0`. The only direct `.export()` match in the focused test is test-fixture DER creation, not a server path.

## F1 and F2 non-regression

### F1 · exact independent response materialization

The independent probe covered `18/18` cases:

- `16` structural substitutions spanning extra prohibited fields, missing/changed fields, same-object alias, accessor, non-enumerable and symbol properties, outer/nested Proxy, callable value, draft mutation, array descriptor/shape changes, nested changes and shared identity;
- one ingest response substitution; and
- one registry-mutating rotation response substitution.

Every case failed as `materialization_failed`. Proxy trap hits were `0`; returned prohibited field hits were `0`; failed state, ledger revision, registry revision, audit entry and observable ID consumption were `0`. The next valid ingest allocated ledger revision `1`; the next valid rotation allocated ledger revision `1` and registry revision `2`.

### F2 · nested public-key Proxy

Both exact nested-Proxy contexts passed: constructor and rotation reject before trap evaluation. Combined Proxy trap hits were `0`; nested operation calls were `0`; failed state/revision/audit/ID consumption was `0`. Valid ordinary Ed25519 key lifecycle behavior remained intact.

## Nearby state-machine verification

The independent temporary probe completed `8/8` test groups and recorded `88` nearby assertions in addition to the F1/F2/F3 matrices.

- strict event/configuration/viewer/lifecycle own-data schemas, missing/unknown keys, accessors and hostile primitives;
- exact six-state vocabulary and fixed canonical signing domain/order/UTF-8 bytes;
- canonical unpadded 64-byte base64url signatures and malformed/padded denial;
- signed-field tamper denial for all `11/11` semantic fields without ledger consumption;
- exact scope, binding/source/key versions, duplicate identity, lower sequence, conflict, gap and explicit CAS resync;
- future boundary at `+5,000ms`, denial at `+5,001ms`, expiry, and fresh-to-stale-to-offline read decay;
- wrong/missing/cross-class viewer denial and deep-equal workstation/remote-device projections;
- privacy-minimal response and audit allowlists;
- disable, exact-revision restore, source/key lifecycle and tombstone behavior;
- clone/dependency failure and mutation reentry atomicity;
- absence of progress, percentage, Gate, approval, dispatch and completion-authority fields.

Serialized public prohibited-value hits were `0`. Progress/Gate/approval/completion-authority field hits were `0`. Source/key/signature/event digest/viewer/raw-time disclosure hits were `0`.

## Focused and proportional regressions

| Check | Result |
| --- | --- |
| temporary fresh independent probe | `8/8 PASS`; F3 `28/28`, F1 `18/18`, F2 `2/2`, nearby assertions `88`, signed-field tamper `11/11` |
| `node --test server/phase3-observer-bridge.test.mjs` | `17/17 PASS` |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local mutation `32/32 = 405`; API read-only JSON `28/28`; empty page boundary `0/4` |
| `npm run test:security` | `29/29 PASS`; prohibited disclosures `0`; Gate evidence fields `0`; client environment leaks `0/6` |
| `npm test` | frontend `89/89 PASS`; server Node `161/161 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `189/189 PASS` |
| `npm run build` | `1652` modules transformed; PASS |
| `npm run check:scope` | `37` files; PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

No dependency was installed. Existing canonical workspace dependencies were used read-only through one temporary `node_modules` symlink, which was removed before report commit.

## Privacy, state-consumption and operation counts

- F3 caller callback/accessor hits: `0`
- F3 public-key Proxy trap hits: `0`
- retained constructor/rotation caller-key mutation hits: `0`
- F1 prohibited response hits: `0`
- F1 response Proxy trap hits: `0`
- F2 nested public-key Proxy trap hits: `0`
- failed adversarial state/revision/audit/observable-ID consumption: `0`
- ordinary public serialized prohibited disclosure hits: `0`
- progress/Gate/approval/completion-authority field hits: `0`
- provider-native introspection operations: `0`
- provider/session/thread/turn read, list, resume or mutation operations: `0`
- prompt/result/chat/message/dispatch operations: `0`
- real account, hosted authentication, browser, real device, private-store or credential operations: `0`
- network calls, HTTP listeners, hosted database or companion processes: `0`
- dependency installs: `0`
- Gate, Map, Contract, architecture, brief, progress, API, UI, runtime or canonical-checkout mutations: `0`
- pushes, deploys, releases and external messages: `0`
- static filesystem/network/HTTP/child-process import or call matches in candidate module and focused test: `0`

Repository mutation for this QA is exactly this one report file. The report commit, tree and report SHA-256 are measured after the immutable commit and returned in the QA handoff; they cannot be self-embedded without changing those identities.

## Open-state and authority boundary

- O2 remains `OPEN`.
- Phase 3 remains `17/43`.
- hosted/account-authenticated Observer Bridge planning and implementation remain separate and require explicit authorization.
- real workstation/remote-device viewers remain open.
- real routing and Planner Routing T1–T7 remain open.
- Evidence Continuity E1–E6 remains open.
- separate Release Audit remains open.
- Cherry acceptance remains open.
- release/deploy/external completion remain open.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

This report does not integrate the candidate into canonical, edit any Gate/Map/Contract/progress source, execute hosted or external systems, or grant Audit, acceptance, release or completion authority.

## ABANDON

**ABANDON:** this PASS proves only the ordinary local synthetic Observer Bridge candidate at the exact immutable pin. It grants eligibility for Planner promotion and separately authorized hosted planning only; it does not prove O2, hosted/account behavior, real viewers, routing, Audit, Cherry acceptance, release or external completion.
