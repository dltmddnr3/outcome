# Phase 3 Observer Bridge · Async Error Boundary Correction Builder Receipt

Terminal: **BUILDER_ERROR_BOUNDARY_CORRECTION_READY_ONLY**

## Immutable evidence graph

- correction source / Release Audit FAIL carrier: `c6456d73013b027b1f992ea4a1ad8914e9983618`
- source tree: `b8c1efb8edaa383d42f5703f6fd50a45e7ea2118`
- source parent / QA carrier: `2c96c3d87082d96fbfaeb2aca10887dc946ca07a`
- QA carrier tree: `001e168cf6c43914684a398bbafe34ca0a65e88a`
- QA report SHA-256: `5b526c23c8768877b56b615256817499d6d7aaf5d3f1a945c6e9641aaf321cc7`
- Release Audit FAIL report SHA-256: `8f4ac1d99420ddc8a73cacfda122b02051615c7fd2ce4ecafae1aaa655fa03c8`
- semantic correction: `ccbe6b0a4dfaff2f3ca012166355d212accbff58`
- semantic tree: `c96dbf0f9f547a12c9ce27322e6e0a99744b6aec`
- semantic parent: exact FAIL carrier above
- source/report drift: 0; both QA PASS and Audit FAIL report bytes unchanged

Changed paths, exactly six:

- `server/phase3-observer-bridge-api.mjs`
- `server/phase3-observer-bridge-api.test.mjs`
- `api/index.mjs`
- `server/stable-host.test.mjs`
- `GATES_PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION.md`
- `docs/PHASE3_OBSERVER_BRIDGE_ASYNC_ERROR_BOUNDARY_CORRECTION_BUILDER_RECEIPT.md`

## Correction

- Error classification no longer evaluates `instanceof` or reads `.code` on an arbitrary rejection reason.
- A known code is accepted only after a guarded sequence proves non-Proxy native Error identity, exact `HostedObserverBridgeError` prototype, and an own data descriptor whose primitive string belongs to the fixed status map. Frozen genuine errors are supported. Forged, inherited, subclass, accessor, unknown, primitive, cyclic, revoked Proxy, and trapped values all become `503 {error:"bridge_unavailable"}`.
- Classification catches all reflection failures and never coerces, iterates, inspects, serializes, or reads an accessor from the rejection reason.
- Stable-host wraps the awaited bridge API invocation in a second finite catch. The chosen bridge operation remains one call with retry 0.
- Existing parser/auth/path/body/no-store ordering and default-disabled construction are unchanged.

## RED / GREEN evidence

RED on the exact Audit blocker before product edit:

```text
node --test --test-name-pattern='Audit hostile rejection reasons' server/phase3-observer-bridge-api.test.mjs
tests 2; pass 0; fail 2
throwing getPrototypeOf Proxy and throwing code accessor both rejected outward with hostile detail.
```

GREEN:

- exact Audit probes: 2/2 finite 503
- expanded hostile API corpus: 6 endpoints x 11 reasons = 66/66; selected operation calls 66, retry 0, trap hits 0, unhandled rejection events 0, disclosure hits 0
- safe known classification: 14 codes x sync/frozen async = 28/28; forged/adversarial forms 6/6 fail closed
- stable-host hostile matrix: 6 endpoints x 2 Audit reasons = 12/12; operation call 1 per case, retry 0
- focused API + stable-host: 38/38

## Regression evidence

- bridge/account targeted: PASS, 120/120
- full Node: PASS, 241/241
- full frontend: PASS, 89/89 across 5 files
- build: PASS, TypeScript plus Vite, 1,652 modules
- security: PASS, 41/41; stable snapshot prohibited disclosures 0; client environment leaks 0
- public: PASS, 4/4
- mutation: PASS, local 32/32 exact 405; API `read_only` JSON 28/28; page boundary 0/4
- raw hostile path matrix and Vercel catch-all preservation: PASS
- scope: PASS, 47 product/runtime/test files
- runbook: PASS
- public boundary: PASS, prohibited identifiers 0
- `git diff --check`: PASS
- Gate checker: fixed by the final receipt carrier

security/public/mutation/scope/runbook/boundary/diff: PASS

## External mutation ledger and locked boundaries

- external mutations: 0
- Supabase/network/provider/account/project/billing/database/migration/credential/environment/browser/session: 0
- push/deploy/release/public message: 0
- O2: OPEN/LOCKED
- Phase 3: 17/43
- EXTERNAL_OUTCOME_COMPLETE=false

## Rollback

Revert the receipt carrier, then revert semantic correction `ccbe6b0a4dfaff2f3ca012166355d212accbff58`. This restores exact FAIL-carrier tree `b8c1efb8edaa383d42f5703f6fd50a45e7ea2118`. External rollback is unnecessary because external mutations are zero.

## Accepted residual risk

- JavaScript object identity is not a cryptographic authority boundary; this correction limits known status mapping to the existing exact native error class shape and fixed code set, while every uncertainty maps to 503.
- No timeout, cancellation, uncertain-completion reconciliation, database driver, live connection, managed parity, or hosted activation is added or claimed.
- Fresh independent re-QA and a separate fresh Release Audit are still mandatory.

## False completion controls

false_completion_count: 8

1. Contained errors are not successful persistence.
2. Builder regression PASS is not fresh re-QA.
3. Prior QA PASS predates this correction and cannot promote it.
4. Prior Release Audit is FAIL evidence, not release approval.
5. A stable-host catch is not a timeout or uncertain-completion policy.
6. Default-disabled local code is not hosted activation or database parity.
7. O2 and Phase 3 progress remain unchanged and locked.
8. Local commits are not Cherry acceptance, deploy, push, release, or external completion.

## Learning receipt

learning_receipt: A catch block is not total when its classifier performs attacker-observable reflection. Classify arbitrary rejection reasons by rejecting Proxy values first, guarding every reflection, requiring an exact native class/prototype and own primitive data descriptor, and reducing immediately to a fixed primitive code; then add a caller-level catch so a future classifier regression still cannot cross the HTTP boundary.
