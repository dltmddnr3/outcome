# OUTCOME Phase 3 · Observer Bridge Hosted H1-H2 Builder Receipt

Status: **HOSTED_H1_H2_CODE_CANDIDATE_READY_ONLY**

Observed: 2026-08-27 KST

## Exact authority

- authorized source commit: `cd2f45c3443a083237db2bb38c39530a3082c691`
- authorized source tree: `76f174afb297a464b491766449ac649f74e6de42`
- allowed slice: H1 local hosted composition and H2 pure API boundary only
- prohibited in this slice: API/runtime wiring, PostgreSQL/Supabase/migration H3, hosted operations H4, environment, provider, network, deploy and real use

The final candidate commit/tree are reported outside this same-commit receipt to avoid circular hashes.

## RED-first evidence

Initial command:

```sh
node --test server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs
```

Actual RED: `0` passed, `2` file-level failures. Both failed with `ERR_MODULE_NOT_FOUND` for the intentionally missing `server/phase3-observer-bridge-hosted.mjs`. No implementation existed at RED time.

Subsequent focused failures were kept visible while closing constructor schema, enrollment canonicalization, exact request materialization, idempotent replay, CAS and tamper-code boundaries. No failing assertion was removed to manufacture GREEN.

## Implemented H1 contract

- Feature and ingest are constructor-controlled and both default to `false`; there is no enable mutation.
- Exact constructor-bound bindings and exactly two viewer registrations (`workstation`, `remote_device`) are validated before use.
- Owner and viewer authorization are injected, server-derived ports. Caller auth input is trap-free materialized before the port is called.
- Enrollment uses a server-generated opaque challenge/nonce, exact 300-second expiry, one-use state, idempotency fingerprint and fixed Ed25519 proof-of-possession bytes.
- Only canonical Ed25519 SPKI public keys are retained. Private keys/static bearer credentials are never accepted or stored.
- Initial enroll, rotation, revocation and explicit re-enrollment keep source/key versions distinct; old certificates do not inherit authority.
- Companion request authentication covers certificate, request ID, nonce and exact signed-event digest. Ambient browser cookie/account context is ignored.
- One strict transaction store port atomically owns the enrollment/source and replay namespaces for this in-memory H1 candidate. Store failure leaves the internal draft unpublished. It is not a PostgreSQL or durability claim.
- The corrected local domain module is rebuilt into an isolated draft from accepted finite-event history; request response cloning completes before the draft becomes current.
- Exact duplicate request digest is idempotent; conflicting reuse, sequence conflict/gap, rate/body/clock, crypto, store, clone and reentry failures do not publish partial state.
- Authorized viewer classes receive the same minimal domain revision/projection. Class alone grants no identity or project access.

## Implemented H2 contract

- `handleHostedObserverBridgeRequest` is a pure synchronous router; it creates no listener and performs no network/provider call.
- Owner enroll/revoke/rotate requires injected account authorization plus exact Origin and CSRF pair. Client body cannot override `authContext`.
- Enrollment completion and companion ingest use JSON plus challenge/signature/certificate/replay proofs, never ambient cookies or Clerk tokens.
- Viewer GET requires injected server-derived account/project authorization and an exact registered viewer reference/class.
- Unknown/private/wrong-scope failures use finite non-enumerating bodies; project existence is not disclosed.
- Non-private mutations model the preserved exact `405 {error: read_only}` boundary.
- Request bodies, nested arrays/objects and auth contexts reject Proxy/accessor/coercive material before dependency execution.

## GREEN and regressions

| Command | Result |
| --- | --- |
| `node --test server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs` | PASS `15/15` |
| `node --test server/phase3-observer-bridge.test.mjs` | PASS `17/17` |
| `npm run test:package-model` | PASS `39/39` |
| `npm run check:mutations` | PASS local mutations `32/32=405`; API JSON `28/28`; page boundary `4/4` |
| `npm run test:security` | PASS test assertions `32/32`; stable snapshot prohibited disclosures `0`; Gate evidence fields `0`; client metadata/payload leaks `0` |
| `npm test` | PASS frontend `89/89` plus Node `176/176` (`265/265`) |
| `node --test scripts/*.test.mjs server/*.test.mjs` | PASS `204/204` |
| `npm run build` | PASS; `index-DgbgRsT8.js`, `index-R1nuadtV.css` |
| `npm run check:scope` | PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

The first proportional regression attempt in the isolated worktree failed dependency resolution because that worktree had no `node_modules` (`yaml` and `@clerk/backend` not found). No dependency was installed. The existing canonical `node_modules` was attached through a temporary read-only symlink, all commands above were rerun successfully, and the symlink was removed before commit.

## Privacy and authority measurements

- Focused serialized private projection prohibited output hits: `0`
- Focused completion-authority fields: `0`
- Proxy/accessor callback or trap hits in asserted hostile cases: `0`
- Public mutation status drift: `0`
- Public snapshot prohibited disclosures: `0`
- Provider-native introspection: `0`
- Prompt/result/session/thread/turn/path/credential/private-key reads or transport: `0`

No result in this receipt grants progress, Gate, QA, Audit, acceptance, release or completion authority.

## External-operation ledger

| Operation | Count |
| --- | ---: |
| dependency installs | 0 |
| PostgreSQL/Supabase CLI, migrations or database operations | 0 |
| Clerk/provider/session operations | 0 |
| browser/device/private-store/credential operations | 0 |
| network/listener/HTTP operations by the candidate | 0 |
| environment/config/secret mutations | 0 |
| push/deploy/release/external messages | 0 |

## Residual gates and rollback

- H3 PostgreSQL/RLS/migration proof: **OPEN/BLOCKED from this slice**; the transaction port is an in-memory contract only.
- H4 hosted operations, retention/backup/restore and production rollback: **OPEN**.
- Fresh independent hosted-candidate QA, account-auth hosted Preview, companion enrollment and real two-viewer proof: **OPEN**.
- O2 remains **OPEN** and Phase 3 remains `17/43`.
- Routing T1-T7, Audit, Cherry acceptance, release and external completion remain open.

Rollback is removal/revert of the five H1-H2 candidate files. Nothing is wired into runtime or API dispatch, both feature flags default off, no migration exists and no external state requires rollback.

## ABANDON

This receipt proves only a disabled, pure-local H1-H2 code candidate. It is not H3/H4 evidence, hosted proof, independent QA, O2 proof, deployment authority, progress or acceptance.
