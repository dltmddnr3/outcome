# Phase 3 Observer Bridge · Async Error Exact-New-Target Correction Gates

Outcome: private error brand admission occurs only when `HostedObserverBridgeError` is the exact constructor target; alternate, derived, bound, proxied, or ambiguous construction remains unbranded and maps to generic finite 503.

- [x] N1: exact QA FAIL carrier/tree/parent/report hash and six-path scope are fixed.
  CHECK: test "$(git show -s --format=%H 3be5f146928ef0543b29d350b8d5751d2432eea0)" = "3be5f146928ef0543b29d350b8d5751d2432eea0" && test "$(git show -s --format=%T 3be5f146928ef0543b29d350b8d5751d2432eea0)" = "6d7ca5b749ce584c26f3688e048998cac43f2e84" && test "$(git show -s --format=%P 3be5f146928ef0543b29d350b8d5751d2432eea0)" = "e10fe0f463303721ebe6e763c6964135a0e7defc" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_FRESH_QA_E10FE0F.md | awk '{print $1}')" = "92389a8a90e6ca06fac7267e33a735f5ddf56f56092bc11eb9322aad19915d1a" && test -z "$(git diff --name-only 3be5f146928ef0543b29d350b8d5751d2432eea0 -- | rg -v '^(server/phase3-observer-bridge-hosted\.mjs|server/phase3-observer-bridge-hosted\.test\.mjs|server/phase3-observer-bridge-api\.test\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo N1_PASS
  EXPECT: source/report drift 0; only six allowed paths.
  EVIDENCE: source `3be5f146928ef0543b29d350b8d5751d2432eea0` / tree `6d7ca5b749ce584c26f3688e048998cac43f2e84` / parent `e10fe0f463303721ebe6e763c6964135a0e7defc`; report SHA-256 `92389a8a90e6ca06fac7267e33a735f5ddf56f56092bc11eb9322aad19915d1a`; allowed-path diff only.
- [x] N2: the exact alternate-newTarget shared-prototype QA counterexample reproduces RED then maps generic across API and stable host.
  CHECK: node --test --test-name-pattern='QA alternate newTarget blocker' server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: six endpoints x sync/async x two layers = 24 generic 503, call 1, retry 0.
  EVIDENCE: RED 0/2 (both layers returned 429); GREEN 2/2, covering 24 endpoint/layer/settlement combinations with call 1 and retry 0.
- [x] N3: classifier admits direct and Reflect exact-target genuine construction only.
  CHECK: node --test --test-name-pattern='exact newTarget brand admission' server/phase3-observer-bridge-hosted.test.mjs
  EXPECT: direct new and Reflect.construct with exact class preserve all fixed known codes.
  EVIDENCE: 1/1 test PASS; 14 fixed codes x direct/Reflect exact construction = 28/28 known mappings.
- [x] N4: alternate same-prototype, subclass, bound, Proxy constructor/newTarget, and pre/post prototype mutations remain unbranded without trap execution.
  CHECK: node --test --test-name-pattern='newTarget construction matrix' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: all ambiguous construction variants classify null and settle generic 503; trap hits 0.
  EVIDENCE: 3/3 focused tests PASS; six hosted construction variants classify null and 6 endpoints x sync/async x 6 variants x 2 request layers = 144/144 generic 503.
- [x] N5: prior hostile 432 and genuine 336 matrices, one-call/retry0/unhandled0/no-leak, stable residual catch, and no-store remain intact.
  CHECK: node --test --test-name-pattern='brand mutation matrix|genuine brand mappings|one invocation|unhandled rejection|hostile rejection corpus|stable host residual bridge rejection|private bridge response is no-store' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: all prior branded error boundaries pass unchanged.
  EVIDENCE: prior hostile 432/432 and genuine 336/336 matrices PASS inside API/stable suites; residual catch, one-call, retry0, unhandled0, no-leak and no-store assertions PASS.
- [x] N6: path/parser/body/auth/cache, bridge/hosted/account, default-disabled, Postgres, and operations regressions pass.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted matrix passes.
  EVIDENCE: targeted bridge/hosted/account matrix 134/134 PASS; full Node 255/255 PASS.
- [x] N7: full Node/frontend/build/security/public/mutation/scope/runbook/boundary/diff and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md && echo N7_PASS
  EXPECT: Builder-only correction evidence is complete without promotion or external mutation.
  EVIDENCE: full Node 255/255; frontend 89/89; build 1,652 modules; security 46/46; public 4/4; local mutation 32/32 and API read-only 28/28; scope 47; runbook, public boundary and diff PASS; external mutations 0.

## ABANDON

**ABANDON:** This Gate proves only a local exact-newTarget brand-admission correction candidate. It does not prove fresh QA, Release Audit, Supabase/database parity, hosted activation, O2 evidence, Phase 3 progress, Cherry acceptance, deploy, push, release, or external completion.
