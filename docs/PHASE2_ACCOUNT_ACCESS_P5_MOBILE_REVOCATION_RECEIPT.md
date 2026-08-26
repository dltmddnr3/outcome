# Phase 2 · P5 모바일 운영자 세션 철회 실행 영수증

판정: `REVOCATION EXECUTED · MOBILE UX FAIL · CORRECTION REQUIRED · P5 OPEN`

## 고정 기준선

- source commit: `4613372adbec17e35c2498e55ab4210cc8b33c34`
- source tree: `293e64b76e9e5b3b1ebf1e5d5ca5f6a7180eefee`
- Preview deployment: `dpl_3MYfocjsQ6XvTrCoTNXE6Pp4U7wY` · `READY`
- stable Preview alias: `https://outcome-git-codex-hp1-session-bearer-white-castle.vercel.app/workspace`
- pre-execution P5 matrix: `10/19`

## 승인과 실행

- Cherry가 `모바일 세션 철회` 흐름에만 유효한 10분 단일 사용 승인을 제공했다.
- Clerk `Development`의 활성 모바일 Safari 검수 세션이 정확히 한 개임을 확인했다.
- 해당 기기의 `Revoke device`만 실행했고, 전체 기기 철회는 실행하지 않았다.
- 실행 뒤 모바일 활성 행은 `0`, 대상이 아닌 데스크톱 활성 행은 실행 전과 같은 `2`로 확인됐다.
- 단일 사용 승인은 이 실행으로 소비됐으며 다른 철회·만료·제공자 장애에 재사용하지 않는다.

계정명·이메일·IP·user/session/application/instance ID·token·cookie·code·secret은 기록하지 않았다.

## 모바일 실기기 관측

Cherry가 철회된 모바일 세션의 같은 탭을 새로고침했다. private project payload는 사라졌지만 일반 `로그인 필요 · Cherry 계정으로 확인` 화면이 표시됐다. 계약한 `로그인이 만료되었습니다`와 `다시 로그인`은 표시되지 않았다.

같은 관측 창의 exact Preview runtime을 읽기 전용으로 확인했지만 private session/workspace 요청과 HTTP `401`은 `0`이었다. Clerk SDK가 signed-out을 먼저 확정해 제품이 private API를 호출하기 전에 일반 로그인 상태로 전환한 소스 분기와 일치한다.

따라서 모바일 운영자 세션 철회 행은 `FAIL · 교정 필요`이며 P5 수치는 `10/19`로 유지한다. 새 Builder candidate·Preview·별도 승인 철회 재검수 전에는 PASS로 바꾸지 않는다.

재로그인 복구는 아직 수행하지 않았다. 이 FAIL 기록은 private payload가 제거된 보안 경계만 인정하며 만료 UX나 복구를 승인하지 않는다.

## 되돌리기와 경계

철회된 세션은 복원하지 않는다. 새 로그인으로만 복구한다. 다른 Clerk 세션, Google·email code·Apple 연결, session option, Vercel 환경·배포, Production, Supabase, DNS·domain, release 설정은 변경하지 않았다.

이 영수증은 외부 변경 실행 사실만 고정한다. 모바일 실기기 PASS, P5, HP1, HP2, hosted QA, Release Audit, Cherry acceptance, Production, Phase 2 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
