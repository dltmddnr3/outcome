# OUTCOME Model v2 pilot — S1 optimization receipt

Verdict: **CANARY_FAIL · S1 FAIL · S4 PASS · CANDIDATE NOT PROMOTABLE**

## Immutable input

- Optimization handoff SHA-256: `3a3301f51ccf82d61ed72929183a8e490893a7686e94d55ac56bcd9e4fbc79f1`
- Optimization base: `5cea4773abba5567fc93d21267b9fa258866becf`
- Base tree: `a1c6cad8ef5856e54c59b590c06a436e64776a5f`
- Failed speed-canary receipt SHA-256: `5ba26b09e5060b2f1308f33be1dd8335aad0d8002fadacc9950add300d5fe595`
- Failed baseline S1: v1 p50 `0.370750 ms/2000`; v2 p50 `44.313875 ms/2000`.
- Baseline S4: `24/24` valid terminal cycles.
- Builder worktree was clean at the exact base before profiling and mutation.

## Profile and RED reproduction

- Profile command measured 100,000 operations each for graph validation, full projection and local allocation.
- Graph validation: `1164.962 ms`.
- Full v2 projection: `2166.047 ms`.
- Local allocation: `0.676 ms`.
- Repeated graph validation accounted for `53.78%` of full projection time and dominated allocation.
- The original fair canary was reproduced before mutation: v1 p50 `0.368500 ms/2000`; v2 p50 `43.711958 ms/2000`; S1 RED.

## Measured hypothesis candidate

- Candidate commit: `6379cfd0c47dd8b97e80fd6876c90ef1b38b0c88`
- Candidate tree: `bef28beb15c55bdc77d4534e2cdd8e9612467245`
- Candidate parent: `5cea4773abba5567fc93d21267b9fa258866becf`
- Changed paths and SHA-256:
  - `server/outcome-model-v2.mjs`: `89530cfaea0ba5f75764d90dd13b24bcb220b2bbc1e39f6ced613ef50c0b2474`
  - `server/outcome-model-v2.test.mjs`: `5c7f306501c0a24892b19444e4c8aa17e8a36f46679ec260b0e75faa98325d80`
- `server/outcome-package.mjs` remained byte-identical at SHA-256 `ad392cb094fc2b823df2764eff86b0133e0373eb9c382d298c381d6773dceebf`.

The candidate adds an explicit immutable branded compile snapshot keyed by source revision and coherent candidate identity. Cold compile translates, validates and creates the base projection once. Hot start consumes only that snapshot and rechecks source/candidate drift, authority, envelope expiry, duplicate fingerprints, active attempts, leases, terminal delivery unknown, automatic retry and outcome delta. Drift returns `cold_compile_required`. There is no global cache or canonical-transition authority.

## Fair S1 measurement

- Node: `v24.13.1`.
- Fixture SHA-256: `b8afada9c22b016a2d11644e2a03171bccbff5755dcea19e1358143fb69cc72e`.
- Disposable harness: `/tmp/outcome-model-v2-s1-optimization-canary.mjs`.
- Harness SHA-256: `a63d27c9b68fe222de9625800877c182b3647a2352b6071989661674874c906b`.
- Warmup: `1,000` operations per path.
- Hot samples: `31` per path, `2,000` operations each, alternating order.
- Both hot paths began after source materialization/validation and ended at selected plus validated local start. Per-attempt Proxy, source/candidate, authority, retry/delivery and delta checks were included.
- v1 hot p50/p95: `5.536584 / 5.959625 ms`.
- v2 hot p50/p95: `11.018541 / 11.817167 ms`.
- S1 result: **FAIL** because v2 p50 is slower than v1 p50.
- Improvement from prior v2 p50: `44.313875 ms` to `11.018541 ms`; improvement does not relax or satisfy S1.

Raw v1 hot samples in milliseconds:

`[6.192417,5.917,5.959625,5.72825,5.8655,5.679042,5.698042,5.621917,5.523708,5.5805,5.719625,5.565917,5.616875,5.372917,5.536584,5.36025,5.351416,5.537542,5.527541,5.682708,5.315791,5.448292,5.370292,5.459667,5.452541,5.359292,5.155417,5.387042,5.750334,5.381541,5.511167]`

Raw v2 hot samples in milliseconds:

`[12.131292,11.766375,11.495083,11.431958,11.817167,10.629875,11.565708,10.965542,11.009375,11.365916,11.028709,11.237958,11.018541,11.250167,11.035833,10.707875,10.806416,11.311708,11.208625,11.233458,11.095916,10.78275,10.723417,10.834458,10.602791,10.776292,10.860709,10.952917,10.780458,10.740917,10.9385]`

## Cold compile measurement

Cold compile was measured separately: 31 samples of 200 compiles.

- p50: `10.712458 ms/200`.
- p95: `11.977083 ms/200`.
- Raw samples: `[12.853458,11.977083,11.52175,10.877583,10.97275,10.632875,10.749292,10.352209,10.827083,10.561584,10.739708,10.872708,10.648416,10.683,10.48075,10.695833,10.559042,10.856625,10.660917,10.712458,10.661292,10.611375,10.815916,11.065,11.1,11.033166,11.846042,10.591625,10.282875,10.624167,10.217875]`.

No human or production latency inference is made.

## S4 deterministic canary

- Terminal cycles: `27`, three repetitions of nine classes.
- Eligible work: non-zero acceptance-gap and user-value delta.
- Stale source: `cold_compile_required:source_revision_drift`.
- Candidate drift: `cold_compile_required:candidate_identity_drift`.
- Duplicate fingerprint: `resolve_blocker`.
- Expired authority: `renew_mission_envelope`.
- Overlapping lease: `resolve_blocker`.
- Terminal delivery unknown: `resolve_delivery_unknown`.
- Successful evidence: non-zero acceptance-gap delta.
- Zero-outcome delta: `review_no_outcome_delta`.
- Invalid terminal count: `0`.
- Duplicate execution count: `0`.
- Automatic retry count: `0`.
- Unauthorized canonical transition count: `0`.
- `false_completion_count`: `0`.
- S4 result: **PASS**.

## Regression and invariants

- Local model/control-plane focused suite: `51/51` passed.
- Disposable model/package/control-plane/runtime integration: `117/117` passed.
- Proxy rejection remains pre-trap for compile and hot-start inputs.
- Schema-whitelisted public projection, default-off v1 identity/bytes, privacy redaction and canonical-transition denial remain green.
- `git diff --check` and changed-path allowlist passed.

## Terminal disposition

This measured hypothesis is committed as immutable evidence but is not eligible for promotion because S1 failed. No further optimization was made after observing the canary. A new hypothesis requires separate authority; S1 must not be relaxed.

C1/C2 prior bounded verdicts are not changed. C3, activation, deployment, acceptance, release and Phase transition remain open and unauthorized.

## Mutation ledger

- Allowed code/test mutations: `2` paths.
- Receipt mutation: `1`.
- Candidate commits: `1`.
- Receipt-carrier commits: `1` after this file is committed.
- Install/fetch count: `0`.
- Registry/runtime/provider/environment/database/external mutations: `0`.
- Push/activation/deploy/release/acceptance/Phase-transition mutations: `0`.
- Benchmark retry/replay count after result: `0`.
- Automatic retry count: `0`.
- Unauthorized mutation count: `0`.
- `false_completion_count`: `0`.
