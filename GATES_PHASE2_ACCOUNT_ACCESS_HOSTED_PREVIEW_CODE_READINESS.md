# Phase 2 · Account Access Hosted Preview Code Readiness Gates

Outcome: 별도 external mutation 없이 Clerk/Supabase hosted preview를 안전하게 연결할 수 있는 credential-free product candidate를 만들고, default/public production은 계속 private-disabled로 유지한다.

- [ ] B1: complete environment contract에서만 private adapter를 선택하고 absent/partial configuration은 동일한 disabled/401 상태로 fail closed 한다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] B2: Clerk adapter가 canonical owner verification, Google/email-code start, authenticated Apple link-only, logout, expiry, revocation과 provider outage를 구현한다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] B3: hosted store adapter가 server-derived workspace/project scope, two-project allowlist와 deny-by-default error mapping을 보존한다.
  PROVES: security
  EVIDENCE: pending
- [ ] B4: Vercel private API wiring이 explicit activation flag와 complete bindings 뒤에서만 동작하고 public GET/405/redaction/receipt contract를 바꾸지 않는다.
  PROVES: security
  EVIDENCE: pending
- [ ] B5: MacBook/mobile login, loading, ready, logout, deny, expired, revoked, unavailable 상태가 credential-free fake adapter로 검증되며 real OAuth로 표시되지 않는다.
  PROVES: test
  EVIDENCE: pending
- [ ] B6: focused red-first, account, full frontend/Node, browser, stable host, security, mutation, redaction, scope, runbook과 build checks가 모두 통과한다.
  PROVES: test
  EVIDENCE: pending
- [ ] B7: exact base/candidate commit·tree, dependency rationale, env-name inventory, rollout/rollback, result counts와 limitations가 immutable evidence에 기록된다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] B8: Parent 재검증 후 결과가 `CODE_READY_ONLY`로 끝나며 HP1 external mutation, QA, Audit, Cherry acceptance, release와 Phase completion을 주장하지 않는다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Clerk/Google/Apple/Supabase/Vercel account, resource, secret, environment, provider, domain, DNS, paid plan, deployment, release 또는 production data mutation은 이 Gate 범위가 아니다.
