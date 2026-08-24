# OUTCOME Stage 8 C1 시각 진행·시간 정보 Gate

Outcome: 현재 정보와 기능을 보존하면서 Cherry가 첫 화면에서 `완료 → 현재 → 대기`, 현재 Stage의 완료 조건 진척, 그리고 근거가 있는 시간 정보만 즉시 이해한다.

Authority: Cherry의 2026-08-24 시각 리뉴얼 피드백과 `docs/STAGE8_C1_VISUAL_PROGRESS_TIMING_BRIEF.md`. 기존 C1·C2, R11, release approval, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 계속 열어둔다. 누적 `false_completion_count=13`을 보존한다.

- [x] V1: 현재 화면의 프로젝트 Hero, NOW, 네 역할 카드, funnel 목적, 현재 Stage 완료 조건, 탐색 상세, 기술 증거를 삭제하거나 의미 축소하지 않고 시각 위계만 재구성한다.
  PROVES: content_preservation
  CHECK: npm run test:dashboard -- --testNamePattern='핵심 정보 영역을 시각 리뉴얼 뒤에도 보존한다'
  EXPECT: all required regions and source-grounded labels remain present
  EVIDENCE: frontend 35/35 및 browser 72/72 상태에서 필수 영역 9개와 역할 카드 4개 보존; docs/STAGE8_C1_VISUAL_PROGRESS_TIMING_EVIDENCE.md
- [x] V2: 현재 Phase의 Scope가 첨부 기준처럼 하나의 연속 수평 레일에서 완료·현재·대기를 선, 노드, 아이콘, 한글 상태로 구분하며 현재 Scope는 돌출된 활성 카드로 보인다.
  PROVES: scope_journey_glanceability
  CHECK: npm run test:dashboard -- --testNamePattern='Scope 레일은 완료 현재 대기 위치를 원본 상태로만 계산한다'
  EXPECT: desktop has one continuous rail; status is not color-only; current item is visually dominant without hiding labels
  EVIDENCE: source-state unit PASS; desktop continuous flex line/node and mobile 2-column browser scopeJourney=true across 72 states
- [x] V3: 현재 Stage Gate `closed/total`만으로 정확한 정수 퍼센트와 단일 라임 그라데이션 게이지를 표시하고 프로젝트 전체 진행률이 아님을 바로 옆에서 명시한다.
  PROVES: exact_gate_progress
  CHECK: npm run test:dashboard -- --testNamePattern='현재 작업 단계 퍼센트는 완료 조건 closed total만 사용한다'
  EXPECT: 2/4 renders 50%; unavailable/zero-total renders no numeric percent and an explicit unavailable state
  EVIDENCE: red-first 2/4=50%, unavailable/0 yields percent=null and gauge absent; browser currentGateTruth=true across 72 states
- [x] V4: Phase·Scope·Stage 위치는 `i / total`로만 보여주며 이를 전체 퍼센트나 동일 기간 단계로 환산하지 않는다.
  PROVES: no_invented_aggregate
  CHECK: npm run test:dashboard -- --testNamePattern='위계 위치를 프로젝트 전체 퍼센트로 환산하지 않는다'
  EXPECT: no cross-stage aggregate percentage exists in model or UI
  EVIDENCE: hierarchyPlacement unit PASS and browser placementOnly=true; no Phase/Scope/Stage percent
- [x] V5: 현재 역할 연결 경과 시간은 current Stage와 일치하는 active+fresh binding의 명시적 `bound_at`이 있을 때만 계산하고, 그 외에는 `작업시간 측정 근거 없음`을 표시한다.
  PROVES: grounded_elapsed_time
  CHECK: npm run test:dashboard -- --testNamePattern='작업 경과 시간은 현재 작업 단계의 활성 최신 연결 시각만 사용한다'
  EXPECT: mismatched/stale/unbound/missing timestamp never yields elapsed digits
  EVIDENCE: Node projection preserves boundAt separately; active/fresh/current/valid start positive and stale/mismatch/missing negative unit PASS
- [x] V6: 남은 예상 시간은 Package의 명시적 계획 예상치와 신뢰 가능한 시작 근거가 모두 있을 때만 `계획 기준 예상`으로 표시하고, 현재 데이터처럼 예상치가 없으면 `남은 시간 예상 근거 없음`을 표시한다.
  PROVES: grounded_eta
  CHECK: npm run test:dashboard -- --testNamePattern='남은 시간은 명시적 계획 예상치 없이는 계산하지 않는다'
  EXPECT: gate ratio, activity volume, commit count, or session history never fabricates ETA
  EVIDENCE: missing field unavailable, positive explicit field supported, invalid field fail-closed unknown; browser current Packages show no-source fallback
- [x] V7: 활성 역할 카드와 현재 Scope만 라임 강조를 사용하고 반복 애니메이션은 최대 두 의미 요소이며 reduced-motion에서는 정적으로 유지된다.
  PROVES: semantic_motion
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: active motion is bounded; reduced motion has no repeating animation; pending items do not glow
  EVIDENCE: browser 72/72 states repeatingSemantic<=2 and reducedMotionStatic=true; pending elements do not glow
- [x] V8: 1440×900, 390×844, 375px phone, landscape에서 가로 넘침·겹침·잘림 없이 읽히고 touch target, focus, heading, contrast 기준을 유지한다.
  PROVES: responsive_accessible_polish
  CHECK: npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser
  EXPECT: 2 projects × all stages; documentOverflow=0 intersections=0 viewportEscape=0 controls>=44 contrast>=4.5 unexpectedEnglish=0 translationFallback=0
  EVIDENCE: 4 viewports x 18 states=72; geometry/English/fallback zero; controls>=44, contrast>=4.5; exact measurements in Builder evidence
- [x] V9: frontend, Node, security, public boundary, mutation, scope, runbook, production build가 모두 통과하고 금지 경계와 완료 상태가 변하지 않는다.
  PROVES: regression_and_boundary
  CHECK: npm test && npm run test:security && npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: exit 0; public prohibited hit 0; mutations 405; false_completion_count=13; C1/C2/R11 remain open
  EVIDENCE: frontend 35, Node 64, security 16, browser harness 3, public prohibited=0, mutation 24/24 405, scope/runbook/build/diff PASS
- [ ] V10: exact immutable candidate를 공개 URL에 활성화한 뒤 fresh UX & Product QA가 데스크톱·모바일의 30초 이해, 진행 진실성, 시간 fallback, motion을 독립 PASS한다.
  PROVES: fresh_independent_qa
  EVIDENCE: pending
- [ ] V11: fresh QA PASS 뒤 Cherry가 공개 화면을 직접 보고 C1을 결정한다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: V10 Builder에게 공개 활성화 또는 독립 UX & Product QA 판정 권한이 없으므로 Planner 활성화 뒤 fresh QA가 수행해야 한다.
ABANDON: V11 C1은 Cherry의 실제 공개 화면 사용과 명시적 결정 전용이다.
