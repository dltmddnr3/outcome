# Phase 2 · P5 모바일 철회 실기기 FAIL Routing Gates

Outcome: 실제 모바일 단일 세션 철회 결과가 계약한 만료 UX와 API 증거를 충족하지 못한 사실을 숨기지 않고, 최소 Builder 교정과 새 Preview 재검수 경계로 되돌린다.

- [x] F1: exact candidate·Preview·P5 수치와 Cherry 실기기 FAIL 관측이 고정된다.
  PROVES: evidence
  CHECK: rg -q '4613372adbec17e35c2498e55ab4210cc8b33c34' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q 'dpl_3MYfocjsQ6XvTrCoTNXE6Pp4U7wY' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q 'MOBILE UX FAIL' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && echo F1_PASS
  EXPECT: F1_PASS
  EVIDENCE: exact source/Preview에서 Cherry screenshot은 private payload 없이 일반 로그인 오분류를 보였고, 영수증은 `MOBILE UX FAIL · CORRECTION REQUIRED`, P5 `10/19`를 고정한다.
- [x] F2: runtime `401` 부재와 소스 분기의 원인이 증거로 연결된다.
  PROVES: diagnosis
  CHECK: rg -q 'private session/workspace 요청이 없었다' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q '`isSignedIn`이 false이면 private API를 호출하기 전에 상태를 항상 `login`' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && echo F2_PASS
  EXPECT: F2_PASS
  EVIDENCE: exact Preview 최근 로그의 private session/workspace 요청은 `0`으로 SDK 선폐기 경계와 일치했다. source는 `!isSignedIn`에서 서버 호출 전 `login`을 선택해 이전 ready tab을 일반 첫 로그인으로 오분류했다.
- [x] F3: 첫 로그인·명시적 로그아웃·예상 밖 세션 소실을 구분하는 최소 Builder 계약이 준비된다.
  PROVES: implementation
  CHECK: rg -q '처음 방문한 signed-out 사용자는' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q '예상 밖 signed-out은 `session_expired`' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q '명시적 로그아웃과 `다시 로그인`' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && echo F3_PASS
  EXPECT: F3_PASS
  EVIDENCE: 첫 방문 login, ready 이후 unexpected signed-out 만료, explicit logout/retry login 복귀를 별도 상태로 계약했다.
- [x] F4: 민감정보 없는 탭 단위 상태와 red-first 검증·allowed paths·금지 범위가 고정된다.
  PROVES: security
  CHECK: rg -q '고정 boolean 표식만 tab-scoped storage' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q '## Red-first 필수 검증' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q '## 허용 경로' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q '## 금지 범위' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && echo F4_PASS
  EXPECT: F4_PASS
  EVIDENCE: identity·token·email 없는 tab-scoped boolean만 허용하며 red-first 7개 상태, 3개 제품 경로, 외부 변경·push·deploy 금지를 고정했다.
- [x] F5: P5 행렬과 OUTCOME Map이 `10/19 · correction required`를 보존한다.
  PROVES: progress_integrity
  CHECK: rg -q 'CURRENT-CANDIDATE OBSERVED 10/19' docs/PHASE2_ACCOUNT_ACCESS_P5_DEVICE_MATRIX.md && rg -q 'FAIL · 교정 필요' docs/PHASE2_ACCOUNT_ACCESS_P5_DEVICE_MATRIX.md && rg -q 'P5 모바일 철회 UX correction' docs/OUTCOME_MAP.md && echo F5_PASS
  EXPECT: F5_PASS
  EVIDENCE: matrix의 모바일 철회 행은 FAIL이고 OUTCOME current Next는 correction이며 P5 수치는 `10/19`다.
- [x] F6: Planner routing은 구현·배포·실기기 PASS와 상위 완료를 주장하지 않는다.
  PROVES: boundary
  CHECK: rg -q 'IMPLEMENTATION NOT STARTED' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q 'CANDIDATE_READY_ONLY.*BLOCKED' docs/PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION_BRIEF.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE.*닫지 않는다' GATES_PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_FAIL_ROUTING.md && echo F6_PASS
  EXPECT: F6_PASS
  EVIDENCE: Planner는 문서·Gate만 작성했고 제품 코드·외부 상태·push·deploy를 변경하지 않았다. Builder Gate B1-B6은 모두 open이다.

ABANDON: Planner는 제품 코드를 수정하지 않고 Builder candidate·push·deploy·새 Clerk 철회·QA·Audit·Cherry acceptance·Production·Phase 2·`EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
