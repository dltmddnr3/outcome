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
        title: 계정 기반 접근
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
            purpose: Cherry 승인 아래 클러크 개발 인증과 버셀 미리보기에서 구글·이메일·연결된 애플 로그인과 로그아웃을 직접 검증한다.
            depends_on: [outcome-stage-account-access-hosted-preview-code-readiness]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_PREVIEW.md#P1-P6
            gate_groups:
              - code: P
                primary_label: 개발 인증 직접 검수
          - id: outcome-stage-account-access-hosted-data-preview
            title: 호스팅 데이터 격리 검증
            purpose: 별도 승인된 격리 수파베이스 미리보기에서 합성 패키지 데이터, 실제 행 단위 접근 제어, 생명주기와 복원을 검증한다.
            depends_on: [outcome-stage-account-access-hosted-identity-preview]
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
            title: Cherry 최종 승인
            purpose: 두 독립 검증을 통과해 정확히 고정된 후보를 Cherry가 맥북과 모바일에서 직접 판정한다.
            depends_on: [outcome-stage-account-access-hosted-preview-release-audit]
            gates_file: GATES_PHASE2_ACCOUNT_ACCESS_CHERRY_ACCEPTANCE.md#C1-C4
            gate_groups:
              - code: C
                primary_label: Cherry 실제 사용 승인

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

- Current: `outcome-phase-2 / outcome-phase-2-account-service / outcome-stage-account-access-hosted-preview-code-readiness · HP1 identity runtime separation correction`
- Next: `B9 · identity-only runtime separation`; 현재 Vercel 진입점이 수파베이스 없는 HP1 인증 실행기를 선택하지 못하는 구조 불일치를 먼저 닫고 Parent가 `IDENTITY_CODE_READY_ONLY`를 검증하기 전에는 HP1 외부 변경 승인을 실행하지 않는다.
- Dashboard registration: Package-driven Cherry Note/OUTCOME UI, GitHub connector Gate M15, fresh UX & Product QA Q1–Q4, separate fresh Release Audit A1–A4, Cherry acceptance C1–C2, stable snapshot host S1–S6, and registered Package portfolio foundation P1–P6 are evidence-closed.
- Phase 1 closure boundary: 2026-08-25 KST Cherry가 내부사용 Local MVP 종료를 승인했다. 외부 공개 수준 MVP와 release approval은 이 결정에 포함되지 않는다.
- Future roadmap visibility: Phase 2의 account access definition `K6 6/6`, provider-neutral disabled implementation `I1-I8 8/8`, prior fresh UX/Product re-QA `Q1-Q4 4/4`, prior Release re-Audit `A1-A4 4/4`, hosted-preview execution contract `H1-H6 6/6`과 초기 HP0 code readiness `B1-B8 8/8`은 각각의 exact candidate 증거로 닫혔다. 사전 점검에서 HP1 인증 경계가 HP2 수파베이스 계약과 결합된 사실이 확인되어 B9-B12 `0/4`가 현재 보정 경계다. HP1 hosted identity `P1-P6 0/6`, HP2 hosted data `D1-D7 0/7`, hosted fresh QA `Q1-Q4 0/4`, hosted fresh Audit `A1-A4 0/4`, Cherry acceptance `C1-C4 0/4`는 locked/open이다. 이전 disabled candidate의 QA/Audit은 이후 후보 C1에 재사용하지 않는다. HP3 production enablement, Phase 2 전체, Phase 4와 5는 완료가 아니며 Phase 3은 `Definition Pending`이다.
- `MVP_SCOPE_CLOSED`: true
- `EXTERNAL_OUTCOME_COMPLETE`: false
