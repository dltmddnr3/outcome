# Phase 3 Observer Bridge · Raw Body Proxy Correction Builder Receipt

Terminal: `BUILDER_CORRECTION_CANDIDATE_READY_ONLY`

## Immutable identity

- QA FAIL carrier: `869b4ec899f40544ee64a21a4b6fd06429b13a3b`
- source tree: `8cdc7408835ccc3ebb9c51c20a4ec96d22a55cdb`
- source parent: `5937752ee8b82a5cd50226f29832a4968d1a7200`
- QA report SHA-256: `ec2f5ac74690f6eca68fe2aef5842f409657feca3420e0bbf7dda890816ec201`
- semantic correction: `615ece92a4248730189a483c347b8343378ba343`
- semantic tree: `33673d2050784815251cd9a8e0950972e48ad4f0`
- semantic parent: `869b4ec899f40544ee64a21a4b6fd06429b13a3b`

The source QA FAIL report and all earlier evidence remain byte-identical.

## Correction

`parseRawJson` now uses Node's trap-free Proxy identity check before `Buffer.isBuffer`, byte length, UTF-8 decoding, typed-array behavior, prototype inspection, coercion, or iteration. Proxy and revoked Proxy raw bodies therefore enter the private API `bad_request` path without executing caller code.

The audited Vercel raw-body boundary had the equivalent ordering defect and is included under the explicitly conditional `api/index.mjs` allowance. It now checks direct bodies and streamed chunks before native Buffer conversion. Because returning a Proxy from an async function itself triggers Promise thenable assimilation, rejected Proxy values are normalized to `undefined`; the existing API parser then returns private 400 when the bridge is enabled, while the default-disabled stable boundary remains finite 404 `bridge_unavailable`. Accepted body types did not expand.

## RED and GREEN evidence

- direct API RED: 0/1, actual 503 with trap 1; GREEN 1/1, private 400 with trap 0 and bridge calls 0.
- stable-host RED: 0/1, raw trap escaped outward; GREEN 1/1, direct and streamed Proxy values settle finite with trap 0, bridge calls 0, and no-store.
- hostile matrix: Proxy-wrapped Buffer, string-like object, Uint8Array, and revoked Proxy at direct and stable boundaries; eight forms rejected, trap 0.
- genuine body matrix: strings and Buffers preserve four accepted padded/exact-byte cases; exact cap and malformed UTF-8 remain 400; bridge calls only for the four valid cases.
- no retries, unhandled rejections, raw trap/error/stack disclosures, or broadened body types.

## Regression evidence

- focused API/hosted/stable: 82/82 PASS.
- targeted bridge/hosted/Postgres/operations/account: 145/145 PASS.
- full Node: PASS, 266/266.
- full frontend: PASS, 89/89 across 5 files.
- build: PASS, TypeScript plus Vite, 1,652 modules transformed.
- security/public/mutation/scope/runbook/boundary/diff: PASS; security 50/50, public 4/4, local mutation 32/32 and API read-only 28/28, scope 47 files, public prohibited identifiers 0, diff errors 0.
- Gate: 7/7 executable checks PASS after this carrier.

## Scope and mutation ledger

- changed paths: exactly four allowed source/test paths, the correction Gate, and this receipt.
- external mutations: 0.
- Supabase/provider/account/project/billing/database/migration/credential/env/network/browser/session mutations: 0.
- deploy/push/release/public message: 0.
- O2: OPEN/LOCKED.
- Phase 3: 17/43.
- `EXTERNAL_OUTCOME_COMPLETE=false`.

## Rollback

Revert the receipt carrier, then revert semantic correction `615ece92a4248730189a483c347b8343378ba343`. This returns to exact QA FAIL carrier `869b4ec899f40544ee64a21a4b6fd06429b13a3b`; external rollback is unnecessary because external mutation count is zero.

## Open boundaries

Fresh independent QA and fresh Release Audit remain required. Database parity, hosted activation, O2 evidence, Phase 3 advancement, Cherry acceptance, deploy, push, release, and external completion remain open and unauthorized.

## False completion and learning receipt

`false_completion_count=10`

1. Builder correction GREEN is not fresh QA PASS.
2. Fresh QA PASS would not be Release Audit PASS.
3. Release Audit PASS would not be Cherry acceptance.
4. A private 400 is not successful bridge persistence.
5. Trap-zero local proof is not hosted database proof.
6. Default-disabled code is not runtime activation.
7. A stable-host test is not deployment.
8. A commit is not push, release, or external completion.
9. O2 remains OPEN/LOCKED and Phase 3 remains 17/43.
10. `EXTERNAL_OUTCOME_COMPLETE` remains false.

Learning: native Buffer classification may invoke Proxy traps, so Proxy identity must precede every native brand or conversion check. At an async boundary, returning the rejected Proxy is also unsafe because Promise resolution reads `then`; normalizing it to a non-object rejection sentinel is necessary to preserve trap-zero behavior.
