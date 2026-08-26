# Phase 2 · P5 모바일 철회 UX 교정 Builder Brief

상태: `PLANNER ROUTED · IMPLEMENTATION NOT STARTED · P5 10/19 OPEN`

## 실제 실패

current candidate `4613372adbec17e35c2498e55ab4210cc8b33c34`와 Preview `dpl_3MYfocjsQ6XvTrCoTNXE6Pp4U7wY`에서 Clerk Development의 모바일 검수 세션 하나만 철회했다. Cherry가 같은 모바일 탭을 새로고침한 화면은 private project payload 없이 일반 `로그인 필요 · Cherry 계정으로 확인`을 표시했다.

계약한 `로그인이 만료되었습니다`와 `다시 로그인`은 표시되지 않았다. 같은 관측 창의 exact Preview runtime에는 private session/workspace 요청이 없었다. Clerk SDK가 철회 세션을 먼저 제거한 이 no-request 경로는 안전하지만, 이전 ready tab을 일반 첫 로그인으로 오분류한 UX 때문에 모바일 운영자 철회 행은 `FAIL · CORRECTION REQUIRED`다.

## 원인

`HostedWorkspaceBody`는 Clerk SDK의 `isSignedIn`이 false이면 private API를 호출하기 전에 상태를 항상 `login`으로 바꾼다. Clerk Dashboard 철회는 브라우저 SDK 세션을 먼저 signed-out으로 만들기 때문에 서버의 `session_revoked` 매핑과 기존 `session_expired` UI가 실행될 기회가 없다.

기존 자동 테스트는 서버가 `session_revoked`를 반환하는 합성 경로와 error-code 매핑을 검증했지만, 실제 SDK의 `signed in → operator revocation → signed out` 전환 및 같은 탭 새로고침을 검증하지 않았다.

## 승인 구현 범위

1. 처음 방문한 signed-out 사용자는 지금과 같은 일반 로그인 화면을 본다.
2. 같은 탭에서 owner 준비 상태를 실제로 확인한 뒤 발생한 예상 밖 signed-out은 `session_expired`로 표시한다.
3. 같은 탭 새로고침 뒤에도 철회 상태가 일반 첫 로그인으로 오인되지 않도록 identity·token·email을 담지 않는 고정 boolean 표식만 tab-scoped storage에 보존할 수 있다.
4. 명시적 로그아웃과 `다시 로그인`은 그 표식을 먼저 지우고 일반 로그인 화면으로 복귀한다.
5. 표식은 owner session/workspace `200/200` 뒤에만 기록하며 login·loading·실패 중에는 인증 성공을 발명하지 않는다.
6. 예상 밖 signed-out 화면은 private payload, 계정 식별자, token, cookie, raw Clerk/provider 오류를 노출하지 않는다.

## Red-first 필수 검증

- 표식 없는 최초 signed-out → 일반 로그인
- owner 준비 확인 뒤 예상 밖 signed-out → `로그인이 만료되었습니다` + `다시 로그인`
- 같은 탭 새로고침 + 표식 + signed-out → 만료 화면 유지
- 명시적 로그아웃 → 표식 제거 + 일반 로그인
- `다시 로그인` → 표식 제거 + 일반 로그인
- owner 준비 전 실패·signed-out → 표식 생성 금지
- 모든 상태에서 private project·raw identity/credential 노출 `0`

단위 테스트만으로 실제 철회 PASS를 주장하지 않는다. Builder 후보와 Planner 검증 뒤 새 Preview에서 새 모바일 세션 하나를 다시 만들어 별도 10분 단일 사용 승인으로 철회를 재실행해야 한다.

## 허용 경로

- `src/components/AccountWorkspaceClerk.tsx`
- `src/components/AccountWorkspaceClerk.test.tsx`
- 필요할 때만 `scripts/account-access-browser-check.mjs`
- 이 교정의 Gate·증거 문서

## 금지 범위

- assertion 완화 또는 일반 로그인 문구를 만료 PASS로 재해석
- identity·email·user/session/application/instance ID·token·cookie·provider 오류 저장
- localStorage를 이용한 계정 간 영구 상태
- query·public endpoint·client environment synthetic failure hook
- Clerk setting/session, Vercel environment/deployment, Production, Supabase, DNS·domain 변경
- push·deploy·release·새 실기기 PASS·P5 완료 주장
- `docs/ROADMAP 2.md` 접근 또는 변경

## Builder 완료 산출물

- red-first 실패와 교정 후 focused PASS
- frontend 전체, Node 전체, account access, security, public boundary, mutation, isolated build, scope/runbook 결과
- exact commit/tree/parent와 변경 파일 목록
- 민감정보·storage·rollback 경계
- `GATES_PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_UI_CORRECTION.md` 증거 갱신

Builder 결과 `5686120d03b821c2aa4f10ea989ff67af07a759a` / tree `a90f43649dc8de0070b0450aff17dfa97a80933e`는 Parent 재검증을 통과한 `CANDIDATE_READY_ONLY`다. push·Preview deploy·실기기 재철회는 별도 승인 경계다.
