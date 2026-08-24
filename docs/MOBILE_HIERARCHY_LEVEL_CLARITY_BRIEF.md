# Mobile Hierarchy Level Clarity Brief

## Observed problem

Cherry의 390px 모바일 화면에서 상단 Phase 구조, `결과 지도 1/4`, 페이즈·범위·스테이지 탭과 페이즈 목록이 연속으로 보인다. 탭의 active state가 배경과 문구로 구분되지 않고 네 번째 완료 조건 탭도 없어, 사용자가 지금 페이즈 목록을 보는지 스테이지 목록을 보는지 즉시 판단하기 어렵다.

## Interaction correction

1. 머리글의 `1 / 4`를 `현재 탐색 · 페이즈 · 1/4`처럼 층위 이름과 함께 표시한다.
2. 모바일에 `페이즈 → 범위 → 스테이지 → 완료 조건` 네 탭을 항상 같은 순서로 표시한다.
3. active 탭은 라임 선과 배경 외에 `선택 중` 문구를 표시하고 `aria-current="step"`을 가진다.
4. 탭을 누르면 해당 층위 목록으로 이동한다. 기존 항목 선택 시 다음 층위로 자동 전진하는 동작은 유지한다.
5. 실제 현재 위치는 기존 current marker와 결과 지도 breadcrumb가 담당하고, 탭은 `현재 보고 있는 탐색 층위`만 표현한다.

## Preserve

- 한 화면에 하나의 결과 지도
- Phase 전체 구조와 진행 근거
- Project → Phase → Scope → Stage → Gate 의미
- 실제 현재 위치와 탐색 위치 분리
- 44px touch target, keyboard roving, reduced motion, dark contrast
- source-grounded 상태와 no invented percentage

## Non-goals

- 위계·Gate·진행 상태 변경
- 모바일 bottom navigation 신설
- URL deep-link 도입
- 계정 접근 K1-K6 결정 또는 구현
