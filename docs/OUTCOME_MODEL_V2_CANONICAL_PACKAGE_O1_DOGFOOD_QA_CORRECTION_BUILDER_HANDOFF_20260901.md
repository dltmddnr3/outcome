# OUTCOME Model v2 canonical package O1 dogfood — QA correction Builder handoff

Outcome: Correct the two independently reproduced O1 safety defects while preserving the accepted projection, selector authority boundary, active-root dirty state and zero external mutation.

Authority: correction only under the existing O1 predicate. Fresh QA failed the exact first O1 candidate. This handoff does not authorize active-root promotion, final dogfood consumption, Release Audit, O1 closure, activation, deployment, release or Phase transition.

## Exact subject and failure evidence

- First implementation candidate/tree/parent: `dd47570e9feec5c125e4f83e23368a9c92888399` / `5a054fedb469103f18200cc436e4d539debbb646` / `75e449de24b01e56df7b896cd2b89e849df17efe`.
- Builder evidence carrier/tree/parent: `895922e8552e3a5a467cb7d2e5aef7480a839df1` / `8eeb43d771fca49eac8ff001df5dd6f78db299c2` / first candidate.
- Fresh QA FAIL carrier/tree/parent: `dbc1a03c8e8a867a394b037c15ea6bc5780843ab` / `d1b6293edb8f7647197c30e01ee8c1b425ff778e` / Builder evidence carrier.
- QA receipt SHA-256: `7a1dd0635dfc463a300ef2dd27bebd4a3dd2d6becd0660711ce91aa447cadbab`.
- QA failure branch: `codex/o1-dogfood-fresh-qa-fail-20260901`.
- Active root remains `75e449de24b01e56df7b896cd2b89e849df17efe`; excluding the four named Planner handoff/checkpoint files, the unrelated structured dirty manifest remains `396` / `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.

## Required RED

On the exact failed candidate, reproduce both before editing:

1. Calling `consumeOutcomeSelectiveContextPlan` twice with the same validated plan and the same capable adapter returns `locally_consumed` twice, invokes the underlying callback twice and reports duplicate count `0`.
2. Appending one whitespace byte to `snapshot/outcome-model-v2-current.json` still returns `o1_local_dogfood_probe_consumed` with dynamically changed snapshot/plan digests rather than `cold_compile_required`.

Any different subject, failure, root fingerprint or role binding is `SAFE_HOLD`.

## Minimal correction contract

Allowed implementation paths are exactly:

- `server/outcome-model-v2.mjs`
- `server/outcome-model-v2.test.mjs`
- `scripts/outcome-model-v2-local-canary.mjs`
- `server/outcome-current-projection.test.mjs`

Allowed evidence paths are exactly:

- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_DOGFOOD_QA_CORRECTION_BUILDER_HANDOFF_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_DOGFOOD_QA_CORRECTION_BUILDER_RECEIPT_20260901.md`

Required behavior:

1. One adapter instance accepts a validated content-addressed plan digest at most once. A second call with the same digest must fail closed before the underlying `consumeContextPlan` callback; callback count remains `1`.
2. The duplicate result must be an explicit projection-only safe hold with `reason=duplicate_context_plan`, `duplicate_execution_count=1`, and every execution-started, retry, persistent-setting, registry/provider/environment, unauthorized-transition and false-completion counter `0`.
3. Duplicate state is process-local to the adapter instance only. It creates no listener, file, registry, provider, environment or persistent setting and does not grant canonical-transition authority. A fresh adapter may consume the same immutable plan once for an independent probe.
4. Bind `snapshot/outcome-model-v2-current.json` bytes into the canary's immutable expected manifest using exact candidate snapshot SHA-256 `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`. The active snapshot plan source digest must come from the already validated manifest entry, not a self-pinned current byte digest.
5. Missing, changed, accessor/Proxy or extra snapshot input fails closed before plan compilation or adapter callback as `cold_compile_required/source_digest_drift` or the existing exact missing-input reason, automatic retry `0`, consumption `0`.
6. Preserve unchanged: projection `7/8`, `milestone-o1`, next action `work-o1-selective-context-dogfood`, accepted selector Gate ref/hash, Builder role skill, null handoff, empty expansion allowlist, six loaded/six skipped classes, accepted product identity, rollback, privacy and external-mutation boundary.
7. Add explicit RED-before-GREEN tests for same-adapter duplicate consumption, distinct-adapter one-shot consumption, snapshot whitespace drift, missing snapshot, and callback count. Re-run the full focused/core set used by QA plus `git diff --check`.

## Candidate and terminal boundary

Create one single-parent correction candidate above the QA FAIL carrier and one Builder receipt carrier. Do not mutate or fast-forward the active root. Final dogfood consumption remains unperformed; test/QA probes use fresh in-memory adapters only.

Return exactly `O1_CORRECTION_CANDIDATE_READY`, `SAFE_HOLD`, or `BLOCKED`, with exact carrier/tree/parent, changed paths, RED/GREEN counts, projection/source/snapshot/plan digests, duplicate and drift results, rollback, root dirty readback, binding, all mutation counters and `false_completion_count`.
