# OUTCOME

OUTCOME은 여러 AI 작업이 **원하는 결과물에 실제로 도달하고 있는지**를 근거 기반으로 보여주는 독립 대시보드 제품입니다.

신규 프로젝트의 표준 등록 묶음은 **OUTCOME Package**이며 `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md`, `GATES*.md`로 구성됩니다. GitHub는 기본 지원하는 선택적 delivery-evidence connector이고, 역할별 session binding과 credentials는 OUTCOME runtime이 별도로 관리합니다.

이 저장소가 OUTCOME dashboard의 intended product source입니다. Stage 3 local candidate에는 standalone UI, Cherry Note collector, authenticated read-only runtime, tests, styles, package, private HTTPS runbook이 있습니다. 이전 WhiteCastle Desk copy는 migration history/rollback reference일 뿐 새 제품 변경의 원본이 아닙니다.

## 문서 읽는 순서

1. [Outcome Contract](docs/OUTCOME_CONTRACT.md)
2. [OUTCOME Map](docs/OUTCOME_MAP.md)
3. [제품 진행 모델](docs/PRODUCT_MODEL.md)
4. [현재 상태](docs/CURRENT_STATE.md)
5. [근거와 원본](docs/SOURCE_OF_TRUTH.md)
6. [4개 세션 운영 모델](docs/OPERATING_MODEL.md)
7. [로드맵](docs/ROADMAP.md)
8. [문서·운영 Gate](GATES.md)
9. [Local MVP delivery Gate](GATES_OUTCOME_MVP.md)

## 지금의 제품 경계

- 제품명: **OUTCOME**
- 형태: 로컬 우선 독립 웹 대시보드 + Cherry-approved public read-only remote candidate
- MVP 데이터 대상: **Cherry Note와 OUTCOME**
- 핵심 뷰: Project → Phase → Scope → Stage의 진행 순서와 선택한 Stage의 Gate
- 핵심 원칙: 구현률, 테스트율, 증거 확정률, 사용자 수용을 섞어 하나의 임의 퍼센트로 만들지 않음
- 현재 로컬 경로: `http://127.0.0.1:8787/cherry-note-dashboard`
- Remote activation: temporary Cloudflare Quick Tunnel active; random URL/restart/no-SLA limits apply

## 작업 시작 규칙

- Planner가 결과 계약과 정보 구조를 확정합니다.
- Builder만 제품 파일을 변경합니다.
- UX/Product QA와 Release Audit은 서로 다른 fresh Claude 세션에서 독립 수행합니다.
- Cherry의 실제 사용 수용 전에는 UI/UX 또는 최종 결과 도달을 완료로 선언하지 않습니다.
- 모든 실질 작업은 `karpathy-guidelines`와 비례적인 `unlazy` Gate를 사용합니다.
