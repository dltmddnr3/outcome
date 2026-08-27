# Phase 3 Observer Bridge · Raw Body Proxy Correction Gates

Outcome: private bridge raw-body classification rejects Proxy and revoked Proxy values before native Buffer, typed-array, prototype, coercion, iterator, or accessor evaluation at both direct API and stable-host boundaries.

- [x] R1: exact QA FAIL source/tree/parent/report hash and six-path scope are fixed.
  CHECK: test "$(git show -s --format=%H 869b4ec899f40544ee64a21a4b6fd06429b13a3b)" = "869b4ec899f40544ee64a21a4b6fd06429b13a3b" && test "$(git show -s --format=%T 869b4ec899f40544ee64a21a4b6fd06429b13a3b)" = "8cdc7408835ccc3ebb9c51c20a4ec96d22a55cdb" && test "$(git show -s --format=%P 869b4ec899f40544ee64a21a4b6fd06429b13a3b)" = "5937752ee8b82a5cd50226f29832a4968d1a7200" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_FRESH_QA_5937752.md | awk '{print $1}')" = "ec2f5ac74690f6eca68fe2aef5842f409657feca3420e0bbf7dda890816ec201" && test -z "$(git diff --name-only 869b4ec899f40544ee64a21a4b6fd06429b13a3b -- | rg -v '^(server/phase3-observer-bridge-api\.mjs|server/phase3-observer-bridge-api\.test\.mjs|api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo R1_PASS
  EXPECT: immutable source/report match; only six allowed paths.
  EVIDENCE: source `869b4ec899f40544ee64a21a4b6fd06429b13a3b`, tree `8cdc7408835ccc3ebb9c51c20a4ec96d22a55cdb`, parent `5937752ee8b82a5cd50226f29832a4968d1a7200`, report SHA-256 `ec2f5ac74690f6eca68fe2aef5842f409657feca3420e0bbf7dda890816ec201`; allowed-path diff only.
- [x] R2: the exact throwing-getPrototypeOf raw-body Proxy reproduces RED then returns private 400 with trap 0 and bridge 0 at direct API.
  CHECK: node --test --test-name-pattern='QA raw body Proxy blocker' server/phase3-observer-bridge-api.test.mjs
  EXPECT: exact QA case is 400 bad_request; getPrototypeOf trap 0; bridge calls 0.
  EVIDENCE: RED 0/1 returned 503 and trap 1; GREEN 1/1 returns private 400 bad_request with trap 0 and bridge calls 0.
- [x] R3: stable-host raw body and streamed chunk classification reject Proxy values before Buffer/native/coercion/iterator evaluation.
  CHECK: node --test --test-name-pattern='stable raw body Proxy boundary' server/stable-host.test.mjs
  EXPECT: body and chunk Proxy variants settle finitely with all body traps 0, bridge calls 0, no disclosure, and no unhandled rejection.
  EVIDENCE: RED 0/1 threw the body trap outward; GREEN 1/1 covers direct body and streamed chunk, both finite disabled-stable 404/no-store with body traps 0.
- [x] R4: Proxy-wrapped Buffer/string-like/Uint8Array, revoked Proxy, and getter/ownKeys/iterator/toString/valueOf traps are rejected without broadening body types.
  CHECK: node --test --test-name-pattern='raw body hostile matrix|genuine raw body byte boundary' server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: hostile values reject with trap 0; strings and genuine Buffers preserve byte length, padding, malformed UTF-8, and exact cap behavior.
  EVIDENCE: focused 3/3 PASS; four direct and four stable hostile forms reject with trap 0, genuine strings/Buffers preserve four accepted byte cases plus exact oversize and malformed UTF-8 failures.
- [x] R5: prior brand/async/path/body/auth/cache matrices stay intact.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge-hosted.test.mjs
  EXPECT: focused bridge API/hosted/stable suites pass without weakening prior assertions.
  EVIDENCE: focused API/hosted/stable 82/82 PASS; prior private-brand, hostile 432, async, path, body, auth, cache and no-store assertions remain intact.
- [x] R6: targeted bridge/Postgres/operations/account and full Node regressions pass.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted matrix passes; no package, migration, config, hosted resource, or UI drift.
  EVIDENCE: targeted 145/145 PASS; full Node 266/266 PASS; no package, migration, config, hosted-resource or UI drift.
- [x] R7: full frontend/build/security/public/mutation/scope/runbook/boundary/diff/privacy and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_BUILDER_RECEIPT.md && echo R7_PASS
  EXPECT: Builder-only candidate evidence complete with all external/release boundaries locked.
  EVIDENCE: full Node 266/266; frontend 89/89; build 1,652 modules; security 50/50; public 4/4; local mutation 32/32 and API read-only 28/28; scope 47; runbook, public boundary, privacy and diff PASS; external mutations 0.

## ABANDON

**ABANDON:** This Gate proves only a local raw-body Proxy correction candidate. It does not prove fresh QA, Release Audit, database parity, hosted activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, or external completion.
