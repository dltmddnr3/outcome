# Stage 8 · Interactive Outcome Map Renewal Brief

## 한 문장 결정

OUTCOME의 핵심 화면을 `프로젝트 Hero + 하나의 focus+context Outcome Map column browser + 접힌 기술 증거`로 줄이고, 왼쪽에서 오른쪽으로 페이즈 → 범위 → 스테이지 → 완료 조건을 source 순서대로 탐색한다.

## 세 이미지에서 유지할 것

- 이미지 1: OUTCOME wordmark, 짧은 목적, freshness와 refresh가 한 줄에 잡히는 프로젝트 orientation.
- 이미지 2: Cherry Note logo/name, 실제 실행 신호, 왼쪽에서 오른쪽으로 흐르는 source-grounded lime treatment.
- 이미지 3: NOW는 문장과 시간 카드를 제거해 한 줄 상태로 줄이고, 역할 4개는 역할명/상태만 남긴다.

## 현재 화면에서 제거·통합할 것

- Hero의 `현재 작업 단계`, `다음 경계`, `현재 작업 단계 완료 조건` 블록 제거.
- 별도 `NOW + 역할 카드` band 제거. Hero 우측의 네 compact role rows로 통합.
- 별도 `현재 원본 흐름`, `현재 작업 단계`, `작업 단계 탐색` surface 제거.
- 위 세 영역의 의미를 하나의 `Outcome Map` surface 안에 재배치.
- 서버 build pin, GitHub, binding history, axes는 마지막 접힌 기술 증거에만 유지.

## Hero 계약

Desktop은 `project identity 1fr / live + roles 320px` 2열이다.

- 왼쪽: 로고, 프로젝트명, 최대 두 줄 목적, NOW 한 줄.
- 오른쪽: freshness/실행 상태, refresh, Planner·Builder·UX & Product QA·Release Audit의 역할명과 상태만 4행.
- 제거: Gate closed/total, 다음 경계, timing/ETA, session activity 본문, raw slug/ID/history.
- 실제 current breadcrumb는 Outcome Map header가 단독 소유한다.
- Mobile DOM 순서: project identity → freshness/refresh → NOW → role rows → structure band.

## 구조 진행 그라데이션 계약

`진행률 퍼센트`가 아니라 `source-grounded structural placement`다. 전체 Stage를 일렬로 flatten하지 않는다.

1. top level은 source-defined Phase마다 동일한 categorical compartment를 가진다. OUTCOME은 Stage 유무와 관계없이 Phase 5개가 모두 보인다.
2. 각 Phase 내부를 source Scope 수로 나누고, Stage가 정의된 Scope만 discrete Stage cell을 가진다.
3. evidence-closed `complete` Stage cell만 lime으로 표시한다.
4. 실제 current Stage는 partial fill로 추정하지 않고 2px marker와 shape로 표시한다.
5. Stage가 없는 Scope는 neutral hatch와 `스테이지 정의 대기`, 목적도 미정인 Phase는 `목적 정의 대기`로 표시한다.
6. queued/locked/pending/source-conflict는 서로 다른 neutral shape와 한글 상태를 사용한다.
7. `정의된 스테이지 · 완료 근거 · 현재 · 스테이지 미정의 페이즈`의 상태 inventory만 표시할 수 있다. time/effort/velocity percent는 표시하지 않는다.
8. 탐색 selection을 바꿔도 band signature는 변하지 않는다.

## Interactive Outcome Map

하나의 outer border와 하나의 배경만 사용한다. 내부는 divider와 spacing으로 구분하고 nested card는 만들지 않는다.

Desktop의 기본 패턴은 손그림의 literal 4등분이 아니라 `focus+context column browser`다. 상위 맥락은 좁고 안정적으로, 현재 작업과 완료 조건은 넓게 배분한다.

```text
┌ 실제 current / 선택 탐색 경로 ─────────────────────────────────────┐
│ 페이즈 200 │ 범위 240 │ 스테이지 300 │ 완료 조건 flexible 420+     │
│ Phase 1    │ Scope 1  │ Stage 1      │ 선택 Stage 목적             │
│ Phase 2    │ Scope 2  │ Stage 2      │ closed / total               │
│ Phase 3    │ Scope 3  │ Stage 3      │ 남은 조건 / source group     │
│ Phase 4    │          │ … Stage 33   │                               │
│ Phase 5    │          │              │                               │
└──────────────────────────────────────────────────────────────────────┘
```

- 1440px viewport에서 max-width 1360px, gutter 40px, Map 전체 높이 608px다.
- Map header 64px, column header 48px, list viewport 496px다. Stage list만 필요한 경우 독립 vertical scroll한다.
- columns: `184px / 232px / 336px / minmax(360px, 1fr)`; gap 0, divider 1px.
- Phase row 56px, Scope row 56px, Stage row 52px.
- current path는 lime dot/left rule과 `현재` text, selected path는 neutral inset outline/background으로 분리한다. 선택을 lime glow로 표현하지 않는다.
- Map header는 실제 current breadcrumb를 항상 보이고, current와 다른 탐색일 때만 두 번째 줄에 `탐색 중` breadcrumb를 표시한다.

### 1. Phase column

- label은 `페이즈`로 통일한다. `큰 단계`를 사용하지 않는다.
- source-defined Phase 전체를 첫 column에 표시한다.
- 각 row: `Phase n`, primary title, `완료 / 진행 중 / 예정 / 정의 대기`, source-grounded evidence count.
- OUTCOME은 Phase 1–5를 표시한다. Phase 3은 source상 `정의 대기`다.
- 선택과 실제 current를 별도 visual/ARIA로 표시한다.

### 2. Scope column

- label은 `범위`로 유지한다.
- 선택 Phase 안의 Scope 전체와 `n개 범위` count를 두 번째 column에 표시한다.
- Scope row 선택 시 오른쪽 Stage와 Gate만 갱신한다.
- Stage가 없는 future Scope는 `작업 단계 정의 대기`를 명시한다.

### 3. Stage column

- label은 `스테이지`로 통일한다. `작업 단계`를 primary hierarchy label로 사용하지 않는다.
- 선택 Scope의 Stage를 세 번째 300px column에 source order로 표시한다.
- 12개를 넘고 current가 뒤쪽에 있으면 `완료된 스테이지 n개` disclosure로 이전 완료 branch를 압축하되, 선택한 historical Stage가 있으면 자동으로 펼친다.
- current와 selected가 다르면 Map header에 `탐색 중 · 실제 현재 위치 유지`를 표시한다.

### 4. Gate inspector

- 네 번째 flexible column 전체가 선택 Stage의 inspector다. Gate는 Stage의 child acceptance condition이며 journey sibling이 아니다.
- 실제 closed/total 또는 명시적 unavailable, purpose, dependency, remaining condition, source-labeled groups만 표시한다.
- current Gate summary, boundary copy, generic group aggregate, progress gauge를 다른 위치에 복제하지 않는다.

## Selection state

- project 변경: 실제 current Phase/Scope/Stage를 기본 선택.
- Phase 변경: 해당 Phase의 actual current Scope가 있으면 선택, 없으면 첫 source Scope. 오른쪽 columns만 갱신한다.
- Scope 변경: 해당 Scope의 actual current Stage가 있으면 선택, 없으면 첫 source Stage. Stage/Gate columns만 갱신한다.
- empty branch: selection은 branch에 머물고 definition-pending empty state를 표시.
- 탐색 상태는 local UI state일 뿐 Package/current/NOW/gradient를 mutate하지 않는다.

## 접근성

- Phase·Scope·Stage: 각각 이름 있는 `listbox/group/option`과 column별 exactly one roving tabindex.
- ArrowUp/Down과 Home/End는 column 내부 이동, ArrowRight는 선택 후 다음 child column, ArrowLeft는 parent column으로 focus를 이동한다.
- current에는 `aria-current=step`, selected에는 `aria-selected`를 별도로 적용.
- disclosure는 native `details/summary` 또는 `button aria-expanded/controls`; Gate inspector는 일반 document region이다.
- color 단독 금지: icon/shape/한글 상태 병행.

## Responsive geometry

- max-width 1360px; desktop gutter 36px; mobile 16px.
- Hero desktop min-height 144–164px, 기존 184px보다 축소.
- Map 내부 column gap 0, divider 1px, outer radius 12px 하나.
- `1100px 이상`: four-column browser. `760–1099px`: Phase/Scope 180px compact rails + active Stage/Gate stack. `760px 미만`: one-level-at-a-time drill-down.
- Mobile은 네 column을 길게 stack하지 않는다. sticky Map header에 `실제 current`와 structural band를 유지하고, selected breadcrumb, level `1/4–4/4`, Back 아래에 현재 level list 하나만 렌더링한다. row 선택 시 다음 level로 이동하며 breadcrumb에서 상위 level로 복귀한다.
- Mobile DOM/focus 순서: structural band → current breadcrumb → current level heading/list → Back/next transition → Gate inspector. document horizontal scroll은 만들지 않는다.

## 금지 목록

- 임의 aggregate project percentage, time-weighted progress, fabricated ETA/velocity.
- Hero-wide arbitrary smooth fill that hides Phase/Scope boundaries.
- nested cards, floating pills, role cards, glow/halo, animated width, decorative charts.
- raw Project/Phase/Scope/Stage IDs in primary UI.
- selection으로 실제 current state 변경.

## 자동 검증

- 두 프로젝트의 모든 Phase/Scope/Stage 선택 전수.
- OUTCOME Phase rows=5; 현재 Phase 1은 source truth대로 current, future Phase는 active로 오인되지 않음.
- Phase/Scope/Stage selection 중 current signature와 structural gradient signature 변화 0.
- generic empty branches fail closed; no crash/fallback English.
- one outer Map surface; desktop columns=4; old current-flow/current-stage/stage-explorer primary surfaces 0.
- desktop/mobile overflow, clipping, overlap, ellipsis 0; controls>=44; focus/contrast/reduced motion PASS.
