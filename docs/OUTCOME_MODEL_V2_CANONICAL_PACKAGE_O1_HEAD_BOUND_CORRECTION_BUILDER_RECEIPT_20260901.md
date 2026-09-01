# OUTCOME Model v2 canonical package O1 — HEAD-bound canary correction Builder receipt

Status: **HEAD_BOUND_CORRECTION_CANDIDATE_READY**

Canonical Gate remains `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md#O1` pending. This receipt proves an isolated Builder candidate only; it is not QA, Release Audit, promotion, final dogfood, acceptance, deployment, release or Phase completion evidence.

## Identity and scope

- Accepted base / rollback: `5ac7960771f228d76956c0dc236907176d9748df`.
- Single-parent correction candidate / tree / parent: `53760126b23435a9733fa004045bc71b944635dc` / `feeecb18d8eafa77bf98b99a09f1c13b248522f6` / `5ac7960771f228d76956c0dc236907176d9748df`.
- Candidate changes exactly `scripts/outcome-model-v2-local-canary.mjs` and `server/outcome-current-projection.test.mjs`: `77` insertions, `6` deletions.
- Evidence carrier adds only the routed authority, routed handoff and this receipt above the candidate.
- Durable local branch: `codex/o1-head-bound-canary-correction-20260901`.

## RED-before-GREEN and source boundary

- RED used a disposable checkout of exact base with only Contract/Map working-tree overlays. The pre-correction default canary exited `2` as `cold_compile_required/source_digest_drift`; consumption, callback, receipt, duplicate and retry counts were `0`.
- GREEN resolves the repository root and one `HEAD^{tree}`, then loads each exact allowlisted source as an ordinary Git blob through argument-safe child-process calls. It uses no working-tree, index, branch, remote or environment-selected ref bytes and has no fallback.
- A dirty-overlay GREEN test consumed once while preserving Contract/Map byte hashes and modes exactly. An unresolved HEAD fails `canonical_source_unavailable` before consumption.
- Explicit `--source-root` remains fixture-only. One-byte drift returns `source_digest_drift`; missing input returns `source_input_missing`; symlink/type ambiguity returns `source_input_invalid`; extra arguments return `invalid_source_root`. Every failure is finite, retry-free and has no fallback to HEAD.
- Static source paths must be unique, relative and traversal-free. Default Git rows must resolve singly to mode `100644` or `100755`, type `blob`, and a valid object name; fixture inputs must be ordinary non-symlink regular files beneath the canonical fixture root.

## Immutable candidate verification

- Focused/core Node: `41/41` PASS.
- Full server: `411/411` PASS.
- Full UI/library: `99/99` PASS across `7/7` files.
- `git diff --check`: PASS.
- Existing canonical dependency tree was linked read-only only during isolated regression execution, then removed. Install/fetch counts are `0/0`; dependency-link residue is `0`.
- Default HEAD and explicit clean fixture invocations both returned `o1_local_dogfood_probe_consumed` with local consumption `1` and callback `1`. These were isolated candidate checks, not the authorized active-root final dogfood attempt.
- Duplicate protection remains covered by the focused/core suite: same-adapter second consumption fails before callback; a fresh adapter may consume once.

## Stable public results

- Projection digest: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`.
- Projection source manifest: `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`.
- Selector manifest: `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361`.
- Snapshot: `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`.
- Plan: `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Loaded/skipped classes remain `6/6`; expansion count remains `0`; sole role skill remains `mango-implementation-engineer`.
- Safety counters: execution-started, automatic retry, duplicate execution, persistent-setting mutation, registry/provider/environment mutation, unauthorized canonical transition and false completion are all `0`.
- Public-output and receipt scan found private locator, absolute path, raw source byte and command-output disclosures: `0`.

## Preserved active state and next boundary

- Immediately before candidate commit, the active root remained on `codex/hp1-session-bearer` at accepted carrier/tree `5ac7960771f228d76956c0dc236907176d9748df` / `4268d1678148c62c9869ca1e081da7dbf446221a`, with staged entries `0`.
- Preserved active Contract/Map hashes remained `36860ad7e0103170c6f1be3eaa25a221b873ccf1b46b668f0d684c385412851f` / `37fbe565e42cad9516ceb96a4ed07070fa9ce74d69b40a3c339104076dee9c37`, both mode `0644`.
- Active-root mutation, fast-forward, quarantine, final dogfood, registry/provider/database/credential/environment mutation, Preview, Production, deployment and release counts are all `0`.
- Fresh independent UX & Product QA and separate Release Audit must evaluate the immutable receipt carrier before any promotion or new final dogfood attempt.
