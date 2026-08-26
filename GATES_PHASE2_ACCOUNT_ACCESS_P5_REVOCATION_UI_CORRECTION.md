# Phase 2 · P5 모바일 철회 UX 교정 Gates

Outcome: 실제 Clerk operator revocation이 SDK signed-out으로 먼저 나타나도 최초 로그인·명시적 로그아웃과 구분하여 만료 안내와 실제 재로그인 동작을 제공한다.

- [x] B1: 실제 실패를 재현하는 red-first 테스트가 일반 로그인 오분류를 잡는다.
  PROVES: test
  EVIDENCE: RED 4 failures (`hostedSignedOutState`, marker write/read, ready confirmation, clear-before-signout 부재) → focused 16/16 PASS
- [x] B2: 표식 없는 최초 signed-out은 일반 로그인이고, 준비 상태 뒤 예상 밖 signed-out은 만료 상태다.
  PROVES: implementation
  EVIDENCE: empty storage=`login`; confirmed ready marker 또는 같은 탭 ready state 뒤 SDK signed-out=`session_expired`; revoked SSR에 만료 제목+retry, private project=0
- [x] B3: 같은 탭 새로고침에서도 비민감 tab-scoped 표식으로 만료 상태가 유지된다.
  PROVES: implementation
  EVIDENCE: `sessionStorage` exact entry `['outcome.owner-ready','1']` only; reload helper returns `session_expired`; clear returns `login`
- [x] B4: 명시적 로그아웃과 `다시 로그인`은 표식을 지우고 일반 로그인으로 복귀한다.
  PROVES: test
  EVIDENCE: retry/logout shared handler removes marker before Clerk `signOut({redirectUrl:'/workspace'})`; signed-out marker exposes retry without fake active-session logout
- [x] B5: 표식·UI·로그에 private payload·identity·credential·raw provider 오류가 없다.
  PROVES: security
  EVIDENCE: fixed key/value only; marker written only after owner+workspace success; failed workspace writes 0; raw identity/credential match=0; public prohibited identifiers=0
- [x] B6: focused·전체·account·security·public boundary·mutation·build·scope/runbook 회귀와 exact candidate receipt가 통과한다.
  PROVES: evidence
  EVIDENCE: focused 16/16; dashboard 86/86; account Node 32/32 + frontend 29/29; full frontend 89/89 + Node 112/112; security 29/29; mutations 32/32; build/scope/runbook/public boundary PASS; exact Git receipt in Builder handoff

ABANDON: 이 Builder Gate는 Clerk/Vercel/Production/Supabase 외부 변경, push·deploy, 실기기 PASS, P5·HP1·Phase 2 또는 `EXTERNAL_OUTCOME_COMPLETE`를 닫지 않는다.
