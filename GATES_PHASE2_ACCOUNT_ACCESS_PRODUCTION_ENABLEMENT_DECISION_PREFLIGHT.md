# Phase 2 · HP3 운영 활성화 결정 준비 Gates

Outcome: HP1·HP2와 hosted 후보의 새 검수·감사·Cherry 승인이 실제 증거로 끝난 뒤에만, 운영 자원 준비와 운영 활성화·출시를 별도 승인으로 판단할 수 있도록 현재 공식 제약, 변경 대상, 비용·보안·복원·관측·되돌리기와 비민감 영수증을 준비한다.

- [x] R1: 기존 Account Access 계약과 hosted authorization에서 HP3 선행 조건, 운영 자원 준비, 새 QA·감사·Cherry 승인, 활성화·출시가 서로 다른 권한으로 추적된다.
  PROVES: evidence
  CHECK: test -f docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q '## 권한 분리' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q 'RESOURCE_PREPARATION_ONLY' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q 'PRODUCTION_ACTIVATION' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && echo R1_PASS
  EXPECT: R1_PASS
  EVIDENCE: 기존 hosted authorization의 HP3를 `HP3-A RESOURCE_PREPARATION_ONLY`→affected fresh QA/Audit→Cherry production candidate acceptance→별도 `HP3-D PRODUCTION_ACTIVATION`→별도 public-service release로 분해했다. HP1/HP2나 hosted acceptance는 이후 권한을 자동 부여하지 않는다.
- [x] R2: Clerk·Google·Apple·Supabase·Vercel의 현재 운영 제약과 공식 문서가 확인일과 함께 기록되고 미확인 항목은 결정 전 재확인 대상으로 남는다.
  PROVES: evidence
  CHECK: rg -q '## 공식 제약 확인' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q '확인일: 2026-08-25' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && for provider in Clerk Google Apple Supabase Vercel; do rg -q "$provider" docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md || exit 1; done && echo R2_PASS
  EXPECT: R2_PASS
  EVIDENCE: 2026-08-25 기준 Clerk production/environment, Google audience·branding·verification, Apple web/relay, Supabase changelog·production·billing·backup/restore, Vercel env·staged promotion·rollback 공식 문서를 확인했다. owned domain, Apple eligibility, Google publishing, Vercel staging topology는 실행 전 재확인 stop 항목이다.
- [x] R3: 운영 변경 표면이 제공자별 자원·환경 이름·도메인·비용·소유권으로 열거되고 secret·개인 식별값은 문서와 영수증에서 금지된다.
  PROVES: security
  CHECK: rg -q '## 운영 변경 표면' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q '## 기록 금지' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_RECEIPT_TEMPLATE.md && echo R3_PASS
  EXPECT: R3_PASS
  EVIDENCE: Clerk·Google·Apple·Supabase·Vercel·Domain/DNS 6개 변경 표면과 code contract의 Production 환경 이름 8개를 값 없이 고정했다. provider/account/session/key/token/env value와 개인·프로젝트 식별자는 영수증 기록 금지다.
- [x] R4: 운영 데이터는 exact migration, RLS·grant, managed backup, isolated restore, RPO/RTO, 삭제 ledger replay와 실제 데이터 반입 금지 조건을 충족하기 전 활성화되지 않는다.
  PROVES: security
  CHECK: rg -q '## 데이터·복원 준비' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q 'RPO' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q 'deletion ledger' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && echo R4_PASS
  EXPECT: R4_PASS
  EVIDENCE: exact migration/RLS/grant, managed daily backup, separately approved isolated restore, deletion ledger replay, measured `RPO ≤24h`·`RTO ≤8h`, pre-activation real row `0`을 필수로 정의했다. PITR은 현재 약 `$100/month`부터여서 `$75/month` ceiling 밖이며 별도 승인 없이는 금지다.
- [x] R5: 운영 후보는 immutable deployment, Production 전용 환경 분리, public/private 회귀, 관측·비용 stop과 새 QA·감사·Cherry 생산 승인 전 비활성 상태로 정의된다.
  PROVES: test
  CHECK: rg -q '## 후보·검증 순서' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q 'private surface disabled' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q 'fresh UX & Product QA' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && echo R5_PASS
  EXPECT: R5_PASS
  EVIDENCE: private-disabled staged immutable Production candidate→synthetic security/restore/cost/rollback→fresh QA→separate Audit→Cherry candidate acceptance→별도 activation의 10단계 순서를 고정했다. 환경 변경은 resulting deployment receipt와 결합하며 이전 QA/Audit pin은 재사용하지 않는다.
- [x] R6: 되돌리기는 비공개 표면 차단, 세션 철회, 이전 공개 배포 복귀, 데이터 복원·보상 migration, 전체 회귀 순으로 정의되고 파괴적 삭제가 첫 조치가 아니다.
  PROVES: implementation
  CHECK: rg -q '## 되돌리기 순서' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q '파괴적 삭제' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && echo R6_PASS
  EXPECT: R6_PASS
  EVIDENCE: private traffic 차단→session revoke→deployment와 env inventory 각각 복귀→compensating migration 또는 verified restore+deletion ledger replay→전체 회귀의 7단계를 정의했다. project/provider 파괴적 삭제는 첫 조치가 아니다.
- [x] R7: 자원 준비 승인과 운영 활성화 승인의 exact decision phrase, 비용·소유권·영수증·중단 조건이 비민감 양식으로 준비된다.
  PROVES: cherry_decision
  CHECK: test -f docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_RECEIPT_TEMPLATE.md && rg -q 'HP3 자원 준비 승인 문구' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && rg -q '운영 활성화 승인 문구' docs/PHASE2_ACCOUNT_ACCESS_PRODUCTION_ENABLEMENT_DECISION_RUNBOOK.md && echo R7_PASS
  EXPECT: R7_PASS
  EVIDENCE: HP3-A 자원 준비와 HP3-D 운영 활성화의 서로 다른 exact phrase, 11개 receipt section, `$40/$60/$75` 비용 stop, domain·billing·rollback owner와 미결정 topology를 비민감 양식으로 준비했다.
- [x] R8: 문서·Package 회귀가 통과하고 HP1 P2-P6, HP2 D1-D7, hosted QA·감사·Cherry 승인, HP3, 운영 활성화·출시와 외부 완료는 열린 상태다.
  PROVES: test
  CHECK: git diff --check && rg -q '\[ \] P2:' GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_PREVIEW.md && rg -q '\[ \] D1:' GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_PREVIEW.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo R8_PASS
  EXPECT: R8_PASS
  EVIDENCE: 강제 재실행 CHECK `R1-R8 8/8`, frontend `71/71`, Node `108/108`, production build와 `git diff --check`가 통과했다. 실제 HP1은 `1/6`, HP2·hosted QA/Audit/Cherry acceptance·HP3·activation·release는 open이고 `EXTERNAL_OUTCOME_COMPLETE=false`다.

ABANDON: 이 결정 준비 Gate는 provider tenant·OAuth app·Apple key·Supabase project·Production environment·domain·DNS·billing·deployment·data·session·QA·Audit·Cherry acceptance·release를 생성·변경·실행·승인하지 않으며 Phase 2 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
