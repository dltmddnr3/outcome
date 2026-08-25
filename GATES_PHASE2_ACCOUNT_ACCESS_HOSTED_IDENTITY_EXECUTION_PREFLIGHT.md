# Phase 2 · 개발 인증 실행 준비 Gates

Outcome: HP1 외부 변경 승인이 도착했을 때 운영 환경·수파베이스·도메인·출시 범위를 침범하지 않고, 클러크 개발 인증과 버셀 미리보기만 재현 가능하게 생성·검증·중단·되돌릴 수 있는 실행 문서와 민감정보 없는 영수증 양식을 준비한다.

- [ ] E1: 실행 기준선이 현재 `HEAD=origin/main`, 공개 커밋·트리·에셋, 비공개 비활성과 P1-P6 0/6을 정확히 고정한다.
  PROVES: evidence
  CHECK: test -f docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && rg -q 'HEAD=origin/main' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && rg -q 'P1-P6 `0/6`' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && echo E1_PASS
  EXPECT: E1_PASS
  EVIDENCE: pending
- [ ] E2: HP1에서 생성·변경할 대상과 운영 환경·수파베이스·결제·도메인 등 금지 대상을 구분한다.
  PROVES: security
  CHECK: rg -q '## 허용된 외부 변경' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && rg -q '## 금지된 외부 변경' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && echo E2_PASS
  EXPECT: E2_PASS
  EVIDENCE: pending
- [ ] E3: 클러크·구글·애플·버셀의 개발 환경 제약과 확인일이 공식 문서 링크로 기록된다.
  PROVES: evidence
  CHECK: rg -q '## 공식 제약 확인' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && rg -q '확인일: 2026-08-25' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && echo E3_PASS
  EXPECT: E3_PASS
  EVIDENCE: pending
- [ ] E4: 영수증 양식은 변수 이름과 상태만 허용하고 이메일·주체 식별자·키·토큰·쿠키·인증 코드·비밀값을 금지한다.
  PROVES: security
  CHECK: test -f docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_RECEIPT_TEMPLATE.md && rg -q '## 기록 금지' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_RECEIPT_TEMPLATE.md && rg -q '값을 기록하지 않는다' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_RECEIPT_TEMPLATE.md && echo E4_PASS
  EXPECT: E4_PASS
  EVIDENCE: pending
- [ ] E5: 중단 조건과 비공개 기능 우선 비활성화·세션 철회·미리보기 환경값 제거·운영 배포 불변 확인 순서의 되돌리기가 있다.
  PROVES: evidence
  CHECK: rg -q '## 즉시 중단 조건' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && rg -q '## 되돌리기 순서' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && echo E5_PASS
  EXPECT: E5_PASS
  EVIDENCE: pending
- [ ] E6: 실행·검증 단계가 P1-P6에 일대일로 매핑되고 HP2·독립 검수·출시 감사·Cherry 승인을 자동 진행하지 않는다.
  PROVES: implementation
  CHECK: rg -q '## P1-P6 실행 매핑' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && rg -q 'HP2는 자동 시작하지 않는다' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RUNBOOK.md && echo E6_PASS
  EXPECT: E6_PASS
  EVIDENCE: pending
- [ ] E7: 문서 검증과 공개 기준선 재확인이 통과하고 HP1·Cherry 승인·출시·외부 완료 Gate는 열린 상태다.
  PROVES: test
  CHECK: git diff --check && rg -q '\[ \] P1:' GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_PREVIEW.md && rg -q '\[ \] C1:' GATES_PHASE2_ACCOUNT_ACCESS_CHERRY_ACCEPTANCE.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo E7_PASS
  EXPECT: E7_PASS
  EVIDENCE: pending

ABANDON: 이 준비 Gate는 클러크·구글·애플·버셀 자원 생성, 환경값 입력, 미리보기 배포, 실제 로그인, 수파베이스, 비용 발생, 도메인, 운영 활성화, 독립 검수·감사 판정, Cherry 승인, 출시, 페이즈 완료 또는 `EXTERNAL_OUTCOME_COMPLETE`를 수행하거나 승인하지 않는다.
