# Phase 3 Observer Bridge · Stream Body Correction Fresh Independent QA

Verdict: **FAIL**

Observed: 2026-08-28 KST

The pinned correction closes the exact parent getter-bearing chunk, Proxy iterator-function, and thenable-chunk failures, and all checked-in regressions pass. It does not close the complete request/iterator/Promise surface dispatched for this fresh QA. Independent inputs still make private request accessors reject outward, renamed bound iterator functions bypass the name-based guard, and genuine branded Promise objects execute caller-controlled accessors during `await` assimilation. The candidate therefore does not meet finite/no-store/trap-zero/leak-zero acceptance.

## Blocking findings

### QAF-1 — High — request accessors execute and private errors reject outward before a response exists

- Reproduction: `node --test independent-stream-boundary-qa.test.mjs` in the fresh detached QA clone; the harness is QA-local and is not part of the candidate.
- Relevant source: `api/index.mjs:199-207` directly reads `request.url` and `request.query`; `api/index.mjs:311-314` calls that helper and later directly reads `request.method` and `request.headers` outside a total request-descriptor boundary.
- Matrix: own accessors on `url`, `query`, `method`, and `headers`.
- Expected: reject an unsupported request shape before executing its accessor; settle once to a finite private-safe response with `cache-control: no-store`; no private error text crosses the stable seam.
- Actual: `4/4` cases rejected outward with the exact private accessor error. Each accessor executed once. No response status/body/cache header was materialized.
- Impact: attacker-controlled behavior executes before stable normalization and its private error escapes the handler. The requested finite, no-store, trap-zero, and leak-zero boundary is false even though direct request Proxy/revoked-Proxy controls pass.
- Fix owner: Builder. Descriptor-snapshot every request field used by routing/collection/dispatch before evaluation, reject accessor or unsupported nested request surfaces, and wrap the entire stable request path—not only `rawBridgeBody`—in one finite private-safe response boundary.

### QAF-2 — High — mutable function names let bound iterator, next, and cleanup functions bypass pre-invocation rejection

- Reproduction: same independent harness.
- Relevant source: `api/index.mjs:213-229` treats a function as unbound when its own data `name` does not begin with `bound `; `api/index.mjs:239`, `245`, and `259` then invoke the accepted iterator, `next`, or `return` function.
- Matrix: `Function.prototype.bind` products for `Symbol.asyncIterator`, `next`, and `return`, each with its configurable `name` redefined to `iterator`, `next`, or `return`.
- Expected: all bound forms are rejected before invocation regardless of mutable metadata; apply/callback hits remain `0`.
- Actual: the renamed bound iterator, next, and cleanup functions each executed once (`3` avoidable callback hits total). The default-disabled route remained finite `404 bridge_unavailable`/no-store, but trap-zero was violated.
- Impact: a caller can bypass the exact control that the checked-in default-name bound test appears to prove. Bound creation is not an immutable property that can be authenticated from the writable `name` string.
- Fix owner: Builder. Remove the mutable-name trust decision and pin an enforceable callable contract that distinguishes allowed native/runtime iterator methods from caller-substituted bound callables; add renamed-bound RED/GREEN tests for iterator, next, and return.

### QAF-3 — High — branded Promise acceptance permits accessor execution during native `await` assimilation

- Reproduction: same independent harness.
- Relevant source: `api/index.mjs:246-247` accepts every non-Proxy value branded by `node:util/types.isPromise` and directly awaits it; `api/index.mjs:228-229` does the same for cleanup.
- Matrix: a genuine same-realm native Promise with an own throwing `constructor` accessor, and a genuine Promise subclass instance with an own throwing `then` accessor.
- Expected: Promise spoof/subclass/cross-realm surfaces are either accepted through a descriptor-safe exact contract or rejected before caller accessors execute; getter hits remain `0`.
- Actual: the native Promise `constructor` accessor executed once and the subclass `then` accessor executed once (`2` avoidable getter hits total). The outer collector catch converted both to default-disabled `404 bridge_unavailable`/no-store, but trap-zero was violated.
- Impact: `isPromise` proves an internal Promise brand, not safe assimilation. Caller-controlled Promise metadata remains executable at both next-result and cleanup settlement surfaces.
- Fix owner: Builder. Validate the exact Promise settlement surface before `await`, reject decorated/subclass/cross-realm shapes that cannot be consumed without property access, and add next/return tests for constructor/then accessors, subclass and cross-realm Promise variants, rejection, and multiple settlement.

## Immutable identity

- carrier: `36fd268a0d29faa9bf954a6693d9158ef167779c`
- carrier tree: `3e704d380166bda2350e6f38b4ebc5f529636b28`
- semantic correction: `6e995f687f4baa49d34dfa6dba4959e8565a1f44`
- semantic tree: `db2f10a8d8f155c55c1f9d13df284c5f4ebef59c`
- parent QA FAIL carrier: `ce387dc567c969652e277b3b33f38e7d245750a0`
- parent tree: `24786e6ffa899caf7208a6741c89257ce0dcd069`
- Builder receipt SHA-256: `df3d4c3d365fca5cc6d97537c48bc44851ec5d0a6cb8f8cc24f5ebb88f630a70`
- parent FAIL report SHA-256: `4fb1d553dd3cd39c84f097fdb06726cf8329b3406c899a6d8714f990ce68a52d`
- ancestry: the semantic correction is the direct child of the exact parent QA FAIL carrier; the carrier is the direct child of the semantic correction.
- combined changed paths: exactly `api/index.mjs`, `server/stable-host.test.mjs`, `GATES_PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION.md`, and `docs/PHASE3_OBSERVER_BRIDGE_STREAM_BODY_CORRECTION_BUILDER_RECEIPT.md`.
- initial QA state: fresh detached and clean in `/tmp`; the original dirty user worktree, index, branches, and locks were not changed.

## Acceptance ledger

- [x] Q1: exact commits, trees, ancestry, receipt/report hashes, combined four-path scope, and initial detached-clean state were independently remeasured.
  EVIDENCE: all dispatched identities and both SHA-256 values match; `git diff --name-status ce387dc56..36fd268a` lists only the four paths above.
- [x] Q2: parent RED cases and the checked-in request/iterator/next/result/chunk/cleanup matrix were rerun.
  EVIDENCE: focused official stream tests `6/6 PASS`; getter-bearing chunk, Proxy iterator function, thenable chunk, Proxy/revoked/default-name-bound/accessor/result/chunk forms, trusted throw/reject, early cleanup, cap, and genuine Buffer/string controls pass as checked in.
- [x] Q3: fresh adversarial request/bound/Promise coverage extended beyond Builder tests.
  EVIDENCE: independent suite `0/9 PASS`; request accessors `4/4` outward rejection, renamed bound surfaces `3/3` callback execution, and decorated branded Promise surfaces `2/2` accessor execution. QAF-1 through QAF-3 remain blocking.
- [x] Q4: genuine bytes, early cap, invalid UTF-8, and cleanup controls were rechecked proportionally.
  EVIDENCE: official genuine multi-chunk Buffer/string, exact byte count, two-chunk early cap, invalid chunk cleanup, trusted iterator creation/next throw and rejection controls pass. These positive controls do not cure the renamed-bound cleanup and Promise-assimilation failures.
- [x] Q5: earlier async/private-error/path/auth/public/account/default-off matrices remain intact.
  EVIDENCE: targeted bridge/hosted/Postgres/operations/account/stable matrix `151/151 PASS`; security matrix `56/56 PASS`; public mode `4/4 PASS`; default-off, private error root/newTarget/brand, six-endpoint async settlement, path alias, server-derived auth, companion ambient-authority removal, cache/no-store, and public redaction assertions all pass.
- [x] Q6: proportional full checks and Builder Gate were remeasured without browser or external execution.
  EVIDENCE: full frontend `89/89 PASS` across five files; full Node `272/272 PASS`; build PASS with `1,652` modules; local mutation denial `32/32=405`, API read-only JSON `28/28`; scope `47`; runbook and candidate `git diff --check` PASS; Builder Gate checker `7/7 ALL MET`. Browser-based public-boundary execution was not run because browser use was explicitly forbidden and is not claimed as fresh evidence.
- [x] Q7: terminal authority and mutation boundary are explicit.
  EVIDENCE: product/runtime/test mutation `0`; external/browser/public-network/Supabase/database/account/env/deploy/push/release mutation `0`; this report-only child is the sole project mutation. Verdict is only `FAIL` and grants no downstream authority.

Ledger: **7/7 QA work gates checked with evidence; terminal result FAIL because three acceptance findings are open.**

## Scope and terminal boundary

- QA mutation: exactly this report as a child of carrier `36fd268a0d29faa9bf954a6693d9158ef167779c`.
- Product/runtime/test source mutation: `0`.
- External mutation: `0`.
- Release promotion: `0`.
- Terminal: `FAIL`; return QAF-1 through QAF-3 to Builder and require a new immutable correction candidate plus a new fresh independent QA.
- O2 remains `OPEN/LOCKED`; Phase 3 remains `17/43`; `EXTERNAL_OUTCOME_COMPLETE=false`.

Fresh Release Audit, Cherry acceptance, database/hosted parity, runtime activation, O2 proof, Phase 3 advancement, deploy, push, release, and external completion remain open and unauthorized.

## False completion and learning receipt

`false_completion_count=10`

1. Checked-in hostile tests passing is not exhaustive hostile-surface proof.
2. A finite catch after caller behavior executes is not trap-zero validation.
3. A function's mutable `name` is not reliable bound-function identity.
4. A genuine Promise brand is not safe Promise assimilation.
5. Default-disabled `404` does not cure pre-routing code execution.
6. Regression PASS does not cure a new independent QA blocker.
7. Fresh QA FAIL cannot authorize Release Audit.
8. A local candidate is not hosted activation or database parity.
9. O2 and Phase 3 progress remain unchanged.
10. Commit evidence is not deploy, release, Cherry acceptance, or external completion.

Learning: descriptor checks must cover every field actually used by the stable handler, and safety decisions cannot rest on mutable reflection metadata or a broad internal brand when the next language operation performs caller-observable property access.

## ABANDON

**ABANDON:** This report proves only fresh independent QA failure of the pinned local candidate. It does not prove Release Audit, Cherry acceptance, hosted/database parity, runtime activation, O2 PASS, Phase 3 progress, deploy, push, release, or external completion.
