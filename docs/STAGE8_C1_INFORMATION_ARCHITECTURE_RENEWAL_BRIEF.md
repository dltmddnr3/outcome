# OUTCOME Stage 8 C1 정보 구조 리뉴얼 Brief

관측일: 2026-08-24 KST

## 결론

초안이 더 좋은 이유는 정보가 적어서가 아니라, 각 정보가 한 번만 등장하고 같은 정렬축에 놓이기 때문이다. 현재 화면은 source hierarchy를 정확히 표현하려다 각 level을 큰 중첩 카드로 만들면서, 사용자가 읽어야 할 순서보다 컨테이너 형태가 먼저 보인다. 이번 리뉴얼은 기능 추가가 아니라 정보 구조의 평면화와 정렬 회복이다.

Fresh design critique: Claude Opus 5 high session `ef3213b4-e2bd-4666-b455-4252b7fdf91a`이 세 reference, current public desktop/mobile, source/CSS와 이 Brief를 read-only로 독립 검토했다. 초기 초안은 Gate 중복 위치, Stage rail 중복, master-detail breakpoint와 focus semantics가 불충분해 `DESIGN_BRIEF_NEEDS_REVISION`이었다. 아래 내용은 그 교정을 반영한 Builder-ready 계약이다.

## 세 이미지에서 채택할 것

### 이미지 1 · 역할 활성화

- 프로젝트명 아래 `Planner / Builder / UX & Product QA / Release Audit` 네 행.
- 각 행은 역할명, 짧은 연결 상태, 활성 dot 또는 최소 motion만 가진다.
- 큰 카드, 긴 stage ID, history count는 기본 화면에서 제거하고 필요하면 기술 증거에 둔다.
- active+fresh 역할만 한 개의 live 신호를 갖고, 나머지는 정적 상태다.

### 이미지 2 · 현재 문제

- Phase·Scope·Stage·Gate를 폭이 점점 좁아지는 네 큰 카드로 표현하지 않는다.
- 각 level의 장문 목적을 한꺼번에 노출해 흐름을 끊지 않는다.
- 네 level은 정확히 유지하되 하나의 통합 surface 안에서 동일한 시작축과 일정한 간격으로 읽힌다.

### 이미지 3 · 초안에서 복원할 디자인 DNA

- 프로젝트 Hero가 첫 번째 강한 덩어리다.
- `Outcome / NOW`는 같은 수평 band에서 프로젝트 의미와 현재 활동을 연결한다.
- 현재 Stage Gate 진행은 Project Hero 우측에 정확히 한 개의 대표 gauge로 유지한다. 구현·테스트·증거를 임의로 같은 분모의 별도 퍼센트로 만들지 않는다.
- Scope journey는 full-width line/node rail로 유지한다.
- 넓은 padding, 적은 border, 한 번에 한 개의 강조, 낮은 radius를 사용한다.

## 확정 정보 구조

1. 프로젝트 전환 navigation.
2. Project Hero: 프로젝트명, Outcome, 현재 Stage, 보조선의 Phase·Scope, 다음 경계, Gate 분수·퍼센트·gauge, freshness/새로고침.
   - current Stage Gate의 분수·퍼센트·gauge는 Hero 우측 블록에 정확히 한 번만 렌더한다.
   - Hero 전체 배경을 Gate 비율로 채우지 않는다.
   - Gate `total>0, closed=0`이면 `0/n · 0%`와 빈 track을 표시한다.
   - unavailable 또는 total=0이면 track과 `%`를 렌더하지 않고 `완료 조건 근거 없음`을 표시한다.
3. NOW + 역할 활성화: 왼쪽 NOW 요약, 오른쪽 네 역할의 compact vertical rows. 모바일은 NOW 다음에 역할 목록.
4. 현재 원본 흐름: 하나의 surface 안에 Phase → Scope → Stage → Gate를 동일 정렬축으로 표시.
   - 상단: `큰 단계 i/n · 범위 i/n · 작업 단계 i/n` compact summary. 완료 조건 분수는 Hero에서만 표시한다.
   - 본문: 현재 level 이름과 한 줄 목적. 목적 전문은 중복 노출하지 않고 필요 시 상세/기술 근거에서 확인.
   - 중앙: current Phase의 Scope journey rail.
   - current Scope 내부의 별도 Stage rail은 제거한다. Stage 위치는 `작업 단계 i/n`과 master list로 표현한다.
   - Gate row는 `완료 조건 · 현재 작업 단계 수용 기준`과 다음 경계 의미 문장만 표시한다. 분수·퍼센트·gauge·반복 checklist를 넣지 않는다.
5. 작업 단계 탐색: desktop master-detail.
   - 1100px 이상에서 좌측 정확히 300px / 24px gutter / 우측 detail. 그 아래에서는 목록→상세 순서로 stack한다.
   - 좌측: Scope group heading 아래 모든 Stage를 세로 행으로 나열. 프로젝트 데이터의 실제 개수를 그대로 사용한다.
   - 각 행: index, 한글 Stage명, 상태 icon/text. 최소 높이 56px, 13px title 최대 두 줄, ellipsis 없음. 카드처럼 떠 있지 않고 divider 기반 목록.
   - 우측: 선택 Stage 상세, 목적, 의존성, Gate group/조건, 탐색 중 표기.
   - 선택 변경은 우측 상세만 바꾸고 실제 current hierarchy와 Hero/Gate 진행은 바꾸지 않는다.
   - current=selected이면 `현재 작업 단계 상세`이며 탐색 중 표기를 숨긴다. 다르면 `탐색 중 · 실제 현재 위치는 {Stage명} 유지`를 detail 최상단에 표시한다.
   - listbox/option + aria-selected + aria-current=step을 사용하고 aria-pressed를 제거한다. roving tabindex로 정확히 한 option만 Tab stop이며 Up/Down/Home/End를 지원한다.
   - keyboard focus는 list에 남긴 채 detail을 갱신한다. `aria-live=polite`는 선택 제목과 탐색 상태에만 제한한다.
6. 기술 증거: 기존처럼 기본 접힘, 마지막.

## 시각 규칙

- charcoal background와 lime accent를 유지한다.
- lime은 current, complete connector, current Stage Gate fill, active role에만 쓴다.
- 역할 활성화 motion과 현재 의미 motion을 합쳐 반복 semantic animation은 최대 2개다.
- border는 section boundary와 selected/current state에만 사용한다.
- 중첩 카드 대신 divider, whitespace, type scale로 hierarchy를 만든다.
- labels는 한글 우선, 내부 code/session ID/receipt는 기술 증거로 내린다.
- 프로젝트 overall progress는 만들지 않는다. 퍼센트는 current Stage Gate closed/total에서만 계산한다.
- 경과 시간과 ETA는 기존 source-grounded eligibility/fallback 계약을 그대로 유지한다.
- content max-width 1360px, desktop gutter 32–40px, tablet 20px, mobile 16px.
- section gap 24px, related internal gap 8–12px, outer radius 12px, row radius 0–8px.
- Hero columns `minmax(0,1fr) 260px`, min-height 184px, padding 24px.
- NOW/roles desktop ratio 62/38, 하나의 divider만 사용한다.
- role row height 44px. 역할명·연결 상태·활성 신호만 남기고 Stage/session/history/receipt는 기술 증거로 이동한다.
- Scope rail node 22px, connector 2px, equal-width segments. Mobile은 2열 grid가 아니라 vertical connected rail이다.
- H1 30/1.08/700, Outcome 15/1.55/400, section 17/1.3/700, Gate value 20/1.2/700, row 13/1.4/600, body 13/1.55/400, metadata 11/1.4/600–700.
- global 11px `!important` type flattening을 제거한다.
- Gate track은 8px flat track이며 border, glow, halo가 없다.

## 유지·축소·재배치

| 현재 요소 | 결정 | 새 위치/형태 |
|---|---|---|
| Project Hero | 유지·강화 | 초안처럼 첫 강한 container |
| NOW | 유지 | 역할 목록과 하나의 band |
| 4 role cards | 축소 | 네 개의 vertical rows |
| nested Phase/Scope/Stage/Gate cards | 제거 | 하나의 통합 flow surface |
| Scope rail | 유지·강화 | full-width continuous journey |
| Stage card grid | 제거 | 좌측 vertical list |
| selected Stage detail | 유지 | 우측 detail pane |
| Gate percentage/gauge | 유지 | Hero 우측의 대표 지표 한 곳 |
| elapsed/ETA | 유지 | 근거 있는 숫자 또는 정직한 fallback |
| technical evidence | 유지 | 마지막 기본 접힘 |

## 구현·검증 경계

- 디자인 critique가 이 Brief를 먼저 반증하고, Planner가 반영한 후에만 Builder가 구현한다.
- 구현 엔진은 `gpt-5.6-sol · medium`을 넘지 않는다.
- 새 dependency, Cherry Note iOS, Desk/auth/provider/Slack/relay 변경은 없다.
- `docs/ROADMAP 2.md`를 열거나 수정하거나 commit하지 않는다.
- public tunnel/hostname은 유지하고 candidate activation은 Planner가 수행한다.
- fresh UX & Product QA와 Cherry acceptance는 Builder와 분리한다.

## 채택하지 않는 초안 요소

- 구현/테스트/증거 세 개의 임의 57/57 progress bars.
- project-level 100% 인상, velocity/momentum/health/confidence score.
- Hero-wide progress tint.
- glow, halo, glass, backdrop blur, shimmer, pulsing card, animated counter.
- 두 번째 gauge, selected detail progress bar, Stage card grid, horizontally scrolling Stage strip.
- English kicker와 raw technical identifier의 primary content 노출.

## 자동 검증 계약

1. 1100px 이상 explorer가 `300px + 24px + detail`, 미만은 one column.
2. valid current Gate일 때 gauge와 `%`는 Hero에 정확히 1개, unavailable이면 0개.
3. Hero fill과 selected-detail progress bar가 없다.
4. role row 4개, 각 44–56px, Stage ID/history text 없음, active+fresh 없으면 live signal 0.
5. Stage option 수가 source Stage 수와 같고 selected 1, current 1.
6. explorer Tab stop 1, aria-pressed 0, listbox/option/aria-selected/aria-current semantics.
7. non-current Stage 전수 선택 후 Hero, current flow, current Gate, current Stage ID 불변.
8. exploration 문구는 selected≠current일 때만 나오며 실제 current Stage명을 포함.
9. four flow rows의 left edge와 width 차이 1px 이하; tapering width와 nested child card 없음.
10. desktop Scope connector gap 1px 이하; mobile vertical connected rail; ellipsis/overflow 0.
11. ineligible elapsed/ETA exact fallback과 fabricated duration 0.
12. 4 viewports × 2 projects × 18 selected Stages = 72 state regression, controls>=44, contrast>=4.5, one H1, sequential headings, English/fallback 0.

## Cherry 30초 확인 과제

- 과제 1: 프로젝트, 현재 Phase/Scope/Stage, 다음 경계, current Stage Gate closed/total을 찾고 해당 퍼센트가 project progress가 아님을 설명한다.
- 과제 2: 과거 Stage 하나를 선택해 목적과 남은 조건을 말한 뒤, 실제 current Stage는 변하지 않았음을 정확히 말한다. selected와 current를 혼동하면 실패다.
