# Phase 3 Observer Bridge · Stream Body Correction Builder Receipt

Terminal: `BUILDER_CORRECTION_CANDIDATE_READY_ONLY`

## Immutable identity

- QA FAIL carrier: `ce387dc567c969652e277b3b33f38e7d245750a0`
- source tree: `24786e6ffa899caf7208a6741c89257ce0dcd069`
- source parent: `20732bb5f6f190f1d385c73223dcbe4d07815c70`
- QA report SHA-256: `4fb1d553dd3cd39c84f097fdb06726cf8329b3406c899a6d8714f990ce68a52d`
- semantic correction: `6e995f687f4baa49d34dfa6dba4959e8565a1f44`
- semantic tree: `db2f10a8d8f155c55c1f9d13df284c5f4ebef59c`
- semantic parent: `ce387dc567c969652e277b3b33f38e7d245750a0`

The source QA FAIL report and all earlier evidence remain byte-identical.

## Correction

The Vercel raw-body collector no longer uses `for await` or generic `Buffer.from(object)`. It obtains iterator and `next` methods through data descriptors across a bounded non-Proxy prototype chain, rejects accessor, Proxy, revoked, and bound functions before invocation, and manually validates each native Promise or ordinary iterator result. Result objects must contain only own data `done`/`value` fields.

Chunks are accepted only when they are primitive strings or non-Proxy genuine Node Buffers. Uint8Array, ArrayBuffer, boxed strings, generic objects, Symbols, thenables, accessors, and coercive values are invalid. Proxy requests receive immediate private 400/no-store; invalid collection becomes the existing non-object sentinel that maps to enabled private 400 or default-disabled 404. Iterator creation, `next`, Promise rejection, and cleanup failures are caught at the stable boundary. Invalid and capped streams attempt descriptor-safe early cleanup once.

No private API or hosted implementation, package, migration, configuration, or UI changed.

## RED and GREEN evidence

- exact QA RED: 0/3; getter-bearing chunk executed getter once, Proxy iterator executed apply once, and thenable chunk raised `ERR_INVALID_ARG_TYPE` outward.
- exact QA GREEN: 3/3 finite 404/no-store under the default-disabled stable boundary; avoidable getter/apply/coercion hits 0, bridge calls 0, retries 0, unhandled rejections 0, disclosures 0.
- hostile iterator matrix: 17 request/iterator/next/result/chunk cases, including Proxy/revoked request and iterator, accessor/Proxy/bound methods, Proxy/accessor/thenable results, and six unsupported chunk forms; all finite with pre-invocation trap hits 0.
- trusted failures: iterator creation throw, next throw, and next rejection are finite; each invoked once.
- early cleanup: invalid chunk and body-cap paths each call safe iterator cleanup once; capped collection stops after two chunks.
- genuine bytes: primitive string and Node Buffer multi-chunk input works through custom and normal async iterators; exact concatenated UTF-8 bytes and API `body_bytes` length match.

## Regression evidence

- focused API/hosted/stable: 88/88 PASS.
- targeted bridge/hosted/Postgres/operations/account: 151/151 PASS.
- full Node: PASS, 272/272.
- full frontend: PASS, 89/89 across 5 files.
- build: PASS, TypeScript plus Vite, 1,652 modules transformed.
- security/public/mutation/scope/runbook/boundary/diff: PASS; security 56/56, public 4/4, local mutation 32/32 and API read-only 28/28, scope 47 files, public prohibited identifiers 0, diff errors 0.
- Gate: 7/7 executable checks PASS after this carrier.

## Scope and mutation ledger

- changed paths: exactly `api/index.mjs`, `server/stable-host.test.mjs`, the correction Gate, and this receipt.
- external mutations: 0.
- Supabase/provider/account/project/billing/database/migration/credential/env/network/browser/session mutations: 0.
- deploy/push/release/public message: 0.
- O2: OPEN/LOCKED.
- Phase 3: 17/43.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## Rollback

Revert the receipt carrier, then revert semantic correction `6e995f687f4baa49d34dfa6dba4959e8565a1f44`. This returns to exact QA FAIL carrier `ce387dc567c969652e277b3b33f38e7d245750a0`; external rollback is unnecessary because external mutation count is zero.

## Open boundaries

Fresh independent QA and fresh Release Audit remain required. Database parity, hosted activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, and external completion remain open and unauthorized.

## False completion and learning receipt

`false_completion_count=10`

1. Builder correction GREEN is not fresh QA PASS.
2. Fresh QA PASS would not be Release Audit PASS.
3. Release Audit PASS would not be Cherry acceptance.
4. Finite invalid-body handling is not successful persistence.
5. Stream collector proof is not hosted database proof.
6. Default-disabled code is not runtime activation.
7. Local no-store behavior is not deployment.
8. A commit is not push, release, or external completion.
9. O2 remains OPEN/LOCKED and Phase 3 remains 17/43.
10. `EXTERNAL_OUTCOME_COMPLETE` remains false.

Learning: `for await` and generic Buffer conversion hide authority-bearing operations such as iterator invocation, Promise assimilation, and object coercion. A secure stable seam must inspect methods/results by descriptor, accept only exact chunk primitives, and own cleanup/error materialization before the audited parser boundary.
