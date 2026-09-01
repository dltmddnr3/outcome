# OUTCOME Model v2 canonical package promotion — Builder receipt

Status: `CANDIDATE_READY`

Authority: Builder evidence for B1-B3 only. This receipt is not independent QA, Release Audit, Cherry acceptance, active-root cutover, dogfood completion, Preview, Production, deployment, release, external activation or Phase completion authority.

## Immutable lineage

- Candidate branch: `codex/model-v2-canonical-package-promotion-20260901`
- Accepted source commit: `a40ee664e194c21554b0497382d499296cb2c52b`
- Accepted source tree: `6dcf343769ff08c6fd507de12baf3b0bbdb9c43b`
- Accepted source parent: `46b6d89cc09189739aab690a882c43cb7edd3723`
- Semantic candidate commit: `8333a410e66ce154e9d3b5857b50fa9bb3c4df5f`
- Semantic candidate tree: `00b2fe6662a8a2e52e05a4afb970645828c5681e`
- Semantic candidate parent: `a40ee664e194c21554b0497382d499296cb2c52b`
- Merge commits between accepted source and semantic candidate: zero.
- Receipt carrier: the commit containing only this file; its commit/tree are read back after creation and reported with this receipt. Its required parent is the semantic candidate above.

## Exact semantic path list

- `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_BUILDER_HANDOFF_20260901.md`
- `package.json`
- `scripts/generate-outcome-current-projection.mjs`
- `server/outcome-current-projection.mjs`
- `server/outcome-current-projection.test.mjs`
- `snapshot/outcome-model-v2-current.json`

The receipt-carrier path is only `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_BUILDER_RECEIPT_20260901.md`. The historical `scripts/outcome-model-v2-local-canary.mjs` has no diff.

## Deterministic Current Projection evidence

- Generator: `node scripts/generate-outcome-current-projection.mjs`
- Generator entrypoint source: `scripts/generate-outcome-current-projection.mjs` at semantic candidate `8333a410e66ce154e9d3b5857b50fa9bb3c4df5f`.
- Artifact: `snapshot/outcome-model-v2-current.json`
- First-run artifact SHA-256: `3c91151af4694292d5a94ede1d39c29d6ab176510acb984e258519a094125ead`
- Second-run artifact SHA-256: `3c91151af4694292d5a94ede1d39c29d6ab176510acb984e258519a094125ead`
- First/second byte comparison: identical; 2,174 bytes.
- Projection content digest: `e0bb5a27f7ce91b825e0918b615c28b06912218ff69f4bbf039ec709cb59b21b`
- Source-manifest digest: `9b9165936dcd3ead2a632d31479671e6872620558cc21747b6bed0d72e6c6718`
- Altering one byte in each of the seven manifest source classes independently returned `cold_compile_required` with `reason=source_digest_drift`, no partial projection and automatic retry zero.
- The projection alone reports primary destination, remaining/closed/total acceptance gap, ready frontier, active work, next action and Cherry action. Its authority is exactly `projection_only`.
- Public serialization tests exclude local paths, private identifiers/locators, credential classes, provider payloads, raw prompt/result and canonical-transition authority.

## Verification

- Focused plus Model v2, bootstrap, package and account service projection regressions: 102 passed, 0 failed, 0 skipped.
- Exact command: `node --test server/outcome-current-projection.test.mjs server/outcome-model-v2.test.mjs server/outcome-context-bootstrap.test.mjs server/outcome-package.test.mjs server/account-model-v2-projection.test.mjs`.
- Existing dependencies only: the package suite used the already-present canonical-root dependency tree read-only from the isolated Builder cwd; the temporary local symlink was removed. No install or fetch occurred.
- Hostile coverage includes deterministic bytes, every manifest source drift, stale source, duplicate conflict, delivery unknown, no active work, active work, Proxy/accessor/extra-key shapes, private serialization, projection-only authority and rollback.
- `git diff --check`: pass.

## Rollback readback

Explicit `mode=v1_rollback` returned exactly:

```json
{"schema_version":1,"authority":"v1_compatible","outcome":"rollback_selected","original_value_required":true,"persistent_state_changed":false,"automatic_retry_count":0}
```

The existing package regression also proved unset configuration defaults to Model v2 while `OUTCOME_MODEL_V2_ENABLED=0` preserves exact v1 collection bytes. Rollback creates no listener, persistent flag or external state.

## Active-root non-mutation

- Active root HEAD: `517f436150b684a2f7d72f6144bfa848af397bb4`
- Active root branch: `codex/hp1-session-bearer`
- Active root branch ref: `517f436150b684a2f7d72f6144bfa848af397bb4`
- Active root tracked binary diff SHA-256: `f5338a0f7a19827923f466558478a30e0457bbc389b2aad22619bfd3d7af8eb1`
- Active root filtered NUL-terminated porcelain SHA-256, excluding exactly the Planner Gate and handoff: `e9e907d0b0d9f5ef030f3bdeb589f48f149c17722af15a3a9c80b0d2943bdb11`
- Active root staged binary diff SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Root worktree/index/ref mutation count: zero.

## Safety counters

- semantic candidate commits: 1
- receipt carrier commits: 1
- isolated candidate changed paths: 8, including this receipt carrier
- generator executions: 2
- automatic retry count: 0
- duplicate execution count: 0
- unauthorized canonical transition count: 0
- active-root mutation count: 0
- registry/provider/database/credential/environment/external mutation count: 0
- listener/persistent-flag mutation count: 0
- install/fetch/push/tag/deploy/release count: 0
- false_completion_count: 0

Rollback if rejected: record the receipt-carrier tip, then delete only the isolated candidate branch. Do not rewrite or delete the accepted source/history commits and do not mutate the canonical root.
