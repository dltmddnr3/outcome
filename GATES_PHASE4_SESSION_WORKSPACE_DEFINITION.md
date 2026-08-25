# OUTCOME Phase 4 · Session Workspace Definition Gates

Outcome: OUTCOME 안의 역할별 채팅이 단순 메시지 상자가 아니라 Codex와 동등한 작업 이해도를 제공하는 실시간 세션 워크스페이스가 되도록 제품 의미, 이벤트 계약, 상호작용, 안전 경계와 Phase 3 의존성을 고정한다. 이 정의는 구현 진행률이 아니다.

- [x] D1: 사용자 메시지, 에이전트 응답, 계획, 도구 실행, 파일 변경, 테스트, 승인 요청과 결과를 하나의 순서 보장 타임라인으로 정의한다.
  CHECK: rg -q '## 실시간 작업 타임라인' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && rg -q '파일 변경과 diff' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && echo D1_PASS
  EXPECT: D1_PASS
  EVIDENCE: D1_PASS
- [x] D2: queued, responding, tool_running, verifying, waiting_approval, waiting_user, completed, failed, cancelled와 reconnecting 상태의 사용자 표시와 동작을 정의한다.
  CHECK: for value in queued responding tool_running verifying waiting_approval waiting_user completed failed cancelled reconnecting; do rg -q "$value" docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md || exit 1; done; echo D2_PASS
  EXPECT: D2_PASS
  EVIDENCE: D2_PASS
- [x] D3: 스트리밍, 라이브 활동, 상태 전환 애니메이션과 reduced-motion 대체 표현을 정의하며 애니메이션을 진행률로 오해하지 않게 한다.
  CHECK: rg -q '## 동작과 모션' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && rg -q 'reduced-motion' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && rg -q '진행률이 아니다' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && echo D3_PASS
  EXPECT: D3_PASS
  EVIDENCE: D3_PASS
- [x] D4: 실제 세션 event source가 없을 때 가짜 메시지, 가짜 tool activity, 가짜 완료를 만들지 않는 fail-closed 경계를 정의한다.
  CHECK: rg -q '## Source truth와 실패 시 차단' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && rg -q '가짜 메시지' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && echo D4_PASS
  EXPECT: D4_PASS
  EVIDENCE: D4_PASS
- [x] D5: private reasoning, credential, raw session/thread/task/turn ID, local path와 unredacted payload를 사용자·공개 표면에서 제외한다.
  CHECK: rg -q 'private reasoning' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && rg -q 'raw session/thread/task/turn ID' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && echo D5_PASS
  EXPECT: D5_PASS
  EVIDENCE: D5_PASS
- [x] D6: Phase 3 supported adapter와 receipt가 entry이고, Phase 4가 session creation·full interaction을 소유한다는 경계를 Contract와 Map에 연결한다.
  CHECK: rg -q 'Phase 3 adapter' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && rg -q 'Canonical detail: `docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md`' docs/OUTCOME_CONTRACT.md && rg -q 'Codex 수준의 실시간 작업 타임라인' docs/OUTCOME_MAP.md && echo D6_PASS
  EXPECT: D6_PASS
  EVIDENCE: D6_PASS
- [x] D7: desktop와 mobile의 role switch, history, streaming, approval, artifact 접근과 reconnect acceptance를 정의한다.
  CHECK: rg -q '## UX acceptance' docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md && for value in desktop mobile '역할 전환' '재연결'; do rg -q "$value" docs/PHASE4_SESSION_WORKSPACE_CONTRACT.md || exit 1; done; echo D7_PASS
  EXPECT: D7_PASS
  EVIDENCE: D7_PASS
- [x] D8: 현재 Phase, 기존 Gate 수와 `EXTERNAL_OUTCOME_COMPLETE=false`를 변경하지 않고 문서 검증이 통과한다.
  CHECK: rg -q 'Current: `outcome-phase-2' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && git diff --check && echo D8_PASS
  EXPECT: D8_PASS
  EVIDENCE: D8_PASS

ABANDON: 이 정의는 Phase 3 adapter proof, 세션 이벤트 연결, 채팅 구현, provider credential/resource mutation, QA, Release Audit, Cherry acceptance, release 또는 Phase 4 완료를 수행하지 않는다.
