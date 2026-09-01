# OUTCOME Model v2 canonical package O1 dogfood — fresh UX & Product QA receipt

Status: **FAIL_UX_PRODUCT_QA**

Authority: fresh independent read-only QA of Builder evidence carrier `895922e8552e3a5a467cb7d2e5aef7480a839df1`. This receipt does not promote, consume active-root dogfood, close O1, activate, deploy, release, or accept the candidate.

## Exact subject and isolation

- Canonical source commit/tree/parent: `75e449de24b01e56df7b896cd2b89e849df17efe` / `a35ff3cbabdbd578ea9085844ed32ff8403e15de` / `4e8f155852595effed4c054904fb03ac8f386fff`.
- Implementation candidate/tree/parent: `dd47570e9feec5c125e4f83e23368a9c92888399` / `5a054fedb469103f18200cc436e4d539debbb646` / canonical source.
- Builder evidence carrier/tree/parent: `895922e8552e3a5a467cb7d2e5aef7480a839df1` / `8eeb43d771fca49eac8ff001df5dd6f78db299c2` / implementation candidate.
- Builder receipt SHA-256: `7564cdd91222bc815b8990487fec1ae317747c77292404546a3b623ef79f5486`.
- Fresh QA handoff SHA-256: `bce01533894933e159904363db3160c77a20cb1242bf0acd67c5abef38992ae4`.
- All probes and this receipt were produced in a disposable detached clone. The shared active root stayed at the canonical source; its index digest remained empty and its worktree/status fingerprints were unchanged throughout QA.

## Independent evidence that passed

- Lineage and scope: the implementation candidate changes exactly four authorized implementation paths; the Builder carrier adds exactly its handoff and receipt.
- Pre-candidate RED: the current projection and local canary each returned `cold_compile_required/source_digest_drift`, exit/fail-closed behavior with automatic retry and all safety counters `0`. The candidate mismatch test independently proves B1-bound work against the O1 frontier has no eligible next action and requests blocker resolution.
- Candidate projection: two byte-identical canary outputs, each `7/8`, frontier `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action and active work `null`, rollback available, safety `0`.
- Digests: projection `ba9cd29d81081c04bea7a8193e87b2f96cf70a86ba28402a0eb2c1b3daa523ea`; projection source manifest `b54ffd4e5c6bc4912d589993ab50db208494390bc8c36f80a65264f4a416993c`; selector source manifest `cdb68b9c02146620e7cbe7a3f501b2dfcfaec97b8594b2b57ee6dfd9dab020f4`; snapshot `7da833943f17138e6d86bf6763bff4fb9212c3f53c15124d6f8c9e721a3bf295`; plan `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`.
- Loaded classes: `6` exactly — project instructions, active snapshot, accepted selector Gate, two common skills, and sole role skill `mango-implementation-engineer`. Skipped classes: `6` exactly — historical Gate families, historical Q1 inputs, correction chains, raw conversation, Roadmap 2, and unrelated skills. Expansion allowlist and expansions were empty; current handoff was null.
- Focused/core suites: `38` passed, `0` failed. Candidate-only focused suite: `7` passed, `0` failed. `git diff --check`: PASS.
- Privacy scan over both serialized canary outputs: `0` hits for local paths, private task/thread/session/turn identifiers, credentials, raw prompt/result, source/locator references, and registry payloads.
- Shared-root structured class count, excluding exactly the Builder handoff, QA handoff, and QA rotation checkpoint: `396`. No shared-root or index mutation occurred during QA.

## Blocking hostile findings

### F1 — duplicate plan consumption is accepted and invokes the adapter twice

Severity: **HIGH**. Owner: Builder.

Reproduction: compile the exact candidate plan digest `3fc48b99b0b6bd560bc2b28a182cedcbfd266b8b3fdb96a685fa972fa159031a`, create one capable in-memory adapter, and call `consumeOutcomeSelectiveContextPlan(adapter, plan)` twice.

Expected: the second call fails closed before the adapter callback, reports a duplicate-consumption safety result, and performs no second consumption.

Actual: both calls return `locally_consumed`; callback count becomes `2`; both receipts are byte-identical; both report `duplicate_execution_count=0` and all other safety counters `0`.

Impact: a replayed plan can be consumed more than once without being represented as a duplicate, violating the O1 exactly-once and no-retry contract.

### F2 — one-byte active-snapshot drift is accepted

Severity: **HIGH**. Owner: Builder.

Reproduction: append one whitespace byte to `snapshot/outcome-model-v2-current.json` in an isolated candidate copy and run the exact local canary.

Expected: the content-addressed active snapshot fails closed before consumption because the pinned candidate snapshot byte digest changed.

Actual: the canary still returns `o1_local_dogfood_probe_consumed`; only its dynamically derived snapshot and plan digests change. In the complete 11-case drift matrix, the ten statically pinned source inputs failed closed with `source_digest_drift`, while the active snapshot drift was accepted.

Impact: byte identity of the active snapshot is not bound to the immutable O1 candidate, so a drifted snapshot can produce a new accepted plan rather than a cold-compile hold.

## Counters and terminal boundary

- Fresh local canary consumption per normal invocation: `1`; two normal invocations were byte-identical.
- Duplicate hostile attempt: adapter callback/accepted consumption `2/2`; expected `1/1` maximum.
- Drift matrix: `11` cases; fail-closed `10`; incorrectly accepted `1`.
- Execution-started, automatic-retry, persistent-setting, registry/provider/environment, unauthorized-canonical-transition, active-root, Preview, Production, deployment, release, external activation, Phase-transition and false-completion mutation counts: all `0`.
- QA receipt carrier mutation: exactly one receipt file and one evidence commit; no product/source path changed.

Required next boundary: Builder correction of duplicate-consumption idempotency and immutable active-snapshot byte binding, followed by fresh independent re-QA on a new exact candidate. Release Audit, promotion and O1 closure remain unauthorized.
