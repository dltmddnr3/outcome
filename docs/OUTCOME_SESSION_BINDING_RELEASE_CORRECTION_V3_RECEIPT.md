# OUTCOME Session Binding Control Plane · Release Correction Builder Receipt V3

Status: **BUILDER CORRECTION PASS ONLY / Release Audit open / Cherry acceptance open**

Observed: 2026-08-27 KST

## Immutable correction candidate

- correction parent commit: `46e2531c0fbefedc6be5ce2f2243f5c60e46b16a`
- correction parent tree: `8c785c848fb8e01c05ab2906ee436a5d1dae22b3`
- implementation correction commit: `b748d799ff5e5c12c7bf9ffaeae184451919c82d`
- implementation correction tree: `37ee762cee6e8e490bc77464aaa6bbc118634b57`
- correction Gate: `GATES_OUTCOME_SESSION_BINDING_RELEASE_CORRECTION_V3.md`
- source Release Re-Audit report commit: `bedb2f47d5b1984bbbeb030b0b20e83c94013144`
- source Release Re-Audit report: `/tmp/outcome-session-binding-fresh-release-reaudit.nY3mhR/worktree/docs/OUTCOME_SESSION_BINDING_FRESH_RELEASE_REAUDIT_46E2531.md`

The receipt carrier commit is documentation-only and does not change the implementation correction candidate above.

## Corrected Release Re-Audit findings

- F1: registry safety is an exact positive invariant. Create and atomic replacement explicitly set `0600`; load uses `lstat`, exact mode, `O_NOFOLLOW`, and descriptor inode matching. Doctor reports every non-0600 mode as `registry_permissions_invalid`; unsupported no-follow platforms fail closed.
- F2: lock inspection no longer uses follow-style existence or path reads. Dangling/non-dangling symlinks, directories, wrong modes, wrong owners, and descriptor identity drift are invalid. Invalid recovery is refused before rename/remove, mutation preserves the blocking entry, and verified recovery rollback also tests directory-entry existence with `lstat`.
- F3: public aliases are 2-5 bounded lower-case semantic segments, at most 64 characters, and exclude provider/provider-object vocabulary. Intended `planner-primary` and `outcome-local-private` remain valid while URI, UUID, underscore/equal/colon, hyphenated session/thread/task/turn/sess, provider-name, credential, and path shapes fail closed.

## Changed implementation paths

- `docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`
- `server/outcome-package.mjs`
- `server/outcome-package.test.mjs`
- `server/outcome-session-registry-persistence.mjs`
- `server/outcome-session-registry-persistence.test.mjs`

No unrelated dirty or untracked path was staged. `docs/ROADMAP 2.md` was not opened, edited, or staged.

## RED then GREEN evidence

- RED before implementation: the exact-mode fixture did not return the required permission diagnosis; dangling lock symlink doctor returned healthy/clear; the manifest accepted `session-private-value`. The supplied re-audit independently reproduced accepted 0400/0700 modes and all five hyphenated identifier probes.
- Persistence: 13 passed, 0 failed.
- Package: 47 passed, 0 failed.
- Local control: 5 passed, 0 failed.
- Targeted session-binding Node: 82 passed, 0 failed across Package, control, persistent registry, and legacy in-memory registry suites.
- Full frontend: 90 passed, 0 failed across 5 files.
- Full Node: 232 passed, 0 failed.
- Production build: 1,652 modules transformed; Vite build passed in 737ms.
- `git diff --check`: passed.
- Public redaction: built assets and a 3,008-byte hostile public/doctor fixture produced 0 hits for raw provider/session/thread/task/turn identifiers or private lock-owner fields.
- Prohibited operation scan: persistence/control contain no `process.kill`, direct lock-path read, follow-style lock existence probe, provider/network/hosted database, deployment, or live-runtime operation.
- Gate status: 6/6 closed after the immutable implementation correction commit.

## Rollback

- This correction rollback: `git revert b748d799ff5e5c12c7bf9ffaeae184451919c82d`.
- Full feature rollback remains reverse commit order under separate authority; historical Gate/receipt/audit evidence is not a runtime rollback action.
- No live permission repair, lock recovery, registry migration/assignment, provider/session/task mutation, runtime file mutation, predecessor archive, deployment, push, release, QA/Audit verdict, acceptance, or progress mutation occurred. No external rollback is required.

## Open work and authority boundary

- Separate fresh Release Audit remains open on the exact new carrier candidate.
- No UI implementation changed; no new UX & Product QA was performed or claimed.
- Cherry acceptance, live permission repair, lock recovery, migration/assignment, provider discovery/session creation, routing, predecessor archive, deployment, release, and progress closure remain open and unauthorized.
- Builder correction PASS does not revise the prior re-audit FAIL, self-audit the candidate, or close any Project, Phase, Scope, Stage, acceptance Gate, or external outcome.

false_completion_count: 3

learning_receipt: Fail-closed filesystem policy must define the one accepted state, use no-follow directory-entry and descriptor identity checks, and preserve unverified objects. Public aliases need a semantic grammar with reserved provider vocabulary, not merely a stable-ID character regex.
