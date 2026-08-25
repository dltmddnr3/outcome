# Phase 3 · 목적 정의 사전준비 Gates

Outcome: Cherry가 이미 확정한 Phase 2·4·5 의미를 침범하지 않고, 그 사이의 구조 공백을 source-grounded 추천안·비목표·3개 이하의 결정 질문으로 준비하되 Phase 3 목적·Scope·Stage·Gate를 승인된 것으로 표시하지 않는다.

- [x] F1: Phase 2 account/public portfolio, Phase 4 in-OUTCOME project/session creation, Phase 5 destination/200Q/adaptive composition의 기존 목적이 source boundary로 인용된다.
  PROVES: evidence
  CHECK: test -f docs/PHASE3_DEFINITION_DECISION_PACKET.md && rg -q '## 기존 Phase 경계' docs/PHASE3_DEFINITION_DECISION_PACKET.md && echo F1_PASS
  EXPECT: F1_PASS
  EVIDENCE: `docs/PHASE3_DEFINITION_DECISION_PACKET.md`의 `기존 Phase 경계`가 현재 `docs/OUTCOME_MAP.md`의 Phase 2·4·5 purpose를 source boundary로 고정했다. packet SHA-256 `9520ed4d992046715007836ea83e8a02ce9a95a219a53c4d5d5b6171a1489d72`; forced check `F1_PASS`.
- [x] F2: 추천 Phase 3은 externally existing role sessions의 private registry·multi-PC continuity·source-grounded NOW·Planner-only routing으로 정의되고 진행률은 Gate evidence 외 추론하지 않는다.
  PROVES: implementation
  CHECK: rg -q '기존 역할 세션 연결 운영' docs/PHASE3_DEFINITION_DECISION_PACKET.md && rg -q 'Planner-only' docs/PHASE3_DEFINITION_DECISION_PACKET.md && rg -q '진행률' docs/PHASE3_DEFINITION_DECISION_PACKET.md && echo F2_PASS
  EXPECT: F2_PASS
  EVIDENCE: packet의 `추천 Phase 3 · 기존 역할 세션 연결 운영`이 네 후보 Scope와 end-to-end 흐름을 정의했고, NOW와 진행률을 분리했다. forced check `F2_PASS`.
- [x] F3: Project·role·session binding, observation, routed instruction, receipt의 state owner와 session ID 비공개 경계가 구분된다.
  PROVES: security
  CHECK: rg -q '## 상태 소유권' docs/PHASE3_DEFINITION_DECISION_PACKET.md && rg -q 'session ID' docs/PHASE3_DEFINITION_DECISION_PACKET.md && echo F3_PASS
  EXPECT: F3_PASS
  EVIDENCE: packet의 `상태 소유권` 표가 Package, registry, observation, routing ledger, 역할 결과, Gate 판정의 소유자를 분리했다. session ID·provider locator·credential은 공개 HTML/API/bundle/log 요약에서 금지했다. forced check `F3_PASS`.
- [x] F4: Phase 2·4·5와 겹치는 계정 공개서비스, project/session 생성, 완전 개발, autonomous composition, Question 200은 명시적 비목표다.
  PROVES: evidence
  CHECK: rg -q '## 비목표' docs/PHASE3_DEFINITION_DECISION_PACKET.md && rg -q 'Question 200' docs/PHASE3_DEFINITION_DECISION_PACKET.md && echo F4_PASS
  EXPECT: F4_PASS
  EVIDENCE: packet `비목표`가 Phase 2 공개서비스, Phase 4 생성·완전 개발, Phase 5 autonomous composition·Question 200, 활동 기반 진행률 추론과 자기 승인을 모두 제외했다. forced check `F4_PASS`.
- [x] F5: 제품 구조를 바꾸는 미결정은 추천안이 붙은 3개 질문으로만 압축되고 응답 전 구현·지도 승격은 금지된다.
  PROVES: cherry_decision
  CHECK: test "$(rg -c '^### Q[1-3] ·' docs/PHASE3_DEFINITION_DECISION_PACKET.md)" = 3 && rg -q '추천안' docs/PHASE3_DEFINITION_DECISION_PACKET.md && echo F5_PASS
  EXPECT: F5_PASS
  EVIDENCE: 결정 질문은 정확히 3개(`Q1 Phase 3 목적`, `Q2 업무 지시 권한`, `Q3 첫 운영 Proof`)이며 각각 추천안을 포함한다. `rg -c '^### Q[1-3] ·'` 결과 `3`; 응답 전 NO IMPLEMENTATION과 지도 미승격을 명시했다. forced check `F5_PASS`.
- [x] F6: 추천안의 최소 proof와 실패 안전 경계가 정의되고 release·Gate closure·external mutation은 범위 밖이다.
  PROVES: test
  CHECK: rg -q '## 최소 Proof' docs/PHASE3_DEFINITION_DECISION_PACKET.md && rg -q '## 실패 안전 경계' docs/PHASE3_DEFINITION_DECISION_PACKET.md && echo F6_PASS
  EXPECT: F6_PASS
  EVIDENCE: `최소 Proof`는 OUTCOME+Cherry Note, 실제 존재 binding만, 서로 다른 두 관찰 위치, 단일 routed task receipt, public session-ID leak 0을 제안했다. `실패 안전 경계`는 binding·receipt·offline·timeout·redaction 실패를 fail closed하며 release·Gate closure·external mutation을 제외했다. forced check `F6_PASS`.
- [x] F7: OUTCOME_MAP의 Phase 3은 계속 `Definition Pending`, stages 빈 배열, 현재 위치 HP1 P2와 `EXTERNAL_OUTCOME_COMPLETE=false`를 유지하고 문서 검사가 통과한다.
  PROVES: test
  CHECK: git diff --check && rg -q 'title: Phase 3 · Definition Pending' docs/OUTCOME_MAP.md && rg -A8 'id: outcome-phase-3' docs/OUTCOME_MAP.md | rg -q 'stages: \[\]' && rg -q 'Current: .*hosted-identity-preview · P2' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo F7_PASS
  EXPECT: F7_PASS
  EVIDENCE: `docs/OUTCOME_MAP.md`는 변경하지 않았고 `Phase 3 · Definition Pending`, `stages: []`, Current `hosted-identity-preview · P2`, `EXTERNAL_OUTCOME_COMPLETE=false`를 유지했다. `git diff --check` 및 forced check `F7_PASS`; unlazy checker 전체 `7/7 ALL MET`.

ABANDON: 이 사전준비 Gate는 Phase 3 목적 승인, OUTCOME_MAP Stage 등록, session binding·message dispatch·external mutation, implementation handoff, QA·Audit·Cherry acceptance·release·Phase completion 또는 `EXTERNAL_OUTCOME_COMPLETE`를 수행하지 않는다.
