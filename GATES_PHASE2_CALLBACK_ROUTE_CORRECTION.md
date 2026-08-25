# Phase 2 · 인증 콜백 라우팅 교정 Gates

Outcome: Vercel Preview에서 Google 로그인과 인증 후 Apple 연결 콜백이 플랫폼 404 없이 OUTCOME SPA 인증 처리기로 전달된다.

- [x] C1: `/workspace/sso-callback`이 `/index.html`로 rewrite된다.
  CHECK: node --test server/stable-host.test.mjs
  EXPECT: pass
  EVIDENCE: Red-first `node --test server/stable-host.test.mjs`는 기존 config에서 8/9, callback assertion 실패를 재현했다. `vercel.json` 교정 후 같은 검증 9/9 PASS.
- [x] C2: `/workspace/apple-callback`이 `/index.html`로 rewrite된다.
  CHECK: node --test server/stable-host.test.mjs
  EXPECT: pass
  EVIDENCE: `vercel.json`의 exact Apple callback rewrite와 focused stable-host 9/9 PASS.
- [x] C3: 기존 `/workspace`, `/cherry-note-dashboard`, `/api/:path*` 라우팅과 read-only 경계가 유지된다.
  CHECK: npm run test:security
  EXPECT: exit 0
  EVIDENCE: `npm run test:security` 29/29 PASS, stable snapshot projects=2/prohibited=0/Gate evidence=0, client env boundary leaks=0. 전체 `npm test` frontend 78/78, Node 112/112 PASS. `npm run build:vercel` PASS, stable-host 9/9 PASS.
- [x] C4: exact Preview 후보가 READY이고 두 콜백 경로가 Vercel 404가 아닌 OUTCOME HTML을 반환한다.
  EVIDENCE: commit `aadac57a2997cf0512a5605c930417fdb1e06cae` / deployment `dpl_ChSioyuH3Wb1LsqD9UVYtVqJBoFV` / branch alias가 Preview `READY`. `/workspace/sso-callback`은 live `200 text/html`, title `OUTCOME`, asset `index-BQhQu5vc.js`를 반환했다. Chrome의 `/workspace/apple-callback` 직접 탐색은 Vercel 404가 아니라 OUTCOME callback 처리 후 Clerk Development sign-in으로 전환됐다.

ABANDON: Production, Supabase, DNS·도메인, 출시, P5/P6 완료, Phase 완료와 `EXTERNAL_OUTCOME_COMPLETE`는 이 교정 범위가 아니다.
