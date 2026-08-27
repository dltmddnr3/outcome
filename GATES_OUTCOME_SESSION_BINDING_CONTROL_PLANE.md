# OUTCOME Session Binding Control Plane · Definition Gates

Status: **CHERRY-APPROVED DIRECTION / PLANNER CONTRACT COMPLETE / IMPLEMENTATION SOURCE PIN NOT ISSUED**

- [x] D1 · OUTCOME Package에 네 역할 slot을 선언하는 `OUTCOME_SESSIONS.md` operational companion이 정의된다.
  CHECK: `rg -q 'OUTCOME_SESSIONS.md' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md templates/OUTCOME_SESSIONS.md && for role in planner builder ux_product_qa release_audit; do rg -q "$role" templates/OUTCOME_SESSIONS.md || exit 1; done`
  EXPECT: exit 0
  EVIDENCE: stable Package truth 3종과 분리된 fourth operational companion 및 네 역할 slot이 정의됐다.

- [x] D2 · project+role마다 active binding은 최대 하나이며 모든 변경은 versioned append-only history를 남긴다.
  CHECK: `rg -q 'active binding 최대 1개' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'append-only' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'expected_version' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: uniqueness, compare-and-swap와 immutable transition history가 명시됐다.

- [x] D3 · assign, replace, revoke, observe, checkpoint와 doctor 동작 및 실패 시 차단 상태가 정의된다.
  CHECK: `for action in assign replace revoke observe checkpoint doctor; do rg -q "\\x60${action}\\x60" docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md || exit 1; done && rg -q 'registry_unavailable' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: 미래 최소 관리 표면과 fail-closed 오류가 계약으로 정의됐다. 현재 synthetic module의 구현 범위를 확장했다는 주장이 아니다.

- [x] D4 · Planner 교체가 routing freeze → handoff → successor verification → CAS replace → predecessor archive 순서를 강제한다.
  CHECK: `rg -q 'routing freeze' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'STARTED.*CONTINUITY_READY' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'CAS replace' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: root routing owner 교체가 다른 role 교체보다 강한 원자적 절차로 고정됐다.

- [x] D5 · raw provider/session identifier는 private registry에만 있고 Package·Git·일반 API/UI에는 투영되지 않는다.
  CHECK: `rg -q 'raw provider locator' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'Git.*0건' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'public-safe projection' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: durable role identity와 private locator가 분리됐다.

- [x] D6 · 기존 Package와 stale runtime 입력의 migration 및 누락 시 `setup_required/unbound` 경계가 정의된다.
  CHECK: `rg -q 'schema_version: 1' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'setup_required' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q '기존 Package 전체를 invalid' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: backward-compatible migration과 fail-closed display가 정의됐다.

- [x] D7 · 대시보드가 네 역할의 현재 연결, 관측 freshness, binding version과 이력 수를 혼동 없이 표시한다.
  CHECK: `rg -q '역할별 현재 연결' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'binding version' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q '이력 수' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: raw ID 없이 관리 가능성을 판단하는 UI projection이 정의됐다.

- [x] D8 · 세션 activity와 제품 progress/authority가 계속 분리되며 실제 provider 자동발견은 증명 전 금지된다.
  CHECK: `rg -q 'NOW만' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q '실제 provider 자동발견.*금지' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE' docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
  EXPECT: exit 0
  EVIDENCE: 관리 기능이 Gate·QA·Audit·acceptance·release 권한을 만들지 않는다.

## ABANDON

**ABANDON:** 이 Gate는 control-plane 제품 계약의 완성만 증명한다. exact implementation source pin이나 Builder 실행 권한을 발행하지 않으며, persistence 구현, 실제 session assignment, provider observation, routing, UI, QA, Audit, Cherry acceptance, release 또는 project completion은 별도 Gate와 immutable candidate가 필요하다.
