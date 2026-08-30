# OUTCOME Model v2 pilot — Builder correction receipt

Status: **CANDIDATE_READY · TWO-DEFECT CORRECTION ONLY · FRESH RE-QA REQUIRED**

## Immutable inputs

- Correction handoff SHA-256: `a554e35df1fa161509ca6178dd1af2db207a6f76d305d77884077285df6ed816`
- Fresh QA receipt SHA-256: `1cd65050607259e3b1663b14216ac1950996661705889475cc930210fa8268e0`
- Fresh QA receipt carrier/tree/parent: `1ae53d210d5588fd63a533a000efb816897c9eaa` / `f77ed27cdf4e5f88746bd98d02294af3299b92cf` / `9f806d611292cb801962962db2133042750e19ee`
- Correction base: `9f806d611292cb801962962db2133042750e19ee`
- Correction base tree: `5ba87f3258acd4cfa94a177e0aaab32927eddc1d`

## Correction candidate

- Commit: `445cae24485960d91846ff8fe678844f7b8c0531`
- Tree: `d84ac4ed9b1b877da8ab06d6d485837c92eef46a`
- Parent: `9f806d611292cb801962962db2133042750e19ee`
- Changed paths and SHA-256:
  - `server/outcome-model-v2.mjs`: `f980312d3921d448b2291e2c41c0e5c8be39f9217796b6bc182b65dd246e15d8`
  - `server/outcome-model-v2.test.mjs`: `9e584c163bb8e24ffca2fe7e719beb32f1cbb84d8b7a3ad28bd9fdd3c482e72b`
  - `server/outcome-package.mjs`: `ad392cb094fc2b823df2764eff86b0133e0373eb9c382d298c381d6773dceebf`
  - `server/outcome-package.test.mjs`: `208434b65e0ed7d65a3334276cf3ce9a3d532340075cab61563c99bee80e999c`

This receipt is committed separately so it can name the immutable correction commit without a self-referential Git hash. It changes no candidate semantics.

## RED reproduction

- D1 RED: `node --test --test-name-pattern='D1' server/outcome-model-v2.test.mjs` failed. A transparent Proxy reached hostile reflection and returned `invalid_shape` instead of pre-trap `proxy_forbidden`.
- D2 RED: disposable-copy `node --test --test-name-pattern='D2' server/outcome-package.test.mjs` failed because serialized public v2 output still contained `raw_prompt`.
- Neither RED run performed an external action or retry.

## Corrections

- D1: every v2 data boundary now recursively rejects Node Proxy values with `node:util/types.isProxy` before reflection, property access or adapter callback. Coverage includes the graph root, Project, all four entity arrays, representative Destination/Milestone/Acceptance Predicate/Evidence Claim records, projector root, work item, attempt, lease, mission envelope, verification-history record, and direct/nested execution-adapter inputs.
- D1 evidence: all hostile cases reject with `proxy_forbidden`; aggregate trap counter is exactly `0`; adapter callback count is exactly `0`. Existing accessor, malformed-shape, duplicate, dangling-reference and DAG-cycle checks remain green.
- D2: the public v2 boundary now reconstructs a schema-whitelisted graph and projection. Descriptive/private graph strings and Evidence Claim `source_ref`/producer text are omitted. Public output retains project/destination/milestone/predicate/claim IDs and relationships, claim freshness/reproducibility, plus primary destination, ready frontier, progress, next action, Cherry action, stale/conflict and blockers.
- D2 evidence: direct and nested `raw_prompt`, `raw_result`, prompt/result contents, credential values and local paths are absent after `projectPublicPackages`; minimum claim status and current/next fields remain present.
- Default-off parity: absent and non-exact flags `true`, `01`, ` 1`, and `1 ` return the exact original v1 object reference and unchanged JSON bytes. Only exact `1` enables v2.

## Verification

- Narrow D1 GREEN: `1/1` passed.
- Narrow D2 GREEN: `1/1` passed.
- Disposable focused integration (`outcome-model-v2`, `outcome-package`, `outcome-execution-control-plane`, `index`): `115/115` passed.
- Local model/control-plane/observer/runtime regression: `57/58` passed. The unchanged runtime-process test `validated isolated origin stop terminates only the recorded target and cleans its PID record` repeated the previously recorded `condition timeout`; it was not retried and no changed path participates in that process-control behavior.
- `git diff --check`: passed.
- Changed-path allowlist: passed; exactly four code/test paths changed before the receipt.
- Correction-path overhead only: 1,000 warmups, 9 samples of 10,000 operations. Proxy-guard validation median `13.1337 us`; public projection median `13.8811 us`. No comparison to the earlier S1 benchmark and no human-time claim.

## Remaining boundaries

- P1/P7 affected correction evidence is Builder-only until fresh independent re-QA.
- C1 remains open. The earlier QA verdict remains `NEEDS_REVISION` until a fresh affected-scope QA verifies this exact correction commit.
- C2 Release Audit and C3 Cherry acceptance remain open.
- No activation, deployment, provider/runtime/registry mutation, acceptance, release or Phase transition occurred.

## Rollback

Keep `OUTCOME_MODEL_V2_ENABLED` unset or not exactly `1` for exact v1 behavior. Revert correction commit `445cae24485960d91846ff8fe678844f7b8c0531` to restore the prior candidate. No registry, Gate, provider or external state requires cleanup.

## Preservation and mutation ledger

- Successor worktree was clean at exact base before correction.
- Canonical checkout was not edited, staged, normalized or cleaned. Immediately before correction commit it was observed as tracked `25`, untracked `269`; the concurrent untracked drift is preserved as Planner/user-owned.
- Allowed code/test file mutations: `4`.
- Receipt mutation: `1`.
- Correction candidate commits: `1`.
- Receipt-carrier commits: `1` after this file is committed.
- Registry/runtime/provider/environment/database/external mutations: `0`.
- Push/deploy/activation/release mutations: `0`.
- Automatic retry/replay count: `0`.
- Unauthorized mutation count: `0`.
- `false_completion_count`: `0`.
