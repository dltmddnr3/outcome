# OUTCOME Model v2 pilot — Builder receipt

Status: **CANDIDATE_READY · BUILDER EVIDENCE ONLY · ACTIVATION NOT AUTHORIZED**

## Immutable input

- Handoff SHA-256: `729028a2694b532c70315f6ab1119ed12821ce4c11c2359a44af00c57651fae6`
- Source commit: `82c5e5e4ff76cd0d4b46a2cb3578594b7ec11d58`
- Source tree: `f22c92ff6d53552fe5814ca19db93409d3e51917`
- Source parent: `37e346b8ddf68e66b5cebee1741f8d75522080e7`
- Builder binding at dispatch: project `outcome`, role `builder`, version `11`, public alias `builder-model-v2-pilot`.

## Candidate

- Candidate commit: `d2b181739a114b11a08c199ec1afc575f4bcbb09`
- Candidate tree: `a89290080112d49db13cac4c72f074ca4ba179b3`
- Candidate parent: `82c5e5e4ff76cd0d4b46a2cb3578594b7ec11d58`
- Candidate changed paths:
  - `server/outcome-model-v2.mjs`
  - `server/outcome-model-v2.test.mjs`
  - `server/outcome-package.mjs`
- File SHA-256:
  - `server/outcome-model-v2.mjs`: `1bb68c28758f4ea9ea853a1c1fb1dc50235559d63a67e064bb08cabe9ec1201c`
  - `server/outcome-model-v2.test.mjs`: `c6300dbe24c37f9a94399c8eaf2546a61a1bcf11dfee72aafb39b1a28db4c96d`
  - `server/outcome-package.mjs`: `9eb90101c13c13f526ae41b86c380d35a8bd9f967c290e15431b6aeb83ed8f60`

This receipt is a separate evidence carrier so it can name the already immutable candidate commit without a self-referential Git hash. It does not change candidate semantics.

## Implementation result

- P1: implemented a strict machine-readable v2 graph for Project, Destination, Milestone, Acceptance Predicate and Evidence Claim. Scope is not a canonical entity. Exact-shape, accessor, Proxy, duplicate, dangling-reference and DAG-cycle cases fail closed.
- P2: implemented a pure v1 compatibility translator. Source input remains byte/object unchanged; correction, handoff and status history stay recoverable in v1 and are excluded from the active v2 graph.
- P3: implemented one versioned projection for primary destination, ready frontier, predicate counts, next action, Cherry action, stale/conflict and source revision.
- P4: reused the existing execution control plane through a narrow adapter for selection, validated start, separately observed lifecycle/evidence events and public runtime projection. The adapter has no canonical-transition authority.
- P5: stale source, duplicate fingerprint, active duplicate attempt, expired envelope and overlapping lease cases allocate no eligible next action.
- P6: `delivery_unknown` stays terminal and any non-zero automatic retry count fails closed.
- P7: coherent candidate identity includes source tree, dependency lock, configuration class and sorted predicate set. Semantic candidate drift opens verification; no-semantic-delta history does not.
- P8: the feature is enabled only by exact local flag `OUTCOME_MODEL_V2_ENABLED=1`. Disabled mode returns the exact original v1 object; rollback is flag-off with no registry, Gate, receipt or external rewrite.
- S1: deterministic local fixture, 31 iterations: v1 median `18.210 ms`; v2 translation/projection median `1.637 ms`. This is synthetic local overhead evidence only and makes no human-time claim.
- S2: hostile tests record zero automatic retry, duplicate allocation, unauthorized canonical transition, external mutation and normal-path human intervention.
- S3: three of three supplied correction/handoff/status artifact classes are excluded from the active graph while remaining present in the v1 source fixture (`100%`, above the `70%` predicate).
- S4: work with zero user-value, acceptance-gap, uncertainty and blocker delta is not selected and returns exact Cherry action `review_no_outcome_delta`.

## Verification

- `node --test server/outcome-model-v2.test.mjs server/outcome-execution-control-plane.test.mjs`: `48/48` passed after the final correction.
- Disposable-copy integration: `node --test server/outcome-model-v2.test.mjs server/outcome-package.test.mjs server/outcome-execution-control-plane.test.mjs server/index.test.mjs`: `113/113` passed.
- Disposable-copy full repository test: Vitest `90/90` passed; Node suites `311/314` passed. The three failures were in pre-existing Clerk-backed suites because the shared local `@clerk/shared/package.json` was invalid; no v2, Package, control-plane or runtime test failed.
- Disposable-copy `npm run build:isolated`: original process produced no output for more than five minutes and was manually stopped. It was not replayed. Build evidence remains open.
- `git diff --check`: passed before candidate commit.
- Changed-path allowlist: passed; only the three candidate paths above changed.
- Canonical dirty-state preservation immediately before candidate commit: tracked `25`, untracked `257`, total `282`; no canonical path was staged, normalized, overwritten or deleted.

## Remaining predicates and boundaries

- C1 remains open: fresh UX & Product QA is required on this immutable candidate, including the 30-second current/next understanding flow.
- C2 remains open: separate fresh Release Audit is required for scope, privacy, rollback, runtime authority and artifact identity.
- C3 remains open: Cherry acceptance and any activation decision are separate and have not occurred.
- The isolated build gap remains open because the only permitted local dependency state did not complete the original build process.
- Default-off remains mandatory. No live activation, deployment, provider mutation, acceptance, release or Phase transition is claimed.

## Rollback

Keep `OUTCOME_MODEL_V2_ENABLED` unset or not equal to `1`. The package collector then returns the exact existing v1 value. Candidate rollback is the single candidate commit revert; no registry, Gate, receipt, provider or external state must be rewritten.

## Mutation ledger

- Candidate source-file mutations: `3` allowed paths.
- Receipt-file mutations: `1` allowed path.
- Candidate commits: `1`.
- Receipt-carrier commits: `1` after this file is committed.
- Registry/runtime/provider/environment/database mutations during implementation: `0`.
- External mutations, pushes, deployments and releases: `0`.
- Automatic retry/replay count: `0`.
- Unauthorized mutation count: `0`.
- `false_completion_count`: `0`.
