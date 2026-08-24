# OUTCOME Stage 8 C1 정보 구조 fresh QA 교정 Gate

Outcome: exact public candidate `36b07cc2141bb00074c75664cfe615ae49911daa`의 fresh independent QA `NEEDS_REVISION`에서 확인된 정보 중복·완료 조건 수치·그룹 배치·listbox 소유권 결함만 교정하고, 기존 IA source truth와 공개 경계를 보존한다.

Authority: Cherry의 2026-08-24 bounded correction 승인. Builder는 제품 후보와 검증 증거만 소유한다. 공개 runtime·Quick Tunnel은 변경하지 않는다. I11은 fresh QA 전까지 pending이며 I12/C1/C2/release/`MVP_SCOPE_CLOSED`/`EXTERNAL_OUTCOME_COMPLETE`는 open이다. `false_completion_count=13`을 보존한다.

- [x] IC1: 선택 작업 단계 상세의 `완료 조건 확인`은 label을 `dt`에 두고 source-grounded `closed/total`을 `dd`에 표시하며, 근거가 없으면 명시적 unavailable 문구를 표시한다.
  PROVES: selected_gate_count_truth
  CHECK: npm run test:dashboard -- --testNamePattern='선택 작업 단계 완료 조건은 실제 closed total을 표시한다'
  EXPECT: available -> exact closed/total; unavailable -> 완료 조건 근거 없음; no semantic count label in dd
  EVIDENCE: `selectedGateCount` red-first/green과 72-state browser `detailGateTruth=true`; available `closed/total`, unavailable `완료 조건 근거 없음`을 검증했다. `docs/STAGE8_C1_INFORMATION_ARCHITECTURE_CORRECTION_EVIDENCE.md`.
- [x] IC2: selected=current일 때 현재 완료 조건 목록과 경계 의미를 각각 한 번만 렌더하고, selected!=current일 때 탐색 상세 맥락을 유지한다.
  PROVES: current_detail_deduplication
  CHECK: npm run test:dashboard -- --testNamePattern='현재 선택 상세는 완료 조건과 경계를 중복하지 않는다'
  EXPECT: current detail has no duplicate Gate list/boundary/title; exploring detail retains selected Gate list/boundary and actual-current notice
  EVIDENCE: `detailContentPolicy` red-first/green과 72-state browser `currentDetailDedup=true`; current에서는 current boundary/Gate region 각 1개와 selected duplicate 0, exploration에서는 실제-current notice와 selected detail을 보존했다.
- [x] IC3: 완료 조건 그룹은 개수에 맞춰 가용 폭을 사용하고, generic group 이름·raw code를 primary content에서 반복하지 않으며 source-provided Korean label/code-secondary 계약은 보존한다.
  PROVES: adaptive_gate_groups
  CHECK: npm run test:dashboard -- --testNamePattern='완료 조건 그룹은 source label과 code를 필요한 경우에만 표시한다'
  EXPECT: single group fills available width; generic label/code hidden; sourced primary label and secondary code retained
  EVIDENCE: `gateGroupPresentation` red-first/green, CSS `auto-fit/minmax`, 72-state browser `adaptiveGateGroups=true`; single group 폭>=90%, generic primary label/code 0, Stage33 source Korean label 9/code-secondary/57 checks PASS.
- [x] IC4: 작업 단계 listbox의 Scope 묶음은 valid `role=group`과 accessible label을 가져 option ownership과 roving tabindex를 보존한다.
  PROVES: valid_listbox_group_ownership
  CHECK: npm run test:dashboard -- --testNamePattern='작업 단계 listbox는 이름 있는 group만 option을 소유한다'
  EXPECT: listbox direct children role=group; each group has accessible name; option selected/current/tabstop semantics unchanged
  EVIDENCE: 각 `.oc-stage-group`이 `role=group` + `aria-labelledby`를 갖고 listbox direct child ownership을 구성한다. 72-state browser `listboxOwnership=true`; selected/current/tabstop 각각 1과 keyboard contract PASS.
- [x] IC5: 역할 행의 동일 상태·freshness 반복과 Hero primary project slug를 제거하고 기술 증거의 source identity는 보존한다.
  PROVES: primary_copy_polish
  CHECK: npm run test:dashboard -- --testNamePattern='역할 관측과 프로젝트 식별자는 primary에서 중복되지 않는다'
  EXPECT: no 관측 오래됨 duplication; no visible Hero project slug; technical evidence retains project identifier
  EVIDENCE: `bindingObservationLabel` red-first/green; 동일 status/freshness는 한 번만 표시한다. Hero visible slug 0, collapsed technical evidence의 `프로젝트 식별자`는 보존했다. Browser `roleCopyPolish=true`, `heroPrimaryIdentity=true`.
- [x] IC6: frontend/Node/security/build/browser 72-state/public-boundary/mutation/scope/runbook/diff/gate checks가 기존 IA와 공개 redaction 경계를 보존한다.
  PROVES: bounded_regression
  CHECK: npm test && npm run test:security && npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: exit 0; browser 72/72; prohibited=0; mutations 24/24=405; public runtime untouched; false_completion_count=13
  EVIDENCE: frontend 44, Node 64, security 16, browser harness 3, 4 viewports × 18 selected Stages=72 states, isolated asset `index-CILj_dlQ.js`, public boundary prohibited=0, mutations 24/24=405, scope 17, runbook/diff PASS. Public runtime는 변경하지 않았다. `false_completion_count=13` 보존.
- [x] IC7: 모든 Gate group이 generic/unlabeled이고 Stage aggregate 이외의 source-grounded decomposition을 제공하지 않으면 `그룹별 확인` 전체를 숨기며, source-labeled group은 그대로 표시한다.
  PROVES: meaningful_group_decomposition_only
  CHECK: npm run test:dashboard -- --testNamePattern='generic group은 Stage aggregate와 같으면 전체 section을 숨긴다'
  EXPECT: generic-only aggregate duplicate hidden; unavailable hidden; source-labeled Stage33 groups retained with Korean primary/code secondary
  EVIDENCE: `meaningfulGateGroups` red-first/green. 4 viewports 각각 18 selected Stages에서 `genericGroupSections=0`, source-labeled `sourceGroupStates=1`; Stage33 Korean primary 9 + secondary code 9 + 57 checks PASS.
- [x] IC8: stale NOW 상태는 headline 또는 metadata 정확히 한 곳에만 표시하며 visibility와 timing/truth copy를 보존한다.
  PROVES: single_stale_now_signal
  CHECK: npm run test:dashboard -- --testNamePattern='오래된 NOW 상태는 headline과 metadata 중 한 곳에만 표시한다'
  EXPECT: 관측 오래됨 count=1; activity and 세션 활동은 진행률이 아닙니다 remain visible
  EVIDENCE: `nowPresentation` red-first에서 stale count 2를 재현한 뒤 headline 1곳으로 교정했다. 72-state browser에서 `staleNowCount<=1`; activity, source observation, timing fallback, `세션 활동은 진행률이 아닙니다`를 보존했다.
- [x] IC9: 두 display-condition 교정 뒤 full frontend/Node/security/build/browser 72-state/public-boundary/mutation/scope/runbook/diff가 통과한다.
  PROVES: second_correction_regression
  CHECK: npm test && npm run test:security && npm run build:isolated && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run test:browser && OUTCOME_CANDIDATE_DIST=.outcome-runtime/candidate-dist npm run check:public-boundary && npm run check:mutations && npm run check:scope && npm run check:runbook && git diff --check
  EXPECT: exit 0; 72/72 states; Stage33 9 groups/57 checks; generic duplicate sections=0; stale NOW count=1; public runtime untouched; false_completion_count=13
  EVIDENCE: frontend 45, Node 64, security 16, browser harness 3, 4 viewports × 18 selected Stages=72 states, isolated asset `index-CYdBJNLy.js`, public boundary prohibited=0, mutations 24/24=405, scope 17, runbook/diff PASS. Public runtime는 변경하지 않았다. `false_completion_count=13` 보존.
