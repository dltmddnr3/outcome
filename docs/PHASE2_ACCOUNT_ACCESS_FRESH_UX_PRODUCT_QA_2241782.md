# Phase 2 Account Access Fresh UX & Product QA

Date: 2026-08-25 KST  
Role: fresh independent UX & Product QA reviewer, separate from Builder  
Authority: QA only

## Immutable review boundary

- Candidate commit: `2241782f160a2e23dbeed816136b0a3caba4185a`
- Candidate tree: `b6f79138099f289a9e9ca0e17d45875d9e4db5a5`
- Review worktree: fresh detached `/private/tmp/outcome-account-fresh-qa.3IeWIO`
- Published source: `origin/main` and `git ls-remote origin refs/heads/main` both resolved to the exact candidate; `git merge-base --is-ancestor HEAD origin/main` passed.
- Production input pin: deployment `dpl_8tqvUqnn2L8BFbNVt13RH8zEk4YM`, stable URL `https://outcome-five.vercel.app`.
- Direct public receipt: commit `2241782f160a`, tree `b6f79138099f`, asset `index-Dks-j8-s.js`, `runtimeNowPinned=false`, `boundary=deployment_snapshot`, `liveSessionRelay=false`.
- Local/production JS asset SHA-256: `b4b219be6abd4881815a32075f4a778ef6ca0ad995b430c3563c07fef012e1d4`; bytes were identical.
- The deployment ID itself was supplied as the review pin but was not independently provider-attested by a Vercel control-plane query. The stable URL, receipt, and built asset were directly observed.
- Source was clean before QA. Only this report is added. `docs/ROADMAP 2.md` was not read or touched.

## Terminal decision

Q1 is satisfied. Q2 and Q3 are not satisfied. Q4 is satisfied by this bounded report. The exact candidate has a safe public surface and useful fail-closed account primitives, but it does not deliver the required private workspace journey on either MacBook or mobile.

## Blocking findings

### QA-ACC-001 · Private ready state discards the workspace projects and hierarchy

Severity: blocker  
Owner: Builder

Reproduction:

1. Serve the exact built candidate locally.
2. Return `enabled=true` from `/api/private/config`.
3. Return `viewState=ready` plus two allowed project projections, including distinct current and non-current hierarchy nodes, from `/api/private/workspace`.
4. Open `/workspace` at 1440×900 and 390×844.

Expected: Cherry Note and OUTCOME are rendered as inspectable private projects. The UI exposes `Project → Phase → Scope → Stage → Gate` and keeps actual current position distinct from a touched/selected position.

Actual: both viewports render only the generic `READY / 비공개 결과를 확인할 수 있습니다` state card and a static allowlist footer. Measured results were `hierarchyRoots=0`, `projectControls=0`, `logout=0`, and `buttons=0`. The fixture's project projections and current/selected nodes were absent from the rendered UI.

Code evidence: `PrivateWorkspaceEntry` converts the entire response to a single `AccountWorkspaceState`; `AccountWorkspace` accepts only `state` and renders no project payload or hierarchy. The API test proves that project projections exist server-side, but the product UI never consumes them.

Impact: the central authenticated read-only outcome cannot be performed. Project visibility, allowlist presentation, hierarchy truth, current-vs-selected truth, and ready-state exploration are not independently testable in the private journey. This directly fails Q3 and the approved K6/Builder handoff UX boundary.

### QA-ACC-002 · Private login and logout are presentation stubs, not viewport journeys

Severity: blocker  
Owner: Builder

Reproduction:

1. Return `authentication_required` from the synthetic private workspace endpoint.
2. Open `/workspace` and keyboard-focus `Google로 계속`.
3. Press Enter and observe requests and state.
4. Return a ready workspace and inspect available controls.

Expected: the synthetic/provider-neutral candidate makes login transition behavior and logout behavior independently exercisable without real credentials, while real OAuth remains disabled.

Actual: the Google and email-code buttons are focusable but have no handlers. Enter caused zero auth/login requests, no navigation, and no state change. The ready state has no logout button or other logout journey. Server-unit tests cover a synthetic logout transition, but the MacBook/mobile account UI cannot exercise it.

Impact: Q2's private login/logout journey cannot pass. The known limitation that real OAuth is intentionally absent is valid, but it does not explain the absence of a synthetic adapter-driven transition and logout UX required by the handoff.

### QA-ACC-003 · Mobile 200% zoom produces horizontal overflow

Severity: high  
Owner: Builder

Reproduction:

1. Open the synthetic ready state at 390×844.
2. Apply the same `document.documentElement.style.zoom = '2'` probe used by the committed account-access browser harness.
3. Measure `documentElement.scrollWidth - documentElement.clientWidth`.

Expected: no horizontal page overflow at 200% zoom.

Actual: horizontal overflow measured `250px` on mobile. The committed harness applies 200% zoom only in a separate 1440×900 context, where overflow was zero; it does not run the zoom assertion on mobile.

Impact: Q3's 200% zoom/accessibility requirement is not satisfied on the required mobile viewport.

## Directly verified passing boundaries

### Production public surface

- `/cherry-note-dashboard` returned 200 without login; `/api/health` returned `available / public_read_only / deployment_snapshot`.
- `/api/private/config` returned 200 with `enabled=false`, Google primary, Apple linked-only, email-code fallback, seven-day maximum, and `completionAuthority=false`.
- `/api/private/workspace` returned 401 `authentication_required`; no private project payload was exposed.
- Local and production public disclosure scans found zero prohibited local paths, credentials, raw task/turn/thread/session identifiers, UUIDs, full hashes, or Gate evidence fields across API, HTML, JS/CSS assets, and rendered UI.
- Local and production mutation matrices each returned 32/32 exact 405 responses; all 28 API mutations returned canonical `{"error":"read_only"}`.
- Production public MacBook/mobile navigation preserved actual current Phase 2 / account-access QA while selecting Phase 1: `data-current-phase-id` stayed `outcome-phase-2`, `data-selected-phase-id` became `outcome-phase-1`, current Stage stayed account-access QA, and the UI rendered `실제 현재 위치 유지`.
- The public UI describes the runtime binding observation as stale and explicitly says session activity is not progress. It shows Q1-Q4 as 0/4, Release Audit and Cherry acceptance locked, and makes no Phase 2 or external-completion claim.

### Local regression and state presentation

- `npm test`: 62/62 frontend and 96/96 Node tests passed.
- `npm run test:account-access`: 17/17 Node and 3/3 UI tests passed, including the exact migration in PGlite, RLS denial, owner/workspace resolution, allowlist, expiry, revocation, conflict, provider outage, append-only snapshots, and operations guards.
- `npm run test:account-access-browser`: passed after the production build existed for two viewports × nine state labels plus loading. The first pre-build run timed out waiting for `login`; it was an environment-order failure caused by missing `dist`, not a product PASS or FAIL, and the affected command was rerun after `npm run build`.
- `npm run test:stable-browser`: four viewports passed 48 hierarchy selections, 25 selected stages, normal-size overflow/intersection/clipping/ellipsis checks, ≥44px controls, ≥11px text, contrast ≥4.5:1, focus contrast ≥13.60:1, and reduced-motion static checks.
- `npm run test:portfolio-browser`: desktop/mobile three-project synthetic portfolio passed.
- `npm run test:security`: 28/28 passed. `npm run check:public-boundary`, `npm run check:mutations`, `npm run build`, `npm run build:isolated`, `npm run check:scope`, and `npm run check:runbook` passed after the required build order.
- Normal-size account states had no horizontal overflow or header/panel intersection on 1440×900 and 390×844. Account login paragraph contrast independently measured 12.11:1. Reduced motion had zero active animations. Login controls measured at least 44px and received visible keyboard focus.

## Builder evidence limitations confirmed

- No real Clerk login, Apple/Google linking, email-code exchange, provider cookie, hosted Supabase, backup/restore, WAF, alert, cost, or incident system was executed. Those remain outside this QA result and require separately authorized resources and later Release Audit evidence.
- The committed browser harness confirms state labels and shell geometry, not the ready project's content, hierarchy, selection invariants, logout behavior, or mobile 200% zoom. Its green result does not close Q2 or Q3.
- Production private access remains disabled by design. This QA does not authorize enabling it or creating provider/database resources.

## Authority boundary

This FAIL is UX & Product QA only. It grants no Release Audit eligibility and is not Release Audit, Cherry acceptance, production-resource approval, release approval, Phase 2 completion, or `EXTERNAL_OUTCOME_COMPLETE`.

FAIL
