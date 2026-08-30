# OUTCOME Model v2 pilot — S1/S4 local canary receipt

Verdict: **CANARY_FAIL · S1 FAIL · S4 PASS**

## Immutable subject

- Speed-canary handoff SHA-256: `04aa084b1f575f354d7ac3201a28593983d682fb45aaa0d16bd0384870d3af6d`
- Correction candidate commit/tree: `445cae24485960d91846ff8fe678844f7b8c0531` / `d84ac4ed9b1b877da8ab06d6d485837c92eef46a`
- Builder carrier/tree/parent: `f13a370782823b855c572bbde917b19b8ade7be3` / `48526dda1b0e4767817803c89aafca1675b63f29` / `445cae24485960d91846ff8fe678844f7b8c0531`
- Fresh re-QA carrier/tree/parent: `14d0cdf55e54c99f827f76e90420f05018f9ba13` / `15e8e485cacf79c5349b4a250c06a8cc189e6edb` / `f13a370782823b855c572bbde917b19b8ade7be3`
- Fresh re-QA receipt SHA-256: `c7dc0bddf8f4c4006065a6473dde371e90425b24facb9ac424265a63c84b4cef`
- Release Audit carrier/tree/parent: `582a633f48042af48a1b2d7526c1e461e61855da` / `b0f4ed4f636a53e37ca57a7787796ba02949fde4` / `14d0cdf55e54c99f827f76e90420f05018f9ba13`
- Release Audit receipt SHA-256: `dae64bbb48550e2ccf3b19548694cf77658423861b8717680ae5ab75dee18edc`
- Builder worktree was clean at the exact carrier before measurement.

## Environment and harness

- Node: `v24.13.1`
- Disposable harness: `/tmp/outcome-model-v2-speed-canary.mjs`
- Harness SHA-256: `6fff4518a24b1214f98c90ba22ec36c1f0377922ab2541f83b4b4235c8c7ca8f`
- Raw fixture SHA-256: `b8afada9c22b016a2d11644e2a03171bccbff5755dcea19e1358143fb69cc72e`
- Command: `node /tmp/outcome-model-v2-speed-canary.mjs`
- File I/O, process startup, logging and receipt serialization were outside both timed paths.
- Both paths started from the same already-materialized deterministic v1 package fixture and ended after one eligible work item passed selection and identical local validated-start allocation.
- Warmup: `1,000` operations per path.
- Samples: `31` per path, `2,000` operations per sample, alternating path order.
- No optimization, source change or measurement replay occurred after observing the result.

## S1 fair benchmark

- v1 p50: `0.370750 ms` per 2,000 operations.
- v1 p95: `0.580166 ms` per 2,000 operations.
- v2 p50: `44.313875 ms` per 2,000 operations.
- v2 p95: `46.935250 ms` per 2,000 operations.
- Predicate: v2 p50 must not be slower than v1 p50.
- Result: **FAIL**. v2 p50 is slower than v1 p50. This is local same-boundary evidence only; no human or production latency inference is made.

Raw v1 samples in milliseconds:

`[0.535,0.423042,0.414,0.409583,0.433334,0.374458,0.45025,0.369333,0.342542,0.372333,0.335,0.36325,0.341208,0.375625,0.341875,0.580166,0.407834,0.445458,0.366,0.364,0.724417,0.37075,0.33975,0.371791,0.341417,0.364834,0.334042,0.361833,0.334208,0.381417,0.367333]`

Raw v2 samples in milliseconds:

`[46.296875,45.276,45.391084,46.388833,46.93525,43.427083,43.5785,43.784084,44.460792,44.57175,44.213625,43.588625,44.289209,44.329292,44.313875,44.168958,44.831125,44.744084,44.876417,43.991958,45.129666,46.941625,44.246291,43.808583,44.090459,43.617334,43.407708,43.633041,43.167417,44.440666,44.413833]`

## S4 deterministic cycles

Twenty-four terminal cycles ran: three repetitions of all eight required input classes.

| Cycles | Input class | Terminal class | Exact delta or Cherry decision |
| --- | --- | --- | --- |
| 1, 9, 17 | eligible work | non-zero outcome delta | `acceptance_gap_delta=1`, `user_value_delta=1` |
| 2, 10, 18 | stale source | exact Cherry decision request | `resolve_source_revision` |
| 3, 11, 19 | duplicate fingerprint | exact Cherry decision request | `resolve_blocker` |
| 4, 12, 20 | expired authority | exact Cherry decision request | `renew_mission_envelope` |
| 5, 13, 21 | overlapping lease | exact Cherry decision request | `resolve_blocker` |
| 6, 14, 22 | terminal delivery unknown | exact Cherry decision request | `resolve_blocker` |
| 7, 15, 23 | successful evidence delta | non-zero outcome delta | `acceptance_gap_delta=1` |
| 8, 16, 24 | zero-outcome delta | exact Cherry decision request | `review_no_outcome_delta` |

- Terminal cycles: `24`.
- Invalid terminal count: `0`.
- Duplicate execution count: `0`.
- Automatic retry count: `0`.
- Unauthorized canonical transition count: `0`.
- `false_completion_count`: `0`.
- Result: **PASS**.

## Verdict and boundary

Overall verdict is `CANARY_FAIL` because both predicates were required and S1 failed. S4 passes for this deterministic local canary. No code optimization or correction is authorized by this receipt. S1 remains open and requires a separately authorized hypothesis and candidate if Cherry elects to continue.

This receipt is measurement evidence only. It does not change C1/C2 results, close C3, activate v2, accept, deploy, release or transition a Phase.

## Mutation ledger

- Product/code/test/package/contract/Gate mutations: `0`.
- Canary receipt mutation: `1`.
- Canary receipt commits: `1` after this file is committed.
- Install/fetch count: `0`.
- Registry/runtime/provider/environment/database/external mutations: `0`.
- Push/activation/deploy/release/acceptance/Phase-transition mutations: `0`.
- Benchmark retries/replays: `0`.
- Automatic retry count: `0`.
- Unauthorized mutation count: `0`.
- `false_completion_count`: `0`.
