# OUTCOME Phase 3 · Observer Bridge Current-Canonical Promotion Gates

Outcome: audited Observer Bridge lineage를 현재 실행제어·Planner binding canonical 계보에 제품 수정 없이 통합하고, 새 immutable 후보의 검증 가능성을 보존한다.

- [ ] P1: exact dispatch carrier와 audited Observer Bridge carrier가 clean isolated worktree에서 재검증된다.
  CHECK: receipt가 source/carrier commit·tree와 clean-start를 기록한다.
  EXPECT: identity mismatch와 dirty start가 0이다.
  EVIDENCE: pending

- [ ] P2: merge-tree가 conflict 없이 사전 계산되고 실제 two-parent merge tree와 일치한다.
  CHECK: receipt가 predicted tree, actual tree, ordered parents와 unmerged count를 기록한다.
  EXPECT: predicted=actual, first parent=dispatch carrier, second parent=`b155249...`, unmerged=0.
  EVIDENCE: pending

- [ ] P3: 두 계보가 보존되고 integration-authored product drift가 없다.
  CHECK: imported path provenance와 current execution-control/session-binding byte preservation을 검증한다.
  EXPECT: missing provenance=0, integration product edit=0.
  EVIDENCE: pending

- [ ] P4: focused session-binding, execution-control, Observer Bridge, stable-host/API 검증이 모두 통과한다.
  CHECK: receipt가 명령과 exact pass count를 기록한다.
  EXPECT: failures=0.
  EVIDENCE: pending

- [ ] P5: full tests, production build, security/public/mutation/scope/runbook와 diff 검사가 통과한다.
  CHECK: receipt가 각 명령의 실제 결과를 기록한다.
  EXPECT: failures=0; public mutation remains read-only.
  EVIDENCE: pending

- [ ] P6: privacy·authority·외부 mutation 경계가 유지된다.
  CHECK: 새 runtime/public surface의 prohibited hit와 operation ledger를 검사한다.
  EXPECT: raw locator/credential/content/provider identifier leak=0; provider/database/credential/network/push/deploy/release/external mutation=0.
  EVIDENCE: pending

- [ ] P7: 열린 권한과 rollback이 정확히 보존된다.
  CHECK: receipt가 Planner binding blocked 상태, O2/T1–T7/Phase 3/external completion과 mainline-1 rollback을 기록한다.
  EXPECT: Planner=`blocked / adapter_unreachable`; O2=`OPEN/LOCKED`; Phase 3=`17/43`; T1–T7 open; external=false.
  EVIDENCE: pending

ABANDON: 이 Gate의 PASS는 local Builder integration candidate만 증명한다. Fresh QA, separate fresh Release Audit, 실제 signed observation, O2, routing, hosted activation, Supabase, deploy, release, Cherry acceptance와 external completion은 별도다.
