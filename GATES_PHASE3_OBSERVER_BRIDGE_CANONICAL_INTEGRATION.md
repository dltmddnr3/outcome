# OUTCOME Phase 3 · Observer Bridge Canonical Integration Gates

Outcome: 현재 canonical session-binding 계보와 검증 완료된 Observer Bridge 계보를 clean worktree에서 결합하고, 두 계보의 의미·테스트·증거를 보존한 로컬 integration candidate만 만든다.

- [ ] I1: Builder가 정확한 Planner handoff source와 두 입력 계보를 고정한다.
  CHECK: test "$(git show -s --format=%P HEAD | wc -w | tr -d ' ')" = "2" && test "$(git show -s --format=%P HEAD | cut -d' ' -f2)" = "d6d4d66759faa29d3e2ead9a12b38a7ab9a19344" && git merge-base --is-ancestor b8359691013501690a021709b974e463def6eea4 "$(git show -s --format=%P HEAD | cut -d' ' -f1)" && git cat-file -e "$(git show -s --format=%P HEAD | cut -d' ' -f1):docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_BRIEF.md"
  EXPECT: exact two-parent integration carrier
  EVIDENCE: pending

- [ ] I2: merge는 충돌·삭제·수동 history 재작성 없이 두 계보를 보존한다.
  CHECK: git merge-base --is-ancestor b8359691013501690a021709b974e463def6eea4 HEAD && git merge-base --is-ancestor d6d4d66759faa29d3e2ead9a12b38a7ab9a19344 HEAD && test -z "$(git ls-files -u)"
  EXPECT: both histories reachable and unmerged index empty
  EVIDENCE: pending

- [ ] I3: session-binding과 Observer Bridge의 집중 회귀가 모두 통과한다.
  CHECK: npm test
  EXPECT: full configured test command exits 0
  EVIDENCE: pending

- [ ] I4: production build와 security/public/mutation boundary 검사가 통과한다.
  CHECK: npm run build && npm run test:security && npm run test:public && npm run check:mutations
  EXPECT: all commands exit 0
  EVIDENCE: pending

- [ ] I5: Supabase/provider/runtime activation은 계속 disabled이며 dependency·migration·environment·secret 변경이 없다.
  CHECK: first_parent="$(git show -s --format=%P HEAD | cut -d' ' -f1)"; git diff --name-only "$first_parent"..HEAD | rg -v '^(GATES_PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION.md|docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_BRIEF.md|docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md)$' | while read -r path; do git diff --name-only b8359691013501690a021709b974e463def6eea4..d6d4d66759faa29d3e2ead9a12b38a7ab9a19344 -- "$path" | rg -q . || exit 1; done
  EXPECT: no integration-only product, dependency, migration, environment, or secret path
  EVIDENCE: pending

- [ ] I6: Builder receipt가 exact parents/tree, measured checks, dirty state, rollback, external mutation 0을 기록한다.
  CHECK: test -f docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md && rg -q 'external mutations: `0`' docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md && rg -q 'O2.*OPEN/LOCKED' docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md && rg -q 'EXTERNAL_OUTCOME_COMPLETE=false' docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md
  EXPECT: immutable local-only integration evidence
  EVIDENCE: pending

- [ ] I7: fresh QA, fresh Release Audit, Cherry acceptance, push/deploy/release와 진행률 승격은 열린 상태다.
  CHECK: rg -q 'Fresh QA.*OPEN' docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md && rg -q 'Release Audit.*OPEN' docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md && rg -q 'Phase 3 remains `17/43`' docs/PHASE3_OBSERVER_BRIDGE_CANONICAL_INTEGRATION_BUILDER_RECEIPT.md
  EXPECT: no self-promotion or completion claim
  EVIDENCE: pending

ABANDON: 이 Gate는 로컬 canonical integration candidate만 허용한다. push, deploy, Supabase·provider·billing·database·environment·secret·runtime mutation, fresh QA/Audit 자체 수행, Cherry acceptance, O2 closure, Phase 3 progress promotion, release 또는 `EXTERNAL_OUTCOME_COMPLETE` 변경은 포함하지 않는다.
