# Phase 3 Observer Bridge · Reachable HTTP Boundary Correction Builder Receipt

Terminal: `BUILDER_CORRECTION_CANDIDATE_READY_ONLY`

## Immutable identity

- Planner amendment source: `d30910634ebf133eb400b709caa4bc9df3f1cefa`
- source tree: `04e365006136263e501bde296221fca0dcd77876`
- source parent: `e02b28a277bb3837337f08e011513685690eba82`
- semantic correction: `fe21789662a6dd6ec90a4f4ac48356df13c0f710`
- semantic tree: `6835eaecd4067ba748feeabe0dad9ab5b0d2eac5`
- semantic parent: `d30910634ebf133eb400b709caa4bc9df3f1cefa`

The Planner amendment and its 6/6 executable authority Gate remain byte-identical. Earlier Builder, QA FAIL, correction, and amendment evidence is preserved.

## Correction

The stable-host collector now uses the trusted platform async iterator normally within one total collection `try/catch`. It removed the prior bounded prototype traversal, callable-name decision, manual iterator-result reflection, Proxy/Promise brand inspection, and custom cleanup machinery. Iterator creation, read, rejection, early-close, and cleanup failures settle to the existing finite private body sentinel; collection does not retry.

Only primitive string chunks and genuine Node Buffers are collected. Strings are converted directly to bytes; Buffer bytes are retained; no generic object conversion, coercion, iterator over chunk values, or JSON reserialization occurs. The 1,048,576-byte cap, invalid UTF-8 rejection in the private API parser, raw path validation before normalization, server-derived auth, companion ambient-auth separation, exact path/method allowlist, default-off runtime, private error brands, and private `no-store` behavior are unchanged.

No API/hosted implementation, package, lockfile, migration, runtime configuration, environment value, or UI changed.

## RED and GREEN evidence

- RED: 0/1. A normal iterator whose mutable function `name` contained `bound ` was falsely denied by the previous name-based decision; no chunk was consumed (`0 !== 1`).
- GREEN: 4/4 focused reachable-boundary tests PASS: metadata-independent trusted iterator, four ordinary create/read/reject/cleanup failures, seven unsupported non-byte chunk shapes with coercion hits 0, and exact multi-chunk string/Buffer bytes.
- ordinary failures: iterator creation throw, `next` throw, `next` rejection, and cleanup throw each settle finitely after one call; automatic retry count 0.
- early close: invalid and capped iteration each invokes platform cleanup once; capped collection stops after two 600,000-byte chunks.
- external values: the existing raw URL alias, invalid percent/separator/control, auth-header/cookie/Origin/CSRF, body-cap, malformed UTF-8, duplicate/forbidden JSON-key, ambient-auth separation, and finite error assertions remain in the 86/86 focused PASS.

## Regression evidence

- amendment authority Gate: 6/6 PASS.
- focused bridge API/hosted/stable: 86/86 PASS.
- targeted bridge/account: PASS, 149/149.
- full Node: PASS, 270/270.
- full frontend: PASS, 89/89 across five files.
- build: PASS, TypeScript plus Vite, 1,652 modules transformed.
- security/public/mutation/scope/runbook/boundary/diff: PASS; security 54/54, public 4/4, local mutation 32/32 and API read-only 28/28, scope 47 files, public prohibited identifiers 0, diff errors 0.
- correction Gate: 7/7 executable checks PASS after this carrier.

## Accepted residual risk

The Node/Vercel request object, its platform iterator, native Promise machinery, dependencies, and unmodified intrinsics are trusted in-process surfaces. Proxy-mutated request objects, accessor-substituted platform methods, renamed bound runtime callables, Promise monkey-patching, and arbitrary backend code execution are trusted-runtime compromise probes, not remotely reachable HTTP release claims. Ordinary iterator faults are still caught best-effort, but trap-count zero after trusted-runtime compromise is not claimed. This is the same accepted Option A residual class as full backend-process or credential compromise and requires later deployment provenance, dependency integrity, and runtime isolation controls.

## Scope and mutation ledger

- changed paths: exactly `api/index.mjs`, `server/stable-host.test.mjs`, `GATES_PHASE3_OBSERVER_BRIDGE_REACHABLE_HTTP_BOUNDARY_CORRECTION.md`, and this receipt.
- external mutations: 0.
- Supabase/provider/account/project/billing/database/migration/credential/env/network/browser/session mutations: 0.
- deploy/push/release/public message: 0.
- O2: OPEN/LOCKED.
- Phase 3: 17/43.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## Rollback

Revert this receipt carrier, then revert semantic correction `fe21789662a6dd6ec90a4f4ac48356df13c0f710`. This returns to exact Planner amendment source `d30910634ebf133eb400b709caa4bc9df3f1cefa`. External rollback is unnecessary because external mutation count is zero.

## Open boundaries

Fresh independent QA and fresh Release Audit remain required. Supabase creation, database driver and credential binding, migration, hosted adapter activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, and external completion remain open and unauthorized.

## False completion and learning receipt

`false_completion_count=10`

1. Builder GREEN is not fresh QA PASS.
2. Fresh QA PASS would not be Release Audit PASS.
3. Release Audit PASS would not be Cherry acceptance.
4. Reachable HTTP validation is not database parity.
5. A trusted iterator is not a claim against backend code execution.
6. A finite local response is not hosted activation.
7. Default-off code is not runtime wiring with credentials.
8. A commit is not deploy, push, release, or external completion.
9. O2 remains OPEN/LOCKED and Phase 3 remains 17/43.
10. `EXTERNAL_OUTCOME_COMPLETE` remains false.

Learning: security checks must follow the reachable authority boundary. Strict validation belongs on attacker-controlled URL, header, and body bytes; reflecting over trusted runtime callables and Promise internals creates brittle false denials without reducing the risk of a process that is already compromised.

## ABANDON

**ABANDON:** This receipt proves only a local Builder correction candidate. It does not prove fresh QA, Release Audit, Supabase or database parity, hosted activation, O2 evidence, Phase 3 progress, Cherry acceptance, deploy, push, release, or external completion.
