# Phase 2 · Account Access Fresh UX & Product QA Gates

Outcome: Builder와 분리된 fresh reviewer가 exact account-access candidate의 public/private 여정과 source truth를 실제 viewport에서 반증한다.

- [ ] Q1: reviewer identity와 exact candidate/handoff pins가 Builder와 분리되어 있다.
  PROVES: independent_qa
  EVIDENCE: prior fresh review pinned candidate `2241782f160a`, tree `b6f79138099f`, production receipt and separate reviewer in report `docs/PHASE2_ACCOUNT_ACCESS_FRESH_UX_PRODUCT_QA_2241782.md`; that candidate failed and a new candidate/reviewer pin is required.
- [ ] Q2: public no-login journey와 Cherry-only private login/logout/expiry/deny/error journeys가 MacBook과 mobile에서 검증된다.
  PROVES: test
  EVIDENCE: FAIL `QA-ACC-002` · private login buttons made no transition/auth call and ready state exposed no logout journey on MacBook/mobile.
- [ ] Q3: project visibility, hierarchy/current-vs-selected truth, stale/conflict/empty/degraded states와 accessibility가 검증된다.
  PROVES: test
  EVIDENCE: FAIL `QA-ACC-001` · ready payload rendered no projects/hierarchy/current-vs-selected UI. FAIL `QA-ACC-003` · mobile 390×844 at 200% CSS zoom overflowed horizontally by 250 px.
- [ ] Q4: QA report가 PASS_UX_PRODUCT_QA_ONLY 또는 FAIL로 끝나며 Release Audit·Cherry acceptance·release authority를 주장하지 않는다.
  PROVES: independent_qa
  EVIDENCE: prior report-only commit `ed7613f3109c`, report SHA-256 `c3a98004b1bdc261763a71d3ecbefc99cc74a0358341ab7c2d248d0d1eb712b7`, terminal `FAIL`; no Release Audit eligibility. Fresh corrected report remains required.

ABANDON: QA는 Builder candidate를 수정하거나 release/Cherry acceptance를 대신하지 않는다.
