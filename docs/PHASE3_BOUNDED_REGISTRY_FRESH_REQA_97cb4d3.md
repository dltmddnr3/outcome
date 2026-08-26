# OUTCOME Phase 3 · Bounded Registry Fresh Independent Re-QA

상태: `FAIL · INDEPENDENT QA ONLY · PROVIDER OPERATIONS 0 · R1-R6 OPEN`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `bb4c0ec77f673ff927d31a18012f713b2e3004a5`
- receipt tree: `f971812eed22dcab598a6debd91d4683dcb74c4e`
- correction commit: `97cb4d337b16dab2c08b835f25c98914e3ece470`
- correction tree: `f329e4fa8ba1a814c6bd41eb2b9a824c820c55d7`
- correction parent: `3207c28cfd62e6fadab16b821dda930f96c52c03`
- task-brief SHA-256: `2c221911dc33ded89d67f7c1cde69c1fc544f128efa0a21e1d801edc3456e4ca`
- independent worktree: `/tmp/outcome-phase3-fresh-reqa.nlpanU`, created from the exact receipt head; canonical checkout unchanged
- correction changed paths: exactly the two declared implementation paths:
  - `server/phase3-private-session-registry.mjs`
  - `server/phase3-private-session-registry.test.mjs`
- receipt-head changed path: exactly `docs/PHASE3_BOUNDED_REGISTRY_PRIVACY_CORRECTION_RECEIPT.md`

The exact commit, tree, parent, ancestry, brief digest, and path scope were resolved directly from Git and the supplied contract. The prior FAIL report and correction receipt were treated as hypotheses, not acceptance evidence.

## Verdict

`FAIL`

The three requested corrections pass fresh independent refutation, but an ordinary schema input still breaks the same fail-closed and failure-atomicity contract. `locatorRef` is regex-coerced without first requiring a primitive string. A coercible non-string value can therefore be committed, and a non-cloneable coercible object causes the API to throw only after the binding, active index, revision, and audit event have been committed.

## Blocking finding

### F1 · HIGH · Coercible non-string locator commits malformed state and can throw after mutation

- Contract: `locator_ref` must be a synthetic schema value; rejected or failed input must return a public-safe error without state mutation; every mutation is fail closed.
- Location: `server/phase3-private-session-registry.mjs:113-139` and `server/phase3-private-session-registry.mjs:148-173`. `SYNTHETIC_LOCATOR.test(locatorRef ?? '')` and `PROHIBITED_VALUE.test(locatorRef)` coerce arbitrary objects, then the original value is stored. The returned binding is cloned only after state, revision, and audit commit.
- Independent reproduction A: pass `new String('synthetic:builder_alpha')` to an otherwise valid initial bind.
- Actual A: bind returns `ok: true`; both returned and stored `locator_ref` have JavaScript type `object`, not the schema's primitive synthetic string.
- Independent reproduction B: pass an object whose `toString()` returns `synthetic:builder_alpha`, or an equivalent Proxy.
- Expected B: `{ ok: false, error: 'invalid_locator' }` and deep-equal state/no audit mutation.
- Actual B: the bind throws `DataCloneError`; afterwards public projection contains one active version-1 binding, audit contains `event-000001`, and a subsequent valid bind fails `duplicate_active_binding`. The method-object and Proxy variants both reproduced this partial commit.
- Impact: malformed caller input can produce committed state without a successful/public-safe mutation result. Retry semantics, schema integrity, and the no-mutation-on-failure invariant are false even though clock atomicity is corrected.
- Fix owner: Builder. Require `typeof locatorRef === 'string'` before any regex evaluation or commit, and add boxed-string/coercible-object/Proxy no-mutation tests for bind and rebind. Ensure no potentially throwing response materialization occurs after commit, or constrain all committed fields to validated clone-safe primitives before mutation.

All reproduction values were synthetic literals. No real locator, session/thread identifier, credential, or private store was accessed.

## Fresh correction evidence that passed

An independent 64-assert adversarial probe, separate from the candidate tests, passed all requested correction targets:

- re-entrant clock writes: nested writes were rejected with `mutation_in_progress` during bind, rebind, revoke, and disable; every outer mutation preserved at most one active binding per scope
- clock failure atomicity: throwing, invalid, non-canonical, null, and numeric timestamps returned `clock_unavailable` with deep-equal state; bind/rebind/revoke/disable failure paths were covered
- audit continuity and recovery: failed clock reads consumed neither binding nor event IDs; recovery began at `binding-000001` and `event-000001`; successful lifecycle audit IDs were contiguous
- reason privacy: raw-session plus UUID, standalone UUID, credential, `api_key`, `sk-proj`, embedded POSIX path, and embedded Windows path shapes all returned `invalid_reason` with deep-equal no mutation
- ordinary lifecycle/CAS/disable/audit/projection checks passed apart from F1

## Regression evidence

| Check | Result |
| --- | --- |
| focused registry suite | `14/14 PASS` |
| independent correction adversarial assertions | `64/64 PASS` |
| non-string locator schema/atomicity probe | `FAIL · 1 boxed-string schema breach + 2/2 post-commit DataCloneError variants` |
| Package model | `39/39 PASS` |
| mutation matrix | `local 32/32=405 · API 28/28 read_only · empty page 0/4` |
| frontend suite | `89/89 PASS` |
| full Node suite | `126/126 PASS` |
| production build | `1652 modules · PASS` |
| `git diff --check` before report | `PASS` |
| correction changed-path scope | `PASS · 2/2 declared implementation paths` |

The isolated worktree temporarily used the canonical checkout's pre-existing `node_modules` through a read-only symlink for dependency-backed regressions. The symlink was removed before this report; no dependency or build output remains as a worktree change.

## Boundary and residual state

- actual provider/session/thread operation: `0`
- credential/private-store access: `0`
- browser/local-storage access: `0`
- implementation/product/runtime/API/UI modification: `0`
- Gate/Map closure: `0`
- push/deploy/release/external mutation: `0`
- production relay: `NO_GO`
- fallback remains: `UNBOUND_MANUAL_NAVIGATION`
- R1-R6, release audit, Cherry acceptance, Phase 3 completion, persistence, crash recovery, multi-process concurrency, real observation/routing/evidence continuity, hosted queue/database, and remote relay remain open

This report is a fresh independent `FAIL` for the pinned correction candidate only. It is not Release Audit, Cherry acceptance, release authorization, Phase 3 completion, or permission for external operation.
