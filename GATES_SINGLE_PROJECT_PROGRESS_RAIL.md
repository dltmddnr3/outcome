# OUTCOME 단일 프로젝트 진행 흐름 Gate

목적: 상단의 중복 페이즈 탐색을 제거하고, 왼쪽 페이즈 열을 유일한 탐색 위치로 유지하면서 상단은 Package 상태만 보여주는 하나의 연속 진행 흐름으로 정리한다.

## R1 · 역할 중복 제거

- [x] 상단에는 페이즈 선택 버튼·칸·카드가 없다.
  EVIDENCE: `.oc-structure-band`는 `role="img"`이며 내부 button/tablist/tab 수가 0이다.
- [x] 페이즈 선택은 결과 지도의 왼쪽 첫 열에서만 가능하다.
  EVIDENCE: 모든 `button[data-phase-id]`가 `.oc-map-phase` 내부인지 브라우저 검증한다.
- [x] 실제 현재 페이즈와 사용자가 선택한 페이즈의 구분은 유지된다.
  EVIDENCE: 왼쪽 option의 `aria-current`와 `aria-selected`, Radio marker 및 탐색 breadcrumb 검증이 통과했다.

EVIDENCE: 상단은 `role="img"`인 비대화형 rail이며 `button`, `tablist`, `tab`이 없다. 브라우저 검증은 `button[data-phase-id]` 전부가 `.oc-map-phase` 안에 있을 때만 통과한다.

## R2 · 단일 진행 흐름

- [x] 상단은 외곽선 하나 안의 연속된 진행 rail 하나로 표시된다.
  EVIDENCE: `.oc-project-progress-track` 수 1, segment 간격 1px 이하, source Phase 수 일치를 검증했다.
- [x] 전체 페이즈 수와 실제 현재 페이즈 위치가 텍스트로 함께 표시된다.
  EVIDENCE: 렌더링 문구 `현재 페이즈 1 / 5`와 source current index/total 일치를 검증했다.
- [x] 각 페이즈의 완료·일부 완료·현재·예정·정의 대기 상태만 사용하고 임의 퍼센트를 표시하지 않는다.
  EVIDENCE: rail `data-state`는 structural Phase model에서 오며 상단 visible text의 `%` 문자는 0이다.

EVIDENCE: `.oc-project-progress-track` 하나 안에 source Phase 수와 같은 연속 segment를 gap 없이 배치했다. 화면에는 `현재 페이즈 1 / 5`와 상태 milestone만 표시하며 `%` 문자는 없다.

## R3 · 기존 계층 보존

- [x] 왼쪽 페이즈 → 범위 → 스테이지 → 완료 조건 탐색이 그대로 동작한다.
  EVIDENCE: 프로젝트당 전체 계층 44회와 스테이지 21개 선택이 desktop/mobile에서 통과했다.
- [x] 범위·스테이지 연결선과 들여쓰기는 유지하고 Gate 상세은 평평하게 유지한다.
  EVIDENCE: 범위·스테이지 pseudo rail, 10/18/26px 들여쓰기, Gate pseudo 없음 검증이 통과했다.
- [x] 키보드 탐색, 현재 단계 복귀, 모바일 progressive drill-down이 유지된다.
  EVIDENCE: roving focus, 좌우/상하/Home/End, 현재 단계 복귀, 모바일 4층위와 focus contrast 13.60 이상 통과했다.

EVIDENCE: 네 viewport에서 프로젝트당 전체 계층 44회, 스테이지 21개 선택, 현재 단계 복귀, roving focus 및 focus contrast 13.60 이상 통과했다.

## R4 · 회귀 및 공개 증거

- [x] 프런트엔드·Node 전체 테스트와 production build가 통과한다.
  EVIDENCE: 프런트엔드 57 + Node 78, browser assertion 16, production/isolated build 통과.
- [x] 375×812, 390×844, 844×390, 1440×900에서 겹침·잘림·가로 overflow가 0이다.
  EVIDENCE: 네 viewport에서 clipped/ellipsis/intersections/viewportEscape/documentOverflow 0.
- [x] 공개 고정 URL의 exact commit/tree/asset, GET 200, mutation 405, prohibited hit 0을 확인한다.
  EVIDENCE: production page/API 200, mutation 24/24 405, 공개 네 표면 prohibited identifier 0, exact receipt 일치.
- [x] Cherry acceptance와 외부 완료 판정은 별도 미결 경계로 남긴다.
  EVIDENCE: Stage 8 C1-C2, Cherry acceptance, release approval, MVP_SCOPE_CLOSED, EXTERNAL_OUTCOME_COMPLETE를 변경하지 않았다.

EVIDENCE: 프런트엔드 57 + Node 78, 브라우저 assertion 16, production/isolated build 통과. 네 로컬 viewport와 공개 desktop/mobile 모두 clipped/ellipsis/intersections/viewportEscape/documentOverflow 0. production page/API 200, mutation 24/24 405, API/HTML/bundle/rendered UI prohibited identifier 0. Gate 기록 commit 반영 뒤 exact receipt를 다시 고정한다.
