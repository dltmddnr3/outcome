# OUTCOME Model v2 A5 corrected coherent candidate — fresh Release re-audit receipt

Verdict: **FAIL_RELEASE_AUDIT_ONLY**

## Immutable subject and protected preflight

- Project / role: `outcome` / `release_audit`.
- Protected preflight used the private `locator_ref` field without retaining or printing its value: self-match `1`, active count `1`, active self-match `1`, app inventory match `1`, doctor clean, issues `0`, lock clear.
- Re-audit handoff SHA-256: `df6469b6ca11681c842049753d288792bf62b7160586eb72bf66000a11baa0c8`.
- Failed Audit carrier/tree/parent: `3051dc966a74c0c2d1d73a30bacbcbe12b42af90` / `94ff0f694a204bd6464239e3bedbaf59835727fc` / `7b25b801da4e971a837b302f0ffff02d0e2d64fc`.
- Failed Audit report SHA-256: `9e77063cfbc09517fa5e8376846902075a449205006ff021eff91765c279ba5b`.
- Corrected product/evidence-source commit/tree/parent: `f4bd8c4427f903f4a3d050e7a0d15a9f244e77bf` / `8e6c82baf2082e25d53644be0116ed38b780a57b` / `3051dc966a74c0c2d1d73a30bacbcbe12b42af90`.
- Audited corrected receipt carrier/tree/parent: `93400aae75ddc17bc65de704dd4b3006735c0414` / `33c6747d0fd9d56d22bbdad12856a02e788d9caa` / `f4bd8c4427f903f4a3d050e7a0d15a9f244e77bf`.
- Corrected Builder receipt SHA-256: `615e75229e1f2d2aa3c34a6a98e5b9f5318ee044f84266a8f7fed99c2e116554`.
- Underlying product/test candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`; it is an exact ancestor of the corrected carrier.

The correction scope is exact: materialized `AGENTS.md`, materialized local-default/service-projection contract, corrected canary, then one Builder receipt. No product behavior, Gate, Model, Map, dependency or lockfile path changed.

## Closed prior finding

The prior A5 F1 missing/stale-input defect is closed:

- Corrected carrier `AGENTS.md` SHA-256: `cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93`.
- Corrected carrier slice-contract SHA-256: `b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657`.
- Final manifest pins the immutable Contract/Map/promoted-Gate digests and nine final inputs; historical Q1 source revision, frozen-Q1 Gate digest, historical Gate family and raw-conversation references survive `0` times in output.
- Two clean canary executions are byte-identical at SHA-256 `a811501305e209c0d70c8f417b14187a68b1015e5c83e30c5132542a68948f97`.
- Both report `11/13` closed, A5 ready/open, C1 locked, next action `work-a5-release-audit`, Cherry action `null`, duplicate/retry/unauthorized-transition/mutation/false-completion counters `0`.
- One disposable Gate-byte drift exits `2` with `cold_compile_required/source_digest_drift`; one missing required `AGENTS.md` exits `2` with `cold_compile_required/source_input_missing`. Both report retry, mutation and false-completion counters `0` with no fallback.

## Blocking finding

### F1 · P1 · Final selective-context plan loads the wrong role skill for its selected work

Expected: the selective-context contract allows common `karpathy-guidelines` and `unlazy` plus at most one role skill required by the current work type. Unrelated skills are default-denied. The final snapshot selects A5 Release Audit work and must therefore load the Release Audit role skill, or omit the role skill until the audited role context is bound.

Actual: the deterministic canary output selects `work-a5-release-audit` but its `loaded_sources` contains `skill:mango-implementation-engineer`. The same output claims `unrelated_skills` in `excluded_source_classes`. The only role-specific skill recorded is therefore an implementation skill for a Release Audit work item, while the declared exclusion contradicts the actual load plan.

Impact: Contract/Map/Gate byte coherence and fail-closed behavior are corrected, but the content-addressed final bootstrap still does not provide a semantically coherent minimal context for the selected A5 role. A Release Audit cannot promote A5 while the candidate's own deterministic context plan violates the selective-context contract and misbinds role expertise.

Required correction owner: Builder. Replace the role-skill source with the exact Release Audit role skill required by A5, or omit role-skill loading until role binding supplies it. Add a deterministic assertion tying selected work type/authority to the permitted role-skill source and proving unrelated role skills are absent. Preserve this failed re-audit and all earlier evidence; another fresh Release Audit is required.

## Independently reproduced passing evidence

- Focused Model v2/bootstrap/package/control-plane matrix: `113/113` PASS; failures/skips/cancellations/todos `0/0/0/0`.
- Full frontend: `99/99` PASS across `7/7` files.
- Account/projection: `48/48` PASS.
- Full server: `392/392` PASS; failures/skips/cancellations/todos `0/0/0/0`.
- Production build: PASS; `1,654` modules transformed.
- Built browser: PASS for account-only/legacy convergence `6/6`, three viewports across eight non-ready states plus loading and ready states, 200% equivalent reflow, horizontal overflow `0`, minimum controls `44px`, project switching preserved, anonymous project payload requests `0`.
- Default Model v2 and explicit byte/object-compatible v1 rollback, privacy/redaction, seven readiness/failure states, observed-only conversation, timestamp normalization, normalized duplicate rejection, hostile accessor/Proxy behavior, account isolation and read-only authority remain green.

Green product behavior does not override F1 because A5 also requires a correct content-addressed selective-context plan.

## Required Release Audit payload

- `commit_pin`: exact corrected commit/carrier and underlying product pin above.
- `test_matrix`: two deterministic canaries, two fail-closed probes, focused `113/113`, frontend `99/99`, account/projection `48/48`, server `392/392`, production build and built browser.
- `regressions`: prior evidence-source F1 closed; new P1 role-skill/context semantic mismatch found.
- `accessibility`: responsive/reflow browser checks, reduced-motion coverage, semantic projection ordering, privacy text and `44px` controls remain green.
- `runtime_evidence`: local disposable verification only; no persistent runtime/environment state changed.
- `release_scope`: A5 evidence promotion remains closed; no activation, C1/Cherry acceptance, deployment, Production, release or Phase authority.
- `quality_score`: `4/5`; immutable bytes, fail-closed behavior, regressions and authority boundaries pass, but selective-context role coherence fails.
- `residual_unknowns`: correct A5 role-skill binding in the deterministic final bootstrap remains unproved.
- `verdict`: `FAIL_RELEASE_AUDIT_ONLY`.

## Rollback, residue and counters

- Rollback: revert only this report carrier to its exact parent; no product/runtime rollback executed or required.
- Report files / carrier commits: `1/1`.
- Clean canary executions: `2`; drift/missing fail-closed probes: `1/1`.
- Product, test, Gate, Contract, Model, Map, registry, provider, credential, data, runtime, environment, deploy, Production, release, acceptance, push and external mutation: `0`.
- Disposable dependency links / build outputs created and removed: `1/1` each.
- Browser/server persistent residue: `0`.
- Automatic resend/replay: `0`.
- Automatic retry: `0`.
- `false_completion_count`: `0`.

## Remaining authority

This FAIL keeps A5 evidence promotion closed. It is not A5 promotion, Model v2 service activation, C1/Cherry acceptance, deployment, Production, release or Phase transition.
