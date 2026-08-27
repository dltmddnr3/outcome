# Phase 3 Observer Bridge · Async Error Brand Correction Gates

Outcome: only genuinely constructed, exact-shape `HostedObserverBridgeError` instances may retain a fixed known response code; prototype spoofing, decoration, mutation, subclassing, cross-realm values, and hostile reflection remain generic finite 503 at API and stable-host boundaries.

- [x] B1: exact re-QA FAIL carrier/tree/parent/report hash and eight-path allowlist are fixed.
  CHECK: test "$(git show -s --format=%H c63256a64799b5aa453e76a6d29cd9fc9d623fcf)" = "c63256a64799b5aa453e76a6d29cd9fc9d623fcf" && test "$(git show -s --format=%T c63256a64799b5aa453e76a6d29cd9fc9d623fcf)" = "d8ffcc1441f4d592f9d1338dbd5fe09442559e01" && test "$(git show -s --format=%P c63256a64799b5aa453e76a6d29cd9fc9d623fcf)" = "53f33c6561d4d344153f23e653a6719c082f432c" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_FRESH_REQA_53F33C6.md | awk '{print $1}')" = "206e9ab43b2b190e612d183dd7bb506f337d21f33685fc1453651c6cd3b623eb" && test -z "$(git diff --name-only c63256a64799b5aa453e76a6d29cd9fc9d623fcf -- | rg -v '^(server/phase3-observer-bridge-hosted\.mjs|server/phase3-observer-bridge-hosted\.test\.mjs|server/phase3-observer-bridge-api\.mjs|server/phase3-observer-bridge-api\.test\.mjs|api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo B1_PASS
  EXPECT: report bytes unchanged, source drift 0, changes remain within eight allowed paths.
  EVIDENCE: isolated source HEAD/tree/parent/report hash matched exactly; semantic diff uses the Gate plus five allowed implementation/test paths, with prior reports untouched.
- [x] B2: exact re-QA prototype-spoof and symbol-decoration cases reproduce RED then return generic 503 for all endpoints and settlement modes.
  CHECK: node --test --test-name-pattern='re-QA brand blocker' server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: direct API and stable host reject both forms without specific mapping, retry, or disclosure.
  EVIDENCE: RED 0/2 reproduced specific 429 mappings; GREEN 2/2 covers API and stable host, 6 endpoints x 2 reasons x sync/async x 2 layers = 48/48 generic 503 with call 1.
- [x] B3: module-private WeakSet identity and exact prototype/own-key/data-descriptor classifier accept genuine known codes only.
  CHECK: node --test --test-name-pattern='error brand classifier' server/phase3-observer-bridge-hosted.test.mjs
  EXPECT: all known genuine codes pass; brand is not exported; classifier is total and non-throwing.
  EVIDENCE: hosted classifier test passes all 14 genuine known codes, verifies exact four data-descriptor keys, tolerates throwing stack formatting, rejects unknown code, and proves no brand/original-code export.
- [x] B4: spoofed/mutated/decorated/subclass/proxy/cross-realm/frozen/sealed hostile brand matrix fails generic without executing traps.
  CHECK: node --test --test-name-pattern='brand mutation matrix' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs
  EXPECT: fake prototype, prototype mutation, subclass, symbol/string extras, code accessor/overwrite/delete, proxies, cross-realm, frozen/sealed, and traps all yield null or finite 503.
  EVIDENCE: hosted 17-class mutation matrix passes with trap hits 0; direct API and stable-host matrices cover 18 hostile classes x 6 endpoints x 2 settlement modes x 2 layers = 432/432 generic 503.
- [x] B5: all six endpoints preserve sync/async known mappings, one invocation, retry 0, unhandled 0, no leak; stable residual catch and no-store remain.
  CHECK: node --test --test-name-pattern='sync and async bridge methods|sync throws and async rejections|one invocation|unhandled rejection|hostile rejection corpus|stable host residual bridge rejection|private bridge response is no-store' server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: prior Promise and HTTP boundaries remain exact.
  EVIDENCE: 14 codes x 6 endpoints x sync/async x API/stable = 336/336 exact mappings; hostile calls 432, retry 0, trap hits 0, prior unhandled 0; residual catch and no-store tests pass.
- [x] B6: prior path/parser/body/auth/cache, bridge/hosted/account, default-disabled, and persistence tests pass unchanged.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted regression matrix passes.
  EVIDENCE: hosted/API/stable 65/65, bridge/hosted/account targeted 128/128, and full Node 249/249 pass; raw path, parser, auth, cache, Postgres, operations, account, and default-disabled boundaries remain covered.
- [x] B7: full Node/frontend/build/security/public/mutation/scope/runbook/boundary/diff and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_BUILDER_RECEIPT.md && echo B7_PASS
  EXPECT: measured evidence, rollback, false completions, residual risk, and learning are fixed without promotion.
  EVIDENCE: receipt records targeted 128/128, Node 249/249, frontend 89/89, build 1,652, security 44/44, public 4/4, mutation 32/32 and 28/28 API, scope 47, runbook, boundary 0, diff PASS, external 0, rollback, nine false-completion controls, residual risk, and learning.

## ABANDON

**ABANDON:** This Gate proves only a local branded error-classification correction candidate. It does not prove fresh QA, fresh Release Audit, Supabase/database parity, hosted activation, O2 evidence, Phase 3 progress, Cherry acceptance, deploy, push, release, or external completion.
