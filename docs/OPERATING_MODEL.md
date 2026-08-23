# OUTCOME 운영 모델

Status: **Cherry approved · 2026-08-23**

## OUTCOME Package

신규 프로젝트가 OUTCOME에 등록되기 위해 제공하는 표준 문서 묶음을 **OUTCOME Package**라고 부릅니다. 어떤 프로젝트든 아래 세 문서 유형을 합의된 형식으로 제공하면 OUTCOME이 구조와 진행을 추적할 수 있습니다.

1. `OUTCOME_CONTRACT.md`: Project Outcome, Phase 목적, 완료 조건, 포함·제외 범위, 수용 권한
2. `OUTCOME_MAP.md`: `Project → Phase → Scope → Stage`의 목적, 순서, 의존성, 연결된 Gate 문서
3. `GATES*.md`: Stage별 Gate의 `CHECK`, `EXPECT`, `EVIDENCE`와 구현·테스트·증거 확정 상태

Gate는 다음 진행 단계가 아니라 Stage의 완료 조건입니다. 문서가 없거나 형식이 유효하지 않으면 OUTCOME은 `contract missing`, `map missing`, `gate evidence missing`, `unknown`을 표시하며 세션 대화로 의미나 진행률을 추정하지 않습니다.

역할별 session binding과 binding history는 OUTCOME Package의 정적 문서에 포함하지 않습니다. 이는 OUTCOME runtime registry가 프로젝트별로 연결하고 관리합니다.

## 기본 Source Connector · GitHub

GitHub는 OUTCOME Package가 기본 지원하는 선택적 source connector입니다. 별도의 네 번째 Package 문서를 만들지 않고 `OUTCOME_CONTRACT.md`에는 사람이 읽는 연결 상태를, `OUTCOME_MAP.md`에는 `source_connectors.github` metadata를 선언합니다.

- Package 문서: 목적, 구조, Gate와 수용 의미
- 로컬 Git: 아직 공개되지 않은 working change와 immutable candidate
- GitHub: 공개된 commit, pull request, checks, release evidence
- runtime registry: token, credential, host, local path와 연결 상태

GitHub가 없거나 remote가 일치하지 않아도 Package 자체는 유효하지만 connector는 `unbound` 또는 `conflict`로 fail-closed 표시합니다. GitHub activity는 Gate closure, 독립 QA, Release Audit 또는 Cherry acceptance를 대신하지 않습니다.

## 세션 구성

| 순서 | 세션 | 책임 | 변경 권한 |
|---|---|---|---|
| 1 | OUTCOME · Planner | Outcome Contract, IA, Scope/Stage/Gate 구조, acceptance와 우선순위 확정 | 기획 문서만 |
| 2 | OUTCOME · Builder | 승인된 계약을 최소 변경으로 구현하고 테스트·candidate 증거 생성 | 제품 코드와 Builder Gate |
| 3 | OUTCOME · UX & Product QA | fresh Claude가 실제 사용성, 정보 이해, 반례, 모바일/데스크톱 패턴을 독립 검수 | 원칙적으로 read/test/use only |
| 4 | OUTCOME · Release Audit | 다른 fresh Claude가 exact Git/artifact/build/security/rollback을 독립 감사 | read-only audit |

최종 수용자는 Cherry입니다. QA와 Audit은 서로의 PASS를 대신할 수 없고 Builder는 self-accept하지 않습니다.

## 현재 생성된 Codex 작업

- Planner: `OUTCOME · Planner`
- Builder: `OUTCOME · Builder`
- UX & Product QA: `OUTCOME · UX & Product QA`
- Release Audit: `OUTCOME · Release Audit`

이 작업들은 생성 당시 기존 WhiteCastle Desk 저장소의 worktree에 연결되었습니다. OUTCOME 독립 저장소로 실제 구현을 옮긴 뒤에는 새 repository root를 authoritative project로 다시 연결해야 합니다.

## 역할 세션 binding

세 프로젝트 문서는 안정적인 프로젝트 의미를 정의합니다. 자주 바뀌는 세션 정보는 문서에 넣지 않고 OUTCOME이 별도 runtime registry로 관리합니다.

프로젝트와 역할별로 하나의 현재 binding과 append-only 과거 이력을 유지합니다. 세션 교체는 이전 ID를 삭제하지 않고 `replaced`로 남깁니다.

```yaml
project_id: string
role: planner | builder | ux_product_qa | release_audit
session_id: string
host_id: string | unknown
worktree_root: string | unknown
phase_id: string | null
scope_id: string | null
stage_id: string | null
bound_at: timestamp
replaced_at: timestamp | null
status: active | idle | terminal | stale | replaced | unbound
```

세션과 rollout은 NOW의 작업 설명과 freshness를 제공합니다. 프로젝트 구조는 `OUTCOME_MAP.md`, Stage 진행은 `GATES*.md`, Stage 전환은 Gate evidence와 immutable receipt, 최종 수용과 출시는 Cherry의 명시적 결정으로만 판정합니다. 자연어 완료 보고는 그 자체로 진행이나 수용 증거가 아닙니다.

## 기본 작업 규율

- `karpathy-guidelines`: 가정과 tradeoff를 드러내고 가장 단순한 경로를 선택하며 요청 밖 변경을 하지 않습니다.
- `unlazy`: 실질 작업 전 Gate를 파일로 작성하고, 모든 Gate에 실제 증거가 없으면 완료 보고하지 않습니다.
- Builder product edit ownership: 제품 코드는 Builder만 변경합니다.
- independent verification: QA와 Audit은 fresh session과 immutable candidate를 사용합니다.
- release boundary: push, deploy, 외부 공개, 자격 증명 변경은 별도 권한입니다.

## 인계 형식

각 세션은 다음을 남깁니다.

1. exact objective와 scope
2. 변경 파일 또는 읽은 근거
3. Gate N/N와 검사 결과
4. commit/tree 또는 artifact identity
5. blocker와 `needs_cherry_decision`
6. 다음 한 가지 안전한 행동
7. `false_completion_count`

## 작업 흐름

Planner → Builder ↔ UX & Product QA → Release Audit → Cherry acceptance

QA가 결함을 찾으면 Builder로 돌아가며, 수정 candidate는 새 immutable identity로 다시 QA와 Audit을 거칩니다. Phase 2는 Phase 1 세션을 그대로 연장하지 않고 새 Outcome Contract와 fresh Builder로 시작합니다.
