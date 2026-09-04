# OUTCOME MVP Phase 4-5 Execution Graph — D1 Draft

Status: DRAFT · Planner-owned · non-canonical · all evidence pending
Authority: Cherry's 2026-09-04 14-day MVP approval and D18 ratification
Execution window: 2026-09-04 07:55:25 KST through 2026-09-18 07:55:25 KST

This draft makes the compressed Phase 4-5 destination boundaries executable. It does not close a Predicate, change `docs/OUTCOME_MAP.md`, authorize Planner implementation, or claim QA, Audit, acceptance or release.

## Phase 4 Destination — OUTCOME 안에서 Planner 원채널로 개발 흐름을 완결한다

Observable result: Cherry uses one Planner conversation channel while observing routed Builder, UX & Product QA and Release Audit work, reviews approval/evidence, and completes an existing or newly composed project's development flow in one private Preview.

### M4-1 · Planner single-channel workspace

- User delta: Cherry writes in one Planner composer and reads every specialist result through one ordered project timeline or read-only role filter.
- Dependency: supported Phase 3 adapter and exact current role bindings.
- Fallback: adapter NO-GO yields read-only observation; composer stays absent.

### AP-4-01 · Single input authority

CHECK: Render desktop and mobile authenticated workspaces and enumerate every editable message control.
EXPECT: Exactly one composer exists, its destination is Planner, and specialist filters expose zero composers or direct-send controls.
EVIDENCE: pending

### AP-4-02 · Planner routing only

CHECK: Attempt Cherry-to-Builder, Cherry-to-QA and Cherry-to-Audit requests through UI, API and replayed client payloads.
EXPECT: All direct specialist sends fail closed; a valid Planner request can route to exactly one verified target and produces a public-safe routing receipt.
EVIDENCE: pending

### AP-4-03 · One dataset, read-only lenses

CHECK: Compare message IDs, server sequences and ordering in integrated, Planner, Builder, QA and Audit views.
EXPECT: Role views are filters over the same ordered dataset; no duplicate room, forked ordering or filter-local message exists.
EVIDENCE: pending

### AP-4-04 · Delivery ambiguity and deduplication

CHECK: Reproduce stale binding, offline, timeout, duplicate client ID and out-of-order provider receipt cases.
EXPECT: Stale inputs are blocked, duplicates converge once, and post-dispatch ambiguity terminates as `delivery_unknown` with zero automatic replay.
EVIDENCE: pending

### M4-2 · Approval and immutable evidence

- User delta: Cherry distinguishes a request for authority from session activity and can inspect the exact evidence behind a candidate.
- Fallback: mutation controls disappear; public-safe read-only detail remains.

### AP-4-05 · Approval state machine

CHECK: Exercise approve, rework and blocker decisions including expiry, stale candidate and duplicate submission.
EXPECT: One immutable decision is recorded per request; stale or duplicate decisions do not mutate the target.
EVIDENCE: pending

### AP-4-06 · Candidate provenance

CHECK: Open candidate, diff, tests, artifact, QA and Audit views from one frozen candidate.
EXPECT: All surfaces resolve to the same commit/tree/artifact identity and distinguish Builder, QA, Audit and Cherry authority.
EVIDENCE: pending

### AP-4-07 · Activity is not progress

CHECK: Stream messages, tool calls and long-running activity without changing any Acceptance Predicate evidence.
EXPECT: No roadmap, progress rail, Gate, health, confidence or completion value changes.
EVIDENCE: pending

### M4-3 · Connections, project composition and private Preview

- User delta: Cherry sees safe connection/runtime state and can compose a template project with four governed roles.
- Fallback: connection inventory stays read-only and creation controls are absent.

### AP-4-08 · Connection authority and secrecy

CHECK: Render connected, disconnected, permission-denied, stale and privacy-fail states and scan emitted HTML/log/analytics payloads.
EXPECT: No credential, locator, local path or raw provider identifier appears; redaction failure blocks the whole projection.
EVIDENCE: pending

### AP-4-09 · Atomic project and role composition

CHECK: Create a template Package with Planner, Builder, UX & Product QA and Release Audit under injected partial failures.
EXPECT: Creation is atomic or recoverably rolled back; exactly one current binding exists per role and no orphan authority remains.
EVIDENCE: pending

### AP-4-10 · Responsive and accessible workspace

CHECK: Verify desktop at and above 1100px, collapse threshold, supported mobile widths, 200% text, forced colors, screen reader and reduced motion.
EXPECT: Map > approval > conversation priority holds; mobile has 지도/대화/승인; targets are at least 44px; clipping, overlap and inaccessible state-only color are zero.
EVIDENCE: pending

### AP-4-11 · Core MVP dogfood and independent authority

CHECK: Use the same immutable private Preview candidate for real OUTCOME work, fresh official UX/Product QA and separate Release Audit.
EXPECT: Dogfood transcript, QA verdict and Audit verdict reference one candidate; none substitutes for Cherry acceptance.
EVIDENCE: pending

## Phase 5 Destination — 원하는 결과를 발견하고 확인한 뒤에만 프로젝트를 시작한다

Observable result: Cherry enters through `200Q guided discovery` or `brief gap analysis`, answers only necessary questions in a choice-oriented conversation, reviews the resulting Destination, and explicitly confirms before any project/session/Gate creation.

### M5-1 · Two evidence-aware discovery entries

- User delta: Cherry can start from an idea or an existing document without repeating already answered questions.
- Fallback: text/Markdown only; image OCR, spreadsheet ingestion and automatic reconciliation remain absent.

### AP-5-01 · Guided discovery adapts and stops

CHECK: Run sparse, detailed, conflicting and early-complete idea fixtures through the guided path.
EXPECT: Questions are selected from uncovered decision domains, terminate when material gaps are zero, and never exceed 200.
EVIDENCE: pending

### AP-5-02 · Brief gap analysis asks only gaps

CHECK: Ingest supported brief/PRD fixtures with complete, missing, ambiguous, conflicting and duplicate answers.
EXPECT: Supported evidence is cited, duplicates are merged, and only missing, ambiguous or conflicting domains generate questions.
EVIDENCE: pending

### AP-5-03 · Question and choice UX

CHECK: Render recommended answer with reason, mutually exclusive choices, optional free input, back/edit, loading, error, offline and long-text states.
EXPECT: One decision is understandable and operable per step on desktop/mobile, keyboard and screen reader without color-only meaning or lost prior answers.
EVIDENCE: pending

### M5-2 · Shared Destination review and explicit confirmation

- User delta: both entry paths converge on one inspectable result before execution machinery exists.
- Fallback: unresolved material contradictions keep confirmation disabled.

### AP-5-04 · Shared Destination review

CHECK: Compare review payloads produced from equivalent guided and brief inputs.
EXPECT: Both show problem, target user, desired outcome, scope, non-goals, constraints, acceptance, failure/recovery and residual unknowns in the same schema.
EVIDENCE: pending

### AP-5-05 · Confirmation is the creation boundary

CHECK: Inspect database, provider, registry and Git effects during entry, questioning, review, edit, cancel and explicit confirm.
EXPECT: Zero project, role session or Gate is created before Cherry explicitly confirms; confirmation produces one idempotent creation request.
EVIDENCE: pending

### AP-5-06 · Source and privacy containment

CHECK: Scan rendered copy, logs, analytics and exports for document content, filename, credential, local path and provider locator across success and parser failure.
EXPECT: Only allowlisted public-safe evidence references survive; privacy failure blocks the projection and creates no project.
EVIDENCE: pending

### AP-5-07 · Full MVP dogfood and acceptance chain

CHECK: Use OUTCOME's own approved documents through the immutable Preview, then run fresh official UX/Product QA, separate Release Audit and Cherry dogfood.
EXPECT: All three boundaries reference the same candidate and Cherry explicitly accepts or holds; Production and external release remain unchanged.
EVIDENCE: pending

## Frontier and stop rule

Ready frontier: AP-4-01 through AP-4-04 design/adapter evidence may proceed; Builder implementation waits for adapter and viewport feasibility. Phase 5 contract fixtures may be prepared without project creation.

For the same defect class, permit one correction on a new immutable pin. A second failure or ambiguous result activates the stated fallback and stops that route. Session activity and this draft do not change canonical completion.
