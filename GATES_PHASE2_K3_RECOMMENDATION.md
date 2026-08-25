# Phase 2 K3 · Workspace Isolation Recommendation Gates

Outcome: K2 뒤의 K3를 Cherry가 한 번에 판단할 수 있도록 workspace isolation, project visibility, least privilege, secret ownership, audit boundary를 source-grounded recommendation으로 완성하되 K3 자체와 구현 권한은 열어 둔다.

- [x] D1: K3는 open이며 K1-K2만 closed 상태를 보존한다.
  CHECK: test "$(rg -c '^- \[x\] K[1-2]:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md)" = 2 && test "$(rg -c '^- \[ \] K[3-6]:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md)" = 4 && echo D1_PASS
  EXPECT: D1_PASS
  EVIDENCE: `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` K1-K2만 closed, K3-K6 open 상태를 보존했다.
- [x] D2: K3 recommendation이 anonymous, canonical owner, operator/runtime의 capability와 fail-closed 경계를 구분한다.
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md` K3 capability table과 별도 machine identity deferred boundary.
- [x] D3: server-derived workspace identity, explicit project allowlist, linked-credential collision, cross-workspace negative tests가 명시된다.
  EVIDENCE: server-derived Clerk user membership, Cherry Note/OUTCOME allowlist, seven negative tests와 private/public no-fallback 계약을 기록했다.
- [x] D4: secret owner·storage·rotation·redaction과 audit event·금지 필드를 분리해 정의한다.
  EVIDENCE: private operator/Vercel-provider storage, browser-visible publishable key 예외, rotation receipt, allowed audit event와 prohibited raw values를 분리했다.
- [ ] D5: Map은 Current/Next K3, 2/6, `EXTERNAL_OUTCOME_COMPLETE=false`를 유지하며 docs checks와 exact public receipt를 검증한다.
  CHECK: rg -q 'Next: `K3' docs/OUTCOME_MAP.md && rg -q 'K2 2/6 승인' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo D5_MAP_PASS
  EXPECT: D5_MAP_PASS
  EVIDENCE: local contract/map checks PASS; stable snapshot projects=2/prohibited=0/Gate evidence fields=0; frontend 57/57; Node 78/78; Vercel build + stable-host 7/7; scope PASS. Exact public receipt와 remote mutation/redaction은 배포 후 pending.

ABANDON: K3 승인, provider/OAuth/secret/database/domain/product code mutation, project registration 확대는 이 recommendation 작업에서 수행하지 않는다.
ABANDON: K4-K6, 외부 공개 수준 MVP, release approval, `EXTERNAL_OUTCOME_COMPLETE`는 open이다.
