# Phase 2 · 개발 인증 미리보기 실행 절차

상태: `PREFLIGHT ONLY · HP1 APPROVAL REQUIRED · NO_EXTERNAL_MUTATION`

이 문서는 Cherry가 정확한 HP1 외부 변경 문구를 승인한 뒤에만 사용하는 실행 절차다. 문서 작성과 검증은 클러크·구글·애플·버셀 자원, 환경값, 미리보기 배포 또는 실제 로그인을 생성·변경하지 않는다.

## 실행 기준선

- 저장소 일치 조건: `HEAD=origin/main`
- 현재 공개 커밋: `9cbf834196e3982a7822c422a9a9b18a74d66692`
- 현재 공개 트리: `d33a2cf61157c369e4121f4e38fd3ada97a24038`
- 현재 공개 에셋: `index-B_ICbkfO.js`
- 현재 공개 에셋 SHA-256: `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`
- 공개 주소: `https://outcome-five.vercel.app/cherry-note-dashboard`
- 공개 확인: 화면 `200`, `/api/dashboard` 변경 요청 `POST/PUT/PATCH/DELETE=405`
- 비공개 기능: 비활성
- 승인 전 관측: P1-P6 `0/6`
- 현재 HP1 Gate: P1-P6 `1/6`; P1 exact 범위 승인만 닫혔고 P2-P6은 실제 외부 실행·검증 대기
- 실행 후보 커밋·트리·에셋: `9cbf834196e3982a7822c422a9a9b18a74d66692` / `d33a2cf61157c369e4121f4e38fd3ada97a24038` / `index-B_ICbkfO.js`
- 기준선 관측: `2026-08-25T16:21:57+09:00`; 공개 API의 12자리 커밋·트리 접두사와 로컬 전체 Git 객체가 일치하고 공개 에셋 바이트 해시가 위 SHA-256과 일치했다.

실행 직전 기준선이 한 항목이라도 달라지면 중단하고 이 절을 새 불변 영수증으로 갱신한다. 현재 공개 기준선과 별도 미리보기 후보를 혼합하지 않는다.

## Git/Vercel 자동 Production 배포 경계

`2026-08-25 KST` 실측에서 이 Vercel 프로젝트는 GitHub `main`을 Production branch로 추적했고, `main` push가 즉시 새 Production deployment와 공개 별칭 갱신을 만들었다. 따라서 HP1 동안의 문서-only push도 Production 불변 조건을 위반한다.

- Production 기준선이 복구되기 전에는 Clerk·Vercel의 추가 외부 변경과 `main` push를 모두 중단한다.
- HP1 영수증·Gate 문서 커밋은 로컬에 고정하되, Production branch control 결정 전에는 원격 `main`에 push하지 않는다.
- Preview 후보는 Production branch가 아닌 별도 Git branch 또는 명시적 Preview deployment로만 만든다.
- 장기 기본안은 GitHub `release`를 Vercel Production branch로 분리하고 `main`을 Preview branch로 운용하는 것이다. 이 변경은 rollback과도, HP1 승인과도 별개의 외부 설정 결정이다.
- `release` branch 생성·보호, Vercel Production branch 변경, 자동 도메인 할당 변경, 자동 deployment 비활성화 중 어느 것도 Cherry의 정확한 별도 승인 전에는 실행하지 않는다.

공식 근거:

- Vercel Git 연동은 production branch push를 Production deployment로 만들며 다른 branch push를 Preview로 만든다: <https://vercel.com/docs/git>
- Production branch는 Project Settings의 Production environment → Branch Tracking에서 다른 branch로 변경할 수 있다: <https://vercel.com/docs/git#production-branch>
- 과거 Production deployment로의 instant rollback은 rebuild 없이 domain alias를 이전 배포에 다시 연결한다: <https://vercel.com/docs/deployments/promoting-a-deployment#instant-rollback>

## 승인 전 조건

다음 조건이 모두 충족되기 전에는 외부 작업을 시작하지 않는다.

1. Cherry의 정확한 HP1 외부 변경 승인 문구가 이 작업에 직접 도착했다.
2. 코드 준비 B9-B12가 정확한 후보에서 모두 닫혔다.
3. 후보가 `origin/main`과 일치하고 공개 운영본은 비공개 비활성 상태다.
4. 영수증 양식 `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_RECEIPT_TEMPLATE.md`가 준비됐다.
5. Production·Supabase·도메인·출시가 이번 승인 범위가 아니라는 점을 다시 확인했다.

## 허용된 외부 변경

정확한 HP1 승인 후에도 다음 작업만 순서대로 허용한다.

- Clerk `Development` 인스턴스 하나를 개발 인증 검증용으로 구성한다.
- 임의 가입을 허용하지 않고 수동 생성한 단일 소유자만 접근하도록 구성한다.
- Google을 기본 로그인, 이메일 인증 코드를 대체 로그인으로 활성화한다.
- Apple은 이미 인증된 소유자의 외부 계정 연결에만 노출하고 가입·직접 로그인은 비활성화한다.
- 아래 HP1 환경 이름만 Vercel `Preview` 대상에 연결한다. 값은 문서·Git·출력에 기록하지 않는다.
  - `OUTCOME_PRIVATE_SURFACE_ENABLED`
  - `OUTCOME_CLERK_PUBLISHABLE_KEY`
  - `OUTCOME_CLERK_SECRET_KEY`
  - `OUTCOME_OWNER_SUBJECT`
  - `OUTCOME_PRIVATE_ALLOWED_ORIGIN`
  - `OUTCOME_PRIVATE_ROLLBACK_DEPLOYMENT`
- 환경 변경 뒤 새 커밋 고정 Preview 배포 하나를 만들고 MacBook·모바일 시스템 브라우저에서 직접 검증한다.
- 실패 시 아래 되돌리기 순서로 개발 미리보기만 폐쇄한다.

## 금지된 외부 변경

- Vercel Production 환경값 추가·변경, Production 배포 승격 또는 공개 주소 변경
- Supabase 프로젝트·조직·데이터베이스·스키마·RLS·키·환경값 생성 또는 변경
- Google Cloud·Apple Developer 운영 OAuth 애플리케이션, 키, 서비스 ID 또는 도메인 검증 생성·변경
- DNS, 사용자 정의 도메인, Clerk Production 인스턴스 또는 Production 자격증명 변경
- 결제, 유료 플랜, 비용 상한, WAF, 외부 경보·메시지 발송 또는 운영 데이터 변경
- 임의 가입, 두 번째 소유자, 조직 기능, 프로젝트 쓰기·동기화·삭제 기능 활성화
- 독립 사용성·제품 검수, 출시 감사, Cherry 승인, 출시, Phase 완료 또는 `EXTERNAL_OUTCOME_COMPLETE` 자동 진행

## 공식 제약 확인

확인일: 2026-08-25

- Clerk 환경 분리와 개발·운영 세션 구조: <https://clerk.com/docs/guides/development/managing-environments>
- Clerk 세션 토큰과 클라이언트 SDK 갱신 구조: <https://clerk.com/docs/guides/how-clerk-works/overview>
- Clerk React SDK 필수 Provider 구조: <https://clerk.com/docs/react/getting-started/quickstart>
- OAuth 콜백과 불투명 가입 차단 옵션: <https://clerk.com/docs/react/reference/components/control/authenticate-with-redirect-callback>
- 소셜 연결의 가입·로그인 및 연결 전용 설정: <https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview>
- Google 개발 공용 자격증명과 운영 사용자 지정 자격증명: <https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google>
- Apple 개발 공용 자격증명과 운영 사용자 지정 자격증명: <https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple>
- Vercel Preview 환경값은 이후 새 Preview 배포에 적용됨: <https://vercel.com/docs/environment-variables>
- Vercel Production·Preview·Development 분리: <https://vercel.com/docs/deployments/environments>

개발 공용 제공자 자격증명을 사용할 수 있으면 별도 Google Cloud·Apple Developer 자원을 만들지 않는다. 공식 제약이 현재 화면과 다르거나 운영 자격증명을 요구하면 범위를 넓히지 않고 중단한다.

## P1-P6 실행 매핑

### P1 · 승인 및 불변 후보

- 정확한 승인 문구를 비민감 참조로 기록한다.
- `HEAD=origin/main`, 후보 커밋·트리·에셋과 공개 운영 영수증을 고정한다.
- 불일치하면 실행하지 않는다.

### P2 · 개발 환경과 단일 소유자

- Clerk Development, 단일 수동 소유자, 임의 가입 차단, 조직 미사용을 확인한다.
- 이메일·주체 식별자·인스턴스 ID는 영수증에 기록하지 않는다.

### P3 · 인증과 연결 경계

- Google 로그인과 이메일 코드 대체 경로를 검증한다.
- OAuth 콜백에서 불투명 가입이 차단되고 다른 소유자가 서버에서 거부되는지 확인한다.
- 인증된 소유자만 Apple 연결을 시작할 수 있고 Apple 직접 가입·로그인이 거부되는지 확인한다.
- 클라이언트 SDK의 세션 갱신, 로그아웃, 만료·철회와 제공자 장애 차단을 확인한다.

### P4 · Preview 전용 환경과 배포

- 허용된 여섯 환경 이름만 Preview에 존재하고 Supabase·Production 환경은 불변인지 확인한다.
- 환경 변경 이후 생성된 새 커밋 고정 Preview만 사용한다.
- 공개 운영 주소의 커밋·트리·에셋이 변하지 않았는지 확인한다.

### P5 · MacBook·모바일 직접 검증

- 두 시스템 브라우저에서 로그인, 콜백, 갱신, 로그아웃, Apple 연결 전용, 다른 소유자 거부를 확인한다.
- HP2 전 `/api/private/workspace`가 일반화된 차단 상태이며 프로젝트·작업공간 존재 여부를 노출하지 않는지 확인한다.
- 스크린샷과 로그에 계정·코드·토큰·쿠키·식별자가 없음을 확인한다.

### P6 · 영수증과 되돌리기

- 실제 결과, 실패·미실행 행, 비용 상태, 공개 경계, 되돌리기 결과를 영수증 양식에 기록한다.
- 실패 또는 미실행 행이 하나라도 있으면 P6와 HP1 결과를 닫지 않는다.
- HP2는 자동 시작하지 않는다.
- 독립 검수·출시 감사·Cherry 승인은 각각 별도 신규 후보와 별도 권한으로만 시작한다.

## 즉시 중단 조건

- 정확한 HP1 승인 문구가 없거나 승인 범위가 모호함
- 후보·`origin/main`·공개 영수증 중 하나라도 불일치
- Production 또는 Supabase 환경·자원을 요구함
- 개발 공용 흐름 대신 Google Cloud·Apple Developer 운영 자격증명을 요구함
- 임의 가입, Apple 직접 로그인, 다른 소유자 접근 또는 작업공간 존재 정보가 관측됨
- 세션 토큰을 서버가 재발급하거나 키·토큰·쿠키·인증 코드·식별자가 출력됨
- 공개 화면/API/405/정보 가림 또는 Cherry Note 보존 스냅샷에 회귀가 생김
- Preview 되돌리기 대상이 고정되지 않았거나 환경 변경 뒤 새 배포를 식별할 수 없음

중단 시 실패를 성공으로 완화하거나 다른 제공자·데이터로 대체하지 않는다. 민감값 노출 시 화면·로그 기록을 멈추고 자격증명 철회·회전은 별도 승인으로 판단한다.

## 되돌리기 순서

1. Preview의 `OUTCOME_PRIVATE_SURFACE_ENABLED`를 먼저 제거하거나 비활성화한다.
2. Clerk Development의 해당 소유자 세션을 모두 철회한다.
3. 허용된 HP1 Preview 환경 이름을 제거한다.
4. 새 Preview가 비활성·작업공간 `401`·변경 요청 `405`로 닫혔는지 확인한다.
5. 공개 Production 주소가 기존 커밋·트리·에셋과 동일한지 확인한다.
6. 공개 화면 `200`, `/api/dashboard`, 405 행렬, 금지 식별자 `0`을 재검증한다.
7. Clerk Development 인스턴스 삭제는 별도 삭제 승인 전까지 보존 또는 비활성 상태로 둔다.

## 결과 기록

- 모든 결과는 `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_RECEIPT_TEMPLATE.md`의 이름·상태·비민감 영수증 칸에만 기록한다.
- 이메일, 사용자·세션·인스턴스 식별자, 키 값, 토큰, 쿠키, 인증 코드와 콜백 질의 문자열은 기록하지 않는다.
- 이 절차의 성공은 `HOSTED_IDENTITY_PREVIEW_ONLY`이며 HP2, 독립 검수, 출시 감사, Cherry 승인, 출시 또는 외부 완료가 아니다.
