# Phase 2 · Private Account Shell Integration Gates

Outcome: 계정 전용 접근 경계를 유지하면서 인증 후 화면은 기존 OUTCOME 앱 셸과 프로젝트 여정 UI를 그대로 사용한다.

- [x] S1: 인증된 비공개 workspace가 기존 OUTCOME 좌측 프로젝트 사이드바와 프로젝트 여정 본문을 렌더링한다.
  PROVES: product_ux
  CHECK: `npm run test:account-access`
  EXPECT: exit 0
  EVIDENCE: `npm run test:account-access`가 Node `32/32`, frontend `18/18`로 통과했다. ready private workspace의 static render에서 기존 `oc-global-nav`, `oc-project-switcher`, `프로젝트 여정`을 확인하고 간이 `account-workspace__ready`가 사용되지 않음을 검증했다.
- [x] S2: 서버가 허용한 `Cherry Note`와 `OUTCOME`만 기존 사이드바에서 전환되며 계정 전용 snapshot 밖의 프로젝트는 나타나지 않는다.
  PROVES: authorization
  CHECK: `npm run test:account-access`
  EXPECT: exit 0
  EVIDENCE: sealed store가 workspace envelope와 project projection 모두 동일한 허용 ID `cherry-note`, `outcome` 두 개만 반환하도록 검증했고 browser test가 sidebar project controls `2`, project switch와 선택 표시를 확인했다.
- [x] S3: 로그인·권한 확인·거부 화면은 프로젝트 payload 없이 유지되고 기존 public API 폐쇄와 mutation deny가 회귀하지 않는다.
  PROVES: privacy
  CHECK: `npm run test:security`
  EXPECT: exit 0
  EVIDENCE: `npm run test:security`가 `29/29`, prohibited disclosure `0`, client sealed payload leak `0/6`으로 통과했다. 익명 legacy route `6/6`에서 public dashboard request `0`, project control `0`, dashboard surface `0`을 확인했다.
- [x] S4: 데스크톱은 고정 좌측 사이드바, 모바일은 메뉴 버튼으로 여는 동일 사이드바를 제공하며 Phase→Scope→Stage→Gate 탐색과 실제 현재/선택 위치가 유지된다.
  PROVES: responsive_ux
  CHECK: `npm run test:account-access-browser`
  EXPECT: exit 0
  EVIDENCE: `npm run test:account-access-browser`가 1440×900, 390×844, 375×812에서 기존 shell sidebar, project journey, current hierarchy, project switch, logout, touch `>=44`, ready horizontal overflow `0`으로 통과했다. desktop 고정 sidebar와 mobile drawer screenshot을 직접 확인했다.
- [x] S5: exact Preview 배포에서 로그인 owner의 기존 셸·프로젝트 2개·모바일 overflow 0을 확인하고 Production은 변경하지 않는다.
  PROVES: hosted_preview
  EVIDENCE: Preview `dpl_GR4dsqRxy6ghSp71sXiQnX1gqvKP`가 commit `f13b651d942e1e9a2bd1930a4848361d7b22ab56`, tree `30ab42a4f16b52db81c0c8ede5a87ab0156b9b3d`, assets `index-BQhQu5vc.js`와 `index-BO9aiaa4.css`로 `READY`다. 안정 별칭의 실제 Chrome owner session에서 `.oc-dashboard=1`, `.oc-global-nav=1`, `.oc-outcome-map=1`, project controls `2`, overflow `0`을 확인했다. Production은 private config `enabled=false`, 기존 assets `index-B_ICbkfO.js`, `index-t6iIeZVW.css`로 불변이다.

ABANDON: Production 전환, Supabase, Clerk 설정 변경, DNS/domain, release는 이 수정 범위가 아니다.
