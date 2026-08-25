# Phase 2 · Account Access Preview UX Correction Gates

Outcome: 로그인 성공과 비공개 데이터 미연결을 명확히 분리하고, OUTCOME의 기존 다크·라임 시각 언어를 유지하면서 모바일과 데스크톱 인증 화면을 정돈한다.

- [x] U1: Google 소유자 검증 성공 후 상태가 접근 거부가 아니라 `로그인 완료 · 데이터 연결 준비 중` 의미로 표시된다.
  PROVES: ux_state_truth
  CHECK: `npm run test:account-access`
  EXPECT: exit 0
  EVIDENCE: `npm run test:account-access` PASS · Node 30/30 + Vitest 17/17. `AccountWorkspace` ownerVerified+unavailable 회귀는 한국어 완료/준비 문구, `role=status`, Apple owner-only, no private project를 검증한다.
- [x] U2: 로그인 화면은 모바일 390×844와 데스크톱 1440×900에서 일관된 폭·간격·타이포·버튼·입력 구조를 사용하고 가로 넘침이나 겹침이 없다.
  PROVES: responsive_ux
  CHECK: `npm run build`
  EXPECT: exit 0
  EVIDENCE: `OUTCOME_ACCOUNT_UX_SCREENSHOTS=1 npm run test:account-access-browser` PASS. 1440×900 panel/header 620px, 390×844 358px, overflow 0, Google 44px; phone 375×812도 343px/overflow 0. 모바일·phone 200% zoom overflow 0. Screenshots: `.outcome-runtime/account-access-preview-ux/macbook-1440x900-login.png`, `mobile-390x844-login.png`.
- [x] U3: Google 기본 경로와 이메일 코드 대체 경로가 한눈에 구분되고, Apple 연결은 소유자 검증 후에만 노출되며 모든 조작 요소가 44px 이상과 명확한 focus 상태를 유지한다.
  PROVES: accessibility
  CHECK: `npm run test:account-access`
  EXPECT: exit 0
  EVIDENCE: Account browser PASS across 3 viewports × 9 settled states plus loading/ready; Google lime primary, separator/email fallback, keyboard focus 3px lime, controls >=44px. Unit tests retain Apple only for ownerVerified and logout-only revoked recovery.
- [x] U4: HP2 데이터 연결 전에는 프로젝트 내용을 발명하거나 공개 데이터로 대체하지 않고, `completionAuthority=false`와 읽기 전용 경계가 유지된다.
  PROVES: source_truth
  CHECK: `npm run test:security`
  EXPECT: exit 0
  EVIDENCE: `npm run test:security` PASS 28/28 + stable snapshot prohibited disclosures 0 + client env Vercel Git leaks 0. `npm run build` PASS, assets `index-BO9aiaa4.css` / `index-CDnxOLq9.js`. HP2 workspace remains 503/no project projection.
- [x] U5: 변경은 Account Workspace 표시·스타일·관련 테스트에 한정되고 Production, Clerk 설정, Supabase, DNS·도메인, 출시 상태를 변경하지 않는다.
  PROVES: scope
  CHECK: `git diff --check`
  EXPECT: exit 0
  EVIDENCE: `git diff --check` PASS. Changed surface is Account Workspace component/Clerk presentation, their tests, shared CSS, account browser check, and this Gate only; no external mutation, push, or deploy.

ABANDON: HP2 비공개 데이터 연결, Production 인증 활성화, 외부 공개 MVP, Phase 완료는 이 교정 범위가 아니다.
