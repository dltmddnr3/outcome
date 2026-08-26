# OUTCOME Phase 3 · Observer Bridge Synthetic Correction V2 Receipt

Status: **CORRECTION_V2_CANDIDATE_READY_ONLY / FRESH QA REQUIRED / O2 OPEN**

Observed: 2026-08-27 KST

## Exact authority

- prior correction candidate: `be6ddb47917d3f614185dbeed25dbe29df0bf727`
- fresh independent re-QA report commit: `b615e7cf64c9c48e45065c3be5f1e43523d18333`
- report tree: `dabd969e47e078d7ffcf48a969307b4d27b89e3d`
- report SHA-256: `998f3657f788fafed38ca5575f658ea0db87fe07e9e578af58682862068e5af9`
- allowed implementation paths: `server/phase3-observer-bridge.mjs`, `server/phase3-observer-bridge.test.mjs`
- receipt path: `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_CORRECTION_V2_RECEIPT.md`

The final correction commit/tree are reported after commit and are not embedded in this self-containing commit.

## Actual RED

Before the F3 correction:

- command: `node --test server/phase3-observer-bridge.test.mjs`
- result: `15 pass / 2 fail / 17 total`;
- a non-Proxy Ed25519 KeyObject decorated with own caller behavior was accepted instead of rejected;
- a constructor-retained caller KeyObject whose own `equals` was replaced could bypass canonical same-key denial.

These failures were directly observed and were not inferred or relabeled as PASS.

## F3 correction

Caller KeyObjects are now one-time branded inputs only:

1. Proxy detection runs before all reflection.
2. Own descriptors and symbols are compared against Node's pristine native public-KeyObject representation without invoking descriptor values.
3. Any caller string decoration, unknown symbol, accessor or substitutable method is rejected.
4. A borrowed native public-key prototype export produces canonical SPKI DER without dispatching through caller-owned `export`, `equals`, `type` or `asymmetricKeyType` properties.
5. DER bytes are copied and reconstructed with `createPublicKey`; the resulting server-owned Ed25519 public KeyObject is validated and frozen after native lazy metadata is materialized.
6. Only the server-owned KeyObject and immutable canonical DER encoding are retained.
7. Key identity uses equal-length native `timingSafeEqual` over canonical DER bytes; caller `.equals` is never called.
8. Rotation snapshots and validates the proposed key before any draft mutation, denies identical DER and stores only the new owned snapshot.

Measured F3 cases:

- constructor decorations: `7/7` rejected;
- rotation decorations: `7/7` rejected;
- own `equals`, `export`, `type`, `asymmetricKeyType`, hidden property, generic accessor and symbol accessor callback/accessor hits: `0`;
- retained constructor-key and retained rotation-key caller mutations observed by the bridge: `0`;
- same-DER rotation: denied with state/revision/audit/ID consumption `0`;
- valid real Ed25519 rotation, resync and revocation: PASS;
- RSA, private key and Proxy key rejection: preserved.

The allowed module contains no remaining direct caller-key `.equals()`, `.export()`, `.type` or `.asymmetricKeyType` dispatch.

## F1/F2 non-regression

- exact deep-independent response clone hostile matrix remains PASS;
- clone substitution prohibited response hits: `0`;
- constructor and rotation public-key Proxy trap hits: `0`;
- failed hostile state/revision/audit/ID consumption: `0`.

## File hashes before receipt

- `server/phase3-observer-bridge.mjs`: SHA-256 `2fd5686f66eaf167493b9df0481eb8676d54cbb4535535eda93d21c67b436acd`
- `server/phase3-observer-bridge.test.mjs`: SHA-256 `4335121d495e32cbd08dcdd5597dca308652ecb5362245d5e5e53bb4d3a6cbe6`

## Final verification

| Command | Result |
| --- | --- |
| `node --test server/phase3-observer-bridge.test.mjs` | `17/17 PASS` |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local mutation `32/32 = 405`; API read-only JSON `28/28`; non-API empty-body boundary retained |
| `npm run test:security` | `29/29 PASS`; prohibited disclosures `0`; Gate evidence fields `0`; client environment leaks `0` |
| `npm test` | frontend `89/89 PASS`; server Node `161/161 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `189/189 PASS` |
| `npm run build` | `1652` modules; `index-DgbgRsT8.js`, `index-R1nuadtV.css`; PASS |
| `npm run check:scope` | `37` files; PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

The isolated worktree used the canonical workspace's existing dependencies through a temporary read-only `node_modules` symlink. Dependency installations: `0`. The symlink is removed before commit.

## Privacy and operation counts

- F3 callback/accessor/trap hits: `0`
- F1 prohibited output hits: `0`
- F2 Proxy trap hits: `0`
- failed adversarial state/revision/audit/ID consumption: `0`
- provider-native introspection: `0`
- provider/session/thread/turn read, list, resume or mutation: `0`
- prompt/result/chat/message/dispatch: `0`
- real account/token/browser/device/private-store/credential operation: `0`
- network, HTTP listener, hosted database or companion process: `0`
- dependency installation: `0`
- Gate, Map, Contract, architecture, brief, QA reports, API, UI or runtime mutation: `0`
- push, deploy, release or external message: `0`

## Rollback and open boundary

Rollback is a revert of the single V2 correction commit after the re-QA report. It owns no external state, persistent private key, provider resource, process or hosted data.

- O2 remains `OPEN/LOCKED`.
- Phase 3 remains `17/43`.
- fresh independent V2 correction QA remains open.
- hosted/account adapter and real authenticated viewers remain open.
- Planner Routing T1–T7, Evidence Continuity E1–E6, Audit and Cherry acceptance remain open.
- release/deploy/external completion remain open.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## ABANDON

**ABANDON:** this receipt proves only a local synthetic Builder correction V2 candidate. It is not fresh QA PASS, hosted readiness, real two-viewer O2 evidence, routing, progress, Audit, release, Cherry acceptance or external completion.
