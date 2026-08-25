# Phase 2 · Account Access Hosted Preview Preparation Gates

Outcome: Cherry가 실제 Google·Apple 로그인 검수를 선택할 경우, product-code 준비와 외부 provider/resource/secret mutation을 서로 섞지 않고 승인·구현·검증·롤백할 수 있는 exact 실행 계약을 준비한다.

- [x] H1: 현재 배포가 실제 외부 로그인과 호스팅 데이터베이스를 제공하지 못하는 이유를 코드 근거로 명시한다.
  CHECK: rg -q 'api/index.mjs.*private config.*hard-coded disabled' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q 'no Clerk or Supabase runtime SDK' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && echo H1_PASS
  EXPECT: H1_PASS
  EVIDENCE: H1_PASS
- [x] H2: 자격증명 없는 구현 준비와 외부 자원 변경을 별도 승인 단위로 나눈다.
  CHECK: rg -q 'HP0 · credential-free code readiness' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q 'HP1 · development identity preview' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q 'HP2 · hosted data preview' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q 'HP3 · production enablement' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && echo H2_PASS
  EXPECT: H2_PASS
  EVIDENCE: H2_PASS
- [x] H3: 각 외부 변경 단위가 정확한 생성 대상, 비밀정보, 검증 영수증, 비용·도메인·소유자 경계와 되돌리기 절차를 가진다.
  CHECK: rg -q '## Mutation inventory and receipts' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q '## Secret inventory' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q '## Rollback contract' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && echo H3_PASS
  EXPECT: H3_PASS
  EVIDENCE: H3_PASS
- [x] H4: 직접 검수와 독립 검증 순서가 기존 Cherry 승인, 출시, 페이즈 완료를 우회하지 않는다.
  CHECK: rg -q 'fresh UX & Product QA' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q 'separate fresh Release Audit' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_AUTHORIZATION.md && echo H4_PASS
  EXPECT: H4_PASS
  EVIDENCE: H4_PASS
- [x] H5: 현재 결과 지도는 Cherry 승인을 유지하고 다음 경계를 호스팅 미리보기 외부 변경 승인 결정으로 명시한다.
  CHECK: rg -q 'Current: `outcome-phase-2 / outcome-phase-2-account-service / outcome-stage-account-access-cherry-acceptance' docs/OUTCOME_MAP.md && rg -q 'hosted-preview external-mutation authorization decision' docs/OUTCOME_MAP.md && rg -q '`EXTERNAL_OUTCOME_COMPLETE`: false' docs/OUTCOME_MAP.md && echo H5_PASS
  EXPECT: H5_PASS
  EVIDENCE: H5_PASS
- [x] H6: 준비 문서와 구현 인계는 비밀값·개인 식별자·외부 자원 생성·인증 제공자 활성화·배포·출시를 수행하지 않는다.
  CHECK: test -f docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_BUILDER_HANDOFF.md && test -f GATES_PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_CODE_READINESS.md && rg -q 'NO_EXTERNAL_MUTATION' docs/PHASE2_ACCOUNT_ACCESS_HOSTED_PREVIEW_BUILDER_HANDOFF.md && git diff --check && echo H6_PASS
  EXPECT: H6_PASS
  EVIDENCE: H6_PASS

ABANDON: Clerk/Google/Apple/Supabase/Vercel resource creation, paid-plan purchase, secret entry, OAuth consent publication, domain or DNS change, private-surface enablement, production data, deployment, release, Cherry acceptance, Phase 2 completion and `EXTERNAL_OUTCOME_COMPLETE` are not authorized by this preparation Gate.
