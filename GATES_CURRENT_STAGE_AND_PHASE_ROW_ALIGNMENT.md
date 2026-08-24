# 현재 단계 보기 및 페이즈 진행률 행 정렬 게이트

- [x] C1 현재 단계 보기 동작
  - 사용자가 어느 페이즈/범위/스테이지를 탐색 중이든 `현재 단계 보기`를 누르면 원본 `project.current`의 페이즈·범위·스테이지가 다시 선택된다.
  - 모바일에서는 스테이지 층위(3/4)가 열리고 실제 현재 스테이지가 선택·현재 상태로 보인다.
  - CHECK: `npm run test:dashboard`
  - EXPECT: 관련 단위/소스 계약 테스트 PASS
  - EVIDENCE: `OutcomeDashboard.tsx`의 `showCurrentStage`가 원본 current selection을 복원하고 mobileLevel=2로 이동. browser-check 네 viewport에서 2개 프로젝트, 계층 선택 44회, 스테이지 선택 21회 후 current-stage-return PASS.

- [x] C2 현재 위치 탐색 접근성
  - `현재 단계 보기`는 항상 보이는 의미 있는 `button`이며 최소 44px 터치 높이, 키보드 포커스, 명시적 접근성 이름을 갖는다.
  - 현재 위치와 탐색 위치의 표시는 서로 섞이지 않는다.
  - CHECK: `OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: 브라우저 상호작용 및 접근성 계약 PASS
  - EVIDENCE: `button.oc-show-current-button`, 접근성 이름 `실제 현재 스테이지 보기`, 44px 이상·focus-visible 계약. browser-check `undersizedControls=0`, `focusContrast>=13.60`.

- [x] C3 페이즈별 진행률 행 정렬
  - 상단 모든 페이즈 셀의 상태 행과 제목 시작점이 정렬되고, 제목 길이를 자르지 않은 채 진행률 게이지의 수직 기준선 편차가 1px 이하이다.
  - CHECK: `OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: 페이즈 게이지 정렬 측정 PASS
  - EVIDENCE: 페이즈 셀 flex-column + 진행률 rail margin-top:auto. browser measurement가 모든 페이즈 rail top 편차 1px 이하를 검증했고 4 viewport PASS, label clipping=0.

- [x] C4 회귀·반응형 품질
  - 전체 프론트엔드·Node 테스트와 프로덕션 빌드가 통과한다.
  - 375x812, 390x844, 844x390, 1440x900에서 겹침과 수평 오버플로가 없고 reduced-motion에서도 기능이 유지된다.
  - CHECK: `npm test && npm run build && OUTCOME_CANDIDATE_DIST=dist npm run test:browser`
  - EXPECT: exit 0
  - EVIDENCE: frontend 57 + Node 78 = 135 tests PASS, production build PASS. 375x812, 390x844, 844x390, 1440x900에서 clipped/intersections/viewportEscape/documentOverflow 모두 0, reducedMotionStatic=true.

- [ ] C5 공개 고정 주소 반영
  - exact Git commit/tree/asset이 공개 영수증과 일치하고 공개 페이지 GET 200, mutation 405, prohibited public-boundary hit 0이다.
  - CHECK: `OUTCOME_CANDIDATE_DIST=dist OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run check:public-boundary && OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run test:remote-browser && OUTCOME_PUBLIC_URL=https://outcome-five.vercel.app npm run check:mutations`
  - EXPECT: exit 0
  - EVIDENCE: pending
