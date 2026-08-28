# OUTCOME Role Transport Clock Authority · Local Promotion Receipt

Result: `LOCAL_PROMOTION_CARRIER_ONLY`

## Immutable inputs

- exact parent commit/tree: `c2c4d12366050289b5a98173f5994f2fde76fdf2` / `e1d391ba6bfad1f66b1b4bbbf75271fb532aaf46`
- product candidate commit/tree: `8aada70211cd514e0869f5cffb4ad310ec11f107` / `11cde5f90055250ca3eea749742a6906fbc300f8`
- Builder receipt SHA-256: `247b2029bcb31084d4bb79f500f9dc277ee519f9adb7d83f50a6b9f5d59aaaa5`
- QA carrier commit/tree: `3e9dbfe4cde7b73a3424ae73ab7de03cc6cf7a38` / `6786c06457ea433547dfa96bc1303af1e0ed1f71`
- copied QA receipt SHA-256: `b01bbebf023bc90c11b968e04e1228ba56dc782dc48c5a2af71511a2cfab7a44`
- Audit carrier commit/tree: `1e3602ff6b345288f7e79c55658d1d9367c061a4` / `54355134b5d139428be36ba970fc27fa9caffbc9`
- copied Audit receipt SHA-256: `502b5c6217de0b866add57a19c3c4096a56734a8dee1823d38eaf41a33d7b46b`
- promotion handoff SHA-256: `4bee32bbf875b2873109d9445d7dff301504131b120b410a7e7957c88687ba81`
- governing unsatisfied Gate SHA-256: `10ca230f5f227e0c8733a557f4f841cdd651d759382ef88e375cddd815903710`
- promotion carrier commit/tree: the immutable enclosing Git commit and its tree, resolved exactly with `git rev-parse HEAD HEAD^{tree}` after creation; the exact values accompany this receipt's terminal result without introducing an impossible self-referential file hash.

## Measured evidence

- P1-P5: `5/5` satisfied with actual evidence in the committed Gate.
- changed paths: exactly the four handoff-allowlisted evidence paths.
- product/test byte changes against the exact parent: `0`.
- copied QA and Audit receipt byte mismatches: `0`.
- `git diff --check`: PASS.
- canonical dirty state before promotion: `117` entries, status SHA-256 `19de1029a11e330442396178433ae94d5f48bf9f94745e445c31850720fbe216`.
- residual unknowns: `[]`.

## Mutation and authority boundary

- registry/runtime/provider/environment/deployment/push/external mutation: `0`.
- canonical dirty/user-owned file mutation: `0`.
- predecessor archive/delete: `0`.
- false_completion_count: `0`.
- learning_receipt: independent QA and Release Audit receipts may be promoted only as byte-identical evidence above their exact Builder carrier; their PASS verdicts do not transfer acceptance or release authority.

This is one local evidence carrier only. It does not authorize or claim Cherry acceptance, deployment, release, Phase closure, `MVP_SCOPE_CLOSED`, or `EXTERNAL_OUTCOME_COMPLETE`.

Rollback: revert the exact enclosing promotion carrier commit after preserving any overlapping workspace changes. No external rollback is required.
