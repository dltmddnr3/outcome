# Phase 2 · P5 모바일 운영자 세션 철회 재검수 Gates

Outcome: 교정 Preview에서 준비 상태가 확인된 모바일 Development 세션 하나만 승인 후 10분 안에 철회하고, 같은 탭의 만료 UX·private payload 차단·재로그인 복구를 실제 관측값으로만 판정한다.

- [x] RR1: exact source·tree·Preview·stable alias와 P5 `10/19 OPEN`이 실행 직전 일치한다.
  PROVES: authorization
  EVIDENCE: source `ebac7d538152fddc432fcdb4d1ee7b80a6cbe87b`, tree `83cb4182f086b3cc0ad1634fd2b44d3c6c151fc1`, Preview `dpl_4P1AusHZo37fTCY92oUpVk1CrmHP` READY, stable alias와 P5 `10/19 OPEN`을 재확인했다. Production은 별도 main deployment READY였다.
- [ ] RR2: 모바일 같은 탭이 교정 Preview에서 owner 준비 상태이며 session/workspace `200/200`인 정확한 Development 세션 하나로 식별된다.
  PROVES: target_identity
  EVIDENCE: pending
- [ ] RR3: Cherry의 단일 사용 승인이 10분 안에 유효하며 전체 세션이 아닌 정확한 모바일 세션 하나만 철회된다.
  PROVES: external_mutation
  EVIDENCE: pending
- [ ] RR4: 같은 모바일 탭에서 private payload `0`, `로그인이 만료되었습니다`, 작동하는 `다시 로그인`, SDK no-request 또는 stale-token `401` 경로가 관측된다.
  PROVES: product_behavior
  EVIDENCE: pending
- [ ] RR5: canonical owner 재로그인 뒤 준비 화면과 session/workspace `200/200`이 복구되고 다른 세션·설정·Production은 불변이다.
  PROVES: recovery
  EVIDENCE: pending
- [ ] RR6: 비민감 영수증과 행렬은 실제 판정만 기록하고 해당 모바일 철회 한 행 외 P5·상위 완료를 올리지 않는다.
  PROVES: progress_integrity
  EVIDENCE: pending

ABANDON: RR2 Clerk 대상 탐색 화면의 도구 출력에 계정 식별 정보가 포함되어 runbook 즉시 중단 조건이 발동했다. 대상 세션 식별을 완료하지 않았고 raw 값을 문서에 전재하지 않는다.
ABANDON: RR3 중단 시점까지 세션 철회·확인 제출·전체 세션 변경은 실행하지 않았으며 이번 단일 사용 승인은 폐기한다.
ABANDON: RR4 세션을 철회하지 않았으므로 같은 모바일 탭의 만료 UX·private payload·SDK 경로를 관측하지 않았다.
ABANDON: RR5 세션을 철회하지 않아 복구 작업은 필요하지 않았고 다른 세션·설정·Production을 변경하지 않았다.
ABANDON: RR6 재검수 결과를 PASS로 기록하지 않으며 P5 `10/19 OPEN`과 상위 완료 경계를 유지한다.

ABANDON: 이 재검수는 정확한 모바일 ready 세션을 식별할 수 없거나 승인 10분이 경과하면 철회 없이 종료한다. 제공자 장애·세션 만료·전체 세션 철회·다른 기기·Production·Vercel 환경·Supabase·DNS/domain 변경은 승인하지 않는다.
