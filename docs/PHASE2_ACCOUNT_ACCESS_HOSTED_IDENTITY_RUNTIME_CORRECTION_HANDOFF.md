# Phase 2 · 개발 인증 실행 경계 보정 Builder 인계

상태: `PLANNER HANDOFF · REPOSITORY-LOCAL ONLY · NO EXTERNAL MUTATION`

Gate: `GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS.md` B9-B12

## 발견된 구조 불일치

현재 기준선에서 다음 두 조건이 동시에 존재한다.

1. `readHostedPreviewConfiguration()`은 `OUTCOME_PRIVATE_SURFACE_ENABLED=1`뿐 아니라 수파베이스 URL·공개키를 포함한 모든 호스팅 환경값이 있어야 활성화된다.
2. 실제 Vercel 기본 진입점은 `createStableHostRequestHandler()`에 `runtimeFactory`를 전달하지 않는다.

따라서 HP2 수파베이스 자원 없이 HP1 인증만 검수할 수 없고, 환경값만 넣어도 실제 클러크 실행기가 만들어지지 않는다. 외부 자원을 먼저 생성하는 방식으로 이 결함을 우회하면 안 된다.

## 구현 Outcome

수파베이스 없이도 완전한 HP1 환경 계약과 구체 인증 실행기가 있을 때에만 개발 인증 경계를 선택한다. 이 상태에서 구글·이메일 코드 시작, 인증 후 애플 연결, 콜백, 로그아웃, 만료·철회와 다른 소유자 거부를 검수할 수 있어야 한다. HP2 전까지 비공개 작업공간 데이터는 계속 차단되고 공개 대시보드는 읽기 전용을 유지한다.

## 세션 구조 보정 근거

확인일: `2026-08-25`

- Clerk 공식 동작 설명: <https://clerk.com/docs/guides/how-clerk-works/overview>
- Clerk React 시작 안내: <https://clerk.com/docs/react/getting-started/quickstart>
- Clerk OAuth 콜백 컴포넌트: <https://clerk.com/docs/react/reference/components/control/authenticate-with-redirect-callback>

클러크의 애플리케이션 도메인 세션 토큰은 클라이언트 SDK가 설정하고 짧은 주기로 갱신한다. 그러므로 서버 전용 리다이렉트와 장기 쿠키 재발급만으로는 실제 브라우저 세션을 구성할 수 없으며 코드 준비로 인정하지 않는다.

## 필수 설계 경계

- 인증 준비 상태와 호스팅 데이터 준비 상태를 별도 판정한다. HP1은 수파베이스 환경 이름이나 값에 의존하지 않는다.
- 기본 Vercel 내보내기는 환경값 누락·부분 설정·실행기 생성 실패에서 현재 비활성 설정과 `401` 경계로 닫힌다.
- 실제 실행 경로에는 구체 클러크 연동 생성 지점이 있어야 한다. 시험용 가짜 연결기나 호출자가 수동 주입한 팩토리만으로 B10을 닫지 않는다.
- 클러크 React SDK가 애플리케이션 도메인의 단기 `__session` 쿠키 생성·갱신과 OAuth 콜백을 소유한다. 서버는 같은 출처 요청에 포함된 SDK 발급 세션만 검증하며 임의 JSON 토큰을 쿠키로 승격하지 않는다.
- 서버는 클러크 세션 토큰을 직접 발급·복사·재발급하거나 수명을 연장하지 않는다. 최대 7일은 OUTCOME이 허용하는 전체 방문 상한이며, 클러크의 단기 세션 토큰 갱신 주기를 대체하지 않는다.
- 애플은 클러크 연결 설정에서 가입·로그인을 끄고, 이미 인증된 기준 소유자의 연결 흐름으로만 시작한다. 직접 애플 로그인이나 새 소유자 생성 경로를 추가하지 않는다.
- HP1 인증 상태가 준비되어도 `/api/private/workspace`는 HP2 데이터 실행기가 없으면 존재 여부를 노출하지 않는 차단 응답을 유지한다.
- 공개 `/api/dashboard`와 상태 조회는 기존 동작을 유지하고 모든 비공개 변경은 정확한 출처 검사 뒤에서만 허용한다.
- 비밀값, 이메일, 클러크 주체 식별자, 세션 식별자, 토큰, 쿠키와 인증 코드는 로그·오류·테스트 결과·Gate 증거·번들에 들어가지 않는다.

## 허용 파일

- `api/index.mjs`
- `server/account-access-hosted*.mjs`
- `server/account-access-api*.mjs`
- `server/account-access*.mjs` 중 인증·세션 경계에 필요한 최소 범위
- `src/components/AccountWorkspace*`와 `src/lib/api*` 중 인증 전용 상태를 표현하는 최소 범위
- 관련 테스트·브라우저 검사
- 실제로 사용하는 공식 런타임 의존성이 필요한 경우에만 `package.json`과 잠금 파일
- 한 개의 보정 증거 문서

Planner 문서, OUTCOME Map, 다른 Gate, 스냅샷, 프로젝트 레지스트리, 대시보드 위계 디자인, Cherry Note 원본·iOS와 `docs/ROADMAP 2.md`는 수정하지 않는다.

## 실패 우선 검증

구현 전에 최소한 다음 실패를 재현하는 테스트를 추가한다.

- 완전한 HP1 환경 + 구체 인증 실행기에서는 인증 경계가 선택되지만 수파베이스 이름이 없어도 된다.
- HP1 환경 누락·부분 설정·실행기 생성 오류는 비활성·401로 닫힌다.
- HP1만 준비된 상태에서 공식 클라이언트 SDK의 인증 시작·콜백·단기 토큰 갱신·로그아웃은 작동하고 작업공간 데이터는 차단된다.
- 클라이언트 SDK 없이 서버 콜백만 모의한 구현, 미검증 콜백 토큰, 다른 소유자, 만료·철회 세션, 허용하지 않은 출처와 제공자 장애가 거부된다.
- 애플 직접 시작은 거부되고 인증된 기준 소유자의 연결만 허용된다.
- 공개 읽기, 405 변경 거부, 정보 가림, 고정 빌드 영수증과 두 프로젝트 결과 지도는 변하지 않는다.

## 필수 검증

- 보정 집중 테스트와 실패 우선 영수증
- `npm run test:account-access`
- `npm run test:account-access-browser`
- `npm run test:security`
- `npm test`
- `npm run test:stable-browser`
- `npm run check:public-boundary`
- `npm run check:mutations`
- `npm run check:scope`
- `npm run check:runbook`
- `npm run build:vercel`

## 반환 계약

정확한 기준·후보 커밋과 트리, 변경 파일, 의존성 근거, 실패 우선·전체 결과 건수, 기본 비활성·HP1 인증 전용·HP2 데이터 차단·되돌리기 증거와 한계를 기록한다.

종료 문구는 `IDENTITY_CODE_READY_ONLY` 또는 `BLOCKED`다. 외부 계정·자원·비밀값·환경값·배포, 독립 검수·감사 판정, Cherry 승인, 출시, 페이즈 완료와 `EXTERNAL_OUTCOME_COMPLETE` 권한은 없다.
