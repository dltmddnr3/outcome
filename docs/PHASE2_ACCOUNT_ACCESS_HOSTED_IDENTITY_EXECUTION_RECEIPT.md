# Phase 2 · 개발 인증 미리보기 실행 영수증

상태: `P2 EVIDENCE CLOSED · P3-P6 OPEN`

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
- Apple 연결 전용: `미실행`

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
- P3-P6: `OPEN · NOT PROVEN`
- rollback 승인: `2026-08-25 KST Cherry 승인`
- rollback 결과: 이전 exact Production deployment로 rebuild 없이 공개 별칭 복구
- 복구 영수증: `9cbf834196e3982a7822c422a9a9b18a74d66692` / `d33a2cf61157c369e4121f4e38fd3ada97a24038` / `index-B_ICbkfO.js`
- 복구 에셋 SHA-256: `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`
- 복구 공개 검증: 화면/API `200/200`, mutation `405/405/405/405`, 금지 Clerk 식별자 `0`
- Clerk 재검증: 수락된 사용자 `1`, 대기 초대 `0`, `Invite-only`, 조직 비활성, Google 개발 공용 연결, email code 활성, Apple 직접 로그인 비활성
- 재발 방지 결정: `docs/PHASE2_VERCEL_PRODUCTION_BRANCH_CONTROL_DECISION.md`의 `RECOVERY`와 `BRANCH_CONTROL`을 분리 승인
- `HOSTED_IDENTITY_PREVIEW_ONLY`: `false`
- `EXTERNAL_OUTCOME_COMPLETE`: `false`

이 영수증은 P2만 증명한다. Google 실제 로그인, email code 실제 로그인, 인증 후 Apple 연결, 다른 사용자 거부, Vercel Preview 환경, MacBook/mobile 검수, HP1 완료, Production release 또는 Phase 완료를 증명하지 않는다.
