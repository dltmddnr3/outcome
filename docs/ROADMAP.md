# OUTCOME Product Roadmap

Updated: 2026-08-23 KST

OUTCOME은 결과를 보여주는 대시보드에서 시작해 프로젝트 실행 환경과 목적 발견 시스템으로 확장합니다. 각 Phase는 이전 Phase의 source truth·Gate·독립 검증 경계를 보존하며 새 Outcome Contract 승인 후 시작합니다.

## Phase 1 · Cherry Note MVP와 프로젝트 전환 기반

Status: `ACTIVE`

목적: Cherry Note를 첫 실제 프로젝트로 사용해 OUTCOME의 위계, Gate, NOW, freshness, 원격 피드백 화면을 개발하고 검증합니다.

포함:

- Cherry Note를 첫 개발·검증 데이터로 사용
- `Project → Phase → Scope → Stage → Gate` outcome funnel
- 구현·테스트·증거확정·독립 QA·Cherry 수용 분리
- 프로젝트 전환 UI와 프로젝트별 상태 격리 기반
- OUTCOME Package parser 및 fail-closed validation
- 프로젝트별 Planner·Builder·UX & Product QA·Release Audit binding
- Mac Mini source collector와 인증된 MacBook/mobile read-only 피드백
- OUTCOME 자체 self-tracking

Phase 1의 프로젝트 전환 기능은 확장 가능한 구조까지 포함하지만 제품 의미와 검증은 Cherry Note를 1차 기준으로 삼습니다. OUTCOME self-tracking은 adapter 일반화 증거이며 제3 프로젝트 포트폴리오 완료를 뜻하지 않습니다.

종료 조건은 Stage 3–5 Builder evidence, fresh UX & Product QA, 별도 fresh Release Audit, Cherry의 실제 30초 이해 과업 수용입니다.

## Phase 2 · 공개 다중 프로젝트 계정 서비스

Status: `PLANNED · new Outcome Contract required`

목적: 개인 로컬 도구를 계정 기반 공개 서비스로 전환해 여러 프로젝트를 안전하게 조회하고 관리합니다.

포함:

- 공개 웹 서비스와 사용자 계정
- 프로젝트별 데이터 격리와 권한
- 여러 프로젝트 등록·전환·포트폴리오 현황
- OUTCOME, Cherry Note, Cherry Picker 등 서로 다른 프로젝트 adapter
- 다중 Mac/PC/CLI collector 연결
- durable database, cross-device sync, source connector registry
- 사용자별 알림·승인·incident history
- dev/staging/prod, migration, backup, restore, observability, 비용·용량 계약

비목표:

- OUTCOME 안에서 직접 프로젝트 생성
- OUTCOME 안에서 역할 세션 생성·업무 실행
- Codex/Claude 화면을 대체하는 통합 개발 환경

## Phase 3 · 연결된 프로젝트 운영과 Planner 자동 라우팅

Status: `RECOMMENDED · Cherry decision pending`

목적: Phase 2의 조회 중심 서비스와 Phase 4의 완전한 in-OUTCOME 개발 사이에서 이미 존재하는 프로젝트·세션을 안전하게 연결하고 Planner 중심으로 운영합니다.

추천 범위:

- 기존 프로젝트에 OUTCOME Package 설치·검증
- 기존 Planner·Builder·UX & Product QA·Release Audit 세션 연결
- 프로젝트별 현재/과거 session binding registry
- Cherry ↔ Planner 대화
- Planner가 승인된 Stage를 Builder에 전달
- immutable candidate 이후 QA → Release Audit 순차 라우팅
- approval inbox, blocker, retry, stale/unbound/replaced session 처리
- Codex/Claude 원본 세션으로 이동 가능한 trace와 handoff

비목표:

- OUTCOME이 새 프로젝트나 provider 세션을 직접 생성
- OUTCOME 내부에서 모든 코드 편집·터미널·artifact 작업 수행
- 자동 self-acceptance 또는 Cherry 승인 대행

Phase 3은 기존 외부 Codex/Claude 실행 화면을 유지하되 OUTCOME을 통제·관측·대화의 중심으로 만드는 브리지입니다.

## Phase 4 · OUTCOME-native 프로젝트 개발 환경

Status: `VISION · Phase 3 evidence required`

목적: Cherry가 Codex/Claude 화면으로 이동하지 않고 OUTCOME 안에서 프로젝트를 만들고 네 역할과 대화하며 전체 개발 흐름을 수행합니다.

포함:

- OUTCOME에서 신규 프로젝트 생성 및 초기 OUTCOME Package 생성
- Planner·Builder·UX & Product QA·Release Audit 네 역할 세션 생성
- provider 계정·모델·host/worktree의 안전한 binding
- 역할별·통합 채팅
- Stage/Gate 기반 작업 dispatch와 결과 수신
- 코드 diff, 테스트, artifact, candidate, QA/Audit 결과 확인
- 승인·재작업·rollback·release Gate
- Codex/Claude 원본 UI 없이도 완료 가능한 개발 workspace

필수 경계:

- 역할별 권한과 self-acceptance 금지
- immutable candidate와 independent QA/Audit
- credential·결제·보안·release에 대한 명시적 Cherry Gate
- provider 장애·세션 종료·host offline 시 fail-closed 복구

## Phase 5 · 목적 발견과 Outcome 설계 시스템

Status: `VISION · Question 200 product contract required`

목적: OUTCOME을 세션·개발 관리 도구보다 상위의 시스템으로 확장해, 사용자가 원하는 결과가 무엇인지 발견하고 명확한 목적지로 수렴한 뒤 프로젝트를 시작하게 합니다.

포함:

- 프로젝트 시작 전 아이디어·문제·대상 사용자 입력
- 기존 자료와 결정 회수 및 중복 제거
- MECE Question 200 기반 목적 발견 대화
- 보통 120–140개 전에 공백이 사라지면 조기 종료, 최대 200개
- 문제, 사용자, Outcome, scope, non-goal, acceptance 수렴
- 정상·실패·복구, 데이터·API·보안·운영·비용 계약 수렴
- 미결정·가정·기술 실사 필요 항목 분리
- 승인된 결과에서 OUTCOME Contract·Map·Gates 자동 초안 생성
- Cherry 승인 후 Phase 4의 프로젝트·네 역할 생성으로 연결
- 진행 중 outcome drift 감지와 재질문·재계약

Question 200은 고정 설문이 아니라 제품 공백을 제거하는 감사입니다. 사용자가 원하는 것을 충분히 이해하기 전에 세션 생성이나 구현을 시작하지 않습니다.

## 장기 상태 전이

```text
Phase 1 · 정확히 보인다
→ Phase 2 · 어디서든 여러 프로젝트를 본다
→ Phase 3 · 기존 프로젝트와 역할을 연결해 운영한다
→ Phase 4 · OUTCOME 안에서 프로젝트를 만들고 개발한다
→ Phase 5 · 원하는 결과를 발견하고 프로젝트를 시작한다
```

어떤 Phase도 문서·빌드·활동량만으로 종료하지 않습니다. 해당 Phase의 실제 사용자 Outcome, independent QA/Audit, Cherry acceptance가 모두 증명돼야 다음 Outcome Contract로 이동합니다.
