# Phase 3 Observer Bridge · Private Error Factory Correction Fresh Independent QA

Verdict: **FAIL**

Observed: 2026-08-28 KST

The private hosted-error correction closes the prior exported-constructor authority defect: public direct/Reflect/alternate/Proxy/bound/subclass/cross-realm/prototype/decorated/copied forms are generic, real module-private hosted failures preserve fixed mappings, and the six endpoint settlement matrices remain one-call and disclosure-free. The candidate still fails the locked API-private parser boundary. `parseRawJson` calls `Buffer.isBuffer(rawBody)` before rejecting Proxy input. A hostile raw-body Proxy with a throwing `getPrototypeOf` trap therefore executes caller code once and is returned as generic 503 instead of the required private `400 bad_request` with trap count zero.

## Blocking finding

### QAF-1 — High — raw-body Proxy executes `getPrototypeOf` and escapes the exact private 400 mapping

- Reproduction: run `node --test /private/tmp/outcome-observer-private-error-fresh-qa.w9DfGq/independent-private-error-qa.test.mjs` in the pinned worktree.
- Relevant source: `server/phase3-observer-bridge-api.mjs:76-85`; line 82 evaluates `Buffer.isBuffer(rawBody)` before a Proxy rejection.
- Expected: `{ status: 400, body: { error: 'bad_request' } }`, `trapHits=0`, and no bridge call.
- Actual: `{ status: 503, body: { error: 'bridge_unavailable' } }`, `trapHits=1`, and no bridge call.
- Impact: the exported direct API boundary executes attacker-controlled behavior during parser classification and loses the required exact private parser mapping. The response remains finite and does not disclose the trap detail or acquire either private error brand, but trap-zero and exact-400 acceptance are unmet.
- Fix owner: Builder. Reject Proxy `rawBody` before `Buffer.isBuffer` or any other reflective/native brand check, add the throwing-`getPrototypeOf` regression, and return a new immutable candidate for fresh QA.

## Acceptance ledger

- [x] Q1: immutable carrier, semantic correction, parent FAIL, trees, ancestry, receipt hash, prior report hash, and initial clean detached state match.
  CHECK: `test "$(git show -s --format=%T 5937752ee8b82a5cd50226f29832a4968d1a7200)" = 906e50c8d1cafbb8bfbf0637cd2e6e7e4c9bb8f4 && test "$(git show -s --format=%P 5937752ee8b82a5cd50226f29832a4968d1a7200)" = 49fc99533546b1d350b6fde0a829101f79e51544 && test "$(git show -s --format=%T 49fc99533546b1d350b6fde0a829101f79e51544)" = 72e57517241d0e74fbacc46c585bf5f621aeafaa && test "$(git show -s --format=%P 49fc99533546b1d350b6fde0a829101f79e51544)" = 02ba0ab894311708f937f91603134326440d1325 && test "$(git show -s --format=%T 02ba0ab894311708f937f91603134326440d1325)" = 88a6330f6b24ebb662bfc40c87fabf124f228479 && test "$(sha256sum docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_BUILDER_RECEIPT.md | awk '{print $1}')" = d32c05d56db1edfddc1218009c1607b49c017a440626ed278be5bf3f41a2a8f5 && test "$(sha256sum docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_NEW_TARGET_CORRECTION_FRESH_QA_6E2C4EA.md | awk '{print $1}')" = 92c9c137016afcae1d9b158063d51d0073719f5b896f58f14a98627013663464`
  EXPECT: exact dispatch identities and exactly this QA report as the sole final worktree mutation.
  EVIDENCE: fresh detached worktree `/private/tmp/outcome-observer-private-error-fresh-qa.w9DfGq/worktree` was clean before report creation. Carrier/tree `5937752ee8b82a5cd50226f29832a4968d1a7200` / `906e50c8d1cafbb8bfbf0637cd2e6e7e4c9bb8f4`; semantic/tree `49fc99533546b1d350b6fde0a829101f79e51544` / `72e57517241d0e74fbacc46c585bf5f621aeafaa`; parent FAIL/tree `02ba0ab894311708f937f91603134326440d1325` / `88a6330f6b24ebb662bfc40c87fabf124f228479`; both SHA-256 values match the dispatch. Final `git status --short` lists only this report.
- [x] Q2: every public constructor/copy/decorated/proxied/cross-realm form remains generic while genuine private hosted operation failures retain finite mappings.
  CHECK: `node --test --test-name-pattern='independent public surface|independent six-endpoint' /private/tmp/outcome-observer-private-error-fresh-qa.w9DfGq/independent-private-error-qa.test.mjs && node --test --test-name-pattern='QA private error factory root blocker|public constructor never confers|genuine hosted operation mappings|brand mutation matrix' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs`
  EXPECT: public authority 0; genuine known mappings preserved; trap/retry/unhandled/leak 0.
  EVIDENCE: independent public-surface and endpoint tests PASS. Fifteen public construction/copy variants classify null; five separately captured genuine hosted failures preserve their codes; ten mutations each across the five genuine-error factories classify null with trap hits 0. Independent 31-reason x 6-endpoint x sync/async direct-API matrix is 372/372 generic with exactly 372 calls and unhandled 0. Candidate focused error-boundary matrix is 22/22 PASS. Hosted exports are exactly five compatibility/API functions and API exports exactly one handler; token/brand/factory/fail exports 0; authority-bearing instance fields 0.
- [x] Q3: API parser/materialization/body/CSRF private mappings and hostile object behavior were independently evaluated.
  CHECK: `node --test /private/tmp/outcome-observer-private-error-fresh-qa.w9DfGq/independent-private-error-qa.test.mjs`
  EXPECT: 400/400/403 only for private API failures; hostile and forged errors generic; Proxy/accessor/descriptor/prototype traps 0.
  EVIDENCE: **FAIL**; independent suite 3/4 PASS and 1/4 FAIL. Bad JSON materialization, body cap, and CSRF remain exact 400/400/403; ordinary Proxy ownKeys/get/descriptor traps and accessor bodies return 400 with hits 0; forged API-shaped errors remain generic. A raw-body Proxy whose `getPrototypeOf` throws returns 503 and executes the trap once instead of exact 400 and zero trap execution.
- [x] Q4: all six endpoints, both settlement modes, and direct/stable layers remain one-call, retry-zero, finite, no-store, and disclosure-free for the hosted-error boundary.
  CHECK: `node --test --test-name-pattern='QA private error factory root blocker|genuine hosted operation mappings|hostile rejection corpus|one invocation|unhandled rejection|stable host residual bridge rejection|private bridge response is no-store' server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-api.test.mjs server/stable-host.test.mjs`
  EXPECT: public/hostile failures generic 503; genuine private failures fixed; one call per case, retries 0, unhandled 0, leaks 0.
  EVIDENCE: matching candidate tests PASS within the 22/22 focused run. Prior hostile 432-case coverage, the corrected 120-case root matrix, fixed genuine mappings, residual catch, no-store, one-call, retry-zero, unhandled-zero, and disclosure-zero assertions all pass. The QAF-1 parser blocker occurs before a bridge call and is separately recorded under Q3.
- [x] Q5: path, body, authentication, CSRF, default-off, public, account, and prior hostile regressions pass.
  CHECK: `node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/account-access-api.test.mjs server/account-access-hosted.test.mjs server/account-access-identity-runtime.test.mjs`
  EXPECT: targeted local Node suite passes.
  EVIDENCE: targeted Node 140/140 PASS, including exact path/body/auth/CSRF/default-off/public/account and prior hostile matrices.
- [x] Q6: proportional full Node/frontend/build/security/public/mutation/scope/runbook/boundary/diff/privacy checks pass without forbidden external activity.
  CHECK: `npm test && npm run build && npm run test:security && npm run test:public && node --test scripts/check-mutation-matrix.test.mjs && npm run check:scope && npm run check:runbook && node scripts/check-client-env-boundary.mjs && git diff --check 02ba0ab894311708f937f91603134326440d1325..5937752ee8b82a5cd50226f29832a4968d1a7200`
  EXPECT: all authorized local regression checks pass; external mutation 0.
  EVIDENCE: full Node 261/261 PASS; frontend 89/89 across five files PASS; build PASS with 1,652 modules; security 48/48; public 4/4; mutation unit 3/3; scope 47 files; runbook PASS; client-env leaks 0/6 with three Clerk markers and two assets; candidate diff check PASS. Diff secret-pattern hits 0. The Builder Gate checker reports 7/7 met. No browser, network, Supabase, database, env, deploy, push, or external mutation command was used.
- [x] Q7: verdict and scope are honest and confined to fresh independent QA only.
  CHECK: `rg -q '^Verdict: \*\*FAIL\*\*$' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_FRESH_QA_5937752.md && rg -q 'Release Audit.*remain required|cannot prove Release Audit' docs/PHASE3_OBSERVER_BRIDGE_PRIVATE_ERROR_FACTORY_CORRECTION_FRESH_QA_5937752.md`
  EXPECT: no Release Audit, Cherry acceptance, runtime activation, deploy, push, or external completion claim.
  EVIDENCE: verdict is FAIL; candidate returns to Builder. Release Audit, Cherry acceptance, database/hosted parity, runtime activation, O2, Phase 3 advancement, deploy, push, release, and external completion remain open and unauthorized.

## Scope and terminal boundary

- QA mutation: exactly this report, as a child-of-carrier candidate after commit.
- Product/runtime/test source mutation: 0.
- External mutation: 0.
- Release promotion: 0.
- Terminal: `FAIL`; return to Builder for QAF-1 correction and a new fresh QA pin.

## ABANDON

**ABANDON:** This report proves only fresh independent QA failure of the pinned local candidate. It does not prove Release Audit, Cherry acceptance, hosted/database parity, runtime activation, deploy, push, release, or external completion.
