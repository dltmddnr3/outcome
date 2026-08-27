# Phase 3 Observer Bridge · Async Error Boundary Correction Gates

Outcome: arbitrary hostile bridge rejection reasons are classified without observable property/prototype/coercion behavior and always settle as a finite public-safe response, with a second stable-host containment boundary and no retry.

- [x] E1: exact Release Audit FAIL carrier/tree/parent/report hash and six-path scope are fixed.
  CHECK: test "$(git show -s --format=%H c6456d73013b027b1f992ea4a1ad8914e9983618)" = "c6456d73013b027b1f992ea4a1ad8914e9983618" && test "$(git show -s --format=%T c6456d73013b027b1f992ea4a1ad8914e9983618)" = "b8c1efb8edaa383d42f5703f6fd50a45e7ea2118" && test "$(git show -s --format=%P c6456d73013b027b1f992ea4a1ad8914e9983618)" = "2c96c3d87082d96fbfaeb2aca10887dc946ca07a" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_FRESH_RELEASE_AUDIT.md | awk '{print $1}')" = "8f4ac1d99420ddc8a73cacfda122b02051615c7fd2ce4ecafae1aaa655fa03c8" && test -z "$(git diff --name-only c6456d73013b027b1f992ea4a1ad8914e9983618 -- | rg -v '^(server/phase3-observer-bridge-api\.mjs|server/phase3-observer-bridge-api\.test\.mjs|api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo E1_PASS
  EXPECT: evidence bytes unchanged, source drift 0, only six allowed paths.
  EVIDENCE: isolated HEAD/tree/parent and report SHA-256 matched exactly; semantic diff contains the Gate and four allowed code/test paths only.
- [x] E2: the exact Audit Proxy prototype trap and throwing code accessor reproduce RED then settle as 503 bridge_unavailable.
  CHECK: node --test --test-name-pattern='Audit hostile rejection reasons' server/phase3-observer-bridge-api.test.mjs
  EXPECT: 2/2 hostile reasons cannot reject the API Promise outward or disclose trap detail.
  EVIDENCE: RED 0/2 reproduced both outward rejections; GREEN 2/2 returns exact finite 503 bodies with no hostile detail.
- [x] E3: expanded hostile rejection corpus is total for every endpoint without trap, coercion, iteration, inspection, serialization, or unhandled rejection leakage.
  CHECK: node --test --test-name-pattern='hostile rejection corpus' server/phase3-observer-bridge-api.test.mjs
  EXPECT: every endpoint settles 503; selected operation call 1, retry 0, unhandled 0, disclosure 0.
  EVIDENCE: 6 endpoints x 11 hostile reasons = 66/66 finite responses; operation call 66, retry 0, trap hits 0, unhandled rejection 0, disclosure 0.
- [x] E4: only safely materialized exact HostedObserverBridgeError own data codes retain fixed mappings; accessor, forged, inherited, unknown, and hostile forms fail closed.
  CHECK: node --test --test-name-pattern='safe known error classification' server/phase3-observer-bridge-api.test.mjs
  EXPECT: existing known sync/async mappings remain; no duck-typed authority.
  EVIDENCE: all 14 fixed codes map for sync and frozen async errors (28/28); six accessor/forged/inherited/subclass/unknown forms fail closed; unguarded instanceof and code access are removed.
- [x] E5: stable host catches any residual bridge-handler rejection, invokes once, returns finite 503, and retains no-store at the Vercel response boundary.
  CHECK: node --test --test-name-pattern='stable host residual bridge rejection|private bridge response is no-store' server/stable-host.test.mjs
  EXPECT: no outward rejection, retry, raw detail, or cacheable private response.
  EVIDENCE: stable-host 6 endpoints x 2 Audit reasons = 12/12 finite 503 with call 1/retry 0; stable caller has an enclosing catch and Vercel private response remains no-store.
- [x] E6: prior async success/error, raw path, parser/body/auth/cache, bridge/account, and public behavior pass unchanged.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted regression matrix passes with default bridge disabled.
  EVIDENCE: API/stable 38/38 and bridge/account targeted 120/120 pass; full Node 241/241 confirms default-disabled, path, parser, auth, cache, Postgres, operations, and account boundaries.
- [x] E7: full Node/frontend/build/security/public/mutation/scope/runbook/boundary/diff and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && echo E7_PASS
  EXPECT: measured regressions and locked boundaries are fixed in the receipt; Builder correction only.
  EVIDENCE: receipt records targeted 120/120, Node 241/241, frontend 89/89, build 1,652, security 41/41, public 4/4, mutation 32/32 and 28/28 API, scope 47, runbook, boundary 0, diff PASS, external 0, rollback, eight false-completion controls, residual risk, and learning.

## ABANDON

**ABANDON:** This Gate proves only a local error-containment correction candidate. It does not prove fresh re-QA, fresh re-Audit, Supabase, database parity, hosted activation, O2 evidence, Phase 3 progress, Cherry acceptance, deploy, push, release, or external completion.
