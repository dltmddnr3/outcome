# OUTCOME 넓은 캔버스 UI Gate

Outcome: 모바일과 PC 모두에서 중첩 프레임으로 잃던 폭을 핵심 계층 탐색에 돌려주되, 정보 구조·진행 의미·접근성·반응형 안정성을 보존한다.

## W1 · 캔버스 폭

- [x] 데스크톱에서 앱의 1600px 상한을 해제하거나 1920px까지 확장하고 본문 여백을 24–32px 범위로 유지한다.
  CHECK: rg -q '\.oc-dashboard\{display:grid;width:100%;max-width:none' src/styles.css
  EXPECT: 각각 1144px 이상, 1608px 이상
  EVIDENCE: 실제 브라우저 측정 1440×900 `1144px`, 1920×1080 `1624px`; 상한 없음과 본문 좌우 24px를 source에서 확인했다.

- [x] 모바일 본문 외곽 여백을 좌우 8px로 줄인다.
  CHECK: rg -q '\.oc-dashboard-content\{padding-right:8px;padding-left:8px\}' src/styles.css
  EXPECT: 사용 폭 374px 이상
  EVIDENCE: 390×844 실제 작업대 폭 `374px`; 430×932 `414px`, 375×812 `359px`, 320×568 `304px`로 모두 뷰포트-16px를 사용했다.

## W2 · 중첩 프레임 제거

- [x] 모바일의 Hero와 프로젝트 여정은 중첩 외곽선 대신 배경과 단일 분리선으로 구분한다.
  CHECK: rg -q '\.oc-hero,\.oc-workbench\{border-right:0;border-left:0;border-radius:0\}' src/styles.css
  EXPECT: 의미 영역당 외곽선 최대 1개
  EVIDENCE: 모바일에서 Hero/작업대 좌우 외곽선과 반경을 제거했고 내부는 기존 단일 분리선만 유지한다.

- [x] Hero와 `세션 채팅 + 전체 진행 흐름 + 프로젝트 여정` 작업대의 바깥 기준선이 일치한다.
  CHECK: node --test scripts/browser-assertions.test.mjs
  EXPECT: 좌우 경계 차이 각각 1px 이하
  EVIDENCE: 9개 viewport 실제 브라우저 측정에서 좌우 정렬 오차 `0px/0px`; 넓은 캔버스 fail-closed assertion 20/20 중 해당 assertion 통과.

## W3 · 정보와 상호작용 보존

- [x] `Project → Phase → Scope → Stage → Gate` 탐색, 현재/선택 구분, Gate 증거가 변경되지 않는다.
  CHECK: npm test
  EXPECT: 모두 exit 0
  EVIDENCE: frontend 89/89 + Node 112/112 통과; 각 viewport에서 3개 프로젝트, 계층 선택 9회, 스테이지 선택 3회와 현재 단계 복귀가 통과했다.

- [x] 글자 크기를 축소하지 않고 모든 상호작용 목표를 44×44px 이상 유지한다.
  CHECK: node --test scripts/browser-assertions.test.mjs
  EXPECT: 기존 본문 최소 크기 유지, 대상 44×44px 이상
  EVIDENCE: 9개 viewport에서 `controls>=44`, `text>=11`, contrast>=4.5, focus contrast>=14.38을 확인했다.

## W4 · 반응형 회귀

- [x] 320×568, 375×812, 390×844, 430×932, 844×390, 1440×900, 1920×1080에서 가로 overflow와 겹침이 없다.
  CHECK: OUTCOME_CANDIDATE_DIST=dist npm run test:browser
  EXPECT: horizontal overflow=0, overlap=0
  EVIDENCE: 명시된 7개 viewport와 360×800, 1024×768을 더한 총 9개 viewport에서 clipped/ellipsis/intersections/viewportEscape/documentOverflow 모두 0.

- [x] frontend, Node, production build가 통과한다.
  CHECK: npm test && npm run build
  EXPECT: exit 0
  EVIDENCE: frontend 89/89, Node 112/112, browser assertions 20/20, Vite production build 1652 modules 통과.

Cherry acceptance, Release Audit, 배포 및 외부 완료는 이 Gate의 권한이 아니며 열린 상태로 유지한다.
