# OUTCOME Left Navigation Gates

Outcome: Cherry가 현재 대시보드 폼을 잃지 않고 프로젝트, 현재 작업, 결과 지도, 기술 증거, 비공개 워크스페이스를 왼쪽 탐색축에서 빠르게 구분하고 이동한다.

- [x] L1: 왼쪽 탐색은 전역 정보 구조만 담고 Phase → Scope → Stage → Gate 위계를 중복하지 않는다.
  CHECK: `rg -n "현재 작업|결과 지도|기술 증거|비공개 워크스페이스|프로젝트" src/components/OutcomeDashboard.tsx`
  EXPECT: project switcher와 네 개 이하의 명확한 전역 목적지가 존재하고 Phase/Scope/Stage 목록은 기존 결과 지도에만 남는다.
  EVIDENCE: `globalNavigationItems`는 현재 작업·결과 지도·기술 증거·비공개 워크스페이스 4개만 고정하며, `npm run test:browser`가 전역 탐색 안의 위계 용어 중복 0을 확인했다.
- [x] L2: 데스크톱에서는 고정 왼쪽 rail, 좁은 화면에서는 메뉴 버튼과 modal drawer로 전환되며 본문을 가리거나 가로 스크롤을 만들지 않는다.
  CHECK: `npm run test:dashboard`
  EXPECT: responsive navigation assertions pass.
  EVIDENCE: 1440×900은 224px 고정 rail과 1112px 결과 지도, 390×844은 닫힌 drawer와 44px trigger로 측정됐고 두 화면 모두 overlap=0, horizontal overflow=0이다.
- [x] L3: 현재 프로젝트와 현재 섹션이 색상 외 텍스트·shape·ARIA로 구분되고 프로젝트 전환은 기존 선택 초기화 의미를 유지한다.
  CHECK: `npm run test:dashboard`
  EXPECT: aria-current, selected project, section anchor, project switch regression assertions pass.
  EVIDENCE: 선택 프로젝트는 `aria-current="page"`와 `선택됨`, 선택 구역은 `aria-current="location"`과 `현재`를 함께 표시한다. 3개 fixture 프로젝트 전환과 hash history back 복원이 브라우저에서 통과했다.
- [x] L4: 키보드·스크린리더·모바일 사용자는 skip link, 44px touch target, Escape 닫기, 닫은 뒤 focus 복귀, reduced motion을 사용할 수 있다.
  CHECK: `npm run test:dashboard`
  EXPECT: navigation accessibility assertions pass.
  EVIDENCE: 본문 skip link, dialog `aria-modal`, focus trap, Escape/backdrop/close focus 복귀, body scroll lock, inert background, reduced-motion 정지가 자동 브라우저 검증을 통과했다. 모든 측정 control은 44px 이상이다.
- [x] L5: 1440×900과 390×844에서 핵심 헤더·현재 작업·결과 지도 시작점이 읽히고 overlap 및 horizontal overflow가 0이다.
  CHECK: `npm run test:browser`
  EXPECT: browser assertions pass with overlap=0 and horizontal overflow=0 at both target viewports.
  EVIDENCE: `npm run test:browser` PASS. 1440×900 columns=184/232/336/388, overlap=0, overflow=0; 390×844 active mobile column만 노출, 4-level interaction 유지, overlap=0, overflow=0.
- [x] L6: 기존 source-grounded semantics, 공개 redaction, read-only mutation, account access, build가 회귀하지 않는다.
  CHECK: `npm run test && npm run test:security && npm run build`
  EXPECT: all commands exit 0; prohibited disclosure 0; public mutation remains fail-closed.
  EVIDENCE: `npm run test` frontend 76 + Node 109 PASS; `npm run test:security` 28 PASS, prohibited disclosures=0, Gate evidence fields=0, client metadata leaks=0; `npm run check:scope` PASS; production build PASS.
