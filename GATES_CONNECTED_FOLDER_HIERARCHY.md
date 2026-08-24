# OUTCOME 연결형 폴더 계층 Gate

목적: 현재 결과 지도 폼을 유지하면서 선택한 페이즈가 아래 계층으로 이어지고, 범위 → 스테이지의 하위 구조가 한눈에 읽히게 한다.

## F1 · 선택 페이즈 연결

- [x] 선택한 페이즈 탭이 아래 결과 지도와 시각적으로 연결된다.
- [x] 실제 현재 위치와 사용자가 선택한 탐색 위치의 의미 및 접근성 속성은 유지된다.
- [x] 상태를 색상 하나만으로 구분하지 않는다.

근거: 선택 탭의 중립 연결 목, 실제 현재 Radio/`aria-current`, 탐색 `aria-selected` 및 텍스트 설명을 분리 유지했다.

## F2 · 범위 → 스테이지 계층

- [x] 범위와 스테이지 목록은 단계별 들여쓰기와 연결선으로 하위 폴더 관계를 표현한다.
- [x] 선택된 가지가 가장 또렷하고 나머지 항목은 기존 정보 밀도를 유지한다.
- [x] Gate 상세는 추가 중첩 없이 기존의 평평한 상세 구조를 유지한다.

근거: 페이즈 10px, 범위 18px, 스테이지 26px 들여쓰기와 중립 레일/선택 가지 라임 연결선을 적용했다. Gate에는 장식 연결선을 추가하지 않았다.

## F3 · 상호작용과 접근성

- [x] 기존 페이즈·범위·스테이지 탐색 및 현재 단계 복귀 동작이 변하지 않는다.
- [x] 터치 대상 44px 이상, 키보드 탐색, 포커스 표시가 유지된다.
- [x] 장식 연결선은 스크린리더 의미 구조를 방해하지 않는다.

근거: 브라우저 전 계층 44회 탐색, 21개 스테이지 선택, 현재 단계 복귀, roving focus 및 focus contrast 13.60 이상 통과. 연결선은 CSS pseudo-element라 의미 트리에 추가되지 않는다.

## F4 · 회귀 검증

- [x] 프런트엔드와 Node 전체 테스트 및 production build가 통과한다.
- [x] 375×812, 390×844, 844×390, 1440×900에서 겹침·잘림·가로 overflow가 0이다.
- [x] 브라우저 검증이 선택 탭 연결, 단계별 들여쓰기, Gate 비중첩을 fail-closed로 확인한다.

근거: 프런트엔드 57 + Node 78 테스트, 브라우저 assertion 16 테스트, production/isolated build 통과. 네 viewport 모두 clipped/ellipsis/intersections/viewportEscape/documentOverflow 0.

## F5 · 공개 증거

- [x] `origin/main`의 exact commit/tree/asset이 공개 URL에 반영된다.
- [x] 공개 화면 GET 200, `/api/dashboard` mutation 405, public-boundary prohibited hit 0이다.
- [x] Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 별도 미결 경계로 남긴다.

근거: production alias `outcome-five.vercel.app`에서 page/API 200, mutation 24/24 405, API/HTML/bundle/rendered UI prohibited identifier 0 및 원격 desktop/mobile 전체 계층 검증 통과. 최종 Gate 영수증 commit 반영 후 exact receipt를 다시 고정한다.
