# OUTCOME Phase 1-5 MVP — 14-Day Continuous Execution Plan

Status: ACTIVE · Cherry-approved 2026-09-04 07:55:25 KST
Execution window: 2026-09-04 07:55:25 KST through 2026-09-18 07:55:25 KST
Target: 14 continuous calendar days
Capacity assumption: Codex Pro 20x + Claude Max 20x, with quota treated as burst capacity rather than completion evidence
Acceptance authority: Cherry
Fixed allocation: `docs/MVP_14_DAY_RESOURCE_MODEL_ALLOCATION.md`

## 1. Outcome and finish line

The 14-day objective is not “many tasks completed.” It is:

> Cherry can use OUTCOME on desktop and mobile to access private projects, operate existing and newly composed role sessions through a safe Planner path, review approvals and immutable candidate evidence, and set a new Destination either through guided 200Q discovery or existing-document gap analysis.

Two observable boundaries:

- **Core MVP:** Phase 1-4 are usable in one integrated private Preview and accepted by Cherry for real OUTCOME-project work.
- **Full MVP:** Phase 5 Destination setting is integrated, independently verified and accepted after real dogfood with OUTCOME's own documents.

Neither boundary is complete without immutable candidate evidence, fresh official UX/Product QA, separate Release Audit and Cherry acceptance. Production and external release remain separate.

## 2. Scope lock for fourteen days

Included:

- Phase 2 private account access and authorized project workspace closure needed by the MVP.
- Phase 3 existing-session observation, Planner-only routing, evidence return and physical acceptance.
- Phase 4 role chat, approval/evidence view, candidate diff/test/QA view, connection/runtime status, template project/Package creation and four-role composition.
- Phase 5 two-entry Destination setting: guided 200Q or brief/PRD gap analysis; conversational questions/choices; Destination review and explicit confirmation.
- Desktop and mobile, Korean and English stress text, reduced motion, forced colors and fail-closed privacy behavior.

Deferred beyond the 14-day MVP:

- Role-chat attachments, clarification threads, push/email notifications and provider-history import.
- General browser IDE, arbitrary terminal, direct secret editor and arbitrary provider marketplace.
- OCR for image-only documents, complex spreadsheet ingestion and automatic multi-document reconciliation.
- Multi-user organizations, billing, stable custom domain, public launch and Phase 6+ portfolio intelligence.

### D18 explicit role-chat non-goals — ratified

Cherry approved D18's recommended non-goals on 2026-09-04. Phase 4 role chat does not become a general provider-replacement chat, session/role creator, browser IDE, arbitrary shell/file editor, approval-delegation surface, self-acceptance mechanism, Gate self-closure mechanism, release/deploy console, Question 200/project-creation flow, attachment system, clarification-thread system or content-moderation product. Session activity never becomes progress. Phase 4 project/role creation and Phase 5 Destination setting remain separate bounded destinations in this plan.

## 3. Operating system and authority lanes

### Official role authority

| Lane | Owner | Work | May mutate | Cannot claim |
|---|---|---|---|---|
| Control | Codex Planner | Contract, Outcome Graph, priority, exact handoff, progress projection | Planner-owned contracts only when authorized | implementation, QA, Audit, acceptance |
| Build | current exact OUTCOME Builder | one bounded vertical slice in an isolated worktree | allowlisted source/tests/candidate commit | QA, Audit, acceptance, release |
| QA | fresh exact OUTCOME UX & Product QA | hostile reproduction of an immutable commit | QA report/receipt only | Audit, acceptance, release |
| Audit | fresh exact OUTCOME Release Audit | runtime/privacy/regression/rollback scope | Audit report/receipt only | Cherry acceptance, release |
| Accept | Cherry | real desktop/mobile dogfood and product decision | acceptance decision | automatic release unless separately stated |

### Claude acceleration lanes

| Lane | Model | Work | Boundary |
|---|---|---|---|
| Design-ahead | Fable 5.1, medium | next slice screens, tokens, states, responsive and motion handoff | design artifact only |
| Pre-mortem | Opus 5, medium/high | architecture, security, migration and hostile design/code review before official handoff | advisory only |
| Recovery | Opus 5, high | one bounded alternative after a failed technical path | no repeated retries; no authority transition |

Claude advisory never closes an official Builder, QA, Audit, Cherry acceptance or release boundary. It is used to find defects before the scarce official lane consumes a candidate.

## 4. Continuous pipeline

At steady state three non-conflicting items may be active:

1. Fable designs slice N+1.
2. Builder implements slice N.
3. Opus reviews or official QA verifies immutable slice N-1.

There is always **one canonical implementation target**. Two executors never edit the same source/schema/migration slice concurrently. Official QA reads a frozen commit while Builder may prepare a non-overlapping next slice in a separate worktree.

No scheduled heartbeat is reintroduced. Executors emit `STARTED`, bounded checkpoint, terminal or blocker events; the Planner consumes them at message boundaries and during an active monitoring turn. Session activity alone never changes progress.

## 5. Capacity budget

Exact provider quotas may vary, so allocation is a throttle policy rather than a token promise.

### Codex Pro 20x

- 45% Builder implementation and deterministic tests.
- 20% official UX/Product QA and re-QA.
- 12% Release Audit and deployment verification.
- 8% Planner synthesis, handoffs and progress projection.
- **15% reserve** for one release-critical correction or provider recovery.

### Claude Max 20x

- 35% Fable design and responsive/state variants.
- 35% Opus architecture/security/pre-mortem.
- **30% reserve** for hostile re-review and one recovery path near candidate freeze.

The exact model matrix, reset-window throttles, concurrency caps and reserve-release rules are fixed in `docs/MVP_14_DAY_RESOURCE_MODEL_ALLOCATION.md`.

Context policy: checkpoint at each immutable terminal; rotate any lane before context degradation; transfer content-addressed pins and decisions, never raw conversation history.

## 6. Fourteen-day critical path

| Day | User-result target | Exit evidence | Fallback if missed |
|---|---|---|---|
| D1 | Freeze MVP scope; ratify D18; define Phase 4-5 executable Destination/Milestone/Predicate graph | Cherry decision pin plus draft graph with runnable predicates | design preparation continues; implementation stays blocked |
| D2 | Prove Codex adapter path and >=1100px integrated-layout feasibility; finish Phase 4-A Fable candidate | supported-interface evidence, measured breakpoint and immutable design pin | adapter NO-GO reduces first candidate to read-only observation; layout collapses chat to a peer tab |
| D3 | Implement branded desktop/mobile shell and role-chat fixture states | Builder commit, RED-to-GREEN tests, Preview-ready receipt | remove animation refinement, preserve states/accessibility |
| D4 | Deploy Preview 1 and complete Cherry layout/motion dogfood | unique Preview, HTTPS matrix and Cherry findings | rollback only the new deployment; correct one coherent slice |
| D5 | Implement authenticated durable message read, retention class, forced RLS/revoke and privacy-closed projection | migration equality, privilege tests, message read candidate | local fixture Preview remains; hosted write path stays disabled and MVP marked at-risk |
| D6 | Implement Cherry-to-Planner send, idempotency/dedup, stale blocking and terminal delivery_unknown | one-shot send tests plus Preview 2 mobile dogfood | disable composer and ship read-only state; no automatic replay |
| D7 | Implement approval inbox and immutable decision record with approve/rework/blocker paths | state-machine tests, evidence linkage and Preview 3 | keep read-only approval detail; mutation controls absent |
| D8 | Implement candidate workspace: diff, tests, artifact, QA/Audit result and provenance | hostile fixture suite and private-locator scan | show public-safe summary only; raw diff/tool surfaces remain absent |
| D9 | Implement MCP/API/CLI/provider/environment/deployment status and safe connect/disconnect boundary | allowlisted connector states, permission denial and rollback tests | read-only inventory only; no secret editor or provider mutation |
| D10 | Implement template project/Package creation and four-role composition | atomic creation/recovery tests and Preview 4 | creation disabled; existing-project workflow remains usable |
| D11 | Freeze and dogfood integrated Phase 4 Core MVP using OUTCOME itself | exact commit, desktop/mobile task transcript, blocker list and Core MVP Cherry verdict | one correction attempt; otherwise explicit Core MVP hold |
| D12 | Run Phase 5 dogfood on OUTCOME documents, then implement 200Q/brief-gap intake, choice UX and Destination review | duplicate-question count, gap classification, immutable Preview 5 candidate | text/Markdown only; PDF parsing and document upload remain disabled |
| D13 | Freeze Full MVP candidate; fresh official UX/Product QA and bounded correction/re-QA | QA terminal on exact commit with privacy/accessibility/device evidence | fail closed; only smallest correction slice proceeds |
| D14 | Separate Release Audit, Cherry final dogfood and explicit Full MVP acceptance decision | Audit terminal, rollback receipt and Cherry verdict | no completion claim; publish exact blocker and recovery date |

## 7. Preview ladder

| Preview | Target day | Included | Explicitly not proven |
|---|---:|---|---|
| Preview 1 | D4 | brand shell, desktop/mobile IA, fixture chat and all visual states | persistence, send, hosted privacy |
| Preview 2 | D6 | authenticated read and one-shot Planner send semantics | approvals and candidate workspace |
| Preview 3 | D7 | approval inbox and immutable decision record | project creation and full development |
| Preview 4 | D10 | integrated Phase 4 Core MVP including connection status and template creation | Phase 5 and final acceptance |
| Preview 5 | D12 | Phase 5 Destination setting with OUTCOME document dogfood | official QA, Audit, Cherry final acceptance |

Every Preview is a unique immutable commit/deployment. Stable alias, Production, custom domain and external release remain outside this plan unless separately approved.

GitHub push is included only for verified task-owned candidate commits/branches under the fixed allocation contract. It does not authorize pushing unrelated dirty bytes, promoting a candidate, or releasing externally.

## 8. Stop rules and anti-loop policy

- A failed or ambiguous provider/external action gets no automatic replay.
- The same defect class receives **one correction attempt** on a new immutable pin, then a declared fallback or Cherry scope decision.
- A Preview failure removes or disables the smallest unsafe capability; it does not weaken privacy, authority, data-integrity or acceptance predicates.
- `delivery_unknown` is terminal until a new explicit Cherry action.
- At D6, D10 and D12, missed critical-path exits trigger an immediate at-risk report with lost scope, owner, fallback and revised probability of D14 acceptance.
- D12 is the source freeze. New ideas go to Phase 6+ backlog unless they close a safety or acceptance defect.

## 9. Daily evidence envelope

Each terminal records:

- workstream and run identifier;
- immutable input and candidate pins;
- objective delta, Gate delta and user-value delta;
- exact checks and observed evidence;
- changed paths and dirty-state disposition;
- external mutation/retry count;
- blocker and fallback;
- next eligible action and whether Cherry is needed.

All-zero deltas are `NO_CANONICAL_DELTA`, not completion.

## 10. D14 success criteria

- Phase 1-5 executable Acceptance Predicates are defined and evidence-closed for the agreed compressed scope.
- Phase 2 and Phase 3 are not falsely closed by Phase 4-5 activity.
- Phase 4 Core MVP and Phase 5 Destination setting work on desktop and mobile with real OUTCOME-project dogfood.
- No rendered/logged/emitted private locator, credential, local path or raw provider identifier survives.
- Fresh official QA and separate Release Audit pass the same immutable candidate.
- Cherry explicitly accepts or explicitly holds the Full MVP.
- Production and external release remain separate decisions.
