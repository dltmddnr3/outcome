# OUTCOME Model v2 canonical package promotion — Builder handoff

Status: **CHERRY AUTHORIZED · BUILDER EXECUTION ONLY · ACTIVE ROOT CUTOVER FORBIDDEN**

Canonical Gate: `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`

Milestone: exact accepted local-only Model v2 source becomes a durable isolated canonical-package candidate and emits a deterministic source-addressed Current Projection.

Expected user delta: Cherry can rely on one v2 projection for destination, remaining acceptance gap, Now, next boundary and Cherry action, while the existing dirty root and every external activation boundary remain unchanged.

## Exact source and authority

- Accepted source commit: `a40ee664e194c21554b0497382d499296cb2c52b`
- Tree: `6dcf343769ff08c6fd507de12baf3b0bbdb9c43b`
- Parent: `46b6d89cc09189739aab690a882c43cb7edd3723`
- Accepted Gate bytes: `GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md`, SHA-256 `50987cbba74c275ce5143c26d4ecb20c2fad377dfea2b7f50b75c621a989628f`
- Cherry acceptance receipt: `docs/OUTCOME_MODEL_V2_LOCAL_ACTIVATION_C1_CHERRY_ACCEPTANCE_RECEIPT.md`, SHA-256 `eefc0c06ddeb7eea1c135d4f97a97d630da445c1967efdc091885c25a1f89cf8`
- Current canonical root branch/base: `codex/hp1-session-bearer` at `517f436150b684a2f7d72f6144bfa848af397bb4`, tree `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c`
- Ancestry requirement: the canonical base must remain an ancestor of the accepted source.
- Authority: Cherry instructed the Planner to proceed sequentially with canonical promotion, projection regeneration, real-work dogfood and Phase 3 reassessment. This handoff covers only the isolated promotion candidate and projection generation. It does not authorize active-root cutover, Preview, Production, deployment, release or external mutation.

## Dirty-state boundary

The checked-out canonical root contains user-owned tracked and untracked changes, including current/map documents. Do not mutate that worktree or its checked-out branch ref.

- Pre-Gate root status fingerprint: `e9e907d0b0d9f5ef030f3bdeb589f48f149c17722af15a3a9c80b0d2943bdb11`
- Root tracked binary diff SHA-256: `f5338a0f7a19827923f466558478a30e0457bbc389b2aad22619bfd3d7af8eb1`
- The same status fingerprint must reproduce when excluding exactly:
  - `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`
  - `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_BUILDER_HANDOFF_20260901.md`

Any root content/ref/index/worktree mutation, unexpected ancestry drift or inability to reproduce the boundary is `SAFE_HOLD`. Do not stash, reset, clean, checkout, merge, cherry-pick into the root, or move `codex/hp1-session-bearer`.

## Required implementation

1. In the current isolated Builder worktree, re-pin clean HEAD/tree/parent to the exact accepted source.
2. Create and check out exactly one durable local candidate branch, `codex/model-v2-canonical-package-promotion-20260901`, starting at the accepted source. If that ref already exists with any other value, stop.
3. Copy the exact Planner-owned Gate and this handoff from the canonical root and preserve their bytes. Do not edit them.
4. Add the smallest deterministic Current Projection path that:
   - reads an exact source manifest from the candidate commit/worktree;
   - derives Project → Destination → Milestone → Acceptance Predicate state and Execution Graph inputs;
   - calculates only through Model v2 projection code: primary destination, acceptance gap, ready frontier, active work, next action and Cherry action;
   - emits a versioned local artifact with stable key order and byte-identical output for identical inputs;
   - fails `cold_compile_required` on any manifest/source digest drift;
   - exposes no local path, private locator, credential, raw prompt/result or canonical-transition authority.
5. Keep `scripts/outcome-model-v2-local-canary.mjs` as historical evidence. Do not overwrite its old pins. Reuse or minimally generalize production compiler functions only where tests prove the existing canary and v1/default behavior remain unchanged.
6. Add focused hostile tests for deterministic bytes, manifest drift, stale/conflict/delivery-unknown/no-active-work, forbidden shape/private data, rollback and projection-only authority.
7. Run the focused Model v2, bootstrap, package and relevant service projection regressions using existing dependencies only; no install or fetch.
8. Commit one semantic candidate and then one receipt carrier. The receipt must include exact commits/trees/parents, changed paths, artifact digest, two-run byte identity, test counts, rollback readback, root non-mutation evidence and all safety counters.

## Exact allowed paths

- `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md` — exact Planner bytes only
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_BUILDER_HANDOFF_20260901.md` — exact Planner bytes only
- `server/outcome-context-bootstrap.mjs`
- `server/outcome-context-bootstrap.test.mjs`
- `server/outcome-current-projection.mjs`
- `server/outcome-current-projection.test.mjs`
- `scripts/generate-outcome-current-projection.mjs`
- `snapshot/outcome-model-v2-current.json`
- `package.json`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_BUILDER_RECEIPT_20260901.md` — receipt carrier only

If the minimal correct implementation requires any other path, stop with `SAFE_HOLD` and name only the needed path and reason. Do not broaden scope yourself.

## Required checks

- candidate branch starts exactly at the accepted source and contains no merge commit;
- semantic diff contains only the allowed non-receipt paths;
- receipt carrier adds only the Builder receipt;
- two clean generator runs over unchanged inputs are byte-identical and digest-identical;
- one altered source byte produces `cold_compile_required` without fallback, retry or stale execution;
- old canary tests and accepted local-only activation/rollback tests remain green;
- absent or explicit rollback selection preserves the verified v1 compatibility boundary;
- root HEAD, branch, index, tracked diff hash and filtered status fingerprint are unchanged;
- automatic retries, duplicate executions, unauthorized transitions, false completions and external mutations are all zero.

## Forbidden

No active-root cutover, root ref movement, merge into `codex/hp1-session-bearer`, push, tag, Preview, Production, deployment, release, provider/database/credential/registry/environment mutation, persistent flag, listener, QA, Release Audit, Cherry acceptance, Phase transition, broad refactor or unrelated cleanup.

## Rollback

Delete only the new isolated candidate branch after recording its tip if the candidate is rejected; do not rewrite or delete accepted/history commits. Runtime rollback remains the already verified local v1 compatibility path. The canonical root remains unchanged throughout this handoff.

## Terminal

Return exactly `CANDIDATE_READY`, `SAFE_HOLD` or `BLOCKED`. `CANDIDATE_READY` must provide the semantic candidate and receipt carrier identities, exact path list, generator/artifact digest, deterministic and drift-negative evidence, tests, rollback, root non-mutation evidence, mutation/retry counters and `false_completion_count`.

Builder evidence is not independent QA, Release Audit, Cherry acceptance, active canonical cutover, dogfood completion, external activation, deployment, release or Phase completion.
