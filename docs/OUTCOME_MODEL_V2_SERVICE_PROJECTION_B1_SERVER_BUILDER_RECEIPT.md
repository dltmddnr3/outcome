# OUTCOME Model v2 Slice B1 server projection Builder receipt

Status: `SLICE_B1_SERVER_CANDIDATE_READY`

## Immutable input

- Attempt: `MODEL_V2_SERVICE_PROJECTION_B1_SERVER_1`
- Q1 PASS carrier/tree/parent: `517f436150b684a2f7d72f6144bfa848af397bb4` / `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c` / `949a7d54ced67fc30471ba5fe90ee902ce637a46`
- Builder handoff SHA-256: `39aedb7cb033e56774ba3320c00ce417afea1ba07c5f0b98654ba1d8515fc72d`
- Gate SHA-256: `1e91fb8117b17a4a58ce9e5f005cc4d3b834c25e9df3340e97d471fa9f1c2f85`
- Map SHA-256: `37fbe565e42cad9516ceb96a4ed07070fa9ce74d69b40a3c339104076dee9c37`

## Candidate

- Commit/tree/parent: `74c7e07335796df47469b3c478a248d12f2920b7` / `b4f64a7b940be9256efe3ae98518502b396563b3` / `517f436150b684a2f7d72f6144bfa848af397bb4`
- Changed paths:
  - `server/account-model-v2-projection.mjs`
  - `server/account-model-v2-projection.test.mjs`
  - `server/account-access.mjs`
  - `server/account-access.test.mjs`
  - `server/account-access-api.test.mjs`
  - `src/lib/api.ts`
- Deterministic serialized projection SHA-256/bytes: `42c6f93372b655a7217cb3e2a4007b51d976f23e7893cbd070e52aa1a97f572d` / `357`

## Implemented boundary

- Every authenticated allowlisted project receives a server-derived, schema-versioned `modelV2` projection.
- The response shape is an exact public allowlist for project label, destination, remaining acceptance gap, observed Now, ready boundary, next action, Cherry action, state and public-safe events.
- The server reuses the verified v1 translator and Model v2 projector. The client receives types only and has no projection calculation helper.
- Minimal legacy projections fail safe to `no_active_work`. Existing v1 response fields remain compatible and cannot override the server-created `modelV2` field.
- Proxies, accessors, symbols, non-enumerables, cycles, unsupported prototypes, private keys and private-value patterns fail closed before serialization. Authentication and project/workspace authorization run before projection creation.

## Verification

- `npm run test:account-access`: PASS, 33 Node tests and 29 client tests.
- `node --test server/outcome-model-v2.test.mjs server/account-model-v2-projection.test.mjs`: PASS, 16 tests.
- `npm run build`: PASS; TypeScript project build and Vite production build, 1,652 modules transformed.
- `npm run check:public-boundary`: PASS; prohibited identifiers `0` across API, HTML, bundle and rendered UI.
- Dependency proof: tests/build used an existing local dependency tree with package-lock SHA-256 `bbf87246a27bcf11a7f17ea203c283da2adaa77772f844ca4fd25166321b4bec`; install/fetch count `0`.

## Rollback, preservation and counters

- Rollback: revert candidate `74c7e07335796df47469b3c478a248d12f2920b7` to restore the exact Q1 private-workspace response and client type surface. No auth/account data migration exists.
- Temporary build roots and dependency links: removed; residue `0`.
- Canonical checkout Planner/user-owned dirty state: observed and preserved without staging, reset, stash, normalization or deletion.
- Registry/provider/runtime/environment/database/dependency/external/deploy/release mutations: `0`.
- Candidate commit count: `1`; receipt commit count after this artifact: `1`.
- Automatic retry/replay: `0`; duplicate execution: `0`; unauthorized transition: `0`; false completion: `0`.

## Open boundary

B1 implementation candidate only. B2, B3, Q2, A5 and C1 remain open. This receipt is not QA, Release Audit, deployment, Production, release, Cherry acceptance or Phase-transition evidence.
