# Phase 2 · P5 통제 실패 실기기 검수 Runbook

상태: `PREFLIGHT READY ONLY · EXTERNAL MUTATION NOT AUTHORIZED · P5 OPEN`

## 목적

MacBook 검수를 기다리는 동안 모바일의 세션 철회·인증 제공자 장애·세션 만료를 실제 Clerk Development와 exact Vercel Preview에서 한 항목씩 검수한다. 합성 query, 공개 failure endpoint, client environment hook은 사용하지 않으며 각 외부 변경은 실행 직전 Cherry의 단일 사용 승인을 다시 받는다.

## 고정 기준선

- current source: `ebac7d538152fddc432fcdb4d1ee7b80a6cbe87b`
- current tree: `83cb4182f086b3cc0ad1634fd2b44d3c6c151fc1`
- current Preview: `dpl_4P1AusHZo37fTCY92oUpVk1CrmHP` · `READY`
- stable Preview alias: `https://outcome-git-codex-hp1-session-bearer-white-castle.vercel.app/workspace`
- current P5 matrix: `10/19`; P5 `OPEN`
- Production·Supabase·DNS·domain·release mutation: 금지
- 계정·이메일·session ID·token·cookie·code·provider secret 기록: 금지

기준선이나 alias가 바뀌면 실행하지 않고 새 commit/tree/deployment를 다시 고정한다.

공식 근거:

- Clerk Session options: <https://clerk.com/docs/guides/secure/session-options>
- Clerk single-session revocation: <https://clerk.com/docs/reference/backend/sessions/revoke-session>
- Clerk Development environment boundary: <https://clerk.com/docs/guides/development/managing-environments>

## 공통 단일 사용 승인

각 창은 아래 항목을 모두 보여준 뒤 받은 Cherry의 `승인` 한 번에만 유효하다.

1. 흐름 이름: `모바일 세션 철회`, `모바일 제공자 장애`, `모바일 세션 만료` 중 하나
2. 외부 변경 대상: Clerk `Development`만
3. 영향: canonical owner의 현재 또는 새 검수 세션만; Production 사용자 없음
4. 예상 결과와 사용자 화면
5. 되돌리기와 정상 로그인 재검증
6. 유효 시간: 승인 후 10분 안에 시작, 다른 흐름에 재사용 금지

승인 전에는 Dashboard 설정, 세션, provider, Vercel 환경·배포를 변경하지 않는다.

## 창 R · 모바일 운영자 세션 철회

### 실행

1. current Preview에서 모바일 owner 준비 화면과 session/workspace HTTP `200/200`을 고정한다.
2. Clerk Dashboard에서 해당 모바일 검수 세션 하나만 식별한다. session ID와 기기·계정 식별자는 영수증에 기록하지 않는다.
3. 실행 직전 Cherry의 `모바일 세션 철회 승인`을 받는다. 2026-08-26 재검수에서는 Cherry가 교정 Preview 배포 완료 보고 직후 승인했으며 승인 시각부터 10분 안에 정확한 대상 식별이 끝날 때만 사용한다.
4. Development의 정확한 대상 세션 하나만 철회한다. 전체 세션 철회는 금지한다.
5. 모바일에서 새로고침 또는 다음 workspace 요청을 수행한다.

### PASS

- private project payload가 사라지고 `로그인이 만료되었습니다`와 작동하는 `다시 로그인`만 보인다.
- Clerk SDK가 철회 세션을 먼저 제거하면 private session/workspace 요청은 발생하지 않는다. stale token 요청이 실제로 발생하면 `401`과 안전한 승인 코드만 반환한다. 두 경로 모두 private payload는 `0`이어야 한다.
- Google 또는 email code 재로그인 후 준비 화면과 session/workspace `200/200`이 복구된다.

### 되돌리기

철회는 되돌리지 않는다. canonical owner의 새 로그인으로만 복구하며 다른 세션은 건드리지 않는다.

## 창 O · 모바일 인증 제공자 장애

### 실행

1. current Preview와 Production 불변을 고정하고 모바일을 로그아웃한다.
2. Clerk Development의 Google 공용 개발 연결 현재 상태를 읽기 전용으로 확인한다.
3. 실행 직전 Cherry의 `모바일 제공자 장애 승인`을 받는다.
4. Google 연결만 일시 비활성화한다. email code, Apple 연결, owner allowlist는 변경하지 않는다.
5. 모바일의 `Google로 계속`을 한 번 실행한다.

### PASS

- 계정 선택 또는 private payload로 진행하지 않고 고정된 한국어 재시도 오류만 표시한다.
- raw provider error, 계정 식별자, 설정 값은 화면·영수증·서버 로그에 남지 않는다.
- Google 연결을 즉시 재활성화한 뒤 동일 모바일에서 Google 로그인과 준비 화면, session/workspace `200/200`이 복구된다.

### 되돌리기

Google Development 연결을 원래 활성 상태로 복원한다. 복원이 확인되지 않으면 다른 검수 창을 시작하지 않는다.

## 창 E · 모바일 세션 만료

Clerk 공식 Session options의 Development maximum lifetime을 사용한다. 자연 만료가 아닌 cookie 삭제·로그아웃·철회를 만료 PASS로 대체하지 않는다.

### 실행

1. Clerk Development의 기존 Maximum lifetime과 Inactivity timeout 상태를 확인한다. 수명 숫자는 비밀정보가 아니지만 영수증에는 원래 상태 복원 여부만 남긴다.
2. 실행 직전 Cherry의 `모바일 세션 만료 승인`을 받는다.
3. Maximum lifetime을 공식 최소값 `5분`으로 임시 설정하고, 이후 생성되는 새 모바일 owner 세션 하나로 current Preview 준비 화면을 확인한다.
4. 설정 적용 범위가 기존 세션인지 새 세션인지 Dashboard에서 확인되지 않으면 중단한다. 새 세션 적용도 직접 확인되지 않으면 PASS를 주장하지 않는다.
5. 5분을 넘긴 뒤 다음 workspace 요청에서 만료 화면과 private payload 제거를 확인한다.
6. 원래 session option 상태를 즉시 복원한 뒤 새 로그인과 준비 화면 복구를 확인한다.

### PASS

- 실제 Clerk session lifetime 만료 뒤 `로그인이 만료되었습니다`와 작동하는 `다시 로그인`이 표시된다.
- 다음 private session/workspace 요청은 `401`이고 raw token/provider 오류는 없다.
- 원래 session option 복원과 새 로그인 후 session/workspace `200/200`이 모두 확인된다.

## 즉시 중단 조건

- Production·Supabase·DNS·domain·billing·release 설정이 변경 대상으로 보인다.
- 정확한 Development instance, 세션 하나, provider 하나 또는 원래 session option을 식별할 수 없다.
- 계정·session ID·token·cookie·code·secret이 화면 캡처나 도구 출력에 노출된다.
- stable Preview가 current source/deployment와 다르다.
- 복구 설정이 확인되지 않거나 다른 사용자·세션에 영향이 보인다.

중단 시 private Preview를 먼저 사용하지 않고, 변경한 Development 설정만 원래 상태로 복원한 뒤 Production 불변을 읽기 전용으로 확인한다.

## 판정 경계

- 한 창 PASS는 그 환경·흐름 한 행만 닫는다.
- 구현·합성 테스트·Dashboard 설정 존재는 실기기 PASS가 아니다.
- 세 창을 모두 통과해도 MacBook 잔여 항목, P5, HP1, HP2, QA, Release Audit, Cherry acceptance, Production, Phase 2와 `EXTERNAL_OUTCOME_COMPLETE`는 자동으로 닫히지 않는다.
