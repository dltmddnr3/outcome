# OUTCOME 역할 세션 작업환경 활성화 Gates

Outcome: 현재 OUTCOME Planner와 기존 전담 Builder·UX & Product QA·Release Audit 세션을 public-safe 역할 주소에 연결하고, 실제 수신 확인·private registry·Package manifest가 서로 일치하는 로컬 운영 상태를 만든다.

- [x] W1: source HEAD/tree, registry revision 28, Planner v2 `blocked`, 나머지 역할의 마지막 version 1 `revoked`, manifest 4역할 `unbound`가 변경 전 상태와 일치한다.
  CHECK: Builder receipt의 before-state와 실제 readback을 대조한다.
  EXPECT: drift 0; registry mode `0600`; doctor issues 0.
  EVIDENCE: source `f13b676ae95c89ef3377064626dbdf6e9aa48e94` / tree `3888a187a17c7360443c159e8930165044e92d6a`; registry readback revision 28, mode 0600, doctor issues 0; manifest SHA-256 `8d02f37fee3ec5e65b8265e236daf4a6e82d8702b3f0ed412f706f271e6887bd`; unrelated dirty count 82 / fingerprint `d4872d2ca7a69b57a38492e57718050367097389cb3ebd032be96fce67f30604`.

- [x] W2: 변경 없는 readiness probe가 Planner·Builder·UX & Product QA·Release Audit 네 역할에서 실제로 관측된다.
  CHECK: 각 역할의 `ROLE_READY_ACK`, logical role, continuity 상태, mutation count를 검증한다.
  EXPECT: 4/4 reachable; mutation count 0; readiness를 진행률·QA·Audit으로 승격하지 않는다.
  EVIDENCE: handoff-supplied out-of-band readiness ledger records 4/4 `ROLE_READY_ACK`, four exact logical roles, continuity READY, mutation count 0; no additional role message was sent.

- [ ] W3: private registry는 기존 Planner v2를 재할당하지 않고 관측 상태만 갱신하며, Builder·UX & Product QA·Release Audit은 각각 다음 version으로 한 번만 CAS assign한다.
  CHECK: append-only binding/event history와 public-safe projection을 read back한다.
  EXPECT: project+role active 최대 1; duplicate/retry 0; raw locator output 0.
  EVIDENCE: registry revision 28→35 and events 29-35 prove Planner observe plus exactly three assign/idle-observe pairs; active<=1 and doctor issues 0. UNMET: the private stdin payload was echoed once by the local PTY into the internal execution transcript, so `raw locator output 0` cannot be claimed; no raw value entered argv, Git, receipt, registry public projection or public Package output.

- [x] W4: `docs/OUTCOME_SESSIONS.md`의 alias/version/state가 private registry current projection과 4/4 일치한다.
  CHECK: Package parser와 registry reconciliation을 실행한다.
  EXPECT: `sessions_registry_conflict` 0; `setup_required` 0; raw provider/session/thread/task/turn identifier 0.
  EVIDENCE: actual Package collection with `loadBindingRegistry` is valid; 4/4 states are Planner active v2 and Builder/QA/Audit idle v2; `sessions_registry_conflict` 0, `setup_required` 0, tracked prohibited-pattern hits 0.

- [x] W5: 최소 lifecycle probe 1건이 Planner → Builder 전달에서 `start_validated → dispatch_observed → execution_started → role_result_recorded → handoff_accepted`로 append-only 기록된다.
  CHECK: no-op/read-only readiness instruction의 단일 attempt와 상관관계, event order, dedup을 검증한다.
  EXPECT: attempt 1; duplicate execution 0; automatic retry 0; product/Git/runtime/provider mutation 0.
  EVIDENCE: private 0600 ledger SHA-256 `de7c2a927e31bb27fd29a153b57001b25e90271001e7d19165abeda058613666` reloads as 1 instruction / 1 attempt / 5 ordered events / 0 rotations; retry 0 and role-operation mutation 0.

- [x] W6: 교체·연속작업·독립검증 경계가 보존된다.
  CHECK: continuity policy와 public-safe receipt가 successor 검증 전 archive 금지, QA/Audit 판정 독립, Gate/acceptance 비승격을 명시한다.
  EXPECT: rotation 실행 0; archive/delete 0; progress/Gate/QA/Audit/Cherry acceptance/release 변화 0.
  EVIDENCE: rotation/replacement/archive/delete/session creation/provider dispatch 0; receipt retains fresh QA and Release Audit as open and makes no Gate, acceptance, progress or release promotion.

PASS는 현재 로컬 Codex 작업환경에서 네 역할 주소와 전달 lifecycle이 실제로 사용 가능한 상태라는 뜻이다. OUTCOME 제품의 hosted provider adapter, 자동 세션 생성, Supabase, 배포, release 또는 `EXTERNAL_OUTCOME_COMPLETE`를 뜻하지 않는다.
