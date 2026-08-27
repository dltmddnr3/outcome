# OUTCOME Session Binding Control Plane · Release Correction Gate V4

Scope: Correct final fresh re-audit findings F1-F4 on parent `563c73b9f292748c121bb041725c5f17eada80da` without live registry, assignment, provider, task, archive, deployment, QA, Audit, acceptance, or progress mutation.

- [x] W1: Initial registry publication is exclusive and atomic under synchronized multi-process creation; exactly one creator succeeds and every loser preserves the complete exact-0600 winner.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: focused adversarial run 4/4 PASS; 12 stdin-barrier synchronized child processes produced exactly 1 success and 11 `registry_exists`, with the winner reloaded complete at exact `0600`.

- [x] W2: The exported persistence mutation boundary itself enforces all Planner replacement prerequisites; only the control read-after-write can return archive eligibility.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-session-control.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: targeted registry/control/package run 69/69 PASS; direct-import tests deny each missing prerequisite and invalid digest without byte mutation, persistence returns archive eligibility false, and guarded control read-back returns true.

- [x] W3: Replacement constructs a successor from an explicit durable-field allowlist and clears every predecessor observation/NOW/terminal-only field until a successor observation occurs.
  CHECK: `node --test server/outcome-session-registry-persistence.test.mjs server/outcome-package.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: targeted registry/control/package run 69/69 PASS; observed predecessor activity is absent on the successor, `observed_at` is null, and public activity is null after restart.

- [x] W4: Every manifest role declaration reconciles state, version, and public alias against private runtime projection; runtime-only, manifest-only, version/ref mismatch fail closed while matching and transitions pass.
  CHECK: `node --test server/outcome-package.test.mjs server/outcome-session-control.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: adversarial reconciliation matrix PASS for runtime-only active, manifest-only bound, matching bound, alias mismatch, version mismatch, replacement, and revocation; conflicts project `registry_conflict`, while missing optional companion remains `setup_required`.

- [x] W5: Targeted/full frontend and Node tests, production build, concurrency/redaction/prohibited-operation scans, exact path scope, and diff hygiene pass.
  CHECK: `npm test && npm run build && git diff --check`
  EXPECT: `/built in/`
  EVIDENCE: `npm test` PASS frontend 90/90 and Node 236/236; targeted 69/69; `npm run build` PASS (1652 modules); public boundary PASS with prohibited identifiers=0; mutation matrix 32/32 mutations and 28/28 API calls denied read-only; `git diff --check` PASS.

- [x] W6: The Builder receipt pins exact identity, measured evidence, rollback, open authority, false completion count, and learning receipt.
  CHECK: `rg -q 'false_completion_count' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V4_RECEIPT.md && rg -q 'learning_receipt' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V4_RECEIPT.md && rg -q 'Release Audit.*open' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V4_RECEIPT.md`
  EXPECT: exit 0
  EVIDENCE: `docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V4_RECEIPT.md` records implementation `b6cd329385948d5bf500c9ff1cdb085f9d128ff9`, tree `0e72f8170df2229f82b8daaaea140ff562e0875a`, measured checks, rollback, open authority, false completion count, and learning receipt.
