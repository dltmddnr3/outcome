# Phase 2 K3 Approval → K4 Recommendation Gates

Outcome: Cherry의 `연속진행`을 직전 K3 recommendation 승인으로 기록하고 K3만 닫은 뒤, K4 durable storage·freshness·retention·deletion/export·migration·backup/restore를 승인 가능한 source-grounded recommendation으로 완성한다.

- [x] D1: K1-K3만 closed이며 K4-K6는 open이다.
  CHECK: test "$(rg -c '^- \[x\] K[1-3]:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md)" = 3 && test "$(rg -c '^- \[ \] K[4-6]:' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md)" = 3 && echo D1_PASS
  EXPECT: D1_PASS
  EVIDENCE: `GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md` K3에 2026-08-25 KST `연속진행` 승인을 기록했고 K4-K6/provider/database mutation은 open이다.
- [x] D2: K4 recommendation이 storage owner, schema/state ownership, snapshot freshness와 deployment receipt를 정의한다.
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md` K4 state table과 append-only snapshot/current pointer/deployment receipt projection.
- [x] D3: retention, deletion/export, migration, backup/restore, RPO/RTO와 fail-closed behavior를 정의한다.
  EVIDENCE: 90/365-day retention, 30-day deletion, versioned JSON export, migration/restore runbook, RPO 24h/RTO 8h recommendation과 restore re-delete boundary를 기록했다.
- [x] D4: Supabase/Clerk integration, RLS/Data API/secret boundary가 current official docs와 changelog에 근거한다.
  EVIDENCE: 2026-08-25 KST Supabase changelog, Clerk third-party auth, Seoul region, Pro backup, migrations, Data API/RLS 공식 문서를 확인했다. Deprecated shared JWT integration은 배제했다.
- [x] D5: Map은 Current Stage 유지, Next K4, 3/6, `EXTERNAL_OUTCOME_COMPLETE=false`를 표시한다.
  CHECK: rg -q 'Next: `K4' docs/OUTCOME_MAP.md && rg -q 'K3 3/6 승인' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo D5_MAP_PASS
  EXPECT: D5_MAP_PASS
  EVIDENCE: `docs/OUTCOME_MAP.md` Current 유지, Next K4, K3 3/6, external false.
- [x] D6: snapshot parser, tests, build, exact public receipt, mutation 405와 prohibited hit 0을 검증한다.
  EVIDENCE: local snapshot projects=2/prohibited=0/Gate evidence fields=0/K3 3/6; frontend 57/57; Node 78/78; Vercel build + stable-host 7/7; scope PASS. Production `dpl_ComzTwhcjAXeW9GPaTvZD8xXAX2N` READY; fixed URL page/API/health 200; receipt commit `9c35b864dd64`, tree `a3e7b63ba84c`, asset `index-ClJ2FGRo.js`; public mutation 24/24=405; prohibited identifiers=0; K4-K6 open.

ABANDON: K4 승인, Supabase project/schema/table/region 생성, Clerk integration, secret·migration 실행, database/domain/product code mutation은 이 작업에서 수행하지 않는다.
ABANDON: K5-K6, 외부 공개 수준 MVP, release approval, `EXTERNAL_OUTCOME_COMPLETE`는 open이다.
