# Stage 6 all-state correction gates

Base candidate: `d77a52fe5ad32a4454f045e4fcae7774fac6472f`
Authority: Cherry-approved OUTCOME-only correction; Stage 7 remains closed

- [x] S1: Axis values use a dedicated formatter and mobile axis text wraps without clipping or ellipsis.
  CHECK: npm run test:dashboard -- --test-name-pattern='axis vocabulary'
  EXPECT: exit 0
  EVIDENCE: 2 focused formatter regressions PASS; all five observed NOW states have observation wording and long Package values retain full fallback text.
- [x] S2: Closed Gate checkboxes cannot complete a Stage whose Package evidence is pending or implementation remains work-in-progress.
  CHECK: npm run test:package-model -- --test-name-pattern='bottom-shell closed Gates remain evidence pending'
  EXPECT: exit 0
  EVIDENCE: exact bottom-shell regression PASS; source model projects 9/9 closed as `gates_closed_evidence_pending` instead of complete.
- [x] S3: Browser verification measures every project × every selected Stage at 1440×900 and 390×844, with full visible-descendant clipping, viewport, text-size and contrast scans.
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: both viewports measured 2 projects × 17 selected Stage states; clipping/intersection/viewport escape all 0. Isolated d77a52f red proof found exactly 8 axis clips across 5 Stage states.
- [x] S4: The full dashboard semantic surface meets the 11px honesty floor, and mobile orders NOW/axes before optional GitHub.
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: all visible semantic text >=11px and >=4.5:1, controls >=44px, focus >=12.81:1; mobile NOW < axes < GitHub for all 17 states.
- [x] S5: Package labels, 57 checks, no numeric fallback, read-only/redaction, hierarchy, accessibility, Stage discovery and GitHub authority regressions remain green.
  CHECK: npm test && npm run test:security
  EXPECT: exit 0
  EVIDENCE: frontend 12/12 and Node 52/52 PASS; security subset 14/14 PASS; Stage33 exact Package labels and 57 checks verified at both viewports.
- [x] S6: Full production build, scope/diff, and local all-state browser verification pass on one candidate.
  CHECK: npm run build && npm run test:browser && npm run check:scope && git diff --check
  EXPECT: exit 0
  EVIDENCE: production build PASS; local all-state browser PASS; scope PASS for 14 product/runtime/test files; `git diff --check` PASS.
- [ ] S7: Fresh QA report is byte-identical, and one exact commit is publicly served and pushed with GET 200, mutation 405, redaction and remote all-state browser PASS.
  CHECK: test "$(shasum -a 256 docs/STAGE6_FRESH_UX_PRODUCT_QA_d77a52f.md | awk '{print $1}')" = eec1ff6d6d6ad5c913a557bd87b7e3d36dbae540b6215d57846f1cb40100c252 && test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
  EXPECT: exit 0
  EVIDENCE: pending
