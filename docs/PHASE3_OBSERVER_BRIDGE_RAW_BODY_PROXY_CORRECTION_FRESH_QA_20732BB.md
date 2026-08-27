# Phase 3 Observer Bridge · Raw Body Proxy Correction Fresh Independent QA

Verdict: **FAIL**

Observed: 2026-08-28 KST

The exact correction closes the prior direct raw-body Proxy defect and the candidate's Proxy-wrapped direct-body and yielded-chunk cases remain trap-free. It does not close the full streamed raw-body boundary. Before the private API parser receives a body, `rawBridgeBody` still applies `Buffer.from` to arbitrary non-Proxy chunks and invokes a caller-supplied async-iterator function without rejecting Proxy iterator machinery. Independent hostile streamed inputs can therefore execute caller behavior and reject out of the stable handler instead of producing a finite no-store response.

## Blocking finding

### QAF-1 — High — streamed raw-body materialization executes hostile chunk/iterator behavior and rejects outward

- Reproduction: `node --test /private/tmp/outcome-observer-raw-proxy-fresh-qa.H3ntSg/independent-raw-boundary-qa.test.mjs` from the pinned worktree.
- Relevant source: `api/index.mjs:214-228`. Line 218 reads the async-iterator function and line 219 enters `for await`; line 223 converts every non-Buffer, non-Proxy chunk with `Buffer.from(chunk)` without descriptor-safe type validation or a total stable-boundary catch.
- Expected: hostile getter-bearing/string-like/thenable chunks and Proxy/revoked iterator machinery are rejected or normalized before caller-controlled getter, coercion, iterator, or Proxy evaluation; trap/getter hits remain `0`; the stable request settles once to a finite private-safe response with `cache-control: no-store`; bridge calls/retries/unhandled rejections/leaked retained work remain `0`.
- Actual:
  - a null-prototype streamed chunk with a throwing `valueOf` getter executes the getter once and rejects outward with the private sentinel error;
  - a Proxy async-iterator function executes its `apply` trap once and rejects outward with the private sentinel error;
  - a null-prototype thenable-shaped streamed chunk does not execute its `then` getter, but `Buffer.from` throws `ERR_INVALID_ARG_TYPE` outward instead of returning a finite response.
- Control results: direct Proxy-wrapped Buffer, boxed string, Uint8Array, and revoked Proxy all return private `400 bad_request` with trap hits `0` and bridge calls `0`; stable direct-body and yielded-chunk Proxy controls return disabled `404 bridge_unavailable`, `no-store`, and trap hits `0`; genuine direct string/Buffer bodies preserve exact padding, byte cap, and malformed UTF-8 behavior.
- Impact: attacker-controlled behavior can run and private exception detail can cross the stable raw-body collection seam before bridge/API normalization. The stable result is neither finite nor response-shaped. This violates the requested trap-zero, no-leak, and stable-result boundary even though the narrower Builder Proxy matrix passes.
- Fix owner: Builder. Materialize streamed request input from an exact allowlist before conversion, reject Proxy iterator function/object and accessor/coercive/thenable chunk forms before evaluation, and place a total finite/no-store catch around raw-body collection. Add RED/GREEN coverage for direct body, iterator function, iterator object, iteration result, and chunk values, including Proxy and revoked Proxy variants, getters, coercion hooks, thenables, valid Buffer/string/Uint8Array chunks, multi-chunk byte accounting, exact cap, malformed UTF-8, and early iterator cleanup.

## Immutable identity

- carrier: `20732bb5f6f190f1d385c73223dcbe4d07815c70`
- carrier tree: `870785b03b05c83cb152cdd53a5ec51b7f9ccf17`
- semantic correction: `615ece92a4248730189a483c347b8343378ba343`
- semantic tree: `33673d2050784815251cd9a8e0950972e48ad4f0`
- parent QA FAIL: `869b4ec899f40544ee64a21a4b6fd06429b13a3b`
- parent tree: `8cdc7408835ccc3ebb9c51c20a4ec96d22a55cdb`
- Builder receipt SHA-256: `a693c9be7119e45d44e9f74ed6f693060dc1c417b54032cba03890ff0ea7b940`
- prior FAIL report SHA-256: `ec2f5ac74690f6eca68fe2aef5842f409657feca3420e0bbf7dda890816ec201`
- ancestry: semantic parent is the exact QA FAIL carrier; carrier parent is the exact semantic correction.
- scope: six changed paths only: four source/test paths, one correction Gate, and one Builder receipt.
- initial QA state: fresh detached and clean.

## Acceptance ledger

- [x] Q1: exact pins, trees, ancestry, receipt/report hashes, six-path scope, and initial clean detached state match.
  EVIDENCE: all eight dispatched identities/hashes remeasured exactly; `git diff --name-status 869b4ec8..20732bb5` lists only the six allowed paths.
- [x] Q2: direct and stable raw-body/chunk hostile matrix was independently extended beyond Builder coverage.
  EVIDENCE: **FAIL**; independent suite `2/5 PASS`, `3/5 FAIL`. Direct and yielded Proxy controls pass. Getter-bearing chunk and Proxy iterator function each execute caller behavior once and reject outward; hostile thenable-shaped chunk rejects outward with `ERR_INVALID_ARG_TYPE`.
- [x] Q3: genuine byte, padding, malformed UTF-8, cap, no-store, and bridge-zero controls were remeasured.
  EVIDENCE: direct genuine strings/Buffers accepted `4/4`; exact oversize and invalid UTF-8 reject `400`; bridge calls remain `4`. Stable Proxy controls are finite `404`, no-store, trap `0`, bridge `0`. Full valid streamed-chunk acceptance cannot cure QAF-1 and remains a required Builder regression expansion.
- [x] Q4: private error factory/constructor hostile matrix and async seam remain intact.
  EVIDENCE: focused candidate matrix `27/27 PASS`; public constructor/root/newTarget/brand/proxy/cross-realm/decorated forms remain generic, genuine module-private failures preserve fixed mappings, six endpoints and both settlements remain one-call/retry-zero/trap-zero/unhandled-zero under covered cases.
- [x] Q5: path, auth, CSRF, companion, public/account/default-off and proportional full regressions pass.
  EVIDENCE: targeted Node `145/145`; full frontend `89/89` across five files; full Node `266/266`; build `1,652` modules; security `50/50`; public `4/4`; mutation unit `3/3`; live local mutations `32/32=405`, API read-only JSON `28/28`; scope `47`; runbook, client-env, public redaction, candidate diff and Builder Gate `7/7` PASS.
- [x] Q6: terminal claim is confined to independent QA failure.
  EVIDENCE: product/runtime/test source mutation `0`; external/browser/network/Supabase/database/env/deploy/push/release mutation `0`; report-only QA child is the sole intended mutation.

## Scope and terminal boundary

- QA mutation: exactly this report as a child of the carrier.
- Product/runtime/test source mutation: `0`.
- External mutation: `0`.
- Release promotion: `0`.
- Terminal: `FAIL`; return QAF-1 to Builder and require a new immutable candidate plus fresh QA.

Release Audit, Cherry acceptance, database/hosted parity, runtime activation, O2 evidence, Phase 3 advancement, deploy, push, release, and external completion remain open and unauthorized.

## ABANDON

**ABANDON:** This report proves only fresh independent QA failure of the pinned local candidate. It does not prove Release Audit, Cherry acceptance, hosted/database parity, runtime activation, deploy, push, release, or external completion.
