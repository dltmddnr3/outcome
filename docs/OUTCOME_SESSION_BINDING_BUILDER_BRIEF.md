# OUTCOME Builder Brief · Session Binding Control Plane

Status: **PLANNER HANDOFF READY / IMPLEMENTATION SOURCE PIN NOT YET ISSUED / PROVIDER AND DEPLOY MUTATION FORBIDDEN**

## Objective

향후 exact implementation source pin이 발행되면 `docs/OUTCOME_SESSION_BINDING_CONTROL_PLANE.md`를 최소 구현해 모든 Package 프로젝트가 Planner, Builder, UX & Product QA, Release Audit의 현재 assignment와 append-only replacement history를 안전하게 추적하게 한다. 이 문서 commit 자체는 실행 권한이 아니다.

## Source pin

Planner가 별도 dispatch에서 exact HEAD/tree와 이 brief·contract·Gate SHA-256을 고정한 뒤에만 Builder가 시작한다. source pin이 없거나 dirty-state collision이면 `SAFE_HOLD`한다.

## Allowed product paths

- `server/outcome-package.mjs`
- `server/outcome-package.test.mjs`
- `server/phase3-private-session-registry.mjs`
- `server/phase3-private-session-registry.test.mjs`
- 새 session registry persistence/CLI module과 해당 tests under `server/`
- `src/components/OutcomeDashboard.tsx`
- `src/components/OutcomeDashboard.test.ts`
- `src/components/outcomeKorean.ts`
- dashboard-specific rules in `src/styles.css`
- `config/outcome-projects.json`
- `templates/OUTCOME_SESSIONS.md`
- OUTCOME-only `docs/OUTCOME_SESSIONS.md`
- `package.json` only if one local management script entry is necessary
- implementation Gate/receipt created specifically for this slice

## Forbidden

- existing unrelated dirty/untracked files and `docs/ROADMAP 2.md`
- Cherry Note repository or product files
- raw provider session/thread/task/turn ID in Git, normal logs, API or UI
- actual provider discovery, task creation, dispatch, archive/delete or credential access
- hosted database/account/provider/runtime mutation
- push, deploy, release, QA, Audit or Cherry acceptance
- progress/Gate/`EXTERNAL_OUTCOME_COMPLETE` promotion

## Required implementation behavior

- absent `sessions_file` keeps Package structure valid but returns `setup_required` and four unbound role slots
- private persistent v2 registry enforces one active binding per project+role, CAS versions, atomic state+event, restart recovery and append-only history
- legacy runtime input migrates only with a receipt and stale-by-default observation semantics
- management actions are `doctor/assign/replace/revoke/observe/checkpoint`; raw locator never appears in argv or stdout
- Planner replace requires routing freeze, verified handoff, `STARTED`, `CONTINUITY_READY` and read-after-write before predecessor archive eligibility
- public API/UI show role/status/freshness/version/history/stage only and leak no private locator or raw identifier
- current OUTCOME manifest is created with four role slots but no assignment is invented

## Verification

- RED tests first for missing manifest, stale legacy migration, duplicate active, stale CAS, crash/partial write, concurrent replace, Planner unsafe replace, public redaction and history UI
- targeted registry/package/frontend tests
- full frontend and Node suites
- production build
- `git diff --check`
- exact prohibited-output scan over built asset and `/api/dashboard` fixture

## Receipt

Return exact parent/commit/tree, changed paths, test counts, migration behavior, public prohibited hit count, rollback, remaining open operations, `false_completion_count` and `learning_receipt`. Builder candidate is not QA, Audit, live assignment, deployment or completion.
