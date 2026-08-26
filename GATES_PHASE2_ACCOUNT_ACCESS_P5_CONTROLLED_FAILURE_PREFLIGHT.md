# Phase 2 · P5 통제 실패 검수 준비 Gates

Outcome: 실제 외부 변경 전 모바일 만료·철회·제공자 장애를 서로 분리하고, 단일 사용 승인·실기기 증거·즉시 복구·Production 불변 경계를 갖춘 실행 계약을 준비한다.

- [x] F1: current source·Preview·P5 수치와 금지 외부 범위가 고정된다.
  PROVES: evidence
  CHECK: rg -q 'current source: `4613372adbec17e35c2498e55ab4210cc8b33c34`' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && rg -q 'current P5 matrix: `10/19`' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F1_PASS
  EXPECT: F1_PASS
  EVIDENCE: current source `4613372adbec17e35c2498e55ab4210cc8b33c34`, Preview `dpl_3MYfocjsQ6XvTrCoTNXE6Pp4U7wY`, P5 `10/19`, Production·Supabase·DNS·domain·release 금지를 runbook에 고정했다.
- [x] F2: 각 외부 변경은 10분 유효 단일 사용 Cherry 승인에 묶인다.
  PROVES: cherry_decision
  CHECK: rg -q '승인 후 10분 안에 시작, 다른 흐름에 재사용 금지' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F2_PASS
  EXPECT: F2_PASS
  EVIDENCE: 흐름·대상·영향·예상 결과·rollback을 먼저 보여주고 받은 한 번의 승인만 해당 창에 유효하도록 계약했다.
- [x] F3: 철회는 Development의 정확한 모바일 세션 하나만 대상으로 하며 새 로그인 복구를 요구한다.
  PROVES: security
  CHECK: rg -q '## 창 R · 모바일 운영자 세션 철회' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && rg -q '전체 세션 철회는 금지' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F3_PASS
  EXPECT: F3_PASS
  EVIDENCE: 대상 세션 하나의 철회, 401·만료 화면, 새 로그인 200/200 복구를 분리했다.
- [x] F4: 제공자 장애는 Google Development 연결만 일시 비활성화하고 즉시 재활성화·정상 로그인 복구한다.
  PROVES: rollback
  CHECK: rg -q '## 창 O · 모바일 인증 제공자 장애' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && rg -q 'Google 연결을 즉시 재활성화' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F4_PASS
  EXPECT: F4_PASS
  EVIDENCE: email code·Apple·owner allowlist 불변, raw 오류 비노출, Google 재활성화 뒤 200/200 복구를 요구한다.
- [x] F5: 만료는 실제 Clerk Development session lifetime을 사용하고 cookie 삭제·로그아웃·철회를 대체 증거로 금지한다.
  PROVES: test
  CHECK: rg -q '공식 최소값 `5분`' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && rg -q 'cookie 삭제·로그아웃·철회를 만료 PASS로 대체하지 않는다' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F5_PASS
  EXPECT: F5_PASS
  EVIDENCE: 새 세션 적용 확인, 실제 만료, 원래 session option 복원, 새 로그인 200/200을 한 흐름으로 묶었다.
- [x] F6: 민감정보 미기록과 즉시 중단 조건이 모든 창에 공통 적용된다.
  PROVES: privacy
  CHECK: rg -q '## 즉시 중단 조건' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && rg -q '계정·이메일·session ID·token·cookie·code·provider secret 기록: 금지' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F6_PASS
  EXPECT: F6_PASS
  EVIDENCE: raw identifier·credential 노출, 대상 불명, 복구 불명, Production 영향 시 즉시 중단하도록 고정했다.
- [x] F7: 준비 완료가 실기기 PASS나 상위 완료 상태로 승격되지 않는다.
  PROVES: evidence
  CHECK: rg -q '한 창 PASS는 그 환경·흐름 한 행만 닫는다' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE.*자동으로 닫히지 않는다' docs/PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_RUNBOOK.md && echo F7_PASS
  EXPECT: F7_PASS
  EVIDENCE: 이 Gate는 `PREFLIGHT_READY_ONLY`이며 실제 외부 mutation과 P5 PASS를 수행하거나 승인하지 않는다.

ABANDON: 이 준비 Gate는 Clerk session/provider/setting, Vercel environment/deployment, Production, Supabase, DNS·domain, 비용, release를 변경하지 않으며 모바일·MacBook PASS, P5, HP1, Phase 2 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.

