# OUTCOME Session Binding Control Plane · Builder Correction V5 Receipt

## Identity

- authorized parent/carrier: `edafbc6272affcb30a72f91dc412a6dff74e67c7`
- authorized parent tree: `88571f584719c17aeb172764bee9aa6493a7e9f6`
- implementation commit: `65677b5b93d0ebaac4bfb541df48de92ccd16677`
- implementation tree: `f9efce28e0a045dd8311b85181bfacea4f1b6494`
- final audit report commit supplied: `13086aef9a93e8324977845b097c3f2a453d2321`

## Correction

`createEmptyRegistry` and `migrateLegacyRegistry` now establish a registry root only through the same exclusive `atomicPublishNewRegistry` primitive. It writes and fsyncs a private exact-`0600` temp inode, atomically hard-links it into the absent target namespace, maps every existing target entry to `registry_exists`, removes its temp name, and fsyncs the parent directory. Migration no longer performs an absence preflight followed by overwrite-capable rename. Its source receipt is fully materialized before publication but returned only after exclusive publication succeeds.

## Measured evidence

- RED: synchronized migration returned 24 successes instead of 1; create-versus-migrate returned 2 successes instead of 1.
- focused publication matrix: 5/5 PASS.
- synchronized migration: 1/24 success with the exact winner source SHA-256/mode receipt; 23/24 deterministic `registry_exists` losers with no receipt field.
- winner: valid reload, exact `0600`, complete single-source project/binding state.
- collision: create-versus-migrate produced one success and one `registry_exists`; surviving registry was complete and valid.
- target variants: existing regular file, dangling symlink, non-dangling symlink, and directory all failed closed without replacement/follow.
- all 24 race sources and collision/variant sources retained exact original bytes; target temp/lock residue count was 0.
- targeted registry/control/package: 72/72 PASS.
- full frontend: 90/90 PASS across 5 files.
- full Node: 239/239 PASS.
- production build: PASS, 1652 modules transformed.
- public boundary: PASS, API/HTML/bundle/rendered UI prohibited identifiers 0.
- mutation scan: 32/32 local mutations and 28/28 API mutations returned read-only denial.
- `git diff --check`: PASS.

## Scope and rollback

Implementation changed only the session-binding persistence module, its tests, and the session-binding control-plane contract. The Gate and this receipt are separate carrier evidence. Unrelated dirty/untracked files were preserved. No canonical/live migration, registry, assignment, manifest, provider, task, archive, runtime, deployment, push, QA, Audit, acceptance, release, or progress mutation occurred.

Rollback the implementation with `git revert 65677b5b93d0ebaac4bfb541df48de92ccd16677` after preserving overlapping workspace changes. Revert the subsequent carrier commit separately to remove only this V5 Gate and receipt.

## Open authority

Builder PASS only. Fresh Release Audit remains open, as do Cherry acceptance, any live migration/assignment, provider/session/task operation, archive, runtime mutation, deploy, push, release, and progress closure.

false_completion_count: 1

learning_receipt: Exclusive root ownership is an entrypoint-wide namespace invariant. Every code path that can establish the registry file must use the same non-overwriting publication primitive; a correct creator does not compensate for a migration path that still renames over a concurrent winner. Receipts must cross the success boundary only after that exclusive namespace claim succeeds.
