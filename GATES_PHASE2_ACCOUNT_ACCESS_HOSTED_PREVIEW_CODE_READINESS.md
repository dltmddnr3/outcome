# Phase 2 · Account Access Hosted Preview Code Readiness Gates

Outcome: 별도 external mutation 없이 Clerk/Supabase hosted preview를 안전하게 연결할 수 있는 credential-free product candidate를 만들고, default/public production은 계속 private-disabled로 유지한다.

- [x] B1: 완전한 환경 계약에서만 비공개 연결기를 선택하고 누락되거나 불완전한 설정은 동일한 비활성·401 상태로 차단한다.
  PROVES: implementation
  EVIDENCE: `server/account-access-hosted.test.mjs` least-privilege complete/partial/flag-off matrix 7/7 PASS; unused Supabase secret is not an activation binding; default config disabled, workspace 401, mutation 405.
- [x] B2: 클러크 연결기가 기준 소유자 확인, 구글·이메일 코드 시작, 인증 후 애플 연결만 허용, 로그아웃, 만료, 철회와 인증 제공자 장애를 구현한다.
  PROVES: implementation
  EVIDENCE: credential-free provider boundary test covers canonical owner, wrong owner, expired, revoked, Google/email, authenticated Apple link, logout/revoke, outage and hostile redirect denial.
- [x] B3: 호스팅 저장소 연결기가 서버에서 정한 작업공간·프로젝트 범위, 두 프로젝트 허용 목록과 기본 거부 오류 처리를 보존한다.
  PROVES: security
  EVIDENCE: hosted store and REST gateway tests preserve server-derived scope, exactly two allowed Package IDs, verified bearer context and fail-closed store/RLS errors.
- [x] B4: 버셀 비공개 통신 연결이 명시적 활성화 표식과 완전한 연결값 뒤에서만 동작하고 공개 조회·405·가림·영수증 계약을 바꾸지 않는다.
  PROVES: security
  EVIDENCE: hosted handler tests 7/7 include thrown/null/malformed runtime fail-closed proof; security 28/28, mutation 32/32=405, public prohibited identifiers=0; default export remains private-disabled without a separately supplied real adapter.
- [x] B5: 맥북·모바일 로그인, 불러오는 중, 준비, 로그아웃, 거부, 만료, 철회, 이용 불가 상태가 자격증명 없는 시험 연결기로 검증되며 실제 외부 로그인으로 표시되지 않는다.
  PROVES: test
  EVIDENCE: account browser 3 viewports × 9 settled states plus loading/ready journeys PASS; 200% zoom overflow=0; existing UI identifies the injected transition as not real OAuth.
- [x] B6: 집중 실패 우선, 계정, 전체 화면·서버, 브라우저, 안정 호스트, 보안, 변경 거부, 정보 가림, 범위, 운영 절차와 빌드 검사가 모두 통과한다.
  PROVES: test
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS_EVIDENCE.md` final verification matrix; all required local suites PASS.
- [x] B7: 정확한 기준·후보 커밋과 트리, 의존성 근거, 환경 이름 목록, 적용·되돌리기, 결과 건수와 한계가 변경 불가 증거에 기록된다.
  PROVES: evidence
  EVIDENCE: `docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS_EVIDENCE.md`; candidate commit/tree/asset resolved post-commit in Builder handoff.
- [x] B8: 상위 검증자의 재검증 후 결과가 코드 준비만 완료로 끝나며 HP1 외부 변경, 독립 검수, 출시 감사, Cherry 승인, 출시와 페이즈 완료를 주장하지 않는다.
  PROVES: evidence
  EVIDENCE: Parent independently verified exact candidate `da490c27486859b0ea72da085d0295ca2629962a`, tree `74aa4dd89a01bd0bff47ffb2b8bd1918df046a9e`: hosted boundary 7/7; account Node 25/25 + UI/API 7/7; frontend 66/66 + Node 104/104; security 28/28; account browser 3 viewports × 9 states; generic/stable browser 4 viewports; mutations 32/32=405; prohibited identifiers 0; scope/runbook and isolated/Vercel builds PASS. Result is `CODE_READY_ONLY`; no HP1 external mutation, QA/Audit verdict, Cherry acceptance, release or completion was claimed.
- [ ] B9: HP1 개발 인증 실행 경계는 수파베이스 환경값이나 저장소 없이 선택 가능하고, HP2 전까지 비공개 작업공간 데이터 조회는 계속 차단된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] B10: 실제 버셀 진입점은 완전한 HP1 환경 계약에서만 구체 인증 실행기를 선택하며 기본·부분 설정·실행기 오류는 비활성·401로 동일하게 닫힌다.
  PROVES: security
  EVIDENCE: pending
- [ ] B11: 구글·이메일 코드 시작, 인증 후 애플 연결만 허용, 콜백, 로그아웃, 만료·철회, 다른 소유자 거부, 출처 제한과 제공자 장애가 자격증명 없는 계약 시험으로 검증된다.
  PROVES: test
  EVIDENCE: pending
- [ ] B12: 전체 회귀·브라우저·보안·변경 거부·정보 가림·빌드와 상위 재검증이 통과하고 결과가 인증 코드 준비만 완료로 끝난다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Clerk/Google/Apple/Supabase/Vercel account, resource, secret, environment, provider, domain, DNS, paid plan, deployment, release 또는 production data mutation은 이 Gate 범위가 아니다.
