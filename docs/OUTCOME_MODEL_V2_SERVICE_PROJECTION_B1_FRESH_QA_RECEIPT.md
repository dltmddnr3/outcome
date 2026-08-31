# OUTCOME Model v2 Slice B1 fresh UX & Product QA receipt

- terminal verdict: `NEEDS_REVISION_UX_PRODUCT_QA`
- role scope: independent UX & Product QA only; no B1 closure, Release Audit, acceptance, deployment or release authority
- canonical Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B1`
- RED parent: `517f436150b684a2f7d72f6144bfa848af397bb4`
- candidate commit/tree/parent: `74c7e07335796df47469b3c478a248d12f2920b7` / `b4f64a7b940be9256efe3ae98518502b396563b3` / `517f436150b684a2f7d72f6144bfa848af397bb4`
- Builder receipt carrier/tree/parent: `f6373be6bb0a40b8f7de9e58244ce2b325a2decd` / `1846fefea58e928b2f8cc0bc7873d46a355ed67a` / `74c7e07335796df47469b3c478a248d12f2920b7`
- recovery carrier/tree/parent: `dd4db46d09af4e9d79b06fb94ae8203343e82c37` / `6dad63aec26d909cd14c60853b07cf0aeb3ea070` / `f6373be6bb0a40b8f7de9e58244ce2b325a2decd`
- offline bundle SHA-256/size: `6cc61d4c31d45a549d3cf9985792d41418375c581db22c072e5ed3c4c84b8a1e` / `1809676`

## Independent evidence

1. Exact immutable envelope and RED-before-GREEN
   - The bundle hash and size matched, `git bundle verify` reported a complete history, and disposable roots reproduced the exact parent and candidate commit/tree identities with clean source state.
   - Exact parent response: authorized project count `2`, `modelV2` count `0`. RED reproduced.
   - Candidate changed exactly `6` paths, confined to account access, the new server projection module/tests and client response types.

2. Authorization, isolation and privacy
   - Account-access server matrix: `33/33` passed, including signed-out, wrong-owner, expired, revoked, forged-project, stale-membership, cross-workspace, conflict, provider-outage, API selector/mutation denial and synthetic PostgreSQL workspace isolation.
   - Eleven hostile value classes were independently rejected: ordinary accessor, Proxy, symbol, non-enumerable, cycle, unsupported prototype, absolute path, credential key, raw prompt key, registry payload key and locator key. Trap execution count was `0`.
   - Deterministic projection bytes matched across repeated construction; observed SHA-256 was `42c6f93372b655a7217cb3e2a4007b51d976f23e7893cbd070e52aa1a97f572d`.

3. Material candidate defects
   - Severity: `P1` product/state-semantics failure. The server adapter does not consume state-bearing Model v2 runtime input. Minimal source variants requesting `loading`, `stale`, `conflict`, `blocked` and `delivery_unknown` all serialized as `ready`. Only `ready` and `no_active_work` were reachable in the seven-state matrix.
   - Smallest reproduction: add own data property `stale: true` to an otherwise valid open-milestone v1 project, call `createAccountModelV2Projection(..., { observedAt })`; expected state `stale`, actual state `ready`.
   - Impact: the private workspace can present stale, conflicted, blocked or delivery-unknown work as ready, violating the required default information hierarchy and fail-closed product meaning.
   - Severity: `P1` contract/allowlist failure. Adding benign unexpected input `{ unexpected: { foo: "bar" } }` was accepted instead of rejected, so the required exact recursive input allowlist is not enforced.
   - Builder correction boundary: make the server-owned projection consume an exact allowlisted state-bearing source contract, reject every extra key recursively, and add independent fixtures proving each of the seven states is reachable without conflation. Preserve trap-free descriptor validation and authorization denial behavior.

4. Regression, build and rollback
   - Model v2/package/projection regression: `66/66` passed.
   - Combined completed supplied server tests: `99/99` passed (`33` account-access plus `66` Model v2/package/projection; no inherited Builder count).
   - Frontend Vitest and production build remained environment-incomplete: the shared dependency symlink allowed Node tests, but Vitest produced no result within two bounded intervals; task-owned dependency materialization did not complete within the final bounded interval; the build produced no result before `BOUNDARY_FINALIZE`. No additional materialization, Vitest, build, install, fetch or environment attempt followed.
   - Public-boundary scan could not run because the required candidate `dist` was absent after the incomplete build. This is residual unknown evidence and is not promoted to PASS or a candidate defect.
   - Exact rollback is the verified parent `517f436150b684a2f7d72f6144bfa848af397bb4`; both parent and candidate disposable roots remained source-clean. The canonical dirty checkout was not modified.

## Safety counters and residual unknowns

- candidate inspection roots: disposable and offline
- network/fetch/install: `0/0/0`
- product/Gate/canonical/registry/provider/runtime/external/deploy/push/release/acceptance mutation: `0`
- automatic retry/replay: `0`
- report mutations: this single authorized receipt only
- false_completion_count: `0`
- residual unknowns: frontend Vitest, production build, built-output public-boundary scan, and UI geometry were not completed in the bounded dependency environment; Release Audit, deployed/runtime/provider semantics and Cherry acceptance remain out of scope.

`NEEDS_REVISION_UX_PRODUCT_QA`
