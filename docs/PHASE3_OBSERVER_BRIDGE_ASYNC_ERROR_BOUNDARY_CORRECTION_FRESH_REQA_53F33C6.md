# Phase 3 Observer Bridge · Async Error Boundary Correction Fresh Independent Re-QA

Verdict: **FAIL**

Observed: 2026-08-27 KST

The exact correction carrier fails fresh independent re-QA. The original Release Audit counterexamples are contained, but the corrected classifier still grants a privileged known-code mapping to a prototype-spoofed native `Error`. A second decorated genuine error carrying an own symbol also receives the specific mapping despite the required hostile-symbol rejection boundary. Both forms reproduce through every endpoint, synchronously and asynchronously, at the direct API and stable-host boundaries.

## Independence, pin, and allowed mutation

- role: fresh independent OUTCOME re-QA, separate from Builder, prior QA, and failed Release Audit
- worktree: new detached worktree at the exact correction carrier; clean before review
- correction carrier: `53f33c6561d4d344153f23e653a6719c082f432c`
- carrier tree: `6a4c5bd6a992c39ae83b855f01c36256678c0a63`
- carrier parent / semantic correction: `ccbe6b0a4dfaff2f3ca012166355d212accbff58`
- semantic tree: `c96dbf0f9f547a12c9ce27322e6e0a99744b6aec`
- semantic parent / exact Release Audit FAIL: `c6456d73013b027b1f992ea4a1ad8914e9983618`
- FAIL tree: `b8c1efb8edaa383d42f5703f6fd50a45e7ea2118`
- report-only repository mutation: this new report, exactly one path
- product source, tests, Gate, prior reports, package, lock, migration, environment, deployment configuration, and runtime mutation: `0`
- network, Supabase, provider, account, project, billing, database, migration, credential, environment, browser, session, push, deploy, release, and external mutation: `0`

Rehashed bytes:

- correction receipt SHA-256: `774ae9dd0f5fe44b6f84cef0a8b9dcb09a978d8f514f234de6075aa2812a62c3`
- prior QA report SHA-256: `5b526c23c8768877b56b615256817499d6d7aaf5d3f1a945c6e9641aaf321cc7`
- prior Release Audit FAIL SHA-256: `8f4ac1d99420ddc8a73cacfda122b02051615c7fd2ce4ecafae1aaa655fa03c8`

The candidate differs from the exact FAIL carrier in exactly six allowed paths: the correction Gate, API implementation and test, stable-host implementation and test, and Builder receipt. `git diff --check` passes. The supplied carrier, semantic, parent, tree, and document-hash claims all match Git objects and bytes.

## Reproduced blocker

### RQF-1 · prototype-spoofed native Error receives specific authority

Severity: release-blocking security and error-boundary defect.

Minimal reproduction:

```js
const forged = new Error('raw identifier')
Object.setPrototypeOf(forged, HostedObserverBridgeError.prototype)
Object.defineProperty(forged, 'code', { value: 'rate_limited', enumerable: true })
throw forged
```

Node reports this object as a native Error, its prototype is exactly `HostedObserverBridgeError.prototype`, and it owns a primitive known `code`. It therefore satisfies every current `safeHostedErrorCode` check without having been constructed as a `HostedObserverBridgeError`.

- expected: `503 {"error":"bridge_unavailable"}` because the rejection reason is forged/prototype-spoofed and must receive no privileged or specific mapping
- actual: `429 {"error":"rate_limited"}`
- scope: `24/24` failures across six endpoints × sync/async × direct API/stable-host
- invocation: exactly one per case
- retry: `0`
- outward raw message, stack, identifier, or Promise body: `0` in the finite response
- impact: the classifier is still structural/forgeable authority. Stable-host cannot repair it because the API fulfills with `429`; its residual-rejection catch is never entered.

The current use of `isNativeError`, exact prototype equality, and one own data `code` descriptor is not an unforgeable brand. Builder must introduce a non-forgeable construction identity or otherwise remove specific mapping authority from arbitrary operation rejection values, then prove that a native Error with reassigned prototype and a fully mimicked own-property shape remains generic `503`.

### RQF-2 · hostile symbol decoration is not rejected

A genuine `HostedObserverBridgeError('rate_limited')` with an additional own symbol data property also returns `429 rate_limited`.

- expected under the requested hostile-symbol and exact-shape boundary: generic `503`
- actual: specific `429`
- scope: `24/24` failures across six endpoints × sync/async × direct API/stable-host
- symbol getter or coercion execution: `0`

This shows the classifier does not validate an exact own-property shape. If decorated genuine errors are intentionally authorized, the contract and Gate must state that exception explicitly; the current re-QA brief requires symbols to be hostile and unknown.

Fix owner: Builder. Add both forms to the API and stable-host matrices, including all six endpoints, sync/async, one invocation, retry `0`, unhandled `0`, and generic `503`. Fresh re-QA and a separate fresh Release Audit remain required after a new immutable correction.

## Independent hostile matrix

An independent temporary harness, absent from the candidate and report commit, exercised:

- layers: direct API and stable-host, independently
- endpoints: projection, enroll, complete, revoke, rotate, events (`6/6`)
- settlement modes: synchronous and asynchronous
- rejection classes: individual `getPrototypeOf`, `ownKeys`, `getOwnPropertyDescriptor`, and `get` Proxy traps; revoked Proxy; throwing `code` accessor; plain, inherited, native-Error, exact-prototype and prototype-spoofed forgeries; subclass and class constructor; Symbol; cycle; hostile `toString`, `valueOf`, `util.inspect.custom`, and `then`; unknown genuine code; symbol-decorated genuine error
- safe mappings: all `14` fixed codes for every layer, endpoint, and settlement mode

Measured result:

- total harness assertions/checks: `2,066`
- selected operation invocations: `792`
- success responses: `24/24` finite and non-Promise
- genuine fixed-code mappings: `336/336` exact
- hostile rejection combinations: `384/432` generic `503`; `48/432` FAIL as RQF-1/RQF-2
- hostile Proxy/accessor/coercion/inspect/then trap hits: `0`
- retries: `0`
- unhandled rejection events: `0`
- raw message, stack, identifier, Promise, or rejection-reason disclosure in returned bodies: `0`

The exact prior Audit counterexamples pass `2/2`: the throwing `getPrototypeOf` Proxy and throwing `code` accessor both settle as finite generic `503`. The expanded non-spoof hostile cases also settle finitely. Those passes do not cure the two specific-authority counterexamples.

## Boundary and regression matrix

| Check | Fresh result |
|---|---:|
| exact Audit plus existing hostile/safe-classifier focused API | `4/4` PASS |
| stable-host residual rejection plus private no-store focused | `2/2` PASS |
| bridge/account targeted | `120/120` PASS |
| full server Node | `241/241` PASS |
| frontend | `89/89` PASS across `5/5` files |
| production build | PASS; TypeScript + Vite, `1,652` modules |
| security Node/static boundary | `41/41` PASS; prohibited snapshot disclosures `0`; Gate evidence fields `0`; Git metadata leaks `0`; sealed payload leaks `0/6` |
| public mode | `4/4` PASS |
| local mutation | `32/32` exact `405`; API JSON `28/28`; empty page boundary `0/4` |
| scope | PASS; `47` product/runtime/test files |
| runbook | PASS |
| candidate Gate checker | `7/7` mechanically met |
| candidate diff | six allowed paths; `git diff --check` PASS |
| independent hostile authority matrix | **FAIL; `48/432` specific mappings** |

The targeted suites rechecked raw path aliases and Vercel catch-all mapping, raw byte preservation, UTF-8 and duplicate-key parsing, body caps, exact method/path allowlists, server auth, owner origin/CSRF, client authority injection, companion ambient-auth removal, private no-store, unknown-route non-enumeration, public/account separation, runtime selection, and default-disabled behavior. Default construction remains disabled without explicit named flags, account runtime, and injected bridge factory. Candidate package/dependency/driver/migration/environment changes are `0`, and no database or external runtime was contacted.

`npm run check:public-boundary` was not executed because it starts a browser and the re-QA authority explicitly forbids browser/session operations. No browser result is inferred. Its non-browser static/build/privacy components were covered by the passing security, snapshot, client-environment, public-mode, mutation, no-store, and build checks.

## Verdict, rollback, and locked boundaries

`FAIL`

The mechanically met candidate Gate is insufficient because its hostile corpus omitted prototype-spoofed native Error identity and symbol decoration. This report is independent QA evidence only. It grants no Release Audit eligibility, Cherry acceptance, O2 evidence, Phase 3 progress, Supabase/provider/database authority, deployment, release, or external completion.

- rollback: revert only this report carrier to return exactly to correction carrier `53f33c6561d4d344153f23e653a6719c082f432c`; external rollback is unnecessary
- O2: `OPEN/LOCKED`
- Phase 3: `17/43`
- `EXTERNAL_OUTCOME_COMPLETE=false`
- false completion count: `4` — existing tests PASS is not hostile-authority PASS; Gate `7/7` is not re-QA PASS; finite response is not correct authorization; re-QA is not Release Audit or Cherry acceptance
