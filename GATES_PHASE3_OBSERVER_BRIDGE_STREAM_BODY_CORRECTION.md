# Phase 3 Observer Bridge · Stream Body Correction Gates

Outcome: the stable-host raw-body collector uses exact iterator and chunk allowlists, executes no hostile accessors/coercions/Proxy machinery, and converts every collection failure into a finite no-store response.

- [x] S1: exact QA FAIL source/tree/parent/report hash and five-path scope are fixed.
  CHECK: test "$(git show -s --format=%H ce387dc567c969652e277b3b33f38e7d245750a0)" = "ce387dc567c969652e277b3b33f38e7d245750a0" && test "$(git show -s --format=%T ce387dc567c969652e277b3b33f38e7d245750a0)" = "24786e6ffa899caf7208a6741c89257ce0dcd069" && test "$(git show -s --format=%P ce387dc567c969652e277b3b33f38e7d245750a0)" = "20732bb5f6f190f1d385c73223dcbe4d07815c70" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_RAW_BODY_PROXY_CORRECTION_FRESH_QA_20732BB.md | awk '{print $1}')" = "4fb1d553dd3cd39c84f097fdb06726cf8329b3406c899a6d8714f990ce68a52d" && test -z "$(git diff --name-only ce387dc567c969652e277b3b33f38e7d245750a0 -- | rg -v '^(api/index\.mjs|server/stable-host\.test\.mjs|server/phase3-observer-bridge-api\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo S1_PASS
  EXPECT: immutable source/report match; only five allowed paths.
  EVIDENCE: source `ce387dc567c969652e277b3b33f38e7d245750a0`, tree `24786e6ffa899caf7208a6741c89257ce0dcd069`, parent `20732bb5f6f190f1d385c73223dcbe4d07815c70`, report SHA-256 `4fb1d553dd3cd39c84f097fdb06726cf8329b3406c899a6d8714f990ce68a52d`; allowed-path diff only.
- [x] S2: exact getter-bearing chunk, Proxy iterator function, and thenable chunk QA failures reproduce RED and become finite.
  CHECK: node --test --test-name-pattern='QA stream body blocker' server/stable-host.test.mjs
  EXPECT: 3/3 finite no-store results; getter/apply/coercion hits 0; bridge calls and retries 0; outward rejections 0.
  EVIDENCE: RED 0/3 with getter 1, Proxy apply 1 and one `ERR_INVALID_ARG_TYPE` outward; GREEN 3/3 finite disabled-stable 404/no-store, avoidable getter/apply/coercion hits 0, bridge/retry/unhandled/leak 0.
- [x] S3: request/iterator/result/chunk hostile surfaces fail closed before avoidable invocation.
  CHECK: node --test --test-name-pattern='stream body hostile iterator matrix' server/stable-host.test.mjs
  EXPECT: request Proxy/revoked, iterator getter/Proxy/bound, iterator object/result Proxy/accessor/thenable, and unsupported chunk forms are finite with trap 0 where pre-invocation rejection is possible.
  EVIDENCE: 1/1 matrix PASS across 17 hostile request/iterator/next/result/chunk cases; request/iterator/next Proxy, revoked, bound and accessor surfaces are rejected pre-invocation with trap/apply/getter 0.
- [x] S4: trusted iterator throw/reject is caught, early cleanup is attempted safely, and genuine multi-chunk Buffer/string bytes preserve cap and UTF-8 semantics.
  CHECK: node --test --test-name-pattern='stream body trusted failure|stream body genuine multi-chunk' server/stable-host.test.mjs
  EXPECT: throw/reject never escapes; invalid/capped iteration cleanup occurs; only primitive strings and genuine Buffers concatenate exactly.
  EVIDENCE: 2/2 focused tests PASS; three trusted create/next throw/reject cases finite; invalid and capped streams call safe cleanup once; primitive strings and genuine Buffers concatenate exact bytes under custom and normal async generators.
- [x] S5: prior private-error/raw-Proxy/brand/async/path/body/auth/cache matrices stay intact.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge-hosted.test.mjs
  EXPECT: focused bridge API/hosted/stable suites pass without weakened assertions.
  EVIDENCE: focused API/hosted/stable 88/88 PASS; prior private-error, raw-Proxy, hostile 432, async, path, body, auth, cache and no-store assertions remain intact.
- [x] S6: targeted bridge/Postgres/operations/account and full Node regressions pass.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted matrix passes; no API/hosted implementation, package, migration, config, or UI drift.
  EVIDENCE: targeted 151/151 PASS; full Node 272/272 PASS; API/hosted implementations, package, migration, config and UI unchanged.
- [ ] S7: full frontend/build/security/public/mutation/scope/runbook/boundary/diff/privacy and immutable receipt checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md && echo S7_PASS
  EXPECT: Builder-only candidate evidence complete with external/release boundaries locked.
  EVIDENCE: pending.

## ABANDON

**ABANDON:** This Gate proves only a local stream-body collector correction candidate. It does not prove fresh QA, Release Audit, database parity, hosted activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, or external completion.
