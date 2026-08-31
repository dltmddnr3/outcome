# OUTCOME Model v2 — Outcome Graph and Execution Graph

Status: **CHERRY-APPROVED DESIGN · LIVE MIGRATION PENDING**

Approved: 2026-08-31 KST

## Decision

`Project → Phase → Scope → Stage → Gate`를 하나의 실행 위계로 사용하지 않는다. 이 구조는 목적 의미, 표시 그룹, 실행 상태, 완료 조건과 감사 이력을 한 경로에 섞어 correction·handoff·재검수마다 새 Gate 파일이 늘고 현재 위치가 수기 projection 사이에서 갈라지는 원인이 됐다.

OUTCOME v2는 두 그래프와 한 projection으로 분리한다.

1. **Outcome Graph** — Cherry가 승인한 안정적인 제품 의미와 목적지 관계.
2. **Execution Graph** — Planner가 제안하고 deterministic engine이 검증하는 작업·attempt·blocker·증거 관계.
3. **Current Projection** — 두 그래프와 runtime 관측에서 계산한 현재 목적지, frontier, 다음 행동과 Cherry action.

이 문서는 승인된 migration contract다. `GATES_OUTCOME_MODEL_V2.md`의 live activation predicate가 닫히기 전까지 기존 Package parser와 화면은 v1 compatibility projection을 유지하며, 이 문서만으로 진행률·Phase 완료·배포·release를 주장하지 않는다.

## Outcome Graph

| Entity | 답하는 질문 | 소유 상태 | 금지된 오용 |
| --- | --- | --- | --- |
| Project | 어떤 지속적 제품·결과 영역인가? | identity, owner, terminal outcome | 단기 실행 상태 저장 |
| Destination | 사용자가 승인한 어떤 결과 상태에 도달하는가? | outcome, mission envelope, dependencies, status | 순차 번호만으로 실행 순서 추론 |
| Milestone | Destination 도달을 위해 어떤 관측 가능한 경계를 통과하는가? | expected user delta, dependencies, acceptance predicate refs | task·correction·handoff 이력 저장 |
| Acceptance Predicate | Milestone을 닫으려면 무엇이 참이어야 하는가? | CHECK, EXPECT, evidence policy, authority | 작업 단계나 이벤트 저널로 사용 |
| Evidence Claim | predicate를 뒷받침하는 어떤 고정 증거가 있는가? | exact source/artifact/receipt pin, producer, freshness, reproducibility | 자연어 완료 보고로 대체 |

Destination과 Milestone은 DAG다. 하나의 Project 안에서 독립 목적지가 병렬로 열릴 수 있지만, 사용자 화면은 `primary_destination` 한 개와 ready frontier만 기본 표시한다.

## v1 compatibility meaning

- `Phase`는 Destination의 사용자 표시명·역사적 번호로만 유지한다. Phase 번호는 순차 실행 또는 단일 active 상태를 뜻하지 않는다.
- `Scope`는 canonical entity에서 제거한다. 필요하면 UI와 Planner가 Milestone을 묶는 derived `workstream` tag로 계산한다.
- `Stage`는 migration 동안 Milestone의 compatibility alias다.
- `Gate`는 migration 동안 Acceptance Predicate의 compatibility alias다.
- correction, retry, handoff, checkpoint, QA 재시도와 session rotation은 Gate가 아니라 Execution Graph event 또는 Evidence Claim이다.

## Execution Graph

| Entity | 최소 필드 | single authority |
| --- | --- | --- |
| Work Item | destination, milestone, expected delta, dependencies, risk, allowed scope | logical Planner proposal accepted by policy engine |
| Attempt | work id, input fingerprint, runtime binding version, lease, state, budget | deterministic transition engine |
| Event | attempt, lifecycle, observed receipt, monotonic sequence | append-only event ledger |
| Blocker | exact scope, class, owner, recovery options | policy engine from observed evidence |
| Mission Envelope | capabilities, paths/data, budget, providers, expiry, stop conditions | Cherry |

Minimum attempt lifecycle:

```text
proposed
  -> validated
  -> dispatch_observed
  -> execution_started
  -> result_recorded
  -> evidence_evaluated
  -> transition_committed | transition_rejected | delivery_unknown | blocked | failed
```

Timeout은 성공도 실패도 아닌 terminal `delivery_unknown`이다. retry는 새 attempt이며 current frontier·binding·authority를 재검증하고, 동일 접근을 반복하지 않는 changed hypothesis 또는 명시적 retry policy를 가져야 한다.

## Canonical, derived and runtime ownership

| Class | Contents | Write authority |
| --- | --- | --- |
| Canonical durable | Contract, Outcome Graph, Destination mission envelope, Milestone, Acceptance Predicate, Cherry decision, immutable Evidence Claim | Contract/graph policy + exact role/Cherry authority |
| Derived durable snapshot | primary destination, ready frontier, progress numerator, next best action, Cherry action, stale/conflict flags | deterministic projector only |
| Runtime durable ledger | binding history, Work Item, Attempt, Event, Blocker, budget consumption, rotation | runtime registry and transition engine |
| Runtime volatile | process health, UI focus, streaming activity, transient cursor | adapter; never progress authority |

`OUTCOME_MAP.md`의 현재 위치, `CURRENT_STATE.md`, dashboard 수치와 다음 경계는 live migration 뒤 수기 authority가 아니다. 동일 versioned snapshot에서 생성하고 source revision과 observed time을 표시한다.

## Planner loop

```text
OBSERVE
  -> validate destination/frontier versions
  -> compute acceptance gaps
  -> filter by authority/dependency/risk/budget/dedup/lease
  -> rank best eligible action
  -> propose bounded execution contract
  -> runtime adapter executes
  -> collect result and evidence
  -> evaluate predicates
  -> commit transition or replan
```

다음 행동은 단일 가중합 점수가 아니라 아래 사전식 순서로 선택한다.

1. hard constraint 통과: authority, dependency, privacy/security, budget, freshness, dedup, lease.
2. 예상 acceptance gap 감소.
3. 중요한 blocker 또는 불확실성 감소.
4. 사용자 가치가 관측되기까지의 시간.
5. reversibility와 실패 복구 비용.
6. 실행 비용과 verification burden.

각 cycle은 `user_value_delta`, `acceptance_gap_delta`, `uncertainty_delta`, `blocker_delta`, `cherry_decision_required` 중 하나를 만들어야 한다. 모두 0이면 `NO_OUTCOME_DELTA`; 새 correction이나 자동 후속 작업을 만들지 않는다.

## Mission envelope default

Cherry의 Destination 승인은 다음 기본 envelope를 포함한다.

- allowed: read-only 조사, 승인된 경로 안의 local/reversible 구현과 테스트, 기존 predicate를 향한 correction, 자동 evidence 수집, compact checkpoint와 session/worker 교체.
- default budget: active implementation lease 1개, 독립 검증은 동일 immutable candidate에 한해 병렬 가능, 자동 retry 0, 정상 경로 사람 개입 0.
- dynamic escalation: credential·permission 확대, 결제·budget 확대, 실제 사용자/운영 데이터 mutation, 외부 또는 Production 배포, destructive/irreversible migration, privacy/security/legal 경계, Destination·acceptance 의미 변경, Cherry acceptance와 release.
- expiry: Destination version, authority scope, budget 또는 source가 바뀌면 envelope를 재검증한다.

## Triggered verification

- Builder self-check는 모든 semantic candidate에 비례 적용한다.
- fresh UX & Product QA는 사용자 행동·정보 구조·접근성·제품 의미가 달라진 coherent candidate 또는 Destination acceptance에서 한 번 실행한다.
- fresh Release Audit은 release candidate, deployment/runtime/provider, credential, data migration, privacy/security 또는 evidence conflict에서 한 번 실행한다.
- checkpoint, handoff, retry, receipt formatting과 no-semantic-delta correction은 새 QA/Audit trigger가 아니다.
- `coherent_candidate`는 exact source tree, artifact identity, dependency lock, runtime configuration class와 acceptance predicate set이 모두 고정된 상태다. 이 identity 중 하나가 바뀔 때만 새 candidate다.

## Runtime adapters

Codex App adapter를 첫 live runtime으로 사용한다. adapter는 binding resolve, dispatch request, provider-send 관측, destination-start 관측, result/receipt 회수만 담당하며 canonical transition 권한이 없다.

Hermes는 runtime 병목이 측정된 뒤 같은 interface로 비교하는 선택지다. provider/model routing, cron, messaging와 병렬 Worker 실행은 제공할 수 있지만 Destination, authority, acceptance와 evidence truth를 소유하지 않는다.

## Decision latency budget

Model v2의 성능 판정은 v1 대비 백분율 동률이 아니라 실제 decision-engine 절대 예산으로 한다. v1 hot path는 authority, stale source, candidate drift, duplicate fingerprint, overlapping lease, terminal `delivery_unknown`, automatic retry와 outcome delta를 모두 검사하지 않으므로, 거의 0에 가까운 v1 값에 대한 상대 회귀율은 제품 체감이나 안전 비용을 제대로 나타내지 않는다.

- hot eligible-work start: pinned local canary의 p95가 `0.01 ms/op` 이하여야 한다.
- cold compile: pinned local canary의 p95가 `0.1 ms/compile` 이하여야 한다.
- duplicate execution, automatic retry, unauthorized canonical transition, false completion은 각각 `0`이어야 한다.
- fixture, runtime version, warmup, sample count와 raw measurement는 immutable receipt에 고정한다.
- 절대 예산을 넘거나 안전 카운터가 하나라도 증가하면 fail-closed다. v1 상대 수치는 diagnostic으로 계속 기록하되 activation predicate는 아니다.

이 기준 변경은 후보 수용이나 활성화가 아니다. exact optimization candidate는 변경된 predicate에 대해 fresh UX & Product QA와 fresh Release Audit을 다시 통과해야 한다.

## Migration and rollback

1. 기존 226개 root `GATES*.md`는 삭제하지 않고 immutable supporting history로 보존한다.
2. `OUTCOME_MAP.md`가 직접 참조하는 현재 canonical Gate만 Acceptance Predicate로 승격한다.
3. correction/handoff/retry/QA-chain 파일은 current projection에서 제외하고 evidence index로 연결한다.
4. v2 parser/projector는 feature flag default OFF로 추가한다.
5. historical shadow replay로 drift, duplicate, timeout과 next-action selection을 검증한다.
6. 한 low-risk local canary에서 control plane과 current Codex adapter를 live wiring한다.
7. v1/v2 projection parity와 rollback readback이 확인된 뒤에만 v2를 active Package schema로 전환한다.

Rollback은 v2 feature flag를 끄고 v1 projection으로 복귀하는 한 candidate revert다. 기존 Gate, receipt, registry와 source history를 삭제하거나 재작성하지 않는다.
