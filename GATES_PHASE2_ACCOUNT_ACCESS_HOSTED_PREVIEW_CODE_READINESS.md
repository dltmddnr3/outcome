# Phase 2 · Account Access Hosted Preview Code Readiness Gates

Outcome: 별도 external mutation 없이 Clerk/Supabase hosted preview를 안전하게 연결할 수 있는 credential-free product candidate를 만들고, default/public production은 계속 private-disabled로 유지한다.

- [x] B1: complete environment contract에서만 private adapter를 선택하고 absent/partial configuration은 동일한 disabled/401 상태로 fail closed 한다.
  PROVES: implementation
  EVIDENCE: `server/account-access-hosted.test.mjs` least-privilege complete/partial/flag-off matrix 7/7 PASS; unused Supabase secret is not an activation binding; default config disabled, workspace 401, mutation 405.
- [x] B2: Clerk adapter가 canonical owner verification, Google/email-code start, authenticated Apple link-only, logout, expiry, revocation과 provider outage를 구현한다.
  PROVES: implementation
  EVIDENCE: credential-free provider boundary test covers canonical owner, wrong owner, expired, revoked, Google/email, authenticated Apple link, logout/revoke, outage and hostile redirect denial.
- [x] B3: hosted store adapter가 server-derived workspace/project scope, two-project allowlist와 deny-by-default error mapping을 보존한다.
  PROVES: security
  EVIDENCE: hosted store and REST gateway tests preserve server-derived scope, exactly two allowed Package IDs, verified bearer context and fail-closed store/RLS errors.
- [x] B4: Vercel private API wiring이 explicit activation flag와 complete bindings 뒤에서만 동작하고 public GET/405/redaction/receipt contract를 바꾸지 않는다.
  PROVES: security
  EVIDENCE: hosted handler tests 7/7 include thrown/null/malformed runtime fail-closed proof; security 28/28, mutation 32/32=405, public prohibited identifiers=0; default export remains private-disabled without a separately supplied real adapter.
- [x] B5: MacBook/mobile login, loading, ready, logout, deny, expired, revoked, unavailable 상태가 credential-free fake adapter로 검증되며 real OAuth로 표시되지 않는다.
  PROVES: test
  EVIDENCE: account browser 3 viewports × 9 settled states plus loading/ready journeys PASS; 200% zoom overflow=0; existing UI identifies the injected transition as not real OAuth.
- [x] B6: focused red-first, account, full frontend/Node, browser, stable host, security, mutation, redaction, scope, runbook과 build checks가 모두 통과한다.
  PROVES: test
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS_EVIDENCE.md` final verification matrix; all required local suites PASS.
- [x] B7: exact base/candidate commit·tree, dependency rationale, env-name inventory, rollout/rollback, result counts와 limitations가 immutable evidence에 기록된다.
  PROVES: evidence
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS_EVIDENCE.md`; candidate commit/tree/asset resolved post-commit in Builder handoff.
- [x] B8: Parent 재검증 후 결과가 `CODE_READY_ONLY`로 끝나며 HP1 external mutation, QA, Audit, Cherry acceptance, release와 Phase completion을 주장하지 않는다.
  PROVES: evidence
  EVIDENCE: Parent independently verified exact candidate `da490c27486859b0ea72da085d0295ca2629962a`, tree `74aa4dd89a01bd0bff47ffb2b8bd1918df046a9e`: hosted boundary 7/7; account Node 25/25 + UI/API 7/7; frontend 66/66 + Node 104/104; security 28/28; account browser 3 viewports × 9 states; generic/stable browser 4 viewports; mutations 32/32=405; prohibited identifiers 0; scope/runbook and isolated/Vercel builds PASS. Result is `CODE_READY_ONLY`; no HP1 external mutation, QA/Audit verdict, Cherry acceptance, release or completion was claimed.

ABANDON: Clerk/Google/Apple/Supabase/Vercel account, resource, secret, environment, provider, domain, DNS, paid plan, deployment, release 또는 production data mutation은 이 Gate 범위가 아니다.
