# OUTCOME Session Binding Control Plane · Browser Verification Correction Gate V6

Scope: Correct the tracked browser probe/accessible role-disclosure DOM mismatch on parent `fe214217041cb0580e501d46f89b7b6a09fdb183` without product DOM redesign, live assignment/migration/provider/task/archive/runtime/deploy/push, QA, Audit, acceptance, or progress mutation.

- [x] Y1: Browser measurement locates role title and status inside each native `details > summary` disclosure and preserves the shipped product DOM/accessibility structure.
  CHECK: `node --test scripts/browser-assertions.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: implementation `182f4e459a33a67beb07bbb45ecc6cc877735cf3` resolves `summary > strong` and the non-live status span before range measurement; product component and CSS files are unchanged; browser unit suite 22/22 PASS.

- [x] Y2: Nested-summary regression passes, while an absent title/status target produces a clear assertion diagnostic and never `Range.selectNodeContents(null)` or a generic TypeError.
  CHECK: `node --test --test-name-pattern='nested summary role rows|missing role target' scripts/browser-assertions.test.mjs`
  EXPECT: `/fail 0/`
  EVIDENCE: focused nested/absent-target regressions 2/2 PASS; the hostile fixture reports `role disclosure target missing summary=true title=false status=true` and contains neither `TypeError` nor `selectNodeContents`.

- [x] Y3: `npm run test:browser` completes the rendered responsive/accessibility matrix with exit 0.
  CHECK: `npm run test:browser`
  EXPECT: `/browser fixture boundary PASS/`
  EVIDENCE: PASS across 9 viewports, 3 projects per viewport, 9 hierarchy selections and 3 selected Stages per viewport; every receipt reported controls>=44, focus contrast>=14.38, and zero clipping, ellipsis, intersections, role intersections, role status overflow, viewport escape, document overflow, unexpected English, and translation fallback.

- [x] Y4: Unit, targeted/full frontend and Node tests, production build, public redaction, prohibited mutation, exact scope, and diff hygiene pass.
  CHECK: `npm test && npm run build && git diff --check`
  EXPECT: `/built in/`
  EVIDENCE: browser unit 22/22; full frontend 90/90; full Node 239/239; production build PASS with 1652 modules; public API/HTML/bundle/rendered-UI prohibited identifiers=0; mutation matrix 32/32 local and 28/28 API read-only denials; implementation scope is exactly two browser assertion files; `git diff --check` PASS.

- [x] Y5: Builder receipt pins identities, measured browser viewport/accessibility evidence, rollback, open authority, false completion count, and learning receipt.
  CHECK: `rg -q 'false_completion_count' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V6_RECEIPT.md && rg -q 'learning_receipt' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V6_RECEIPT.md && rg -q 'Release Audit.*open' docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V6_RECEIPT.md`
  EXPECT: exit 0
  EVIDENCE: `docs/OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V6_RECEIPT.md` pins parent, implementation and tree, measured test evidence, rollback, open Release Audit/acceptance authority, false completion count, and learning receipt.
