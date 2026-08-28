# Phase 3 Observer Bridge · Private Error Factory Correction Gates

Outcome: only module-private hosted and API failure paths can confer finite error-response authority; every externally constructed or hostile error remains generic and total.

- [x] P1: exact QA FAIL source, tree, parent, report hash, and seven-path scope are fixed.
  CHECK: test "$(git show -s --format=%H 02ba0ab894311708f937f91603134326440d1325)" = "02ba0ab894311708f937f91603134326440d1325" && test "$(git show -s --format=%T 02ba0ab894311708f937f91603134326440d1325)" = "88a6330f6b24ebb662bfc40c87fabf124f228479" && test "$(git show -s --format=%P 02ba0ab894311708f937f91603134326440d1325)" = "6e2c4ea6002c8113f153b2fd0e734a9f0b134e72" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_FRESH_QA_6E2C4EA.md | awk '{print $1}')" = "92c9c137016afcae1d9b158063d51d0073719f5b896f58f14a98627013663464" && test -z "$(git diff --name-only 02ba0ab894311708f937f91603134326440d1325 -- | rg -v '^(server/phase3-observer-bridge-hosted\.mjs|server/phase3-observer-bridge-hosted\.test\.mjs|server/phase3-observer-bridge-api\.mjs|server/phase3-observer-bridge-api\.test\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo P1_PASS
  EXPECT: source/report drift 0; exactly seven allowed paths maximum.
  EVIDENCE: source `02ba0ab894311708f937f91603134326440d1325`, tree `88a6330f6b24ebb662bfc40c87fabf124f228479`, parent `6e2c4ea6002c8113f153b2fd0e734a9f0b134e72`, report SHA-256 `92c9c137016afcae1d9b158063d51d0073719f5b896f58f14a98627013663464`; allowed-path diff only.
- [x] P2: the five QA constructor counterexamples reproduce RED and become generic at classifier, API, and stable-host boundaries.
  CHECK: node --test --test-name-pattern='QA private error factory root blocker' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: public Proxy/bound/exact/prototype/cross-realm construction yields null or generic 503 for all six endpoints and both settlements; calls one, retries zero.
  EVIDENCE: RED 0/3 (classifier, API, stable host exposed 429); GREEN 3/3. Five cases x six endpoints x sync/async x two request layers = 120/120 generic, calls 120, retries 0.
- [x] P3: no public constructor form confers the hosted brand, while real hosted operations retain their finite mappings.
  CHECK: node --test --test-name-pattern='public constructor never confers|genuine hosted operation mappings' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: direct/Reflect/Proxy/bound/subclass/mutated/decorated public errors are generic; genuine private fail-path errors remain finite.
  EVIDENCE: focused 7/7 PASS; public 14-code direct/Reflect/API/stable matrices generic, while five real hosted operation failure classes map across 120 endpoint/layer/settlement combinations. Token, brand and factory exports 0; instance authority fields 0.
- [x] P4: API parser/body/CSRF failures use a separate private brand and preserve 400/403 without exporting authority.
  CHECK: node --test --test-name-pattern='private API error mappings|raw parser|owner enrollment|Proxy and accessor request bodies' server/phase3-observer-bridge-api.test.mjs
  EXPECT: bad_request/body_too_large/csrf_invalid preserve finite responses; external public errors cannot acquire API authority.
  EVIDENCE: focused 4/4 PASS; private bad_request/body_too_large/csrf_invalid map 400/400/403, public constructor injection maps generic 503, API authority exports 0.
- [x] P5: hostile rejection classification stays total with trap/retry/unhandled/leak counts zero and stable-host residual catch/no-store intact.
  CHECK: node --test --test-name-pattern='hostile rejection corpus|brand mutation matrix|one invocation|unhandled rejection|stable host residual bridge rejection|private bridge response is no-store' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: every hostile reason settles finite generic after exactly one call; retries, traps, unhandled rejections, and disclosures are zero.
  EVIDENCE: focused 8/8 PASS; hostile 432/432 remains generic; QA root 120/120 generic; retries 0, trap executions 0, unhandled rejections 0, raw disclosures 0; residual catch and no-store PASS.
- [x] P6: bridge/hosted/Postgres/operations/account and full Node regressions pass.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted matrix passes without API/index, package, migration, config, or UI changes.
  EVIDENCE: targeted 140/140 PASS; full Node 261/261 PASS; production API/index unchanged.
- [x] P7: full frontend/build/security/public/mutation/scope/runbook/boundary/diff, privacy scan, and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md && echo P7_PASS
  EXPECT: Builder-only correction evidence is complete without external or release promotion.
  EVIDENCE: full Node 261/261; frontend 89/89; build 1,652 modules; security 48/48; public 4/4; local mutation 32/32 and API read-only 28/28; scope 47; runbook, public boundary, privacy and diff PASS; external mutations 0.

## ABANDON

**ABANDON:** This Gate proves only a local private-error-factory correction candidate. It does not prove fresh QA, Release Audit, database parity, hosted activation, O2 evidence, Phase 3 progress, Cherry acceptance, deploy, push, release, or external completion.
