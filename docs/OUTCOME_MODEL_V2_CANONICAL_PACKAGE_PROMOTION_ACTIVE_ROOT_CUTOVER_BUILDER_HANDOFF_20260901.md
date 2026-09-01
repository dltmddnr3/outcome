# OUTCOME Model v2 canonical package promotion — active-root cutover Builder handoff

Status: **CHERRY C1 ACCEPTED · ONE DIRTY-AWARE CUTOVER ATTEMPT AUTHORIZED**

Delivery recovery: the first routed Builder turn became active but produced no assistant message, tool marker or terminal result, then completed empty after repeated bounded readback. Root and candidate mutation were not observed. It is `delivery_unknown`, not an execution attempt or completion. A same-role successor may use isolated branch `codex/model-v2-canonical-cutover-20260901` starting at the exact Audit carrier; the old candidate branch remains recoverable history.

Canonical Gate: `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`

Milestone: promote the exact C1-accepted canonical-package candidate to the checked-out canonical branch without changing any unrelated user-owned bytes or expanding into dogfood/external activation.

## Exact authority and source

- Cherry authority: exact `승인` received 2026-09-01 KST for Audit carrier `66a8a79447e07140e4cf976c51dcf83a0c79e783` and a separate dirty-aware cutover handoff.
- Audit carrier / tree / parent: `66a8a79447e07140e4cf976c51dcf83a0c79e783` / `85db5b484e9aece1586d2746812bff7689bab9b4` / `12c49b2b9486717d64a3c0c20ba17d42305c753f`
- Audit receipt SHA-256: `1a9297b76a53b7158da6ce9e4dd3bce460c29f0c77a42fad5d0ae464002075e6`
- Active root: `/Users/rosum/Documents/ChatGPT/OUTCOME`
- Active branch / base / tree: `codex/hp1-session-bearer` / `517f436150b684a2f7d72f6144bfa848af397bb4` / `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c`
- Required ancestry: active base is an ancestor of the Audit carrier and of every new carrier created here.

## Exact Planner bytes

Copy these paths from the active root into the isolated candidate branch and preserve their exact bytes:

- `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md` — SHA-256 `1a579c743b08cf6ae0b058eb2aab9046340c83994fd731324de0ac9e55abd8a9`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_C1_CHERRY_ACCEPTANCE_RECEIPT_20260901.md` — SHA-256 `417d36deb92daf30f1a6c96f7d2c71567a071ff82d03c7d39df0d0f839f873dd`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_C1_CHERRY_DECISION_20260901.md` — SHA-256 `df4d4963a076af00615c4623fbb0d96fae4d0e7b15568efdb2f87f7d55691f15`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_ACTIVE_ROOT_CUTOVER_BUILDER_HANDOFF_20260901.md` — verify the routed SHA-256 before work; exact bytes only.

## Pre-cutover dirty boundary

- Root tracked binary diff SHA-256: `f5338a0f7a19827923f466558478a30e0457bbc389b2aad22619bfd3d7af8eb1`
- Root staged binary diff SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Root filtered NUL-porcelain SHA-256: `e9e907d0b0d9f5ef030f3bdeb589f48f149c17722af15a3a9c80b0d2943bdb11`
- The filtered status excludes exactly the Gate, Builder handoff, QA handoff, Audit handoff, C1 decision, C1 receipt and this cutover handoff.

Before mutation, build a content-addressed manifest for every dirty tracked/index path and every untracked path. Record path, class, mode and content/blob digest privately; the public receipt may include only aggregate digests and finite counts.

## Execution sequence

1. Reverify current protected Builder self-match, exact root and isolated-worktree pins, clean candidate worktree, Audit ancestry and all Planner hashes.
2. In the successor worktree create exactly `codex/model-v2-canonical-cutover-20260901` at the Audit carrier, or if already present require that it resolves exactly to the Audit carrier. No merge commit, cherry-pick or rewrite.
3. Copy only the four exact Planner paths above, create one docs-only C1 acceptance carrier, and re-pin its commit/tree/parent/path list.
4. Compute the exact transition path set from active base to the C1 acceptance carrier and intersect it with every dirty/index/untracked root path.
5. Classify each intersection:
   - `exact_target_bytes`: current root bytes and mode exactly equal the target tree entry;
   - `nonidentical_or_unrepresentable`: any byte/mode/type/symlink/index ambiguity.
6. If any intersection is `nonidentical_or_unrepresentable`, return `SAFE_HOLD` with mutation count zero for the active root. Do not merge, resolve, stage, stash, reset, checkout or clean.
7. If intersections are empty, run one non-interactive `git merge --ff-only <C1 acceptance carrier>` in the active root.
8. If all intersections are `exact_target_bytes`, a transactional collision quarantine is allowed only for those exact paths:
   - create a private temporary recovery directory with a manifest;
   - move only untracked exact-target collisions or temporarily save only tracked exact-target working bytes that Git proves would block the fast-forward;
   - install no helper and do not touch any non-transition path;
   - run exactly one `git merge --ff-only <C1 acceptance carrier>`;
   - verify every promoted target path equals both its target blob and saved digest;
   - on any failure, restore every saved byte/mode before returning `SAFE_HOLD` and leave the branch at the pre-cutover base if Git did not advance. If Git advanced but verification is ambiguous, stop and report `BLOCKED`; do not reset.
9. After a successful first fast-forward, prove all unrelated tracked/index/untracked manifests remain byte/mode-identical, the active branch resolves to the C1 carrier, worktree transition paths equal target, and no temporary recovery residue remains.
10. In the isolated Builder branch, add only `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_ACTIVE_ROOT_CUTOVER_BUILDER_RECEIPT_20260901.md` and create one receipt carrier commit.
11. Fast-forward the active root once more to that receipt carrier only if the sole added receipt path does not collide. Re-read branch, HEAD, tree, parent, status, all unrelated manifests, receipt hash and rollback boundary.

## Required successful outcome

- Active `codex/hp1-session-bearer` resolves to the final cutover receipt carrier.
- The final carrier is a linear descendant of the accepted Audit carrier and contains the exact C1 Gate/decision/acceptance bytes.
- Every unrelated pre-existing dirty tracked/index/untracked byte and mode is preserved exactly.
- All promoted transition paths equal target-tree bytes; any formerly untracked exact-target path is now canonical by C1 authority, not silently discarded.
- Candidate branch and active branch resolve to the same final receipt carrier.
- Root has no merge/rebase/cherry-pick state, lock, temporary recovery residue or unintended staged path.
- No Preview, Production, dogfood, deployment, release, external activation, provider/database/credential/registry/environment mutation or Phase transition occurs.

## Forbidden

No conflict resolution, content synthesis, force update, hard/mixed reset, stash, clean, broad checkout, history rewrite, push, tag, test/product amendment, QA, Audit, self-acceptance, dogfood or external mutation. Do not treat a ref-only update with a stale index/worktree as successful cutover.

## Rollback

Before the active fast-forward, leave the root unchanged. During transactional quarantine, restore exact saved bytes/modes on any pre-merge failure. After a verified fast-forward, do not move the branch backward or rewrite history; the receipt must define a later explicit revert/forward rollback candidate if needed.

## Terminal contract

Return exactly `CUTOVER_COMPLETE`, `SAFE_HOLD` or `BLOCKED`.

`CUTOVER_COMPLETE` must include C1 acceptance carrier and final receipt carrier commit/tree/parent, exact changed paths, transition/intersection classification counts, pre/post unrelated manifest digests, active-root branch/HEAD readback, recovery cleanup, rollback statement, mutation/retry counters and `false_completion_count`.

This cutover completes only the local canonical-package promotion. It does not complete real-work dogfood, Phase 3 reassessment, Preview, Production, deployment, release or external activation.
