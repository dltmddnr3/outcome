# Phase 3 Observer Bridge · Reachable HTTP Boundary Correction Gates

Outcome: the stable-host request-body collector validates remotely controlled bytes without treating trusted Node/Vercel iterator and Promise machinery as attacker-supplied authority.

- [x] R1: exact Planner amendment source, tree, parent, and 6/6 authority Gate are fixed.
  CHECK: test "$(git show -s --format=%H d30910634ebf133eb400b709caa4bc9df3f1cefa)" = "d30910634ebf133eb400b709caa4bc9df3f1cefa" && test "$(git show -s --format=%T d30910634ebf133eb400b709caa4bc9df3f1cefa)" = "04e365006136263e501bde296221fca0dcd77876" && test "$(git show -s --format=%P d30910634ebf133eb400b709caa4bc9df3f1cefa)" = "e02b28a277bb3837337f08e011513685690eba82" && node /Users/rosum/.codex/skills/unlazy/scripts/gate-check.mjs --timeout 30 GATES_PHASE3_OBSERVER_BRIDGE_TRUSTED_RUNTIME_BOUNDARY_AMENDMENT.md | rg -q 'ALL 6 GATES MET' && test -z "$(git diff --name-only d30910634ebf133eb400b709caa4bc9df3f1cefa -- | rg -v '^(api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo R1_PASS
  EXPECT: immutable source and amendment authority match; only four allowed paths differ.
  EVIDENCE: source `d30910634ebf133eb400b709caa4bc9df3f1cefa`, tree `04e365006136263e501bde296221fca0dcd77876`, parent `e02b28a277bb3837337f08e011513685690eba82`; amendment Gate 6/6; four-path allowlist only.

- [x] R2: collector trusts the platform iterator normally and contains ordinary create/read/cleanup failures without reflective function-name or Promise-constructor decisions.
  CHECK: node --test --test-name-pattern='trusted runtime iterator|ordinary platform iterator failure' server/stable-host.test.mjs
  EXPECT: normal custom and async-generator iterators work; iterator create, read, rejection, and cleanup failures return finite no-store responses with no retry.
  EVIDENCE: 2/2 focused tests PASS; mutable function-name metadata no longer denies a normal iterator, and four create/read/reject/cleanup faults are finite with one invocation and no retry.

- [x] R3: reachable HTTP body values accept only primitive strings and genuine Buffers with exact byte, UTF-8, and cap behavior.
  CHECK: node --test --test-name-pattern='reachable HTTP body chunks|genuine multi-chunk' server/stable-host.test.mjs
  EXPECT: exact primitive string/Buffer bytes pass; unsupported object, typed-array, boxed-string, symbol, and thenable chunks fail without coercion; cap and invalid UTF-8 remain finite.
  EVIDENCE: 2/2 focused tests PASS; seven unsupported chunk shapes are rejected with coercion hits 0 and cleanup once; string/Buffer multi-chunk exact bytes, UTF-8 parser, and 1,048,576-byte cap remain covered.

- [x] R4: raw path, auth, companion separation, allowlist, default-off, private error, and no-store boundaries remain intact.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs
  EXPECT: the complete focused bridge API/hosted/stable suites pass without product-boundary weakening.
  EVIDENCE: focused bridge API/hosted/stable 86/86 PASS, including raw aliases, server-derived auth, companion ambient-auth removal, exact allowlist, private error brands, default-off and no-store.

- [x] R5: targeted bridge/Postgres/operations/account and full Node/frontend/build regressions pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'targeted bridge/account: PASS' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && echo R5_PASS
  EXPECT: measured local regressions are recorded in the immutable receipt.
  EVIDENCE: targeted 149/149, full Node 270/270, frontend 89/89 across five files, and build 1,652 modules all PASS.

- [x] R6: security/public/mutation/scope/runbook/boundary/diff/privacy checks pass with external mutation zero.
  CHECK: rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && echo R6_PASS
  EXPECT: public/private boundaries and exact local-only scope remain verified.
  EVIDENCE: security 54/54, public 4/4, local mutation 32/32 and API read-only 28/28, scope 47, runbook/public boundary/privacy/diff PASS; external mutations 0.

- [x] R7: trusted-runtime compromise is explicit residual risk and no completion boundary advances.
  CHECK: rg -q 'trusted-runtime compromise' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md && echo R7_PASS
  EXPECT: Builder candidate owns no fresh QA, audit, hosted activation, progress, release, or external completion claim.
  EVIDENCE: receipt records the accepted trusted-runtime compromise residual; O2 OPEN/LOCKED, Phase 3 17/43, and external completion false remain unchanged.

## ABANDON

**ABANDON:** This Gate proves only a local reachable-HTTP boundary correction candidate. It does not prove fresh QA, Release Audit, database parity, hosted activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, or external completion.
