# OUTCOME Phase 3 · Observer Bridge Current-Canonical Promotion Gates

Outcome: audited Observer Bridge lineage를 현재 실행제어·Planner binding canonical 계보에 제품 수정 없이 통합하고, 새 immutable 후보의 검증 가능성을 보존한다.

- [x] P1: exact dispatch carrier와 audited Observer Bridge carrier가 clean isolated worktree에서 재검증된다.
  CHECK: test "$(git rev-parse 405546216fe905c62db3e85f4437ccafbc8bbc7d^{tree})" = cfc80c7812da55ad4748bce79dbf9cb72497d739 && test "$(git rev-parse b155249619c3443b54579553825d4d2e68b2d323^{tree})" = c8d7e294e1726ce91fab16571b539184dd7c8760
  EXPECT: identity mismatch와 dirty start가 0이다.
  EVIDENCE: clean isolated start `405546216...` / `cfc80c78...`; both immutable commit/tree pairs matched; mismatch 0.

- [x] P2: merge-tree가 conflict 없이 사전 계산되고 실제 two-parent merge tree와 일치한다.
  CHECK: test "$(git rev-parse a9c13ed4fe496143396b71ccc00ada20497ebb38^{tree})" = 9034583dc33dc57915307c3344d7237d1b7e9fa1 && test "$(git rev-list --parents -n1 a9c13ed4fe496143396b71ccc00ada20497ebb38)" = "a9c13ed4fe496143396b71ccc00ada20497ebb38 405546216fe905c62db3e85f4437ccafbc8bbc7d b155249619c3443b54579553825d4d2e68b2d323" && test "$(git ls-files -u | wc -l | tr -d ' ')" = 0
  EXPECT: predicted=actual, first parent=dispatch carrier, second parent=`b155249...`, unmerged=0.
  EVIDENCE: predicted=actual=`9034583dc33dc57915307c3344d7237d1b7e9fa1`; ordered parents exact; unmerged 0.

- [x] P3: 두 계보가 보존되고 integration-authored product drift가 없다.
  CHECK: git diff --quiet a9c13ed4fe496143396b71ccc00ada20497ebb38 b155249619c3443b54579553825d4d2e68b2d323 -- $(git diff --name-only b8359691013501690a021709b974e463def6eea4..b155249619c3443b54579553825d4d2e68b2d323) && git diff --quiet a9c13ed4fe496143396b71ccc00ada20497ebb38 405546216fe905c62db3e85f4437ccafbc8bbc7d -- $(git diff --name-only b8359691013501690a021709b974e463def6eea4..405546216fe905c62db3e85f4437ccafbc8bbc7d)
  EXPECT: missing provenance=0, integration product edit=0.
  EVIDENCE: audited 65/65 blobs and dispatch 14/14 blobs preserved; overlap, missing and mismatch counts all 0.

- [x] P4: focused session-binding, execution-control, Observer Bridge, stable-host/API 검증이 모두 통과한다.
  CHECK: node --test server/outcome-package.test.mjs server/phase3-private-session-registry.test.mjs server/outcome-session-registry-persistence.test.mjs server/outcome-session-control.test.mjs server/outcome-execution-control-plane.test.mjs server/phase3-observer-bridge.test.mjs server/phase3-observer-bridge-api.test.mjs server/phase3-observer-bridge-hosted.test.mjs server/phase3-observer-bridge-runtime.test.mjs server/phase3-observer-bridge-postgres.test.mjs server/phase3-observer-bridge-operations.test.mjs server/stable-host.test.mjs
  EXPECT: failures=0.
  EVIDENCE: session binding 89/89, execution control 31/31, Observer Bridge 101/101, stable host 34/34; combined 255/255 PASS.

- [x] P5: full tests, production build, security/public/mutation/scope/runbook와 diff 검사가 통과한다.
  CHECK: npm test && node --test scripts/*.test.mjs server/*.test.mjs && npm run build && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: failures=0; public mutation remains read-only.
  EVIDENCE: configured 424/424, broad Node 364/364, build 1,652 modules, scope 53, runbook and diff PASS.

- [x] P6: privacy·authority·외부 mutation 경계가 유지된다.
  CHECK: npm run test:security && npm run test:public && npm run check:mutations && npm run check:public-boundary
  EXPECT: raw locator/credential/content/provider identifier leak=0; provider/database/credential/network/push/deploy/release/external mutation=0.
  EVIDENCE: security 54/54, public 4/4, stable/public prohibited hits 0, local 32/32=405, API 28/28=read_only; external mutations 0.

- [x] P7: 열린 권한과 rollback이 정확히 보존된다.
  CHECK: rg -q 'Planner.*status `blocked`' docs/PHASE3_OBSERVER_BRIDGE_CURRENT_CANONICAL_PROMOTION_BUILDER_RECEIPT.md && rg -q 'O2 remains `OPEN/LOCKED`' docs/PHASE3_OBSERVER_BRIDGE_CURRENT_CANONICAL_PROMOTION_BUILDER_RECEIPT.md && rg -q 'Phase 3 remains `17/43`' docs/PHASE3_OBSERVER_BRIDGE_CURRENT_CANONICAL_PROMOTION_BUILDER_RECEIPT.md && rg -q 'revert merge.*mainline 1' docs/PHASE3_OBSERVER_BRIDGE_CURRENT_CANONICAL_PROMOTION_BUILDER_RECEIPT.md
  EXPECT: Planner=`blocked / adapter_unreachable`; O2=`OPEN/LOCKED`; Phase 3=`17/43`; T1–T7 open; external=false.
  EVIDENCE: Planner blocked/adapter_unreachable and activity null; O2/Phase/T1-T7/external boundaries and mainline-1 rollback recorded.

ABANDON: 이 Gate의 PASS는 local Builder integration candidate만 증명한다. Fresh QA, separate fresh Release Audit, 실제 signed observation, O2, routing, hosted activation, Supabase, deploy, release, Cherry acceptance와 external completion은 별도다.
