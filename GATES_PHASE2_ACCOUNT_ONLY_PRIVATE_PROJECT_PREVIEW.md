# Phase 2 · Account-only Private Project Preview Gates

Outcome: OUTCOME과 Cherry Note를 Cherry 계정의 비공개 프로젝트로 이동하고, 로그인 전에는 프로젝트 데이터가 전혀 없는 Preview를 만든다.

- [x] N1: Cherry가 공개 대시보드 제품 모드를 폐기하고 계정별 허용 프로젝트만 제공하는 경계를 승인한다.
  PROVES: cherry_decision
  EVIDENCE: `2026-08-26 KST` Cherry가 `사실 공개 대시보드라는 기준은 없고 계정별 프로젝트만 있는거지`라고 제품 의미를 교정한 뒤, 제시된 Private Snapshot Preview 범위에 `승인`했다. 승인은 Preview 제품·코드·배포에 한하며 Production·Supabase·Clerk 설정·DNS/domain·release는 포함하지 않는다.
- [x] N2: 로그인 전 HTML, route와 API에는 프로젝트 이름·Package·NOW·Gate·hierarchy payload가 없고 기존 대시보드 URL은 로그인 진입점으로 수렴한다.
  PROVES: privacy
  CHECK: `npm run test:security`
  EXPECT: exit 0
  EVIDENCE: `npm run test:security`가 `29/29` Node assertion, stable snapshot `2 projects`, client sealed payload leak `0/6`으로 통과했다. `npm run test:account-access-browser`는 1440×900·390×844에서 `/`, `/cherry-note-dashboard`, `/workspace` 총 `6/6`을 동일 로그인 진입점으로 확인했고 public project API 요청 `0`, 렌더된 project control `0`, dashboard surface `0`, horizontal overflow `0`을 측정했다.
- [x] N3: 인증된 canonical Cherry owner는 서버가 결정한 membership으로 `OUTCOME`과 `Cherry Note` 정확히 두 프로젝트만 읽는다.
  PROVES: authorization
  CHECK: `npm run test:account-access`
  EXPECT: exit 0
  EVIDENCE: `npm run test:account-access`가 Node `32/32`와 frontend `17/17`을 통과했다. exact server-owned sealed store는 등록 수 `2`, 중복 없는 `cherry-note`·`outcome`만 허용하며 canonical owner의 cookie/Bearer workspace 응답 모두 project IDs가 정확히 두 개임을 검증했다.
- [x] N4: 익명·다른 owner·만료·철회·위조 project selector는 프로젝트 존재를 노출하지 않고 거부되며 모든 write는 405 또는 database deny다.
  PROVES: security
  CHECK: `npm run test:account-access`
  EXPECT: exit 0
  EVIDENCE: account-access 회귀에서 익명 `401`, 다른 owner `403`, 만료·철회 `401`, provider outage `503`, query selector `/api/private/workspace?project=forged` `404`를 확인했다. identity-enabled `/api/dashboard`와 `/api/dashboard/cherry-note`는 runtime 생성 실패 시에도 `404 not_found`, public/private mutation은 `405 read_only`로 유지된다.
- [x] N5: 비공개 프로젝트 snapshot은 서버에서만 읽고 client bundle, public asset, public API 또는 fallback payload로 복제되지 않는다.
  PROVES: source_boundary
  CHECK: `npm run test:client-env-boundary`
  EXPECT: exit 0
  EVIDENCE: `npm run test:client-env-boundary`가 합성 Vercel metadata leak `0`, sealed Package payload leak `0/6`, client allowlist copy leak `0`으로 통과했다. snapshot은 serverless 전용 `api/deployment-snapshot.mjs`에서 sealed store로만 주입되며 anonymous dashboard API fallback은 없다.
- [x] N6: 인증된 workspace에서 프로젝트 전환과 `Project → Phase → Scope → Stage → Gate`, 실제 현재 위치와 선택 위치가 desktop/mobile에서 유지된다.
  PROVES: product_ux
  CHECK: `npm run test:account-access-browser`
  EXPECT: exit 0
  EVIDENCE: `npm run test:account-access-browser`가 1440×900·390×844·375×812에서 project controls `2`, hierarchy `페이즈|범위|스테이지|완료 조건`, actual-current `3`, project switch, actual-vs-selected 분리, touch target `>=44`, horizontal overflow `0`, mobile 200% zoom overflow `0`으로 통과했다.
- [ ] N7: exact Preview candidate가 배포되고 로그인 owner `2 projects`, 익명 `0 project payload`, Production 불변과 rollback이 비민감 영수증으로 고정된다.
  PROVES: hosted_preview
  EVIDENCE: pending

ABANDON: Production 전환, Supabase, Clerk 설정 변경, DNS/domain, 새 사용자·프로젝트 생성, release, Phase 2 완료와 `EXTERNAL_OUTCOME_COMPLETE`는 이 Stage 범위가 아니다.
