# Phase 3 Observer Bridge · Async Error Exact-New-Target Correction Fresh Independent QA

Verdict: **FAIL**

Observed: 2026-08-27 KST

The exact correction carrier fails fresh independent QA. The `new.target === HostedObserverBridgeError` admission guard closes alternate-newTarget construction, but it does not distinguish a direct exact target from a transparent Proxy or bound target when `Reflect.construct` supplies the exact class as `newTarget`. It also continues to admit exact-class instances constructed while the exported prototype is decorated or its prototype chain is mutated. Five hostile variants therefore retain the privileged `rate_limited` brand and expose `429 {"error":"rate_limited"}` through all six endpoints in both settlement modes and both request layers.

## Acceptance ledger

- [x] Q1: exact carrier, semantic correction, prior QA FAIL carrier, ancestry, trees, receipt hash, prior report hash, and initial clean detached state match the dispatch.
  CHECK: test "$(git show -s --format=%T 6e2c4ea6002c8113f153b2fd0e734a9f0b134e72)" = "31330eaac1d79637a2fe4d8b86d06a1e76e25851" && test "$(git show -s --format=%P 6e2c4ea6002c8113f153b2fd0e734a9f0b134e72)" = "5d7d99a2dfa9845152dd02821749460671a03cee" && test "$(git show -s --format=%T 5d7d99a2dfa9845152dd02821749460671a03cee)" = "884114d05f98962c009fca88c0412eac48c4e294" && test "$(git show -s --format=%P 5d7d99a2dfa9845152dd02821749460671a03cee)" = "3be5f146928ef0543b29d350b8d5751d2432eea0" && test "$(git show -s --format=%T 3be5f146928ef0543b29d350b8d5751d2432eea0)" = "6d7ca5b749ce584c26f3688e048998cac43f2e84" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_BUILDER_RECEIPT.md | awk '{print $1}')" = "c1e80f1a6a26b0a19d0dbf07433e01cb6e6d318165ac539493bd4b2a8a985168" && test "$(shasum -a 256 docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BRAND_CORRECTION_FRESH_QA_E10FE0F.md | awk '{print $1}')" = "92389a8a90e6ca06fac7267e33a735f5ddf56f56092bc11eb9322aad19915d1a"
  EXPECT: all immutable identities match; the only worktree mutation after the recorded initial-clean check is this report.
  EVIDENCE: fresh detached worktree `/private/tmp/outcome-observer-new-target-fresh-qa.18XNW1/worktree` was clean before report creation; carrier/tree `6e2c4ea6002c8113f153b2fd0e734a9f0b134e72` / `31330eaac1d79637a2fe4d8b86d06a1e76e25851`; semantic/tree `5d7d99a2dfa9845152dd02821749460671a03cee` / `884114d05f98962c009fca88c0412eac48c4e294`; prior QA FAIL/tree `3be5f146928ef0543b29d350b8d5751d2432eea0` / `6d7ca5b749ce584c26f3688e048998cac43f2e84`; receipt and prior-report SHA-256 matched exactly.
- [x] Q2: direct `new` and `Reflect.construct` with the exact class preserve every genuine finite mapping.
  CHECK: node --test --test-name-pattern='exact newTarget brand admission' server/phase3-observer-bridge-hosted.test.mjs
  EXPECT: all 14 fixed codes pass under both exact construction forms.
  EVIDENCE: candidate focused test 1/1 PASS; source loop covers 14 fixed codes x direct/Reflect exact construction = 28/28 preserved mappings.
- [x] Q3: alternate `newTarget` variants including same/different prototype, subclass, bound, Proxy target/newTarget, prototype mutation/replacement, `Symbol.hasInstance` tricks, copied constructor/prototype, and cross-realm construction were independently evaluated.
  CHECK: node --test /private/tmp/outcome-observer-new-target-fresh-qa.18XNW1/independent-new-target-qa.test.mjs 2>&1 | rg -q 'unexpected branded variants:.*Proxy target with exact newTarget.*bound target with exact newTarget.*constructor prototype-chain mutation.*prototype decoration during construction.*cross-realm Proxy target exact newTarget'
  EXPECT: every hostile classifier result is null; trap/coercion execution is zero.
  EVIDENCE: FAIL; 14 independent variants evaluated, 9 classify null and 5 classify `rate_limited`: Proxy target + exact newTarget, bound target + exact newTarget, exported-prototype chain mutation, exported-prototype decoration, and cross-realm Proxy target + exact newTarget. `Symbol.hasInstance` trap hits 0.
- [x] Q4: the six endpoints in sync and async settlement were independently evaluated for generic 503, one call, retry 0, trap 0, unhandled 0, and leak 0.
  CHECK: node --test --test-name-pattern='QA alternate newTarget blocker|newTarget construction matrix' server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs && node --test /private/tmp/outcome-observer-new-target-fresh-qa.18XNW1/independent-new-target-endpoints.test.mjs 2>&1 | rg -q 'unexpected mappings \(120\), calls 336'
  EXPECT: candidate and independent endpoint matrices pass across both API layers.
  EVIDENCE: FAIL; candidate focused matrix 4/4 PASS, but independent matrix made 336/336 bridge calls and found 120 hostile specific mappings = 5 variants x 6 endpoints x sync/async x direct/stable. Expected each: 503 `bridge_unavailable`; actual each: 429 `rate_limited`. One call/case, retry 0, trap 0, unhandled 0, raw trap/detail/stack leak 0; hostile specific-code exposure 120.
- [x] Q5: the prior 432 hostile and genuine mapping matrices plus finite one-call/no-retry/no-unhandled/no-leak boundaries remain intact.
  CHECK: node --test --test-name-pattern='brand mutation matrix|genuine brand mappings|one invocation|unhandled rejection|hostile rejection corpus|stable host residual bridge rejection|private bridge response is no-store' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs
  EXPECT: all matching tests pass.
  EVIDENCE: 10/10 focused tests PASS; prior hostile matrix 18 variants x 6 endpoints x sync/async x direct/stable = 432/432 generic; genuine matrix 14 codes x 6 endpoints x sync/async x direct/stable = 336/336 mapped; residual catch, one-call, retry0, unhandled0, raw-detail leak0, and no-store checks pass.
- [x] Q6: path/parser/body/auth/CSRF/companion/no-store/default-off/public/account boundaries pass without browser or network activity.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs
  EXPECT: targeted Node matrix passes.
  EVIDENCE: targeted Node 134/134 PASS, including exact path/parser/body/auth/CSRF/companion/no-store/default-off and account boundaries.
- [x] Q7: full Node, frontend, security, public, mutation, build, scope, runbook, boundary, and diff checks pass within the locked local boundary.
  CHECK: npm test && npm run build && npm run test:security && npm run test:public && node --test scripts/check-mutation-matrix.test.mjs && npm run check:scope && npm run check:runbook && node scripts/check-client-env-boundary.mjs && git diff --check 3be5f146928ef0543b29d350b8d5751d2432eea0..HEAD
  EXPECT: all local checks pass; no browser/network/external command is invoked.
  EVIDENCE: full Node 255/255 PASS; frontend 89/89 across five files PASS; build PASS with 1,652 modules; security 46/46; public 4/4; mutation unit 3/3; scope 47; stable snapshot prohibited disclosures 0; client-env leaks 0/6; runbook and diff PASS. Browser-backed `check:public-boundary` and loopback-HTTP `check:mutations` were not run because this QA dispatch forbids browser/network; their unit/static counterparts passed.
- [x] Q8: Builder Gate checks are independently executable and fully evidenced.
  CHECK: node /Users/rosum/.codex/skills/unlazy/scripts/gate-check.mjs --timeout 30 GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION.md
  EXPECT: 7/7 checks pass with no pending evidence.
  EVIDENCE: `gate-check.mjs --timeout 30` reports `7 gates` and `ALL MET (7 met)`.
- [x] Q9: candidate scope is exactly six paths and this QA mutates exactly this one report under `docs/`.
  CHECK: test "$(git diff --name-only 3be5f146928ef0543b29d350b8d5751d2432eea0..6e2c4ea6002c8113f153b2fd0e734a9f0b134e72 | wc -l | tr -d ' ')" = "6" && test "$(git show -s --format=%P HEAD)" = "6e2c4ea6002c8113f153b2fd0e734a9f0b134e72" && test "$(git diff --name-only 6e2c4ea6002c8113f153b2fd0e734a9f0b134e72..HEAD)" = "docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_FRESH_QA_6E2C4EA.md" && test -z "$(git status --porcelain)"
  EXPECT: semantic/carrier scope six; QA repository mutation one report only.
  EVIDENCE: prior FAIL to carrier diff is exactly six paths: four source/test paths, one Gate, one Builder receipt; the QA report carrier is a direct child of the pinned carrier, its diff contains only this report, and the worktree is clean.
- [x] Q10: terminal verdict and authority ledger are explicit and evidence-backed.
  CHECK: rg -q '^Verdict: \*\*FAIL\*\*$' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_FRESH_QA_6E2C4EA.md && rg -q '^\- external mutations: `0`$' docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_FRESH_QA_6E2C4EA.md
  EXPECT: verdict is exactly PASS_INDEPENDENT_QA_ONLY, FAIL, or BLOCKED; external mutation count is zero and release boundaries remain locked.
  EVIDENCE: terminal is FAIL; no external action was taken and all promotion/release boundaries remain locked.

## QA-ENT-1 · alternate target paths retain exact-class response authority

Severity: release-blocking error-brand authority defect.

Minimal reproductions:

```js
Reflect.construct(
  new Proxy(HostedObserverBridgeError, {}),
  ['rate_limited'],
  HostedObserverBridgeError,
)

Reflect.construct(
  HostedObserverBridgeError.bind(null),
  ['rate_limited'],
  HostedObserverBridgeError,
)
```

The constructor observes the supplied exact `newTarget` in both cases and adds the resulting object to the private stores, even though the invoked target is a Proxy or bound wrapper. The same authority survives a cross-realm-created Proxy target. Separately, mutating the exported prototype object's chain or decorating that object during exact-class construction is not recorded by the brand and is invisible after restoration.

- classifier expected: `null`
- classifier actual: `rate_limited`
- HTTP expected: `503 {"error":"bridge_unavailable"}`
- HTTP actual: `429 {"error":"rate_limited"}`
- classifier violations: `5/14` hostile variants
- endpoint violations: `120/336` = 5 variants x 6 endpoints x sync/async x direct/stable
- selected operation invocations: `336`; one per case
- retries: `0`
- trap/`Symbol.hasInstance` executions: `0`
- unhandled rejection events: `0`
- raw reason/detail/stack disclosure: `0`

Impact: module consumers can obtain a privileged fixed response mapping through construction paths the pinned QA contract explicitly requires to remain generic. The candidate test matrix covers Proxy and bound values only as `newTarget`; it does not cover them as the invoked target while supplying the exact class as `newTarget`, nor exported-prototype mutation during construction.

Fix owner: Builder. The correction contract must distinguish or forbid wrapped target invocation and define immutable prototype-state admission, then add every five-counterexample variant to classifier plus six-endpoint direct/stable sync/async tests. A new immutable candidate requires a new fresh independent QA; this report does not authorize a source fix.

## Regression summary

- candidate exact-newTarget focused tests: 4/4 PASS
- prior hostile/genuine and finite-boundary focused tests: 10/10 PASS
- targeted Node: 134/134 PASS
- full Node: 255/255 PASS
- frontend: 89/89 PASS
- build: PASS, 1,652 modules
- security: 46/46 PASS
- public Node: 4/4 PASS
- mutation unit: 3/3 PASS
- scope: PASS, 47 files
- runbook, stable snapshot, client-env boundary, diff: PASS
- Builder Gate: 7/7 met

## External mutation and authority ledger

- browser/network/Supabase/provider/account/project/billing/database/migration/credential/environment/session: `0`
- push/deploy/release/public message: `0`
- external mutations: `0`
- O2, hosted activation, Phase 3 progress, Release Audit, Cherry acceptance, deployment, release, and external completion remain open and unauthorized.

Terminal: **FAIL · RETURN TO BUILDER**
