# OUTCOME Model v2 B3 conversation QA correction · Builder receipt

Status: `B3_OBSERVED_CONVERSATION_CORRECTION_CANDIDATE_READY`

This receipt records only the isolated Builder correction for the three fresh-QA findings. It does not check or promote B3, perform QA or Release Audit, authorize deployment or release, imply Cherry acceptance, close Q2/A5/C1, or advance the Phase.

## Immutable input and candidate

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B3`
- Failed QA receipt commit/tree/parent: `e1e36117ccaf85859f1fa02c6f11f039cdbfeb8a` / `f27e48df1dd921d9c19cb54c52b091c00a00cca9` / `7753541ce318b0bf2ef3089e36a53752b3af5931`
- Failed QA report SHA-256: `3ed699625a25f6dd6f3e33883757769a19004e8556d93d21b95ee9a399ff67f4`
- Failed product candidate: `501e78d3259277bc9c3f15906f7e2f724fbe997b`
- Correction product/test commit/tree/parent: `1ab53276e8dc75b6b25089888bf5a29d47a5d7bd` / `988fc3be462749c9873438530198a41b33860942` / `e1e36117ccaf85859f1fa02c6f11f039cdbfeb8a`

## Exact correction scope

- `server/account-model-v2-projection.mjs`
- `server/account-model-v2-projection.test.mjs`

## Corrected boundaries

- Public Planner summaries now use one server-owned classifier covering 40/64-character hexadecimal content identifiers, named task/thread/session/turn identifiers, `/Users`, `/home`, `/tmp`, `/private`, `/var/folders`, Windows drive and UNC paths, plus raw prompt/result, registry/provider payload, credential and existing private values. Rejection occurs before projection and rendering. The stricter policy is scoped to event summaries so existing sealed legacy Git evidence remains valid.
- Every accepted event timestamp is normalized with `toISOString()` before projection, identity and rendering. Ordering uses epoch time with stable public-field tie breakers. The offset counterexample normalizes and orders as `2026-08-30T23:00:00.000Z` before `2026-08-30T23:30:00.000Z`.
- Event identity is the normalized exact four-field byte representation. Duplicate normalized observations fail closed with `account_model_v2_event_duplicate`; no activity amplification occurs.

## RED and GREEN

- RED on exact failed-QA carrier: projection suite `10/13 PASS`; privacy, offset chronology and normalized duplicate tests failed independently.
- Projection GREEN: `13/13 PASS`; hostile summary classifier matrix `18/18` rejected, offset chronology deterministic, normalized duplicate rejected, trap execution `0`, hostile survival `0`.
- Full frontend: `99/99 PASS` across `7/7` files.
- Account plus projection Node: `46/46 PASS` (`33/33` account and `13/13` projection).
- Production build: PASS, TypeScript plus Vite, `1,654` modules transformed, exit `0`.

## Built desktop/mobile hostile evidence

The exact production build was served through `createOutcomeServer` and the actual account service boundary.

- Desktop `1440x900` and mobile `390x844` both rendered the offset observations in canonical epoch order: `actual earlier` at `2026-08-30T23:00:00.000Z`, then `actual later` at `2026-08-30T23:30:00.000Z`.
- A hostile 40-hex summary caused the workspace projection to fail closed. Rendered event count `0`; hostile markup survival `0` on both viewports.
- Both viewports: steady overflow `0`, undersized visible controls `0`, page errors `0`. Existing empty/active/terminal composition, authorized switching and responsive ordering remain covered by the unchanged `99/99` frontend and prior built B3 evidence.

## Rollback and authority

- Rollback: return the correction product commit to exact parent `e1e36117ccaf85859f1fa02c6f11f039cdbfeb8a`; no external rollback required.
- B3 remains unchecked; fresh independent UX & Product QA is required before promotion.
- No Gate, product UI, API type, auth, registry, provider, environment or external mutation occurred outside the two server paths.
- No push, deploy, release, acceptance, QA/Audit verdict, Q2/A5/C1 closure or Phase transition occurred.
- `automatic_retry_count`: `0`
- `duplicate_execution_count`: `0`
- `unauthorized_transition_count`: `0`
- live/external `mutation_count`: `0`
- `false_completion_count`: `0`
- `residue_count`: `0` after browser, server, build output and dependency link cleanup.

## Handoff

`B3_OBSERVED_CONVERSATION_CORRECTION_CANDIDATE_READY`
