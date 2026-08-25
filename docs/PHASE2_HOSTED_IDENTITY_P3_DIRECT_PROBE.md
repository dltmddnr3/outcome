# Phase 2 · Hosted Identity P3 직접 검증 절차

상태: `EXECUTION READY · OWNER INTERACTION REQUIRED · NO P3 CLOSURE`

## 목적

P2에서 고정한 Clerk Development 단일 소유자 경계가 실제 인증 흐름에서도 유지되는지 검증한다. 이 문서는 P3 검증 순서와 합격 기준만 정의하며 로그인, 코드 입력, 다른 계정 사용 또는 세션 철회를 대신하지 않는다.

## 공통 경계

- 대상: `OUTCOME` Clerk `Development` Account Portal
- 허용 소유자: P2에서 수락된 정확히 한 명
- 접근 모드: `Invite-only`
- 조직: 사용 안 함
- 기록 금지: 이메일, 계정 이름·사진, 사용자·세션·애플리케이션·인스턴스 식별자, OAuth·email code, 토큰, 쿠키, callback query
- 각 probe는 상태·시각·일반화된 결과만 기록한다.

## Probe G · Google 기본 로그인

1. 소유자가 Account Portal의 `Continue with Google`을 선택한다.
2. 사용자가 직접 계정을 선택하고 Google 인증을 완료한다.
3. callback이 Account Portal로 돌아오고 user profile 접근이 열린다.
4. 새로고침 뒤에도 동일 세션이 유지되는지 확인한다.

PASS: 인증된 user profile이 열리고 사용자 수가 `1`로 유지되며 새 초대·조직·두 번째 사용자가 생기지 않는다.

## Probe E · email code 대체 로그인

1. Google 세션에서 로그아웃한다.
2. 동일 소유자가 email 경로를 시작한다.
3. 인증 코드는 사용자가 직접 입력하고 화면·로그·영수증에 남기지 않는다.
4. 인증 뒤 동일 user profile로 돌아오는지 확인한다.

PASS: email code로 동일 소유자 세션만 열리고 비밀번호·link 방식이나 새 사용자가 생성되지 않는다.

## Probe A · Apple 연결 전용

1. 로그인 화면에 Apple 직접 로그인 선택지가 없음을 확인한다.
2. Google 또는 email code로 인증된 user profile에서만 Apple account linking을 시작한다.
3. Apple 인증과 동의는 사용자가 직접 완료한다.
4. 연결 뒤 사용자 수가 `1`로 유지되는지 확인한다.
5. 로그아웃한 새 세션에서 Apple 직접 가입·로그인이 여전히 노출되지 않는지 확인한다.

PASS: Apple은 인증 후 연결로만 동작하고 직접 가입·로그인은 열리지 않는다.

## Probe D · 다른 사용자 거부

1. 기존 소유자 세션과 분리된 브라우저 컨텍스트를 사용한다.
2. 초대받지 않은 별도 계정으로 Google callback 또는 email 시작을 시도한다.
3. `Invite-only` 거부가 일반화된 실패로 나타나고 사용자·프로젝트·작업공간 존재를 노출하지 않는지 확인한다.
4. Clerk 사용자 수와 수락 초대 수가 변하지 않았는지 재확인한다.

PASS: 다른 계정은 접근할 수 없고 사용자 수가 `1`, 대기 초대 `0`으로 유지된다.

## Probe R · 로그아웃·철회

1. Account Portal 로그아웃 뒤 user profile 접근이 닫히는지 확인한다.
2. 새 로그인 후 Clerk Development에서 해당 세션을 철회한다.
3. 기존 browser의 다음 요청·새로고침에서 세션이 무효화되는지 확인한다.

PASS: 로그아웃과 서버 철회가 모두 기존 세션을 닫고 자동 복구나 무한 callback을 만들지 않는다.

## P3 판정

P3는 `G/E/A/D/R` 다섯 probe가 모두 PASS이고 비민감 영수증이 고정될 때만 닫는다. 하나라도 미실행·실패이면 P3는 열린 상태다. P3 PASS는 Vercel Preview 환경, MacBook/mobile 전체 검수, HP1 완료, HP2, Production release 또는 Phase 완료를 열지 않는다.
