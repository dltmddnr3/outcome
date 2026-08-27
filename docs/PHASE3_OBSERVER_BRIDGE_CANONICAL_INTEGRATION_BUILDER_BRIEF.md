# Phase 3 · Observer Bridge Canonical Integration · Builder Brief

Status: `LOCAL INTEGRATION AUTHORIZED / EXTERNAL MUTATION FORBIDDEN`

## Exact inputs

- Canonical session-binding source: `b8359691013501690a021709b974e463def6eea4`
- Canonical source tree: `0d1787209a44f061b39124e1dd71f6876d4b75ef`
- Planner handoff pin: dispatch 시 이 문서를 포함한 exact commit·tree를 고정하고 Builder `STARTED`에서 되읽는다.
- Audited Observer Bridge carrier: `d6d4d66759faa29d3e2ead9a12b38a7ab9a19344`
- Audited carrier tree: `49c49facb03f130ba48a7d69476bb5211321fa0b`
- Audited carrier parent: `de6dfe3bb89e0ae80de774b73567723e7ae8df9b`
- Fresh QA verdict: `PASS_INDEPENDENT_QA_ONLY`
- Fresh Release Audit verdict: `PASS_RELEASE_AUDIT_ONLY`

Builder는 새 isolated clean worktree에서 Planner handoff commit을 첫 parent로, audited carrier를 둘째 parent로 갖는 명시적 merge commit을 만든다. 자동 merge가 충돌 없이 성립하더라도 결과를 완료로 추정하지 않고 두 계보의 회귀를 함께 실행한다.

## Allowed work

1. 두 exact input 계보의 merge.
2. 실제 merge 충돌이 있다면 의미 보존에 필요한 최소 conflict resolution.
3. `GATES_PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION.md` evidence 갱신.
4. `docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md` 신규 작성.
5. 검증 결과를 담은 별도 receipt carrier commit.

충돌이 없으면 제품 코드를 추가 수정하지 않는다. 테스트 실패가 나타나면 즉시 `SAFE_HOLD_INTEGRATION_REGRESSION`으로 중단하고 실패 명령·첫 실패·정확한 tree와 dirty state만 기록한다. 인접 refactor, dependency 변경, 새 migration, Supabase driver, environment wiring, runtime enablement는 금지한다.

## Required verification

- integration Gate checker와 각 `CHECK`의 실제 실행
- session-binding 집중 회귀
- Observer Bridge API/hosted/runtime/Postgres/operations/stable-host 회귀
- full Node/frontend/build
- security/public/mutation/scope/runbook/public-boundary 검사
- diff에 credential, token, provider locator, private path 또는 raw session identifier가 없는지 확인
- final worktree clean

## Authority boundary

- Supabase 결제·프로젝트·database·migration apply·credential·environment 연결: `0`
- provider/session 실제 operation: `0`
- push/deploy/domain/DNS/release: `0`
- fresh QA·Release Audit·Cherry acceptance: Builder 권한 아님
- O2: `OPEN/LOCKED`
- Phase 3: `17/43`, 승격 금지
- `EXTERNAL_OUTCOME_COMPLETE=false`

Rollback은 integration receipt carrier를 먼저 revert하고, 그다음 merge commit을 revert하는 로컬 Git 절차로 한정한다. 외부 상태가 없으므로 외부 rollback도 없다.
