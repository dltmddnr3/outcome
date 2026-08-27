# Phase 3 Observer Bridge · Async Persistence Seam Gates

Outcome: audited private Observer Bridge API boundary가 sync 구현과 future async persistence adapter를 모두 한 번만 호출·await하고, rejection을 finite public-safe response로 매핑하며 default-disabled stable-host 경계를 보존한다.

- [x] A1: exact fresh Release Audit carrier, tree, parent, clean isolated source, and allowed-path scope are fixed.
  CHECK: test "$(git show -s --format=%H f9e441cb20b78d32136b60cbe2a3f522fd9aac73)" = "f9e441cb20b78d32136b60cbe2a3f522fd9aac73" && test "$(git show -s --format=%T f9e441cb20b78d32136b60cbe2a3f522fd9aac73)" = "9544fca8b8a381574d6affa647e17eb7c8710eec" && test "$(git show -s --format=%P f9e441cb20b78d32136b60cbe2a3f522fd9aac73)" = "6b93799b95d5bda87ac028d83b9fadcc44494a83" && test -z "$(git diff --name-only f9e441cb20b78d32136b60cbe2a3f522fd9aac73 -- | rg -v '^(server/phase3-observer-bridge-api\.mjs|server/phase3-observer-bridge-api\.test\.mjs|api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM\.md|docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT\.md)$')" && echo A1_PASS
  EXPECT: source drift 0 and no path outside the six-path allowlist.
  EVIDENCE: isolated source pin/tree/parent matched exactly; semantic diff is limited to Gate plus four allowed code/test paths.
- [x] A2: all six endpoints await sync and async bridge implementations with identical finite success responses.
  CHECK: node --test --test-name-pattern='sync and async bridge methods' server/phase3-observer-bridge-api.test.mjs
  EXPECT: projection, enroll, complete, revoke, rotate, and events each resolve exactly once without Promise-valued bodies.
  EVIDENCE: 1/1 focused test covers 6 endpoints x sync/async = 12 successful invocations with exact finite status/body and no Promise-valued body.
- [x] A3: known and unknown synchronous throws and asynchronous rejections map identically without raw error, stack, identifier, or partial body disclosure.
  CHECK: node --test --test-name-pattern='sync throws and async rejections' server/phase3-observer-bridge-api.test.mjs
  EXPECT: HostedObserverBridgeError retains finite mapping; unknown failures are 503 bridge_unavailable.
  EVIDENCE: 1/1 focused test covers 6 endpoints x 4 failure classes = 24 mappings; known rate limit is 429 and unknown detail is 503 bridge_unavailable with zero disclosure.
- [x] A4: rejection is never retried or left unhandled, including hostile thenables/accessors.
  CHECK: node --test --test-name-pattern='one invocation|unhandled rejection|thenable' server/phase3-observer-bridge-api.test.mjs
  EXPECT: one bridge method invocation per request, zero retry, zero unhandledRejection, hostile result assimilation fails closed.
  EVIDENCE: 2/2 focused tests prove six rejected async operations invoke once, retry 0, unhandled rejection 0, and hostile thenable accessor fails closed after one method invocation.
- [x] A5: parser, body cap, duplicate/forbidden keys, owner CSRF, server auth, companion ambient-auth removal, raw path validation, allowlist, raw bytes, and no-store remain unchanged.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: focused API and stable-host suites pass.
  EVIDENCE: API/stable-host focused suites pass 33/33; prior 15 direct hostile raw aliases plus catch-all mapping, authentication/factory calls 0, raw byte cap, companion authority removal, exact allowlist, and no-store remain covered.
- [x] A6: every call site awaits or returns the Promise contract, default production remains bridge-disabled, and audited bridge/account regressions pass.
  CHECK: test "$(rg -l 'handleHostedObserverBridgeRequest' --glob '!docs/**' --glob '!GATES*' . | sort | tr '\n' ' ')" = "./api/index.mjs ./server/phase3-observer-bridge-api.mjs ./server/phase3-observer-bridge-api.test.mjs " && node --test server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs server/stable-host.test.mjs
  EXPECT: no unawaited call site and all focused bridge/account behavior passes.
  EVIDENCE: inventory finds only implementation, awaited stable-host caller, and fully awaited API tests; bridge/account targeted matrix passes 115/115.
- [ ] A7: full Node, frontend, build, security/public/mutation/scope/runbook/boundary/diff and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_PERSISTENCE_SEAM_BUILDER_RECEIPT.md && echo A7_PASS
  EXPECT: measured proportional checks pass; receipt pins rollback, false completions, learning, and all locked boundaries.
  EVIDENCE: pending.

## ABANDON

**ABANDON:** This Gate proves only a disabled-by-default local async persistence seam candidate. It does not prove a Supabase project, driver, connection, timeout policy, hosted activation, O2 progress, QA, Release Audit, Cherry acceptance, deploy, push, release, or external completion.
