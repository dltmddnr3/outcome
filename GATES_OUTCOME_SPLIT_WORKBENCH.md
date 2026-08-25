# OUTCOME Split Workbench Gate

## Outcome

현재 프로젝트 여정을 오른쪽 작업 영역으로 이동하고, 왼쪽에는 향후 세션 채팅을 위한 정직한 준비 영역을 둔다. 프로젝트 여정은 `Phase → Scope → Stage` 탐색에 집중하며 선택 Stage의 Gate 완료 조건은 세 열 아래의 접기 가능한 상세 영역에서 보여준다.

## Source boundary

- 현재 OUTCOME Package와 `/api/dashboard`가 제공하는 프로젝트·Phase·Scope·Stage·Gate 사실만 표시한다.
- 채팅 연결 전에는 입력창, 전송 버튼, 가짜 대화, 가짜 세션 활동을 만들지 않는다.
- 진행률·완료·현재 위치는 기존 source-grounded 의미를 바꾸거나 추론하지 않는다.
- Production, provider, database, DNS, domain, release 상태를 변경하지 않는다.

## Gates

### W1 · 작업대 배치

- [x] 데스크톱에서 왼쪽 채팅 준비 영역과 오른쪽 프로젝트 여정이 한 작업대 안에 나란히 배치된다.
  EVIDENCE: 1440×900 캡처에서 220px 채팅 열과 3열 프로젝트 여정이 같은 작업대 안에 나란히 표시됨.
- [x] 채팅 영역은 `연결 준비 중` 상태를 명시하고 동작하지 않는 가짜 입력 제어를 노출하지 않는다.
  EVIDENCE: 브라우저 assertion이 문구와 input, textarea, button, contenteditable 부재를 검증함.
- [x] 태블릿·모바일에서는 프로젝트 여정의 가용 폭을 해치지 않도록 채팅 준비 영역이 얇은 접기 행으로 바뀐다.
  EVIDENCE: 1179px 이하 단일 열 전환과 48px summary를 1024×768, 390×844, 360×800에서 검증함.

### W2 · 3단 탐색

- [x] 프로젝트 여정의 가로 탐색 열은 Phase, Scope, Stage 세 개뿐이다.
  EVIDENCE: 브라우저 assertion이 data-column 3개와 data-column=4 부재를 fail-closed 검증함.
- [x] 현재 위치와 사용자가 선택해 탐색 중인 위치의 의미는 기존과 동일하게 구분된다.
  EVIDENCE: currentSelectionDistinctionTruth와 explorationTruth가 모든 선택 순회에서 통과함.
- [x] 키보드 방향키, roving tabindex, 현재 단계 보기 동작이 유지된다.
  EVIDENCE: roving, keyboard focus contrast, current-stage-return 검사가 6개 뷰포트에서 통과함.

### W3 · 완료 조건 배치

- [x] 선택 Stage의 Gate 완료 조건은 세 탐색 열 아래 전체 폭에 배치된다.
  EVIDENCE: gateDetailsTruth가 Gate가 .oc-map-columns 밖이면서 프로젝트 여정 전체 폭인지 검증함.
- [x] 완료 조건 영역은 접고 펼칠 수 있으며 요약 행만으로 선택 Stage, 상태, 확인 수를 알 수 있다.
  EVIDENCE: 브라우저가 default-open 상태와 summary 클릭 접기, 재클릭 펼치기 및 제목, 상태, 수량을 검증함.
- [x] Stage 선택 변경 시 Gate 제목·목적·수량·남은 조건·그룹 근거가 같은 source data로 갱신된다.
  EVIDENCE: 3프로젝트의 모든 Stage 선택 순회에서 gateCountTruth, groupTruth, sourceGroup occurrence가 통과함.

### W4 · 시각 규칙

- [x] 작업대 외곽 반경, 내부 구분선, 버튼 반경이 각각 하나의 일관된 토큰을 사용한다.
  EVIDENCE: 작업대 var(--oc-radius-lg), 내부 var(--oc-rule), 기존 control radius token을 사용함.
- [x] Phase·Scope·Stage 헤더와 항목의 높이·패딩·아이콘 열이 서로 정렬된다.
  EVIDENCE: 공통 48px header, 56px option과 동일 grid icon columns를 적용하고 clipping 0을 측정함.
- [x] 한글 제목은 음절 중간에서 깨지지 않으며 좁은 폭에서는 의도한 2줄 제한 또는 말줄임 규칙을 따른다.
  EVIDENCE: keep-all과 overflow-wrap 규칙 및 phaseOptionTitlesFull 검사가 전 뷰포트에서 통과함.
- [x] 중첩 박스 그림자와 이중 테두리 없이 평평한 정보 계층을 유지한다.
  EVIDENCE: 작업대 단일 외곽선, 내부 hairline, box-shadow none을 캡처와 refined surface 검사로 확인함.

### W5 · 반응형·회귀

- [x] 1440×900, 1024×768, 390×844, 360×800에서 문서 가로 overflow와 요소 겹침이 0이다.
  EVIDENCE: 지정 4개와 추가 375×812, 844×390 모두 documentOverflow=0, intersections=0임.
- [x] 모바일 탐색은 Phase·Scope·Stage 3탭이며 활성 탭과 실제 현재 위치가 혼동되지 않는다.
  EVIDENCE: mobileHierarchyTruth가 정확한 3탭, aria-current=step, 선택 중 표식, 스테이지 3/3을 검증함.
- [x] 기존 데이터 계약, 프로젝트 전환, 사이드바, 기술 증거, 현재 단계 복귀 동작이 회귀하지 않는다.
  EVIDENCE: 3프로젝트 전환, sidebar contract, technicalEvidence, current-stage-return 순회가 통과함.
- [x] frontend, Node, browser assertion, production build가 통과한다.
  EVIDENCE: frontend 76, Node 109, security 28, browser assertion 18과 6뷰포트, build:isolated 통과.

## Evidence

- 구조: `.oc-workbench` 안에 제어 없는 `세션 채팅 · 연결 준비 중` details와 `.oc-map-workspace`를 배치했다. 프로젝트 여정은 `data-column=1..3`만 유지하며 Gate details는 열 밖 전체 폭에 있다.
- 상호작용: Gate details는 최초 1회 열림 상태로 초기화되고 이후 네이티브 summary로 접기·다시 펼치기가 가능하다. Stage 선택 뒤 모바일 층위는 `스테이지 · 3/3`에 머문다.
- 브라우저: repository-contained 3-project fixture에서 1440×900, 1024×768, 390×844, 360×800, 375×812, 844×390을 순회했다. 모든 뷰포트에서 `documentOverflow=0`, `intersections=0`, `clipped=0`, `viewportEscape=0`, controls ≥44px, text ≥11px였다.
- 시각 점검: `.outcome-runtime/split-workbench-screenshots/desktop-1440x900.png`, `.outcome-runtime/split-workbench-screenshots/mobile-390x844.png`를 원본 해상도로 확인했다. 데스크톱은 좌우 작업대, 모바일은 접기 행과 3탭·하단 Gate를 유지한다.
- 회귀: `npm test`는 frontend 76 + Node 109 통과, `npm run test:security`는 28 통과와 snapshot/client-env boundary 통과, `npm run test:browser`는 assertion 18 및 6개 뷰포트 통과, `npm run build:isolated`는 production bundle 생성 통과.

## Closure boundary

이 Gate 통과는 Preview 후보의 UI 구조 검증일 뿐 Production 배포, 외부 공개 MVP 승인, Cherry acceptance, release approval 또는 외부 outcome 완료를 의미하지 않는다.
