# OUTCOME Phase 3 · Observer Bridge Hosted H1-H2 Fresh QA

Status: **FAIL / RETURN TO BUILDER / H3-H4 AND O2 LOCKED**

Observed: 2026-08-27 KST

## Immutable candidate verification

- candidate commit: `7c140782bf9b266f8c717570c1497d00c51d9048`
- candidate tree: `ea85aab6a863ffaf01f431a69e9a1754fd175e3e`
- direct parent: `cd2f45c3443a083237db2bb38c39530a3082c691`
- candidate subject: `feat: add hosted observer bridge H1 H2 candidate`
- exact changed paths: `5`
  - `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H1_H2_BUILDER_RECEIPT.md`
  - `server/phase3-observer-bridge-api.mjs`
  - `server/phase3-observer-bridge-api.test.mjs`
  - `server/phase3-observer-bridge-hosted.mjs`
  - `server/phase3-observer-bridge-hosted.test.mjs`
- SHA-256, in the same order:
  - `e8c8e15bafa78b94569869712984fcad8e2be00bc922bd69ab46c1575fdc37a4`
  - `5a8238ca3315ab994b3ce10b10e505c9d5d0b943445f099f0c6dd583021de7fd`
  - `debc1500056bd4cdd64633e5ff2dc440493c9043fcdef26dd5c200793cc80d1c`
  - `52472bdb22d7342449ac0cbe77c03ec2601e88e6a6ccd2e69f24d9aadac07ca4`
  - `347a52215d0ea555c83156f20a1fbc1985b213167edebbd3909e37f5716944e4`

The pin, tree, parent and five-path boundary matched the QA handoff. The Builder receipt, hosted architecture and brief, corrected local domain module and tests, prior V2 QA, and all four H1-H2 source/test files were read directly in a fresh detached worktree. Builder assertions were treated as hypotheses. No `SAFE_HOLD` pin mismatch occurred.

## Verdict

`FAIL`

The candidate's existing focused and repository regressions are green, but six fresh negative controls independently reproduce six trust-boundary defects. Two allow cross-workspace or prototype-derived authority, one accepts an actually oversized request, one erases the visible immutable projection on key rotation, and two violate exact expiry/idempotency semantics. This candidate is not eligible for H3 or H4 planning/implementation. O2, hosted preview, deployment, Release Audit, Cherry acceptance and progress remain unchanged and locked.

## Blocking findings

### F1 · Critical · cross-workspace viewer authorization leaks a private projection

Reproduction:

1. Enroll and ingest one signed `workspace_main` / `outcome` event.
2. Make the injected viewer authorization return an otherwise valid account with `workspace_id=workspace_other` and `project_ids=['outcome']`.
3. Read `outcome` as the registered workstation viewer.

Expected: finite `access_denied` before project/source presence disclosure, with no state mutation.

Actual: the read succeeds and returns `status=ok`, `ledger_revision=1`, project `outcome`, role `builder`, status `구현 진행 중`, freshness `fresh` and accepted count `1`. `read()` checks only `auth.project_ids` and selects the first active source by `project_id`; it never compares the authorized workspace to the source workspace.

Impact: a same-named project in another workspace can expose private activity state. This breaks the architecture's exact workspace/project authorization boundary and anonymous/wrong-scope non-enumeration requirement.

Correction boundary: Builder must bind viewer registrations and source resolution to the server-derived workspace plus project/binding, add multi-workspace same-project negative tests at both H1 and H2, and prove the denied response exposes no project/source/status value.

### F2 · Critical · `__proto__` data gains owner authority and commits enrollment state

Reproduction:

1. Parse `{"__proto__":{"token":"owner"}}` so `__proto__` is an own JSON data property.
2. Pass it as `auth_context` to owner enrollment while the injected authorization port accepts only `context.token === 'owner'`.
3. Observe the context received by the port and the transaction store.

Expected: `access_denied`, no inherited authority and zero store commits.

Actual: `opaqueData()` copies into `{}` with assignment, invoking the legacy `__proto__` setter. The authorization port observes inherited `token=owner` while `Object.hasOwn(context, 'token')` is false. Enrollment succeeds and the store records `1` commit.

Impact: hostile prototype data can convert a denied context into owner authority and mutate enrollment state. This directly violates the server-derived auth-context and prototype safety requirement.

Correction boundary: Builder must materialize arbitrary opaque JSON into a null-prototype own-data graph or use descriptor-safe definition, reject prototype-polluting keys where they are unnecessary, and test `__proto__`, `constructor`, `prototype`, null prototypes, accessors and Proxies through both direct H1 and H2 request boundaries with callback/trap and state consumption `0`.

### F3 · High · API body cap measures reserialized JSON rather than received bytes

Reproduction:

1. Configure `max_body_bytes=900`.
2. Create a valid signed ingest JSON body whose compact serialization is `606` bytes.
3. Prefix valid JSON whitespace so the actual UTF-8 request representation is `10,606` bytes, parse it, and pass the parsed body to the pure router.

Expected: reject before crypto/domain/store with status `400` and no replay/revision consumption.

Actual: the router reserializes the parsed object with `JSON.stringify`, reports `606` bytes to H1 and returns `200 accepted`, consuming ledger/replay state.

Impact: padding and other non-canonical wire representations bypass the body/cost limit. The current pure router cannot prove the required pre-parse request byte boundary.

Correction boundary: Builder must accept a server-derived actual raw-byte count or enforce the cap in an authorized listener/parser boundary before JSON parsing, reject mismatch, and add padded/multibyte/boundary tests proving no crypto, replay, rate, store or revision consumption.

### F4 · High · key rotation resets the visible immutable projection

Reproduction:

1. Enroll key version `1`, ingest sequence `1`, and read the projection.
2. Complete an owner-approved rotation to key version `2`.
3. Read again before any new event.

Expected: the last verified projection remains immutable and becomes only the explicitly defined rotation/resync freshness state; its accepted ledger history does not disappear.

Actual: before rotation the projection is revision `1`, accepted count `1`, status `구현 진행 중`, freshness `fresh`. Immediately after rotation it becomes revision `0`, accepted count `0`, status `null`, freshness `unknown`. The replacement source starts with `actions: []`, and domain rebuild therefore loses the prior fold.

Impact: authorized key maintenance makes existing evidence appear never to have existed and breaks revision parity between the hosted transaction state and visible domain projection.

Correction boundary: Builder must preserve an append-only event/fold history across key rotation, define the exact resync behavior without revision rollback, and test pre/post rotation equality of immutable history plus monotonic next-event revision.

### F5 · Medium · challenge remains valid at the exact 300-second expiry instant

Reproduction: issue at `T`, advance the injected clock to exactly `T+300,000ms`, then submit a valid proof of possession.

Expected: the challenge is expired at its exact expiry instant and consumes no source/certificate state.

Actual: completion succeeds because the check is `clock() > expiresAt`, not `>=`; `exact_expiry_accepted=true` at elapsed `300,000ms`.

Impact: the stated exact 300-second lifetime is extended at the boundary and the supposedly expired challenge can activate a source.

Correction boundary: Builder must pin the interval semantics, use the matching comparison, and test `T+299,999`, `T+300,000` and `T+300,001` with state/ID/store consumption measurements.

### F6 · Medium · enrollment idempotency depends on JavaScript property insertion order

Reproduction: call owner enrollment twice with identical field values and the same idempotency key, but insert the own fields in reverse order on the second call.

Expected: the second request returns the first immutable challenge response.

Actual: the second request throws `idempotency_conflict`. The fingerprint hashes `JSON.stringify({...value, auth_context: undefined})`, which preserves caller insertion order rather than the fixed enrollment field order.

Impact: semantically identical JSON objects can conflict because parsers/clients emit a different member order, defeating transport-independent idempotency.

Correction boundary: Builder must hash a fixed-order canonical enrollment scope and test every relevant property ordering, null-prototype record and identical-body retry without new challenge/store/ID consumption.

## Independent probe and privacy measurements

- fresh hostile negative-control groups: `6`
- secure expectations passed: `0/6`
- independently reproduced defects: `6/6`
- unauthorized private presence disclosures: `1` cross-workspace projection
- security-boundary state-consuming acceptances: `3` (prototype owner challenge, exact-expiry source activation, oversized ingest ledger/replay)
- prototype exploit own-token fields: `0`; inherited authority acceptance: `1`; store commits: `1`
- body measurement: actual `10,606` bytes; reserialized `606` bytes; response `200`
- rotation measurement: visible ledger revision `1 → 0`; accepted count `1 → 0`
- focused Proxy/accessor trap or getter hits asserted by executed tests: `0`
- serialized response fields matching prompt/result/session/thread/turn/credential/private-key/signature/certificate/progress/Gate/approval/completion authority in the accepted ordinary viewer projection: `0`
- progress/Gate/approval/completion-authority grants: `0`

The zero prohibited-field count does not cure F1: the otherwise minimal projection is itself disclosed to the wrong workspace. Error bodies remained finite in the exercised ordinary failure paths, but F2, F3 and F5 incorrectly succeeded and therefore bypassed the error boundary.

## Focused and regression execution

| Command | Result |
| --- | --- |
| `node --test server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs` | existing candidate tests `15/15 PASS` |
| `node --test server/phase3-observer-bridge.test.mjs` | corrected domain `17/17 PASS` |
| fresh independent temporary hostile probe | `0/6`; six secure expectations failed with the measurements above |
| `npm run test:package-model` | `39/39 PASS` |
| `npm run check:mutations` | local mutation `32/32=405`; API read-only JSON `28/28`; page boundary `0/4` |
| `npm run test:security` | `29/29 PASS`; stable prohibited disclosures `0`; Gate evidence fields `0`; client payload leaks `0/6` |
| `npm test` | frontend `89/89` plus Node `176/176`, total `265/265 PASS` |
| `node --test scripts/*.test.mjs server/*.test.mjs` | `204/204 PASS` |
| `npm run build` | PASS; `1652` modules; `index-DgbgRsT8.js`, `index-R1nuadtV.css` |
| `npm run check:scope` | PASS; `41` product/runtime/test files |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

No check was unavailable. No dependency was installed. The canonical workspace's existing dependencies were attached read-only through one temporary `node_modules` symlink and removed before this report.

## Absent hosted layers and operation ledger

- bridge H3 PostgreSQL adapter/test/migration paths: `0`
- bridge H4 operations adapter/test paths: `0`
- candidate H1-H2 imports/calls for HTTP listeners, network, Clerk, Supabase or PostgreSQL: `0`
- actual bridge database/RLS/migration operations: `0`
- actual Clerk/provider/account/session operations: `0`
- HTTP listeners, network calls and hosted resources: `0`
- real browser/device/companion/private-store/credential operations: `0`
- environment/config/secret mutations: `0`
- dependency installs: `0`
- push/deploy/release/external messages: `0`
- canonical integration and Gate/Map/Contract/progress mutations: `0`
- candidate product source/test mutations by QA: `0`
- temporary isolated worktrees: `1`
- temporary QA/coordination files outside the repository: `3` (ledger, hostile probe and worktree pointer)
- temporary dependency symlink attach/remove: `1/1`
- repository mutations: exactly this QA report and its single commit

H3 real PostgreSQL/RLS, actual Clerk authentication, an HTTP listener, real hosted resources, H4 operations and O2 real two-viewer evidence remain absent and disabled. Passing repository regressions do not override the six failing negative controls.

## Handoff and authority boundary

Return the candidate to Builder for correction only within the four H1-H2 source/test paths. A corrected candidate requires a new immutable commit/tree/receipt and a fresh independent QA session. Do not edit Contract, Map, Gates or progress to promote this failed candidate.

This report's commit, tree and SHA-256 are measured after its single-file commit and returned in the handoff because embedding them here would change those identities.

## ABANDON

**ABANDON:** this `FAIL` report grants no H3/H4 eligibility, hosted preview, provider/database/resource action, O2 proof, progress, Routing T1-T7, Evidence E1-E6, Release Audit, Cherry acceptance, deploy, release or external completion.
