# OUTCOME Phase 2 · P5 인증 실패 상태 교정 Gates

Outcome: 만료·철회·제공자 장애가 접근 거부로 뭉개지지 않고 안전한 사용자 상태와 실제 재로그인 동작으로 연결되며, 실기기 판정은 계속 별도로 열린다.

- [x] C1: 호스팅 경로가 인증·만료·철회·장애·충돌·권한 실패를 승인된 사용자 상태로 정확히 매핑한다.
  PROVES: implementation
  EVIDENCE: `hostedFailureState`의 승인 코드 전체와 unknown fail-safe를 `AccountWorkspaceClerk.test.tsx`에서 검증; focused 18/18 PASS
- [x] C2: `다시 로그인`이 현재 Clerk 세션을 종료하고 `/workspace` 로그인 화면으로 복귀한다.
  PROVES: implementation
  EVIDENCE: SDK `signOut({ redirectUrl: '/workspace' })` 단일 경로와 `data-private-session-retry` 실제 action 연결 검증; focused 18/18 PASS
- [x] C3: 실패 우선 테스트가 잘못된 기존 매핑과 무동작 버튼을 재현한 뒤 교정 후보에서 통과한다.
  PROVES: test
  EVIDENCE: RED 3 failures (`hostedFailureState`, `returnToHostedLogin`, retry action 부재) → GREEN 18/18
- [x] C4: 실패 상태에서 private payload·계정 식별자·token·cookie·raw provider error 노출이 0이다.
  PROVES: security
  EVIDENCE: unknown/raw 오류는 `unavailable` 상태만 반환; security 29/29 PASS, public boundary prohibited identifiers=0
- [x] C5: 제품·전체·보안·빌드·공개 경계 회귀가 통과하고 외부 상태 변경 없이 exact candidate가 고정된다.
  PROVES: evidence
  EVIDENCE: exact candidate `8b66ab8a321c29a32f5c0fe481a0f6d18b22833b` / tree `8d66919a2b7cd53fb0332aa623708011ed66a92b`; dashboard 78/78; full frontend 81/81 + Node 112/112; isolated build PASS (`index-rrlaqkOi.js`, `index-DfyTr5bf.css`); independent Planner review PASS

ABANDON: 이 Gate의 완료는 P5 실기기 PASS, HP1 완료, provider 설정 변경, Preview deploy, Production release 또는 `EXTERNAL_OUTCOME_COMPLETE`가 아니다.
