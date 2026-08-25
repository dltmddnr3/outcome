# Phase 2 · Account Access Release Audit Preflight

Status: `PREFLIGHT_HOLD · INPUT AUTHORITY REQUIRED`

This is a source-grounded hold, not a Release Audit verdict. `lime-release-auditor` requires the `whitecastle-execution-core` start Gate and a schema-valid `lime-release-qa` ticket before a fresh auditor may start.

## Exact candidate inputs already available

- Main candidate: `c01ea42e655ec870274eb1ea0f2b59653802f786`
- Main tree: `4b0e60e033c0b45bc2814b4ed9af3c9b04f12135`
- Public receipt: commit `c01ea42e655e`, tree `4b0e60e033c`, asset `index-fGSYVODK.js`
- Account migration SHA-256: `832e8fc117d7c5b1b403cbe8f4e34ca3f4ceeb3f23904c82daefd56b96cae5a7`
- Deployment snapshot SHA-256: `188b7e5d0f9619b8521959ac9f2a2cba1a69817946a0b53f966cf2d1c5de2524`
- Fresh UX/Product re-QA report SHA-256: `e997efc96ac5c204fb8c0a922c4887bda0204011ec61ce2105bd296cd7566225`
- Release Audit Gate SHA-256 before this hold note: `ee798bc22dd9d779acecd93c4ef5873e65e48d64c514cd91f7786c075d649ccc`

## Exact execution profile pins

- Job profile: `lime-release-qa`; minimum quality score 94; required outputs `commit_pin`, `test_matrix`, `regressions`, `accessibility`, `runtime_evidence`, `release_scope`, `quality_score`, `verdict`.
- `whitecastle-execution-core` SHA-256: `91a23d99281a6db1c10561deb6f9c7325bfaf09d02a680760c1894f9d6d47799`
- `lime-independent-qa` SHA-256: `ba1cc2193a9452930eb7153d7f376d3134bb1f11bc305bf270db5dd0ace978d7`
- `lime-release-auditor` SHA-256: `f9e7987f23171a60dad542a04936f4c86e369fcd5c5bc1f11f8164a0a8df1e0d`
- Job profile registry SHA-256: `ae4af7ec4fc63fb2d100efdc582649556277f36388af23808c375f95c6d7f2a9`
- Input schema SHA-256: `158fd8373e52e9888fd7d519f6e8cdb4b6f64e2210f90cc0149bafd0230d4ce8`
- Output base schema SHA-256: `f0130acbd149ab77802f3c15b61cabd75372afd6c74ac3fdc7f8ae1b18d2ecf2`
- Release output schema SHA-256: `dc99dd794f6a881bf6e7d3cf7e21bfd672d9f25c587825e4f1bcc6ef406a5519`

## Missing required inputs

1. Real canonical Linear issue ID/URL/team/project receipt. OUTCOME contains no source for these fields.
2. Control `upstream_start` acknowledgement and its authorizer receipt.
3. Canonical Lime role-core registry path/SHA and exact executor binding.

The input schema makes these fields mandatory. Placeholder IDs, invented URLs or self-acknowledgement would violate the execution contract, so no audit session was spawned.

## Minimal Cherry decision

Choose one authority path:

- provide/authorize creation of the canonical Linear/control/role binding required by `lime-release-auditor`; or
- explicitly approve an OUTCOME-native Release Audit contract that uses the existing `GATES_PHASE2_ACCOUNT_ACCESS_RELEASE_AUDIT.md` without WhiteCastle/Linear coupling.

Until then A1-A4 remain 0/4. Cherry acceptance, provider/resource mutation, release, Phase 2 completion and `EXTERNAL_OUTCOME_COMPLETE` remain open/false.
