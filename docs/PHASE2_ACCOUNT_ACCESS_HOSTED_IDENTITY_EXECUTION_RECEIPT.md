# Phase 2 · 개발 인증 미리보기 실행 영수증

상태: `P4/P6 EVIDENCE CLOSED · P5 OPEN · HP1 OPEN`

## 승인과 기준선

- 승인: `HP1 개발 인증 외부 변경 승인: Clerk Development + Vercel Preview만 허용. Production, Supabase, DNS·도메인, 출시 변경은 금지.`
- 승인 범위: Clerk Development와 Vercel Preview만 허용
- 미승인 유지: Production·Supabase·DNS·도메인·출시
- 실행 전 공개 기준선: `9cbf834196e3982a7822c422a9a9b18a74d66692` / `d33a2cf61157c369e4121f4e38fd3ada97a24038` / `index-B_ICbkfO.js`
- 실행 전 에셋 SHA-256: `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`

## Clerk Development 비민감 관측

- 애플리케이션 이름: `OUTCOME`
- 환경 종류: `Development`
- 접근 모드: `Invite-only`
- 수락된 사용자 수: `1`
- 대기 초대 수: `0`
- 조직 기능: `사용 안 함`
- 임의 가입: `차단`
- Google: `개발 공용 연결 활성`
- email code: `활성`
- Apple 직접 가입·로그인: `비활성`
- Apple 연결 전용: `인증 후 연결 검증 완료`

이메일, 사용자·애플리케이션·인스턴스 식별자, 키·토큰·쿠키·인증 코드는 읽기 결과나 영수증에 기록하지 않았다.

## 중단 영수증

- 원인: 승인된 문서 Git push가 Vercel Git 연동을 통해 Production 자동 배포를 생성했다.
- 변경 후 공개 영수증: `270ff7be8420765f9324dccfcd754af37c794c2f` / `7b0ac361fb5ace24b70c780ede8985408a22c9de` / `index-B_ICbkfO.js`
- 변경 후 에셋 SHA-256: `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`
- 에셋 바이트 변화: `없음`
- `/cherry-note-dashboard`: `200`
- `/api/dashboard`: `200`
- `POST/PUT/PATCH/DELETE /api/dashboard`: `405/405/405/405`
- 공개 API 금지 Clerk 식별자 탐지: `0`
- Vercel 관측: 새 Production 배포와 직전 기준선 Production 배포가 모두 `READY`이며 rollback 후보로 존재한다.

## 현재 판정

- P1: 승인 증거 유지
- P2: `CLOSED · DEVELOPMENT SINGLE-OWNER BOUNDARY ONLY`
- P3: `CLOSED · G/E/A/D/R 5/5 PASS`
- P4: `CLOSED · PREVIEW-ONLY IMMUTABLE DEPLOYMENT`
- P5: `OPEN · DIRECT DEVICE MATRIX INCOMPLETE`
- P6: `CLOSED · REDACTED PREVIEW/COST/ROLLBACK RECEIPT`
- rollback 승인: `2026-08-25 KST Cherry 승인`
- rollback 결과: 이전 exact Production deployment로 rebuild 없이 공개 별칭 복구
- 복구 영수증: `9cbf834196e3982a7822c422a9a9b18a74d66692` / `d33a2cf61157c369e4121f4e38fd3ada97a24038` / `index-B_ICbkfO.js`
- 복구 에셋 SHA-256: `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`
- 복구 공개 검증: 화면/API `200/200`, mutation `405/405/405/405`, 금지 Clerk 식별자 `0`
- Clerk 재검증: 수락된 사용자 `1`, 대기 초대 `0`, `Invite-only`, 조직 비활성, Google 개발 공용 연결, email code 활성, Apple 직접 로그인 비활성
- 재발 방지 결정: `docs/PHASE2_VERCEL_PRODUCTION_BRANCH_CONTROL_DECISION.md`의 `RECOVERY`와 `BRANCH_CONTROL`을 분리 승인
- `HOSTED_IDENTITY_PREVIEW_ONLY`: `false`
- `EXTERNAL_OUTCOME_COMPLETE`: `false`

이 영수증은 P2·P3·P4·P6만 증명한다. MacBook/mobile P5 전체 흐름 검수, HP1 완료, Production release 또는 Phase 완료를 증명하지 않는다. P6 상세는 `docs/PHASE2_ACCOUNT_ACCESS_P6_FINAL_RECEIPT.md`에 있다.

## P3 직접 검증 결과

- 실행 절차: `docs/PHASE2_HOSTED_IDENTITY_P3_DIRECT_PROBE.md`
- Google 로그인: `PASS · Account Portal signed-in 상태와 Clerk Google social account를 교차 확인 · 사용자 수 1 유지`
- email code 대체 로그인: `PASS · 로그아웃 뒤 동일 소유자가 email code로 로그인하고 새로고침 뒤 세션 유지 확인`
- Apple 연결 전용: `PASS · 인증된 Account 화면에서 연결 완료 · Clerk social account 2개(Google·Apple)와 사용자 수 1 교차 확인`
- Apple 직접 가입·로그인: `PASS · 로그아웃 뒤 sign-in 화면에서 Google·email만 노출되고 Apple 선택지 없음`
- 다른 사용자 거부: `PASS · 초대받지 않은 다른 Google 계정 시도 뒤 일반 sign-in 복귀 · 사용자 1·대기 초대 0 유지`
- 로그아웃·세션 철회: `PASS · 사용자 로그아웃 뒤 sign-in 복귀 · Clerk 모든 기기 세션 철회 뒤 기존 Account Portal 새로고침에서 sign-in 강제`

P3 판정: `G/E/A/D/R 5/5 PASS`. 이 판정은 P4 Vercel Preview 환경, P5 MacBook/mobile 전체 흐름, P6 최종 영수증, HP1 완료, HP2 또는 Production release를 증명하지 않는다.

## P4 Preview 전용 환경과 배포

- 변경 전 Vercel 환경값: `0`
- 변경 후 허용 이름: `6/6`
- 대상: `Preview 6/6`
- Production 연결: `0`
- Development 연결: `0`
- 예상 밖 환경 이름: `0`
- 값 기록: `0`
- 되돌리기 Preview: `dpl_BcXw6i4GWipQpszQaozZy93UbCXo` · exact commit `270ff7be8420765f9324dccfcd754af37c794c2f` · `READY`
- 환경 변경 후 후보 Preview: `dpl_8LjkbN8B4YKf2u1Ezq9uPkyE55QE` · exact commit `270ff7be8420765f9324dccfcd754af37c794c2f` · `READY`
- 공개 Production 불변: `9cbf834196e3` / `d33a2cf61157` / `index-B_ICbkfO.js`
- 공개 검증: 화면/API `200/200`; mutation `32/32=405`; API read-only JSON `28/28`; 공개 경계 금지 식별자 `0`

P4 판정: `PASS`. Preview는 Vercel 인증 보호 아래 있으며 실제 MacBook/mobile 로그인·불러오는 중·준비·로그아웃·만료·철회·제공자 장애 흐름은 P5에서 별도로 실측한다. P4는 P5/P6, HP1 완료, HP2, Production release 또는 Phase 완료를 증명하지 않는다.

## P5 맥북 현재 후보 재검증

- 관측 시각: `2026-08-26T08:19:27+09:00`
- 현재 후보: commit `64d58ef643acec74c65a89e293f0bfe9e1d67cda` · deployment `dpl_2VoNJzCykyky3vsKARXkAWprmZts` · Preview `READY`
- 현재 허용 주소: `https://outcome-git-codex-hp1-session-bearer-white-castle.vercel.app/workspace`
- 실패 재현: 이전 고정 배포 주소에서 Google 로그인 후 `/api/private/session`이 `401`을 반환했다. 비민감 런타임 진단은 `azpMatchesConfiguredOrigin=false`, `sdkReason=token-invalid-authorized-parties`였으며 계정·토큰·쿠키·식별자는 기록하지 않았다.
- 복구: 같은 Chrome 세션을 현재 허용 주소로 전환했다. 권한 확인 중 상태를 거쳐 전역 사이드바 `1`, 허용된 비공개 프로젝트 `2`, 결과 지도 `1`, 가로 넘침 `0`으로 준비 상태가 확인됐다.
- 판정: 맥북 Google 로그인·불러오는 중·준비 흐름은 현재 후보에서 `PASS`. 이전 고정 배포 주소는 허용 주소가 아니므로 P5 검수 링크로 재사용하지 않는다.
- 로그아웃: `2026-08-26T08:27+09:00` 정상 준비 상태에서 로그아웃 후 같은 `/workspace`가 로그인 화면으로 돌아왔고 Google 버튼 노출 `1`, 로그아웃 버튼 `0`, 비공개 프로젝트 `0`, 접근 거부 `0`을 확인했다.
- 재로그인: Google 계정 선택 화면까지 정상 전환됐다. canonical owner 선택과 준비 상태 복귀는 사용자 선택 대기이므로 아직 통과로 기록하지 않는다.
- 잔여: 맥북 Google 재로그인 복구·email code·만료·철회·인증 제공자 장애, 모바일 시스템 브라우저 전체 행렬은 미실행이다.

P5는 잔여 행렬이 남아 있어 `OPEN`이다. 이 재검증은 P6, HP1 완료, HP2, 독립 검수, 출시 감사, Cherry 승인, 출시 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.

## P5 모바일 콜백 404 교정

- 실패 관측: `2026-08-26 KST` 모바일 시스템 브라우저의 Google 로그인 완료 후 `/workspace/sso-callback`에서 Vercel `404 NOT_FOUND`가 직접 관측됐다.
- 원인: `vercel.json`은 `/workspace`만 SPA fallback으로 연결하고 실제 Google·Apple 콜백 경로는 연결하지 않았다.
- 실패 우선: callback rewrite assertion 추가 후 `server/stable-host.test.mjs` 8/9, 새 assertion 실패.
- 교정 후보: commit `aadac57a2997cf0512a5605c930417fdb1e06cae` · deployment `dpl_ChSioyuH3Wb1LsqD9UVYtVqJBoFV` · Preview `READY`.
- 변경: `/workspace/sso-callback`과 `/workspace/apple-callback`을 `/index.html`로 연결했다. API·기존 workspace·공개 dashboard routing은 변경하지 않았다.
- 회귀: focused 9/9, security 29/29, frontend 78/78, Node 112/112, Vercel build와 built stable-host 9/9 PASS.
- live routing: Google callback은 `200 text/html`, title `OUTCOME`, asset `index-BQhQu5vc.js`; Apple callback 직접 탐색은 Vercel 404가 아니라 OUTCOME callback 처리 후 Clerk Development sign-in으로 전환됐다.

이 교정은 콜백 전달만 증명한다. 모바일 실제 Google 로그인 완료 후 준비 상태 복귀와 나머지 P5 행렬은 다시 실측해야 하므로 P5는 `OPEN`이다.

## P5 모바일 Google 준비 상태 재검증

- 사용자 직접 확인: `2026-08-26 KST` 교정된 안정 주소에서 모바일 Google 로그인과 콜백 후 OUTCOME 준비 화면 복귀를 확인했다.
- 서버 대조: exact Preview `dpl_ChSioyuH3Wb1LsqD9UVYtVqJBoFV`에서 `/api/private/config` `2`회, `/api/private/session` `1`회, `/api/private/workspace` `1`회가 관측됐고 총 `4/4` 요청이 HTTP `200`이었다.
- 판정: 모바일 시스템 브라우저의 Google 로그인·콜백·불러오는 중·준비 흐름은 `PASS`.
- 잔여: 모바일 로그아웃·email code·만료·철회·인증 제공자 장애와 맥북 Google 재로그인 복구·email code·만료·철회·인증 제공자 장애는 아직 열려 있다.

P5와 P6은 잔여 행렬 때문에 계속 `OPEN`이다.

## P5 모바일 재로그인과 로딩 화면 교정

- `2026-08-26 KST` Cherry가 모바일 시스템 브라우저에서 로그아웃 뒤 Google 재로그인과 두 비공개 프로젝트 준비 화면 복귀를 직접 확인했다.
- 모바일 Google 로그인·콜백·불러오는 중·준비·로그아웃·재로그인 복구는 `PASS`다.
- 인증 전환 중 화면은 내부 권한·서버·completion authority 진단을 제거하고 `로그인 중`·`잠시만 기다려 주세요.`만 표시한다. 세션이 남은 장기 지연에는 `로그인 취소`만 복구 동작으로 유지한다.
- 자동 검증은 1440×900·390×844·375×812에서 loading aria-busy `true`, technical visible copy hit `0`, horizontal overflow `0`을 확인했다.
- email code·만료·철회·인증 제공자 장애와 맥북 잔여 행렬은 미실행이므로 P5·P6은 계속 `OPEN`이다.
