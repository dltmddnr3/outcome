# OUTCOME Stage 8 C1 정보 구조 리뉴얼 Gate

Outcome: 기존 기능과 source truth를 보존하면서 초안의 강한 정렬축과 낮은 시각 복잡도를 회복해, Cherry가 프로젝트·현재 역할·Phase/Scope/Stage/Gate 위치와 선택 Stage 상세를 한눈에 이해한다.

Authority: Cherry의 2026-08-24 세 이미지 비교 피드백과 `docs/STAGE8_C1_INFORMATION_ARCHITECTURE_RENEWAL_BRIEF.md`. 구현 엔진은 최대 `gpt-5.6-sol · medium`; 디자인 판단은 구현과 분리된 fresh Claude UX critique를 먼저 거친다. C1·C2, V11, R11, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 계속 열어둔다. `false_completion_count=13`을 보존한다.

- [x] I1: 세 이미지와 현재 공개 화면을 비교한 정보 구조 결정문이 초안의 강점, 현재 화면의 실패 원인, 유지·축소·재배치 항목을 구체적으로 고정한다.
  PROVES: design_before_implementation
  EVIDENCE: fresh Claude Opus 5 high visual-design session `ef3213b4-e2bd-4666-b455-4252b7fdf91a`이 세 이미지·현재 공개 UI·source/CSS·Planner 초안을 독립 비교해 `DESIGN_BRIEF_NEEDS_REVISION`을 판정했다. 단일 Gate gauge, flat hierarchy band, 300px master-detail, compact role rows, vertical mobile rail, no-slop 금지 목록을 이 Brief에 반영했다.
- [x] I2: 역할 세션 영역을 네 개의 큰 카드에서 프로젝트명 아래 네 역할 행으로 축소하고, 역할명·연결 상태·활성 여부만 최소 신호로 표시한다.
  PROVES: compact_role_activity
  CHECK: npm run test:dashboard -- --testNamePattern='역할 세션은 네 개의 간결한 행과 단일 활성 신호로 표시한다'
  EXPECT: exactly four 44-56px role rows; at most one active animation; no role card grid; no Stage ID/history text
  EVIDENCE: frontend red-first/green 및 browser 72/72에서 role rows 4개, 각 44px, primary Stage/history 0, live signal<=1. 기술 연결 근거는 마지막 접힌 disclosure로 이동했다. `docs/STAGE8_C1_INFORMATION_ARCHITECTURE_RENEWAL_EVIDENCE.md`.
- [x] I3: 현재 원본 흐름을 네 개의 중첩 카드가 아닌 하나의 통합 진행 surface로 재구성해 Phase → Scope → Stage → Gate의 현재 위치와 다음 경계를 한 시선 경로에서 읽게 한다.
  PROVES: unified_hierarchy_flow
  CHECK: npm run test:dashboard -- --testNamePattern='현재 원본 흐름은 하나의 통합 진행 surface로 유지된다'
  EXPECT: one primary flow container; Phase/Scope/Stage placement and four level meanings remain without nested cards; Gate fraction/gauge is not duplicated outside Hero
  EVIDENCE: browser 72/72에서 one `.oc-flow-levels`, 네 row left/width delta 0.00/0.00px, nested child card/taper 0, Phase/Scope/Stage placement summary와 네 목적 문장 PASS. Gate aggregate gauge는 Hero 한 곳뿐이다.
- [x] I4: Scope journey는 초안의 수평 line/node rail과 현재 교정된 continuous connector를 유지하며 완료·현재·대기를 아이콘·형태·한글 text로 구분한다.
  PROVES: prototype_scope_strength
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: desktop continuous horizontal rail; active wrapper transparent; connector gap<=1px; mobile vertical connected rail and no horizontal overflow
  EVIDENCE: desktop/landscape 36 states에서 horizontal connector max gap 0.00px, active wrapper background alpha 0/visible border 0; mobile/phone 36 states에서 vertical 2px connector, icon+한글 상태, overflow 0.
- [x] I5: Stage 탐색을 데스크톱에서 `좌측 고정 폭 세로 목록 / 우측 선택 상세` master-detail로 바꾸고, 클릭 시 우측만 갱신하며 실제 현재 Stage 위치는 변하지 않는다.
  PROVES: stage_master_detail
  CHECK: npm run test:dashboard -- --testNamePattern='작업 단계 목록 선택은 우측 상세만 바꾸고 실제 현재 위치를 유지한다'
  EXPECT: dynamic stage count; one selected row and one current row; listbox/option semantics with roving tabindex; no card grid; current/exploring distinction preserved
  EVIDENCE: desktop master 300px/gutter 24px, source options Cherry Note 10/OUTCOME 8, selected/current/tabstop 각각 1, aria-pressed 0. Up/Down/Home/End가 focus를 list에 유지했고 전수 선택 중 current signature 변화 0.
- [x] I6: 모바일에서는 Stage 목록 뒤 선택 상세로 자연스럽게 stack하고 390×844·375×812에서 가로 넘침·겹침·잘림 없이 선택 상태와 상세 맥락을 유지한다.
  PROVES: responsive_master_detail
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: no horizontal scroll; controls>=44; selected row and detail visible; document/visual/focus order matches; no CSS order reshuffling
  EVIDENCE: 1100px 미만 one-column list→detail DOM/focus order PASS. 390×844·375×812에서 horizontal overflow/intersection/clipping/ellipsis 0, controls>=44px.
- [x] I7: 프로젝트 Hero, NOW, current Stage Gate 분수·퍼센트·게이지, 시간/ETA truth, 다음 경계, 선택 상세, 기본 접힌 기술 증거를 보존하고 중복 설명만 축소한다.
  PROVES: functionality_and_truth_preservation
  CHECK: npm run test:dashboard -- --testNamePattern='정보 구조 리뉴얼은 핵심 source-grounded 기능을 보존한다'
  EXPECT: exactly one current Gate gauge in Hero when valid; no Hero-wide fill or selected-detail gauge; no aggregate progress; no fabricated elapsed/ETA; required regions remain
  EVIDENCE: valid Gate는 Hero 1 gauge/percent, 0/8은 empty 8px track+0%, unavailable/total0은 gauge/percent 0. Hero fill·detail progress bar 0; elapsed/ETA eligibility와 fallback unit/browser PASS; primary regions와 collapsed technical evidence 보존.
- [x] I8: 초안과 같은 넓은 정렬축·적은 경계·명확한 크기 대비를 사용하며, 불필요한 nested card·pill·kicker·glow·shadow를 추가하지 않는다.
  PROVES: visual_hierarchy_not_decoration
  EVIDENCE: visual inspection과 kill-ai-slop triage에서 outer radius 12/hairline/divider, flat role rows/flow/list, glow·halo·nested card·pill·kicker 추가 0. 기존 login/legacy `.cn-*`, semantic circle node, 브랜드 font는 의도된 범위로 유지했다.
- [x] I9: 1440×900, 390×844, 375×812, 844×390에서 2 projects × 18 Stages 전수 상태가 overflow/intersection/clipping/ellipsis/English/fallback 0, controls>=44, contrast>=4.5, sequential headings를 충족한다.
  PROVES: responsive_accessible_regression
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: 72/72 states and all geometry/accessibility checks pass
  EVIDENCE: browser harness 3/3 및 4 viewports × 18 Stages=72/72. clipped/intersections/viewportEscape/documentOverflow/ellipsis/unexpectedEnglish/translationFallback 0, controls>=44px, text>=11px, contrast>=4.5, one H1/sequential headings, focus contrast 14.83.
- [x] I10: frontend, Node, security, public boundary, mutation, scope, runbook, production build와 Git boundary가 통과한다.
  PROVES: regression_and_boundary
  CHECK: npm test && npm run test:security && npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: exit 0; prohibited=0; mutation 405; false_completion_count=13
  EVIDENCE: frontend 39, Node 64, security 16, browser harness 3, local public boundary prohibited=0, mutations 24/24=405, scope 17 paths, runbook/build/diff PASS. `false_completion_count=13` 보존.
- [ ] I11: exact public candidate에서 fresh independent UX & Product QA가 초안 대비 glanceability, 역할 축소, 통합 flow, master-detail, truth, desktop/mobile을 PASS한다.
  PROVES: fresh_independent_qa
  EVIDENCE: pending
- [ ] I12: fresh QA PASS 뒤 Cherry가 공개 화면을 직접 보고 C1 또는 추가 디테일을 결정한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: I11 Builder에게 공개 활성화와 독립 QA 판정 권한이 없으므로 Planner 활성화 뒤 fresh QA가 수행한다.
ABANDON: I12 Cherry의 실제 화면 사용과 명시적 결정 전용이다.
