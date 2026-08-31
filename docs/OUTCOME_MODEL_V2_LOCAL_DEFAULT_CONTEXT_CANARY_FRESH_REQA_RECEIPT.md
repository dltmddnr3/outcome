# OUTCOME Model v2 Slice A Q1 fresh affected-surface re-QA receipt

Status: `SAFE_HOLD_Q1_SOURCE_MANIFEST_DRIFT`

## Immutable scope

- Gate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · Q1`
- Failed-QA carrier: `155c5d152aa4f7833a8d600c12a5c3d58506f543`
- Correction candidate/tree/parent: `7180263c591b4ca3a31be086af59ae4a43a5bc36` / `96ed06c4a27ee7ae52bc36293dec2bdd779af6ab` / `155c5d152aa4f7833a8d600c12a5c3d58506f543`
- Correction receipt carrier/tree/parent: `d33b9deb58487cc6476afce76f72764cb19f87b1` / `06974cc9761ca5a00ac6d18839c28b88b49c0fd1` / `7180263c591b4ca3a31be086af59ae4a43a5bc36`
- Correction receipt SHA-256: `4a66095e862fc34f40dc65f5e1f50cd55e5e269af547e834480b47e1a66189dc`
- Re-QA handoff SHA-256: `d41f34a9f7c601724dee53957617e0620c8a0071f157e47b3469a7d41afbc893`

## Binding and evidence-root preflight

- Current project/role binding remained `outcome/ux_product_qa`, active version/history `25`/`25`.
- Registry current-binding count and protected self-match count were each `1`; doctor passed and lock was clear.
- App inventory resolved exactly one active matching self.
- Correction lineage, correction receipt bytes and re-QA handoff bytes matched.
- New failed-candidate and correction-candidate disposable roots were created from exact repository objects; no prior evidence root was reused.
- Preflight mutation count: `0`; automatic retry count: `0`.

## Independently pinned source readback

The correction pins seven source digests. Six still matched:

- `AGENTS.md`
- `docs/OUTCOME_CONTRACT.md`
- `docs/OUTCOME_MAP.md`
- `docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md`
- `docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_QA_CORRECTION_BUILDER_HANDOFF.md`
- `docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_FRESH_QA_RECEIPT.md`

The current Gate did not match:

- Expected SHA-256: `f4a6d8d24e552c5dccb8d2d4cdefcef322e3bb6274633132ee9c60da3df9fd2d`
- Actual SHA-256: `098c48bef05b2219b68acd2c308309b04bd91ca82a1eeb7ba80552a7caca7b0d`

The expected Gate bytes were not present in the correction carrier or another isolated OUTCOME worktree. Current bytes were not substituted for the independently pinned input.

## Fail-closed reproduction

The exact correction candidate was run in the disposable root with the six matching pinned sources and the current Gate bytes. It returned:

- outcome: `cold_compile_required`
- reason: `source_digest_drift`
- exit status: `2`
- automatic retry count: `0`
- registry/provider/environment mutation count: `0`
- false completion count: `0`

This proves the correction does not self-pin current bytes when an independently pinned source drifts.

## Not run after the hold

The prior RED/correction GREEN hostile matrix, 127-test bounded regression, receipt-declared canary digest comparison, rollback and full residue suite were not run after the manifest hold. No PASS or candidate failure is inferred from a source-precondition stop.

## Mutation and residue ledger

- Re-QA receipt paths mutated: `1`.
- Candidate, Planner, Gate and registry mutations: `0`.
- Provider, dependency, persistent-environment, database and external mutations: `0`.
- Dependency installs/fetches: `0`.
- Automatic retry count: `0`.
- Unauthorized transition count: `0`.
- Duplicate execution count: `0`.
- False completion count: `0`.

## Terminal boundary

`SAFE_HOLD_Q1_SOURCE_MANIFEST_DRIFT`

Q1 remains open. Resume requires a newly immutable correction manifest/handoff that pins the intended current Gate bytes, or recovery of the exact previously pinned Gate bytes. This receipt makes no Slice B/UI, Release Audit, deployment, Production, release, Cherry acceptance or Phase-transition claim.
