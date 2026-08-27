# OUTCOME Session Binding Control Plane · Builder Correction V6 Receipt

## Identity

- authorized parent/carrier: `fe214217041cb0580e501d46f89b7b6a09fdb183`
- authorized parent tree: `67427252a8af35b932a3cb0672971909240fec29`
- implementation commit: `182f4e459a33a67beb07bbb45ecc6cc877735cf3`
- implementation tree: `32dbc02233898c440ae821092b3a80d9a70e96ca`
- V5 fresh Release Audit report commit supplied: `3cf1cb1e20572bd4df70d82133505eb7f6c25ec6`

## Correction

The browser probe now follows the shipped accessible disclosure structure: each `.oc-role-row` must contain a direct native `summary`, whose direct `strong` title and non-live status span are resolved before any DOM Range is created. A missing disclosure target throws an explicit assertion diagnostic instead of passing `null` to `Range.selectNodeContents`. Responsive measurement uses rendered text ranges and containment, so legitimate wrapping in the native summary remains measurable while overlap, clipping, status overflow, undersized targets, and first-fold regressions still fail closed. No product component, product CSS, or accessibility DOM was changed.

## Measured evidence

- RED: the pinned V5 probe reproduced `Range.selectNodeContents(null)` at the first role row because it assumed title/status were direct `.oc-role-row` children.
- focused nested-summary and absent-target regressions: 2/2 PASS; absent title reports `role disclosure target missing summary=true title=false status=true` with no generic TypeError.
- browser assertion unit suite: 22/22 PASS.
- rendered browser matrix: 9/9 viewports PASS (`1920x1080`, `1440x900`, `1024x768`, `430x932`, `390x844`, `360x800`, `375x812`, `320x568`, `844x390`).
- each viewport exercised 3 projects, 9 hierarchy selections, and 3 selected Stages; all controls measured at least 44 px and minimum focus contrast was 14.38.
- rendered matrix redaction/geometry: clipping 0, ellipsis 0, sibling intersections 0, role intersections 0, role status overflow 0, viewport escape 0, document overflow 0, unexpected English 0, translation fallback 0.
- full frontend: 90/90 PASS across 5 files.
- full Node: 239/239 PASS.
- production build: PASS, 1652 modules transformed.
- public boundary: PASS, API/HTML/bundle/rendered UI prohibited identifiers 0.
- mutation scan: 32/32 local mutations and 28/28 API mutations returned read-only denial.
- `git diff --check`: PASS.

## Scope and rollback

Implementation changed only `scripts/browser-assertions.mjs` and `scripts/browser-assertions.test.mjs`. This Gate and receipt are a separate carrier commit. Unrelated dirty/untracked files were preserved. No product UI redesign, live registry migration, assignment, provider/session/task operation, archive, runtime mutation, deployment, push, QA, Audit, acceptance, release, or progress mutation occurred.

Rollback the implementation with `git revert 182f4e459a33a67beb07bbb45ecc6cc877735cf3` after preserving overlapping workspace changes. Revert the subsequent carrier commit separately to remove only this V6 Gate and receipt.

## Open authority

Builder PASS only. Fresh Release Audit remains open, as do Cherry acceptance, any live migration/assignment, provider/session/task operation, archive, runtime mutation, deploy, push, release, and progress closure.

false_completion_count: 1

learning_receipt: Browser assertions must follow the rendered accessibility tree rather than a former flat layout. Native disclosure content can wrap at narrow widths without being clipped; probe invariants should measure resolved summary descendants, rendered text ranges, containment, overlap, overflow, target size, and first-fold truth instead of assuming direct children or one-line labels.
