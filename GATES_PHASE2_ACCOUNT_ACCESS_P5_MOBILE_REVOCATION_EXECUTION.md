# Phase 2 · P5 모바일 운영자 세션 철회 실행 Gates

Outcome: 승인된 Clerk Development 모바일 검수 세션 하나의 철회 실행을 민감정보 없이 고정하고, 제품 화면·401·재로그인 복구 전에는 실기기 PASS와 P5 수치를 올리지 않는다.

- [x] R1: exact source·tree·Preview와 실행 전 P5 `10/19`가 영수증에 고정된다.
  PROVES: evidence
  CHECK: rg -q 'source commit: `4613372adbec17e35c2498e55ab4210cc8b33c34`' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && rg -q 'source tree: `293e64b76e9e5b3b1ebf1e5d5ca5f6a7180eefee`' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && rg -q 'pre-execution P5 matrix: `10/19`' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && echo R1_PASS
  EXPECT: R1_PASS
  EVIDENCE: current source commit/tree와 READY Preview deployment, 실행 전 P5 `10/19`를 고정했다.
- [x] R2: 승인된 Development 모바일 검수 세션 하나만 철회되고 대상 외 세션은 유지된다.
  PROVES: external_mutation
  EVIDENCE: Clerk Dashboard 직접 관측에서 실행 전 모바일 활성 행 `1`, 단일 `Revoke device` 확인창 제출 뒤 모바일 활성 행 `0`; 데스크톱 활성 행은 실행 전후 `2`로 유지됐다. 전체 기기 철회는 실행하지 않았다.
- [x] R3: 제품 화면·401·재로그인 복구가 관측 전 상태로 명시되고 실기기 PASS로 승격되지 않는다.
  PROVES: progress_integrity
  CHECK: rg -q 'USER OBSERVATION AND RECOVERY PENDING' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && rg -q 'P5 수치는 `10/19`로 유지' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && rg -q '관측·복구 대기' docs/PHASE2_ACCOUNT_ACCESS_P5_DEVICE_MATRIX.md && echo R3_PASS
  EXPECT: R3_PASS
  EVIDENCE: 만료 화면, private API `401`, 새 로그인 `200/200` 세 조건을 모두 미증명으로 기록하고 행렬 수치를 유지했다.
- [x] R4: 실행 영수증에 계정·credential·raw identifier가 없다.
  PROVES: privacy
  CHECK: test "$(rg -n '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b(?:sk|pk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]+\b|/Users/|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md | wc -l | tr -d ' ')" = 0 && echo R4_PASS
  EXPECT: R4_PASS
  EVIDENCE: email·credential·local path·UUID·IPv4 targeted scan `0`; raw Clerk identifier와 secret을 문서에 복사하지 않았다.
- [x] R5: 문서 변경이 현재 제품·보안·공개 경계 회귀를 만들지 않는다.
  PROVES: test
  CHECK: git diff --check && npm run test:package-model && npm run test:account-access && npm run test:security
  EXPECT: exit 0
  EVIDENCE: `git diff --check` PASS; Package model `39/39`; focused account access Node `32/32` + frontend `26/26`; security `29/29`; full frontend `86/86` + Node `112/112`; isolated build PASS; scope/runbook PASS; stable snapshot prohibited disclosure `0`, Gate evidence fields `0`; client environment boundary leaks `0/6`.
- [x] R6: 철회 실행은 상위 완료·추가 외부 변경 권한으로 승격되지 않는다.
  PROVES: boundary
  CHECK: rg -q 'P5 수치는 `10/19`로 유지' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE.*닫지 않는다' docs/PHASE2_ACCOUNT_ACCESS_P5_MOBILE_REVOCATION_RECEIPT.md && echo R6_PASS
  EXPECT: R6_PASS
  EVIDENCE: P5·HP1·HP2·QA·Audit·Cherry acceptance·Production·Phase 2와 external completion을 명시적으로 열어 뒀다.

ABANDON: 이 실행 Gate는 모바일 제품 화면·API 상태·재로그인 복구를 대신 판정하지 않는다. 제공자 장애·세션 만료·다른 기기 철회와 Production·Vercel·Supabase 변경은 별도 승인 전 실행하지 않는다.
