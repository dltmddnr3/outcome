# Phase 2 · P5 모바일 철회 UX 교정 Parent 검증 Gates

Outcome: Builder candidate를 exact parent와 허용 범위에서 재검증하고, SDK가 토큰을 먼저 폐기하는 안전한 경로와 stale-token 서버 `401` 경로를 구분한 뒤 Preview 승격 승인 경계만 연다.

- [x] P1: exact Builder commit·tree·parent와 변경 파일 경계가 일치한다.
  PROVES: authorization
  EVIDENCE: Builder `5686120d03b821c2aa4f10ea989ff67af07a759a`, tree `a90f43649dc8de0070b0450aff17dfa97a80933e`, parent `0112cf94f2edcd05d0c56afc87cc232048f077d1`; 변경은 승인된 TSX·test·correction Gate 3개뿐이다.
- [x] P2: 최초 로그인·ready 확인·예상 밖 signed-out·명시적 logout/retry 상태가 계약대로 분리된다.
  PROVES: implementation
  EVIDENCE: source review와 focused `16/16`에서 marker 없는 signed-out=`login`, ready marker 뒤 signed-out/reload=`session_expired`, logout/retry는 marker clear 후 Clerk signOut을 확인했다.
- [x] P3: tab-scoped 표식은 fixed boolean뿐이고 owner/workspace 성공 뒤에만 기록된다.
  PROVES: security
  EVIDENCE: sessionStorage에는 fixed `outcome.owner-ready=1`만 기록되고 owner와 workspace가 모두 성공한 뒤에만 set된다. identity·email·token·cookie·provider 값은 저장하지 않는다.
- [x] P4: SDK 선폐기 `no private request`와 stale-token `401`을 모두 fail-closed로 인정하는 실기기 계약이 고정된다.
  PROVES: progress_integrity
  EVIDENCE: runbook은 SDK가 세션을 먼저 제거하면 no-request, stale token 요청이 있으면 `401`을 요구하며 두 경로 모두 private payload `0`과 만료 UX를 요구한다.
- [x] P5: Parent 재실행 회귀와 Gate 검사가 통과한다.
  PROVES: test
  EVIDENCE: Parent 재실행 focused `16/16`; account Node `32/32` + frontend `29/29`; security `29/29`; mutations `32/32=405`; public prohibited `0`; full frontend `89/89` + Node `112/112`; isolated build·scope·runbook PASS; Builder Gate `6/6`.
- [x] P6: candidate-ready가 push·deploy·실기기 PASS·P5 완료로 승격되지 않는다.
  PROVES: boundary
  EVIDENCE: OUTCOME Map은 Preview 승격 승인을 Next로 두고 P5 `10/19`, push·deploy·실기기 재철회 미실행을 명시한다.

ABANDON: Parent 검증은 push·Preview deploy·Clerk session mutation·실기기 PASS·QA·Audit·Cherry acceptance·Production·Phase 2·`EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
