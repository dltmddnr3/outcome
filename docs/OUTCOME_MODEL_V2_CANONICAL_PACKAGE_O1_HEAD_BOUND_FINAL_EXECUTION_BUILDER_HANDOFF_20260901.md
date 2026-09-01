# OUTCOME Model v2 canonical package O1 — HEAD-bound final execution Builder handoff

Status: **QA AND RELEASE AUDIT PASS · CHERRY-AUTHORIZED NEW ONE-SHOT EXECUTION READY**

Outcome: dirty-aware promote the exact audited HEAD-bound correction, execute the newly authorized final active-root dogfood once, and close only O1 if every predicate passes.

## Exact authority and subject

- Cherry authority: `사용자 작업 트리 바이트를 변경하지 않는 HEAD-bound canary 전진 수정, 독립 QA·Release Audit, 통과 후 새로운 최종 dogfood 1회 실행을 승인합니다. 외부 활성화·배포·출시는 제외합니다.`
- Current active root / branch: `5ac7960771f228d76956c0dc236907176d9748df` / `codex/hp1-session-bearer`.
- Builder carrier: `3ff57b67570b00012d8c13915cad9016bc333cf9`; receipt SHA `bf4c47beb2b1c3958ba5feaa53716b5c5a8ab73e39046896351ecf46762a69dd`.
- Fresh QA carrier: `8711041993e72bfd84ad1c98e5d2e2368d73166a`; receipt SHA `786e7e732c354f9d1f8209e66cebe152706994b0fc6eb0c4406adc1f30cc3cad`.
- Release Audit PASS carrier/tree/parent: `46256105d8457e505de08094c5cd997fb731c053` / `62d85277e2d506ed1ddf8e91dceca99a4c5c0e11` / exact QA carrier.
- Audit receipt SHA-256: `ef597d1d1c3876693ff5d6c5c6e83534b1ce56404fa991ebd9d47d00e56b313d`.
- Durable Audit branch: `codex/o1-head-bound-correction-release-audit-pass-20260901`.
- Active-root unrelated dirty baseline, excluding all named Planner O1 inputs: `396` / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`; index zero.

## One bounded sequence

1. Reverify Audit lineage/receipt, protected Builder v18 exact self-match, doctor clean, lock clear, active root/branch/index, full dirty byte+mode manifest, Contract/Map working digests and all Planner input hashes.
2. Compute transition paths from active root to Audit carrier and intersect with all dirty/index/untracked paths. Transactionally quarantine only exact-target regular untracked collisions. Any nonidentical/type/mode/symlink/index ambiguity is `SAFE_HOLD` before mutation.
3. Run exactly one `git merge --ff-only 46256105...` in the active root. Verify every target blob, unrelated manifest parity, Contract/Map overlay parity, index zero and no operation/recovery residue.
4. Reverify binding and HEAD immediately before execution. Invoke the committed corrected default canary exactly once from the active root with `OUTCOME_MODEL_V2_ENABLED=1` and required explicit local O1 probe authority. No `--source-root`, retry, replay or second process.
5. Require exit `0`, outcome `o1_local_dogfood_probe_consumed`, consumption/callback/receipt `1/1/1`, duplicate/retry/execution-started/persistent-setting/registry-provider-environment/unauthorized-transition/false-completion `0`.
6. Require exact projection/source/selector/snapshot/plan digests `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea` / `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c` / `a5e39938e12bd15dd1c24576070ca70842309cee643ec2b7c7ed024e1f255361` / `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295` / `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
7. Require projection `7/8`, frontier `milestone-o1`, action `work-o1-selective-context-dogfood`, six loaded/six skipped, sole role skill `mango-implementation-engineer`, null handoff, empty expansions, rollback available and privacy hits zero.
8. If execution fails, do not retry and do not update Gate. Return `BLOCKED` with active root left at the verified Audit carrier; never move backward.
9. If execution passes, in the isolated Builder branch above exact Audit carrier add only:
   - this exact final execution handoff;
   - updated `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`, marking O1 checked and status truthfully complete for local canonical package/dogfood only; and
   - `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_FINAL_DOGFOOD_BUILDER_RECEIPT_20260901.md`.
10. Preserve all prior Gate evidence unchanged except O1/status. State explicitly that Phase 3, Preview, Production, external activation, deployment and release remain open/excluded.
11. Run focused/core 41 tests, full server 411, UI/library 99 and `git diff --check`. Reverify dirty manifest/binding, then dirty-aware fast-forward active root exactly once to the final carrier, quarantining only exact-target collision with this handoff.
12. Verify final branch/HEAD/tree/parent, Gate/receipt hashes, unrelated and Contract/Map byte+mode parity, index zero, operation residue zero, binding intact and all forbidden mutation counters zero. Publish final carrier under a durable local branch.

## Terminal contract

Return exactly `O1_DOGFOOD_COMPLETE`, `SAFE_HOLD`, or `BLOCKED` with Audit-to-final lineage, changed paths, transition/intersection counts, pre/post manifests, one-shot output/counters/digests, tests, Gate/receipt hashes, active-root readback, durable branch, rollback and residual exclusions.

No external activation, Preview, Production, deployment, release, push, registry/provider/database/credential/environment mutation, Phase transition, conflict synthesis, reset, stash or automatic retry is authorized.
