# OUTCOME 역할 세션 작업환경 활성화 Gates

Outcome: 현재 OUTCOME Planner와 기존 전담 Builder·UX & Product QA·Release Audit 세션을 public-safe 역할 주소에 연결하고, 실제 수신 확인·private registry·Package manifest가 서로 일치하는 로컬 운영 상태를 만든다.

- [ ] W1: source HEAD/tree, registry revision 28, Planner v2 `blocked`, 나머지 역할의 마지막 version 1 `revoked`, manifest 4역할 `unbound`가 변경 전 상태와 일치한다.
  CHECK: Builder receipt의 before-state와 실제 readback을 대조한다.
  EXPECT: drift 0; registry mode `0600`; doctor issues 0.
  EVIDENCE: pending

- [ ] W2: 변경 없는 readiness probe가 Planner·Builder·UX & Product QA·Release Audit 네 역할에서 실제로 관측된다.
  CHECK: 각 역할의 `ROLE_READY_ACK`, logical role, continuity 상태, mutation count를 검증한다.
  EXPECT: 4/4 reachable; mutation count 0; readiness를 진행률·QA·Audit으로 승격하지 않는다.
  EVIDENCE: pending

- [ ] W3: private registry는 기존 Planner v2를 재할당하지 않고 관측 상태만 갱신하며, Builder·UX & Product QA·Release Audit은 각각 다음 version으로 한 번만 CAS assign한다.
  CHECK: append-only binding/event history와 public-safe projection을 read back한다.
  EXPECT: project+role active 최대 1; duplicate/retry 0; raw locator output 0.
  EVIDENCE: pending

- [ ] W4: `docs/OUTCOME_SESSIONS.md`의 alias/version/state가 private registry current projection과 4/4 일치한다.
  CHECK: Package parser와 registry reconciliation을 실행한다.
  EXPECT: `sessions_registry_conflict` 0; `setup_required` 0; raw provider/session/thread/task/turn identifier 0.
  EVIDENCE: pending

- [ ] W5: 최소 lifecycle probe 1건이 Planner → Builder 전달에서 `start_validated → dispatch_observed → execution_started → role_result_recorded → handoff_accepted`로 append-only 기록된다.
  CHECK: no-op/read-only readiness instruction의 단일 attempt와 상관관계, event order, dedup을 검증한다.
  EXPECT: attempt 1; duplicate execution 0; automatic retry 0; product/Git/runtime/provider mutation 0.
  EVIDENCE: pending

- [ ] W6: 교체·연속작업·독립검증 경계가 보존된다.
  CHECK: continuity policy와 public-safe receipt가 successor 검증 전 archive 금지, QA/Audit 판정 독립, Gate/acceptance 비승격을 명시한다.
  EXPECT: rotation 실행 0; archive/delete 0; progress/Gate/QA/Audit/Cherry acceptance/release 변화 0.
  EVIDENCE: pending

PASS는 현재 로컬 Codex 작업환경에서 네 역할 주소와 전달 lifecycle이 실제로 사용 가능한 상태라는 뜻이다. OUTCOME 제품의 hosted provider adapter, 자동 세션 생성, Supabase, 배포, release 또는 `EXTERNAL_OUTCOME_COMPLETE`를 뜻하지 않는다.
