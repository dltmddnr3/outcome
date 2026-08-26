# Phase 2 · 로그인 중 화면 단순화 Gates

Outcome: 인증 전환 중 사용자는 내부 권한·서버·완료 권한 진단 대신 명확한 로그인 진행 상태만 본다.

- [x] L1: loading 화면은 `로그인 중`과 짧은 대기 안내만 핵심 정보로 표시한다.
  CHECK: npm run test:dashboard
  EXPECT: exit 0
  EVIDENCE: `AccountWorkspace` loading 전용 surface와 frontend rendering test가 `로그인 중`·`잠시만 기다려 주세요.`를 확인했다.
- [x] L2: loading 화면에는 워크스페이스 제목, 권한 확인, 서버 진단, `completionAuthority=false`가 보이지 않는다.
  CHECK: npm run test:dashboard
  EXPECT: exit 0
  EVIDENCE: loading rendering test가 네 기술 문구의 visible text hit `0`을 확인했고, 세션이 남은 장기 지연에서는 `로그인 취소`만 복구 동작으로 보존했다.
- [x] L3: 상태 알림·동작 표시와 reduced-motion 접근성, 모바일 390×844·375×812 overflow 0을 유지한다.
  CHECK: npm run test:account-access-browser
  EXPECT: exit 0
  EVIDENCE: account browser가 1440×900·390×844·375×812 loading에서 aria-busy `true`, horizontal overflow `0`, technical copy hit `0`을 확인했다. 전체 frontend `79/79`, Node `112/112`, security `29/29`, build stable-host `9/9` 통과.
- [x] L4: 모바일 재로그인 실기기 확인은 P5에 기록하되 만료·철회·제공자 장애와 P5/P6 완료는 열어 둔다.
  EVIDENCE: `2026-08-26 KST` Cherry가 모바일 Google 재로그인 후 준비 화면 복귀를 `p5 실기기 확인 완료`로 확인했다. P5의 모바일 Google 로그인·로그아웃·재로그인 복구만 추가 통과이며 email code·만료·철회·provider 장애와 P5/P6 완료는 열린 상태다.

ABANDON: 이 교정은 인증 정책·provider·계정 데이터·Production·Supabase·P5/P6 완료·Phase 완료·`EXTERNAL_OUTCOME_COMPLETE`를 변경하지 않는다.
