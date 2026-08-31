# OUTCOME Model v2 B3 observed Planner conversation · Builder receipt

Status: `B3_OBSERVED_CONVERSATION_CANDIDATE_READY`

This receipt records only the isolated B3 Builder candidate and bounded verification. It does not check or promote B3, perform UX QA or Release Audit, authorize deployment or release, imply Cherry acceptance, close Q2/A5/C1, or advance the Phase.

## Immutable input and candidate

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B3`
- Builder handoff SHA-256: `830bec5512272ea755c3b001aceccb20e2998b3f59ef8c7253e99c404495c62d`
- Exact source commit/tree/parent: `3faead70b15530e2b342731261ddd2eef9bc44f3` / `e06e4d1bf89e964c2a2e779afa0431886856ca5d` / `97c4b3dbdd4755ddde116c8a707fcde1aebd7e39`
- Product/test candidate commit/tree/parent: `501e78d3259277bc9c3f15906f7e2f724fbe997b` / `5ec602e6d3e379393cc90b3d3029967abf9db055` / `3faead70b15530e2b342731261ddd2eef9bc44f3`
- Isolated worktree used only the existing task-owned dependency link; no install or fetch occurred.

## Changed scope

- `server/account-model-v2-projection.mjs`
- `server/account-model-v2-projection.test.mjs`
- `src/lib/api.ts`
- `src/components/PlannerConversation.tsx`
- `src/components/PlannerConversation.test.tsx`
- `src/components/OutcomeDashboard.tsx`
- `src/components/AccountWorkspace.test.tsx`
- `src/components/CurrentProjection.test.tsx`
- `src/styles.css`

## Implemented contract

The server projection accepts only the exact event keys `type`, `summary`, `observedAt`, and `status`. Public event types are limited to `work_observed`, `result_observed`, and `boundary_observed`; statuses are limited to `observed`, `active`, `blocked`, `delivery_unknown`, `failed`, `rejected`, and `safe_hold`. `active` is valid only for an actually observed `work_observed` event. Events are deterministically ordered by observed timestamp and stable public fields.

The read-only Planner conversation renders only those projected values. Empty input renders `아직 관측된 Planner 작업 이벤트가 없습니다`. Terminal events never render as running or completed. No composer, send path, synthetic message, tool call, typing indicator, progress, elapsed animation, polling-derived lifecycle or client canonical calculation was added.

Desktop presents conversation left and Current Projection right. Mobile presents compact Current Projection before conversation. Existing B2 authorization, private project allowlist, switching and compatibility branches remain intact.

## RED and GREEN evidence

- RED on the exact parent: the projection rejected the new `events` root key and had no conversation component; server suite `8/10 PASS`, with the two observed-event tests failing `account_model_v2_unexpected_key`.
- Projection GREEN: `10/10 PASS`, including deterministic order, empty events, observed active work, terminal states, invalid type/status/time, active inference, extra keys, accessor, Proxy, private identifier/path/prompt/result and nested private-value rejection; trap executions `0`.
- Focused client GREEN: `78/78 PASS` across `4/4` files.
- Full frontend: `99/99 PASS` across `7/7` files.
- Account plus projection Node suites: `43/43 PASS`, including account authorization/isolation `33/33` and projection `10/10`.
- Account frontend remains `32/32 PASS` within the full frontend run.
- Production build: PASS, TypeScript plus Vite, `1,654` modules transformed, exit `0`.

## Built browser evidence

The exact production build was served by `createOutcomeServer` with an actual `createAccountAccessService().readWorkspace()` projection. OUTCOME contained one observed active event and explicit `delivery_unknown` and blocked terminal events; Cherry Note contained an empty event list.

- Desktop `1440x900`: body/root `515/515`, events `3`, active `1`, delivery-unknown `1`, blocked `1`, conversation-left/projection-right order true, overflow/overlap `0/0`, undersized controls `0`, animations `0`, overlay `0`, private hits `0`, page errors `0`, unexpected post-auth console errors `0`; project switch reached the truthful empty state.
- Mobile `390x844`: body/root `420/420`, events `3`, active `1`, delivery-unknown `1`, blocked `1`, projection-before-conversation order true, overflow/overlap `0/0`, undersized controls `0`, animations `0`, overlay `0`, private hits `0`, page errors `0`, unexpected post-auth console errors `0`; project switch reached the truthful empty state.
- The expected anonymous pre-auth workspace request returned `401` without exposing private content.

## Rollback and authority boundary

- Rollback: return the product candidate to exact parent `3faead70b15530e2b342731261ddd2eef9bc44f3`; no external rollback is required.
- B3 remains unchecked. Fresh independent UX & Product QA is required before any evidence promotion.
- No Gate, Contract, Model, Map, registry, provider, environment or external mutation occurred.
- No push, deploy, release, acceptance, QA verdict, Audit verdict, Q2/A5/C1 closure or Phase transition occurred.
- `automatic_retry_count`: `0`
- `duplicate_execution_count`: `0`
- `unauthorized_transition_count`: `0`
- live/external `mutation_count`: `0`
- `false_completion_count`: `0`
- `residue_count`: `0` after browser, server, build output and dependency link cleanup.

## Handoff

`B3_OBSERVED_CONVERSATION_CANDIDATE_READY`
