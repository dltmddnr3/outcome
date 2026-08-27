# Phase 3 Observer Bridge · Disabled Runtime Wiring Gates

Outcome: audited Observer Bridge seams를 stable host에 injected runtime으로만 연결하고, default-off 상태와 기존 public/account 의미를 보존하며 hosted persistence가 없는 현재에는 fail closed한다.

- [ ] W1: exact parent commit/tree와 allowed-path scope가 고정된다.
  CHECK: test "$(git show -s --format=%H 19c64be0ca84cf30a98a3470aa511a6d67f1698b)" = "19c64be0ca84cf30a98a3470aa511a6d67f1698b" && test "$(git show -s --format=%T 19c64be0ca84cf30a98a3470aa511a6d67f1698b)" = "b3c1126c01a183281567f20c828ab3f8c5d322db" && test -z "$(git diff --name-only 19c64be0ca84cf30a98a3470aa511a6d67f1698b -- | rg -v '^(api/index\.mjs|server/stable-host\.test\.mjs|server/phase3-observer-bridge-runtime\.mjs|server/phase3-observer-bridge-runtime\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING\.md|docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT\.md)$')" && echo W1_PASS
  EXPECT: source drift 0; modified paths are a subset of the six allowed paths.
  EVIDENCE: pending.
- [ ] W2: bridge config is names-only, projection/enrollment and ingestion flags are independent, and absent/partial/malformed values default fail closed.
  CHECK: node --test --test-name-pattern='configuration|default disabled' server/phase3-observer-bridge-runtime.test.mjs
  EXPECT: both flags false by default; malformed and unsafe partial combinations yield no runtime.
  EVIDENCE: pending.
- [ ] W3: factory missing, throw, reject, or invalid output is safely cached and every bridge route returns finite non-enumerating bridge_unavailable.
  CHECK: node --test --test-name-pattern='factory|finite unavailable' server/phase3-observer-bridge-runtime.test.mjs server/stable-host.test.mjs
  EXPECT: one construction attempt maximum; no error detail or configured value disclosure.
  EVIDENCE: pending.
- [ ] W4: server-authenticated owner/viewer context is injected only for protected projection/enrollment operations, while companion complete/events receive no ambient cookie/bearer authority.
  CHECK: node --test --test-name-pattern='server auth context|ambient authority|spoof' server/phase3-observer-bridge-runtime.test.mjs server/stable-host.test.mjs
  EXPECT: client authority fields cannot override server context; companion routes do not authenticate ambient credentials.
  EVIDENCE: pending.
- [ ] W5: raw request bytes and body cap reach the audited parser unchanged, and every private bridge response is no-store.
  CHECK: node --test --test-name-pattern='raw bytes|body cap|no-store' server/stable-host.test.mjs
  EXPECT: no JSON reserialization; oversize fails closed; cache-control no-store.
  EVIDENCE: pending.
- [ ] W6: default/off behavior, non-bridge public/account routes, unknown bridge paths/methods, and mutation allowlists remain closed without regression.
  CHECK: node --test server/stable-host.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: existing public/account assertions pass; outside exact bridge operations mutations remain 405.
  EVIDENCE: pending.
- [ ] W7: audited Observer Bridge API/domain/hosted/postgres/operations suites pass unchanged.
  CHECK: node --test server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs
  EXPECT: all tests pass.
  EVIDENCE: pending.
- [ ] W8: proportional full Node, frontend, build, security/public boundary, scope, runbook, and diff checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'security/public-boundary/scope/runbook/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && echo W8_PASS
  EXPECT: all proportional regressions pass with measured counts.
  EVIDENCE: pending.
- [ ] W9: immutable Builder receipt records hashes, tests, rollback, external mutations 0, locked state, false completions, and learning.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && rg -q 'BUILDER_CODE_CANDIDATE_READY_ONLY' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_BUILDER_RECEIPT.md && echo W9_PASS
  EXPECT: Builder candidate only; no QA, Audit, acceptance, deploy, or release claim.
  EVIDENCE: pending.

## ABANDON

**ABANDON:** 이 Gate의 PASS는 local disabled runtime candidate만 뜻한다. Supabase project, database, credentials, hosted persistence, environment activation, O2, progress, QA, Release Audit, Cherry acceptance, deploy, release 또는 external completion을 뜻하지 않는다.
