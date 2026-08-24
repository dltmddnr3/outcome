# OUTCOME Stage 8 C1 진행 구조 재구성 Gate

Outcome: 기존 프로젝트 진행 시각화와 현재 NOW/역할 카드를 결합해 Cherry가 프로젝트 → 큰 단계 → 범위 → 작업 단계 → 완료 조건의 현재 위치를 첫 화면에서 이해한다.

Authority: Cherry의 2026-08-24 화면 피드백과 `docs/STAGE8_C1_DASHBOARD_REDESIGN_BRIEF.md`. 누적 `false_completion_count=13`을 보존하며 C1·C2와 외부 완료 경계를 계속 열어둔다.

- [x] R1: 프로젝트 Hero가 선택 프로젝트 이름, Outcome, 현재 위치, 다음 경계, freshness, 새로고침을 하나의 컨테이너에서 우선 표시한다.
  PROVES: project_orientation
  CHECK: npm run test:dashboard -- --testNamePattern='현재 프로젝트 Hero 의미를 한 컨테이너에 고정한다'
  EXPECT: generic heading is replaced; project identity and current/next are visible without scrolling on desktop
  EVIDENCE: Hero model unit 1/1 PASS와 desktop/mobile 전수에서 프로젝트 이름·Outcome·현재 위치·다음 경계·원본 관측·44px 새로고침이 동일 컨테이너에 노출됩니다.
- [x] R2: Hero 라임 fill이 현재 Stage Gate `closed/total`만 반영하고 프로젝트 전체 퍼센트로 오해되지 않게 label과 fallback을 제공한다.
  PROVES: source_grounded_progress
  CHECK: npm run test:dashboard -- --testNamePattern='Hero 완료 조건 fill은 현재 작업 단계 근거만 사용한다'
  EXPECT: no aggregate percent; no Gate evidence yields no fill and explicit unavailable state
  EVIDENCE: red-first에서 helper 부재를 재현한 뒤 available 2/4=scale .5와 unavailable scale=null unit이 통과했습니다. UI label은 `현재 작업 단계 완료 조건 근거`와 `프로젝트 전체 진행률이 아닙니다`를 함께 표시합니다.
- [x] R3: NOW와 네 역할 카드가 유지되고, 실제 active+fresh binding만 lime glow/live animation을 표시한다.
  PROVES: live_session_visibility
  CHECK: npm run test:dashboard -- --testNamePattern='실시간 세션은 active와 fresh가 모두 맞는 역할 하나만 선택한다'
  EXPECT: active animation count <=1 card; stale/unbound/unknown have no live animation; reduced-motion is static
  EVIDENCE: active+fresh 첫 역할만 선택하는 unit이 통과했고 실제 public-shaped data에서는 animated card 0개였습니다. synthetic CSS probe는 normal 반복 motion과 reduced-motion 정적 fallback을 모두 검증했습니다.
- [x] R4: Funnel이 source에서 계산한 `큰 단계 i/total → 범위 i/total → 작업 단계 i/total → 완료 조건 closed/total`을 위에서 아래 순서로 표시한다.
  PROVES: hierarchy_funnel
  CHECK: npm run test:dashboard -- --testNamePattern='현재 큰 단계 범위 작업 단계 index를 Package 배열에서 계산한다'
  EXPECT: all four counts match Package IDs/arrays and no invented progress exists
  EVIDENCE: 2 Phase·2 Scope·2 Stage fixture의 1/2·2/2·2/2 계산이 통과했고, 브라우저는 모든 선택 Stage에서 current funnel signature 불변을 확인했습니다.
- [x] R5: 현재 Phase의 Scope rail과 현재 Scope의 Stage rail이 완료/진행 중/대기/근거 없음을 아이콘·한글 label·형태로 구분한다.
  PROVES: placement_feedback
  CHECK: npm run test:dashboard -- --testNamePattern='Scope와 작업 단계 rail 상태를 원본 자식 상태와 current ID로만 계산한다'
  EXPECT: Scope complete only when every child Stage is complete; current is derived only from current IDs
  EVIDENCE: complete/active/pending/unknown Scope·Stage unit이 통과했고, 브라우저는 모든 rail item에 Lucide icon과 한글 상태 text가 함께 있음을 확인했습니다.
- [x] R6: build receipt, GitHub connector와 근거축을 기본 접힘 `기술 증거`로 이동하고 핵심 진행 흐름보다 앞서거나 큰 면적을 차지하지 않는다.
  PROVES: progressive_disclosure
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: technical evidence is collapsed by default and follows current-stage content
  EVIDENCE: native details는 36/36 상태에서 기본 접힘이며 Hero·NOW·역할·funnel·현재 Stage·탐색 상세 뒤에 위치합니다. 숨은 DOM에는 build/GitHub/axes 근거가 보존됩니다.
- [x] R7: 선택 Stage 탐색 상세와 실제 현재 funnel을 명확히 분리하고, 현재 Stage의 남은 핵심 완료 조건을 우선 표시한다.
  PROVES: current_vs_selected_clarity
  CHECK: npm run test:dashboard -- --testNamePattern='선택한 과거 작업 단계가 현재 funnel을 바꾸지 않는다'
  EXPECT: non-current selection shows 탐색 중 and never rewrites current hierarchy counts
  EVIDENCE: historical Stage 선택 unit과 브라우저 18개 Stage 전수에서 `탐색 중 · 실제 현재 위치 유지`와 current funnel signature 불변을 확인했습니다. 현재 완료 조건 최대 3개는 탐색 상세보다 앞서 표시됩니다.
- [x] R8: 1440×900과 390×844에서 핵심 순서, touch target, contrast, focus, no overflow/overlap/clipping을 충족한다.
  PROVES: responsive_accessible_ui
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: 2 projects × 18 stages × 2 viewports; clipped=0 intersections=0 viewportEscape=0 documentOverflow=0 controls>=44 contrast>=4.5
  EVIDENCE: desktop/mobile 각각 projects=2, selectedStages=18, funnelCounts=true, technicalCollapsed=true, unexpectedEnglish=0, translationFallback=0, clipped/intersections/viewportEscape/documentOverflow=0, controls>=44, textContrast>=4.5, focusContrast=14.83입니다.
- [x] R9: 한글 UI와 보안·읽기 전용·Package truth 회귀가 모두 통과한다.
  PROVES: regression
  CHECK: npm test && npm run test:security && npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: exit 0; unexpectedEnglish=0 translationFallback=0 false_completion_count=13
  EVIDENCE: frontend 28/28, Node 61/61, security 16/16, local candidate public boundary prohibited identifiers=0, mutation 24/24=405, scope/runbook PASS, isolated production build와 browser PASS입니다. cumulative false_completion_count=13입니다.
- [ ] R10: exact candidate 활성화 후 fresh UX & Product QA가 두 프로젝트 30초 이해, motion, funnel, desktop/mobile을 독립 PASS한다.
  PROVES: independent_qa
  EVIDENCE: pending
- [ ] R11: fresh QA PASS 뒤 Cherry가 공개 화면을 사용하고 C1을 직접 결정한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: R10 Builder에게 exact public activation 또는 독립 UX & Product QA 실행·판정 권한이 없으므로 Planner 활성화 뒤 fresh QA가 수행해야 합니다.
ABANDON: R11 C1은 fresh QA 뒤 Cherry의 실제 공개 화면 사용과 명시적 결정 전용입니다.
