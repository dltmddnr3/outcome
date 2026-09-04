# OUTCOME MVP 14-Day Resource and Model Allocation

Status: FIXED · Cherry-approved
Execution window: 2026-09-04 07:55:25 KST through 2026-09-18 07:55:25 KST
Applies to: Phase 1-5 compressed MVP execution in `docs/MVP_14_DAY_EXECUTION_PLAN.md`

This allocation is a routing and throttling contract, not a token guarantee or progress metric. Provider reset-window percentages are ceilings to protect the critical path and reserves. Only immutable Gate evidence changes canonical progress.

## 1. Fixed authority boundary

- Codex retains official Planner, Builder, UX & Product QA and Release Audit authority in their exact registered OUTCOME role sessions.
- Fable and Opus accelerate design, architecture and pre-mortem work but remain advisory; they cannot replace official Builder, QA, Audit, Cherry acceptance or release authority.
- Before every official dispatch, resolve exactly one current project-role binding and verify its loadability, immutable source pin and dirty-state boundary. Ambiguity is a safe hold, not permission to infer or substitute a session.
- There is one canonical implementation target and one source-mutating executor at a time.

## 2. Codex Pro 20x allocation

| Lane | Fixed share | Default model / reasoning | Escalation | Output boundary |
|---|---:|---|---|---|
| Builder | 45% | `gpt-5.6-sol`, medium | high only for security, auth, migration, concurrency or rollback-sensitive slices | isolated task-owned source/tests/candidate commit and receipt |
| Official UX & Product QA | 20% | `gpt-5.6-sol`, medium | high for privacy, accessibility, hostile state or device-bound reproduction | read-only verdict on one immutable candidate |
| Release Audit | 12% | `gpt-5.6-sol`, high | no model downgrade | separate read-only release/privacy/runtime/rollback verdict |
| Planner / control | 8% | `gpt-5.6-terra`, low | `gpt-5.6-sol`, medium for contract conflicts; high only for narrow high-risk authority decisions | contract, graph, handoff and evidence-derived progress only |
| Protected reserve | 15% | model follows the consuming official lane | only one release-critical correction or provider recovery | cannot be spent on polish, duplicate review or repeated delivery attempts |

Mechanical read-only inventory work may use `gpt-5.6-luna`, low, only when it cannot mutate product/runtime state or issue an official verdict. It does not replace any row above.

## 3. Claude Max 20x allocation

| Lane | Fixed share | Model / reasoning | Use | Output boundary |
|---|---:|---|---|---|
| Design-ahead | 35% | Fable 5.1, medium by default; high only for a full critical-path responsive/accessibility state matrix | tokens, components, states, responsive layouts, motion and implementation handoff for the next slice | design artifact only; green is accent, never a background surface |
| Architecture / pre-mortem | 35% | Opus 5, medium | contract completeness, architecture, data/API boundaries and pre-implementation contradiction search | advisory evidence only |
| High-risk review / recovery | drawn from the Opus share or reserve | Opus 5, high | privacy, security, auth, migration, deployment/rollback and one bounded alternate path | advisory only; no official QA/Audit transition |
| Protected reserve | 30% | Fable 5.1 medium/high or Opus 5 medium/high according to the lane | late hostile re-review, missing responsive/state variant, or one recovery path near freeze | no downgrade to a general model merely to keep activity running |

Fable is used for design mutation; Opus is used for non-design analysis and review. A Fable design is not implementation-ready until its immutable pin and handoff are independently consumable. An Opus pass does not count as official UX & Product QA or Release Audit.

## 4. Concurrency and sequencing

A maximum of three non-conflicting lanes may be active:

1. Fable designs slice N+1.
2. The exact Builder implements slice N in an isolated worktree.
3. Opus pre-reviews or official QA read-only verifies immutable slice N-1.

Hard limits:

- one source-mutating Builder lane;
- one Fable design-artifact mutation lane;
- one read-only review lane;
- no simultaneous QA and Audit verdict on a moving candidate;
- no schema/provider mutation concurrent with another runtime mutation;
- D12 source freeze before official Full MVP QA.

## 5. Reset-window throttle and reserve release

- Percentages apply independently inside each provider's current reset window; they are not averaged across the fourteen days.
- At 70% of a non-reserve lane, checkpoint and finish the current bounded unit before starting another.
- Reserve use requires a named blocker, immutable input pin, one expected recovery result and a stop condition.
- At 100% of a lane, do not borrow from another official role. Pause that lane at a durable checkpoint and continue only independent, non-conflicting work.
- Provider quota exhaustion never authorizes a weaker authority model, a role substitution, skipped QA/Audit or a progress claim.

## 6. Monitoring and anti-loop policy

No scheduled heartbeat is used. Each executor must emit `STARTED`, one bounded checkpoint when materially useful, and a terminal or blocker. Planner monitoring occurs at message boundaries and active review turns.

For the same defect class or delivery path:

1. observe and classify the first failure;
2. allow one correction on a new immutable pin;
3. if it fails or remains ambiguous, activate the predeclared fallback and stop that route.

Session activity, retries, elapsed time and model usage do not change roadmap progress.

## 7. GitHub and deployment boundary

GitHub push is authorized for this execution window only for a verified task-owned candidate commit or candidate branch produced by the exact Builder and bounded by its handoff. Before push, the Builder must re-read the staged path list, candidate commit/tree, tests, remote and target ref; unrelated dirty or user-owned bytes must remain unstaged and unpushed.

Unique Vercel Preview deployments and their bounded rollback are authorized by the execution plan. Production, stable/custom domain, paid changes and external release remain separately authorized boundaries. A GitHub push, Preview READY state or advisory PASS does not equal Cherry acceptance or release.

## 8. Fixed phase priority

1. D1-D2: Phase 4/5 contracts, D18 non-goals, adapter/layout feasibility and Fable handoff.
2. D3-D6: shell, durable role chat and one-shot Planner send through Preview 2.
3. D7-D10: approval/evidence, candidate workspace, connection status and project/role composition through Preview 4.
4. D11-D12: Phase 4 dogfood, Phase 5 destination setting and Preview 5; then source freeze.
5. D13-D14: fresh official QA, smallest eligible correction/re-QA, separate Release Audit and Cherry dogfood/decision.

New feature ideas do not preempt this order. Only a safety defect or an Acceptance Predicate blocker may do so.
