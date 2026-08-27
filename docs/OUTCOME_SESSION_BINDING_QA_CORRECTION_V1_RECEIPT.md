# OUTCOME Session Binding Control Plane · QA Correction Builder Receipt V1

Status: **BUILDER CORRECTION PASS ONLY / fresh QA open / Release Audit open / Cherry acceptance open**

Observed: 2026-08-27 KST

## Immutable correction candidate

- correction parent commit: `c8e35e88aed88a5f622c9a011f83b6482de6823f`
- correction parent tree: `29cce54c5229f2cacab41f853400a979c8e2c091`
- implementation correction commit: `db7ecaa0bfb157e21c81ce58683aa3848065f8a2`
- implementation correction tree: `27a2caa26ad02e1422a279268399643e1d3b3cf3`
- correction Gate: `GATES_OUTCOME_SESSION_BINDING_QA_CORRECTION_V1.md`
- source QA report commit: `f617c5bec55b63a6f7576e3c8d69b7f50206f5be`
- source QA report: `/tmp/outcome-session-binding-qa.sPajHu/worktree/docs/OUTCOME_SESSION_BINDING_FRESH_INDEPENDENT_QA_C8E35E8.md`

The receipt carrier commit is documentation-only. It does not change the implementation correction candidate above.

## Corrected QA findings

- F1 / P1: persisted schema-v2 binding and event public metadata now has exact-key and value validation on restart. Project, placement, provider, actor, reason, timestamp, activity, and optional projected fields fail closed when malformed or identifier-shaped. The explicit public allowlist also sanitizes these fields defensively before API/UI projection.
- F2 / P2: the actual role-history `summary` interactive target and its row now retain a 44px minimum height at desktop and mobile widths, with an explicit keyboard focus indicator and no fixed-height responsive shrink.

## Changed implementation paths

- `server/outcome-package.test.mjs`
- `server/outcome-session-registry-persistence.mjs`
- `server/outcome-session-registry-persistence.test.mjs`
- `src/styles.css`

No unrelated dirty or untracked path was staged. `docs/ROADMAP 2.md` was not opened, edited, or staged.

## RED then GREEN evidence

- RED before implementation: the exact QA persisted `codex://tenant-alpha/private-conversation/short` probe loaded without `registry_conflict`; hostile persisted public metadata and unknown keys were accepted; the real role-history summary target had no 44px guarantee.
- Targeted correction: 53 Package plus persistence tests passed, 0 failed.
- Targeted session-binding Node: 74 tests passed, 0 failed across Package, legacy in-memory registry, persistent registry, and local control suites.
- Targeted frontend: 59 tests passed, 0 failed in `OutcomeDashboard.test.ts`.
- Full frontend: 90 tests passed, 0 failed across 5 files.
- Full Node: 224 tests passed, 0 failed.
- Production build: 1,652 modules transformed; Vite build passed in 722ms.
- `git diff --check`: passed.
- Public redaction: built assets and a 95,704-byte hostile public fixture produced 0 hits for the QA locator, credential/path/UUID probes, raw locator/provider fields, or session/thread/task/turn identifiers.
- Gate status: 6/6 closed after the immutable implementation correction commit.

## Rollback

- Product rollback: `git revert db7ecaa0bfb157e21c81ce58683aa3848065f8a2`.
- The correction made no live registry migration or assignment, provider/session/thread/task mutation, runtime file mutation, credential/hosted database mutation, deployment, push, release, QA decision, Release Audit decision, acceptance, or progress closure. No external rollback is required.

## Open work and authority boundary

- Fresh independent UX & Product QA remains open on the exact correction candidate.
- Separate Release Audit remains open after QA on the same candidate and any pinned artifact.
- Cherry acceptance, live registry migration/assignment, provider discovery or session creation, runtime routing, deployment, release, and progress closure remain open and unauthorized.
- Builder correction PASS does not revise the prior QA result, self-QA the candidate, or close any Project, Phase, Scope, Stage, acceptance Gate, or external outcome.

false_completion_count: 2

learning_receipt: Persisted state is an untrusted input boundary even when the current writer validates mutations; every public-projected field must be revalidated on load and sanitized again at projection. Accessibility evidence must bind to the actual interactive element and every responsive override, not only its visual container.
