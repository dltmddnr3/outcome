# OUTCOME Model v2 canonical package promotion — preserve-then-replace cutover correction

Status: **CHERRY AUTHORIZED RECOMMENDED PATH · BUILDER EXECUTION ONLY**

Canonical Gate: `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`

Cherry authority: after the first cutover safely held on two nonidentical Gate collisions, Cherry instructed `권장 경로로 진행`. This authorizes preserving those two exact root versions as supporting history, replacing only their canonical paths with the audited target versions, and retrying the bounded fast-forward cutover. It does not authorize any other dirty-file replacement or content merge.

## Exact pins

- C1 carrier / tree / parent: `6beb53cc504e27b0224a9ee7a89d6fa22ced36ce` / `2636adb2e3d49a163b54d6780b430743bad8472a` / `66a8a79447e07140e4cf976c51dcf83a0c79e783`
- Isolated branch: `codex/model-v2-canonical-cutover-20260901`, expected at the C1 carrier.
- Active root branch/base/tree: `codex/hp1-session-bearer` / `517f436150b684a2f7d72f6144bfa848af397bb4` / `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c`
- First preflight: transition paths `83`; dirty intersections `9`; exact-target intersections `7`; approved nonidentical intersections `2`; active-root merge attempts/mutations `0/0`.
- Unrelated pre-cutover manifest: entries `396`, SHA-256 `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.

## Exact approved nonidentical paths

1. `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md`
   - pre-cutover root SHA-256: `1e91fb8117b17a4a58ce9e5f005cc4d3b834c25e9df3340e97d471fa9f1c2f85`
   - audited target SHA-256: `b6c156c60cfca729c261641a96401590f44d9e47845d5ae34dd4a028790e7357`
   - supporting-history destination: `docs/supporting-history/GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_ROOT_PRE_CUTOVER_20260901.md`
2. `GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md`
   - pre-cutover root SHA-256: `854274ad793daa8403219af8f05ff6d8b84b3ac845da70d244aa7826dc39bb05`
   - audited target SHA-256: `50987cbba74c275ce5143c26d4ecb20c2fad377dfea2b7f50b75c621a989628f`
   - supporting-history destination: `docs/supporting-history/GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION_ROOT_PRE_CUTOVER_20260901.md`

The root versions are older/open evidence views. The audited targets are the accepted closed evidence. Preserve does not make the older copies current authority; the supporting-history filenames and receipt must label them non-current.

## Planner-owned correction inputs

- `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md` — routed SHA-256 must match.
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_PRESERVE_REPLACE_CUTOVER_BUILDER_HANDOFF_20260901.md` — routed SHA-256 must match.

Copy both as exact bytes. Do not edit them.

## Execution

1. Reverify Builder binding v18/self-match 1, doctor clean, lock clear, clean isolated branch at exact C1 carrier, active root exact base/ref/tree, the two pre-cutover root hashes, both target hashes and the unrelated manifest digest.
2. In the isolated branch:
   - add the two supporting-history destinations by copying the exact pre-cutover root bytes;
   - update only the canonical promotion Gate with the exact Planner bytes;
   - add this exact correction handoff;
   - create one correction carrier commit above the C1 carrier.
3. Recompute the transition/dirty intersection against the correction carrier. Every intersection other than the two approved paths must be `exact_target_bytes`; the two approved paths must match their exact pre-cutover hashes and modes. Any additional/nonmatching collision is `SAFE_HOLD` before root mutation.
4. Create a private temporary recovery directory and manifest. Move to it only:
   - exact-target untracked collisions that would block the fast-forward; and
   - the two approved nonidentical Gate paths.
   Do not touch unrelated paths. The saved two Gate files must equal the correction carrier's supporting-history blobs before continuing.
5. Run one `git merge --ff-only <correction carrier>` in the active root.
6. Verify immediately:
   - active branch/HEAD equals the correction carrier;
   - the two canonical Gate paths equal audited target hashes;
   - the two supporting-history paths equal the saved/pre-cutover hashes;
   - every exact-target collision equals its target blob;
   - the unrelated manifest remains `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`;
   - index has no unintended staged entry; no merge/rebase/cherry-pick state exists.
7. If verification fails before merge, restore exact saved bytes/modes and return `SAFE_HOLD`. If Git advanced and post-merge verification is ambiguous, retain recovery material and return `BLOCKED`; never reset or rewrite.
8. After verified cutover, remove only the private temporary duplicate recovery copies. The durable supporting-history copies remain in Git.
9. Add only `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_ACTIVE_ROOT_CUTOVER_BUILDER_RECEIPT_20260901.md` in the isolated branch and commit one receipt carrier.
10. Fast-forward the active root once to the receipt carrier after proving the sole receipt path has no collision. Reverify branch/HEAD/tree/parent, receipt hash, canonical/archived Gate hashes, unrelated manifest, dirty/index state, cleanup and rollback boundary.

## Allowed candidate paths

- `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_PRESERVE_REPLACE_CUTOVER_BUILDER_HANDOFF_20260901.md`
- `docs/supporting-history/GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_ROOT_PRE_CUTOVER_20260901.md`
- `docs/supporting-history/GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION_ROOT_PRE_CUTOVER_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_ACTIVE_ROOT_CUTOVER_BUILDER_RECEIPT_20260901.md` — receipt carrier only

The canonical audited Gate files are already exact in the C1 parent and are replaced in the root only by the authorized fast-forward; do not amend them in the correction carrier.

## Forbidden

No other dirty-path replacement, content merge, conflict resolution, stash, reset, clean, force update, broad checkout, history rewrite, push, tag, product/test amendment, QA, Audit, dogfood, Preview, Production, deployment, release, external activation, provider/database/credential/registry/environment mutation or Phase transition.

## Rollback

Before fast-forward, restore quarantined bytes on failure and leave the root at the old base. After verified fast-forward, do not move history backward. The durable supporting-history copies preserve the prior Gate bytes, and any later rollback requires a separate history-preserving revert/forward candidate.

## Terminal

Return exactly `CUTOVER_COMPLETE`, `SAFE_HOLD` or `BLOCKED`.

`CUTOVER_COMPLETE` must report correction carrier and final receipt carrier commit/tree/parent, exact paths, pre/post canonical and archive hashes, transition/intersection/quarantine counts, pre/post unrelated manifest digest, active branch/HEAD readback, staged/merge/temp residue counts, rollback statement, mutation/retry counters and `false_completion_count`.

This completes only local canonical-package promotion. Dogfood and Phase 3 reassessment remain next and external activation remains excluded.
