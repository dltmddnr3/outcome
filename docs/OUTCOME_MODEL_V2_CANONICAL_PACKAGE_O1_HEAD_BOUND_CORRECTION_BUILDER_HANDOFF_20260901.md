# OUTCOME Model v2 canonical package O1 — HEAD-bound canary correction Builder handoff

Outcome: bind default O1 canary source loading to the exact current Git HEAD tree so preserved user-owned working-tree overlays cannot substitute canonical bytes, while keeping explicit hostile fixture injection fail-closed.

Canonical Gate: existing `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md#O1`; O1 remains pending.

Authority: isolated correction candidate only. No active-root promotion, new final dogfood invocation, Gate closure, QA, Audit, external activation, deployment or release in this turn.

## Exact source and failure

- Active/accepted base: `5ac7960771f228d76956c0dc236907176d9748df`.
- Prior audited carrier: `e912c61ac718165e864a5e89478fa4690d11aa72`.
- Failed one-shot result: exit `2`, `cold_compile_required/source_digest_drift`; consumption/callback/receipt/duplicate/retry/false-completion all `0`.
- Expected HEAD Contract/Map SHA-256: `c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442` / `da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3`.
- Preserved working-tree Contract/Map SHA-256: `36860ad7...` / `37fbe565...`; Builder must independently compute and record full exact digests privately before work.
- Correction authority path and this handoff must be copied byte-identically from the active root; verify routed SHA-256 values before mutation.
- Protected Builder binding remains exact current version `18`, doctor clean and lock clear.

## Required RED-before-GREEN

1. In a disposable checkout of exact base `5ac7960...`, alter only working-tree `docs/OUTCOME_CONTRACT.md` and `docs/OUTCOME_MAP.md` while leaving HEAD unchanged. Invoke the existing default canary exactly once and reproduce `source_digest_drift`, consumption `0`.
2. After correction, repeat with the same dirty working-tree overlays. The default invocation must read every canonical source byte from one exact resolved HEAD tree and consume exactly once. The dirty overlay bytes and modes must remain unchanged.
3. Preserve an explicit fixture mode for hostile tests. A fixture with one-byte drift, missing input, symlink/type ambiguity, or extra/unapproved source must fail closed before plan compilation or callback with no fallback to HEAD, retry or mutation.

## Minimal implementation contract

Allowed implementation paths are exactly:

- `scripts/outcome-model-v2-local-canary.mjs`
- `server/outcome-current-projection.test.mjs`

Allowed evidence paths are exactly:

- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_HEAD_BOUND_CORRECTION_AUTHORITY_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_HEAD_BOUND_CORRECTION_BUILDER_HANDOFF_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_HEAD_BOUND_CORRECTION_BUILDER_RECEIPT_20260901.md`

Requirements:

1. Resolve repository root and `HEAD^{tree}` once before loading sources. Load default canonical bytes by exact Git object lookup from that tree, using non-shell argument-safe process invocation. Do not use working-tree reads, environment-selected refs, branch names, remote refs, index bytes or implicit fallback.
2. Reject a missing/unresolvable/non-tree HEAD, missing/non-blob source, submodule, symlink, path escape, duplicate source path, object lookup failure or changed digest as `cold_compile_required` with a finite public-safe reason, consumption/callback/retry/mutation `0`.
3. Preserve `--source-root <fixture>` solely as explicit fixture authority for existing hostile tests. It must load only ordinary non-symlink regular files beneath the resolved fixture root, reject path/type escape, and never fall back to HEAD when invalid.
4. Default HEAD-bound success must not disclose repository paths, object IDs, command output, private locators or raw source bytes. Public output digests and existing source classes remain unchanged.
5. Preserve corrected duplicate protection: one adapter consumes once, second same-plan call fails `safe_hold/duplicate_context_plan` before callback; fresh adapter may consume once.
6. Preserve projection `7/8`, frontier `milestone-o1`, selected next action `work-o1-selective-context-dogfood`, null Cherry action/active work, rollback, six loaded/six skipped classes, sole role skill `mango-implementation-engineer`, empty expansions and null handoff.
7. Expected successful digests remain projection `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`, projection source manifest `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`, selector manifest `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361`, snapshot `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`, plan `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
8. Add RED-before-GREEN tests for dirty Contract/Map overlays ignored by default HEAD binding, explicit fixture drift/missing/symlink rejection, unresolved HEAD/object failure where deterministically injectable, callback counts and unchanged overlay bytes/modes.
9. Run the focused/core set, full relevant regression and `git diff --check`. Scan public output and receipt for private values; hits zero.

## Candidate and terminal contract

Create one single-parent correction candidate above exact accepted base `5ac7960...` and one Builder receipt carrier. Publish the receipt carrier under a durable local branch. Do not mutate or fast-forward the active root.

Return exactly `HEAD_BOUND_CORRECTION_CANDIDATE_READY`, `SAFE_HOLD`, or `BLOCKED`, with candidate and receipt carrier/tree/parent, changed paths, RED/GREEN counts, default/fixture results, overlay preservation, digests, callback/consumption/duplicate and safety counters, tests, active-root readback, durable branch, rollback and `false_completion_count`.
