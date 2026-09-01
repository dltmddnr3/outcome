# OUTCOME Model v2 canonical package O1 HEAD-bound correction — fresh UX & Product QA receipt

Status: **PASS_UX_PRODUCT_QA_ONLY**

Authority: fresh independent read-only QA of exact Builder receipt carrier `3ff57b67570b00012d8c13915cad9016bc333cf9`. This receipt does not promote or fast-forward the active root, perform final dogfood consumption, close O1, activate, deploy, release, accept the candidate, or mutate provider/runtime/environment state.

## Exact subject, lineage, and scope

- Accepted active base/tree: `5ac7960771f228d76956c0dc236907176d9748df` / `4268d1678148c62c9869ca1e081da7dbf446221a`.
- Correction candidate/tree/parent: `53760126b23435a9733fa004045bc71b944635dc` / `feeecb18d8eafa77bf98b99a09f1c13b248522f6` / exact active base.
- Builder receipt carrier/tree/parent: `3ff57b67570b00012d8c13915cad9016bc333cf9` / `b74c10a20011f1e829e1c6f3cf74126214d2b462` / exact correction candidate.
- Builder receipt SHA-256: `bf4c47beb2b1c3958ba5feaa53716b5c5a8ab73e39046896351ecf46762a69dd`.
- Fresh QA handoff SHA-256: `c2e54c5851bac7ce8d44f7363e5f7315527f60d44ad15719140fc17073c78d08`.
- Correction implementation changes exactly `scripts/outcome-model-v2-local-canary.mjs` and `server/outcome-current-projection.test.mjs`. The Builder carrier adds only the authority, Builder handoff, and Builder receipt evidence paths.

## RED-before-GREEN and HEAD authority

- Base RED reproduced at unchanged HEAD `5ac7960771f228d76956c0dc236907176d9748df`: hostile dirty Contract and Map overlays caused exit `2`, `cold_compile_required/source_digest_drift`, local consumption absent, callback/receipt `0/0`, retry `0`, and all safety counters `0`. Both overlay bytes remained unchanged.
- Correction default mode resolved one exact repository root and one exact `HEAD^{tree}`, accepted only ordinary `100644`/`100755` blob entries, and read every canonical source by object identity. Dirty working-tree replacement and index-only bytes were ignored without modification; consumption/callback/receipt were `1/1/1`.
- Working-tree Contract/Map byte digests and modes plus the index digest were identical before and after the correction probe. The probe neither staged nor restored user bytes.

## Hostile independent checks

- Default mode rejected non-HEAD bytes or unavailable authority for alternate Git directory/worktree state, missing object storage, committed symlink/type substitution, and unresolvable HEAD. Shell-metacharacter checkout paths were treated as literal paths and consumed the exact HEAD tree.
- Working-tree replacement and index-only source bytes could not substitute for HEAD bytes. Environment/object substitution with drift failed closed as `source_digest_drift` or `canonical_source_unavailable`; no object/path detail appeared in the public result.
- Explicit `--source-root` accepted the exact ordinary-file fixture. One-byte snapshot drift, missing source, symlink root/source, directory/type substitution, and extra CLI input failed before consumption with no fallback to HEAD.
- Same-adapter duplicate prevention returned first `locally_consumed`, second `safe_hold/duplicate_context_plan`, callback count `1`, and duplicate count `1`. A fresh adapter accepted the same immutable plan exactly once.
- Snapshot drift/missing, hostile Proxy/accessor/hidden/decorated/extra-key inputs, forged ready plans, wrong-role plans, invalid expansions, privacy serialization, and rollback boundaries all failed closed before traps or callbacks where required.
- Two normal default-mode canary outputs were byte-identical. `git diff --check` passed for both the correction delta and evidence-carrier delta.

## Preserved projection and source contract

- Accepted product candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`.
- Projection digest: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`.
- Projection source-manifest digest: `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`.
- Selector source-manifest digest: `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361`.
- Snapshot digest: `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`.
- Plan digest: `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Projection remained `7/8`, ready frontier `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action and active work null, rollback available, and all ordinary safety counters `0`.
- Loaded/skipped source classes were exactly `6/6`; the sole role skill was `mango-implementation-engineer`; current handoff was null; expansion allowlist and expansions were empty.
- Public canary output and receipts disclosed zero private locator, local path, raw prompt/result, credential value, registry payload, or active-root user-owned bytes.

## Regression, isolation, and active-root readback

- Focused correction suite: `10/10` passed. Core selector/model suite: `41/41` passed. Full regression: `510/510` passed (`99` UI/library plus `411` server). `git diff --check`: PASS.
- QA ran only in disposable isolated exact-object checkouts. The active root remained branch `codex/hp1-session-bearer`, HEAD/tree `5ac7960771f228d76956c0dc236907176d9748df` / `4268d1678148c62c9869ca1e081da7dbf446221a`; index entries remained `0`.
- Active-root canonical HEAD Contract/Map SHA-256 remained `c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442` / `da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3`. User-owned working bytes remained distinct and unchanged.
- Excluding exactly the ten named Planner O1 handoff/checkpoint paths introduced after the established cutover boundary, the active-root structured dirty manifest independently reproduced `396` entries / SHA-256 `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- Active-root status and index fingerprints were unchanged across QA. O1 remained explicitly pending and no final dogfood attempt was invoked.
- Protected QA binding remained version/history `33/33`, exact self-match `1`, active count `1`, registry revision `115`, doctor clean, issues `0`, lock clear. The QA work performed no registry mutation after the authorized pre-QA CAS.
- Product/source, active-root, final-dogfood, retry/replay, Preview, Production, deployment, release, external activation, provider/runtime/environment, Phase-transition, unauthorized-transition, and false-completion mutation counts were all `0`.

## Rollback and terminal boundary

If rejected, revert only the commit carrying this QA receipt. Preserve the immutable Builder correction/carrier, active-root dirty bytes, predecessor binding history, and registry evidence. Separate fresh Release Audit is the next authorized verification boundary.

Terminal boundary: `PASS_UX_PRODUCT_QA_ONLY`.
