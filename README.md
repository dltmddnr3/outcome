# OUTCOME

OUTCOME은 여러 AI 작업이 **원하는 결과물에 실제로 도달하고 있는지**를 근거 기반으로 보여주는 독립 대시보드 제품입니다.

현재 저장소는 독립 프로젝트의 계약과 인계 문서를 먼저 고정한 상태입니다. MVP 대시보드 구현은 아직 `/Users/rosum/Documents/ChatGPT/WhiteCastle Desk 2`에 있으며, 검증된 추출 계획 없이 이 저장소로 복사하지 않습니다. 하나의 원본만 유지하기 위한 의도적인 경계입니다.

## 문서 읽는 순서

1. [Outcome Contract](docs/OUTCOME_CONTRACT.md)
2. [제품 진행 모델](docs/PRODUCT_MODEL.md)
3. [현재 상태](docs/CURRENT_STATE.md)
4. [근거와 원본](docs/SOURCE_OF_TRUTH.md)
5. [4개 세션 운영 모델](docs/OPERATING_MODEL.md)
6. [로드맵](docs/ROADMAP.md)
7. [문서 부트스트랩 Gate](GATES.md)

## 지금의 제품 경계

- 제품명: **OUTCOME**
- 형태: 로그인 없이 빠르게 여는 로컬 우선 독립 웹 대시보드
- MVP 데이터 대상: **Cherry Note 한 프로젝트**
- 핵심 뷰: Project → Phase → Scope → Stage의 진행 순서와 선택한 Stage의 Gate
- 핵심 원칙: 구현률, 테스트율, 증거 확정률, 사용자 수용을 섞어 하나의 임의 퍼센트로 만들지 않음
- 현재 경로: `http://127.0.0.1:5173/cherry-note-dashboard`

## 작업 시작 규칙

- Planner가 결과 계약과 정보 구조를 확정합니다.
- Builder만 제품 파일을 변경합니다.
- UX/Product QA와 Release Audit은 서로 다른 fresh Claude 세션에서 독립 수행합니다.
- Cherry의 실제 사용 수용 전에는 UI/UX 또는 최종 결과 도달을 완료로 선언하지 않습니다.
- 모든 실질 작업은 `karpathy-guidelines`와 비례적인 `unlazy` Gate를 사용합니다.

