# Phase 3 Observer Bridge · Async Persistence Seam Fresh Release Audit

Verdict: **FAIL**

Observed: 2026-08-27 KST

The exact QA carrier fails this fresh, independent Release Audit. A hostile asynchronous rejection can make the supposedly finite bridge boundary reject outward instead of returning `503 {"error":"bridge_unavailable"}`. The same rejection reaches the stable-host and Vercel call chain without an enclosing catch. This is a release-blocking error-containment and privacy defect; passing Builder and QA evidence does not override the counterexample.

## Audit binding and independence

- job profile: `lime-release-qa`, with bounded `lime-security-privacy-auditor` review
- worktree: fresh, detached at the exact QA carrier, clean at audit start
- Builder or QA worktree reused: no
- candidate source, test, Gate, Builder receipt, QA report, and prior audit mutations: `0`
- permitted repository mutation: this report only
- external mutation count: `0`
- browser, session, network, provider, Supabase, account, project, billing, database, migration, credential, environment, push, deploy, release, and public-message operations: `0`
- skill SHA-256:
  - `whitecastle-execution-core`: `91a23d99281a6db1c10561deb6f9c7325bfaf09d02a680760c1894f9d6d47799`
  - `lime-release-auditor`: `f9e7987f23171a60dad542a04936f4c86e369fcd5c5bc1f11f8164a0a8df1e0d`
  - `lime-security-privacy-auditor`: `6e71d1f31367e2fe70d6d06edec4363dc39726e78a5a577ed4cdef4632b851c4`
  - `karpathy-guidelines`: `6e22cc54cb02a5e98ae42d06d9d7292db0c1b43894831b32879beb0166b2aea7`
  - `unlazy`: `4a5a82879785f77a5a1b35558ace1f48c21662914abe94167e20a636f6cf25fc`

## Commit pin and evidence graph

The supplied identities were treated as claims and independently re-read from Git objects and bytes.

| Role | Commit | Tree | Direct parent | Exact change |
|---|---|---|---|---|
| QA carrier | `2c96c3d87082d96fbfaeb2aca10887dc946ca07a` | `001e168cf6c43914684a398bbafe34ca0a65e88a` | `f3badeec4fa45aa77368316a0dd690d2a5f75da2` | one new QA report |
| Builder carrier | `f3badeec4fa45aa77368316a0dd690d2a5f75da2` | `479b6b8ca28c6db6ac8e4de06e4c7332d21d70fa` | `84d56664bad5e565f5320e3a0c80ed1f4d45f7f4` | Gate evidence plus one Builder receipt |
| semantic candidate | `84d56664bad5e565f5320e3a0c80ed1f4d45f7f4` | `479d69eda14e46b16bc1e4219c3cb1942bfec19b` | `f9e441cb20b78d32136b60cbe2a3f522fd9aac73` | one Gate and four source/test paths |
| source / prior Audit | `f9e441cb20b78d32136b60cbe2a3f522fd9aac73` | `9544fca8b8a381574d6affa647e17eb7c8710eec` | `6b93799b95d5bda87ac028d83b9fadcc44494a83` | prior disabled-runtime Release Audit report |

Rehashed evidence:

- QA report SHA-256: `5b526c23c8768877b56b615256817499d6d7aaf5d3f1a945c6e9641aaf321cc7`
- Builder receipt SHA-256: `032b7200a1027fcc6f1c8023095a6d8e934eb62a08660a03c39616b84ad395f5`
- prior Release Audit report SHA-256: `81625d492f583ce5876c5712f7d0ebc7424cfaf897d0245191f6511bf4b30240`

The chain is linear. Source to QA carrier changes exactly seven paths: one Gate, two production files, two test files, the Builder receipt, and the QA report. Package, lock, dependency, migration, Supabase, environment, and deployment configuration path changes are `0`. `git diff --check` passes.

## Release-blocking regression

### RA-1 · hostile rejection reason escapes the finite API boundary

`handleHostedObserverBridgeRequest` catches the awaited operation and delegates the rejection reason to `errorResponse`. That function first evaluates:

```js
error instanceof HostedObserverBridgeError
```

and later reads `error.code` without guarding either operation. Both are caller-influenced because a bridge Promise may reject with any JavaScript value.

Independent exact-candidate probes produced two counterexamples:

1. A rejected Proxy whose `getPrototypeOf` trap throws caused `instanceof` to throw. Observed terminal output: `ESCAPED_REJECTION private getPrototypeOf stack`; process exit `7`.
2. A rejected `HostedObserverBridgeError` whose own `code` accessor throws caused status mapping to throw. Observed terminal output: `ESCAPED_CODE_ACCESSOR private code accessor stack`; process exit `8`.

Expected in both cases: a fulfilled finite response equal to `503 {"error":"bridge_unavailable"}`. Actual: the API Promise rejects outward with the hostile raw error. `createStableHostRequestHandler` uses `return await handleHostedObserverBridgeRequest(...)` without a catch, and the Vercel default handler uses `await hostedRequest(...)` without a catch. Therefore the rejection can cross the application boundary, become platform error/log material, and produce no finite public response.

Impact:

- finite known/unknown rejection mapping is false for hostile rejection values;
- zero raw error/stack leakage cannot be established;
- the hostile-accessor requirement is not met;
- the existing `4/4` focused test and `13/13` QA probe are incomplete because they cover a throwing Promise-result `then` accessor and plain rejected objects, but not hostile behavior during rejection classification;
- one-call/no-retry remains true in the reproductions, but it is insufficient for release because containment fails after the one invocation.

Required correction boundary: make error classification and safe-code extraction non-throwing for arbitrary rejection values, add focused RED/GREEN cases for a throwing-prototype Proxy and a throwing `code` accessor, retain one invocation/retry `0`, and return a new immutable Builder carrier for fresh QA and fresh Release Audit. This report does not prescribe a broader refactor.

## Promise and call-site matrix

- exactly six awaited operation sites remain: `read`, two `createEnrollment` routes, `completeEnrollment`, `revokeSource`, and `ingest`;
- repository inventory contains exactly three non-document/Gate files referencing `handleHostedObserverBridgeRequest`: implementation, explicitly awaited production caller, and async test harness;
- sync/async success contract: `12/12` cases pass with finite settled bodies;
- ordinary known/unknown sync throw and async rejection mapping: `24/24` cases pass;
- independent thenable/multiple-settlement/delayed-plain-rejection probe: `13/13` passes, selected invocation `1`, retry `0`, unhandled rejection events `0`;
- hostile rejection-classification probes: `0/2` pass; both reject outward;
- Promise-valued response body in the passing matrices: `0`;
- release conclusion: API compatibility is preserved for ordinary results but not for the required hostile rejection domain.

## Threat model and security/privacy payload

### Threat model

- assets: owner/viewer authorization, private bridge projection and lifecycle state, raw request bytes, companion signatures, identifiers, error/stack material, and server environment
- entry points: raw stable-host target, private query/body/header boundary, authenticated bridge operation callbacks, Promise/thenable settlement and rejection classification, runtime factory selection
- attacker goals: normalize a hostile route, spoof authority, smuggle ambient credentials, exceed parser limits, invoke a selected operation twice, force retry after uncertain completion, or cause raw rejection detail to escape
- trust boundaries: raw target before parsing, exact path/method allowlist, raw byte cap and JSON materialization, owner CSRF and server authentication, companion credential stripping, operation Promise boundary, finite error mapping, private no-store response boundary

### Authz and abuse cases

The unchanged ordering passes an independent `11/11` targeted security set: raw path aliases and Vercel mapping, server-auth spoof denial, companion ambient-auth removal, raw byte preservation, exact allowlist, private no-store, owner origin/CSRF, Proxy/accessor body denial, forbidden/pollution key denial, and malformed/duplicate/raw-byte parser denial. The bridge/store is not reached by those covered pre-operation failures.

The hostile rejection reason is a separate post-operation abuse case and fails. It does not cause a second bridge invocation or retry, but it escapes finite response construction.

### RLS, retention, deletion/export, and privacy

- local Postgres tests continue to pass forced RLS, least grants, anonymous/cross-workspace/write denial, parameterized SQL, transactional CAS, and privacy-minimal serialization;
- operations tests continue to pass count-only tombstones, raw-scope purge, no resurrection on restore, revision-bound export, revocation, expiry, rate, and cost boundaries;
- the candidate does not connect to or mutate a managed database; managed Supabase parity and hosted retention/deletion/export remain unproven;
- secret/dependency/environment changes are `0`, and client boundary checks report Git metadata leaks `0`, sealed payload leaks `0/6`, and prohibited stable-snapshot disclosures `0`;
- privacy verdict: FAIL because arbitrary rejection classification can expose raw error/stack material beyond the finite application response boundary.

Security/privacy quality score: `84/100` (below the required threshold because RA-1 is release-blocking).

## Independent test matrix

All generating checks ran in an exact `git archive` execution copy with the existing pinned dependency tree. The detached candidate worktree remained report-only.

| Matrix | Independent result |
|---|---:|
| focused async seam | `4/4` PASS |
| bridge API + stable host | `33/33` PASS |
| bridge/account targeted | `115/115` PASS |
| ordering/security target set | `11/11` PASS |
| independent ordinary hostile async probe | `13/13` PASS |
| hostile rejection-classification probes | **`0/2` FAIL** |
| full server Node | `236/236` PASS |
| frontend | `89/89` PASS across `5/5` files |
| production build | PASS; TypeScript + Vite, `1,652` modules |
| security Node matrix | `40/40` PASS |
| public mode | `4/4` PASS |
| local mutation matrix | `32/32` exact `405`; API JSON `28/28`; empty page boundary `0/4` |
| stable snapshot | projects `2`; prohibited disclosures `0`; Gate evidence fields `0` |
| client environment | Git metadata leaks `0`; sealed payload leaks `0/6`; Clerk markers `3`; assets `2` |
| scope | PASS; `47` product/runtime/test files |
| runbook | PASS |
| Gates | prior wiring `9/9`, raw-target correction `6/6`, async seam `7/7` all mechanically met |
| `git diff --check` | PASS |

The browser-rendered public-boundary script was not run because this audit authority explicitly forbids browser/session operations. No browser result is inferred. Proportional non-browser boundary evidence is provided by the static/build client scan, stable-snapshot validator, public-mode suite, mutation matrix, no-store tests, and unchanged public production diff.

Accessibility: `N/A` for the semantic change because it adds no UI, style, copy, interaction, or accessibility surface; the unchanged frontend passes `89/89`. Regressions: one release-blocking server error-containment/privacy regression, RA-1. Residual unknowns inside the authorized local candidate: `[]`; the defect is reproduced, not unknown.

Release quality score: `82/100` (below threshold because a required hostile rejection class escapes the API boundary).

## Runtime, release scope, and rollback truth

- default production construction remains `createStableHostRequestHandler({ logger: console })`, with no injected bridge factory;
- both named bridge capabilities default false; runtime selection additionally requires an explicit factory and a valid authenticated account runtime;
- new factory, adapter, driver, connection, environment name, dependency, lock, migration, or configuration added by this candidate: `0`;
- timeout, cancellation, uncertain-completion reconciliation, and retry policy added: `0`;
- async compatibility is not a database connection, Supabase parity, hosted activation, O2 evidence, Phase 3 progress, deployment, release, or external completion;
- O2 remains `OPEN/LOCKED`; durable additive evidence keeps Phase 3 incomplete at `17/43`; older Contract/Map projection lag is not reconciled here; `EXTERNAL_OUTCOME_COMPLETE=false`;
- mechanical reverse-order rollback of QA carrier, Builder carrier, and semantic candidate produced tree `9544fca8b8a381574d6affa647e17eb7c8710eec`, exactly the source tree;
- no external rollback is required because runtime activation and external mutations are `0`.

## Verdict and handoff

`FAIL`

This verdict applies to the exact QA carrier only. It does not authorize activation, Cherry acceptance, O2 evidence, progress change, Supabase/provider/database work, deploy, release, or any external mutation. Handoff recipient: OUTCOME Planner, who may issue a narrowly pinned Builder correction for RA-1. Any correction requires a new immutable receipt, fresh independent QA, and a separate fresh Release Audit.
