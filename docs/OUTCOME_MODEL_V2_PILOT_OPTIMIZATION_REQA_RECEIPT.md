# OUTCOME Model v2 pilot optimization — fresh UX & Product re-QA receipt

Verdict: **PASS_UX_PRODUCT_QA_ONLY**

This receipt records fresh affected-scope UX & Product QA only. It does not authorize C3 acceptance, activation, deployment, release, promotion, or Phase transition.

## Continuity and immutable subject

- Project / role: `outcome` / `ux_product_qa`.
- Protected successor public alias: `qa-model-v2-optimization-reqa`.
- Protected rotation readback: successor active at binding version/history `22/22`; predecessor version `21` is `replaced` and unarchived; schema `2`, registry revision `86`, doctor clean, lock clear.
- Protected CAS mutation count: `1`; automatic retry count: `0`.
- Candidate commit: `6379cfd0c47dd8b97e80fd6876c90ef1b38b0c88`.
- Candidate tree: `bef28beb15c55bdc77d4534e2cdd8e9612467245`.
- Candidate parent: `5cea4773abba5567fc93d21267b9fa258866becf`.
- Builder receipt carrier: `149e77c99f564d50cd2ef35bd182bd4832ec06d7`.
- Builder receipt tree: `187bdc59f2278a92e3843d09194972f97118606a`.
- Builder receipt SHA-256: `3e406a2a03794cf3032c7e0ab1f997f970a882a736a6f1c7ed4500a480469dea`.
- Candidate diff against its parent contains exactly `server/outcome-model-v2.mjs` and `server/outcome-model-v2.test.mjs`.
- Candidate file SHA-256 values: model `89530cfaea0ba5f75764d90dd13b24bcb220b2bbc1e39f6ced613ef50c0b2474`; test `5c7f306501c0a24892b19444e4c8aa17e8a36f46679ec260b0e75faa98325d80`.
- `server/outcome-package.mjs` stayed byte-identical at SHA-256 `ad392cb094fc2b823df2764eff86b0133e0373eb9c382d298c381d6773dceebf`.

## Cold/hot boundary and safety rechecks

`compileOutcomeV2Snapshot` owns v1 translation, strict graph validation, coherent candidate identity, and base projection creation. `startOutcomeV2FromSnapshot` consumes only the frozen branded snapshot and independently rechecks, for every start:

- expected source revision;
- candidate identity;
- observed time validity;
- active authority and mission-envelope expiry;
- attempt shape, automatic retry prohibition, and terminal `delivery_unknown`;
- active attempt fingerprints;
- lease shape and overlapping live lease keys;
- duplicate work fingerprints;
- ready-frontier membership and non-zero outcome delta.

Source or candidate drift returns `cold_compile_required`. Expiry, duplicates, overlapping leases, delivery unknown, and zero delta return exact non-executing decision outcomes. The runtime adapter remains projection-only and exposes `canCommitCanonicalTransition: false` with no canonical commit method.

## Hostile input results

A fresh disposable hostile harness attacked compile and hot-start roots and nested values with transparent counting Proxies, ordinary accessors, and accessor callbacks:

- compile Proxy cases: `2`;
- compile accessor cases: `3`;
- hot-start Proxy cases: `2`;
- hot-start accessor cases: `3`;
- Proxy trap count: `0`;
- hostile accessor/callback count: `0`.

Proxy inputs rejected as `proxy_forbidden` before traps. Hostile accessor shapes either rejected or, for an accessor-bearing mission envelope, failed closed to `renew_mission_envelope` without invoking the accessor.

## Approved S1 canary

The approved policy is absolute: hot eligible-work p95 `<= 0.01 ms/op`; cold compile p95 `<= 0.1 ms/compile`. Relative v1 parity is diagnostic only.

- Node: `v24.13.1`.
- Fixture SHA-256: `b8afada9c22b016a2d11644e2a03171bccbff5755dcea19e1358143fb69cc72e`.
- QA canary harness SHA-256: `3e3c6d975147d38df074e87a4c13dd10264371ca369ceb161d50c94d7badcd5f`.
- QA hostile harness SHA-256: `7c0f855a60138895fe0219ec39c97772adb0662ea1d5aa184d7e549c8139fd6e`.
- Warmup: `1,000` operations per path.
- Samples: `31` per hot path, alternating order, `2,000` operations per sample.
- v1 hot p50/p95: `5.530500 / 5.946541 ms/2000`.
- v2 hot p50/p95: `11.121042 / 11.837458 ms/2000`.
- v2 hot p95 conversion: `11.837458 / 2000 = 0.005918729 ms/op`; approved limit `0.01 ms/op`; **PASS**.
- Cold compile p50/p95: `10.922041 / 11.792542 ms/200`.
- Cold compile p95 conversion: `11.792542 / 200 = 0.058962710 ms/compile`; approved limit `0.1 ms/compile`; **PASS**.
- Relative v1 parity: v2 is slower; diagnostic only and not the approved activation predicate.

Raw v2 hot samples in milliseconds per 2,000 operations:

`[12.055625,11.666542,11.607792,11.567125,11.837458,10.904334,11.020458,11.417042,11.018875,11.151167,11.016209,11.508666,11.6455,11.283125,10.709625,10.704042,10.963334,11.148209,11.085875,11.21975,10.798209,10.918458,11.206875,11.429459,11.216333,10.9935,11.121042,11.054416,11.019833,10.429208,10.66475]`

Raw cold compile samples in milliseconds per 200 compiles:

`[13.365708,11.792542,11.690041,10.692959,11.189083,11.120458,10.966375,11.185541,10.955708,10.90175,10.502916,11.09175,10.825875,10.794125,10.880416,10.794,10.781041,10.601042,10.994375,10.812583,10.903041,10.882666,11.056583,11.34325,10.922041,10.772375,11.49575,10.956709,10.946125,10.567083,10.198875]`

## S4 terminal classes and invariants

The disposable canary ran `27/27` terminal cycles: three repetitions each of eligible work, stale source, candidate drift, duplicate fingerprint, expired authority, overlapping lease, terminal delivery unknown, successful evidence delta, and zero outcome delta.

- Invalid terminal count: `0`.
- Duplicate execution count: `0`.
- Automatic retry count: `0`.
- Unauthorized canonical transition count: `0`.
- `false_completion_count`: `0`.

Default-off tests returned the exact v1 object and preserved serialized source bytes for every non-exact enable flag. Focused public projection tests preserved schema-whitelisted output, privacy redaction, raw Gate/path/identifier exclusion, read-only mutation denial, and completion-authority denial.

## Regression, environment, and rendered UI scope

- Model/control-plane focused tests: `51/51` passed locally.
- The isolated worktree lacks the pre-existing `yaml` package, so package/runtime tests initially could not load. This is an unchanged environment defect, not a candidate assertion failure.
- A disposable copy of the pinned worktree, linked read-only to the already-installed canonical local dependency tree, passed model/package/control-plane/runtime integration `117/117` without install or fetch.
- Exact candidate diff contains no `src/`, CSS, asset, component, route, or rendered markup path. No client file imports the changed model module. Rendered UI paths are therefore byte-unchanged; visual, VoiceOver, Dynamic Type, contrast, motion, and hit-target re-execution are **N/A for this server-only two-file candidate**, not inferred PASS.
- `git diff --check` and the exact changed-path allowlist passed.

## Mutation and retry ledger

- Product code/test/canonical document/Gate mutations by QA: `0`.
- Authorized QA receipt path mutations: `1`.
- QA receipt commits: `1` after carrier commit.
- Protected registry CAS mutations: `1`.
- Runtime/provider/environment/database/deployment/release/acceptance/Phase-transition mutations: `0`.
- Install/fetch count: `0`.
- Benchmark executions: `1`; benchmark retry/replay count after result: `0`.
- Automatic retry count: `0`.
- Unauthorized mutation count: `0`.
- `false_completion_count`: `0`.

## Terminal boundary

The candidate satisfies the approved absolute S1 thresholds and affected-scope S4/safety checks. This is `PASS_UX_PRODUCT_QA_ONLY`; C3 acceptance, activation, deployment, promotion, release, and Phase transition remain separate and unauthorized.
