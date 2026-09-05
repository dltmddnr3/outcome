# OUTCOME Map

Contract status: **APPROVED**
Updated: 2026-08-31 KST

이 문서는 live v1 compatibility projection과 승인된 v2 migration target을 함께 정의합니다. v2의 canonical semantics는 `docs/OUTCOME_MODEL_V2.md`이며, live activation 전까지 기존 parser는 `Project → Phase → Scope → Stage`를 읽습니다. 상태는 Acceptance Predicate/Gate evidence와 immutable receipt에서만 판정합니다.

```yaml
project_id: outcome
project_title: OUTCOME
package_name: OUTCOME Package
package_schema_version: 1
project_purpose: >-
  여러 AI 역할과 세션이 만드는 활동을 프로젝트 결과 구조와 검증 증거에 연결해,
  Cherry가 현재 위치와 다음 경계를 30초 안에 이해하게 한다.
active_workstream:
  canonical_stage_id: outcome-milestone-model-v2-local-default-projection
  canonical_gate_id: B1-B3
  objective_delta: >-
    Model v2를 selective context를 사용하는 local default로 전환하고 실제 OUTCOME work canary로
    검증한 뒤, 같은 deterministic projection을 private workspace의 기본 사용자 경험으로 제공한다.
  stop_condition: >-
    source digest, v1 rollback parity, privacy allowlist, context load set 또는 deterministic projection을
    증명할 수 없거나 동일 접근 correction attempt가 2회를 초과한다.
  fallback: V1_COMPATIBILITY_PROJECTION
contract_file: docs/OUTCOME_CONTRACT.md
gates_files:
  - GATES.md
  - GATES_OUTCOME_MVP.md
  - GATES_OUTCOME_MODEL_V2.md
  - GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md
  - GATES_PHASE4_TIMELINE_STATUS_READ.md
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
          - historical Project → Phase → Scope → Stage → Gate compatibility semantics
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
    title: Phase 2 · Account-scoped Project Service
    purpose: 로그인한 계정이 권한을 가진 프로젝트만 안전하게 전환·조회하며 프로젝트 데이터의 공개 모드는 두지 않는다.
    completion: stable hosted entry, account-scoped project portfolio, private data boundary, and account access are evidence-closed.
    scopes:
      - id: outcome-phase-2-public-hosting
        title: Stable hosted entry
        purpose: 임시 tunnel이 아닌 안정 주소에서 로그인 진입점과 운영 경계를 정의한다.
        stages:
          - id: outcome-stage-stable-snapshot-host
            title: Stable hosted shell
            purpose: Mac origin과 임시 tunnel에 의존하지 않는 고정 HTTPS 주소를 제공하되 Phase 2에서는 프로젝트 payload를 인증 전 공개하지 않는다.
            depends_on: []
            gates_file: GATES_PHASE2_STABLE_SNAPSHOT_HOST.md#S1-S6
            gate_groups:
              - code: S
                primary_label: 안정적 스냅샷 호스트
      - id: outcome-phase-2-project-portfolio
        title: Account project portfolio
        purpose: OUTCOME, Cherry Note와 이후 등록 프로젝트를 계정 membership 안에서만 같은 Package 의미로 전환·조회한다.
        stages:
          - id: outcome-stage-project-portfolio-foundation
            title: Registered Package project model
            purpose: 명시적 레지스트리와 Package 표시 metadata로 프로젝트를 등록하되 가시성은 서버가 확인한 계정 membership이 결정한다.
            depends_on: [outcome-stage-stable-snapshot-host]
            gates_file: GATES_PHASE2_PROJECT_PORTFOLIO_FOUNDATION.md#P1-P6
            gate_groups:
              - code: P
                primary_label: 등록 프로젝트 포트폴리오 기반
      - id: outcome-phase-2-account-service
        title: 계정 기반 접근
        purpose: 프로젝트별 가시성과 접근 권한을 계정 기반으로 관리한다.
        stages:
          - id: outcome-stage-account-access-definition
            title: 계정 접근 계약 정의
            purpose: 로그인 전 데이터 없는 진입점과 인증된 프로젝트 작업공간의 사용자·권한·데이터·운영 경계를 구현 전에 Cherry 결정으로 고정한다.
            depends_on: [outcome-stage-project-portfolio-foundation]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md#K1-K6
            gate_groups:
              - code: K
                primary_label: 계정 접근 계약 결정
          - id: outcome-stage-account-access-implementation
            title: 계정 접근 구현 후보
            purpose: 승인된 K1-K6 계약을 특정 인증 제공자에 종속되지 않는 로컬·미리보기 구현 후보와 재현 가능한 증거로 만든다.
            depends_on: [outcome-stage-account-access-definition]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_IMPLEMENTATION.md#I1-I8
            gate_groups:
              - code: I
                primary_label: 계정 접근 구현 후보
          - id: outcome-stage-account-access-ux-product-qa
            title: 계정 접근 사용성·제품 검수
            purpose: 구현 담당자와 분리된 새 검수자가 정확히 고정된 후보의 공개·비공개 사용자 여정과 원본 일치 여부를 반증한다.
            depends_on: [outcome-stage-account-access-implementation]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_UX_PRODUCT_QA.md#Q1-Q4
            gate_groups:
              - code: Q
                primary_label: 독립 사용성·제품 검수
          - id: outcome-stage-account-access-release-audit
            title: 계정 접근 출시 감사
            purpose: 별도의 새 감사자가 같은 후보의 인증, 행 단위 접근 제어, 개인정보·데이터, 운영, 비용, 실행 환경과 되돌리기를 검증한다.
            depends_on: [outcome-stage-account-access-ux-product-qa]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT.md#A1-A4
            gate_groups:
              - code: A
                primary_label: 독립 출시 감사
          - id: outcome-stage-account-access-hosted-preview-preparation
            title: 호스팅 미리보기 실행 계약
            purpose: 실제 인증·데이터 변경을 코드 준비, 개발 인증, 호스팅 데이터, 운영 환경 활성화로 분리하고 증빙·되돌리기 경계를 고정한다.
            depends_on: [outcome-stage-account-access-release-audit]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_PREPARATION.md#H1-H6
            gate_groups:
              - code: H
                primary_label: 호스팅 미리보기 실행 계약
          - id: outcome-stage-account-access-hosted-preview-code-readiness
            title: 호스팅 미리보기 코드 준비
            purpose: 외부 자원이나 비밀값 없이 개발 인증과 호스팅 데이터를 분리하고, 수파베이스 없이도 HP1 인증만 검증 가능한 실패 시 차단 제품 후보를 만든다.
            depends_on: [outcome-stage-account-access-hosted-preview-preparation]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS.md#B1-B12
            gate_groups:
              - code: B
                primary_label: 무자격증명 코드 준비
          - id: outcome-stage-account-access-hosted-identity-preview
            title: 개발 인증 직접 검수
            purpose: Cherry 승인 아래 클러크 개발 인증과 버셀 미리보기에서 구글·이메일 로그인, 인증 후 애플 계정 연결과 로그아웃을 직접 검증한다.
            depends_on: [outcome-stage-account-access-hosted-preview-code-readiness]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_PREVIEW.md#P1-P6
            gate_groups:
              - code: P
                primary_label: 개발 인증 직접 검수
          - id: outcome-stage-account-only-private-project-preview
            title: 계정 전용 프로젝트 미리보기
            purpose: OUTCOME과 Cherry Note를 인증된 Cherry 계정의 비공개 프로젝트로 제공하고 인증 전 프로젝트 payload와 과거 대시보드 경로를 닫는다.
            depends_on: [outcome-stage-account-access-hosted-identity-preview]
            gates_file: GATES_PHASE2_ACCOUNT_ONLY_PRIVATE_PROJECT_PREVIEW.md#N1-N7
            gate_groups:
              - code: N
                primary_label: 계정 전용 프로젝트 전환
          - id: outcome-stage-account-access-hosted-data-preview
            title: 호스팅 데이터 격리 검증
            purpose: 별도 승인된 격리 수파베이스 미리보기에서 합성 패키지 데이터, 실제 행 단위 접근 제어, 생명주기와 복원을 검증한다.
            depends_on: [outcome-stage-account-only-private-project-preview]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_DATA_PREVIEW.md#D1-D7
            gate_groups:
              - code: D
                primary_label: 호스팅 데이터 격리 검증
          - id: outcome-stage-account-access-hosted-preview-ux-product-qa
            title: 호스팅 독립 검수
            purpose: 새 검수자가 실제 인증과 호스팅 데이터 후보의 맥북·모바일 공개·비공개 여정을 독립 반증한다.
            depends_on: [outcome-stage-account-access-hosted-data-preview]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_UX_PRODUCT_QA.md#Q1-Q4
            gate_groups:
              - code: Q
                primary_label: 호스팅 독립 검수
          - id: outcome-stage-account-access-hosted-preview-release-audit
            title: 호스팅 출시 감사
            purpose: 별도의 새 감사자가 같은 호스팅 후보의 인증, 행 단위 접근 제어·데이터, 개인정보, 비용, 실행 환경과 되돌리기를 검증한다.
            depends_on: [outcome-stage-account-access-hosted-preview-ux-product-qa]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_RELEASE_AUDIT.md#A1-A4
            gate_groups:
              - code: A
                primary_label: 호스팅 출시 감사
          - id: outcome-stage-account-access-cherry-acceptance
            title: 호스팅 후보 Cherry 승인
            purpose: HP1+HP2 호스팅 후보의 두 독립 검증을 통과한 exact pin을 Cherry가 맥북과 모바일에서 직접 판정한다.
            depends_on: [outcome-stage-account-access-hosted-preview-release-audit]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_CHERRY_ACCEPTANCE.md#C1-C4
            gate_groups:
              - code: C
                primary_label: 호스팅 후보 실제 사용 승인
          - id: outcome-stage-account-access-production-resource-preparation
            title: 운영 자원 준비
            purpose: 별도 HP3-A 승인 아래 운영 provider·data·host 자원을 private-disabled staged candidate와 비민감 영수증으로 준비한다.
            depends_on: [outcome-stage-account-access-cherry-acceptance]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_RESOURCE_PREPARATION.md#H1-H6
            gate_groups:
              - code: H
                primary_label: 운영 자원 준비
          - id: outcome-stage-account-access-production-ux-product-qa
            title: 운영 후보 독립 검수
            purpose: 새 검수자가 exact production candidate의 실제 provider·domain·MacBook/mobile 제품 여정을 독립 반증한다.
            depends_on: [outcome-stage-account-access-production-resource-preparation]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_UX_PRODUCT_QA.md#Q1-Q4
            gate_groups:
              - code: Q
                primary_label: 운영 후보 사용성·제품 검수
          - id: outcome-stage-account-access-production-release-audit
            title: 운영 후보 출시 감사
            purpose: 별도의 새 감사자가 같은 production candidate의 auth·RLS·data lifecycle·operations·cost·rollback을 독립 판정한다.
            depends_on: [outcome-stage-account-access-production-ux-product-qa]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_RELEASE_AUDIT.md#A1-A4
            gate_groups:
              - code: A
                primary_label: 운영 후보 출시 감사
          - id: outcome-stage-account-access-production-cherry-acceptance
            title: Cherry 운영 후보 승인
            purpose: 두 독립 검증을 통과한 exact production candidate를 Cherry가 직접 판정하되 activation 권한과 분리한다.
            depends_on: [outcome-stage-account-access-production-release-audit]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_CHERRY_ACCEPTANCE.md#C1-C4
            gate_groups:
              - code: C
                primary_label: Cherry 운영 후보 승인
          - id: outcome-stage-account-access-production-activation
            title: 운영 활성화
            purpose: 별도 HP3-D 승인 아래 canonical Cherry owner의 private read-only 접근만 열고 15분·24시간 관측과 rollback 영수증을 고정한다.
            depends_on: [outcome-stage-account-access-production-cherry-acceptance]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_PRODUCTION_ACTIVATION.md#L1-L6
            gate_groups:
              - code: L
                primary_label: 운영 접근 활성화

  - id: outcome-phase-3
    title: Phase 3 · Existing Session Operations
    purpose: 여러 PC와 외부 Codex/Claude에 이미 존재하는 역할 세션을 프로젝트에 비공개로 연결·관찰하고 Planner-only 경로로 업무를 전달해 증거 영수증을 회수한다.
    completion: private session registry, multi-PC observation, Planner-only routing, evidence continuity, fresh QA, separate fresh Audit, and Cherry physical acceptance are evidence-closed.
    scopes:
      - id: outcome-phase-3-session-registry
        title: Private session registry
        purpose: 프로젝트와 Planner·Builder·UX & Product QA·Release Audit의 실제 기존 세션 binding을 비공개 단일 source로 관리한다.
        stages:
          - id: outcome-stage-phase3-codex-adapter-spike
            title: Codex adapter technical spike
            purpose: Codex existing session observation·instruction delivery의 supported interface, auth·terms·limit·cost와 safe fallback을 증명한다.
            depends_on: []
            gates_file: GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6
            gate_groups:
              - code: S
                primary_label: Codex 연결 기술 실사
          - id: outcome-stage-phase3-private-session-registry
            title: Private role-session registry candidate
            purpose: binding schema, uniqueness, lifecycle, secret redaction, audit와 rollback을 immutable candidate로 증명한다.
            depends_on: [outcome-stage-phase3-codex-adapter-spike]
            gates_file: GATES_PHASE3_PRIVATE_SESSION_REGISTRY.md#R1-R6
            gate_groups:
              - code: R
                primary_label: 비공개 역할 세션 연결
      - id: outcome-phase-3-observation-relay
        title: Multi-PC observation relay
        purpose: 관찰 위치가 달라도 availability·freshness·NOW 출처를 같은 의미로 제공한다.
        stages:
          - id: outcome-stage-phase3-multi-pc-observation
            title: Cross-device observation continuity candidate
            purpose: 두 관찰 위치와 stale·offline·conflict·redaction·recovery를 source-grounded candidate로 증명한다.
            depends_on: [outcome-stage-phase3-private-session-registry]
            gates_file: GATES_PHASE3_MULTI_PC_OBSERVATION_RELAY.md#O1-O6
            gate_groups:
              - code: O
                primary_label: 다중 PC 관찰 연속성
      - id: outcome-phase-3-planner-routing
        title: Planner-only work routing
        purpose: Cherry 요청을 project Planner가 유일한 routing authority로 검증해 exact target role에 전달한다.
        stages:
          - id: outcome-stage-phase3-planner-routing
            title: Planner-routed instruction candidate
            purpose: target validation, idempotency, receipt, timeout·cancel·wrong-binding denial과 dispatch 안전 경계를 증명한다.
            depends_on: [outcome-stage-phase3-private-session-registry]
            gates_file: GATES_PHASE3_PLANNER_WORK_ROUTING.md#T1-T7
            gate_groups:
              - code: T
                primary_label: Planner 경유 업무 전달
      - id: outcome-phase-3-evidence-continuity
        title: Evidence return and continuity
        purpose: instruction, role result, evidence pointer, Gate 판정과 session replacement history를 분리해 검증 가능한 연속성을 보존한다.
        stages:
          - id: outcome-stage-phase3-evidence-continuity
            title: Evidence receipt and recovery candidate
            purpose: immutable correlation, result/evidence 분리, rebind recovery, audit와 fail-closed integrity를 증명한다.
            depends_on: [outcome-stage-phase3-planner-routing]
            gates_file: GATES_PHASE3_EVIDENCE_CONTINUITY.md#E1-E6
            gate_groups:
              - code: E
                primary_label: 증거 영수증과 복구
          - id: outcome-stage-phase3-fresh-ux-product-qa
            title: Fresh UX & Product QA
            purpose: 분리된 fresh reviewer가 동일 immutable candidate의 이해 가능성, 실패 복구, multi-device real-use와 false completion을 반증한다.
            depends_on: [outcome-stage-phase3-evidence-continuity]
            gates_file: GATES_PHASE3_EXISTING_SESSION_OPERATIONS_QA.md#Q1-Q4
            gate_groups:
              - code: Q
                primary_label: 사용성·제품 독립 검수
          - id: outcome-stage-phase3-release-audit
            title: Separate fresh Release Audit
            purpose: QA 뒤 별도 fresh auditor가 동일 immutable candidate의 runtime·privacy·regression·rollback과 proof scope를 감사한다.
            depends_on: [outcome-stage-phase3-fresh-ux-product-qa]
            gates_file: GATES_PHASE3_EXISTING_SESSION_OPERATIONS_RELEASE_AUDIT.md#A1-A4
            gate_groups:
              - code: A
                primary_label: 독립 출시 감사
          - id: outcome-stage-phase3-cherry-acceptance
            title: Cherry physical acceptance
            purpose: Cherry가 두 프로젝트·두 관찰 위치·단일 routed task를 실제로 사용해 Phase 3 결과와 경계를 명시적으로 수용한다.
            depends_on: [outcome-stage-phase3-release-audit]
            gates_file: GATES_PHASE3_EXISTING_SESSION_OPERATIONS_CHERRY_ACCEPTANCE.md#C1-C4
            gate_groups:
              - code: C
                primary_label: Cherry 실제 사용 승인

  - id: outcome-phase-4
    title: Phase 4 · In-OUTCOME Development
    purpose: Codex/Claude 화면 없이 OUTCOME 안에서 프로젝트 생성, 역할 세션 구성, Codex 수준의 실시간 작업 타임라인과 제어를 수행한다.
    completion: project creation, four-role session creation, realtime Observer service, session workspace, and end-to-end development are evidence-closed.
    scopes:
      - id: outcome-phase-4-project-creation
        title: Project and Package creation
        purpose: OUTCOME에서 프로젝트와 표준 Package를 직접 만든다.
        stages: []
      - id: outcome-phase-4-role-sessions
        title: Four-role session composition
        purpose: Planner, Builder, UX & Product QA, Release Audit 세션을 프로젝트에 생성·연결한다.
        stages: []
      - id: outcome-phase-4-realtime-observer
        title: Realtime execution Observer
        purpose: Phase 3 Observer Bridge와 provider 또는 local companion adapter의 append-only lifecycle event를 durable state로 투영하고 5초 이내 streaming UI에 반영하며, 30초 fallback으로 event loss와 stale/disconnected 상태를 검출한다. 세션 heartbeat와 AI 화면 판독은 제품 runtime이 아니다.
        stages: []
      - id: outcome-phase-4-linked-chat
        title: Codex-level session workspace
        purpose: OUTCOME 안에서 역할별 메시지 streaming, 계획, 도구 실행, 파일 변경·diff, 테스트, 승인 요청, 중단·재시도와 재연결을 하나의 source-grounded 작업 타임라인으로 제공한다.
        stages:
          - id: outcome-stage-phase4-timeline-status-read
            title: Timeline status read candidate
            purpose: AP-4-READ-STATUS로 authorized user message의 저장된 delivery와 dispatch facts를 읽기·재조회에 보존한다. Hosted 실행과 UI 상태 표시 및 수용은 포함하지 않는다.
            depends_on: []
            gates_file: GATES_PHASE4_TIMELINE_STATUS_READ.md#T1-T8
            gate_groups:
              - code: T
                primary_label: 저장 메시지 상태 읽기
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
        stages:
          - id: outcome-milestone-model-v2-pilot
            title: Outcome Graph v2 live pilot
            purpose: stable destination semantics, dynamic execution and deterministic current projection을 한 local canary로 접합한다.
            depends_on: []
            gates_file: GATES_OUTCOME_MODEL_V2.md#P1-P8-S1-S4-C1-C3
          - id: outcome-milestone-model-v2-local-default-projection
            title: Model v2 local default and product projection
            purpose: selective context를 사용하는 v2 기본 실행을 실제 작업으로 증명하고 그 projection을 OUTCOME 서비스의 기본 사용자 경험으로 제공한다.
            depends_on: [outcome-milestone-model-v2-pilot]
            gates_file: GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md#A1-A4-Q1-B1-B3-Q2-A5-C1
```

## 현재 위치

- Primary implementation target: `outcome-milestone-model-v2-local-default-projection · Slice A A1-A4 OPEN`. The prior Model v2 design/default-off/local-opt-in pilot is accepted supporting evidence; the current target is local default plus selective-context real-work verification. Slice B service projection remains locked until Q1. This does not close Phase 3, O2, Cherry acceptance, deployment or release.
- Current: `outcome-phase-3 / outcome-phase-3-evidence-continuity / outcome-stage-phase3-cherry-acceptance · OPEN`
- Parallel locked evidence: `outcome-stage-phase3-multi-pc-observation · O2 real two-location proof OPEN/LOCKED`.
- Next: exact candidate `99aeb22823f6ce5fa4957e6b511c941444db52dc` is active on the stable Preview alias at READY deployment `dpl_AvMiUni3Z48jbe2jhqMbAcscL3M7`. Fresh UX & Product QA `Q1-Q4 4/4` and separate Release Audit `A1-A4 4/4` are evidence-closed; audit terminal is `PASS_RELEASE_AUDIT_ONLY`, quality `96/100`, receipt commit `ca066562f7b779f0eb7fde4e2e27355cf774a51b`. Phase 3 is `38/43`. The next eligible boundary is Cherry physical acceptance `C1-C4`; O2 actual two-location evidence remains independently `OPEN/LOCKED`, and release remains separate.
- P5 controlled failure preflight: 모바일 철회·제공자 장애·만료를 서로 분리한 `GATES_PHASE2_ACCOUNT_ACCESS_P5_CONTROLLED_FAILURE_PREFLIGHT.md` `F1-F7 7/7` 준비 계약이 있다. 모바일 철회 실행은 비민감 영수증으로 고정됐고 실기기 FAIL은 `GATES_PHASE2_ACCOUNT_ACCESS_P5_REVOCATION_FAIL_ROUTING.md`로 correction에 되돌렸다. 제공자 장애와 만료는 철회 교정·복구 뒤 각각 실행 직전 10분 유효 단일 사용 Cherry 승인이 필요하다.
- Dashboard registration: Package-driven Cherry Note/OUTCOME UI, GitHub connector Gate M15, fresh UX & Product QA Q1–Q4, separate fresh Release Audit A1–A4, Cherry acceptance C1–C2, stable snapshot host S1–S6, and registered Package portfolio foundation P1–P6 are evidence-closed.
- Phase 1 closure boundary: 2026-08-25 KST Cherry가 내부사용 Local MVP 종료를 승인했다. 외부 공개 수준 MVP와 release approval은 이 결정에 포함되지 않는다.
- Future roadmap visibility: Phase 2의 account access definition `K6 6/6`, provider-neutral disabled implementation `I1-I8 8/8`, prior fresh UX/Product re-QA `Q1-Q4 4/4`, prior Release re-Audit `A1-A4 4/4`, hosted-preview execution contract `H1-H6 6/6`, browser-viable public-redacted code readiness `B1-B12 12/12`, hosted-data 실행 사전준비 `E1-E8 8/8`, HP3 운영 활성화 결정 사전준비 `R1-R8 8/8`은 각각의 exact candidate 또는 문서 증거로 닫혔다. HP1 hosted identity는 `P1-P6 5/6`, P5는 `11/19 OPEN · DEFERRED`이며 HP2·HP3와 Phase 2 완료는 아니다. Phase 3은 Technical Spike `6/6`, Private Registry `6/6`, Observation Relay synthetic `5/6`, Planner routing `7/7`, Evidence continuity `6/6`, current Fresh QA `4/4`, current Release Audit `4/4`로 실행 Gate `38/43`이다. O2 실제 두 위치는 `OPEN/LOCKED`, production relay `NO_GO`, fallback은 `UNBOUND_MANUAL_NAVIGATION`이다. Cherry acceptance `C1-C4`와 Phase 3 completion remain open.
- `MVP_SCOPE_CLOSED`: true
- `EXTERNAL_OUTCOME_COMPLETE`: false
