# OUTCOME Session Binding Control Plane · Builder Correction V4 Receipt

## Identity

- authorized parent: `563c73b9f292748c121bb041725c5f17eada80da`
- authorized parent tree: `c6109b122001af6318e8297be3ca45b097ecb567`
- implementation commit: `b6cd329385948d5bf500c9ff1cdb085f9d128ff9`
- implementation tree: `0e72f8170df2229f82b8daaaea140ff562e0875a`
- audit input: final fresh Release Re-Audit FAIL report commit `158ab820a1a237858185870289796c4cc4169ee2`

## Implemented correction

- Initial creation now publishes a fully written, fsynced, exact-`0600` inode exclusively. A synchronized 12-process test proves one winner and eleven non-mutating `registry_exists` losers.
- The exported persistence mutator independently enforces Planner routing freeze, verified handoff, `STARTED`, `CONTINUITY_READY`, and a SHA-256 handoff digest. Persistence never grants predecessor archive eligibility; only control read-after-write of the expected public alias/version can return it.
- Replacement constructs successors from an explicit durable allowlist. Predecessor `activity`, observation time, and terminal-only fields are not inherited.
- Private bindings carry a validated semantic `public_alias`; Package reconciliation requires manifest state/version/alias parity and projects explicit `registry_conflict` for runtime-only, manifest-only, and mismatch cases. Missing optional sessions companion remains valid `setup_required`. No raw locator is written to Git.

## Measured verification

- RED evidence before correction: concurrent creators `12/12` incorrectly succeeded; direct Planner replace missed an expected rejection; successor retained predecessor activity; runtime-only active returned Package `valid`.
- focused adversarial matrix: `4/4` PASS.
- targeted registry/control/package suite: `69/69` PASS.
- full frontend: `90/90` PASS across 5 files.
- full Node: `236/236` PASS.
- production build: PASS, 1652 modules transformed.
- public boundary: PASS, API/HTML/bundle/rendered UI prohibited identifiers `0`.
- mutation scan: `32/32` local mutations and `28/28` API mutations returned read-only denial.
- `git diff --check`: PASS.

## Scope and rollback

Changed implementation paths are limited to the session-binding contract, persistence/control/package modules, and their tests. The Gate and this receipt are carried separately. Unrelated dirty and untracked files were preserved; no live registry, manifest assignment, provider/task/archive/runtime, deployment, push, QA, Audit, acceptance, or progress state was mutated.

Rollback the implementation candidate with `git revert b6cd329385948d5bf500c9ff1cdb085f9d128ff9` after first preserving any overlapping workspace changes. Reverting the subsequent carrier commit removes only this Gate and receipt evidence.

## Open authority

Builder PASS only. Fresh independent UX & Product QA, fresh Release Audit, Cherry acceptance, live manifest/private assignment sequencing, runtime mutation, provider discovery/task creation, archive, deploy, push, release, and progress closure remain open and unauthorized here.

false_completion_count: 4

learning_receipt: Security invariants must live at the exported persistence boundary, not only a convenience facade. Cross-file truth needs an explicit public-safe reconciliation key, and a replacement record should be constructed from an allowlist because object spread silently transfers volatile authority-adjacent state. Initial publication must be exclusive at the filesystem namespace operation, not inferred from a preflight existence check.
