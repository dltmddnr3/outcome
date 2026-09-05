# Phase 4 timeline status read contract

Status: UNPROMOTED CANDIDATE / AP-4-READ-STATUS. Parent scope outcome-phase-4-linked-chat; child milestone outcome-stage-phase4-timeline-status-read. Authority: scoped Planner implementation handoff SHA-256 7578718a6e4a5072e8bc98592595ab350d1fa64293a2053095d203bdce184164, based on approved MVP D1/D5/D6. Base 90daddb222b705b48e6af0c764707c4758ed296f.

User outcome: an authorized read/reload returns the stored user message's exact current delivery and dispatch facts without inferring them from queued state or activity.

Only returned user_message events require own enumerable data delivery (acknowledged, delivery_unknown, rejected, failed) and dispatch_state (not_invoked, dispatch_intent_recorded, invoked). Validate each enum independently: Postgres intent-recorded failed/rejected is legitimate history. These values do not prove execution, completion or acceptance. Reserved non-user events retain their seven-field shape and have no fabricated status. In-memory stored events and snapshot schema stay unchanged; project/binding/correlation identifies the validated idempotency result. Postgres selects both existing columns from the same workspace/project/binding/cursor-scoped row. Hosted owner/workspace/project authorization and server binding ownership remain unchanged.

Client typing preserves its existing user-message discriminant; no widening of the currently user-only rendered surface or fake statuses for reserved kinds is authorized. No status labels, UI behavior change, hosted wiring, live DB/migration, send enabling, consumer execution, draft/goal-version/reply history or full D5/D6 closure is included.

Acceptance: T1-T8 in GATES_PHASE4_TIMELINE_STATUS_READ.md. Termination is one coherent local candidate with intentional RED and all Builder GREEN evidence, or a sealed scoped failure. Fresh independent UX/Product QA, Release Audit and Cherry acceptance remain separate and OPEN. The previous 90daddb procedural Audit FAIL remains OPEN. Existing Current, Phase, progress and Gate history are not rewritten.

Rollback: retain base, task-owned changes/candidate and immutable receipts; no reset/clean/deletion. No promotion, deployment or release authority.

