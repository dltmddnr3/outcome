# Phase 2 · 모바일 플로팅 겹침 교정 Gates

Outcome: 모바일 프로젝트 여정의 진행률·제목·`현재 단계 보기`가 고정 플로팅되지 않고 문서 흐름 안에서 작업 단계와 겹치지 않는다.

- [x] M1: 759px 이하에서 hierarchy wrapper는 `static`이며 sticky/fixed가 아니다.
  CHECK: node --test scripts/browser-assertions.test.mjs
  EXPECT: pass
  EVIDENCE: 2026-08-26 19/19 pass; CSS contract and fail-closed position/overlap assertions passed.
- [x] M2: 모바일 스크롤 상태에서 `현재 단계 보기`와 보이는 Phase/Scope/Stage option 교차가 0이다.
  CHECK: npm run test:account-access-browser
  EXPECT: exit 0
  EVIDENCE: 2026-08-26 account-ready 390x844 and 375x812 computed position=static, visible option overlap=0, horizontal overflow=0.
- [x] M3: 버튼 기능·44px 터치 영역·현재/탐색 구분과 데스크톱 hierarchy는 유지된다.
  CHECK: npm test
  EXPECT: exit 0
  EVIDENCE: 2026-08-26 frontend 78/78, Node 112/112, security 29/29, stable-host build 9/9; account browser touch>=44 and project switching preserved.
- [ ] M4: exact Preview 배포에서 모바일 overflow 0과 플로팅 교차 0을 실측한다.
  EVIDENCE: pending

ABANDON: 인증·데이터·Phase/Gate 의미, Production, Supabase, DNS·도메인, 출시와 `EXTERNAL_OUTCOME_COMPLETE`는 이 교정 범위가 아니다.
