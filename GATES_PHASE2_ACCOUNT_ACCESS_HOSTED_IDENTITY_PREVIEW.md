# Phase 2 · Hosted Identity Preview Gates

Outcome: Cherry가 승인한 개발 환경에서 정확히 한 명의 canonical owner가 Google·email code로 로그인하고 Apple을 연결한 뒤 MacBook/mobile에서 로그인·로그아웃·거부·복구를 직접 검수한다.

- [ ] P1: Cherry가 HP1의 exact external mutation 범위를 명시적으로 승인한다.
  PROVES: cherry_decision
  EVIDENCE: pending
- [ ] P2: Clerk development instance가 Invite-only, one owner, no organization/self-signup으로 생성되고 redacted receipt가 고정된다.
  PROVES: security
  EVIDENCE: pending
- [ ] P3: Google shared-development login, email-code fallback, authenticated Apple link-only, wrong identity denial과 revoke가 직접 검증된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] P4: Vercel Preview-only named bindings와 immutable Preview deployment가 생성되고 production URL/config는 disabled 상태를 유지한다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] P5: MacBook과 mobile system browser에서 login/loading/ready/logout/expired/revoked/provider-failure 흐름이 실측된다.
  PROVES: test
  EVIDENCE: pending
- [ ] P6: exact preview candidate, provider/config names, redacted receipts, cost, rollback과 limitations가 기록되고 HP2 외부 mutation은 별도 open이다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Supabase resource, production Clerk/Google/Apple credentials, paid plan, production env, custom domain/DNS, public release, Phase completion과 `EXTERNAL_OUTCOME_COMPLETE`는 HP1 범위가 아니다.
