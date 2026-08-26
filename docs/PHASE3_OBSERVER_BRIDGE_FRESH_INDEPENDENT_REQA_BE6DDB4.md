# OUTCOME Phase 3 · Observer Bridge Fresh Independent Re-QA

Status: **FAIL / FRESH INDEPENDENT RE-QA / LOCAL SYNTHETIC ONLY**

Observed: 2026-08-27 KST

## Immutable candidate verification

- candidate commit: `be6ddb47917d3f614185dbeed25dbe29df0bf727`
- candidate tree: `165c38e961c6342349b96b417e3b6f1ace5a6683`
- direct parent: `43681a4fe42b2b045e8e03e5dfbff81261f9dac0`
- subject: `fix: harden observer bridge materialization`
- correction changed paths, exactly three:
  - `docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_CORRECTION_RECEIPT.md`
  - `server/phase3-observer-bridge.mjs`
  - `server/phase3-observer-bridge.test.mjs`
- implementation SHA-256: `c9daf4e43a9a0d39a492cf2ba8068698b0009b4888076f0d443bdfd7456da950`
- focused-test SHA-256: `eacff11cd4af61c65b80262bb4f9527de941212cc7f4abf33d7416e8eb1626f5`
- correction-receipt SHA-256: `cbcfd7473e90dc0b85fbbbef8534598a58a6593342bfa99b269acbe67fe05b4e`

The exact commit was checked out detached in a fresh temporary worktree. The contract amendment, architecture, Builder brief, prior FAIL report, correction receipt, implementation and tests were read directly. Builder claims were treated as hypotheses. The independent probe used only local in-memory state and locally generated ephemeral test values.

## Verdict

`FAIL`

The two exact prior correction boundaries F1 and F2 withstand fresh refutation. The candidate nevertheless remains ineligible for the separately authorized hosted planning stage because an adjacent HIGH ordinary state-machine defect leaves constructor-owned public-key registrations mutable and permits caller-supplied `KeyObject` behavior to participate in rotation decisions.

## Prior F1 correction · PASS within this review

Independent response-copy substitutions covered `16/16` cases:

- extra prohibited fields;
- missing keys;
- changed primitive and nested values;
- reordered and reshaped arrays;
- same-object alias;
- accessor, non-enumerable and symbol fields;
- outer and nested Proxy;
- shared nested identity;
- callable substitution;
- mutation of the frozen draft before return; and
- altered output during a registry-mutating rotation.

Every case returned only `materialization_failed`, exposed prohibited output hits `0`, and published no failed draft. Ledger/projection/audit remained deep-equal through the failure. The next valid ingest allocated ledger revision `1`; the registry-mutation case left audit empty and the next valid rotation allocated ledger revision `1` and registry revision `2`. This proves no failed revision, audit entry or observable ID allocation.

## Prior F2 correction · PASS within this review

- constructor nested public-key Proxy: `configuration_invalid`, trap hits `0`;
- rotation nested public-key Proxy whose traps attempted a nested bridge mutation: `input_invalid`, trap hits `0`, nested operation calls `0`;
- failed Proxy rotation ledger, registry, audit and ID consumption: `0`;
- next valid locally generated ephemeral Ed25519 rotation: `key_rotated`, ledger revision `1`, registry revision `2`;
- subsequent valid key revocation: `key_revoked`;
- local RSA public, Ed25519 private and symmetric secret `KeyObject` values: all rejected.

The exact prior F1/F2 defects are corrected. This statement is narrower than the overall verdict.

## Finding F3 · retained/decorated KeyObject behavior bypasses immutable registration and same-key denial

- severity: **HIGH**
- implementation boundary:
  - `validatePublicKey` checks `isProxy`, then reads caller-owned `value.type` and `value.asymmetricKeyType`;
  - source materialization stores the original caller-owned `KeyObject` reference;
  - `rotateKey` later dispatches through the retained object's substitutable `.equals` property.

### Reproduction A · own accessors execute and rotation commits

1. Generate a local ephemeral Ed25519 replacement public key.
2. Define own accessors named `type` and `asymmetricKeyType` that count calls and return `public` and `ed25519`.
3. Pass that non-Proxy `KeyObject` to `rotateKey`.

Expected: reject the decorated caller-owned object without invoking caller-defined accessors, and consume no state.

Actual: caller-defined accessors executed `3` times; rotation returned `{status:'key_rotated', ledger_revision:1, registry_revision:2}`.

### Reproduction B · retained equals substitution permits same-key rotation

1. Create the bridge with a valid local ephemeral Ed25519 public key.
2. After construction, define an own `.equals` function on the retained source key that counts calls and returns `false`.
3. Submit that exact same `KeyObject` as `new_public_key` with key version `2`.

Expected: the constructor-owned registry is immutable, same public-key reuse rejects, no caller callback runs, and no revision is consumed.

Actual: the substituted callback executed once and the same-key rotation returned `{status:'key_rotated', ledger_revision:1, registry_revision:2}`. Audit recorded `key_rotated`.

Across the two fresh reproductions: caller-defined callback/accessor hits `4`; incorrectly consumed ledger revisions `2`; incorrectly consumed registry revisions `2`.

Impact: constructor-only registration is not an immutable key snapshot, the exact key-alias/same-key rotation invariant can be falsified after construction, and finite rotation results depend on mutable caller behavior. Builder correction must defensively own an immutable verification-key representation and compare key identity without dispatch through caller-substitutable properties. A new focused RED/GREEN test must cover decorated keys, retained-reference mutation and same-key reuse with zero callback hits and zero failed state consumption.

## Nearby independent state-machine probes

The temporary local probe reported:

- exact-copy F1 cases: `16/16` public-safe failures;
- exact F2 and key-type/lifecycle cases: `6/6` expected results;
- equivalent nested/callback boundaries: `7` cases, of which `5` were safe and `2` reproduced F3;
- nearby hostile semantic checks: `54` assertions, including `14` expected rejection cases;
- signed-field tamper: all `11/11` semantic fields denied without ledger consumption;
- canonical domain/byte fixture and SHA-256 fixture: exact match;
- canonical/malformed/padded signature forms: denied as expected;
- duplicate, conflict, lower, gap and explicit resync: expected finite transitions;
- `+5_000ms` future boundary, `+5_001ms` denial, expiry and fresh-to-stale-to-offline decay: expected behavior;
- wrong/missing/cross-class viewers denied and workstation/remote projections deep-equal;
- disable, restore, revoke, rotate and tombstone ordinary paths: expected behavior apart from F3;
- dependency reentry and failure-state atomicity: expected behavior;
- projection/audit serialization prohibited and completion-authority field hits: `0`.

## Focused and proportional regressions

| Check | Result |
| --- | --- |
| temporary independent local probe | completed; `16` F1, `6` F2, `7` equivalent-boundary and `54` nearby semantic cases; F3 reproduced twice |
| `node --test server/phase3-observer-bridge.test.mjs` | `15/15 PASS` |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local mutation `32/32 = 405`; API read-only JSON `28/28`; empty page boundary `0/4` |
| `npm run test:security` | `29/29 PASS`; stable prohibited disclosures `0`; Gate evidence fields `0`; client environment leaks `0/6` |
| `npm test` | frontend `89/89 PASS`; server Node `159/159 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `187/187 PASS` |
| `npm run build` | `1652` modules transformed; PASS |
| `npm run check:scope` | `37` files; PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

No dependency was installed. Existing local dependencies were referenced by a temporary worktree symlink and the symlink was removed before the report commit.

## Privacy, operation and authority counts

- F1 adversarial prohibited output hits: `0`
- exact F2 public-key Proxy trap hits: `0`
- exact F2 failed state/revision/audit/ID consumption: `0`
- F3 caller-defined accessor/callback hits: `4`
- F3 incorrectly consumed ledger revisions across isolated reproductions: `2`
- F3 incorrectly consumed registry revisions across isolated reproductions: `2`
- ordinary serialized source/key/signature/event/digest/viewer/raw-time disclosure hits: `0`
- progress, percentage, Gate, approval, dispatch and completion-authority field hits: `0`
- provider-native introspection and provider/session/thread/turn operations: `0`
- real account, hosted auth, browser, device, private-store or credential operations: `0`
- network calls, HTTP listeners, companion processes, dependency installs, pushes, deploys, releases and external messages: `0`
- static filesystem/network/HTTP/child-process call/import matches in the candidate module and focused test: `0`

## Open-state boundary

This is a local synthetic correctness review only. F1/F2 correction QA is closed as passing inside this report, but local synthetic candidate eligibility for hosted planning is not granted because F3 is open.

- O2: `OPEN/LOCKED`
- Phase 3: `17/43` unchanged
- hosted/account-authenticated adapter: open and unauthorized
- real workstation/remote-device viewers and routing: open
- Planner Routing T1–T7 and Evidence Continuity E1–E6: open
- separate Release Audit: open
- Cherry acceptance: open
- release/deploy/external completion: open
- `EXTERNAL_OUTCOME_COMPLETE=false`

No Gate, Map, Contract, architecture, progress, runtime, canonical checkout or external resource was changed. Planner must route F3 to Builder. This QA report is not a correction, promotion, Audit, acceptance or release authority.
