# Phase 2 · Account Access Release Audit Browser Correction Brief

Status: `BUILDER CORRECTION REQUIRED · FRESH RE-AUDIT REQUIRED`

Source blocker: `docs/PHASE2_ACCOUNT_ACCESS_FRESH_RELEASE_AUDIT_70A86EA5.md` B1

Owning Gate: `GATES_PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT_CORRECTION.md` R1-R5

## Required outcome

Make `npm run test:browser` an exact-checkout, repository-contained UI regression. It must not depend on the mutable availability or layout of sibling `../Cherry Note`. This changes only the browser test input boundary; it must not claim the external Cherry Note source is valid or modify the production/default Package registry.

## Allowed paths

- `scripts/browser-check.mjs`
- a narrowly scoped new or existing browser-check test under `scripts/`
- `GATES_PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT_CORRECTION.md` evidence only
- new `docs/PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT_BROWSER_CORRECTION_EVIDENCE.md`

Everything else is read-only, including `config/outcome-projects.json`, product UI/server/collector/package loader, Map/snapshot, prior audit report and `docs/ROADMAP 2.md`.

## Acceptance

1. Capture the current default failure first: assertion tests 16/16 then `.oc-dashboard` timeout because the external registered Package is unavailable.
2. The corrected browser script explicitly loads `test/fixtures/portfolio-registry.json`, verifies every resolved root remains under `test/fixtures`, collects exactly three distinct valid projects, and injects only that collected model into the isolated test server.
3. Four viewports remain 1440×900, 390×844, 375×812 and 844×390. Existing `verifyAllDashboardStates` assertions are reused unchanged and cover all three fixture projects.
4. `npm run test:browser`, package model, full frontend/Node/security/build, stable/portfolio/account/remote browsers, public redaction and mutation matrices all remain green.
5. The handoff states explicitly that fixture success proves deterministic browser UI regression only; live external source availability remains separately fail-closed and is not promoted.

## Terminal boundary

Return `CANDIDATE_READY_ONLY` or `BLOCKED`. No push/deploy, external source repair, provider/resource mutation, Release Audit PASS, Cherry acceptance, release or Phase completion authority is granted.
