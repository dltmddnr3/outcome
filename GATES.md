# OUTCOME documentation bootstrap gates

Outcome: A fresh OUTCOME session can understand the product, its evidence, its current MVP boundary, and the Planner → Builder → QA → Release Audit workflow without relying on this chat history.

- [x] D1: The product Outcome Contract and non-goals are explicit.
  CHECK: test -s docs/OUTCOME_CONTRACT.md && rg -q "완료 조건" docs/OUTCOME_CONTRACT.md && rg -q "하지 않는 것" docs/OUTCOME_CONTRACT.md && echo D1_PASS
  EXPECT: D1_PASS
  EVIDENCE: D1_PASS

- [x] D2: Project → Phase → Scope → Stage → Gate semantics are defined without treating every layer as the same kind of progress.
  CHECK: test -s docs/PRODUCT_MODEL.md && rg -q "Project → Phase → Scope → Stage" docs/PRODUCT_MODEL.md && rg -q "Gate" docs/PRODUCT_MODEL.md && echo D2_PASS
  EXPECT: D2_PASS
  EVIDENCE: D2_PASS

- [x] D3: Canonical evidence sources, precedence, freshness, and privacy boundaries are recorded.
  CHECK: test -s docs/SOURCE_OF_TRUTH.md && rg -q "우선순위" docs/SOURCE_OF_TRUTH.md && rg -q "민감" docs/SOURCE_OF_TRUTH.md && echo D3_PASS
  EXPECT: D3_PASS
  EVIDENCE: D3_PASS

- [x] D4: Planner, Builder, UX/Product QA, and Release Audit responsibilities and handoff boundaries are explicit.
  CHECK: test -s docs/OPERATING_MODEL.md && rg -q "Planner" docs/OPERATING_MODEL.md && rg -q "Release Audit" docs/OPERATING_MODEL.md && echo D4_PASS
  EXPECT: D4_PASS
  EVIDENCE: D4_PASS

- [x] D5: The current implementation location, current Cherry Note milestone, known drift, and exact next actions are recorded honestly.
  CHECK: test -s docs/CURRENT_STATE.md && rg -q "WhiteCastle Desk 2" docs/CURRENT_STATE.md && rg -q "Stage 33" docs/CURRENT_STATE.md && echo D5_PASS
  EXPECT: D5_PASS
  EVIDENCE: D5_PASS

- [x] D6: The roadmap separates MVP extraction from later multi-project and multi-device expansion.
  CHECK: test -s docs/ROADMAP.md && rg -q "MVP" docs/ROADMAP.md && rg -q "여러 프로젝트" docs/ROADMAP.md && rg -q "다른 PC" docs/ROADMAP.md && echo D6_PASS
  EXPECT: D6_PASS
  EVIDENCE: D6_PASS

- [x] D7: README gives a new session one clear entrypoint and the repository contains no copied product implementation yet.
  CHECK: test -s README.md && test -z "$(find . -path './.git' -prune -o -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \) -print -quit)" && echo D7_PASS
  EXPECT: D7_PASS
  EVIDENCE: D7_PASS
