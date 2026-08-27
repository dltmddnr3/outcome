# Phase 3 Observer Bridge · Private Error Factory Correction Builder Receipt

Terminal: `BUILDER_CORRECTION_CANDIDATE_READY_ONLY`

## Immutable identity

- QA FAIL carrier: `02ba0ab894311708f937f91603134326440d1325`
- source tree: `88a6330f6b24ebb662bfc40c87fabf124f228479`
- source parent: `6e2c4ea6002c8113f153b2fd0e734a9f0b134e72`
- QA report SHA-256: `92c9c137016afcae1d9b158063d51d0073719f5b896f58f14a98627013663464`
- semantic correction: `49fc99533546b1d350b6fde0a829101f79e51544`
- semantic tree: `72e57517241d0e74fbacc46c585bf5f621aeafaa`
- semantic parent: `02ba0ab894311708f937f91603134326440d1325`

The source QA FAIL report and all earlier Builder, QA, and Audit evidence remain byte-identical.

## Root correction

The exported `HostedObserverBridgeError` remains available for compatibility, but public construction never grants response-code authority. Only the hosted module's unexported `fail(code)` passes an identity-only private token and registers the new instance in the private brand/code stores. The token is not exported, serialized, reflected, or attached to an instance.

The API no longer constructs public hosted errors for parsing, body-cap, materialization, or CSRF failures. It uses a separate module-private WeakMap and private fail helper for exactly `bad_request`, `body_too_large`, and `csrf_invalid`. `errorResponse` checks that private API identity first, then the total hosted classifier, otherwise returns finite generic 503. The injected domain-error pass-through was also changed from untrusted `.code` access to a total fixed-code own-data-descriptor classifier. Unguarded hosted `instanceof`/error-code accessor hits are zero.

`api/index.mjs`, the stable-host implementation, packages, migrations, runtime configuration, and UI are unchanged. The stable-host residual catch remains in place.

## RED and GREEN evidence

- RED: 0/3; classifier, direct API, and stable host all exposed 429 for QA hostile construction before the correction.
- GREEN: 3/3.
- Exact QA hostile matrix: 5 constructors x 6 endpoints x sync/async x direct/stable = 120/120 generic 503; calls 120, retries 0.
- Public constructor matrix: all 14 finite-code strings are generic under direct/Reflect and API/stable rejection paths.
- Genuine private hosted paths: five directly captured operational failures (`unavailable`, `input_invalid`, `access_denied`, `auth_unavailable`, `enrollment_invalid`) retain mapping across 6 endpoints x sync/async x 2 request layers = 120/120.
- Existing enrollment, conflict, signature, sequence, rate, lifecycle, and atomicity operation tests remain PASS in the hosted and targeted suites.
- Private API mapping: bad request/body cap/CSRF = 400/400/403; public construction of the same strings = generic 503.
- Prior hostile matrix: 432/432 remains generic.
- Authority exports, token instance fields, traps, retries, unhandled rejections, raw-error/stack/identifier disclosures: 0.

## Regression evidence

- focused hosted/API/stable: 77/77 PASS.
- targeted bridge/hosted/Postgres/operations/account: 140/140 PASS.
- full Node: PASS, 261/261.
- full frontend: PASS, 89/89 across 5 files.
- build: PASS, TypeScript plus Vite, 1,652 modules transformed.
- security/public/mutation/scope/runbook/boundary/diff: PASS; security 48/48, public 4/4, local mutation 32/32 and API read-only 28/28, scope 47 files, public prohibited identifiers 0, diff errors 0.
- Gate: 7/7 executable checks PASS after this carrier.

## Scope and mutation ledger

- changed paths: exactly five allowed source/test paths, the correction Gate, and this receipt.
- external mutations: 0.
- Supabase/provider/account/project/billing/database/migration/credential/env/network/browser/session mutations: 0.
- deploy/push/release/public message: 0.
- O2: OPEN/LOCKED.
- Phase 3: 17/43.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## Rollback

Revert the receipt carrier, then revert semantic correction `49fc99533546b1d350b6fde0a829101f79e51544`. This restores exact QA FAIL carrier `02ba0ab894311708f937f91603134326440d1325`; no external rollback is necessary because external mutation count is zero.

## Open boundaries

Fresh independent QA and fresh Release Audit remain required. Database parity, hosted activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, and external completion remain open and unauthorized.

## False completion and learning receipt

`false_completion_count=10`

1. Builder correction GREEN is not fresh QA PASS.
2. Fresh QA PASS would not be Release Audit PASS.
3. Release Audit PASS would not be Cherry acceptance.
4. A private error identity is not authentication or authorization.
5. Finite error mapping is not successful persistence.
6. Local Postgres-compatible tests are not a hosted database.
7. Disabled runtime code is not activation.
8. A commit is not deploy, push, release, or external completion.
9. O2 remains OPEN/LOCKED and Phase 3 remains 17/43.
10. `EXTERNAL_OUTCOME_COMPLETE` remains false.

Learning: constructor shape and `new.target` cannot establish module provenance because Proxy and bound construction can normalize those observations. Response authority must originate from an unexported identity held only by the failure-producing module. Parser failures require a separate private identity so public compatibility types never become authority tokens.
