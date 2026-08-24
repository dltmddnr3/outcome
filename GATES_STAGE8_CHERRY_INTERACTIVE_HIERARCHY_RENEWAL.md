# OUTCOME Stage 8 · Cherry Interactive Hierarchy Renewal Gate

Outcome: Cherry가 하나의 큰 Outcome Map 안에서 전체 Phase를 보고, Phase → Scope → Stage → Gate를 직접 선택하며 과거·현재·예정을 오해 없이 탐색한다. Hero는 프로젝트 정체성과 source-grounded 구조 진행만 남기고, 현재 실제 위치는 탐색 선택과 분리한다.

Authority: Cherry의 2026-08-24 세 이미지 기반 피드백과 `docs/STAGE8_CHERRY_INTERACTIVE_HIERARCHY_RENEWAL_BRIEF.md`. Fable은 입력·출력 0의 실행 장애로 사용하지 못했고, Cherry가 `gpt-5.6-sol · medium` 대체를 명시 승인했다. `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`, release approval과 Cherry acceptance는 이 작업으로 닫지 않는다. 네 번째 fresh H12의 interactive Phase option title clipping 누락을 반영해 `false_completion_count=16`을 보존한다.

- [x] H1: 이미지 1–3과 현재 공개 UI의 차이를 분석하고 Hero 축소, 역할 상태 통합, source-grounded gradient, 단일 interactive hierarchy surface의 정보 구조를 고정한다.
  PROVES: design_before_implementation
  EVIDENCE: fresh gpt-5.6-sol medium 디자인 검토가 비대칭 focus+context browser를 채택하고 Hero/current 소유권, zero-Stage Phase band, mobile drill-down 모순을 반증했다. brief에 KEEP·REPAIR·REMOVE, 상태 문법, desktop/mobile geometry와 자동 합격 조건을 교정했다.
- [x] H2: Hero가 기존 프로젝트 타이틀 형식을 회복하고 프로젝트명·짧은 목적·source freshness·새로고침·네 역할명/상태만 표시한다.
  PROVES: compact_project_orientation
  CHECK: npm run test:dashboard -- --run
  EXPECT: no current Stage block, next boundary block, current Gate block, timing cards, or raw role detail in Hero
  EVIDENCE: role grid now reserves a meaningful name track and bounds compact source-truth status text. At 390×844 both projects measure role name width `>=60.00px`, max `2` lines / `27.50px` inside `44.00px` rows, status overflow `0`, and descendant intersections `0`.
- [x] H3: Hero 하단 structural band가 모든 source-defined Phase를 categorical compartment로 보존하고 Phase 안의 Scope·정의된 Stage 상태를 표시하되 임의 aggregate percent를 만들지 않는다.
  PROVES: source_grounded_hierarchy_gradient
  CHECK: npm run test:dashboard -- --run
  EXPECT: every Phase remains visible even with zero Stage; complete Stage cells only are lime; current is a marker; definition-pending is neutral; no time/effort weighting
  EVIDENCE: structural band track count now comes from source `phases.length`. At 390×844 Cherry Note is `1/1` track with `330/332px` occupied; OUTCOME is `5/5` with `330/332px` occupied. At 375px both are `315/317px`; phantom compartments and label overflow are `0`.
- [x] H4: 네 역할 세션은 Hero 우측에서 역할명과 관측 상태만 한 줄씩 표시하고 active signal은 최대 하나이며 상세 binding은 접힌 기술 증거에만 남는다.
  PROVES: compact_role_status
  CHECK: npm run test:dashboard -- --run
  EVIDENCE: 4개 `.oc-role-row`는 44px이며 역할명·관측 상태만 표시한다. active+fresh binding만 live signal을 갖고 전수 측정 activeAnimation=0/live<=1이며 raw binding은 접힌 기술 증거에만 있다.
- [x] H5: 기존 current-flow, current-stage, stage-explorer 세 surface를 하나의 focus+context Outcome Map column browser로 통합한다.
  PROVES: one_hierarchy_surface
  CHECK: OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: compact Phase rail → selected Phase Scope rail → selected Scope Stage master → selected Stage Gate inspector; no duplicate journey/explorer card
  EVIDENCE: `.oc-outcome-map` 한 outer surface만 존재하고 desktop column은 184/232/336/528px, Map outer height는 608px이다. 옛 current-flow/current-stage/stage-explorer/selected-detail surface는 0개다.
- [x] H6: source에 정의된 모든 Phase를 표시하고 선택한 Phase의 모든 Scope, 선택한 Scope의 모든 Stage를 단계적으로 갱신한다.
  PROVES: full_hierarchy_navigation
  CHECK: OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: dynamic counts; OUTCOME 5 Phase rows; Cherry Note only source-defined phases; empty future hierarchy says definition pending
  EVIDENCE: interactive Phase option title은 3줄을 허용하고 Phase row는 `82px` 최소 높이를 갖는다. 전수 측정에서 OUTCOME Phase 4를 포함한 option strong은 desktop/landscape `51/51px`, mobile `17/17px`, horizontal overflow/ellipsis `0`이며 source Phase `5`개를 모두 표시한다.
- [x] H7: Phase/Scope/Stage 탐색 선택은 실제 current breadcrumb, structural band, NOW와 role status를 변경하지 않으며 Gate inspector만 선택 Stage의 불변 source data를 표시한다.
  PROVES: exploration_current_separation
  CHECK: OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EVIDENCE: 전 selection에서 `currentStageId + current breadcrumb + structure signature + NOW + role status` drift=0이다. 탐색 시에만 `탐색 중 · 실제 현재 위치 유지`가 표시되고 inspector만 갱신된다.
- [x] H8: Phase·Scope·Stage는 연결된 세 listbox column, Gate는 inspector이며 긴 완료 Stage branch는 disclosure로 접고 펼칠 수 있고 키보드 Arrow/Home/End와 column focus 이동이 유효하다.
  PROVES: accessible_progressive_disclosure
  CHECK: OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EVIDENCE: mobile source DOM order is structural band → actual-current → active level, with identity/freshness/NOW/roles preceding it. Existing three-listbox roving tabindex and Arrow/Home/End/column focus tests pass; focus contrast remains `>=13.60`.
- [x] H9: selected Stage Gate는 단일 상세에서 실제 closed/total, 목적, 남은 조건, source-labeled groups만 표시하고 generic aggregate·current Gate·boundary를 중복하지 않는다.
  PROVES: gate_is_stage_acceptance
  CHECK: npm run test:dashboard -- --run
  EVIDENCE: Gate inspector 한 곳에서 실제 closed/total, 목적, boundary, 남은 Gate와 source-labeled group만 표시한다. current selected일 때만 source closed/total gauge 1개 이하, unavailable/exploration은 gauge 0개다. Stage33은 한국어 primary 9+code 9+57 checks, generic group section 0을 유지한다.
- [x] H10: 1440×900에서 Hero와 실제 current, Phase 5개가 first fold에 보이고, 390×844에서는 project 아래에서 Phase → Scope → Stage → Gate를 한 level씩 drill-down한다.
  PROVES: glanceable_responsive_hierarchy
  CHECK: OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: no document horizontal overflow, clipping, ellipsis, overlap; controls>=44px; contrast>=4.5; reduced motion
  EVIDENCE: OUTCOME desktop 마지막 Phase bottom `894.39px <= 900px`, Map column `184/232/336/528px`; 390×844 첫 option Cherry Note `706.41px`, OUTCOME `735.33px < 844px`. mobile sticky band top `0px`, role name `>=60px`, source Phase band `1/1`·`5/5`를 보존했고 전 viewport clipping/ellipsis/intersection/overflow `0`이다.
- [x] H11: frontend, Node, security, browser all-state, isolated build, public boundary, mutation, scope, runbook과 diff checks가 통과한다.
  PROVES: regression_and_boundary
  CHECK: npm test && npm run test:security && npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && git diff --check
  EVIDENCE: frontend `51/51`, Node `64/64`, security `16/16`, browser harness `8/8`; 4 viewports each `41` hierarchy selections / `18` Stage selections; isolated asset `index-BsgcKz8K.js`; public boundary prohibited identifiers `0`, mutation `24/24`, scope `17` paths, runbook/diff PASS.
- [x] H12: exact public candidate를 fresh independent UX & Product QA가 세 reference intent, hierarchy comprehension, truth, interaction, accessibility 기준으로 PASS한다.
  PROVES: fresh_independent_qa
  EVIDENCE: fifth fresh isolated `gpt-5.6-sol · medium` reviewer independently passed exact public candidate `4b2ce172f5c6c3ac4c3a7688f9f6d35f8ffbc80a` / tree `6c803c68abd4ed531e921cfb60c70114ef56b114` / asset `index-BsgcKz8K.js`. Both projects, `6` Phases, `17` Scopes and `18` Stage/Gate branches passed truth, interaction, Korean comprehension, responsive, keyboard, contrast, reduced-motion, mutation and redaction checks. Frontend `51/51`, Node `64/64`, security `16/16`, browser guards `8/8`; blocked probes `0`; `false_completion_count=16`. Full evidence: `docs/STAGE8_CHERRY_INTERACTIVE_HIERARCHY_FRESH_UX_QA_4b2ce17.md`.
- [ ] H13: Cherry가 공개 화면을 직접 사용하고 추가 디테일 또는 acceptance를 결정한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: H12 Builder는 독립 QA를 self-accept할 수 없다. Planner가 exact public candidate 활성화 후 fresh QA에 전달한다.
ABANDON: H13 Cherry의 실제 사용과 명시적 결정 전용이다.
