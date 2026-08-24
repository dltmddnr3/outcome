# Phase 2 · Account Access Definition · Planning Gates

Outcome: 계정 기능을 구현하기 전에 현재 공개 snapshot 경계, 추천 v1 사용자 범위, 권한·데이터·운영 경계와 Cherry 결정 항목을 Builder가 추정할 수 없는 계약으로 만든다.

- [x] L1: 현재 고정 공개 snapshot과 등록형 Package 포트폴리오의 완료 근거 및 비목표를 계약 입력으로 고정한다.
  CHECK: `rg -q 'fixed public snapshot' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && rg -q 'live session relay' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`
  EXPECT: exit 0
  EVIDENCE: contract의 Current inherited truth가 fixed public snapshot, 2개 실제 등록, 3-project fixture capability와 live relay/dispatch 비목표를 분리하며 L1_PASS.
- [x] L2: 추천 v1 사용자·로그인·프로젝트 가시성 경계와 대안이 명시되고 추정 진행을 금지한다.
  CHECK: `rg -q 'Cherry-only private workspace' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && rg -q 'multi-tenant' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`
  EXPECT: exit 0
  EVIDENCE: Cherry-only private workspace를 추천하고 general multi-tenant service를 승인 후 별도 Stage로 분리하며 L2_PASS.
- [x] L3: tenant isolation, session, CSRF, secret, privacy, deletion/export, audit와 fail-closed 요구가 Gate로 추적된다.
  CHECK: `rg -q 'tenant isolation' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md && rg -q 'deletion/export' GATES_PHASE2_ACCOUNT_ACCESS_DEFINITION.md`
  EXPECT: exit 0
  EVIDENCE: K2-K4와 security/privacy contract가 server-derived workspace, cross-workspace negative test, session, CSRF, secret, deletion/export, audit와 fail-closed를 요구하며 L3_PASS.
- [x] L4: 저장·collector·snapshot freshness·migration·backup/restore·observability와 비용 경계가 구현 전 결정 항목으로 분리된다.
  CHECK: `rg -q 'backup/restore' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md && rg -q 'cost ceiling' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`
  EXPECT: exit 0
  EVIDENCE: contract가 durable ownership, freshness, migration, backup/restore, observability, incident response, region과 cost ceiling을 구현 전 결정으로 분리하며 L4_PASS.
- [x] L5: Map은 완료된 portfolio foundation 다음 Stage를 account access definition으로 등록하고 Phase 1 owner acceptance를 병렬 open으로 보존한다.
  CHECK: `rg -q 'outcome-stage-account-access-definition' docs/OUTCOME_MAP.md && rg -q 'Phase 1 owner-only closure boundary C1-C2 remains open' docs/OUTCOME_MAP.md`
  EXPECT: exit 0
  EVIDENCE: Map next가 `outcome-stage-account-access-definition`이고 C1-C2 owner-only closure boundary는 병렬 open으로 보존되며 L5_PASS.
- [x] L6: 계정 구현·provider 설치·secret 생성·외부 mutation은 Cherry의 계약 결정 전 시작하지 않는다고 명시한다.
  CHECK: `rg -q 'NO_ACCOUNT_IMPLEMENTATION_BEFORE_CHERRY_DECISION' docs/PHASE2_ACCOUNT_ACCESS_CONTRACT.md`
  EXPECT: exit 0
  EVIDENCE: exact decision boundary `NO_ACCOUNT_IMPLEMENTATION_BEFORE_CHERRY_DECISION`과 Builder K1-K6 entry condition이 명시됐으며 L6_PASS.
