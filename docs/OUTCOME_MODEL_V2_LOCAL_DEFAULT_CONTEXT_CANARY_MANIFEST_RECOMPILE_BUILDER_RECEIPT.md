# OUTCOME Model v2 Slice A Q1 manifest recompile Builder receipt

Status: `SLICE_A_MANIFEST_RECOMPILE_CANDIDATE_READY`

## Attempt and immutable lineage

- Attempt: `MODEL_V2_SLICE_A_Q1_MANIFEST_RECOMPILE_1`.
- Handoff SHA-256: `cc5a84a2e24838a1b589fa8b99d7a582081a65a1a639151d0e5fda6a795a7fa1`.
- Re-QA hold carrier/tree/parent: `b11c09832b601f12cff68c465ae78efc8ddbe758` / `9ca358fe582896d8442a91bc7dab725fcc2b0877` / `d33b9deb58487cc6476afce76f72764cb19f87b1`.
- Re-QA hold receipt SHA-256: `0218a4c5b345ae5f32da4b59d9ea144f51b2253186c38cbd3be90c68c90a839a`.
- Semantic correction candidate: `7180263c591b4ca3a31be086af59ae4a43a5bc36`; correction receipt carrier: `d33b9deb58487cc6476afce76f72764cb19f87b1`.
- Builder binding at preflight and final readback: `outcome/builder`, active alias `builder-model-v2-pilot`, version/history `11`/`11`, protected self-match `1`.
- Registry doctor: ok, schema version `2`, revision `94`, lock clear.

## Manifest-recompile candidate

- Commit: `ee9e3bfc85377c5a2c993afee0041e6a24b86919`.
- Tree: `3906e4d19eb0d231cb40ca6fac513c09377652a7`.
- Parent: `b11c09832b601f12cff68c465ae78efc8ddbe758`.
- Changed paths:
  - `scripts/outcome-model-v2-local-canary.mjs`
  - `server/outcome-context-bootstrap.test.mjs`
- Semantic bootstrap implementation and all Planner/Gate inputs were unchanged.

## Independently pinned nine-source manifest

- `AGENTS.md`: `cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93`.
- `docs/OUTCOME_CONTRACT.md`: `36860ad7e0103170c6f1be3eaa25a221b873ccf1b46b668f0d684c385412851f`.
- `docs/OUTCOME_MAP.md`: `10bfe76927a044f87612666b1976ff34b145bd8f5b471dff676f32716396bc94`.
- Slice contract: `b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657`.
- Frozen current Gate: `098c48bef05b2219b68acd2c308309b04bd91ca82a1eeb7ba80552a7caca7b0d`.
- Semantic correction handoff: `d7212441f5bb488941b6a42c0c6e0b6a195187479e61b051e715b537f7a4fd61`.
- This manifest-recompile handoff: `cc5a84a2e24838a1b589fa8b99d7a582081a65a1a639151d0e5fda6a795a7fa1`.
- First failed-QA receipt: `bbc13889eb1c0af9a51d545d2daae7bf1b2c1d5a935e01eee3f347775388f9f5`.
- Latest re-QA hold receipt: `0218a4c5b345ae5f32da4b59d9ea144f51b2253186c38cbd3be90c68c90a839a`.
- Content-addressed manifest digest: `5fd841779b568386b2388afe3d2014b1624c6e3e59bb503e239fd88aec097f34`.

## RED, GREEN and drift matrix

- RED on exact re-QA carrier with the frozen current Gate: exit `2`, outcome `cold_compile_required`, reason `source_digest_drift`, automatic retry `0`, registry/provider/environment mutation `0`, false completion `0`.
- GREEN on the new candidate: all nine exact inputs match before the current Gate is modeled; current bytes are never substituted into the expected manifest.
- Nine independent in-memory source copies were changed one key at a time. Each of `agents`, `contract`, `map`, `slice-contract`, `gate`, `handoff`, `manifest-handoff`, `qa-receipt` and `reqa-receipt` returned `cold_compile_required/source_digest_drift` with automatic retry `0`.
- The existing F1 historical-Gate, unrelated-skill, raw-conversation, private-ID, UUID, digest-shaped identifier, accessor and Proxy denials remain in the focused regression.

## Tests and current-repository canary

- Focused command: `node --test server/outcome-model-v2.test.mjs server/outcome-context-bootstrap.test.mjs server/outcome-package.test.mjs server/outcome-execution-control-plane.test.mjs server/index.test.mjs`.
- Result: `127` passed, `0` failed, skipped or cancelled.
- Two committed-candidate canaries were byte-identical; output SHA-256 `30dbe7334fb5fdc95b7d40ab3aaeb92e26fe6cc3268a99b575ff1b2ff5d4566e`.
- Snapshot digest: `bfec1e8f158207ac6bf5397bc4cc72b5e67ca13c2a87935cd3ff9cc192b66bcb`.
- Complete Gate projection: `13` predicates, `6` closed, `7` remaining, ready frontier `outcome-milestone-q1`, next action `work-q1-independent-qa`, Cherry action `null`, outcome `next_action_selected`.
- Safety counters: duplicate execution `0`, automatic retry `0`, unauthorized canonical transition `0`, registry/provider/environment mutation `0`, false completion `0`.

## Rollback, preservation and boundaries

- Explicit `OUTCOME_MODEL_V2_ENABLED=0` remains covered by the focused suite and restores exact prior v1 object and serialized package bytes.
- Reverting only candidate `ee9e3bfc85377c5a2c993afee0041e6a24b86919` returns the re-QA hold carrier manifest behavior without touching Planner/user-owned dirty state.
- Unrelated dirty path count before and after: `316`; byte-sorted path-list SHA-256 `4711bacca164aa04273232485afbac80e562ba2504ce3a6f956f1a81f7663a46`.
- Listener count `0`; persistent Model v2 flag absent; staged path count `0` after candidate.
- Authorized Git fast-forward to re-QA carrier: `1`; candidate source/test mutations: `2`; candidate commits: `1`; receipt path mutations: `1`; receipt carrier commits: `1` (this carrier).
- Gate/Contract/Map/UI/registry/provider/runtime/environment/database/dependency/external/push/deploy/release/Phase mutations: `0`; automatic retry/replay count: `0`.
- Q1 remains open for fresh independent QA. No QA PASS, Audit, acceptance, Slice B, deployment, Production, release or Phase transition is claimed.
