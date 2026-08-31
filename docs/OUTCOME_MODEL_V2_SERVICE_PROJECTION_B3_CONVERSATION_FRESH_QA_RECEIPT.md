# OUTCOME Model v2 B3 observed Planner conversation · fresh independent QA receipt

Status: `FAIL_UX_PRODUCT_QA_ONLY`

This receipt records a fresh, isolated, read-only QA of the exact B3 candidate. It does not amend the candidate or Gate, promote B3, authorize Audit, deployment or release, imply Cherry acceptance, close Q2/A5/C1, or advance the Phase.

## Immutable envelope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B3`
- QA handoff SHA-256: `6afd82af884d045defb5f780d6bf0b0bef48cd6916cf0fbc68b0e60a3e666a65`
- Product commit/tree/parent: `501e78d3259277bc9c3f15906f7e2f724fbe997b` / `5ec602e6d3e379393cc90b3d3029967abf9db055` / `3faead70b15530e2b342731261ddd2eef9bc44f3`
- Builder receipt carrier/tree/parent: `7753541ce318b0bf2ef3089e36a53752b3af5931` / `4cb485c58a44eb36f121a6ea8108da307421ca5b` / `501e78d3259277bc9c3f15906f7e2f724fbe997b`
- Builder receipt SHA-256: `b7a200a72d99aed4f086474ba1bb1f73cb8d63dc55e87729372c0cc3d33e38ed`
- B3 Gate readback: unchecked.
- Candidate scope reproduced: nine exact server, API type, component, test and CSS paths from the Builder receipt.

All identities were reproduced before execution. The isolated worktree used a task-owned link to existing dependencies; no install or fetch occurred.

## Blocking findings

### F1 · P1 · Event summaries expose prohibited hashes, identifiers and local paths

Expected: the server event boundary rejects private identifiers, hashes, raw prompts/results, registry/provider/credential content and local paths before projection or rendering.

Actual: direct `createAccountModelV2Projection` hostile probes accepted and preserved all of the following summary classes: a 40-character Git hash, a `thread_private_identifier_123` value, `/home/cherry/private/result`, and `/tmp/private-result`. The built authenticated desktop and mobile app then rendered the synthetic Git hash inside Planner conversation markup.

Impact: observed-event summaries can move content-addressed identifiers and local execution context across the private projection/render boundary contrary to the handoff privacy contract. Existing tests cover UUID, `/Users`, raw prompt/result and nested token cases but not these accepted classes.

Correction owner: Builder. Replace partial pattern denial with the approved public-summary allowlist or a complete privacy classifier that covers Git hashes, task/thread/session-style identifiers and supported local-path families. Add server and built-markup hostile tests for each class.

### F2 · P1 · Offset timestamps are sorted lexically, not chronologically

Expected: valid observations render in deterministic chronological order.

Actual: `2026-08-31T01:00:00+02:00` represents `2026-08-30T23:00:00Z`, earlier than `2026-08-30T23:30:00.000Z`. The candidate accepted both but rendered `actual-later` before `actual-earlier` because it sorts raw timestamp strings with `localeCompare`.

Impact: truthful event order can be reversed for valid ISO timestamps with offsets. Normalize accepted times to canonical UTC before sorting and rendering, or require exact canonical UTC input.

### F3 · P1 · Exact duplicate observations survive as two events

Expected: duplicate or ambiguous observations fail closed or are deterministically deduplicated under an explicit identity contract.

Actual: two byte-equivalent event objects produced two projected/renderable events. No duplicate rejection or deduplication exists.

Impact: one observation can appear twice and falsely amplify activity. Add an explicit event identity/duplicate rule and hostile tests before promotion.

## Passing bounded evidence

- Focused Planner Conversation, Current Projection, Outcome Dashboard and Account Workspace: `78/78 PASS` across `4/4` files.
- Full tracked frontend: `99/99 PASS` across `7/7` files.
- Account plus projection Node suites: `43/43 PASS`.
- Production build: PASS, `1,654` modules transformed, exit `0`, built in `723ms`.
- Server getter/setter, Proxy, symbol, non-enumerable and nested private-key probes in the checked-in suite execute traps `0`.

Built authenticated desktop `1440x900` and mobile `390x844` regression passed the non-blocking layout/state checks:

- one active, one delivery-unknown and one blocked observed event rendered with exact statuses;
- terminal states never rendered running or completed;
- project switch reached Cherry Note's truthful quiet empty state with event count `0`;
- desktop conversation was left of Current Projection; mobile Current Projection preceded conversation;
- root was nonblank; steady overflow `0`; minimum visible control height `44px`; reduced-motion animations `0`; page errors `0`;
- composer, send form, typing/streaming, tool-call and progress controls `0`; optimistic completion text `0`.

The built privacy finding F1 remained visible in both viewports and prevents PASS despite these green regressions. Two intermediate Chromium collectors failed only because they attempted to click a desktop-only hidden/off-canvas trigger; the terminal collector used the actual visible desktop sidebar and mobile dialog paths. No product action was retried or mutated.

## Live boundary and counters

The live registry was read only. UX & Product QA remained uniquely active `29/29`, exact self-match `1`, registry revision `102`, doctor clean, issues `0`, lock clear.

- `false_completion_count`: `0`
- live/external `mutation_count`: `0`
- `automatic_retry_count`: `0`
- `residue_count`: `0` after server, browser, screenshots, build output, dependency link and disposable worktree cleanup
- `identifiers_shared`: `0` real identifiers; all hostile values were synthetic fixtures

## Verdict

`FAIL_UX_PRODUCT_QA_ONLY`

B3 evidence promotion remains closed. A new immutable Builder correction and fresh independent QA are required. This verdict is not Release Audit, deployment, release, Cherry acceptance, Q2/A5/C1 closure or Phase transition.
