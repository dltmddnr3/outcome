# Phase 2 · Hosted Identity Preview Gates

Outcome: Cherry가 승인한 개발 환경에서 정확히 한 명의 canonical owner가 Google·email code로 로그인하고 Apple을 연결한 뒤 MacBook/mobile에서 로그인·로그아웃·거부·복구를 직접 검수한다.

- [x] P1: Cherry가 HP1의 정확한 외부 변경 범위를 명시적으로 승인한다.
  PROVES: cherry_decision
  EVIDENCE: `2026-08-25 KST` Cherry가 직전 제시된 정확한 문구—`HP1 개발 인증 외부 변경 승인: Clerk Development + Vercel Preview만 허용. Production, Supabase, DNS·도메인, 출시 변경은 금지.`—에 직접 `승인`으로 응답했다. 허용 범위는 Clerk Development와 Vercel Preview뿐이며 Production·Supabase·DNS·도메인·출시는 미승인이다.
- [x] P2: 클러크 개발 환경이 초대 전용·단일 소유자·조직 및 임의 가입 없음으로 생성되고 민감정보를 가린 영수증이 고정된다.
  PROVES: security
  EVIDENCE: `2026-08-25 KST` Clerk `Development`에서 `Invite-only`, 조직 기능 비활성, Google 개발 공용 연결, email code 활성, Apple 직접 로그인 비활성, 수락된 사용자 정확히 1명과 대기 초대 0건을 브라우저로 재관측했다. Cherry가 승인한 instant rollback 후 공개 Production은 `9cbf834196e3982a7822c422a9a9b18a74d66692` / `d33a2cf61157c369e4121f4e38fd3ada97a24038` / `index-B_ICbkfO.js`로 복구됐고 SHA-256 `54d268338617ff60bf341ec9663905985420a851a3c0ab4c3643991a51b7f7b0`, 화면/API `200`, mutation `405/405/405/405`, 금지 Clerk 식별자 탐지 `0`을 직접 재검증했다. 이메일·사용자·애플리케이션·인스턴스 식별자와 키 값은 기록하지 않았다. 상세: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RECEIPT.md`.
- [x] P3: 구글 공용 개발 로그인, 이메일 코드 대체 경로, 인증 후 애플 연결만 허용, 다른 사용자 거부와 권한 철회가 직접 검증된다.
  PROVES: implementation
  EVIDENCE: `2026-08-25 KST` Account Portal에서 Google 로그인과 새로고침 유지, 로그아웃 뒤 동일 소유자의 email code 로그인과 세션 유지, 인증된 Account 화면에서만 Apple 연결 후 사용자 `1`·social account `2` 유지, 로그아웃 sign-in 화면의 Apple 직접 로그인 비노출, 초대받지 않은 다른 Google 계정 시도의 일반 sign-in 복귀와 사용자 `1`·대기 초대 `0` 유지, Clerk 모든 기기 세션 철회 뒤 기존 Account Portal의 sign-in 강제를 직접 검증했다. 이메일·계정명·사진·사용자/세션/애플리케이션/인스턴스 식별자·OAuth/email code·토큰·쿠키는 영수증에 기록하지 않았다. 상세: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_IDENTITY_EXECUTION_RECEIPT.md`와 `docs/PHASE2_HOSTED_IDENTITY_P3_DIRECT_PROBE.md`.
- [x] P4: 버셀 미리보기 전용 연결값과 변경 불가 미리보기 배포가 생성되고 운영 주소와 설정은 비활성 상태를 유지한다.
  PROVES: evidence
  EVIDENCE: `2026-08-25 KST` Vercel 프로젝트의 기존 환경값 `0`건을 확인한 뒤 허용된 여섯 이름만 `Preview`에 추가하고 Production·Development 연결 `0`건을 재관측했다. 환경값 없는 되돌리기 Preview `dpl_BcXw6i4GWipQpszQaozZy93UbCXo`와 환경 변경 이후 후보 Preview `dpl_8LjkbN8B4YKf2u1Ezq9uPkyE55QE`는 모두 exact commit `270ff7be8420765f9324dccfcd754af37c794c2f`, target `Preview`, state `READY`로 고정됐다. 공개 Production은 `9cbf834196e3` / `d33a2cf61157` / `index-B_ICbkfO.js`, 화면/API `200/200`, mutation `32/32=405`, 공개 경계 금지 식별자 `0`으로 불변이었다. 여섯 값·이메일·사용자/세션/애플리케이션/인스턴스 식별자·키·토큰·쿠키는 문서나 Git에 기록하지 않았다.
- [ ] P5: 맥북과 모바일 시스템 브라우저에서 로그인·불러오는 중·준비·로그아웃·만료·철회·인증 제공자 장애 흐름이 실측된다.
  PROVES: test
  EVIDENCE: `2026-08-25 KST` MacBook Chrome의 Vercel Preview 전용 브랜치에서 Google 로그인 후 최초 서버 검증 실패를 직접 재현했다. Bearer 전달·JWT 형식·허용 출처·발급/만료 시간은 정상이었고 Clerk 공식 안전 사유는 `dev-browser-missing`이었다. 개발 브라우저 값을 URL·로그로 전달하지 않고 Clerk 공식 `verifyToken`에 secret key와 정확한 `authorizedParties`를 고정한 뒤 Sessions API의 활성 상태·사용자/세션 일치 검증을 유지한 후보 `8d666b27d3da902f41646b8a81d83f136ba9bc6e` / tree `cbc02ec6f7368ed5a41acdafb94aab24957dd68e`를 Preview `dpl_6YvStyfGRv2Tm7KFmwFxHbHp1MmK`에서 직접 재검증했다. `/api/private/session`은 `200`, HP2가 아직 미연결인 `/api/private/workspace`는 의도된 `503`이었고 화면은 접근 거부가 아닌 준비 안 됨 상태, 로그아웃 노출, 인증 후 Apple 연결 노출로 전환됐다. Builder 검증은 focused `5/5`, account server `30/30`, account UI/API `16/16`, frontend `75/75`, Node `109/109`, security `28/28`, stable-host `8/8`, 금지 공개 `0`이었다. `2026-08-26T08:19:27+09:00` 현재 후보 `64d58ef643acec74c65a89e293f0bfe9e1d67cda` / deployment `dpl_2VoNJzCykyky3vsKARXkAWprmZts`에서 이전 고정 배포 주소 사용 시 `401`과 비민감 진단 `azpMatchesConfiguredOrigin=false`, `token-invalid-authorized-parties`를 재현했다. 동일 Chrome 세션을 현재 허용된 브랜치 주소로 전환하자 권한 확인 중을 거쳐 전역 사이드바 `1`, 비공개 프로젝트 `2`, 결과 지도 `1`, 가로 넘침 `0`의 준비 상태가 확인됐다. `2026-08-26T08:27+09:00` 준비 상태에서 로그아웃 후 같은 `/workspace`의 로그인 화면, Google 버튼 `1`, 로그아웃 버튼 `0`, 비공개 프로젝트 `0`, 접근 거부 `0`을 확인했고 Google 계정 선택 화면까지 재로그인 전환도 확인했다. `2026-08-26 KST` callback 교정 후보 `aadac57a2997cf0512a5605c930417fdb1e06cae` / deployment `dpl_ChSioyuH3Wb1LsqD9UVYtVqJBoFV`에서 Cherry가 모바일 Google 로그인과 준비 화면 복귀를 직접 확인했고, 서버는 config `2`, session `1`, workspace `1`의 총 `4/4` 요청을 HTTP `200`으로 관측했다. 모바일 Google 로그인·콜백·불러오는 중·준비는 통과했지만 양쪽 브라우저의 email code·만료·철회·인증 제공자 장애, 모바일 로그아웃, 맥북 Google 재로그인 복구가 남아 있으므로 P5는 열려 있다.
  EVIDENCE_UPDATE: `2026-08-26 KST` Cherry가 모바일에서 로그아웃 뒤 Google 재로그인과 준비 화면 복귀를 직접 확인하고 `재로그인 p5 실기기 확인 완료`로 판정했다. 모바일 Google 로그인·콜백·불러오는 중·준비·로그아웃·재로그인 복구는 통과했다. email code·만료·철회·인증 제공자 장애와 맥북 잔여 행렬이 남아 있어 P5는 계속 열린 상태다.
- [ ] P6: 정확한 미리보기 후보, 인증 제공자·설정 이름, 민감정보를 가린 영수증, 비용, 되돌리기와 한계가 기록되고 HP2 외부 변경은 별도로 열려 있다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Supabase resource, production Clerk/Google/Apple credentials, paid plan, production env, custom domain/DNS, public release, Phase completion과 `EXTERNAL_OUTCOME_COMPLETE`는 HP1 범위가 아니다.
