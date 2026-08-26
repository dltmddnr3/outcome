# Phase 2 · P5 인증 실패 상태 교정 Builder Brief

상태: `PLANNER AUTHORIZED · IMPLEMENTATION NOT STARTED · P5 OPEN`

## 문제

`HostedWorkspaceBody`는 인증된 세션의 owner/workspace 요청이 실패할 때 `private_workspace_unavailable`만 `unavailable`로 구분하고 나머지를 모두 `access_denied`로 표시한다. 따라서 서버가 이미 구분하는 `session_expired`, `session_revoked`, `authentication_unavailable`, `membership_conflict`가 사용자에게 정확한 복구 상태로 전달되지 않는다. `AccountWorkspace`의 `session_expired` 화면에 있는 `다시 로그인` 버튼도 동작이 연결되어 있지 않다.

이 상태로 P5 만료·철회·인증 제공자 장애를 실기기 검수하면 잘못된 UX를 승인하게 된다.

## 승인 구현 범위

1. 호스팅 Clerk 경로에서 서버 오류 코드를 다음 사용자 상태로 안정적으로 매핑한다.
   - `authentication_required` → `login`
   - `session_expired`, `session_revoked` → `session_expired`
   - `authentication_unavailable`, `private_workspace_unavailable` → `unavailable`
   - `membership_conflict` → `conflict`
   - `owner_mismatch`, `membership_inactive`, `project_access_denied` → `access_denied`
   - 알 수 없는 실패 → `unavailable`
2. `session_expired`의 `다시 로그인`은 현재 Clerk 세션을 안전하게 종료하고 `/workspace` 로그인 화면으로 복귀하는 실제 동작이어야 한다.
3. 만료·철회·장애 상태에서 private project payload, 계정 식별자, token, cookie, raw provider error를 표시하지 않는다.
4. 상태별 UI와 재로그인 동작을 실패 우선 자동 테스트로 증명한다.

## 금지 범위

- 실기기 PASS 또는 P5 완료 주장
- query parameter, public endpoint, client environment로 synthetic failure hook 추가
- Clerk setting/session, Vercel environment/deployment, Production, Supabase, DNS, domain 변경
- push, deploy, release, provider outage 유발
- 이메일·코드·token·cookie·raw identifier 기록
- `docs/ROADMAP 2.md` 접근 또는 변경

## Builder 완료 산출물

- 최소 제품 코드와 테스트 변경
- focused test, frontend 전체, Node 전체, security, isolated build, public-boundary 결과
- exact commit/tree/parent와 변경 파일 목록
- 공개 노출·mutation·rollback 경계
- `GATES_PHASE2_ACCOUNT_ACCESS_P5_FAILURE_STATE_CORRECTION.md` 증거 갱신

Builder candidate는 P5 실기기 검수 가능성을 열 뿐 P5, HP1, HP2, QA, Audit, Cherry acceptance, Production 또는 Phase 2를 닫지 않는다.
