# Phase 2 K2 · Auth Contract Approval Gates

Outcome: Cherry의 승인을 K2 인증 계약에만 적용해 Google·Apple·email-code 접근, 단일 owner identity, session·revocation·CSRF·recovery 의미를 고정하고 K3-K6 및 실제 provider mutation은 열어 둔다.

- [x] D1: K2만 Cherry 승인 evidence로 닫히며 K3-K6는 open이다.
  CHECK: rg -q '^- \[x\] K2:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md && test "$(rg -c '^- \[ \] K[3-6]:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md)" = 4 && echo D1_PASS
  EXPECT: D1_PASS
  EVIDENCE: `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` K2에 2026-08-25 KST `승인 진행`과 K3-K6/provider mutation 비승인 경계를 기록했다.
- [x] D2: K2 계약이 Clerk, Google primary, Apple linked access, email verification code fallback을 명시한다.
  CHECK: rg -q 'Google primary' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && rg -q 'Apple linked access' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && rg -q 'email verification code fallback' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && echo D2_PASS
  EXPECT: D2_PASS
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md` Approved K2 authentication contract에 세 접근 수단과 연결 순서를 고정했다.
- [x] D3: canonical owner, seven-day session, revocation, CSRF, recovery와 private-secret boundary가 source-grounded하게 고정된다.
  EVIDENCE: Clerk user ID만 canonical owner이며 email/Google/Apple은 linked credential이다. owner identifier와 OAuth/private key는 runtime secret이며 문서·Git·snapshot·log·public UI에서 금지했다. 공식 Clerk/Google/Apple 문서를 2026-08-25 KST 확인했다.
- [x] D4: OUTCOME Map은 현재 Stage를 유지하고 다음 경계를 K3로 표시하며 K2 2/6, `EXTERNAL_OUTCOME_COMPLETE=false`를 보존한다.
  CHECK: rg -q 'Next: `K3' docs/OUTCOME_MAP.md && rg -q 'K2 2/6 승인' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo D4_PASS
  EXPECT: D4_PASS
  EVIDENCE: `docs/OUTCOME_MAP.md` Current Stage 유지, Next K3, K2 2/6, external false.
- [ ] D5: snapshot parser, tests, build, exact public receipt, mutation 405와 prohibited hit 0을 검증한다.
  EVIDENCE: local candidate PASS · snapshot projects=2/prohibited=0/Gate evidence fields=0/K2 2/6; frontend 57/57; Node 78/78; Vercel build + stable-host 7/7; scope PASS. Exact public receipt와 remote mutation/redaction은 배포 후 pending.

ABANDON: Clerk/provider 설치, Google OAuth client, Apple Services ID/private key, owner email·secret 설정, database/domain/product code mutation은 이 승인 기록에서 수행하지 않는다.
ABANDON: K3-K6, 외부 공개 수준 MVP, release approval, `EXTERNAL_OUTCOME_COMPLETE`는 open이다.
