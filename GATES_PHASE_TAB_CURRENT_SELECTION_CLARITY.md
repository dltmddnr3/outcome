# 페이즈 탭 현재·선택 구분 게이트

- [x] P1 실제 현재 페이즈 단독 강조
  - 원본 `project.current.phaseId`인 탭만 `aria-current=step`과 라임 현재 표시를 갖는다.
  - 다른 페이즈의 완료·일부 완료 이력은 중립색 진행 막대로 보존하고 현재처럼 라임으로 칠하지 않는다.
  - CHECK: `OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: phase current/selection truth PASS
  - EVIDENCE: `aria-current=step` 1개가 `data-current-phase-id`와 일치. 현재 Phase 완료 막대만 lime, 비현재 Phase 완료 막대는 neutral인지 browser assertion으로 전 Phase 탐색 검증 PASS.

- [x] P2 한 줄 페이즈 탭과 터치 탐색
  - 상단 페이즈는 전체 개수만큼 `페이즈 N` 한 줄 탭으로 표시되고 44px 이상 터치 가능하다.
  - 탭을 누르면 아래 결과 지도의 선택 페이즈·범위·스테이지 내용이 갱신된다.
  - CHECK: `OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: all Phase tabs interactive, one-line, unclipped
  - EVIDENCE: source Phase 수와 동일한 role=tab, 각 탭 56px 이상, `페이즈 N` nowrap·clipping 0. 2개 프로젝트의 44회 계층 선택에서 탭 터치 후 하위 내용 갱신 PASS.

- [x] P3 현재 단계와 터치 단계 구분
  - 결과 지도에는 `현재 단계` 경로와 탐색 시 `선택한 단계` 경로가 별도 문구로 보인다.
  - 선택 탭은 `aria-selected=true`와 별도 테두리/배경, 현재 탭은 `aria-current=step`과 현재 아이콘으로 구분되며 색만으로 의미를 전달하지 않는다.
  - CHECK: `npm run test:dashboard && OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: state distinction and accessibility PASS
  - EVIDENCE: 현재는 Radio 아이콘+lime+`aria-current`, 선택은 흰 하단선+`aria-selected`. 결과 지도 `현재 단계 ·`와 탐색 시 `선택한 단계 ·`를 동시 표시하며 375px 실기 렌더 확인.

- [x] P4 반응형·회귀 품질
  - 375x812, 390x844, 844x390, 1440x900에서 수평 오버플로·겹침·잘림이 없고 전체 테스트와 빌드가 통과한다.
  - CHECK: `npm test && npm run build && OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: exit 0
  - EVIDENCE: frontend 57 + Node 78 = 135 tests PASS, production build PASS. 375x812, 390x844, 844x390, 1440x900에서 clipped/intersections/viewportEscape/documentOverflow 모두 0, reducedMotionStatic=true.

- [x] P5 공개 고정 주소 반영
  - GitHub HEAD=origin/main, 공개 영수증 commit/tree/asset 일치, GET 200, mutation 405, prohibited hit 0이다.
  - CHECK: `OUTCOME_CANDIDATE_DIST=dist OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run check:public-boundary && OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run test:remote-browser && OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run check:mutations`
  - EXPECT: exit 0
  - EVIDENCE: production `dpl_9LwQLghzyUs7DisCKyL1uVEuobQi` READY 및 fixed alias 정상. public prohibited=0, remote desktop/mobile 전체 계층 PASS, public mutation 24/24=405·read_only JSON 20/20.
