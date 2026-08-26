# OUTCOME Phase 3 · Bounded Registry Fresh Independent Re-QA v2

상태: `FAIL · INDEPENDENT QA ONLY · PROVIDER OPERATIONS 0 · R1-R6 OPEN`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `218a6541974d732c1595da57f5ffb827428a20c1`
- receipt tree: `3fd8ffcbbb0500f9a8c0d03ef4807f5e11c6e496`
- receipt parent: `b2e8b1398d0acbe6867b0c490b59f8ac90855f5a`
- candidate commit: `b2e8b1398d0acbe6867b0c490b59f8ac90855f5a`
- candidate tree: `33130bf9f2e61e1ac7631bfb72e8ca3d62a27210`
- candidate parent: `fcbdd5a2c7e8e4a4116131bfae0401a380df1eab`
- independent worktree: new detached worktree created first at the exact receipt head, then moved to the pinned candidate; canonical checkout was not edited
- candidate changed paths: exactly the two declared implementation paths:
  - `server/phase3-private-session-registry.mjs`
  - `server/phase3-private-session-registry.test.mjs`
- receipt changed path: exactly `docs/PHASE3_BOUNDED_REGISTRY_TYPE_CORRECTION_RECEIPT.md`

Git resolved all commit, tree, parent, receipt, and changed-path claims directly. Existing reports, receipts, and candidate tests were treated as hypotheses.

## Verdict

`FAIL`

The requested locator correction passes fresh independent refutation, including both bind and rebind. The prior HIGH fixes also remain effective. However, the registry still violates R1 schema integrity and failure atomicity at the project-ID constructor boundary: `projectIds` reaches a regular expression before any primitive-string guard, allowing coercible non-string project IDs to be stored and a method object to throw only after mutation commit.

## Blocking finding

### F1 · HIGH · Non-string project IDs are regex-coerced, stored, and can throw after binding commit

- Contract: R1 requires a project identifier schema and invariant; failed input must fail closed, and the public projection must remain schema-safe.
- Location: `server/phase3-private-session-registry.mjs:22-29`, `:117-142`. Constructor validation calls `SAFE_ID.test(id)` without first requiring `typeof id === 'string'`. The original value is retained in the project set, binding, audit, and projection.
- Independent reproduction A: construct with `[new String('outcome')]`, then bind with that same boxed object.
- Actual A: bind returns `ok: true`; the returned binding, stored binding, and public projection all expose `project_id` with JavaScript type `object`.
- Independent reproduction B: construct with a method object whose `toString()` returns `outcome`, then bind with that same object.
- Expected B: constructor rejects `invalid_project_registry`, with no caller coercion and no registry mutation.
- Actual B: constructor and scope-key creation invoke caller coercion. Bind installs the binding, active index, revision, and audit, then throws `DataCloneError` when cloning the response. A retry returns `duplicate_active_binding`, proving the first throwing call already committed.
- Impact: a malformed configured project identifier can cross the private schema boundary, enter the public projection, or create committed state without a successful/public-safe API result. Registry retry and audit consumers cannot rely on schema or failure atomicity.
- Fix owner: Builder. Require every configured project ID to be a primitive string before `SAFE_ID.test`, retain only validated primitives, and add boxed String, Symbol, plain object, method object, Proxy, and throwing-`toString` constructor/bind tests with no caller coercion and no mutation.

All values used above were synthetic. No real project locator, provider session/thread identifier, credential, or private store was accessed.

## Requested correction evidence that passed

The source guard at `server/phase3-private-session-registry.mjs:17-18` checks `typeof value === 'string'` before either locator regex. A fresh external 98-assert probe, separate from candidate tests, passed:

- bind and rebind each rejected boxed String, Symbol, plain object, method object, Proxy, and throwing-`toString` locator values as `invalid_locator`
- all 12 locator cases preserved deep-equal registry state and invoked caller coercion zero times
- re-entrant writes during bind, rebind, revoke, and disable returned `mutation_in_progress`; outer mutations preserved at most one active binding per scope
- throwing and invalid clocks across bind, rebind, revoke, and disable returned `clock_unavailable` with deep-equal state
- recovery after both clock failures preserved contiguous binding and event IDs
- eight synthetic raw-session, UUID, credential, API-key, key-prefix, POSIX-path, Windows-path, and prohibited reason-code shapes returned `invalid_reason` with no mutation
- ordinary bind/rebind/revoke, CAS, disable, audit history, and public projection checks passed

## Regression evidence

| Check | Result |
| --- | --- |
| focused registry suite | `16/16 PASS` |
| fresh locator/prior-HIGH/ordinary external probe | `98/98 assertions PASS` |
| project-ID schema/atomicity refutation | `FAIL · boxed project_id type object; method-object bind throws after commit` |
| Package model | `39/39 PASS` |
| mutation matrix | `local 32/32=405 · API 28/28 read_only · empty page 0/4` |
| frontend suite | `89/89 PASS` |
| full Node suite | `128/128 PASS` |
| production build | `1652 modules · PASS` |
| candidate `git diff --check` | `PASS` |
| candidate changed-path scope | `PASS · 2/2 declared implementation paths` |

The isolated worktree temporarily used the canonical checkout's pre-existing dependency directory through a symlink for dependency-backed regressions. The symlink was removed after testing; build outputs are ignored and no dependency change remains.

## Authority boundary and residual open items

- actual provider/session/thread operation: `0`
- real identifier/credential/private-store access: `0`
- browser/account/local-storage operation: `0`
- implementation/product/runtime/API/UI change: `0`
- Gate/Map mutation or closure: `0`
- push/deploy/release/external mutation: `0`
- production relay: `NO_GO`
- fallback remains: `UNBOUND_MANUAL_NAVIGATION`
- R1-R6 remain open; this report does not close the registry Stage
- persistence, restart/crash recovery, multi-process concurrency, actual provider binding, observation, routing, evidence continuity, hosted queue/database, remote relay, and real multi-device proof remain unverified
- fresh Release Audit, Cherry acceptance, Phase 3 completion, release authorization, and `EXTERNAL_OUTCOME_COMPLETE` remain open and separate

This is an actionable independent-QA `FAIL` for the exact pinned candidate only. It is not Release Audit, Cherry acceptance, release authorization, Phase 3 completion, or permission for external operation.
