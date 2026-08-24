# OUTCOME · Mobile Hierarchy Level Clarity Gates

Outcome: 모바일에서 사용자가 지금 보고 있는 목록이 페이즈·범위·스테이지·완료 조건 중 무엇인지 한눈에 구분하고, 프로젝트의 실제 현재 위치와 탐색 위치를 혼동하지 않는다.

- [x] L1: 결과 지도 머리글이 현재 탐색 층위 이름과 전체 4단계 중 위치를 함께 표시한다.
  PROVES: implementation
  EVIDENCE: 390px 실제 렌더에서 `현재 탐색 · 페이즈 · 1/4`와 `현재 탐색 · 스테이지 · 3/4`를 직접 확인했고 semantic/browser tests가 exact label을 검증한다.
- [x] L2: 모바일 탐색 탭은 페이즈·범위·스테이지·완료 조건 4개를 항상 같은 순서로 표시하고 현재 탭에 `aria-current="step"`과 보이는 `선택 중` 문구를 제공한다.
  PROVES: accessibility
  EVIDENCE: persistent four-tab DOM과 active-only `aria-current="step"`/`선택 중`을 semantic test와 browser assertion이 검증한다; fourth tab 또는 marker 제거 반례는 fail closed한다.
- [x] L3: 현재 탭은 라임 선·배경·문구로 구분되며 색만으로 상태를 전달하지 않고 모든 탭은 최소 44px 터치 영역을 유지한다.
  PROVES: ux_product_qa
  EVIDENCE: 390px 실제 시각 검수에서 active tab의 라임 3px 선·별도 배경·보이는 문구를 확인했고 automated geometry는 모든 탭 52px, text 11px, contrast 4.5 이상을 확인했다.
- [x] L4: 탭 이동과 항목 선택은 기존 progressive drill-down, 선택 identity, 실제 현재 위치 표시와 탐색 중 안내를 보존한다.
  PROVES: test
  EVIDENCE: browser traversal은 항목 선택 후 완료 조건 4/4 도달, 탭 역이동, actual current signature 불변, exploration 안내, roving keyboard와 선택 identity를 모든 프로젝트/Stage에서 검증했다.
- [x] L5: 390×844, 375×812, 844×390과 1440×900에서 영문 fallback·겹침·잘림·가로 넘침이 0이고 reduced motion·키보드·초점 계약이 유지된다.
  PROVES: test
  EVIDENCE: full local/stable/portfolio browser matrices PASS; 1440×900, 390×844, 375×812, 844×390에서 unexpected English, fallback, clipped, intersections, viewport/document overflow가 모두 0이고 reduced motion static=true다.
- [x] L6: exact candidate가 고정 공개 주소에서 commit/tree/asset receipt, GET 200, mutation 405와 동일한 모바일 층위 신호를 제공한다.
  PROVES: evidence
  EVIDENCE: production deployment `dpl_GMSodzPmqjQpM3A5ojHJK6tEEXd3`가 고정 주소에서 candidate `750ce6aff8c6` / tree `cb4abd072a0b` / asset `index-BicBEPAE.js`를 제공했다. Public desktop/mobile full hierarchy traversal PASS, GET 200, mutation 24/24=405, prohibited disclosure=0이며 Gate-close-only descendant도 동일 UI asset과 검사를 다시 통과해야 한다.

ABANDON: 위계 의미, Gate count, 프로젝트 진행 상태, 계정 Stage K1-K6, C1-C2와 release authority는 이 시각 교정으로 변경하지 않는다.
