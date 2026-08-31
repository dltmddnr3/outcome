# OUTCOME Model v2 B1 offline evidence recovery · Builder receipt

Status: `B1_OFFLINE_EVIDENCE_CARRIER_READY · BUILDER ONLY`

This receipt records a local, standalone, content-addressed Git evidence carrier for independent B1 reproduction. It does not assert QA, Release Audit, Cherry acceptance, deployment, release, B1 closure, O2 closure, or Phase completion.

## Canonical position and immutable input

- Project: `outcome`
- Destination / Milestone: Model v2 local default and private workspace projection / `outcome-milestone-model-v2-local-default-projection`
- Compatibility Gate / Predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · B1`
- Recovery checkpoint SHA-256: `d93374a133e1c15ef9f9ddf00790d6ca2a81c47e69500bfd8157494a93f43415`
- RED parent commit/tree/parent: `517f436150b684a2f7d72f6144bfa848af397bb4` / `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c` / `949a7d54ced67fc30471ba5fe90ee902ce637a46`
- B1 candidate commit/tree/parent: `74c7e07335796df47469b3c478a248d12f2920b7` / `b4f64a7b940be9256efe3ae98518502b396563b3` / `517f436150b684a2f7d72f6144bfa848af397bb4`
- B1 Builder receipt carrier/tree/parent: `f6373be6bb0a40b8f7de9e58244ce2b325a2decd` / `1846fefea58e928b2f8cc0bc7873d46a355ed67a` / `74c7e07335796df47469b3c478a248d12f2920b7`
- B1 Builder receipt SHA-256: `c0e84de19130d5c18925626ab9f05a0f7594044a979fe800354efe69fd45c634`

## Standalone offline artifact

- Path: `/private/tmp/outcome-b1-offline-evidence-6cc61d4c31d45a549d3cf9985792d41418375c581db22c072e5ed3c4c84b8a1e.bundle`
- SHA-256: `6cc61d4c31d45a549d3cf9985792d41418375c581db22c072e5ed3c4c84b8a1e`
- Bytes: `1809676`
- Contained ref: `refs/heads/b1-receipt-carrier` at `f6373be6bb0a40b8f7de9e58244ce2b325a2decd`
- Bundle verification: `complete history`; hash algorithm `sha1`; verification result `okay`
- Reachable missing object count from the receipt carrier with lazy fetch disabled: `0`

The carrier was generated from already-local Git objects only. `GIT_NO_LAZY_FETCH=1` was set for object packing, fsck, checkout and archive operations. Network access, fetch, install and file-content reconstruction were not used.

## Materialized-file and dirty-state boundary

An exact tracked-worktree equivalence scan found no existing worktree whose current tracked working files were byte-equivalent to either the full RED parent tree or the full receipt-carrier tree. The canonical checkout was at the RED parent commit but contained unrelated Planner/user-owned dirty state; the older RED worktree also contained unrelated dirty state; the predecessor Builder worktree was clean at a later commit.

Because the local object closure was already complete, missing promised blobs numbered `0`. No materialized working file was rehashed into or written to the evidence object database, so there was no opportunity to substitute current or reconstructed content for an expected object ID.

Source dirty fingerprints before and after carrier verification:

- canonical checkout: `e008598e2bea3cf1430256ab4754f118e0577511ee01d77b796859801e1d97c8` / unchanged
- RED worktree: `715120cea16bfb2798f5286e535ee8270960986250e99ee4c4d35be04e570502` / unchanged
- predecessor Builder worktree: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` / unchanged and clean

No source worktree was checked out, staged, reset, stashed, normalized or cleaned.

## Offline verification evidence

The disposable bare repository and a brand-new clone created only from the bundle passed:

1. `GIT_DIR=<disposable-bare> GIT_NO_LAZY_FETCH=1 git fsck --full --no-dangling` → PASS; no missing or corrupt objects.
2. `git bundle verify <artifact>` → PASS; complete history; receipt-carrier ref exact.
3. `GIT_NO_LAZY_FETCH=1 git clone --no-checkout <artifact> <new-clone>` → PASS without network.
4. Exact commit/tree/parent readback for RED parent, B1 candidate and B1 Builder receipt carrier → `3/3` match.
5. Detached checkout of all three pins in the new clone → `3/3` clean.
6. `GIT_NO_LAZY_FETCH=1 git archive --format=tar 517f436...` → PASS, `4392960` bytes, SHA-256 `6c6bd8fcda05d47261817e09fc318684d2f402446cc982a6fd090d1fc2d648e4`.
7. `GIT_NO_LAZY_FETCH=1 git archive --format=tar 74c7e073...` → PASS, `4403200` bytes, SHA-256 `7bf4071b832dc5388ae5c18ff8f25295bd416d9e7aab57dca415223a9686646f`.
8. `GIT_NO_LAZY_FETCH=1 git fsck --full --no-dangling` in the new clone → PASS.

The first checkout-verification shell loop had a zsh scalar word-splitting defect and terminated before archive verification. It produced no repository or external mutation. The corrected verification used explicit zsh array splitting against the same already-created artifact and clone; it did not rebuild or replace the carrier.

## Changed scope, rollback and counters

- Product, tests, UI, types, Gate, Map and Contract changes: `0`
- Durable repository output: this receipt only, committed directly on top of `f6373be6bb0a40b8f7de9e58244ce2b325a2decd`
- Provider/runtime/environment/database/credential/external mutations: `0`
- Network/fetch/install/push/deploy operations: `0`
- QA/Audit/acceptance/release claims: `0`
- Automatic retry/replay: `0`
- Unauthorized canonical transition: `0`
- `false_completion_count`: `0`

Rollback is deletion of the exact content-addressed bundle and reversion of this receipt commit only. The source commits, user-owned dirty state, private registry, predecessor history and external state must not be rewritten or deleted. No rollback was executed.

## Residual unknowns and next boundary

- `/private/tmp` is local ephemeral storage. The artifact is independently reproducible from the exact local object closure recorded here but is not a remotely durable publication.
- This recovery establishes offline evidence availability only. Fresh independent QA must consume the bundle, reproduce RED-before-GREEN and issue its own verdict against the exact immutable candidate.
- Managed-provider, deployment, production, release and user-result semantics remain outside this Builder recovery and unverified by it.
