# OUTCOME clock authority · canonical fast-forward Gate

Outcome: 검증된 local promotion carrier를 canonical local branch에 fast-forward하되 기존 dirty/user-owned 파일 bytes를 그대로 보존하고 외부 권한을 열지 않는다.

- [x] F1: exact canonical source와 promotion carrier ancestry가 일치한다.
  - CHECK: `test "$(git rev-parse HEAD)" = "214a03bff38d311f0fed57f7ca40aa635aa981a2" && git merge-base --is-ancestor HEAD 6eab0c202ae4bd015e9319d7163c2e079332b21d`
  - EXPECT: canonical HEAD가 exact source이고 promotion carrier가 fast-forward descendant다.
  - EVIDENCE: preflight HEAD/tree `214a03bff38d311f0fed57f7ca40aa635aa981a2` / `e3e2f5053a6ed0b75811a6a5f9848f49d2fc55c0`; carrier `6eab0c202ae4bd015e9319d7163c2e079332b21d` is a fast-forward descendant and protected ref resolves exactly.

- [x] F2: 충돌하는 네 Gate의 pre-integration bytes와 전체 dirty path set을 content-addressed backup으로 보존한다.
  - CHECK: 네 파일의 SHA-256과 NUL-delimited status snapshot SHA-256을 handoff pin과 대조한다.
  - EXPECT: 네 SHA와 status snapshot이 모두 일치하며 backup은 repository 밖의 private temporary directory에 존재한다.
  - EVIDENCE: pre-handoff dirty count `120`, NUL status SHA-256 `2208cb421d11466e43568a86d2879498e8987b118e3b6a7ea8a63d586e61c258`; four Gate SHA-256 values exactly match the handoff. A repository-external `0700` temporary backup retained the four files plus the NUL status snapshot.

- [x] F3: canonical branch pointer는 `git merge --ff-only`로 exact carrier까지만 이동한다.
  - CHECK: `test "$(git rev-parse HEAD)" = "6eab0c202ae4bd015e9319d7163c2e079332b21d" && test "$(git rev-parse HEAD^{tree})" = "9498f217b4d5d77e51e46edd53d1e3bc7a717f24"`
  - EXPECT: merge commit·rebase·cherry-pick 없이 exact carrier가 canonical HEAD다.
  - EVIDENCE: one `git merge --ff-only 6eab0c202ae4bd015e9319d7163c2e079332b21d` advanced `codex/hp1-session-bearer`; HEAD/tree are exactly `6eab0c202ae4bd015e9319d7163c2e079332b21d` / `9498f217b4d5d77e51e46edd53d1e3bc7a717f24`; parent is `c2c4d12366050289b5a98173f5994f2fde76fdf2`; no merge commit, rebase, cherry-pick, reset, clean, stash, or retry occurred.

- [x] F4: 네 사용자-owned Gate bytes를 복원하고 나머지 dirty paths의 bytes/path set을 보존한다.
  - CHECK: 복원된 네 SHA-256, pre/post dirty path set, 금지 경로 변경 수와 `git diff --check`를 측정한다.
  - EXPECT: 네 파일 bytes가 pre-integration SHA와 동일하고 기존 dirty path 누락이 0이며 carrier 외 새 product/test byte mutation이 0이다.
  - EVIDENCE: restored Gate SHA-256 values are `30981062a29178385a8801662fda274f064248605eb72f1fb35175abc7f867c5`, `2c20c2406099ffa6a5deea8c89aaace272f614df198435b0253f672517a10d1f`, `10ca230f5f227e0c8733a557f4f841cdd651d759382ef88e375cddd815903710`, and `0c0e9550a5d3f96ec5302892ce50aa73f60e26e747af5f79de652185325e54e9`. Pre/post dirty counts are `120` / `120`; sorted NUL path digests are both `8dfd0be0b38ee6ea20e4c8ebed1b549d30a8c83101eac2ccb0b64dd216d485b7`; missing paths `0`; staged paths before receipt `0`. Carrier commit diff check passes. Whole-worktree diff check reproduces only the pinned, byte-preserved pre-existing EOF blank-line warning in the trusted-evidence Gate; it was not changed to manufacture PASS.

- [x] F5: local-only 권한과 rollback receipt가 완전하다.
  - CHECK: branch/HEAD/reflog, backup 위치·해시, rollback 명령, mutation counts를 receipt에 기록한다.
  - EXPECT: push·deploy·release·registry/runtime/provider/environment/external mutation 0; Cherry acceptance·Phase closure 주장 0.
  - EVIDENCE: local receipt records branch/HEAD/reflog, backup and rollback facts, exact preservation hashes, and mutation counts. Push, deploy, release, registry/runtime/provider/environment/external mutation and acceptance/Phase closure claims are all `0`.

ABANDON: exact source, carrier, dirty snapshot, 네 파일 SHA 또는 fast-forward ancestry가 하나라도 다르면 파일 이동이나 branch mutation 전에 `SAFE_HOLD_CANONICAL_FAST_FORWARD_DRIFT`로 종료한다.

Authority boundary: 이 Gate는 canonical local branch의 보존형 fast-forward와 하나의 로컬 receipt만 허용한다. push, deploy, release, external mutation, Cherry acceptance, Phase closure, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 허용하지 않는다.
