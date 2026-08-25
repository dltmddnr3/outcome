# Phase 2 · Hosted Identity Preview Gates

Outcome: Cherry가 승인한 개발 환경에서 정확히 한 명의 canonical owner가 Google·email code로 로그인하고 Apple을 연결한 뒤 MacBook/mobile에서 로그인·로그아웃·거부·복구를 직접 검수한다.

- [x] P1: Cherry가 HP1의 정확한 외부 변경 범위를 명시적으로 승인한다.
  PROVES: cherry_decision
  EVIDENCE: `2026-08-25 KST` Cherry가 직전 제시된 정확한 문구—`HP1 개발 인증 외부 변경 승인: Clerk Development + Vercel Preview만 허용. Production, Supabase, DNS·도메인, 출시 변경은 금지.`—에 직접 `승인`으로 응답했다. 허용 범위는 Clerk Development와 Vercel Preview뿐이며 Production·Supabase·DNS·도메인·출시는 미승인이다.
- [ ] P2: 클러크 개발 환경이 초대 전용·단일 소유자·조직 및 임의 가입 없음으로 생성되고 민감정보를 가린 영수증이 고정된다.
  PROVES: security
  EVIDENCE: partial only — `2026-08-25 KST` Clerk `Development`에서 `Invite-only`, 조직 기능 비활성, Google 개발 공용 연결, email code 활성, Apple 직접 로그인 비활성, 수락된 사용자 정확히 1명과 대기 초대 0건을 브라우저로 직접 관측했다. 이메일·사용자·애플리케이션·인스턴스 식별자와 키 값은 기록하지 않았다. 그러나 승인된 Git push가 Vercel Git 연동을 통해 Production을 `9cbf834196e3982a7822c422a9a9b18a74d66692`에서 `270ff7be8420765f9324dccfcd754af37c794c2f`로 자동 배포해 HP1의 Production 불변 조건을 위반했다. 에셋 `index-B_ICbkfO.js`와 SHA-256 `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`은 동일하고 공개 화면/API `200`, mutation `405`, 금지 Clerk 식별자 탐지 `0`이지만, rollback 승인·복구·재검증 전까지 P2는 열려 있다. 상세: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RECEIPT.md`.
- [ ] P3: 구글 공용 개발 로그인, 이메일 코드 대체 경로, 인증 후 애플 연결만 허용, 다른 사용자 거부와 권한 철회가 직접 검증된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] P4: 버셀 미리보기 전용 연결값과 변경 불가 미리보기 배포가 생성되고 운영 주소와 설정은 비활성 상태를 유지한다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] P5: 맥북과 모바일 시스템 브라우저에서 로그인·불러오는 중·준비·로그아웃·만료·철회·인증 제공자 장애 흐름이 실측된다.
  PROVES: test
  EVIDENCE: pending
- [ ] P6: 정확한 미리보기 후보, 인증 제공자·설정 이름, 민감정보를 가린 영수증, 비용, 되돌리기와 한계가 기록되고 HP2 외부 변경은 별도로 열려 있다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Supabase resource, production Clerk/Google/Apple credentials, paid plan, production env, custom domain/DNS, public release, Phase completion과 `EXTERNAL_OUTCOME_COMPLETE`는 HP1 범위가 아니다.
