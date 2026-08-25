# OUTCOME Map · MVP

Contract status: **APPROVED**
Updated: 2026-08-25 KST

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
source_connectors:
  github:
    adopted: true
    required: false
    repository: dltmddnr3/outcome
    remote_name: origin
    default_branch: main
    binding_state: connected
    observed_published_state: published_current
    evidence_scope:
      - published_commits
      - pull_requests
      - checks
      - releases
    completion_authority: false

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
          - Cherry-approved public read-only remote feedback surface
          - private source redaction and freshness
        excluded:
          - Cherry Note iOS changes
          - Desk auth, navigation, provider, or Slack coupling
          - remote mutation or dispatch
          - stable hosted service, account system, and search-engine distribution
        stages:
          - id: outcome-stage-3
            title: Standalone migration and remote feedback foundation
            purpose: dashboard 전용 코드와 최소 runtime을 OUTCOME 저장소의 단일 원본으로 옮기고 Cherry-approved public read-only 원격 접근 후보를 만든다.
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
            gates_file: GATES_OUTCOME_MVP.md#M10-M15

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

  - id: outcome-phase-2
    title: Phase 2 · Public Multi-project Service
    purpose: 여러 프로젝트를 계정 기반 공개 서비스에서 안전하게 전환·조회한다.
    completion: stable public hosting, multi-project portfolio, and account access are evidence-closed.
    scopes:
      - id: outcome-phase-2-public-hosting
        title: Stable public delivery
        purpose: 임시 tunnel이 아닌 안정 주소와 운영 경계를 정의한다.
        stages:
          - id: outcome-stage-stable-snapshot-host
            title: Stable snapshot host
            purpose: Mac origin과 임시 tunnel에 의존하지 않는 고정 HTTPS 주소에서 정제된 Package 스냅샷을 제공한다.
            depends_on: []
            gates_file: GATES_PHASE2_STABLE_SNAPSHOT_HOST.md#S1-S6
            gate_groups:
              - code: S
                primary_label: 안정적 스냅샷 호스트
      - id: outcome-phase-2-project-portfolio
        title: Multi-project portfolio
        purpose: OUTCOME, Cherry Note, Cherry Picker 등 등록 프로젝트를 같은 Package 의미로 전환·조회한다.
        stages:
          - id: outcome-stage-project-portfolio-foundation
            title: Registered Package portfolio foundation
            purpose: 명시적 레지스트리와 Package 표시 metadata로 세 번째 이후 프로젝트도 코드별 하드코딩 없이 같은 읽기 전용 결과 지도에 등록한다.
            depends_on: [outcome-stage-stable-snapshot-host]
            gates_file: GATES_PHASE2_PROJECT_PORTFOLIO_FOUNDATION.md#P1-P6
            gate_groups:
              - code: P
                primary_label: 등록 프로젝트 포트폴리오 기반
      - id: outcome-phase-2-account-service
        title: Account-based access
        purpose: 프로젝트별 가시성과 접근 권한을 계정 기반으로 관리한다.
        stages:
          - id: outcome-stage-account-access-definition
            title: 계정 접근 계약 정의
            purpose: 공개 배포본과 인증된 비공개 작업공간의 사용자·권한·데이터·운영 경계를 구현 전에 Cherry 결정으로 고정한다.
            depends_on: [outcome-stage-project-portfolio-foundation]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md#K1-K6
            gate_groups:
              - code: K
                primary_label: 계정 접근 계약 결정

  - id: outcome-phase-3
    title: Phase 3 · Definition Pending
    purpose: Cherry가 Phase 2와 Phase 4 사이의 제품 목적을 결정하기 전까지 기능과 진행을 추론하지 않는다.
    completion: Cherry-approved Phase 3 Outcome Contract exists.
    scopes:
      - id: outcome-phase-3-definition
        title: Purpose definition pending
        purpose: Phase 3 목적·범위·Stage·Gate를 Cherry와 정의한다.
        stages: []

  - id: outcome-phase-4
    title: Phase 4 · In-OUTCOME Development
    purpose: Codex/Claude 화면 없이 OUTCOME 안에서 프로젝트 생성, 역할 세션 구성, 작업 대화를 수행한다.
    completion: project creation, four-role session creation, linked chat, and end-to-end development are evidence-closed.
    scopes:
      - id: outcome-phase-4-project-creation
        title: Project and Package creation
        purpose: OUTCOME에서 프로젝트와 표준 Package를 직접 만든다.
        stages: []
      - id: outcome-phase-4-role-sessions
        title: Four-role session composition
        purpose: Planner, Builder, UX & Product QA, Release Audit 세션을 프로젝트에 생성·연결한다.
        stages: []
      - id: outcome-phase-4-linked-chat
        title: Session-linked chat and control
        purpose: OUTCOME 안에서 역할별 작업 지시와 결과 대화를 수행한다.
        stages: []
      - id: outcome-phase-4-full-development
        title: Full development workspace
        purpose: 외부 Codex/Claude 화면 없이 개발 흐름을 완결한다.
        stages: []

  - id: outcome-phase-5
    title: Phase 5 · Outcome-first Creation
    purpose: 초기 목적지를 명확히 찾고 고정된 세션 구성을 넘어 필요한 실행 구조를 만든다.
    completion: destination discovery, Question 200, and extensible execution composition are evidence-closed.
    scopes:
      - id: outcome-phase-5-destination
        title: Destination discovery
        purpose: 프로젝트 시작 전에 원하는 결과와 성공 조건을 명확히 파악한다.
        stages: []
      - id: outcome-phase-5-question-200
        title: Question 200
        purpose: 200Q를 통해 목적·사용자·제약·완료 조건을 Outcome Contract로 만든다.
        stages: []
      - id: outcome-phase-5-composition
        title: Beyond fixed sessions
        purpose: 고정된 세션보다 더 많은 역할·도구·실행 단위를 Outcome에 맞게 구성한다.
        stages: []
```

## 현재 위치

- Current: `outcome-phase-2 / outcome-phase-2-account-service / outcome-stage-account-access-definition · Phase 2 account access contract definition`
- Next: `K5 · abuse prevention, observability, incident response, cost ceiling, staged rollout and rollback decision`; K1-K4는 2026-08-25 KST Cherry 승인으로 닫혔고 K5–K6 승인 전 인증·DB·secret·domain 제품 변경은 시작하지 않는다.
- Dashboard registration: Package-driven Cherry Note/OUTCOME UI, GitHub connector Gate M15, fresh UX & Product QA Q1–Q4, separate fresh Release Audit A1–A4, Cherry acceptance C1–C2, stable snapshot host S1–S6, and registered Package portfolio foundation P1–P6 are evidence-closed.
- Phase 1 closure boundary: 2026-08-25 KST Cherry가 내부사용 Local MVP 종료를 승인했다. 외부 공개 수준 MVP와 release approval은 이 결정에 포함되지 않는다.
- Future roadmap visibility: Phase 2의 account access definition은 `K4 4/6 승인 · K5–K6 Cherry 결정 대기` 상태로 source-visible하다. Phase 4와 5는 roadmap container이며 Phase 3은 `Definition Pending`으로 어떤 진행도 추론하지 않는다.
- `MVP_SCOPE_CLOSED`: true
- `EXTERNAL_OUTCOME_COMPLETE`: false
