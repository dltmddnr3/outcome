# Phase 3 Observer Bridge · Async Error Brand Correction Fresh Independent QA

Verdict: **FAIL**

Observed: 2026-08-27 KST

The exact correction carrier fails fresh independent QA. The new module-private `WeakSet`/`WeakMap` rejects the previously reported prototype spoof, descriptor copies, structured clones, ordinary subclasses, altered prototypes, decorations, accessors, overwrites, deletion, seal/freeze, proxies, revoked proxies, and cross-realm spoofs. It does not, however, prove exact-class construction: `Reflect.construct` can execute the branded constructor with an alternate `newTarget` whose prototype is the exact exported prototype. That object acquires both private brand entries and the exact current descriptor shape, then receives the privileged fixed `429 rate_limited` mapping through every direct-API and stable-host endpoint in both settlement modes.

## Independence, pin, and immutable evidence

- role: new fresh independent OUTCOME QA, separate from Builder and all previous QA/Audit
- worktree: fresh local shared clone, detached at the exact carrier and clean before review
- carrier: `e10fe0f463303721ebe6e763c6964135a0e7defc`
- carrier tree: `5ce3226ac174a64852fc16285c63b3b57593496d`
- semantic correction / carrier parent: `219c33fa8905e18ab3ef1c9dec817eab3f79a78f`
- semantic tree: `4d2176af6593a08d33d75c68cd755c7ed466a28c`
- semantic parent / prior re-QA FAIL carrier: `c63256a64799b5aa453e76a6d29cd9fc9d623fcf`
- prior FAIL tree: `d8ffcc1441f4d592f9d1338dbd5fe09442559e01`
- Builder receipt SHA-256: `b2cb69027fe3638644473dfd1456c3f6aab3d44b4591163772fb877de5f81bd4`
- prior FAIL report SHA-256: `206e9ab43b2b190e612d183dd7bb506f337d21f33685fc1453651c6cd3b623eb`
- carrier diff from the prior FAIL: exactly seven paths; `git diff --check` passes
- allowed repository mutation: this report only; product source, tests, Gate, package, lock, migration, environment, and deployment configuration edits: `0`

## QA-ABF-1 · alternate `newTarget` acquires exact-class mapping authority

Severity: release-blocking error-boundary and brand-authority defect.

Minimal reproduction:

```js
function AlternateNewTarget() {}
AlternateNewTarget.prototype = HostedObserverBridgeError.prototype

const forgedConstruction = Reflect.construct(
  HostedObserverBridgeError,
  ['rate_limited'],
  AlternateNewTarget,
)
```

The alternate constructor is not `HostedObserverBridgeError`, yet the base constructor brands the resulting object unconditionally. Because its prototype is the exact exported `HostedObserverBridgeError.prototype`, it also satisfies the prototype and exact-descriptor checks.

- classifier expected: `null`
- classifier actual: `rate_limited`
- HTTP expected: `503 {"error":"bridge_unavailable"}`
- HTTP actual: `429 {"error":"rate_limited"}`
- direct API: `12/12` unexpected specific mappings across six endpoints × sync/async
- stable host: `12/12` unexpected specific mappings across six endpoints × sync/async
- selected operation invocations: `24`; one per case
- retries: `0`
- unhandled rejection events: `0`
- trap/getter/coercion/serialization execution: `0`
- raw reason/detail/stack disclosure: `0`

Impact: the private identity store is unforgeable only after admission, but admission is not restricted to exact-class construction. Any module consumer able to import the exported class and prototype can mint a specifically mapped branded object without invoking it with the exact class as `newTarget`. This contradicts the Gate outcome that only genuinely constructed exact-class instances retain fixed known response authority.

Fix owner: Builder. Restrict brand admission to exact `new.target === HostedObserverBridgeError` (or an equivalently non-forgeable exact-construction condition), retain generic handling for alternate `newTarget` and subclasses, and add classifier plus six-endpoint API/stable-host sync/async regression cases. A new immutable correction requires fresh independent re-QA and separate fresh Release Audit.

## Independent hostile matrix

An independent temporary harness, absent from this commit, rechecked additional construction and copy paths:

- `Object.create(HostedObserverBridgeError.prototype)`: generic / classifier `null`
- copied genuine descriptors on an exact-prototype object: generic / classifier `null`
- structured clone rebuilt to the exact exported prototype and descriptor shape: generic / classifier `null`
- cross-realm native `Error` rebuilt to the exact exported prototype and descriptor shape: generic / classifier `null`
- alternate `newTarget` with the exact exported prototype: **FAIL**, classifier `rate_limited`

The candidate's own hostile matrices also pass for native-Error prototype spoof, ordinary subclass, currently altered prototype, symbol/string decoration, code accessor/overwrite/delete, name/message/stack mutation, seal/freeze, ordinary/revoked/trapping proxies, cross-realm spoof, unknown code, and cycles. Genuine instances of all `14` finite codes retain their existing mappings in the candidate suite.

## Regression and boundary evidence

- focused branded/error-boundary tests: `15/15` pass
- bridge/hosted/account targeted Node: `128/128` pass
- full Node: `249/249` pass
- full frontend: `89/89` pass across five files
- security: `44/44` pass; stable prohibited disclosures `0`; client-environment leaks `0`
- public mode: `4/4` pass
- mutation checker unit boundaries: `3/3` pass
- build: PASS; TypeScript plus Vite, `1,652` modules
- scope: PASS, `47` product/runtime/test files
- runbook: PASS
- stable-host no-store, residual catch, raw path/parser/body/auth/CSRF/companion/default-disabled/account checks: PASS within focused and targeted suites
- Builder Gate checker: `7/7` met against the candidate's recorded checks
- `git diff --check`: PASS

The browser-backed public-boundary command and live/local HTTP mutation command were not rerun because this QA authority explicitly forbids browser and network activity. Their non-browser unit/static coverage passed, and the Builder receipt was rehashed rather than treated as fresh QA execution evidence.

## External mutation ledger and terminal boundary

- browser/network/Supabase/provider/account/project/billing/database/migration/credential/environment/session: `0`
- push/deploy/release/public message: `0`
- external mutations: `0`
- O2, Phase 3 progress, hosted activation, Cherry acceptance, deploy, release, and external completion: not claimed
- terminal: **FAIL**; return to Builder
