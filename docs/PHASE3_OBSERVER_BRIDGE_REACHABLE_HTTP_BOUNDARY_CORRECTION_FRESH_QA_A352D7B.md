# Phase 3 Observer Bridge · Reachable HTTP Boundary Correction Fresh QA

Terminal: `PASS_INDEPENDENT_QA_ONLY`

Observed: 2026-08-28 KST

## Immutable review identity

- reviewed candidate: `a352d7b6c8e7dbff0bea08ed113a58c51ac0632b`
- reviewed tree: `34de27a7871a31e23741222557261f36183d770c`
- reviewed parent / semantic correction: `fe21789662a6dd6ec90a4f4ac48356df13c0f710`
- semantic tree: `6835eaecd4067ba748feeabe0dad9ab5b0d2eac5`
- semantic parent / Planner amendment: `d30910634ebf133eb400b709caa4bc9df3f1cefa`
- amendment tree: `04e365006136263e501bde296221fca0dcd77876`
- amendment parent: `e02b28a277bb3837337f08e011513685690eba82`
- amendment document SHA-256: `71b6f3303e4a986a0f2bf4fffb6b1f2b67fec289b871e8061a2ae93d15104997`
- amendment Gate SHA-256: `f25a7703bcb62e7b2d896652c42d1c961428a3020bdf65895bdc0734a5f9c070`
- correction Gate SHA-256: `8b8e51dfc3173c2c5540753748222a54d1c0f731b7b8ba0a7707eed6a7e44c5a`
- Builder receipt SHA-256: `911572e58cbaf74879c40f89c98f0d2e8eed571064484298e76658d42176eb92`

The candidate was checked out detached into a fresh isolated worktree. The first focused execution could not resolve `@clerk/backend` because that clean worktree had no dependency directory. QA linked the already-installed canonical `node_modules` read-only for execution, reran the check successfully, and removed the link before finalizing this report. No package install or dependency mutation occurred.

## Acceptance ledger

- [x] Q1: Candidate, tree, parent, semantic correction, amendment, and referenced receipts are immutable and byte-verifiable.
  CHECK: test "$(git show -s --format=%H a352d7b6c8e7dbff0bea08ed113a58c51ac0632b)" = "a352d7b6c8e7dbff0bea08ed113a58c51ac0632b" && test "$(git show -s --format=%T a352d7b6c8e7dbff0bea08ed113a58c51ac0632b)" = "34de27a7871a31e23741222557261f36183d770c" && test "$(git show -s --format=%P a352d7b6c8e7dbff0bea08ed113a58c51ac0632b)" = "fe21789662a6dd6ec90a4f4ac48356df13c0f710" && test "$(git show -s --format=%T fe21789662a6dd6ec90a4f4ac48356df13c0f710)" = "6835eaecd4067ba748feeabe0dad9ab5b0d2eac5" && echo Q1_PASS
  EXPECT: exact candidate and semantic ancestry are fixed.
  EVIDENCE: command returned `Q1_PASS`; the four document hashes above were independently measured.

- [x] Q2: Only the authorized four Builder paths differ from the Planner amendment; this QA changes only this report.
  CHECK: test -z "$(git diff --name-only d30910634ebf133eb400b709caa4bc9df3f1cefa..a352d7b6c8e7dbff0bea08ed113a58c51ac0632b -- | rg -v '^(api/index\.mjs|server/stable-host\.test\.mjs|GATES_PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION\.md|docs/PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION_BUILDER_RECEIPT\.md)$')" && echo Q2_PASS
  EXPECT: Builder scope is exactly four paths and QA adds one report only.
  EVIDENCE: command returned `Q2_PASS`; Builder diff is 172 insertions and 170 deletions over exactly four paths.

- [x] Q3: Remotely reachable URL, query, method, header, auth, Origin/CSRF, body-byte, JSON, cap, UTF-8, and allowlist boundaries independently pass.
  CHECK: node --test server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/stable-host.test.mjs
  EXPECT: all focused API, hosted, and stable-host boundary tests pass.
  EVIDENCE: 86/86 PASS, including raw alias separators, controls and invalid percent encoding; Vercel catch-all mapping; exact method/path allowlist; server-derived owner/viewer authority; companion ambient-auth removal; exact raw-byte cap; malformed UTF-8; duplicate/forbidden JSON keys; and private `no-store`.

- [x] Q4: A valid trusted platform iterator works; ordinary create, read, reject, early-close, and cleanup failures settle finitely with private `no-store` and zero retry.
  CHECK: node --test --test-name-pattern='trusted runtime iterator|ordinary platform iterator failure' server/stable-host.test.mjs
  EXPECT: both trusted-runtime iterator cases pass without reflective callable or Promise inspection.
  EVIDENCE: 2/2 PASS. A metadata-renamed normal iterator consumed exactly one chunk; creation throw, `next` throw, `next` rejection, cleanup throw, invalid early close, and cap early close each settled to the finite private response. Each failure invocation was single-shot and the collector has no retry path.

- [x] Q5: Primitive strings and genuine Buffers preserve exact bytes; unsupported chunk objects fail without generic coercion.
  CHECK: node --test --test-name-pattern='reachable HTTP body chunks|genuine multi-chunk' server/stable-host.test.mjs
  EXPECT: exact byte inputs pass and unsupported objects fail without caller coercion.
  EVIDENCE: 2/2 PASS. Primitive-string and genuine-Buffer multi-chunk input preserved ` {"value":1} ` byte-for-byte; getter-bearing object, thenable, typed array, ArrayBuffer, boxed string, plain object, and Symbol were rejected with coercion hits 0 and iterator cleanup once.

- [x] Q6: Default-off, server-derived owner authority, companion ambient-auth separation, private error brands, database-port data handling, and regression checks pass.
  CHECK: node --test server/*.test.mjs && ./node_modules/.bin/vitest run && npm run build
  EXPECT: complete Node, frontend, and production build regressions pass.
  EVIDENCE: full Node 270/270 PASS; broader bridge/Postgres/operations/account selection 167/167 PASS; frontend 89/89 across five files PASS; TypeScript and Vite production build PASS with 1,652 modules transformed.

- [x] Q7: Security, public/private, mutation, runbook, scope, client-environment, diff, and trusted-runtime residual-risk boundaries are explicit and verified.
  CHECK: npm run test:security && npm run test:public && npm run check:mutations && npm run check:scope && npm run check:runbook && npm run check:public-boundary && npm run test:client-env-boundary && git diff --check d30910634ebf133eb400b709caa4bc9df3f1cefa..a352d7b6c8e7dbff0bea08ed113a58c51ac0632b
  EXPECT: all boundary checks pass without claiming protection after trusted-process compromise.
  EVIDENCE: security 54/54, public mode 4/4, local mutations 32/32=405, API read-only 28/28, scope 47 files, runbook PASS, local prohibited identifiers 0, client-environment leaks 0/6, and diff check PASS. Proxy/accessor-substituted request objects, monkey-patched Promise/intrinsics, malicious dependencies, and arbitrary backend execution remain explicit trusted-runtime compromise residual risks; trap-count zero is not claimed for them.

- [x] Q8: External mutation is zero; O2, Phase 3 progress, QA/Audit/Cherry/release, and external completion remain open.
  EVIDENCE: provider/account/project/billing/Supabase/database/migration/credential/environment/network/browser/session/deploy/push/release mutations were all 0. O2 remains `OPEN/LOCKED`; Phase 3 promoted evidence remains `17/43`; fresh Release Audit and Cherry acceptance remain open; `EXTERNAL_OUTCOME_COMPLETE=false`.

## Independent findings

No release-blocking defect was found within the amended reachable-HTTP threat model. The correction is materially simpler than the failed reflective collector: it uses the trusted platform iterator inside a total collection boundary, accepts only primitive strings and genuine Buffers, preserves exact byte accounting, and relies on the language's iterator-close semantics for abrupt completion. The focused tests independently demonstrate valid iterator compatibility and finite ordinary fault handling.

The tests that intentionally replace the request object, iterator machinery, Promise implementation, intrinsics, dependencies, or backend code are characterization probes for the accepted trusted-runtime compromise class. They are not evidence that a remote HTTP client can supply those objects, and this QA does not promote them as reachable-input guarantees.

## Verdict

`PASS_INDEPENDENT_QA_ONLY`

This verdict applies only to candidate `a352d7b6c8e7dbff0bea08ed113a58c51ac0632b`, tree `34de27a7871a31e23741222557261f36183d770c`, under the pinned trusted-runtime amendment. It returns the exact candidate to a separate fresh Release Audit. It is not Release Audit PASS, hosted activation, database parity, O2 evidence, Phase 3 advancement, Cherry acceptance, deployment, push, release, or external completion.

## ABANDON

**ABANDON:** Supabase provisioning, billing, driver installation, database connection, credential/environment binding, hosted activation, O2 closure, progress advancement, Release Audit, Cherry acceptance, deploy, push, release, and external completion were outside this read-only QA authority and remain open.
