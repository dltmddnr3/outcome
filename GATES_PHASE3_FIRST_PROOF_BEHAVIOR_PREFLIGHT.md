# OUTCOME Phase 3 · First Proof 행동 계약 사전준비 Gates

Outcome: Cherry가 승인한 read-only first task, Mac mini local picker binding, offline draft-only 동작을 Technical Spike와 Builder brief에 고정하되 실제 세션 탐색·binding·dispatch·파일 변경을 수행하지 않는다.

- [x] P1: 세 번째 `추천안 적용`이 read-only/non-destructive first task, local picker explicit bind, offline reject+draft-only에 정확히 매핑된다.
  PROVES: cherry_decision
  CHECK: rg -q 'Decision set P3-PROOF-1: APPROVED' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'read-only first task' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'local picker explicit bind' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'offline reject and draft-only' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo P1_PASS
  EXPECT: P1_PASS
  EVIDENCE: 2026-08-25 KST Cherry가 read-only first task, local picker explicit bind, offline reject+draft-only 세 추천에 `추천안 적용`으로 응답했다. handoff `Decision set P3-PROOF-1: APPROVED`와 decision packet에 기록했다. forced check `P1_PASS`.
- [x] P2: first proof의 허용·금지 명령과 success evidence가 파일 mutation 없이 검증 가능하게 고정된다.
  PROVES: test
  CHECK: rg -q '## First proof behavior' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '파일 변경 0건' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '## Proof success receipt' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo P2_PASS
  EXPECT: P2_PASS
  EVIDENCE: first task intent·allowed/forbidden과 receipt를 분리했고 task-owned Git delta 및 file mutation count `0`, no receipt→no success를 완료조건으로 고정했다. forced check `P2_PASS`.
- [x] P3: local picker가 Mac mini 안에서만 raw session locator를 읽고 public-safe metadata, explicit role binding, cancel/rebind 경계를 제공한다.
  PROVES: security
  CHECK: rg -q '## Mac mini local picker contract' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'raw locator.*Mac mini' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'explicit' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo P3_PASS
  EXPECT: P3_PASS
  EVIDENCE: local-only picker가 supported interface만 사용하고 raw locator를 Mac mini memory/Keychain에만 유지하며 candidate 선택 후 explicit project+role confirmation과 CAS binding을 요구한다. duplicate/ambiguous/stale/unsupported candidate는 bind disabled다. forced check `P3_PASS`.
- [x] P4: Mac mini offline/stale 상태에서 submit이 provider queue에 들어가지 않고 local browser draft만 보존되며 자동 replay가 금지된다.
  PROVES: safety
  CHECK: rg -q '## Offline draft-only contract' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'automatic replay.*금지' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'provider queue.*0' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo P4_PASS
  EXPECT: P4_PASS
  EVIDENCE: 30초 heartbeat/90초 stale 경계 뒤 submit disabled, provider queue/envelope/instruction ID write `0`; browser session-scoped draft만 보존하고 logout/session 종료/24h에 제거한다. reconnect automatic replay는 금지다. forced check `P4_PASS`.
- [x] P5: exact Technical Spike Builder brief가 source pin, allowed/forbidden, checks, receipt, stop/rollback과 private binding 필요성을 포함한다.
  PROVES: handoff
  CHECK: test -f docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q '## Allowed' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q '## Forbidden' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q '## Required receipt' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && rg -q 'AWAITING_PRIVATE_BUILDER_BINDING' docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md && echo P5_PASS
  EXPECT: P5_PASS
  EVIDENCE: `docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md` SHA-256 `43648cad6411132f884e383c89dc50b19de801d761944f0b2a2892e126ac33aa`; source pin, allowed/forbidden, 7 required checks, receipt, SAFE_HOLD와 private Builder binding prerequisite를 포함한다. state `DISPATCH_READY · AWAITING_PRIVATE_BUILDER_BINDING`. forced check `P5_PASS`.
- [x] P6: Package current Phase 2 HP1 P2, Phase 3 0/43, `EXTERNAL_OUTCOME_COMPLETE=false`와 기존 read-only public boundary가 유지된다.
  PROVES: evidence
  CHECK: rg -q 'Current: .*hosted-identity-preview · P2' docs/OUTCOME_MAP.md && rg -q 'Phase 3 실행 Gate `0/43`' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && rg -q '405' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo P6_PASS
  EXPECT: P6_PASS
  EVIDENCE: `docs/OUTCOME_MAP.md`는 변경하지 않았고 Current Phase 2 HP1 P2, Phase 3 execution `0/43`, `EXTERNAL_OUTCOME_COMPLETE=false`다. public `/api` mutation 405 경계를 handoff에서 유지했다. forced check `P6_PASS`.
- [x] P7: 문서 diff, Package model, exact Gate 수, secret-pattern과 전체 regression/build가 통과하고 외부 mutation은 없다.
  PROVES: test
  CHECK: git diff --check && test "$(for f in GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md GATES_PHASE3_PRIVATE_SESSION_REGISTRY.md GATES_PHASE3_MULTI_PC_OBSERVATION_RELAY.md GATES_PHASE3_PLANNER_WORK_ROUTING.md GATES_PHASE3_EVIDENCE_CONTINUITY.md GATES_PHASE3_EXISTING_SESSION_OPERATIONS_QA.md GATES_PHASE3_EXISTING_SESSION_OPERATIONS_RELEASE_AUDIT.md GATES_PHASE3_EXISTING_SESSION_OPERATIONS_CHERRY_ACCEPTANCE.md; do rg --no-filename '^- \[ \] [A-Z][0-9]+:' "$f"; done | wc -l | tr -d ' ')" = 43 && echo P7_PASS
  EXPECT: P7_PASS
  EVIDENCE: exact open Phase 3 execution Gate `43`, proof preflight `7/7`, secret-pattern hits `0`, `git diff --check` PASS. Package model `39/39`, frontend `71/71`, Node `108/108`, production build PASS(`1652 modules`, asset `index-B_ICbkfO.js`). 실제 session enumeration/binding/dispatch, file/provider/external mutation, push/deploy 없음. unlazy checker `7/7 ALL MET`.

ABANDON: 이 사전준비는 local picker 실행, Codex session enumeration, raw session ID 기록, Builder session assignment, 실제 observation/dispatch, file mutation, provider/resource mutation, push/deploy/release를 수행하지 않는다.
