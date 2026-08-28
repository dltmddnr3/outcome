# OUTCOME Role Transport Clock Authority Correction · Builder Receipt

Status: `BUILDER_CANDIDATE_ONLY`

## Immutable pins

- source commit: `1b2fedacc09306e5294581a5e0b27a025707f7b0`
- source tree: `e8667346af6dc332b7e39c8fdf50c206e12733ce`
- candidate commit: `8aada70211cd514e0869f5cffb4ad310ec11f107`
- candidate tree: `11cde5f90055250ca3eea749742a6906fbc300f8`
- handoff SHA-256: `a631a6a14ec24f31b75329dd6a60ce6d8f1208c8a18fa317635bbfa272ef5928`
- QA receipt SHA-256: `8285b4d42534416e314f574c906a1fdf2ce1bdda3688893f8e3e4130e7bbf054`
- governing Gate: `GATES_OUTCOME_ROLE_TRANSPORT_CLOCK_AUTHORITY_CORRECTION_20260828.md`

## RED and correction

- RED replayed the exact expired valid signed receipt with a caller backdated verifier clock. The source returned `started` and allocated lifecycle event 1.
- The production verifier now captures the runtime clock in module-private state and rejects every constructor argument. Callers cannot select, wrap, proxy, or backdate verifier time through the public factory.
- The existing Ed25519 authority public-key pin and verification-only production surface are unchanged. No issuer, signer, private key, caller-selected key, or production test override was added.
- Deterministic synthetic time is confined to tests before production module import.
- GREEN replay in a fresh process returns `trusted_evidence_stale` with event count `0`.

## Measured verification

- focused evidence/control-plane suites: `42/42 PASS`
- frontend suite: `90/90 PASS`
- complete Node suite: `349/349 PASS`
- exhaustive `server/*.test.mjs`: `349/349 PASS`
- security suite: `54/54 PASS`
- public-boundary prohibited identifiers: `0`
- scope: `58` product/runtime/test files, PASS
- runbook: PASS
- production build: `1,652` modules transformed, PASS
- `git diff --check`: PASS

## Mutation and rollback

- registry/binding/provider/runtime/environment/deploy mutation: `0`
- predecessor archive/delete: `0`
- automatic retry: `0`
- rollback: revert candidate `8aada70211cd514e0869f5cffb4ad310ec11f107` from an exact descendant and rerun focused plus complete regressions. No external state rollback is required.

## Open authorities

- Fresh UX & Product QA must independently replay the expired-receipt/backdated-clock attack against the exact candidate.
- Release Audit, Cherry acceptance, registry/runtime changes, deployment, release, and Phase progress remain open and are not claimed.
