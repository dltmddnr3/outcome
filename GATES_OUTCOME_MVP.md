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
  EVIDENCE: standalone `outcome-dashboard` package serves `/cherry-note-dashboard` and a minimal read-only API; runtime tests PASS 10/10.
- [x] M3: Existing Cherry Note dashboard behavior has migration-parity tests and production build evidence.
  PROVES: test
  EVIDENCE: semantic parity tests PASS 2/2; full Node tests PASS 13/13; production build PASS; desktop/mobile geometry PASS.
- [x] M4: One authoritative implementation remains, with explicit rollback evidence for migration.
  PROVES: evidence
  EVIDENCE: OUTCOME is the intended authoritative product source; the legacy Desk copy is migration history only. Local immutable candidate and rollback evidence are recorded in the Builder handoff and `docs/REMOTE_ACCESS.md`.

### Remote feedback foundation

- [x] W1: MacBook and mobile browsers can reach a Cherry-approved public HTTPS OUTCOME URL without depending on localhost routing; temporary and stable hosting evidence remain distinguished.
  PROVES: implementation
  EVIDENCE: Cloudflare Quick Tunnel `https://prizes-subaru-participation-ram.trycloudflare.com` returned public health/dashboard GET 200; URL is explicitly temporary and stable hosting remains a later Gate.
- [x] W2: Authentication remains the fail-closed default; only explicit `OUTCOME_PUBLIC_READ_ONLY=1` enables Cherry-approved unauthenticated sanitized GET access.
  PROVES: security
  EVIDENCE: auth-default and explicit-public mode regression tests PASS; public mode needs no password/secret and still rejects every POST with 405 `read_only`.
- [x] W3: The remote payload excludes local paths, credentials, raw rollout text, task/turn IDs, full hashes, and mutation controls.
  PROVES: security
  EVIDENCE: local and live public redaction probes PASS across payload/HTML/bundle; API rejects mutation routes with 405 `read_only`.
- [x] W4: The Mac Mini remains the authoritative collector and the remote view reports collector offline/stale state rather than cached success.
  PROVES: implementation
  EVIDENCE: collector reads only configured Mac Mini local sources and reports explicit offline/stale states; collector tests PASS 6/6.
- [x] W5: Desktop and mobile remote browsers support Cherry's feedback loop with the same hierarchy and current/next boundary semantics.
  PROVES: test
  EVIDENCE: public URL Chrome checks at 1440x900 and 390x844 measured overflow=0, overlap=0, current=true, next=true, public=true.
- [x] W6: Hosting, tunnel, domain, identity provider, secrets, rollout, and rollback are documented; external activation uses only Cherry-approved credentials and target.
  PROVES: evidence
  EVIDENCE: `docs/REMOTE_ACCESS.md` documents Cloudflare Quick Tunnel, random URL/restart/no-SLA limits, explicit public mode, PIDs, monitoring, rollout, rollback, and a separate stable-hosting follow-up Gate.

## Stage 4 · Generic source model

Stage ID: `outcome-stage-4`

- [x] M5: A parser validates `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md`, and referenced `GATES*.md` without inferring missing meaning.
  PROVES: implementation
  CHECK: npm run test:package-model -- --test-name-pattern='valid package|missing package|reference mismatch|conflicting current'
  EXPECT: exit 0
  EVIDENCE: Package parser/model tests PASS 13/13 including missing contract/map, invalid YAML, missing Gate references, project/current reference mismatch, invalid stable IDs, anchored Gate ranges, and conflicting current boundaries.
- [x] M6: Project, Phase, Scope, Stage, and Gate have stable IDs, purposes, states, and source references.
  PROVES: implementation
  CHECK: npm run test:package-model -- --test-name-pattern='stable hierarchy|invalid stable id|gate acceptance child'
  EXPECT: exit 0
  EVIDENCE: stable hierarchy tests prove unique kebab-case IDs and each Gate carries its owning Stage ID and logical source reference.
- [x] M7: Current and historical Planner, Builder, UX & Product QA, and Release Audit bindings are project-scoped.
  PROVES: implementation
  CHECK: npm run test:package-model -- --test-name-pattern='role bindings'
  EXPECT: exit 0
  EVIDENCE: project-scoped four-role binding test preserves replaced history and selects only the current binding; missing registry renders all roles unbound.
- [x] M8: NOW uses active session evidence while progress and transitions use Gate evidence and immutable receipts.
  PROVES: implementation
  CHECK: npm run test:package-model -- --test-name-pattern='NOW separation'
  EXPECT: exit 0
  EVIDENCE: NOW separation test prioritizes current Builder activity while cross-Stage progress remains unavailable; stage closure uses Gate checkboxes and source axes only.
- [x] M9: Missing, stale, conflicting, unbound, blocked, and locked inputs fail closed with no invented percentage.
  PROVES: test
  CHECK: npm run test:package-model -- --test-name-pattern='fail-closed states'
  EXPECT: exit 0
  EVIDENCE: negative-state tests cover missing, stale, conflict, unbound, blocked/unknown Gate references, and no aggregate percentage; canonical Cherry Note resolves unknown because later required Gate files are absent, while OUTCOME fails closed as conflict because its declared current Stage 4 Gate is already closed.

## Stage 5 · OUTCOME self-tracking UI

Stage ID: `outcome-stage-5`

- [x] M15: GitHub is modeled as an optional project-scoped delivery evidence connector, with local candidate, published commit, checks, and release states kept separate from Gate closure and Cherry acceptance.
  PROVES: implementation
  CHECK: npm run test:package-model -- --test-name-pattern='GitHub connector' && npm run test:dashboard -- --test-name-pattern='GitHub evidence'
  EXPECT: exit 0
  EVIDENCE: GitHub connector parser tests PASS 5/5 for missing, connected, connected-empty-remote, unbound, and conflict/credential cases; UI semantic tests PASS 2/2; Cherry Note refreshed `origin/main...main` at 0 behind / 15 ahead; OUTCOME was verified `not_published / empty_remote` before Parent's authorized initial push, then refreshed at `origin/main...main` 0 behind / 0 ahead with published state connected; `completion_authority=false`, Checks and Release remain unknown; local/remote browser, public 200, mutation 405, and redaction probes PASS.

- [x] M10: Cherry Note and OUTCOME can be selected and remain visually distinguishable.
  PROVES: implementation
  CHECK: npm run test:dashboard -- --test-name-pattern='project switch'
  EXPECT: exit 0
  EVIDENCE: project-switch semantic test and Chrome flow prove Cherry Note/OUTCOME selection resets Stage context and keeps Package truth isolated.
- [x] M11: The active funnel shows Phase purpose → Scope purpose → Stage purpose → Gate purpose.
  PROVES: implementation
  CHECK: npm run test:dashboard -- --test-name-pattern='purpose funnel'
  EXPECT: exit 0
  EVIDENCE: purpose-funnel test and browser flow show Phase, Scope, Stage, Gate purpose plus the exact evidence condition required before moving next.
- [x] M12: Each Stage summarizes what it verifies and evidence-closed checks out of total checks.
  PROVES: implementation
  CHECK: npm run test:dashboard -- --test-name-pattern='stage summary'
  EXPECT: exit 0
  EVIDENCE: Stage summary tests prove closed/total/remaining from Gate checkboxes and null percentage when Gate evidence is absent; Cherry Note Stage 33 Package supplies nine exact `gate_groups` Korean primary labels, the UI renders Gate code secondary, and all 57/57 checks remain derived from the referenced Gate source. Duplicate, missing/blank, and code-mismatched metadata fail closed without a hardcoded translation table.
- [x] M13: Implementation, test, evidence closure, and recent activity are compact and semantically separate.
  PROVES: implementation
  CHECK: npm run test:dashboard -- --test-name-pattern='evidence layers'
  EXPECT: exit 0
  EVIDENCE: evidence-layer test and UI keep implementation/test/evidence/NOW as four compact axes; activity never changes Gate completion.
- [x] M14: Desktop and mobile show current and next boundaries without overlap or horizontal overflow.
  PROVES: test
  CHECK: npm run test:browser
  EXPECT: exit 0
  EVIDENCE: automated Chrome at 1440x900 and 390x844 measured overflow=0, overlap=0, project switch=true, purpose flow=true, current=true, next=true, inline detail=true.

## Stage 6 · UX & Product QA

Stage ID: `outcome-stage-6`

- [x] Q1: Fresh independent UX & Product QA verifies the 30-second understanding task on desktop and mobile.
  PROVES: ux_product_qa
  EVIDENCE: `docs/STAGE6_FRESH_UX_PRODUCT_QA_93b0497.md` records a fresh independent Claude PASS at desktop and mobile, including the 30-second comprehension task; the private session identifier remains only in the non-public audit artifact.
- [x] Q2: QA adversarially tests hierarchy, Gate meaning, project switching, stale/unknown states, and accessibility.
  PROVES: ux_product_qa
  EVIDENCE: the fresh 93b0497 QA traversed 34 project-Stage-viewport states with zero F10 violations and passed hierarchy, isolation, fail-closed states, geometry, contrast, focus, mobile order, and GitHub authority separation.
- [x] Q3: QA uses a pinned immutable candidate and does not mutate or self-accept Builder work.
  PROVES: ux_product_qa
  EVIDENCE: independent QA verified exact `93b0497d3881` commit, `74d1a34ce30b` tree, parent, origin, public receipt, and served bytes without product mutation, push, release, or self-acceptance.
- [x] Q4: Any corrected candidate receives fresh affected QA evidence.
  PROVES: ux_product_qa
  EVIDENCE: corrected candidate 93b0497 received a new affected run; exact aa90faf negative control reproduced F10 and the current semantic scanner rejected it while accepting 93b0497. Cumulative `false_completion_count=10` is preserved.

## Stage 7 · Release Audit

Stage ID: `outcome-stage-7`

- [ ] A1: A separate fresh Release Audit verifies the exact candidate after UX & Product QA PASS.
  PROVES: release_audit
  EVIDENCE: `docs/STAGE7_FRESH_RELEASE_AUDIT_b57edd7.md` records a separate fresh independent session; candidate identity passed, but A1 remains open for the required corrected candidate rerun. The private session identifier remains only in the non-public audit artifact.
- [ ] A2: Audit verifies standalone startup, local-only privacy, source isolation, build reproducibility, and rollback.
  PROVES: release_audit
  EVIDENCE: b57edd7 audit `FAIL` remains authoritative. Candidate 9580c45 corrected UUID and PID boundaries, but fresh affected QA `docs/STAGE7_CORRECTION_FRESH_UX_QA_9580c45.md` found nine `/tmp/...` absolute paths in public Gate evidence and a matching scanner blind spot. A2 remains open.
- [ ] A3: Audit records commit, tree, artifact identity, tested paths, and `false_completion_count`.
  PROVES: release_audit
  EVIDENCE: b57edd7 audit recorded the full pin, artifact SHA-256 values, local/public test matrix, rollback probes, fresh session, and preserved the then-instructed cumulative count 10. Planner classified the UUID privacy claim as event 11 and the later false zero-path scan on 9580c45 as event 12.
- [ ] A4: Audit PASS remains separate from Cherry acceptance and release approval.
  PROVES: release_audit
  EVIDENCE: b57edd7 audit did not claim PASS, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED`, or `EXTERNAL_OUTCOME_COMPLETE`; all A gates remain open pending a corrected candidate.

## Stage 8 · Cherry acceptance

Stage ID: `outcome-stage-8`

- [ ] C1: Cherry uses OUTCOME and confirms both Cherry Note and OUTCOME current location and next action are understandable within 30 seconds.
  PROVES: cherry_acceptance
  EVIDENCE: pending
- [ ] C2: Cherry explicitly accepts Local MVP closure; release or external completion remains a separate decision.
  PROVES: cherry_acceptance
  EVIDENCE: pending
