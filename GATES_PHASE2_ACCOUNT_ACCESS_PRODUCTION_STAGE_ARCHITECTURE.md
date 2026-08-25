# Phase 2 · HP3 운영 Stage 위계 준비 Gates

Outcome: HP3 결정 사전계약을 OUTCOME의 Phase→Scope→Stage→Gate 위계로 표시하되, 현재 위치·진행률·승인·실행·출시를 발명하지 않고 운영 자원 준비부터 활성화까지의 역할·의존·완료 권한을 source-grounded locked stages로 등록한다.

- [x] T1: hosted candidate Cherry 승인 뒤 HP3 자원 준비→새 UX/Product QA→별도 Release Audit→Cherry production candidate 승인→별도 운영 활성화의 5개 Stage가 순서대로 등록된다.
  PROVES: implementation
  CHECK: for id in production-resource-preparation production-ux-product-qa production-release-audit production-cherry-acceptance production-activation; do rg -q "outcome-stage-account-access-$id" docs/OUTCOME_MAP.md || exit 1; done && echo T1_PASS
  EXPECT: T1_PASS
  EVIDENCE: account-service 아래 hosted Cherry 승인 다음에 `production-resource-preparation`→`production-ux-product-qa`→`production-release-audit`→`production-cherry-acceptance`→`production-activation` 5개 locked Stage를 등록했다.
- [x] T2: 5개 Stage의 dependency가 단일 방향 DAG이며 각 Stage의 목적·owner·다음 권한이 이전 Stage 완료에만 연결된다.
  PROVES: implementation
  CHECK: rg -q 'depends_on: \[outcome-stage-account-access-cherry-acceptance\]' docs/OUTCOME_MAP.md && rg -q 'depends_on: \[outcome-stage-account-access-production-cherry-acceptance\]' docs/OUTCOME_MAP.md && echo T2_PASS
  EXPECT: T2_PASS
  EVIDENCE: 각 Stage는 직전 Stage 하나만 depends_on으로 가지며 첫 HP3 Stage는 hosted Cherry acceptance, 마지막 activation은 production Cherry acceptance에만 의존한다. 순환·중복 owner·건너뛰기 dependency는 0이다.
- [x] T3: 실행 Gate source 5개가 존재하고 자원 준비 6, QA 4, Audit 4, Cherry 승인 4, 활성화 6의 총 24개 Gate가 모두 open이다.
  PROVES: evidence
  CHECK: test "$(rg -c '^\- \[ \]' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_RESOURCE_PREPARATION.md)" = 6 && test "$(rg -c '^\- \[ \]' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_UX_PRODUCT_QA.md)" = 4 && test "$(rg -c '^\- \[ \]' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_RELEASE_AUDIT.md)" = 4 && test "$(rg -c '^\- \[ \]' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_CHERRY_ACCEPTANCE.md)" = 4 && test "$(rg -c '^\- \[ \]' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_ACTIVATION.md)" = 6 && echo T3_PASS
  EXPECT: T3_PASS
  EVIDENCE: 직접 측정 `resource=6`, `QA=4`, `Audit=4`, `Cherry candidate=4`, `activation=6`, 합계 `24`; 모두 `[ ]` open이고 pending evidence다.
- [x] T4: Builder/operator, UX & Product QA, Release Audit, Cherry candidate acceptance와 activation operator의 증거·판정·mutation 권한이 Gate별로 겹치지 않는다.
  PROVES: security
  CHECK: rg -q 'Builder/operator' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_RESOURCE_PREPARATION.md && rg -q 'fresh reviewer' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_UX_PRODUCT_QA.md && rg -q 'fresh auditor' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_RELEASE_AUDIT.md && rg -q 'Cherry' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_CHERRY_ACCEPTANCE.md && rg -q 'activation operator' GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_ACTIVATION.md && echo T4_PASS
  EXPECT: T4_PASS
  EVIDENCE: Builder/operator는 resource candidate와 제한 QA window mutation만, fresh reviewer는 UX/Product 판정만, fresh auditor는 Release Audit 판정만, Cherry는 candidate·activation 결정을 각각 소유하며 activation operator는 exact HP3-D 범위만 실행한다.
- [x] T5: 기존 account-access Cherry acceptance는 hosted Preview 후보 승인으로 명확히 이름이 바뀌고 production candidate 승인·activation과 혼동되지 않는다.
  PROVES: evidence
  CHECK: rg -q 'title: 호스팅 후보 Cherry 승인' docs/OUTCOME_MAP.md && rg -q 'primary_label: 호스팅 후보 실제 사용 승인' docs/OUTCOME_MAP.md && echo T5_PASS
  EXPECT: T5_PASS
  EVIDENCE: 기존 Stage title/label을 `호스팅 후보 Cherry 승인`/`호스팅 후보 실제 사용 승인`으로 바꿔 production candidate acceptance 및 activation과 의미 충돌을 제거했다.
- [x] T6: 현재 위치는 HP1 P2로 유지되고 HP1 `1/6`, HP2와 새 24개 production Gate는 open, `EXTERNAL_OUTCOME_COMPLETE=false`다.
  PROVES: test
  CHECK: rg -q 'Current: .*hosted-identity-preview · P2' docs/OUTCOME_MAP.md && rg -q 'P1-P6 1/6' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo T6_PASS
  EXPECT: T6_PASS
  EVIDENCE: map Current는 `hosted-identity-preview · P2`, HP1 `1/6`, HP2 이하 open을 유지한다. 새 production Gate는 `0/24`, `EXTERNAL_OUTCOME_COMPLETE=false`다.
- [x] T7: Package parser, 전체 회귀, production build, diff 검사가 통과하고 이 위계 준비가 HP3 승인·실행·QA·Audit·Cherry 승인·activation·release를 닫지 않는다.
  PROVES: test
  CHECK: git diff --check && npm run test:package-model >/tmp/outcome-production-stage-package-test.log && tail -n 5 /tmp/outcome-production-stage-package-test.log && echo T7_PASS
  EXPECT: T7_PASS
  EVIDENCE: Package model `39/39`, frontend `71/71`, Node `108/108`, production build와 `git diff --check`가 통과했다. 첫 full test와 build 병렬 실행에서는 generated snapshot 교체 순간 identity runtime 2건이 import 실패했고, build 완료 뒤 focused `4/4`와 full suite를 순차 재실행해 `108/108`을 확인했다. 제품 실패로 완화하거나 최초 실패를 숨기지 않는다.

ABANDON: 이 위계 준비 Gate는 provider·domain·DNS·billing·environment·deployment·data·session·traffic을 변경하지 않고, 새 execution Gate를 체크하거나 QA·Audit·Cherry acceptance·activation·release·Phase 2·`EXTERNAL_OUTCOME_COMPLETE`를 승인하지 않는다.
