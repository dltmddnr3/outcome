# Phase 2 · 호스팅 데이터 실행 준비 Gates

Outcome: HP1이 실제 증거로 끝나고 Cherry가 HP2를 별도로 승인했을 때, 운영·실데이터·운영 인증·도메인·출시 범위를 침범하지 않고 격리된 Supabase 미리보기에서 합성 Package 데이터와 실제 RLS·복원·삭제 경계를 재현할 수 있는 실행 절차와 비민감 영수증 양식을 준비한다.

- [x] E1: 최신 Supabase 변경 이력과 공식 지역·요금·Clerk third-party auth·RLS·백업 제약이 확인일과 링크로 기록된다.
  PROVES: evidence
  CHECK: rg -q '## 공식 제약 확인' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q '확인일: 2026-08-25' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E1_PASS
  EXPECT: E1_PASS
  EVIDENCE: 2026-08-25 기준 공식 changelog와 region, billing, Clerk third-party auth, RLS, Data API 노출 변경, backup, project deletion 문서 링크를 실행 절차에 고정했다.
- [x] E2: 실행 입력이 정확한 migration 파일·SHA-256·8개 테이블·8개 RLS/force RLS·6개 읽기 정책과 두 데이터 환경 이름으로 고정된다.
  PROVES: implementation
  CHECK: rg -q '832e8fc117d7c5b1b403cbe8f4e34ca3f4ceeb3f23904c82daefd56b96cae5a7' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q 'OUTCOME_SUPABASE_URL' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q 'OUTCOME_SUPABASE_PUBLISHABLE_KEY' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E2_PASS
  EXPECT: E2_PASS
  EVIDENCE: migration SHA-256 `832e8fc117d7c5b1b403cbe8f4e34ca3f4ceeb3f23904c82daefd56b96cae5a7`; 직접 측정 `tables=8`, `enable RLS=8`, `force RLS=8`, `SELECT policies=6`, anon/public grant `0`; 데이터 환경 이름은 publishable 두 개뿐이다.
- [x] E3: Clerk third-party JWT, canonical subject, private schema grant, owner read-only RLS와 익명·타 소유자·위조·철회·쓰기 거부 검증이 명시된다.
  PROVES: security
  CHECK: rg -q '## 인증·RLS 검증 행렬' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q 'third-party auth' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E3_PASS
  EXPECT: E3_PASS
  EVIDENCE: Clerk first-class third-party auth와 canonical `sub`, private schema owner read-only RLS를 사용하며 anon, other owner, forged selector, unregistered project, revoked/expired identity, authenticated write, secret exposure를 모두 거부하는 행렬을 고정했다.
- [x] E4: 합성 seed, current snapshot, export, deletion lifecycle과 격리된 restore rehearsal의 성공·실패 판정이 정의된다.
  PROVES: test
  CHECK: rg -q '## 합성 데이터·수명주기 검증' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q '## 복원 검증' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E4_PASS
  EXPECT: E4_PASS
  EVIDENCE: 합성 workspace 2개 기준 seed→append-only snapshot→current pointer→redacted export→revoke/purge lifecycle과 Free logical export 재적용 복원의 성공·미실행 판정을 분리했다.
- [x] E5: Seoul exact region, Free/paid 비용 경계, Free의 logical export와 유료 backup/PITR 차이가 거짓 복원 주장 없이 기록된다.
  PROVES: evidence
  CHECK: rg -q 'ap-northeast-2' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q 'Free' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q 'PITR' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E5_PASS
  EXPECT: E5_PASS
  EVIDENCE: exact Seoul `ap-northeast-2`, 조직 단위 Free quota와 프로젝트별 비용, Free logical export와 유료 daily backup/PITR 경계를 기록했으며 유료 복원을 수행한 것으로 간주하지 않는다.
- [x] E6: HP2 허용 외부 변경과 Production·실데이터·secret key 런타임·결제·도메인·출시 금지 변경 및 되돌리기가 분리된다.
  PROVES: security
  CHECK: rg -q '## 허용된 외부 변경' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q '## 금지된 외부 변경' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q '## 되돌리기 순서' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E6_PASS
  EXPECT: E6_PASS
  EVIDENCE: isolated non-production project, synthetic data, Vercel Preview의 두 publishable data env만 허용하고 Production, real data, secret/service-role, paid add-on, DNS/domain, release를 금지했다; rollback은 Preview 차단→session revoke→data env 제거→integration 차단 순서다.
- [x] E7: 실행 단계가 D1-D7에 일대일 매핑되고 HP1 P1-P6 완료와 별도 HP2 승인 전에는 외부 변경을 시작하지 않는다.
  PROVES: implementation
  CHECK: rg -q '## D1-D7 실행 매핑' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && rg -q 'HP1 P1-P6' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_EXECUTION_RUNBOOK.md && echo E7_PASS
  EXPECT: E7_PASS
  EVIDENCE: D1-D7 각각의 입력·검증·영수증을 일대일로 정의했고, HP1 `P1-P6 6/6` 실제 증거와 별도 Cherry HP2 승인이 없으면 D1 이후 외부 변경을 시작하지 않는다.
- [x] E8: 비민감 영수증 양식과 문서 검증이 통과하고 HP2 D1-D7·새 검수·감사·Cherry 승인·출시·외부 완료는 열린 상태다.
  PROVES: test
  CHECK: test -f docs/PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_RECEIPT_TEMPLATE.md && git diff --check && rg -q '\[ \] D1:' GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_PREVIEW.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo E8_PASS
  EXPECT: E8_PASS
  EVIDENCE: 비민감 실행 영수증 양식이 존재하고 `git diff --check`가 통과했다. 실제 HP2 `D1-D7 0/7`, fresh QA, Audit, Cherry acceptance, Production, release는 열려 있고 `EXTERNAL_OUTCOME_COMPLETE=false`다.

ABANDON: 이 준비 Gate는 Supabase 조직·프로젝트·branch·database·integration·key·environment·Preview 배포, 결제, 로그인, migration 실행, 데이터 mutation, 독립 검수·감사 판정, Cherry 승인, 출시, Phase 완료 또는 `EXTERNAL_OUTCOME_COMPLETE`를 수행하거나 승인하지 않는다.
