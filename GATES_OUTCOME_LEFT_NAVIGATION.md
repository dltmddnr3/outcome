# OUTCOME Left Navigation Gates

Outcome: Cherry가 현재 대시보드 폼을 잃지 않고 프로젝트, 현재 작업, 결과 지도, 기술 증거, 비공개 워크스페이스를 왼쪽 탐색축에서 빠르게 구분하고 이동한다.

- [ ] L1: 왼쪽 탐색은 전역 정보 구조만 담고 Phase → Scope → Stage → Gate 위계를 중복하지 않는다.
  CHECK: `rg -n "현재 작업|결과 지도|기술 증거|비공개 워크스페이스|프로젝트" src/components/OutcomeDashboard.tsx`
  EXPECT: project switcher와 네 개 이하의 명확한 전역 목적지가 존재하고 Phase/Scope/Stage 목록은 기존 결과 지도에만 남는다.
  EVIDENCE: pending
- [ ] L2: 데스크톱에서는 고정 왼쪽 rail, 좁은 화면에서는 메뉴 버튼과 modal drawer로 전환되며 본문을 가리거나 가로 스크롤을 만들지 않는다.
  CHECK: `npm run test:dashboard`
  EXPECT: responsive navigation assertions pass.
  EVIDENCE: pending
- [ ] L3: 현재 프로젝트와 현재 섹션이 색상 외 텍스트·shape·ARIA로 구분되고 프로젝트 전환은 기존 선택 초기화 의미를 유지한다.
  CHECK: `npm run test:dashboard`
  EXPECT: aria-current, selected project, section anchor, project switch regression assertions pass.
  EVIDENCE: pending
- [ ] L4: 키보드·스크린리더·모바일 사용자는 skip link, 44px touch target, Escape 닫기, 닫은 뒤 focus 복귀, reduced motion을 사용할 수 있다.
  CHECK: `npm run test:dashboard`
  EXPECT: navigation accessibility assertions pass.
  EVIDENCE: pending
- [ ] L5: 1440×900과 390×844에서 핵심 헤더·현재 작업·결과 지도 시작점이 읽히고 overlap 및 horizontal overflow가 0이다.
  CHECK: `npm run test:browser`
  EXPECT: browser assertions pass with overlap=0 and horizontal overflow=0 at both target viewports.
  EVIDENCE: pending
- [ ] L6: 기존 source-grounded semantics, 공개 redaction, read-only mutation, account access, build가 회귀하지 않는다.
  CHECK: `npm run test && npm run test:security && npm run build`
  EXPECT: all commands exit 0; prohibited disclosure 0; public mutation remains fail-closed.
  EVIDENCE: pending
