# OUTCOME Phase 3 · Observer Bridge Hosted H1-H2 Correction Receipt

Status: **HOSTED_H1_H2_CORRECTION_CANDIDATE_READY_ONLY**

Observed: 2026-08-27 KST

## Exact source and boundary

- failed candidate: `7c140782bf9b266f8c717570c1497d00c51d9048`
- independent QA report commit/tree: `fab37c3155080a37ed91916061665b4791d4fa24` / `846b71fa648257794cd9c430a9d134b4016f1c24`
- report: `docs/PHASE3_OBSERVER_BRIDGE_HOSTED_H1_H2_FRESH_QA_7C14078.md`
- corrected scope: H1 hosted composition and H2 pure local API boundary only
- H3 PostgreSQL/RLS/migrations and H4 hosted operations remain absent, open and locked

The final correction commit/tree are reported outside this same-commit receipt to avoid a circular hash.

## Actual RED-first reproduction

Command:

```sh
node --test server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs
```

Before the fixes, the exact six QA regressions produced `15` passed / `6` failed:

- F1: same project name in another workspace was accepted by a project-only source selection.
- F2: inherited prototype authority reached owner authorization.
- F3: a raw request contract could not satisfy the new raw-body boundary.
- F4: rotation reset the accepted history/count instead of preserving it.
- F5: the exact `expires_at` instant was accepted.
- F6: property-order-dependent enrollment fingerprint returned `idempotency_conflict`.

No failing assertion was removed or relaxed to obtain GREEN.

## Corrected semantics

### F1 · workspace isolation

- `workspace_id` is part of binding, viewer, enrollment, idempotency, replay, source and query scope.
- Each viewer registration is workspace-bound; each workspace must have exactly one `workstation` and one `remote_device` registration.
- Source selection requires the server-authorized workspace and project together; it never selects the first project match.
- A different authorized workspace with the same project ID receives the same non-enumerating `access_denied`/`bridge_unavailable` boundary, with private presence and mutation both `0`.

### F2 · prototype-safe authority

- Caller records allow only ordinary or null prototypes, exact enumerable own data descriptors and exact keys; Proxy, accessor, inherited and symbol material are denied before callback/trap evaluation.
- Parsed JSON is rebuilt into null-prototype records with `defineProperty`; `__proto__`, `prototype`, `constructor`, duplicate keys and nested variants are rejected.
- `authContext` is accepted only as the separate server argument and appended after parsing through a descriptor-safe boundary; a client body cannot provide or replace it.
- Asserted inherited-authority, callback and Proxy trap hits: `0`; storage mutation: `0`.

### F3 · actual raw byte cap

- The pure API accepts trusted transport `rawBody` as a UTF-8 string or `Buffer`, checks actual UTF-8 bytes before JSON parsing, then parses internally.
- Invalid UTF-8, exact-limit-plus-one, whitespace padding, multibyte overflow, malformed JSON, duplicate keys and pollution keys fail before authorization, crypto, rate, replay, store or domain calls.
- Client-declared `body_bytes` is rejected; only the measured server value enters companion ingest.
- Oversized-request acceptance: `0`.

### F4 · rotation continuity

- Accepted event actions remain append-only across key rotation.
- Rotation appends an explicit domain rotation action and preserves accepted count and a monotonically increasing ledger revision.
- Until the first explicit resync under the new key, the prior count/revision remain visible while status/freshness is `null`/`unknown`; it never reports prior NOW as current.
- The next valid event performs explicit revision/sequence-bound resync, continues the count/revision monotonically, and both registered viewer classes receive the same projection.

### F5 · expiry interval

- Enrollment validity is exactly `[issued_at, expires_at)`.
- `T+299999ms` is accepted; `T+300000ms` and `T+300001ms` are denied.
- Denied boundary attempts consume no entropy, store revision or published state.

### F6 · semantic idempotency

- Enrollment fingerprint bytes use one fixed field order over server-derived account/workspace plus explicit project/role/binding/source/mode semantics.
- The idempotency namespace is account/workspace/key; same key plus same semantic fingerprint returns the first immutable response independent of insertion order or null prototype.
- Same key plus any changed semantic scope conflicts without challenge, entropy, store or ID consumption.

## GREEN and proportional regressions

| Command | Result |
| --- | --- |
| `node --test server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs` | PASS `28/28` |
| `node --test server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs` | PASS `45/45` |
| `npm run test:package-model` | PASS `39/39` |
| `npm run check:mutations` | PASS local mutations `32/32=405`; API read-only JSON `28/28`; empty page boundary `4/4` |
| `npm run test:security` | PASS Node assertions `29/29`; snapshot disclosures `0`; Gate evidence fields `0`; client metadata/payload leaks `0` |
| `npm test` | PASS frontend `89/89` plus Node `189/189` (`278/278`) |
| `node --test scripts/*.test.mjs server/*.test.mjs` | PASS `217/217` |
| `npm run build` | PASS; `index-DgbgRsT8.js`, `index-R1nuadtV.css` |
| `npm run check:scope` | PASS |
| `npm run check:runbook` | PASS |
| `git diff --check` | PASS |

No dependency was installed. An existing canonical `node_modules` was temporarily attached read-only for repository commands and is removed before commit.

## Privacy, authority and operation ledger

- unauthorized private presence values: `0`
- inherited or client-supplied authority: `0`
- oversized request acceptance: `0`
- prohibited output/authority fields in focused serialization: `0`
- callback/accessor/Proxy trap hits in asserted hostile cases: `0`
- partial store/domain/revision/ID consumption in asserted failures: `0`
- provider, account, session, browser, device, private-store, credential or network operations: `0`
- dependency installs, database/migration operations, environment/config/secret mutations: `0`
- push, deploy, release or external messages: `0`

## Residual gates and rollback

- H3 PostgreSQL/RLS/migration proof: **OPEN/LOCKED**.
- H4 hosted operations, persistence, retention, backup/restore and production rollback: **OPEN/LOCKED**.
- Fresh correction QA, hosted account integration, real two-viewer proof, Audit and Cherry acceptance: **OPEN**.
- O2 remains **OPEN** and Phase 3 remains `17/43`.
- Routing, progress, Gate closure, release and external completion authority remain absent.

Rollback is a revert of this correction commit. No runtime/API dispatch, database migration, environment, provider or deployed state was created.

## ABANDON

This receipt proves only a disabled pure-local H1-H2 correction candidate. It is not H3/H4 evidence, fresh independent QA, hosted execution, O2 proof, progress, Audit, acceptance, release or completion authority.
