# OUTCOME Phase 3 · Bounded Registry Fresh Independent QA

상태: `FAIL · INDEPENDENT QA ONLY · PROVIDER OPERATIONS 0 · R1-R6 OPEN`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `d059089db2bbc1cffeb67baedc61eb169d0555f4`
- receipt tree: `06dcb03e7d67b2f697e487dfeccc4ba76eafc3b6`
- candidate commit: `9a00f2549d7eee3193bea1f61fe4134f9ed3028a`
- candidate tree: `6389f259999ef438da546a1503125f3ea6874b7e`
- candidate parent: `ff26038429bb2ae62229639e8fbab4fbb9abb29d`
- task brief SHA-256: `2c221911dc33ded89d67f7c1cde69c1fc544f128efa0a21e1d801edc3456e4ca`
- independent worktree: detached from the exact receipt head; no canonical-checkout edits
- candidate changed paths: exactly the two authorized additions:
  - `server/phase3-private-session-registry.mjs`
  - `server/phase3-private-session-registry.test.mjs`
- receipt changed path: exactly `docs/PHASE3_BOUNDED_REGISTRY_BUILDER_RECEIPT.md`

The candidate identity, tree, parent, ancestry, task-brief digest, and path scope were independently resolved from Git and the supplied brief. Builder claims were not used as acceptance evidence.

## Verdict

`FAIL`

The ordinary synchronous lifecycle passes, but the candidate does not uphold the required active-binding uniqueness, failure atomicity, or audit privacy invariants under independently reproduced inputs/failures. These are candidate defects, not release or environment blockers.

## Findings

### F1 · HIGH · Re-entrant clock interleaving creates two active bindings in one project+role scope

- Contract: `(project_id, role)` may have at most one active binding; bind/rebind/revoke/disable must enforce compare-and-swap semantics.
- Location: `server/phase3-private-session-registry.mjs:84-115`. `bind` completes its active-scope and expected-version checks before invoking the injected `now()` callback at line 107, then commits without revalidating the scope/version.
- Independent reproduction:
  1. Construct a registry with a `now` function that, once armed, invokes `registry.bind(...)` for the same `outcome+builder` scope and then returns an ISO timestamp.
  2. Arm the callback and call an outer `bind(...)`, with both calls using `expectedVersion: 0` and different valid synthetic locators.
  3. Inspect the returned results and state.
- Expected: at most one call succeeds; the losing call fails closed without mutation; projection contains one active row.
- Actual: both calls return `ok: true`; state and public projection contain two `active` rows for `outcome+builder`, both at binding version `1`; two bind audit events claim `before_version: 0` and `after_version: 1`.
- Impact: the core uniqueness and CAS proof is false for a permitted injected dependency/interleaving. Downstream routing cannot rely on a single active role binding.
- Fix owner: Builder. Stage timestamps and mutation facts before commit, prevent/reject re-entrant writes, and atomically revalidate/commit the scope and revision.

### F2 · HIGH · Clock failure leaves committed state without its required audit event

- Contract: every successful mutation appends an audit entry; failed mutation must not change state and must fail closed.
- Location: `server/phase3-private-session-registry.mjs:99-115`. Binding and revision mutation occur before the second `now()` call inside `appendAudit`.
- Independent reproduction:
  1. Construct a registry whose clock returns a valid timestamp on its first call and throws `clock_failure` on its second.
  2. Capture `inspectState()`, then call a valid initial bind.
  3. Catch the thrown error and compare state.
- Expected: a public-safe failure with state deep-equal to the pre-call state, or an atomic successful binding plus audit.
- Actual: the call throws; state changes to revision `1` with one active binding; audit remains empty.
- Impact: mutation/audit continuity and fail-closed recovery are broken. A caller retry observes a duplicate active binding even though the original call did not return success.
- Fix owner: Builder. Validate/materialize the clock result before any state mutation and commit binding/index/revision/audit as one atomic unit.

### F3 · HIGH · Credential-, raw-session-, and embedded-path-shaped reasons enter serialized audit

- Contract: credential-shaped values and local absolute paths are rejected at input; audit contains no raw locator, credential, or local path; failed input causes no mutation.
- Location: `server/phase3-private-session-registry.mjs:6,12-13,43-46,55-66`. The path patterns are start-anchored, the session/thread pattern omits whitespace forms, and credential coverage omits common `api_key=` and `sk-proj-` shapes. Accepted `reason` is copied verbatim to audit.
- Independently reproduced synthetic inputs:
  - `session 123e4567-e89b-12d3-a456-426614174000`
  - `reviewed sk-proj-syntheticplaceholder123456`
  - `approved api_key=private-value`
  - `reviewed /Users/cherry/private.db`
- Expected for each: `{ ok: false, error: 'invalid_reason' }`, no binding/revision/audit mutation, and no prohibited value in serialized audit.
- Actual for each: bind returns `ok: true`, state changes, and the exact value is serialized in the audit `reason`.
- Impact: caller-supplied private identifiers, credentials, and local paths can be persisted and disclosed through the otherwise public-safe audit surface.
- Fix owner: Builder. Define a schema-safe reason vocabulary or comprehensive redaction/rejection at the audit boundary, and add whole-string adversarial tests for whitespace session IDs, current credential prefixes, and embedded paths.

No actual session ID, provider credential, or private path was accessed or used; all reproduction values above are synthetic test literals.

## Passing independent evidence

| Check | Result |
| --- | --- |
| Candidate focused suite | `11/11 PASS` |
| Independent ordinary lifecycle/CAS/disable/privacy checks | `32/32 PASS` |
| Package model | `39/39 PASS` |
| Mutation matrix | `local 32/32=405 · API 28/28 read_only · empty page 0/4` |
| Frontend suite | `89/89 PASS` |
| Full Node suite | `123/123 PASS` |
| Production build | `1652 modules · PASS` |
| Candidate diff check | `PASS` |
| Candidate changed-path scope | `PASS · 2/2 authorized additions only` |
| Re-entrant uniqueness adversarial probe | `FAIL · 2 active rows` |
| Clock-failure atomicity adversarial probe | `FAIL · revision 1 + active binding + audit 0` |
| Audit prohibited-value adversarial probe | `FAIL · 4/4 accepted and serialized` |

The full regression commands ran in the detached receipt worktree using the canonical checkout's pre-existing dependency directory only as a temporary read-only dependency link; the link was removed after execution. The worktree was clean before this report was added.

## Boundary and residual state

- actual provider/session/thread operation: `0`
- credential/private-store access: `0`
- browser/private-storage access: `0`
- implementation/product/runtime/API/UI modification: `0`
- Gate/Map closure: `0`
- push/deploy/release/external mutation: `0`
- production relay: `NO_GO`
- fallback remains: `UNBOUND_MANUAL_NAVIGATION`
- R1-R6, release, Cherry acceptance, Phase 3 completion, persistence, crash recovery, multi-process concurrency, real observation/routing/evidence continuity, hosted queue/database, and remote relay remain open.

This report is `FAIL` for the pinned candidate only. It is not Release Audit, Cherry acceptance, release authorization, Phase 3 completion, or permission for any external operation.
