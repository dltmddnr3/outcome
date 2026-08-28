# OUTCOME Execution Control Plane · Local Foundation Contract

Status: **LOCALLY PROMOTED · LIVE INTEGRATION LOCKED**

Approved: 2026-08-28 KST

## Outcome

OUTCOME은 프로젝트의 안정적인 결과 구조, 역할별 현재 세션, 실제 지시 lifecycle, 세션 교체, 증거 판정과 다음 작업 선택을 하나의 control loop로 연결한다. 정상 경로는 사람의 상태 확인이나 반복 승인 없이 다음 eligible 작업으로 이어지고, 배포·비용·권한·실데이터·보안·범위 변경 또는 관측 불능 경계에서만 exact workstream을 `SAFE_HOLD`한다.

이 foundation은 local/synthetic domain candidate만 허용한다. 실제 provider session 탐색·생성·메시지 dispatch·archive, hosted mutation, account DB, credential, 배포와 release는 계속 잠겨 있다. 이 candidate는 O2 또는 T1–T7을 닫지 않는다.

## Single authority table

| State | Single authority | Forbidden inference |
| --- | --- | --- |
| Outcome, scope, hierarchy | `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md` | session activity로 변경 금지 |
| Stage acceptance and progress | `GATES*.md` + immutable evidence | 메시지·시간·테스트 실행만으로 진행 추론 금지 |
| Current role session | private session registry | 대화 제목이나 기억으로 binding 추론 금지 |
| NOW and freshness | latest valid observation | NOW를 progress로 승격 금지 |
| Instruction lifecycle | private append-only instruction events | dispatch 요청을 전달 성공으로 간주 금지 |
| Session rotation | continuity receipt + versioned registry replace | successor 검증 전 교체·archive 금지 |
| Role result and candidate | role-owned immutable receipt | result를 QA·Audit·acceptance로 승격 금지 |
| UX/Product verdict | fresh UX & Product QA | Builder self-QA 금지 |
| Release verdict | separate fresh Release Audit | QA verdict 전이 금지 |
| Acceptance, deploy, release | Cherry | 자동화의 권한 획득 금지 |

## Service boundaries

1. **Package reader** — Contract/Map/Gates/Session manifest를 읽고 stable project position을 제공한다.
2. **Session directory** — `project_id + role`을 current private binding version으로 해석하고 append-only replacement history를 소유한다.
3. **Instruction lifecycle** — instruction과 attempt를 exact binding version에 고정하고 관측된 event만 append한다.
4. **Continuity manager** — checkpoint, successor verification, atomic replace와 recoverable predecessor history를 조정한다.
5. **Eligibility engine** — dependency, Gate, risk class, binding health와 authority를 사용해 다음 bounded work를 선택한다.
6. **Evidence engine** — result, candidate, evidence pointer와 각 독립 authority decision을 분리한다.
7. **Public-safe projection** — 현재 목표·NOW·다음 경계·역할 상태·Cherry action만 투영하며 private locator와 권한 mutation을 노출하지 않는다.

각 state는 위 owner 한 곳에서만 변경한다. projection이나 문서 복제본은 authority가 아니다.

## Logical role address

사용자와 Planner는 raw session ID 대신 다음 stable address만 사용한다.

```text
<project_id> / planner
<project_id> / builder
<project_id> / ux_product_qa
<project_id> / release_audit
```

instruction 시작 시 current binding과 version을 snapshot한다. queued/running attempt는 그 version에 고정되며 replace 뒤 자동 승계·재전송하지 않는다. 새 instruction만 새 current binding을 사용한다.

## Minimal instruction lifecycle

```text
start_validated
  -> dispatch_observed
  -> execution_started
  -> role_result_recorded
  -> handoff_accepted | handoff_rejected
```

Terminal safety states are `delivery_unknown`, `cancelled`, `failed`, `quarantined`, and `safe_hold`. 모든 event는 project, role, instruction, attempt와 target binding version에 correlation되며 append-only다.

- `dispatch_observed`는 provider 또는 target adapter의 관측 영수증이 있을 때만 허용한다.
- timeout이나 missing acknowledgement는 `delivery_unknown`; automatic retry는 금지한다.
- retry는 Planner가 current binding과 authority를 다시 검증한 새 attempt로만 만든다.
- role result는 Gate PASS, QA, Audit, acceptance 또는 release가 아니다.

## Session maintenance and rotation

반복 timeout, context loss, source/role/candidate drift 또는 Cherry의 정비 요청은 rotation recommendation을 만들 수 있다. 추정 파일 크기나 대화 줄 수는 공식 capacity metric이 아니면 자동 교체 authority가 아니다.

```text
watch
  -> handoff_required
  -> successor_starting
  -> successor_verified
  -> predecessor_archived
```

최소 checkpoint는 Package position, exact source/candidate/receipt, authority, closed evidence, open Gates, next action, stop condition, rollback, external mutation count와 `false_completion_count`를 포함한다. raw conversation, secret, private locator와 추정 progress는 복사하지 않는다. `STARTED + CONTINUITY_READY`와 registry read-after-write 전에는 active binding을 바꾸거나 predecessor를 archive하지 않는다.

## Proportional execution policy

| Class | Examples | Minimum ceremony |
| --- | --- | --- |
| lightweight | read-only discussion, status explanation, non-semantic copy cleanup | no new task Gate; existing policy applies |
| standard | bounded implementation, tests, semantic contract correction | reuse Stage Gate; automatic lifecycle receipt; no normal-path human approval |
| high_risk | deploy, release, credential, payment, real data, destructive action, security/privacy or Outcome change | exact Gate, rollback and explicit Cherry authority |

`karpathy-guidelines`는 승인된 Outcome에 필요한 최소 범위와 가장 단순한 경로를 강제한다. `unlazy`는 standard/high-risk 또는 반복 미완료 작업에서 기존 Stage Gate를 우선 재사용하며 실제 `CHECK / EXPECT / EVIDENCE`를 요구한다. skill use 자체는 progress나 completion이 아니다.

## Continuous execution

검증된 work item 뒤 eligibility engine은 같은 권한 안의 다음 bounded work를 선택한다. 정상 경로의 lifecycle receipt는 비동기 기록이며 Cherry나 Planner의 수동 승인 단계가 아니다.

독립 workstream만 `Builder N+1 / QA N / Audit N-1`로 병렬화한다. 동일 file, schema, migration, candidate, worktree, authority 또는 explicit dependency가 겹치면 직렬화한다. 한 workstream의 결정 대기는 그 범위만 막고 다른 eligible work는 계속한다.

다음 조건은 해당 workstream을 `SAFE_HOLD`한다.

- missing, stale, offline, conflicting or replaced binding
- delivery or execution not observed
- source, candidate, receipt or authority mismatch
- duplicate instruction conflict
- deploy, release, credential, payment, real-data, destructive, security/privacy or Outcome boundary without Cherry authority

## MVP performance guardrails

- normal-path human intervention: `0`
- status-check conversations required for continuation: `0`
- duplicate execution: `0`
- automatic retry after unknown delivery: `0`
- lightweight work receiving a new task Gate: `0`
- current/selected session ambiguity in public projection: `0`
- private identifiers in public projection: `0`

## Foundation implementation boundary

첫 Builder slice는 pure local/synthetic control-plane semantics와 hostile tests만 구현한다. 기존 registry를 caller-owned adapter로 읽되 실제 registry file, API, UI, database, provider, session, message, runtime 또는 deployment에 wiring하지 않는다.

로컬 foundation 구현은 `server/outcome-execution-control-plane.mjs`와 focused test에 한정한다. 이후 live adapter, UI, automatic session creation/rotation과 continuous queue wiring은 각각 새 immutable candidate와 별도 Gate를 요구한다.
