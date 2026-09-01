# OUTCOME Model v2 canonical package promotion — C1 Cherry acceptance receipt

Status: `CHERRY_ACCEPTED_CANDIDATE_ONLY`

Observed: 2026-09-01 KST

Authority input: Cherry replied exact `승인` to the C1 decision request naming the independently verified canonical-package candidate.

## Accepted immutable identity

- Accepted local-only source: `a40ee664e194c21554b0497382d499296cb2c52b`
- Semantic candidate: `8333a410e66ce154e9d3b5857b50fa9bb3c4df5f`
- Builder receipt carrier: `6ab2135aae8e2d3aae418a19434a51da45e42c05`
- Fresh QA carrier and verdict: `12c49b2b9486717d64a3c0c20ba17d42305c753f`, `PASS_UX_PRODUCT_QA_ONLY`
- Fresh Release Audit carrier and verdict: `66a8a79447e07140e4cf976c51dcf83a0c79e783`, `PASS_RELEASE_AUDIT_ONLY`
- Audit carrier tree / parent: `85db5b484e9aece1586d2746812bff7689bab9b4` / QA carrier
- Audit receipt SHA-256: `1a9297b76a53b7158da6ce9e4dd3bce460c29f0c77a42fad5d0ae464002075e6`
- Current Projection artifact SHA-256: `3c91151af4694292d5a94ede1d39c29d6ab176510acb984e258519a094125ead`
- Regression evidence: `102/102`

## Accepted authority

Cherry accepts the exact Audit carrier as the canonical-package promotion candidate and authorizes the Planner to issue one bounded dirty-aware active-root cutover handoff to the current protected Builder.

The Builder may proceed only if the active root remains on the exact expected branch/base, all candidate ancestry and receipt pins match, every unrelated dirty byte and index state can be preserved, and the cutover is a true fast-forward with no merge rewrite. Any conflict, untracked overwrite risk, path overlap, fingerprint drift or ambiguous post-cutover state is `SAFE_HOLD` with zero coercive cleanup.

## Excluded authority

This acceptance does not itself move a ref or worktree, resolve conflicts, stash/reset/clean user files, perform dogfood, activate Preview or Production, deploy, release, mutate a provider/database/credential/environment, close Phase 3 or claim deployed rendering/accessibility evidence.

## Rollback

Before successful active-root cutover, rollback is to keep the accepted candidate isolated and leave the active root unchanged. After a separately verified cutover, rollback must use an explicit history-preserving revert/forward operation defined by the cutover receipt; never rewrite or delete accepted evidence.

## Safety counters at acceptance

- active-root mutation count: `0`
- external mutation count: `0`
- automatic retry count: `0`
- unauthorized transition count: `0`
- false_completion_count: `0`
