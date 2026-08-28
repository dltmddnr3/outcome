# OUTCOME 역할 세션 작업환경 활성화 · Builder Handoff

Status: **AUTHORIZED LOCAL-ONLY OPERATION**

## Outcome

현재 대화는 `outcome/planner`, 기존 전담 세션은 `outcome/builder`, `outcome/ux_product_qa`, `outcome/release_audit`로 실제 수신 가능한 상태다. 이 네 역할을 private registry와 public-safe `OUTCOME_SESSIONS.md`에 일치시키고, 한 건의 no-op/read-only Planner→Builder lifecycle을 append-only로 증명한다.

## Exact preconditions

- canonical product base: `29e849ba3fb6c87ec3cd783855b2d810f9c4b924`
- canonical product base tree: `b6f6e4c9ee460e6ca4af0f639e3aa960f2ab3568`
- handoff carrier must be the direct child of that base and change only this handoff plus `GATES_OUTCOME_SESSION_WORK_ENVIRONMENT_ACTIVATION.md`
- private registry: `.outcome-runtime/bindings.json`, schema v2, revision 28, exact mode `0600`
- current registry: Planner alias `planner-primary`, version 2, status `blocked`; Builder/QA/Audit current 없음, last version 1 revoked
- Package manifest: four roles `unbound`, version 0
- readiness evidence supplied out-of-band: all four roles replied `ROLE_READY_ACK`; Builder and Release Audit observed the exact HEAD; QA intentionally did not probe source; mutation count 0

Any precondition drift is `SAFE_HOLD`; do not coerce, overwrite, retry or infer a new binding.

## Allowed mutations

- `docs/OUTCOME_SESSIONS.md`
- `.outcome-runtime/bindings.json` through the existing session control only
- `GATES_OUTCOME_SESSION_WORK_ENVIRONMENT_ACTIVATION.md` evidence fields
- `docs/OUTCOME_SESSION_WORK_ENVIRONMENT_ACTIVATION_BUILDER_RECEIPT.md`
- a private local lifecycle ledger under `.outcome-runtime/` if the promoted execution-control API requires it

Private locators are supplied only in the Builder instruction/private input. They must not appear in argv, Git, receipt, log, API, UI or tool output.

## Required operation

1. Revalidate HEAD/tree, dirty-path fingerprint for unrelated user work, registry revision/mode/doctor and exact manifest bytes.
2. Keep Planner binding version 2; append one `active` observation based only on the current Planner interaction/readiness evidence. Do not assign/replace it.
3. CAS-assign Builder, UX & Product QA and Release Audit once each from historical version 1 with aliases `builder-primary`, `ux-qa-primary`, `release-audit-primary`. Append a truthful `idle` observation after the readiness probe; do not invent NOW.
4. Update the manifest to the exact alias/version/state projection. No raw locator or provider identifier may enter Git.
5. Use the promoted local execution-control plane to record exactly one read-only readiness instruction to Builder with the minimal normal lifecycle ending in `handoff_accepted`. The already observed Builder ACK is the role result. Do not message the role again merely to create evidence.
6. Run focused registry/control/Package/redaction checks and the smallest relevant configured regression. Record actual commands and counts.
7. Commit only the allowed source-controlled files. Leave private runtime state uncommitted and mode `0600`.

## Forbidden

- product UI/API/provider adapter implementation
- any new session, replacement, archive, delete, retry or duplicate dispatch
- Supabase, Clerk, Vercel, credential, billing, network, deploy, push, release or external mutation
- editing `docs/ROADMAP 2.md` or unrelated dirty/user-owned paths
- treating reachability, assignment or lifecycle events as Gate progress, QA PASS, Audit PASS, Cherry acceptance or release

## Terminal report

Return exactly `CANDIDATE_READY`, `SAFE_HOLD` or `BLOCKED` with commit/tree/parent, changed paths, before/after public-safe binding projection, lifecycle event count/order, test evidence, raw identifier leak count, unrelated dirty fingerprint, rollback and `false_completion_count`.

`CANDIDATE_READY` opens fresh independent QA only. It does not complete the setting until separate Release Audit and canonical promotion succeed.
