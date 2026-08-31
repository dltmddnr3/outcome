# OUTCOME Model v2 B1 QA correction · Builder receipt

Status: `B1_QA_CORRECTION_CANDIDATE_READY · BUILDER ONLY`

This receipt records the two P1 corrections requested by the fresh B1 QA report. It does not assert fresh re-QA, B1 closure, Release Audit, Cherry acceptance, deployment, release, O2 closure, or Phase completion.

## Immutable chain and scope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · B1`
- Handoff SHA-256: `d937ee189f6e3084a81b6f7b3e8b30cccbe5712f4f03d03f15dce2670575c241`
- QA report carrier/tree/parent: `15e5249f3d82764144909dd27cc9be4e4d040f10` / `3cedbf38b6b799330a8d646eebef703251897d9e` / `dd4db46d09af4e9d79b06fb94ae8203343e82c37`
- QA receipt SHA-256: `e71c6b898e7da17565d496b0c01f27a83170b805c3cd32aeaceb0ae87434484f`
- Product correction commit/tree/parent: `6442b37089fd3132ba9ee54f3cfe1e79e41028de` / `bc88f2bf08057d16a9b647bbc1feaf4862ad8b4c` / `15e5249f3d82764144909dd27cc9be4e4d040f10`
- Receipt carrier parent: exact product correction commit above; the terminal Builder report fixes the receipt commit/tree.

Product correction changed exactly:

- `server/account-model-v2-projection.mjs`
- `server/account-model-v2-projection.test.mjs`

This receipt is the only path in the second commit. UI/style, client calculation, Contract, Model, Map, Gate, registry, provider, runtime, environment, database, dependency and lockfile paths were unchanged.

## RED-before-GREEN

Before the source correction:

- focused projection suite: `3/5` passed and `2/5` failed;
- requested `loading`, `stale`, `conflict`, `blocked`, and `delivery_unknown` each serialized as `ready`;
- only `no_active_work` and `ready` were independently reachable;
- benign unexpected own data keys were accepted.

After the correction, the server consumes five exact optional boolean state hints with a one-active-state invariant. The other two states remain derived from the verified projection. State output evidence:

| Expected | Actual |
|---|---|
| `loading` | `loading` |
| `stale` | `stale` |
| `conflict` | `conflict` |
| `blocked` | `blocked` |
| `delivery_unknown` | `delivery_unknown` |
| `no_active_work` | `no_active_work` |
| `ready` | `ready` |

- seven-state matrix: `7/7` exact and non-conflated;
- canonical state-table JSON: `321` bytes;
- deterministic state-table SHA-256: `67c52e989a46c4dea638f873c451030b592af92ca3f256a20132f008149df39b`;
- non-boolean state hint and multiple active state hints: fail closed.

## Recursive allowlist and privacy boundary

The projection now validates exact own data keys recursively for the server-consumed v1 source plus the already-approved public Package metadata used by the sealed account snapshot. It rejects every other key before graph translation or projection.

- explicit unexpected-key levels: root, project, current, phase, scope, stage, gate and gate item, `8/8` rejected;
- hostile classes: root Proxy, raw prompt, raw result, registry payload, locator-like key, absolute path, credential-like key, identifier-bearing task key, non-enumerable property, getter, symbol, accessor array, cycle and unsupported prototype, `14/14` rejected;
- getter/Proxy trap executions: `0`;
- rejected private content in product output: `0`;
- product-source privacy scan findings: `0`.

The exact allowlist retains account authorization, project isolation, public Package compatibility, deterministic serialization, read-only completion authority and server ownership. No client-side state calculation or UI change was added.

## Verification

Commands and results on the correction candidate:

1. `node --test server/account-model-v2-projection.test.mjs` → `6/6` PASS.
2. `npm run test:account-access` server phase → `33/33` PASS, including identity-only sealed snapshot, hosted/provider failure boundaries and PostgreSQL isolation.
3. `node --test server/outcome-model-v2.test.mjs server/outcome-package.test.mjs server/account-model-v2-projection.test.mjs` → `69/69` PASS.
4. Unique completed Node tests: `102/102` PASS.
5. Frontend Vitest command started with the reused local dependency tree but produced no result across two bounded 30-second observations; it was terminated without retry.
6. `npm run build` started but produced no result across two bounded 30-second observations; it was terminated without retry.
7. New `dist`: absent. Built-output public-boundary scan: not run and not claimed.
8. `git diff --check` → PASS.
9. Product-source private-value scan → `0` findings.

The first combined account command before local dependency reuse stopped during module loading because `yaml` was unavailable in the isolated worktree. A task-owned symlink to the existing canonical `node_modules` was then used; install, fetch and network remained `0`. The symlink was removed before commit.

## Preservation, rollback and counters

- Canonical dirty fingerprint at start and after product commit: `e3568eada5e6ee4399e57dc97365c96e2f3b722e0486e9ac55aa8ce0cfb12aed` / unchanged.
- Product source/test changes: `2` paths.
- Receipt-only changes: `1` path.
- Dependency/install/fetch/network mutations: `0/0/0/0`.
- Registry/provider/runtime/environment/database/external mutations: `0`.
- Deployment/push/release/acceptance/Phase mutations: `0`.
- Automatic retry/replay: `0`.
- Unauthorized transition: `0`.
- `false_completion_count`: `0`.

Rollback is the exact QA carrier `15e5249f3d82764144909dd27cc9be4e4d040f10`, or reverting the product correction and this receipt in reverse order. Rollback must not modify the canonical dirty checkout, registry, provider/runtime state, B1 offline evidence bundle, or QA history. No rollback was executed.

## Residual unsupported evidence

- Frontend Vitest, production build and built-output public-boundary scan remain unverified in this bounded local dependency environment.
- Fresh independent re-QA must reproduce both corrected P1 boundaries and decide the B1 QA verdict on the immutable two-commit chain.
- Release Audit, deployment/runtime/provider behavior, Cherry acceptance, release and Phase transition remain outside this Builder candidate.
