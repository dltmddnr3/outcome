# Phase 2 K1 Approval → K2 Recommendation Gates

Outcome: Cherry의 `네 의견대로 진행` 결정을 K1의 추천 경계에만 적용하고, 공개 정제 스냅샷 + Cherry 단독 비공개 작업공간을 승인 원본으로 고정한 뒤 K2 인증 계약을 결정 가능한 추천안으로 준비한다.

- [x] D1: K1이 Cherry 승인 근거와 함께 닫히며 K2–K6는 열려 있다.
  CHECK: rg -q '^- \[x\] K1:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md && test "$(rg -c '^- \[ \] K[2-6]:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md)" = 5 && echo D1_PASS
  EXPECT: D1_PASS
  EVIDENCE: `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` K1에 2026-08-25 KST Cherry 승인 문구와 K2-K6 비승인 경계를 기록했다.
- [x] D2: 승인된 v1 경계가 공개 정제 스냅샷 유지, Cherry 단독 private workspace, self-signup/invitation 비활성으로 명시된다.
  CHECK: rg -q 'Cherry-only private workspace' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && rg -q 'self-signup and invitations disabled' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && echo D2_PASS
  EXPECT: D2_PASS
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`의 Approved K1 boundary와 surface contract에 고정했다.
- [x] D3: K2 추천안은 공식 provider 문서 근거와 함께 인증·owner identity·session·logout/revocation·CSRF·recovery 경계를 모두 다룬다.
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`의 `K2 provider recommendation · not approved`; 2026-08-25 KST Clerk 공식 email-code/session/revocation/CSRF/token 문서와 Supabase SSR 비교 문서를 확인했다.
- [x] D4: OUTCOME Map은 현재 Stage를 유지하고 다음 경계를 K2로 표시하며 `EXTERNAL_OUTCOME_COMPLETE=false`를 보존한다.
  CHECK: rg -q 'Current: `outcome-phase-2 / outcome-phase-2-account-service / outcome-stage-account-access-definition' docs/OUTCOME_MAP.md && rg -q 'Next: `K2' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo D4_PASS
  EXPECT: D4_PASS
  EVIDENCE: `docs/OUTCOME_MAP.md` Current는 account-access-definition 그대로이며 Next는 K2, future visibility는 K1 1/6, 외부 완료는 false다.
- [ ] D5: Package parser, frontend, Node, stable build, public receipt, mutation 405와 prohibited hit 0이 모두 검증된다.
  EVIDENCE: local candidate PASS · stable snapshot projects=2/prohibited=0/Gate evidence fields=0; frontend 57/57; Node 78/78; Vercel build + stable-host 7/7; scope PASS. Public exact receipt와 mutation matrix는 배포 후 pending.

ABANDON: K2–K6 승인, auth provider 설치, OAuth app/key 생성, secret·database·domain 변경과 product code mutation은 이 작업에서 수행하지 않는다.
