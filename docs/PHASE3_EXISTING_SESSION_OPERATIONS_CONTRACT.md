# OUTCOME Phase 3 · 기존 역할 세션 연결 운영 계약

Updated: 2026-08-25 KST
Status: **Cherry-approved product definition · execution not started**

## 승인 근거

Cherry는 `docs/PHASE3_DEFINITION_DECISION_PACKET.md`의 세 추천안을 `추천안 적용`으로 승인했다.

- Q1: Phase 3 목적 = 기존 역할 세션 연결 운영
- Q2: 업무 지시 권한 = Planner-only routing
- Q3: 첫 proof = OUTCOME + Cherry Note, 실제 존재 세션만, 두 관찰 위치, 단일 routed task receipt

이 승인은 계약과 추적 위계 작성만 허용한다. 구현, 실제 binding, provider credential, 메시지 전송, 외부 mutation, QA/Audit/Cherry acceptance/release는 별도 Gate와 권한이 필요하다.

## Outcome

Cherry가 OUTCOME에서 프로젝트별 기존 역할 세션의 연결·가용성·source-grounded NOW를 이해하고, 해당 프로젝트 Planner를 단일 지시 입구로 사용해 대상 역할에 업무를 전달한 뒤 추적 가능한 결과·증거 영수증을 받는다.

OUTCOME은 세션을 생성하지 않으며 세션 활동을 진행률로 계산하지 않는다. 진행률과 Stage 전환은 Package의 Gate evidence와 요구된 독립 판정·Cherry 결정만 따른다.

## 사용자와 핵심 판단

주 사용자는 여러 PC와 Codex/Claude 역할 세션을 운영하는 Cherry다. Cherry는 30초 안에 다음을 판단할 수 있어야 한다.

1. 선택 프로젝트에 어떤 역할 세션이 실제 연결되었는가.
2. 어느 PC/provider에서 마지막으로 관찰되었고 신선한가, 오래됐거나 오프라인인가.
3. 현재 NOW는 어떤 source와 관찰 시각에서 왔는가.
4. 내 요청이 어떤 Planner와 대상 역할로 전달됐고 중복 없이 수신됐는가.
5. 결과 포인터가 어느 지시와 candidate에 연결되며 아직 어떤 Gate 판정이 남았는가.

## Phase 경계

### Included

- 이미 외부 Codex/Claude 환경에 존재하는 Planner, Builder, UX & Product QA, Release Audit 세션의 project-scoped private binding
- Mac mini·MacBook·모바일 원격 등 여러 관찰 위치에서 일관된 availability, freshness, NOW 의미
- Cherry → project Planner → target role의 Planner-only routed instruction
- idempotent instruction receipt, result pointer, evidence pointer, replacement/recovery history
- OUTCOME과 Cherry Note를 이용한 격리 proof
- public-safe 역할 상태와 private control-plane의 강제 분리

### Excluded

- Phase 2의 stable public hosting, account access, multi-user authorization
- Phase 4의 project/Package 생성, role session 생성, OUTCOME 내부 full development workspace
- Phase 5의 destination discovery, Question 200, adaptive role/tool composition
- provider 화면을 대신하는 범용 채팅 클라이언트, 임의 shell/파일 mutation, 승인 대행
- 활동량·메시지 수·경과시간 기반 진행률
- provider/resource/credential/billing/domain/release mutation

## Entry와 completion

Entry condition:

- Phase 2가 Cherry가 정한 종료 조건으로 닫혀야 한다.
- 이 계약과 Phase 3 Stage/Gate 정의가 source-controlled 상태여야 한다.
- first proof에 사용할 실제 세션과 private adapter 범위를 Cherry가 별도로 승인해야 한다.

Completion conditions:

- Codex Adapter Technical Spike S1–S6가 supported interface와 GO/NO-GO evidence로 닫힌다.
- Private Session Registry R1–R6가 immutable candidate evidence로 닫힌다.
- Multi-PC Observation Relay O1–O6가 실제 두 관찰 위치와 stale/offline 증거로 닫힌다.
- Planner Work Routing T1–T7이 단일 지시와 duplicate/timeout/wrong-binding 반증으로 닫힌다.
- Evidence Continuity E1–E6가 receipt/result/Gate 분리와 rebind recovery로 닫힌다.
- fresh UX & Product QA Q1–Q4, 별도 fresh Release Audit A1–A4, Cherry physical acceptance C1–C4가 동일 immutable candidate를 순서대로 닫는다.
- Phase 3 실행 Gate 43개가 실제 증거로 모두 닫혀도 release와 `EXTERNAL_OUTCOME_COMPLETE`는 별도 Cherry 결정이다.

Definition evidence와 구현 인계 문서는 Phase 3 실행 진행률로 계산하지 않는다. 현재 Phase 3 실행 상태는 `0/43`이며 Phase 2가 current인 동안 Phase 3은 locked future phase다.

## Scope와 Stage

### Scope 1 · Private Session Registry

목적: 프로젝트와 네 역할의 실제 기존 세션 binding을 비공개 단일 source로 관리한다.

- Stage: Codex adapter technical spike
- Gate: `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6`
- 완료 의미: supported observation/dispatch interface, auth·limit·terms·cost·fallback과 GO/NO-GO가 primary evidence로 닫힘

- Stage: Private role-session registry candidate
- Gate: `GATES_PHASE3_PRIVATE_SESSION_REGISTRY.md#R1-R6`
- depends_on: Codex adapter technical spike
- 완료 의미: binding schema, uniqueness, lifecycle, secret/redaction, audit와 negative validation이 candidate 증거로 닫힘

### Scope 2 · Multi-PC Observation Relay

목적: 관찰 위치가 달라도 availability·freshness·NOW 출처가 같은 의미로 보이게 한다.

- Stage: Cross-device observation continuity candidate
- Gate: `GATES_PHASE3_MULTI_PC_OBSERVATION_RELAY.md#O1-O6`
- depends_on: Private Session Registry
- 완료 의미: 두 관찰 위치, stale/offline/unknown, ordering/conflict, redaction과 recovery가 candidate 증거로 닫힘

### Scope 3 · Planner-only Work Routing

목적: Cherry의 작업 요청을 project Planner가 유일한 routing authority로 대상 역할에 전달한다.

- Stage: Planner-routed instruction candidate
- Gate: `GATES_PHASE3_PLANNER_WORK_ROUTING.md#T1-T7`
- depends_on: Multi-PC Observation Relay
- 완료 의미: target validation, idempotency, receipt state, timeout/cancel, wrong-binding denial과 mutation boundary가 candidate 증거로 닫힘

### Scope 4 · Evidence Return & Continuity

목적: instruction, role result, evidence pointer, Gate 판정과 session replacement history를 분리해 연속성을 보존한다.

- Stage: Evidence receipt and recovery candidate
- Gate: `GATES_PHASE3_EVIDENCE_CONTINUITY.md#E1-E6`
- depends_on: Planner-only Work Routing
- 완료 의미: immutable correlation, result/evidence distinction, rebind recovery, export/audit와 fail-closed integrity가 candidate 증거로 닫힘

### 검증·수용 Stage

네 실행 Scope 뒤 동일 immutable candidate를 다음 순서로 검증한다.

1. Fresh UX & Product QA · `GATES_PHASE3_EXISTING_SESSION_OPERATIONS_QA.md#Q1-Q4`
2. Separate fresh Release Audit · `GATES_PHASE3_EXISTING_SESSION_OPERATIONS_RELEASE_AUDIT.md#A1-A4`
3. Cherry physical acceptance · `GATES_PHASE3_EXISTING_SESSION_OPERATIONS_CHERRY_ACCEPTANCE.md#C1-C4`

QA PASS는 Audit이나 Cherry acceptance가 아니며, Audit PASS도 release 또는 Phase completion을 대신하지 않는다.

## 상태 소유권과 공개 경계

| 상태 | 단일 owner | 불변조건 |
| --- | --- | --- |
| Project/Phase/Scope/Stage/Gate | project OUTCOME Package | Gate evidence 외 진행 추론 금지 |
| project·role·session binding | private session registry | project+role당 active binding 최대 1개; replacement history 보존 |
| raw session ID/provider locator/credential | approved private control plane 또는 secret store | public HTML/API/bundle/log에 원문 0건 |
| observation event | observation relay | source host, observed_at, sequence/freshness 포함; missing을 active로 변환 금지 |
| NOW projection | latest valid observation projection | stale/offline/unknown 명시; 활동은 진행률 아님 |
| instruction intent | Planner routing ledger | immutable instruction ID, project, Planner, target role, requested scope 포함 |
| delivery/receipt | target adapter + routing ledger | instruction ID와 attempt ID로 idempotency; receipt 없는 성공 금지 |
| role result/evidence pointer | 해당 역할 세션 | 결과와 독립 판정 분리; public-safe pointer만 공개 가능 |
| QA/Audit/Cherry 판정 | 각 독립 authority | 동일 immutable candidate pin 필요; 서로 대체 불가 |

공개 대시보드는 role, bound/unbound, availability, freshness, redacted NOW, routed state만 받을 수 있다. raw session ID, task/thread/turn ID, provider token, local path, credential, unredacted prompt/result는 private boundary 밖으로 나가지 않는다.

## 명령·조회 계약

구현 전 확정해야 할 최소 domain command/query는 다음과 같다. 구체 transport와 provider adapter는 기술 실사 후 결정한다.

- `BindExistingSession(project, role, private_locator, expected_previous_binding)`
- `ReplaceSessionBinding(project, role, new_private_locator, expected_binding_version)`
- `ObserveRoleSession(project, role, binding_version, observed_at, sequence, availability, redacted_now)`
- `RoutePlannerInstruction(project, planner_binding, target_role, instruction_id, idempotency_key, intent)`
- `AcknowledgeInstruction(instruction_id, attempt_id, target_binding_version, received_at)`
- `AttachRoleResult(instruction_id, result_pointer, candidate_pin)`
- `AttachEvidenceReceipt(instruction_id, evidence_pointer, evidence_hash)`
- `GetProjectSessionStatus(project)`

모든 write command는 authenticated private control plane, explicit project/role scope, expected version과 idempotency key를 요구한다. public surface는 GET-only projection이며 write 요청은 fail closed한다.

## 정상·실패·복구 흐름

### 정상

1. Cherry가 실제 기존 세션 binding을 승인한다.
2. private registry가 project+role uniqueness와 binding version을 검증해 저장한다.
3. observation relay가 source host와 sequence가 붙은 event를 수집해 public-safe NOW를 투영한다.
4. Cherry 요청은 project Planner binding으로 들어가고 Planner가 target role과 allowed scope를 확정한다.
5. routing ledger가 immutable instruction ID와 idempotency key를 만들고 exact target binding에 한 번 전달한다.
6. target receipt와 role result가 돌아오며 evidence pointer는 별도 항목으로 연결된다.
7. Gate parser는 evidence가 실제 Gate 조건을 충족할 때만 진행 상태를 바꾼다.

### 실패

- missing/duplicate/conflicting binding: 전달 금지, `blocked_binding`.
- stale/offline observation: `stale` 또는 `offline`; NOW와 진행률 합성 금지.
- out-of-order sequence: 최신 projection 덮어쓰기 금지, conflict audit 기록.
- timeout/provider unavailable: bounded retry 또는 manual retry만; 성공 추론 금지.
- duplicate idempotency key: 기존 instruction/receipt 반환, 새 지시 생성 금지.
- target binding replaced: old binding으로 전송 금지, explicit rebind 필요.
- receipt/candidate mismatch: evidence 연결과 Gate promotion 금지.
- redaction failure: public projection 전체 fail closed.

### 복구

- registry와 routing ledger의 immutable history로 마지막 valid binding/instruction/receipt를 재구성한다.
- session replacement는 compare-and-swap version으로 수행하며 이전 binding을 revoked 상태로 남긴다.
- observation source 복귀 후 sequence gap을 검증하고 새 event만 투영한다.
- 미확인 delivery는 자동 성공 처리하지 않고 Cherry/Planner가 재전송 여부를 결정한다.
- rollback은 routing write를 비활성화하고 read-only observation으로 축소하되 기존 evidence history를 삭제하지 않는다.

## 보안·privacy·운영 원칙

- least privilege: adapter는 연결된 project+role의 필요한 조회/전달 capability만 가진다.
- separation: public read model과 private registry/routing ledger를 물리적 또는 강제 논리 경계로 분리한다.
- retention: raw private locator와 instruction payload의 보존·삭제 기간은 구현 인계 전 Cherry 결정을 받아야 한다.
- audit: binding, rebind, route, receipt, result/evidence attach, disable/rollback의 actor·time·before/after·reason을 남긴다.
- observability: binding conflict, stale rate, delivery latency, duplicate suppression, redaction failure를 측정하되 payload나 secret은 기록하지 않는다.
- mutation safety: 실제 provider message dispatch는 별도 implementation candidate와 Cherry-authorized proof window 밖에서 비활성이다.

## 첫 운영 Proof

- projects: OUTCOME + Cherry Note
- roles: 실제 존재하고 Cherry가 승인한 binding만; 없는 역할은 `unbound`
- observation: Mac mini와 MacBook/모바일 원격 중 서로 다른 두 위치
- route: Cherry 요청 1건 → OUTCOME Planner → 허용된 target role 1개
- evidence: instruction, delivery receipt, role result pointer, evidence pointer를 서로 다른 상태로 관찰
- negative probes: missing/wrong/replaced binding, duplicate idempotency key, offline/stale, timeout, receipt mismatch, public secret/session ID leak
- forbidden: release, Gate 자기 폐쇄, provider/resource/billing/domain mutation, 실제 제품 데이터 변경

## 승인된 구현 전제

- first adapter는 Codex-only다.
- Mac mini가 private registry·routing ledger·observation relay·Codex adapter를 소유한다.
- Vercel/private workspace는 public-safe projection과 end-to-end encrypted envelope만 중계한다.
- high-risk operation은 exact target·intent digest·rollback에 묶인 만료형 single-use Cherry 재확인을 요구한다.
- exact implementation contract와 initial spike handoff는 `docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md`를 따른다.
- Codex supported interface가 아직 증명되지 않았으므로 S1-S6 전에 registry/router 구현을 시작하지 않는다.

Notion과 Linear connector가 현재 환경에 연결되어 있지 않으므로 이 로컬 계약은 source-controlled canonical draft지만 외부 PRD/실행 티켓 완료를 주장하지 않는다.
