# Stage 6 detail semantics correction gates

Base candidate: `aa90faffcd90d0d132e896dbec7037bffee32457`
Authority: Cherry-approved OUTCOME-only correction; Stage 7 remains closed

- [x] D1: Non-complete Stage checkbox counts remain visible without evidence-closed labels, completion percentage/bar, all-closed copy, or remaining-zero instruction.
  CHECK: npm run test:dashboard -- --test-name-pattern='Stage detail'
  EXPECT: exit 0
  EVIDENCE: 5 focused detail regressions PASS, including locked Final Feed 10/10 and bottom-shell pending 9/9 without a percentage.
- [x] D2: Locked/blocked/pending/active/queued/unknown/gates-closed-evidence-pending detail copy names the source-grounded boundary; complete retains valid completion semantics.
  CHECK: npm run test:dashboard -- --test-name-pattern='Stage detail'
  EXPECT: exit 0
  EVIDENCE: table regression covers all seven non-complete states; complete fixture alone retains 100%, evidence-closed label and completion copy.
- [x] D3: Browser verification asserts the semantic invariant for every project × selected Stage at 1440×900 and 390×844 while preserving the all-state geometry/accessibility scanner.
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: 2 projects × 17 selected Stages PASS at both viewports with detail semantics, clipping/intersection/escape 0, text >=11px, contrast >=4.5:1 and focus >=14.83:1.
- [x] D4: Prior QA report remains byte-identical and the full frontend/Node/security/build/scope suite passes.
  CHECK: test "$(shasum -a 256 docs/STAGE6_FRESH_UX_PRODUCT_QA_aa90faf.md | awk '{print $1}')" = 8b002c84a1b49166b46a89fd49dbae811fc9aeea9fc6fa16be713619b0007ed6 && npm test && npm run test:security && npm run build && npm run check:scope && git diff --check
  EXPECT: exit 0
  EVIDENCE: report SHA-256 matches; frontend 16/16, Node 52/52, security rerun 14/14, build, scope and diff checks PASS.
- [ ] D5: One exact candidate is rebuilt and pushed to origin/main while live origin PID 89927 remains untouched; public receipt/asset drift is reported without an exact-pin claim.
  CHECK: test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
  EXPECT: exit 0
  EVIDENCE: pending
