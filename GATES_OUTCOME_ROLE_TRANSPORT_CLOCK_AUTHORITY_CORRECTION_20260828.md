# OUTCOME Role Transport Clock Authority Correction Gate

Outcome: trusted role-transport receipts are evaluated against a non-caller-controlled runtime clock, so an expired signed receipt cannot be revived by constructing a backdated public verifier.

- [x] C1: the public verifier surface cannot accept, derive, or substitute caller-controlled current time.
  - CHECK: import the production public surface and attempt to construct a verifier with a backdated clock or equivalent time source.
  - EXPECT: the override is rejected or impossible; production verification uses the trusted runtime clock only.
  - EVIDENCE: production captures `Date.now.bind(Date)` once in module-private state; `createTrustedRoleEvidenceVerifier(...args)` rejects every nonzero argument count with `trusted_verifier_invalid`. Public exports are exactly verifier creation plus resolver-brand inspection, with no clock setter or authority-key input.

- [x] C2: an expired but otherwise valid signed receipt cannot create lifecycle progress.
  - CHECK: replay the exact fresh QA fixture against the public verifier and execution control plane.
  - EXPECT: verification fails atomically before event allocation; lifecycle event count remains `0`.
  - EVIDENCE: RED reproduced the QA attack: a valid receipt expiring at `1000` plus `{ clock: () => 100 }` returned `started` and allocated event 1. GREEN runs the same signed receipt in a fresh process against the production verifier; result is `trusted_evidence_stale` and event count `0`.

- [x] C3: fresh valid receipts and every existing correlation boundary remain intact.
  - CHECK: focused tests cover signature tamper, wrong project/role/binding/destination/instruction/attempt/receipt/cursor, stale, duplicate, replay, and valid fresh evidence.
  - EXPECT: only fresh, correctly signed and fully correlated evidence advances; all hostile cases fail closed.
  - EVIDENCE: focused role-evidence/control-plane suites pass `42/42`; valid signed start/provider/destination receipts advance while invented signature, tamper, wrong correlation, stale receipt, replay, invalid destination observation, and lifecycle ordering remain fail-closed.

- [x] C4: production trust origin and privacy boundaries remain narrow.
  - CHECK: inspect production exports and scan production files for signing/private keys, caller-created issuer paths, private locators, registry records, or provider credentials.
  - EXPECT: production exposes verification only; operational private/signing key hits and prohibited public identifiers are `0`; synthetic signing keys remain test-only.
  - EVIDENCE: production signing/private-key hits `0`, private boundary identifier hits `0`, issuer factory hits `0`; the existing Ed25519 public-key pin is unchanged. Deterministic time setup exists only in test files before module import and is not a production export or runtime option.

- [x] C5: relevant regressions and build remain green on one immutable Builder candidate.
  - CHECK: focused role-evidence/control-plane suites, complete frontend and Node suites, exhaustive `server/*.test.mjs`, security/public-boundary checks, `npm run build`, and `git diff --check`.
  - EXPECT: all pass and the Builder records exact source/candidate commit and tree plus an immutable receipt.
  - EVIDENCE: source commit/tree `1b2fedacc09306e5294581a5e0b27a025707f7b0` / `e8667346af6dc332b7e39c8fdf50c206e12733ce`; frontend `90/90`, Node `349/349`, exhaustive Node `349/349`, security `54/54`, public-boundary prohibited identifiers `0`, scope `58` files PASS, runbook PASS, build `1,652` modules, and `git diff --check` PASS. Exact candidate commit/tree are recorded by the immutable Builder receipt.

Authority boundary: this Gate authorizes only a bounded Builder correction candidate and receipt. It does not authorize registry/runtime/provider/environment mutation, QA PASS, Release Audit, Cherry acceptance, deployment, release, or Phase progress.
