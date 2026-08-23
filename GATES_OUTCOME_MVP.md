# OUTCOME Local MVP delivery gates

Package: `OUTCOME Package`
Project ID: `outcome`
Phase ID: `outcome-phase-1`
Status: `OPEN`

Outcome: Cherry can use standalone OUTCOME to track Cherry Note and OUTCOME itself from standard project documents and role-session evidence, then independently accept the Local MVP.

## Stage 3 · Standalone migration

Stage ID: `outcome-stage-3`

- [x] M1: Dashboard-only product files are extracted into the OUTCOME repository without unrelated Desk, Slack, account relay, or Cherry Note iOS changes.
  PROVES: implementation
  EVIDENCE: OUTCOME scope check PASS across 10 product/runtime/test files; no Desk, Slack, relay, provider, or Cherry Note iOS dependency.
- [x] M2: OUTCOME starts locally under its own package and route without Desk authentication or navigation.
  PROVES: implementation
  EVIDENCE: standalone `outcome-dashboard` package serves `/cherry-note-dashboard` and a minimal read-only API; runtime tests PASS 7/7.
- [x] M3: Existing Cherry Note dashboard behavior has migration-parity tests and production build evidence.
  PROVES: test
  EVIDENCE: semantic parity tests PASS 2/2; full Node tests PASS 13/13; production build PASS; desktop/mobile geometry PASS.
- [x] M4: One authoritative implementation remains, with explicit rollback evidence for migration.
  PROVES: evidence
  EVIDENCE: OUTCOME is the intended authoritative product source; the legacy Desk copy is migration history only. Local immutable candidate and rollback evidence are recorded in the Builder handoff and `docs/REMOTE_ACCESS.md`.

### Remote feedback foundation

- [ ] W1: MacBook and mobile browsers can reach a stable HTTPS OUTCOME URL without depending on localhost routing.
  PROVES: implementation
  EVIDENCE: BLOCKED — Tailscale is installed but stopped with no active tailnet identity, DNS name, or certificate domain. No anonymous fallback is permitted.
- [x] W2: Authentication is required before any project, NOW, Gate, session, or freshness data is returned.
  PROVES: security
  EVIDENCE: auth tests prove API 401 and a data-free login document before any dashboard bundle is returned; session uses HttpOnly, Secure-in-production, SameSite=Strict signed cookies.
- [x] W3: The remote payload excludes local paths, credentials, raw rollout text, task/turn IDs, full hashes, and mutation controls.
  PROVES: security
  EVIDENCE: redaction tests PASS at evidence-text and serialized-payload boundaries; API rejects mutation routes with 405 `read_only`.
- [x] W4: The Mac Mini remains the authoritative collector and the remote view reports collector offline/stale state rather than cached success.
  PROVES: implementation
  EVIDENCE: collector reads only configured Mac Mini local sources and reports explicit offline/stale states; collector tests PASS 6/6.
- [ ] W5: Desktop and mobile remote browsers support Cherry's feedback loop with the same hierarchy and current/next boundary semantics.
  PROVES: test
  EVIDENCE: LOCAL CANDIDATE PASS — Chrome 1440x900 and 390x844 both measured overflow=0, overlap=0, current=true, next=true. Actual remote-device proof waits on W1 activation.
- [x] W6: Hosting, tunnel, domain, identity provider, secrets, rollout, and rollback are documented; external activation uses only Cherry-approved credentials and target.
  PROVES: evidence
  EVIDENCE: `docs/REMOTE_ACCESS.md` documents Tailscale Serve private HTTPS, two authentication layers, local-only secrets, monitoring, rollout, and rollback; runbook check PASS.

## Stage 4 · Generic source model

Stage ID: `outcome-stage-4`

- [ ] M5: A parser validates `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md`, and referenced `GATES*.md` without inferring missing meaning.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M6: Project, Phase, Scope, Stage, and Gate have stable IDs, purposes, states, and source references.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M7: Current and historical Planner, Builder, UX & Product QA, and Release Audit bindings are project-scoped.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M8: NOW uses active session evidence while progress and transitions use Gate evidence and immutable receipts.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M9: Missing, stale, conflicting, unbound, blocked, and locked inputs fail closed with no invented percentage.
  PROVES: test
  EVIDENCE: pending

## Stage 5 · OUTCOME self-tracking UI

Stage ID: `outcome-stage-5`

- [ ] M10: Cherry Note and OUTCOME can be selected and remain visually distinguishable.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M11: The active funnel shows Phase purpose → Scope purpose → Stage purpose → Gate purpose.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M12: Each Stage summarizes what it verifies and evidence-closed checks out of total checks.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M13: Implementation, test, evidence closure, and recent activity are compact and semantically separate.
  PROVES: implementation
  EVIDENCE: pending
- [ ] M14: Desktop and mobile show current and next boundaries without overlap or horizontal overflow.
  PROVES: test
  EVIDENCE: pending

## Stage 6 · UX & Product QA

Stage ID: `outcome-stage-6`

- [ ] Q1: Fresh independent UX & Product QA verifies the 30-second understanding task on desktop and mobile.
  PROVES: ux_product_qa
  EVIDENCE: pending
- [ ] Q2: QA adversarially tests hierarchy, Gate meaning, project switching, stale/unknown states, and accessibility.
  PROVES: ux_product_qa
  EVIDENCE: pending
- [ ] Q3: QA uses a pinned immutable candidate and does not mutate or self-accept Builder work.
  PROVES: ux_product_qa
  EVIDENCE: pending
- [ ] Q4: Any corrected candidate receives fresh affected QA evidence.
  PROVES: ux_product_qa
  EVIDENCE: pending

## Stage 7 · Release Audit

Stage ID: `outcome-stage-7`

- [ ] A1: A separate fresh Release Audit verifies the exact candidate after UX & Product QA PASS.
  PROVES: release_audit
  EVIDENCE: pending
- [ ] A2: Audit verifies standalone startup, local-only privacy, source isolation, build reproducibility, and rollback.
  PROVES: release_audit
  EVIDENCE: pending
- [ ] A3: Audit records commit, tree, artifact identity, tested paths, and `false_completion_count`.
  PROVES: release_audit
  EVIDENCE: pending
- [ ] A4: Audit PASS remains separate from Cherry acceptance and release approval.
  PROVES: release_audit
  EVIDENCE: pending

## Stage 8 · Cherry acceptance

Stage ID: `outcome-stage-8`

- [ ] C1: Cherry uses OUTCOME and confirms both Cherry Note and OUTCOME current location and next action are understandable within 30 seconds.
  PROVES: cherry_acceptance
  EVIDENCE: pending
- [ ] C2: Cherry explicitly accepts Local MVP closure; release or external completion remains a separate decision.
  PROVES: cherry_acceptance
  EVIDENCE: pending
