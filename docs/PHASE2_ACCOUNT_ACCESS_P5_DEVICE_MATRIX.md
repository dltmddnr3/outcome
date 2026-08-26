# Phase 2 · Hosted Identity P5 실기기 완료 행렬

상태: `P5 OPEN · OBSERVED 11/19 · COMPLETION CLAIM 금지`

기준 후보: Preview deployment `dpl_Gf9sidpNc2sh7HNt2ChpHJywDCbG` · source commit `c194f3297d728020d6af16bef29ddb179b339b32` · state `READY`

이 행렬은 실제 MacBook Chrome과 모바일 시스템 브라우저에서 직접 관측한 항목만 `PASS`로 기록한다. 자동 테스트, Account Portal P3 결과, 세션 활동 또는 구현 존재는 P5 실기기 PASS를 대신하지 않는다.

인증 실패 상태 교정 `C1-C5 5/5`와 Preview 배포 `D1-D6 6/6`은 완료됐지만, 새 후보의 실제 만료·철회·제공자 장애 관측은 아직 없다.

## 현재 관측

| 환경 | 흐름 | 상태 | 근거 또는 다음 동작 |
| --- | --- | --- | --- |
| MacBook Chrome | Google 로그인 | `PASS` | 현재 허용 Preview 주소에서 owner 로그인 관측 |
| MacBook Chrome | 로그인 중 표시 | `PASS` | 권한 확인 뒤 준비 화면 전환 관측 |
| MacBook Chrome | 준비 화면 | `PASS` | 비공개 프로젝트 2개와 workspace 준비 상태 관측 |
| MacBook Chrome | 로그아웃 | `PASS` | 동일 `/workspace` 로그인 화면 복귀 관측 |
| MacBook Chrome | Google 재로그인 복구 | `PASS` | Cherry 완료 확인 + Preview session/workspace 요청 HTTP `200/200` |
| MacBook Chrome | email code 대체 로그인 | `OPEN` | 동일 owner가 코드를 직접 입력하고 준비 화면 복귀 확인 필요 |
| MacBook Chrome | 세션 만료 | `OPEN` | 만료된 세션의 다음 요청이 로그인 화면으로 fail-closed 되는지 확인 필요 |
| MacBook Chrome | 운영자 세션 철회 | `OPEN` | Clerk Development 철회 뒤 다음 요청에서 로그인 화면 복귀 확인 필요 |
| MacBook Chrome | 인증 제공자 장애 | `OPEN` | 통제된 Preview-only 장애 주입 후보와 복구 확인 필요 |
| 모바일 시스템 브라우저 | Google 로그인 | `PASS` | Cherry 직접 확인 |
| 모바일 시스템 브라우저 | callback 복귀 | `PASS` | `/workspace/sso-callback` 뒤 OUTCOME 복귀 확인 |
| 모바일 시스템 브라우저 | 로그인 중 표시 | `PASS` | 기술 진단 없는 사용자용 전환 화면 확인 |
| 모바일 시스템 브라우저 | 준비 화면 | `PASS` | 비공개 프로젝트 준비 화면 확인 |
| 모바일 시스템 브라우저 | 로그아웃 | `PASS` | Cherry 직접 확인 |
| 모바일 시스템 브라우저 | Google 재로그인 복구 | `PASS` | Cherry 직접 확인 |
| 모바일 시스템 브라우저 | email code 대체 로그인 | `OPEN` | 동일 owner가 코드를 직접 입력하고 준비 화면 복귀 확인 필요 |
| 모바일 시스템 브라우저 | 세션 만료 | `OPEN` | 만료된 세션의 다음 요청이 로그인 화면으로 fail-closed 되는지 확인 필요 |
| 모바일 시스템 브라우저 | 운영자 세션 철회 | `OPEN` | Clerk Development 철회 뒤 다음 요청에서 로그인 화면 복귀 확인 필요 |
| 모바일 시스템 브라우저 | 인증 제공자 장애 | `OPEN` | 통제된 Preview-only 장애 주입 후보와 복구 확인 필요 |

## 다음 안전 실행 순서

1. 외부 설정 변경 없이 MacBook Google 재로그인 복구를 먼저 확인한다.
2. MacBook과 모바일에서 동일 owner의 email code 대체 로그인을 각각 확인한다. 코드·이메일·계정명은 기록하지 않는다.
3. 만료·운영자 철회·인증 제공자 장애는 정상 로그인 검증과 분리한다.
4. 운영자 철회는 Development session만 대상으로 하며 실행 직전 Cherry 승인을 다시 확인한다.
5. 만료와 제공자 장애는 Production·실제 Google 장애를 만들지 않는다. Preview-only 통제 수단, rollback, 실패 후 정상 복구가 준비된 별도 Builder 후보에서만 실행한다.

## 완료 조건

P5는 위 `19/19`가 모두 실제 기기 근거로 채워지고, 계정·코드·token·cookie·raw identifier를 남기지 않은 영수증이 고정될 때만 닫는다. P5 완료도 HP2, hosted QA, Release Audit, Cherry acceptance, Production 또는 Phase 2 완료를 자동으로 닫지 않는다.
