# Phase 3 Observer Bridge · Disabled Runtime Raw-Path Correction Gates

Outcome: stable host가 URL normalization 이전 raw request target을 검증하여 exact private bridge allowlist의 alias 우회를 fail closed하고, 기존 disabled runtime·auth·body·cache·public/account 경계를 보존한다.

- [x] C1: exact QA carrier, parent, tree, report hash와 allowed-path scope가 고정된다.
  CHECK: test "$(git show -s --format=%H e62d207f66b461fefa1353f5079aead2dbe1850f)" = "e62d207f66b461fefa1353f5079aead2dbe1850f" && test "$(git show -s --format=%T e62d207f66b461fefa1353f5079aead2dbe1850f)" = "aa77de7823fca19b3de68533c61d499031caf5bc" && test "$(git show -s --format=%P e62d207f66b461fefa1353f5079aead2dbe1850f)" = "2a889d90c52545e37302648805e29add000993ee" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_FRESH_QA_2A889D9.md | awk '{print $1}')" = "f675fd997fde2b4ee2e07b8c857db57354ebfc6e69f2d0a82918a3c5c2222a1a" && test -z "$(git diff --name-only e62d207f66b461fefa1353f5079aead2dbe1850f -- | rg -v '^(api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo C1_PASS
  EXPECT: source/report drift 0; only four allowed correction paths.
  EVIDENCE: semantic correction ca8a3ab499344c9a1ac15764145afee632736bf1 is a direct child of the exact QA carrier; report hash is unchanged; three semantic paths are allowed.
- [x] C2: all five QA aliases and adjacent raw/encoded dot, separator, backslash, control, invalid-percent variants return finite bridge_unavailable before auth or bridge invocation.
  CHECK: node --test --test-name-pattern='raw bridge aliases' server/stable-host.test.mjs
  EXPECT: every hostile target is 404 bridge_unavailable; account auth and bridge calls 0.
  EVIDENCE: RED reproduced 2/2 failures; GREEN rejects 15/15 direct aliases with auth 0, factory 0, and bridge calls 0.
- [x] C3: deployed requestPath and Vercel catch-all mapping retain the unnormalized raw target for the same rejection boundary.
  CHECK: node --test --test-name-pattern='request target preserves raw bridge aliases' server/stable-host.test.mjs
  EXPECT: no URL pathname normalization before validation; valid catch-all query remains mapped.
  EVIDENCE: request-target regression preserves literal and encoded dot/backslash forms and rejects the Vercel catch-all alias while canonical projection query remains 200.
- [x] C4: canonical bridge paths and queries preserve server auth, companion ambient-auth removal, raw body cap, no-store, flags, and exact method allowlist.
  CHECK: node --test --test-name-pattern='flags gate|server auth context|ambient authority|raw bytes|no-store|outside the exact allowlist' server/stable-host.test.mjs
  EXPECT: prior focused safety behavior unchanged.
  EVIDENCE: stable host 19/19 and targeted bridge/account/stable 128/128 preserve every prior safety boundary.
- [x] C5: focused bridge/account and full Node/frontend/build/security/public/mutation/scope/runbook/boundary/diff checks pass.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'focused correction: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full Node: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'full frontend: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'build: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'security/public/mutation/scope/runbook/boundary/diff: PASS' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && echo C5_PASS
  EXPECT: all proportional regressions pass with measured counts.
  EVIDENCE: receipt records focused 2/2, targeted 128/128, Node 231/231, frontend 89/89, build 1,652, security 39/39, public 4/4, mutation 32/32, scope 47, runbook, boundary 0, and diff PASS.
- [x] C6: receipt records exact commits, tests, rollback, external 0, false completions, learning, and locked state.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'external mutations: 0' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'false_completion_count:' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'O2: OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'Phase 3: 17/43' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_DISABLED_RUNTIME_WIRING_CORRECTION_BUILDER_RECEIPT.md && echo C6_PASS
  EXPECT: Builder correction candidate only.
  EVIDENCE: immutable receipt pins correction, rollback, external 0, six false-completion controls, learning, and all locked state.

## ABANDON

**ABANDON:** 이 correction은 local stable-host path validation만 증명한다. fresh QA, Release Audit, Cherry acceptance, Supabase, database, hosted activation, O2, progress, deploy, push, release 또는 external completion을 증명하지 않는다.
