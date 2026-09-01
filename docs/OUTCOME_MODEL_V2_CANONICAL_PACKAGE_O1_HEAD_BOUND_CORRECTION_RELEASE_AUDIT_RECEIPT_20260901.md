# OUTCOME Model v2 canonical package O1 HEAD-bound correction — Release Audit receipt

Status: **PASS_RELEASE_AUDIT_ONLY**

Authority: fresh independent read-only Release Audit of exact QA carrier `8711041993e72bfd84ad1c98e5d2e2368d73166a`. This receipt does not promote, invoke final dogfood, close O1, accept, activate, deploy, release, push, or mutate registry/provider/environment state.

## Commit pin and release scope

- Active accepted base/tree: `5ac7960771f228d76956c0dc236907176d9748df` / `4268d1678148c62c9869ca1e081da7dbf446221a`.
- Correction candidate/tree/parent: `53760126b23435a9733fa004045bc71b944635dc` / `feeecb18d8eafa77bf98b99a09f1c13b248522f6` / exact active base.
- Builder carrier/tree/parent: `3ff57b67570b00012d8c13915cad9016bc333cf9` / `b74c10a20011f1e829e1c6f3cf74126214d2b462` / exact correction candidate. Builder receipt SHA-256: `bf4c47beb2b1c3958ba5feaa53716b5c5a8ab73e39046896351ecf46762a69dd`.
- QA carrier/tree/parent: `8711041993e72bfd84ad1c98e5d2e2368d73166a` / `e642aa02721e0d503482a5fbcb435b303db56ea9` / exact Builder carrier. QA receipt SHA-256: `786e7e732c354f9d1f8209e66cebe152706994b0fc6eb0c4406adc1f30cc3cad`.
- Implementation scope is exactly `scripts/outcome-model-v2-local-canary.mjs` and `server/outcome-current-projection.test.mjs`, `77` insertions and `6` deletions. The Builder and QA carriers add evidence only.

## RED, GREEN, and hostile matrix

- Base RED at exact active base with dirty Contract/Map overlays exited `2` as `cold_compile_required/source_digest_drift`; consumption was absent, automatic retry and all safety counters were `0`, and overlay bytes were unchanged.
- Corrected default mode consumed one in-memory probe from the exact `HEAD^{tree}` while hostile working-tree and staged-index overlays remained byte-for-byte unchanged. Two normal outputs were byte-identical.
- Ambient `GIT_DIR` and `GIT_WORK_TREE` substitution, missing object storage, non-tree HEAD, committed symlink and gitlink sources, duplicate source paths, and traversal source paths all failed as `canonical_source_unavailable` with consumption/retry `0`.
- A checkout path containing shell metacharacters was treated literally and consumed the exact HEAD tree. No shell interpolation path was present.
- Explicit fixture mode accepted the exact ordinary-file fixture. Symlink root/source and extra input failed as `source_input_invalid` or `invalid_source_root`, with no HEAD fallback, consumption, or retry. Focused tests independently covered snapshot byte drift, missing input, type ambiguity, and source symlink rejection.
- Duplicate-plan, forged-plan, Proxy/accessor, source-manifest drift, snapshot drift/missing, wrong-role, expansion, default-off, and rollback boundaries remained fail-closed in the core suite.

## Deterministic runtime evidence and digests

- Projection digest: `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`.
- Projection source-manifest digest: `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`.
- Selector source-manifest digest: `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361`.
- Snapshot digest: `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`.
- Plan digest: `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Loaded/skipped source classes were exactly `6/6`; the disposable successful probe reported local consumption `1`. Execution-started, automatic retry, duplicate execution, persistent-setting mutation, registry/provider/environment mutation, unauthorized canonical transition, and false completion counters were all `0`.

## Regression, privacy, accessibility, and rollback

- Focused correction suite: `10/10` passed. Core selector/model suite: `41/41` passed. Full server suite: `411/411` passed. UI/library regression: `99/99` passed across `7/7` files. Both implementation and evidence deltas passed `git diff --check`.
- The correction changes no UI or interaction surface; accessibility scope is unchanged. The full `99/99` UI/library regression found no affected rendering, motion, focus, or semantic surface requiring new visual evidence.
- Public canary output contained zero absolute local path, runtime directory, private task/session/thread/turn identifier, credential/secret/token, raw prompt/result, source ref, locator ref, or registry payload hits.
- Static correction diff introduced no listener, persistent write, feature flag, registry/provider/environment access, or external activation path. Rollback remains the exact active base; rejecting this Audit requires reverting only this receipt carrier and preserves the QA/Builder evidence lineage.

## Active-root and protected-role readback

- Active root remained branch `codex/hp1-session-bearer`, HEAD/tree `5ac7960771f228d76956c0dc236907176d9748df` / `4268d1678148c62c9869ca1e081da7dbf446221a`; staged entries and Git operation residue were `0`.
- Active working Contract/Map SHA-256 remained `36860ad7e0103170c6f1be3eaa25a221b873ccf1b46b668f0d684c385412851f` / `37fbe565e42cad9516ceb96a4ed07070fa9ce74d69b40a3c339104076dee9c37`.
- Excluding exactly the twelve named O1 handoff/checkpoint paths introduced after the cutover baseline, the independently reconstructed structured dirty manifest remained `396` entries / SHA-256 `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- O1 remained `DOGFOOD PENDING`; no authorized active-root final dogfood invocation occurred. All successful consumptions in this Audit were isolated in-memory probes in disposable checkouts.
- Protected Release Audit binding remained uniquely active at version/history `24/24`, exact self-match `1`, registry revision `116`, doctor clean, issues `0`, lock clear. No Audit-time registry mutation occurred.

## Quality review, exclusions, and verdict

- Quality score: `100/100` against the routed seven-item Audit matrix: lineage/scope, RED/GREEN, hostile Git authority, hostile fixture authority, deterministic safety/privacy, full regression, and active-root non-mutation all passed with pinned evidence.
- Regressions: none found.
- Residual exclusions: promotion, final active-root dogfood, O1 closure, Cherry acceptance, Preview, Production, deployment, release, external activation, and Phase completion remain outside this receipt. They are not implied by this PASS.
- Verdict: `PASS_RELEASE_AUDIT_ONLY`.
