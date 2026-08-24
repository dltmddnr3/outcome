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

- [x] R1: The approved three-document project input model is recorded.
  CHECK: rg -q "OUTCOME_CONTRACT.md" docs/OPERATING_MODEL.md && rg -q "OUTCOME_MAP.md" docs/OPERATING_MODEL.md && rg -q "GATES.*md" docs/OPERATING_MODEL.md && echo R1_PASS
  EXPECT: R1_PASS
  EVIDENCE: R1_PASS

- [x] R2: Four separate roles and session identity fields are recorded.
  CHECK: rg -q "Planner" docs/OPERATING_MODEL.md && rg -q "Builder" docs/OPERATING_MODEL.md && rg -q "UX & Product QA" docs/OPERATING_MODEL.md && rg -q "Release Audit" docs/OPERATING_MODEL.md && rg -q "session_id" docs/OPERATING_MODEL.md && echo R2_PASS
  EXPECT: R2_PASS
  EVIDENCE: R2_PASS

- [x] R3: NOW activity, evidence progress, immutable transition, and Cherry acceptance remain separate.
  CHECK: rg -q "NOW" docs/OPERATING_MODEL.md && rg -q "immutable receipt" docs/OPERATING_MODEL.md && rg -q "자연어 완료 보고" docs/OPERATING_MODEL.md && rg -q "Cherry" docs/OPERATING_MODEL.md && echo R3_PASS
  EXPECT: R3_PASS
  EVIDENCE: R3_PASS

- [x] R4: Reusable templates exist for the three required project document types.
  CHECK: test -f templates/OUTCOME_CONTRACT.md && test -f templates/OUTCOME_MAP.md && test -f templates/GATES.md && echo R4_PASS
  EXPECT: R4_PASS
  EVIDENCE: R4_PASS

- [x] R5: OUTCOME itself has an approved Contract, Map, and delivery Gates.
  CHECK: test -s docs/OUTCOME_CONTRACT.md && test -s docs/OUTCOME_MAP.md && test -s GATES_OUTCOME_MVP.md && rg -q "project_id: outcome" docs/OUTCOME_MAP.md && echo R5_PASS
  EXPECT: R5_PASS
  EVIDENCE: R5_PASS

- [x] R6: Every OUTCOME Phase, Scope, and Stage has an explicit purpose and Gate reference.
  CHECK: rg -q "purpose:" docs/OUTCOME_MAP.md && rg -q "gates_file:" docs/OUTCOME_MAP.md && rg -q "outcome-stage-8" docs/OUTCOME_MAP.md && echo R6_PASS
  EXPECT: R6_PASS
  EVIDENCE: R6_PASS

- [x] R7: Current and next OUTCOME boundaries are explicit and match the Package-driven runtime state.
  CHECK: rg -q "Current:.*outcome-stage-6" docs/OUTCOME_MAP.md && rg -q "Next:.*outcome-stage-7" docs/OUTCOME_MAP.md && echo R7_PASS
  EXPECT: R7_PASS
  EVIDENCE: R7_PASS

- [x] R8: README and current state route fresh sessions to the OUTCOME self-tracking sources.
  CHECK: rg -q "OUTCOME Map" README.md && rg -q "GATES_OUTCOME_MVP.md" README.md && rg -q "Package-driven" docs/CURRENT_STATE.md && echo R8_PASS
  EXPECT: R8_PASS
  EVIDENCE: R8_PASS

- [x] R9: The standard new-project document bundle is named OUTCOME Package without folding runtime session bindings into it.
  CHECK: rg -q "OUTCOME Package" README.md && rg -q "OUTCOME Package" docs/OPERATING_MODEL.md && rg -q "runtime registry" docs/OPERATING_MODEL.md && echo R9_PASS
  EXPECT: R9_PASS
  EVIDENCE: R9_PASS

- [x] R10: OUTCOME Contract contains concrete Package, Project, Phase, scope, and acceptance values.
  CHECK: rg -q "Package name:.*OUTCOME Package" docs/OUTCOME_CONTRACT.md && rg -q "Project ID:.*outcome" docs/OUTCOME_CONTRACT.md && rg -q "Phase ID:.*outcome-phase-1" docs/OUTCOME_CONTRACT.md && rg -q "Final acceptance axes" docs/OUTCOME_CONTRACT.md && echo R10_PASS
  EXPECT: R10_PASS
  EVIDENCE: R10_PASS

- [x] R11: OUTCOME Map declares its Package schema and resolves every delivery Stage to the correct Gate file.
  CHECK: rg -q "package_schema_version: 1" docs/OUTCOME_MAP.md && test "$(rg -c '^          - id: outcome-stage-' docs/OUTCOME_MAP.md)" -eq 9 && test "$(rg -c 'gates_file:' docs/OUTCOME_MAP.md)" -eq 9 && echo R11_PASS
  EXPECT: R11_PASS
  EVIDENCE: R11_PASS

- [x] R12: Every open Local MVP delivery Gate declares its primary proof axis and every delivery Stage has a stable ID.
  CHECK: test "$(rg -c '^- \[ \]' GATES_OUTCOME_MVP.md)" -eq "$(rg -c '^  PROVES:' GATES_OUTCOME_MVP.md)" && test "$(rg -c '^Stage ID:' GATES_OUTCOME_MVP.md)" -eq 6 && echo R12_PASS
  EXPECT: R12_PASS
  EVIDENCE: R12_PASS

- [x] R13: The approved remote-feedback amendment permits explicit public read-only access while preserving Mac Mini source authority, redaction, and mutation denial.
  CHECK: rg -q "Cherry-approved public read-only" docs/OUTCOME_CONTRACT.md && rg -q "Mac Mini remains the authoritative collector" GATES_OUTCOME_MVP.md && rg -q "completion_authority: false" docs/OUTCOME_MAP.md && echo R13_PASS
  EXPECT: R13_PASS
  EVIDENCE: R13_PASS

- [x] R14: The long-term roadmap preserves Cherry's Phase 1, 2, 4, and 5 intent and marks Phase 3 as a recommendation rather than an invented decision.
  CHECK: for value in 'Phase 1 · Cherry Note MVP' 'Phase 2 · 공개 다중 프로젝트 계정 서비스' 'Phase 3 · 연결된 프로젝트 운영과 Planner 자동 라우팅' 'RECOMMENDED · Cherry decision pending' 'Phase 4 · OUTCOME-native 프로젝트 개발 환경' 'Phase 5 · 목적 발견과 Outcome 설계 시스템' 'Question 200'; do rg -F -- "$value" docs/ROADMAP.md >/dev/null || exit 1; done; echo R14_PASS
  EXPECT: R14_PASS
  EVIDENCE: R14_PASS

- [x] R15: GitHub is a standard optional OUTCOME Package connector while credentials remain runtime-only and GitHub activity cannot self-close outcomes.
  CHECK: rg -q "기본 Source Connector · GitHub" docs/OPERATING_MODEL.md && rg -q "repository: dltmddnr3/outcome" docs/OUTCOME_MAP.md && rg -q "binding_state: connected" docs/OUTCOME_MAP.md && rg -q "observed_published_state: published_current" docs/OUTCOME_MAP.md && rg -q "completion_authority: false" docs/OUTCOME_MAP.md && echo R15_PASS
  EXPECT: R15_PASS
  EVIDENCE: R15_PASS; approved public repository `dltmddnr3/outcome` has `main` published and local HEAD equals `origin/main` at the initial-push receipt; GitHub still has no completion authority.
