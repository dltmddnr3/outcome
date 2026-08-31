# OUTCOME Model v2 B3 conversation correction · fresh independent re-QA receipt

Status: `PASS_UX_PRODUCT_QA_ONLY`

This receipt records a fresh, isolated, read-only re-QA of the exact corrected B3 candidate. It does not promote B3, amend a Gate, perform Release Audit, authorize deployment or release, imply Cherry acceptance, close Q2/A5/C1, or advance the Phase.

## Immutable envelope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B3`
- Failed QA receipt commit/report SHA-256: `e1e36117ccaf85859f1fa02c6f11f039cdbfeb8a` / `3ed699625a25f6dd6f3e33883757769a19004e8556d93d21b95ee9a399ff67f4`
- Corrected product commit/tree/parent: `1ab53276e8dc75b6b25089888bf5a29d47a5d7bd` / `988fc3be462749c9873438530198a41b33860942` / `e1e36117ccaf85859f1fa02c6f11f039cdbfeb8a`
- Builder receipt carrier/tree/parent: `cf820334655adb36d189f959b8040018815167af` / `2e8045be95b32a07dfbe7c933b23c3b23cf16b5b` / `1ab53276e8dc75b6b25089888bf5a29d47a5d7bd`
- Builder receipt SHA-256: `c5ebdf25fec58df1d982b48aceb83b649ba11630541e0c501eacdf2ef5eab487`
- Exact correction scope: `server/account-model-v2-projection.mjs` and `server/account-model-v2-projection.test.mjs`.

All Git identities and receipt bytes were reproduced before execution. The canonical checkout's unrelated user-owned dirty state was observed and preserved. The re-QA used a fresh disposable detached worktree and a task-owned link to existing dependencies; no install, fetch or network dependency mutation occurred.

## Original findings re-proved closed

### F1 · private event content and markup survival

An independent hostile matrix exercised 21 synthetic summaries, including 40/64-character hexadecimal identifiers; task, thread, session and turn identifiers; `/Users`, `/home`, `/tmp`, `/private`, `/var/folders`; Windows drive and UNC paths; raw prompt/result; private registry/locator; registry/provider identifiers; credentials and tokens. All `21/21` failed closed before projection. Hostile workspace service response was `503`, response-body survival was `0`, built mobile markup survival was `0`, and rendered hostile event rows were `0`.

Checked-in hostile schema tests also re-exercised event and root Proxy, accessor, symbol, non-enumerable, cycle, inherited-property, nested private-key and extra-key inputs with trap execution `0`.

### F2 · offset chronology and canonical UTC

The exact counterexample independently projected and rendered in epoch order:

1. `actual earlier` — input `2026-08-31T01:00:00+02:00`, rendered `2026-08-30T23:00:00.000Z`
2. `actual later` — input/rendered `2026-08-30T23:30:00.000Z`

The order and canonical timestamps passed in direct projection and the exact production build at desktop `1440x900` and mobile `390x844`.

### F3 · normalized duplicate amplification

Two otherwise exact events whose timestamps normalize to the same instant failed closed with `account_model_v2_event_duplicate`. Projected duplicate count and renderable duplicate count were both `0`.

## Regression evidence

- Focused Planner Conversation, Current Projection and Account Workspace: `19/19 PASS` across `3/3` present files. The requested Outcome Dashboard file is named `OutcomeDashboard.test.ts`, and was included in the full run.
- Full tracked frontend: `99/99 PASS` across `7/7` files.
- Account plus projection Node suites: `46/46 PASS`, including projection `13/13` and account `33/33`.
- Production build: PASS; TypeScript plus Vite, `1,654` modules transformed, exit `0`, built in `748ms`.
- Existing B2 auth/session/owner, authorized two-project switching, privacy, model-v2-only composition and responsive regressions remained green in the full frontend and account suites.

Built desktop and mobile evidence passed:

- root and Model-v2 conversation rendered; chronological canonical UTC events were visible;
- Cherry Note switch reached the exact quiet empty state with zero observed events;
- root horizontal overflow `0`; minimum visible control height `44px`; running reduced-motion animations `0`; page errors `0`;
- composer, editable, streaming and tool-call controls `0`; completion authority remained false.

## Execution boundaries and counters

The first five browser collector executions were invalid QA harness attempts: legacy/full-source composition rather than model-v2-only composition, partial accessible-name ambiguity, stale expected empty-state wording, and a hidden mobile drawer path. Each failed before a terminal product verdict. The collector was corrected explicitly; no automatic retry occurred. The final enhanced collector ran once and passed both viewports plus the hostile fail-closed markup probe. These harness corrections do not conceal or downgrade a product failure.

- `product_retry_count`: `0`
- `automatic_retry_count`: `0`
- `qa_harness_invalid_attempt_count`: `5`
- live/external/product/Gate/runtime `mutation_count`: `0`
- `false_completion_count`: `0`
- `identifiers_shared`: `0` real identifiers; all hostile values were synthetic
- `residue_count`: `0` after browser, servers, build output, task probe, dependency link and disposable worktree cleanup

## Verdict

`PASS_UX_PRODUCT_QA_ONLY`

The three prior P1 findings are independently closed on the exact corrected candidate. This PASS is only B3 UX & Product QA evidence. B3 promotion remains a separate canonical transition, and this receipt is not Release Audit, deployment, release, Cherry acceptance, Q2/A5/C1 closure or Phase transition.
