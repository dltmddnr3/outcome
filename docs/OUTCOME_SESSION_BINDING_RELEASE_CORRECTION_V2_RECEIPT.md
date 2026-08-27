# OUTCOME Session Binding Control Plane · Release Correction Builder Receipt V2

Status: **BUILDER CORRECTION PASS ONLY / Release Audit open / Cherry acceptance open**

Observed: 2026-08-27 KST

## Immutable correction candidate

- correction parent commit: `31285f40b8082183c861c9a76538cd32521c0e9d`
- correction parent tree: `a24f993248bb4824ac3fa174f20e3330d662fb4e`
- implementation correction commit: `1c0802085498fde4b28eb9485ad180e9f8edee0c`
- implementation correction tree: `239afda5c28b6aa5ab9d3ee8e923692685c64386`
- correction Gate: `GATES_OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V2.md`
- source Release Audit report commit: `f8fc468e9d9c5349d801e9cd9055ea90240ffa12`
- source Release Audit report: `/tmp/outcome-session-binding-release-audit.NtQQOw/worktree/docs/OUTCOME_SESSION_BINDING_FRESH_RELEASE_AUDIT_31285F4.md`

The receipt carrier commit is documentation-only and does not change the implementation correction candidate above.

## Corrected Release Audit findings

- F1: restart validation now folds each project-role event stream into versioned lifecycle state. Creation action, contiguous versions, current/terminal status, predecessor/successor links, replace/revoke timestamps, Stage transitions, handoff/checkpoint state, and action-specific event fields must reconcile with binding rows.
- F2: every runtime v2 load rejects non-regular, symlinked, or group/other-accessible registry files as `registry_unavailable`. Doctor reports unsafe mode explicitly. Initial and atomic replacement files remain `0600`.
- F3: writer locks are complete 0600 identity records published with an atomic hard link. Doctor distinguishes live, unconfirmed, orphaned, and invalid locks without exposing PID/uid/start/nonce. Recovery requires an old orphan, same OS owner, changed-process proof, and exact content recovery ref; it uses quarantine rename and never signals a process. The bounded operator flow is recorded in the control-plane contract.
- F4: sessions manifests now enforce exact top-level/role keys and state/version/reference reconciliation. Stable public aliases remain valid; raw locator/provider ID shapes, UUIDs, credentials, absolute paths, common credential prefixes, and secret-bearing fields fail closed.

## Changed implementation paths

- `docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
- `server/outcome-package.mjs`
- `server/outcome-package.test.mjs`
- `server/outcome-session-control.mjs`
- `server/outcome-session-control.test.mjs`
- `server/outcome-session-registry-persistence.mjs`
- `server/outcome-session-registry-persistence.test.mjs`

No unrelated dirty or untracked path was staged. `docs/ROADMAP 2.md` was not opened, edited, or staged.

## RED then GREEN evidence

- RED before implementation: persistence tests could not import a recovery operation; the Package adversarial test accepted `codex://tenant-alpha/private-conversation/short`; the supplied audit independently reproduced impossible history, 0644 load, permanently busy orphan lock with healthy doctor, and locator-bearing manifest acceptance.
- Persistence: 11 passed, 0 failed.
- Package: 47 passed, 0 failed.
- Local control: 5 passed, 0 failed.
- Targeted session-binding Node: 80 passed, 0 failed across Package, control, persistent registry, and legacy in-memory registry suites.
- Full frontend: 90 passed, 0 failed across 5 files.
- Full Node: 230 passed, 0 failed.
- Production build: 1,652 modules transformed; Vite build passed in 742ms.
- `git diff --check`: passed.
- Public redaction: built assets and a 3,007-byte hostile public/doctor fixture produced 0 hits for raw locator/provider/session/thread/task/turn IDs, credential/path/UUID probes, or private lock-owner fields.
- Prohibited operation scan: persistence/control contain no `process.kill`, provider mutation, network request, hosted database, deployment, or runtime-registry path mutation beyond caller-supplied local registry operations.
- Gate status: 6/6 closed after the immutable implementation correction commit.

## Rollback

- This correction rollback: `git revert 1c0802085498fde4b28eb9485ad180e9f8edee0c`.
- A full feature rollback must continue in reverse candidate order only under separate authority; this receipt does not roll back the prior immutable implementation/correction history.
- No live migration, assignment, provider/session/task mutation, runtime file mutation, predecessor archive, deployment, push, release, QA/Audit verdict, acceptance, or progress mutation occurred. No external rollback is required.

## Open work and authority boundary

- Separate fresh Release Audit remains open on the exact new carrier candidate.
- No UI implementation changed in this correction; no new UX & Product QA was performed or claimed.
- Cherry acceptance, live permission repair, lock recovery, registry migration/assignment, provider discovery/session creation, task routing, predecessor archive, deployment, release, and progress closure remain open and unauthorized.
- Builder correction PASS does not revise the prior Release Audit FAIL, self-audit the candidate, or close any Project, Phase, Scope, Stage, acceptance Gate, or external outcome.

false_completion_count: 4

learning_receipt: Primitive schema checks do not prove an append-only control plane. Release safety requires reconstructing causal state from events, enforcing private filesystem policy on every read, publishing complete identity-bound locks atomically, recovering only a proven old orphan with exact snapshot identity, and applying the same privacy boundary to durable Package companions.
