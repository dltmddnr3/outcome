# Phase 2 · P5 모바일 운영자 세션 철회 실행 영수증

판정: `REVOCATION EXECUTED · USER OBSERVATION AND RECOVERY PENDING · P5 OPEN`

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

## 아직 증명되지 않은 항목

아래 세 항목은 모바일의 실제 다음 요청과 새 로그인이 필요하므로 아직 PASS가 아니다.

1. private payload가 사라지고 `로그인이 만료되었습니다`와 작동하는 `다시 로그인`이 표시된다.
2. private session/workspace 요청이 `401`과 안전한 승인 코드로 fail-closed 된다.
3. 동일 owner가 다시 로그인한 뒤 준비 화면과 session/workspace `200/200`이 복구된다.

따라서 모바일 운영자 세션 철회 행은 `관측·복구 대기`이며 P5 수치는 `10/19`로 유지한다.

실행 후 exact Preview의 최근 runtime을 읽기 전용으로 집계했을 때 private config `200` 한 건만 있었고, 새 private session/workspace 요청과 `401`은 아직 없었다. 이는 오류가 아니라 모바일의 다음 요청이 발생하지 않았다는 뜻이며 PASS 증거로 사용하지 않는다.

## 되돌리기와 경계

철회된 세션은 복원하지 않는다. 새 로그인으로만 복구한다. 다른 Clerk 세션, Google·email code·Apple 연결, session option, Vercel 환경·배포, Production, Supabase, DNS·domain, release 설정은 변경하지 않았다.

이 영수증은 외부 변경 실행 사실만 고정한다. 모바일 실기기 PASS, P5, HP1, HP2, hosted QA, Release Audit, Cherry acceptance, Production, Phase 2 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
