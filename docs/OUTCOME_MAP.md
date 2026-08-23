# OUTCOME Map · MVP

Contract status: **APPROVED**
Updated: 2026-08-23 KST

이 문서는 OUTCOME 프로젝트 자체의 `Project → Phase → Scope → Stage` 구조와 각 목적을 정의합니다. 상태는 연결된 Gate evidence와 immutable receipt에서만 판정하며 이 문서의 설명만으로 완료를 선언하지 않습니다.

```yaml
project_id: outcome
project_title: OUTCOME
package_name: OUTCOME Package
package_schema_version: 1
project_purpose: >-
  여러 AI 역할과 세션이 만드는 활동을 프로젝트 결과 구조와 검증 증거에 연결해,
  Cherry가 현재 위치와 다음 경계를 30초 안에 이해하게 한다.
contract_file: docs/OUTCOME_CONTRACT.md
gates_files:
  - GATES.md
  - GATES_OUTCOME_MVP.md
runtime_binding_source: OUTCOME-managed registry

phases:
  - id: outcome-phase-1
    title: Phase 1 · Local MVP
    purpose: >-
      Cherry Note와 OUTCOME 자체를 동일한 표준 계약으로 추적하는 독립 로컬 대시보드를
      Cherry가 실제 사용 가능한 상태로 닫는다.
    completion: >-
      standalone migration, generic document adapter, role session binding, independent UX/Product QA,
      independent Release Audit, and Cherry acceptance are all closed with evidence.
    scopes:
      - id: outcome-scope-contract
        title: Contract foundation
        purpose: 모든 프로젝트가 동일한 의미로 등록될 수 있는 계약, 위계, Gate, 역할 경계를 고정한다.
        included:
          - three-document project input contract
          - Project → Phase → Scope → Stage → Gate semantics
          - four-role session binding and authority
        excluded:
          - dashboard product implementation
        stages:
          - id: outcome-stage-1
            title: Documentation bootstrap
            purpose: fresh session이 대화 기록 없이 OUTCOME의 목적과 현재 경계를 이해하게 한다.
            depends_on: []
            gates_file: GATES.md#D1-D7
          - id: outcome-stage-2
            title: Standard input and self-tracking contract
            purpose: 세 표준 문서, 역할 binding, OUTCOME 자체 Map과 delivery Gate를 확정한다.
            depends_on: [outcome-stage-1]
            gates_file: GATES.md#R1-R12

      - id: outcome-scope-runtime
        title: Standalone runtime and generic tracking
        purpose: 기존 1차 대시보드를 OUTCOME으로 분리하고 프로젝트별 문서와 세션을 일반화해 MacBook·모바일에서도 안전하게 읽는다.
        included:
          - dashboard-only surgical extraction
          - generic contract/map/gate adapters
          - project selector or equivalent project orientation
          - current and historical role session bindings
          - stale, unknown, blocked, unbound, and locked states
          - authenticated read-only remote feedback surface
          - private source redaction and freshness
        excluded:
          - Cherry Note iOS changes
          - Desk auth, navigation, provider, or Slack coupling
          - remote mutation or dispatch
          - anonymous public dashboard access
        stages:
          - id: outcome-stage-3
            title: Standalone migration and remote feedback foundation
            purpose: dashboard 전용 코드와 최소 runtime을 OUTCOME 저장소의 단일 원본으로 옮기고 인증된 read-only 원격 접근 후보를 만든다.
            depends_on: [outcome-stage-2]
            gates_file: GATES_OUTCOME_MVP.md#M1-M4-W1-W6
          - id: outcome-stage-4
            title: Generic source model
            purpose: Cherry Note 하드코딩을 제거하고 세 표준 문서와 role binding으로 프로젝트 모델을 만든다.
            depends_on: [outcome-stage-3]
            gates_file: GATES_OUTCOME_MVP.md#M5-M9
          - id: outcome-stage-5
            title: OUTCOME self-tracking UI
            purpose: Cherry Note와 OUTCOME의 목적·현재 위치·Stage Gate·NOW를 같은 위계와 상태 언어로 보여준다.
            depends_on: [outcome-stage-4]
            gates_file: GATES_OUTCOME_MVP.md#M10-M14

      - id: outcome-scope-acceptance
        title: Independent acceptance
        purpose: Builder와 분리된 검증과 Cherry 실제 사용으로 Local MVP 결과를 닫는다.
        included:
          - fresh UX & Product QA
          - separate fresh Release Audit
          - Cherry 30-second understanding task
        excluded:
          - hosted deployment
          - third-project portfolio
        stages:
          - id: outcome-stage-6
            title: UX & Product QA
            purpose: 실제 화면에서 위계, 목적, 현재 위치, 다음 경계가 오해 없이 읽히는지 반증한다.
            depends_on: [outcome-stage-5]
            gates_file: GATES_OUTCOME_MVP.md#Q1-Q4
          - id: outcome-stage-7
            title: Release Audit
            purpose: pinned candidate의 독립 실행, privacy, source isolation, build, rollback 준비도를 감사한다.
            depends_on: [outcome-stage-6]
            gates_file: GATES_OUTCOME_MVP.md#A1-A4
          - id: outcome-stage-8
            title: Cherry acceptance
            purpose: Cherry가 OUTCOME으로 Cherry Note와 OUTCOME의 현재 위치와 다음 행동을 30초 안에 판단한다.
            depends_on: [outcome-stage-7]
            gates_file: GATES_OUTCOME_MVP.md#C1-C2
```

## 현재 위치

- Current: `outcome-phase-1 / outcome-scope-contract / outcome-stage-2`
- Next: `outcome-scope-runtime / outcome-stage-3 · Standalone migration`
- Dashboard registration: contract-ready, runtime adapter pending
- `MVP_SCOPE_CLOSED`: false
- `EXTERNAL_OUTCOME_COMPLETE`: false
