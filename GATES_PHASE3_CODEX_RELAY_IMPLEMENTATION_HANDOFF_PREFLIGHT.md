# OUTCOME Phase 3 · Codex Relay 구현 인계 사전준비 Gates

Outcome: Cherry가 승인한 Codex-first, Mac mini private control plane, high-risk Cherry reconfirmation을 source-grounded architecture·technical spike·Builder handoff로 고정하되 실제 Codex session 접근·message dispatch·외부 mutation·구현 시작을 수행하지 않는다.

- [x] H1: Cherry의 두 번째 `추천안 적용`이 Codex-only first adapter, Mac mini private control plane, exact-target high-risk reconfirmation에 정확히 기록된다.
  PROVES: cherry_decision
  CHECK: rg -q 'Decision set P3-IMPLEMENTATION-1: APPROVED' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'Codex-only first adapter' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'Mac mini private control plane' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'high-risk Cherry reconfirmation' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo H1_PASS
  EXPECT: H1_PASS
  EVIDENCE: 2026-08-25 KST Cherry가 Codex-first, Mac mini private control plane, high-risk exact-target 재확인 추천에 `추천안 적용`으로 응답했다. handoff `Decision set P3-IMPLEMENTATION-1: APPROVED`에 세 결정을 기록했다. forced check `H1_PASS`.
- [x] H2: 현재 코드의 role-binding/NOW projection과 read-only public boundary, 미구현 private registry·observation·dispatch 경계가 source pin과 함께 구분된다.
  PROVES: evidence
  CHECK: rg -q '## Current source baseline' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'server/outcome-package.mjs' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '405' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo H2_PASS
  EXPECT: H2_PASS
  EVIDENCE: source pin `36c6e585e37a0ddff80811f3408124badc877051` / tree `7bced21e670047a4b5fb6f31b747b99ccf82d1a2`. `server/outcome-package.mjs`는 injected registry projection만, `server/index.mjs`는 public mutation 405만 제공하며 Phase 3 persistence/adapter/dispatch endpoint는 없음을 handoff에 고정했다. forced check `H2_PASS`.
- [x] H3: Codex adapter의 지원 interface·약관·인증·관찰·전달 가능성을 검증하는 선행 technical spike와 read-only/manual fallback이 정의된다.
  PROVES: technical_diligence
  CHECK: test -f GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md && rg -q '## Technical spike' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'read-only.*manual' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo H3_PASS
  EXPECT: H3_PASS
  EVIDENCE: `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md` S1-S6가 supported interface·auth·terms·limit·cost·observation·dispatch·ack·redaction·GO/NO-GO를 요구한다. NO-GO fallback은 read-only observation → manual open/deep-link → unsupported/unbound 순으로 fail closed한다. forced check `H3_PASS`.
- [x] H4: Mac mini, Vercel/private workspace, browser, Codex adapter의 domain boundary·dependency·state owner·failure propagation이 명시된다.
  PROVES: architecture
  CHECK: rg -q '## Domain boundaries and dependency DAG' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '## State ownership' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo H4_PASS
  EXPECT: H4_PASS
  EVIDENCE: handoff가 browser, hosted private workspace, Mac mini registry/relay/router, Codex adapter, Package projection의 owner·forbidden coupling을 정의했고 dependency DAG를 Phase 2→S→R→O→T→E→Q→A→C로 고정했다. forced check `H4_PASS`.
- [x] H5: entity, command/query/event, idempotency, concurrency, stale/offline, rebind, timeout, rollback과 retention의 구현 계약이 검증 가능하다.
  PROVES: architecture
  CHECK: rg -q '## Data model and invariants' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '## Command, query, and event contract' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'idempotency' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '[Rr]etention' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo H5_PASS
  EXPECT: H5_PASS
  EVIDENCE: binding, observation, instruction, confirmation entity와 invariants; private commands/queries/events; 90초 stale, 3회 bounded retry, CAS rebind, idempotency, 10분 single-use confirmation, 24h/30d/90d/365d retention과 read-only rollback을 고정했다. forced check `H5_PASS`.
- [x] H6: high-risk classification, exact-target confirmation, expiry, single-use, mismatch denial과 proof-window mutation matrix가 고정된다.
  PROVES: security
  CHECK: rg -q '## High-risk Cherry reconfirmation' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'single-use' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '## Mutation authority matrix' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && echo H6_PASS
  EXPECT: H6_PASS
  EVIDENCE: high-risk operations 5개 class와 exact project/target/operation/resource/intent/rollback digest UI, owner reauth, expiry·single-use·mismatch denial을 정의했다. first proof에서 high-risk 실제 실행은 forbidden이고 denial만 synthetic test한다. forced check `H6_PASS`.
- [x] H7: OUTCOME_MAP에 Codex technical spike가 registry보다 앞선 Stage로 등록되고 Phase 3 실행은 0/43, current Phase 2 HP1 P2와 external=false를 유지한다.
  PROVES: evidence
  CHECK: rg -q 'outcome-stage-phase3-codex-adapter-spike' docs/OUTCOME_MAP.md && rg -q 'GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6' docs/OUTCOME_MAP.md && rg -q 'Phase 3 실행 Gate `0/43`' docs/OUTCOME_MAP.md && rg -q 'Current: .*hosted-identity-preview · P2' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo H7_PASS
  EXPECT: H7_PASS
  EVIDENCE: `docs/OUTCOME_MAP.md` SHA-256 `f9960d854e7d8706a8f6fc808e5c2d77ba3ffbabe30f9ddf9d90a866bbeb9824`; Codex spike가 registry보다 앞선 Stage이며 Phase 3은 4 Scope·8 Stage·open Gate `0/43`. Current Phase 2 HP1 P2와 `EXTERNAL_OUTCOME_COMPLETE=false` 유지. forced check `H7_PASS`.
- [x] H8: Builder handoff의 allowed files, forbidden mutations, red-first tests, evidence receipt, rollback과 stop conditions가 명시되고 문서·Package 검증이 통과한다.
  PROVES: test
  CHECK: rg -q '## Builder handoff' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '### Allowed' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q '### Forbidden' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && rg -q 'red-first' docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md && git diff --check && echo H8_PASS
  EXPECT: H8_PASS
  EVIDENCE: handoff SHA-256 `69e1e3dc2b0bbbc824ec75dba452785274c2ec80ac8bebf3071ada8ee056fe62`; initial Builder slice는 technical spike only/PREPARED_NOT_DISPATCHED다. allowed/forbidden, red-first 7 probes, receipt와 SAFE_HOLD stop conditions를 고정했다. Package model `39/39`, frontend `71/71`, Node `108/108`, production build PASS(`1652 modules`, asset `index-B_ICbkfO.js`), secret-pattern hits `0`, `git diff --check` PASS. 외부 mutation 없음. unlazy checker `8/8 ALL MET`.

ABANDON: 이 사전준비는 WhiteCastle `berry-service-structure` completion이 아니다. exact ticket/profile binding과 Notion/Linear connector가 없으므로 로컬 source-controlled handoff만 작성하며 구현·provider 접근·dispatch·push·deploy·release·외부 mutation을 수행하지 않는다.
