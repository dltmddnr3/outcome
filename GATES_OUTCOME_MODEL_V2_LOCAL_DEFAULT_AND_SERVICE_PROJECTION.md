# OUTCOME Model v2 local default and service projection

Outcome: Model v2 is the verified local default with selective context, then becomes the user-facing private workspace projection without deployment or release authority.

Status: **SLICE B1 PASSED · B2 READY · DEPLOYMENT/PRODUCTION/RELEASE EXCLUDED**

- [x] D1: Product meaning, selective-context boundary, information architecture, ownership and rollback are fixed in one contract.
  CHECK: rg -q "Selective context contract" docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md && rg -q "Service information architecture" docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md && rg -q "Current Projection is the only source" docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md && echo D1_PASS
  EXPECT: `D1_PASS`
  EVIDENCE: `docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md`.

- [x] D2: Contract and Map select exactly this Milestone and Gate as the one active implementation target.
  CHECK: rg -q "outcome-milestone-model-v2-local-default-projection" docs/OUTCOME_MAP.md && rg -q "GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md" docs/OUTCOME_MAP.md && echo D2_PASS
  EXPECT: `D2_PASS`
  EVIDENCE: `docs/OUTCOME_MAP.md` active workstream and Phase 5 Milestone.

- [x] A1: Local startup uses Model v2 by default while one explicit local rollback restores byte/object-compatible v1 behavior.
  EVIDENCE: Original Builder candidate `33b8022db05432e84463571b1d796e7a66993ae9`; correction candidate `7180263c591b4ca3a31be086af59ae4a43a5bc36`, receipt carrier `d33b9deb58487cc6476afce76f72764cb19f87b1`, receipt SHA-256 `4a66095e862fc34f40dc65f5e1f50cd55e5e269af547e834480b47e1a66189dc`. Fresh affected-surface Q1 re-QA remains required.

- [x] A2: A content-addressed compact bootstrap rejects source drift and defaults to the contract load set without historical Gate or unrelated skill expansion.
  EVIDENCE: Correction receipt records independently pinned input manifest `3b2eac40168795ef47d06ab1e16f110dd3e50139bec0a1ac4d71e782f356684b`, enforced semantic deny/privacy classes, exact default set plus four reason-bound expansions and source-drift `cold_compile_required`. Fresh affected-surface Q1 re-QA remains required.

- [x] A3: One current-repository OUTCOME canary produces destination, gap/frontier, active work, next action and Cherry action with unauthorized transitions, retries and false completion all zero.
  EVIDENCE: Correction receipt records the complete 13-predicate current Gate frontier, open Q1 as `work-q1-independent-qa`, two byte-identical canaries SHA-256 `84d0e08a3af47aa93f16ec7e4e46b4c0984f4278e92b1c089b67dd0f09dfdda7`, terminal `next_action_selected` and safety counters zero. Fresh affected-surface Q1 re-QA remains required.

- [x] A4: Builder regression, privacy allowlist, residue and rollback checks pass on one immutable Slice A candidate.
  EVIDENCE: Correction receipt records `127/127` tests, hostile RED-before-GREEN for both Q1 findings, privacy denial, zero listener/persistent flag/staged residue, unchanged 313-path unrelated manifest and exact rollback. Fresh affected-surface Q1 re-QA remains required.

- [x] Q1: Fresh independent UX & Product QA reproduces Slice A default startup, selective context, real-work result and rollback on the same immutable candidate.
  EVIDENCE: `PASS_UX_PRODUCT_QA_ONLY` carrier `517f436150b684a2f7d72f6144bfa848af397bb4`, receipt SHA-256 `9c77e8bd39762da1d5201cc1af331c3bd822d5a4e6e8eccd2f206a39d3051cbc`, exact candidate `5be35ff77aaca0a5014c75ae506e482608f5c77c`. Fresh QA reproduced the forged-selector RED; corrected hostile matrix, eight-source compact manifest, 13/6/7 Q1 frontier, `130/130` regression, deterministic canary, rollback, privacy and residue all passed with false completion `0`.

- [x] B1: The authorized private workspace consumes one versioned Model v2 server projection and uses Destination, current gap, Now, next boundary and Cherry action as the default information hierarchy.
  EVIDENCE: Builder correction `6442b37089fd3132ba9ee54f3cfe1e79e41028de` and fresh independent re-QA carrier `ce07f96ee77ad1f9c3784884fedb17e552db2928` establish server-owned versioned projection; seven states `7/7`; recursive extra-key rejection `21/21`; hostile rejection `14/14` with trap executions `0`; authorization/isolation `33/33`; Model/package/projection regression `69/69`; frontend Vitest `29/29`; external/runtime/provider/registry/deploy/release/acceptance mutation `0`; false completion `0`. Production build and built-output scan remain residual unknown after one bounded attempt produced no `dist`. Promotion receipt: `docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_B1_EVIDENCE_PROMOTION_RECEIPT.md`.

- [ ] B2: Desktop and mobile keep v1 hierarchy, role bindings and technical evidence behind disclosure while preserving project switch, authentication and read-only account isolation.
  EVIDENCE: pending

- [ ] B3: Planner conversation renders only observed adapter events and never fabricates streaming, tool activity, completion or progress.
  EVIDENCE: pending

- [ ] Q2: Fresh independent UX & Product QA validates the five-question 30-second task, responsive layout, accessibility, failure states and privacy on the immutable Slice B candidate.
  EVIDENCE: pending

- [ ] A5: Separate fresh Release Audit validates the coherent local-default plus service-projection candidate, rollback, privacy and scope without inferring deployment or release.
  EVIDENCE: pending

- [ ] C1: Cherry accepts the exact local product candidate; deployment, Production, release and Phase transition remain separate decisions.
  EVIDENCE: pending
