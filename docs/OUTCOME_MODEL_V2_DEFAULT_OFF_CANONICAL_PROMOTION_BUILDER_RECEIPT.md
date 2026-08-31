# OUTCOME Model v2 — default-off canonical promotion Builder receipt

Status: **CANDIDATE_READY — BUILDER EVIDENCE ONLY**

Attempt: `model-v2-default-off-canonical-promotion-attempt-2`

## Immutable inputs

- Execution handoff SHA-256: `ee5adcbab3bb3f5e8deecd8c0b079e4ed9fc234cddc26701b99d201c6dd63bbd`.
- Canonical source: commit `82c5e5e4ff76cd0d4b46a2cb3578594b7ec11d58`, tree `f22c92ff6d53552fe5814ca19db93409d3e51917`.
- Verified audit carrier: commit `c58eea93f93098d2f66c886cc2c066d991048a47`, tree `010e593dccef7929e4cad61d2966b97112402af8`, parent `e20f29c922719a6fe0c1ba0ad168da97c39eef8e`.
- Verified optimization candidate: commit `6379cfd0c47dd8b97e80fd6876c90ef1b38b0c88`, tree `bef28beb15c55bdc77d4534e2cdd8e9612467245`.
- Fast-forward ancestry from the canonical source to the audit carrier: verified.

## Semantic promotion

- Commit: `ab5aa4974d78f2d430d49a267b4870899b27b228`.
- Tree: `f2ccc5b5306504002fa62bf796d6f61becba3dc1`.
- Parent: `c58eea93f93098d2f66c886cc2c066d991048a47`.
- Exact changed paths:
  - `GATES_OUTCOME_MODEL_V2.md`
  - `docs/OUTCOME_MODEL_V2.md`
  - `docs/OUTCOME_MODEL_V2_C3_CHERRY_ACCEPTANCE_RECEIPT.md`
- The staged diff contained only those three paths and passed `git diff --cached --check`.

Planner-owned bytes were preserved exactly:

- `GATES_OUTCOME_MODEL_V2.md`: `e65eced0bc564fc634f0cb9d4780cd60ec66d0458487bddf653e96ec0944e457`.
- `docs/OUTCOME_MODEL_V2.md`: `0a708464b3b83393b8b25f23e0f1364bc976844caa0cb079426967b1932073cb`.
- `docs/OUTCOME_MODEL_V2_C3_CHERRY_ACCEPTANCE_RECEIPT.md`: `19623f26b061a233de17935cda2e44273c31f099fb629b8f6016fee7c4b8170a`.

## Promoted candidate byte identity

All four required paths matched their blobs in the verified audit carrier:

- `server/outcome-model-v2.mjs`: SHA-256 `89530cfaea0ba5f75764d90dd13b24bcb220b2bbc1e39f6ced613ef50c0b2474`.
- `server/outcome-model-v2.test.mjs`: SHA-256 `5c7f306501c0a24892b19444e4c8aa17e8a36f46679ec260b0e75faa98325d80`.
- `server/outcome-package.mjs`: SHA-256 `ad392cb094fc2b823df2764eff86b0133e0373eb9c382d298c381d6773dceebf`.
- `server/outcome-package.test.mjs`: SHA-256 `208434b65e0ed7d65a3334276cf3ce9a3d532340075cab61563c99bee80e999c`.

## Verification evidence

Command:

```text
node --test server/outcome-model-v2.test.mjs server/outcome-package.test.mjs server/outcome-execution-control-plane.test.mjs server/index.test.mjs
```

Result: `117` tests passed, `0` failed, `0` skipped, `0` cancelled.

The focused suite includes hostile graph and Proxy rejection, public projection privacy, execution-control authority and replay behavior, package/runtime loading, and P8 default-off rollback. P8 proves that an absent or non-exact `OUTCOME_MODEL_V2_ENABLED=1` opt-in returns the exact v1 object and that enabled mode remains projection-only. The Builder environment contained no `OUTCOME_MODEL_V2_ENABLED` value during verification.

## Dirty-state preservation

- Pre-mutation tracked dirty count: `25`; path-list SHA-256 `7434adc170cc342326fcca64b7516a9fa3942f31cd9c5f2d2d5cd606a3bbfcb5`.
- Pre-mutation normalized untracked baseline excluding the handoff: `276`; newline-byte SHA-256 `66a675bf6c75b5cd3330fa4c42e54ad41ce2a8f077f6918122b72b7acb3d8873`.
- Promotion-chain overlap with the dirty inventory: `0` paths.
- Unrelated dirty inventory, excluding the three promoted Planner files and the authorized handoff/receipt boundary: `298` paths before and after promotion; path SHA-256 `f471e8ee611e4212aacbd8cddbf6756b3372e36dd842cf4ac274bccc392e28f5`; content-manifest SHA-256 `660b0b6774996dd4756f6ab183d26136c9eedbdf5d121d4633e6061c4995fe17`.
- No unrelated path was staged, normalized, deleted, or edited.

## Mutation ledger and limits

- canonical fast-forward count: `1`
- semantic promotion commit count: `1`
- Builder receipt file write count: `1`
- Builder receipt carrier commit count: `1`
- product amendment count: `0`
- push/tag count: `0`
- feature activation count: `0`
- registry/runtime/provider/environment/database/credential/external mutation count: `0`
- automatic retry count: `0`
- false completion count: `0`

## Rollback and remaining boundary

Model v2 remains default OFF. Any future rollback requires a separately authorized revert; history must not be rewritten and receipts must not be deleted. This Builder receipt is not fresh QA, Release Audit, activation, deployment, release, or Phase completion. The promoted identity still requires new candidate-specific QA and C2 Audit before any activation proposal.
