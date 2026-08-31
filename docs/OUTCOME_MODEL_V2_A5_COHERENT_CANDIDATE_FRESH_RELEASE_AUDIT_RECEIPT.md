# OUTCOME Model v2 A5 coherent candidate — fresh Release Audit receipt

Verdict: **FAIL_RELEASE_AUDIT_ONLY**

## Protected preflight and immutable subject

- Project / role: `outcome` / `release_audit`.
- Protected registry preflight used the private schema field `locator_ref` without retaining or printing its value: exact self-match `1`, active count `1`, active self-match `1`, app inventory match `1`, doctor clean, issues `0`, lock clear.
- Audit handoff SHA-256: `709749172a2a72d07f7c392015badf193ccf9a9ef29164f4896d63e131ded5cb`.
- Q2 Gate promotion/tree/parent: `39c0e514222ea0f02b521ac852648549691b259e` / `594d84043af4121db87fa76381a245b724849148` / `a2e61c5c9d5e76a530302bbd57fec54a64264775`.
- Audited Q2 receipt carrier/tree/parent: `7b25b801da4e971a837b302f0ffff02d0e2d64fc` / `44c46559adf1a3868277a12201485f8df515ad55` / `39c0e514222ea0f02b521ac852648549691b259e`.
- Q2 promotion receipt SHA-256: `75cae693bad35f8a7791941eefbd008605162073ee817fa3c7632d73c8b98dfb`.
- Final product/test candidate: `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`.
- Final Builder receipt carrier / SHA-256: `4d4c19c79e1815e174caa9a64b663648f43ccdc5` / `80a01e7597941d21b281da26b711005421831670ff4668ce80d2e6302a90acad`.
- Final fresh QA PASS carrier / SHA-256: `a2e61c5c9d5e76a530302bbd57fec54a64264775` / `41f80e48b9475f59fabb636768470f87bf9d49cef22544e8b26f558fa0c0e8a3`.
- Slice A through Q2 ancestry links: `9/9` exact and linear. The final Slice A/B/Q2 delta contains only the expected product, tests, Gate and evidence receipts.

Prior PASS and promotion documents were treated as claims and re-pinned from repository objects before execution.

## Blocking finding

### F1 · P1 · The final carrier has no reproducible source-addressed coherent local canary

Expected: A5 must prove one coherent candidate with no evidence/candidate/source drift across A1-A4/Q1/B1-B3/Q2. The exact receipt-carrier checkout must reproduce the selective-context local-default evidence or fail closed with a content-addressed final-candidate snapshot.

Actual:

1. `scripts/outcome-model-v2-local-canary.mjs` cannot execute from the exact audited carrier. Its one Audit invocation terminated on missing `AGENTS.md`; the slice contract is also absent from the carrier tree.
2. The canary remains hard-pinned to historical Q1 source revision `c8728dcacf36c93ad0933e5de95b8c917074ee26`, not the final product or Q2 receipt carrier.
3. The canary pins Contract/Map/Gate digests from the historical Q1 canonical working root:
   - Contract claimed / carrier: `36860ad7e0103170c6f1be3eaa25a221b873ccf1b46b668f0d684c385412851f` / `c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442`.
   - Map claimed / carrier: `10bfe76927a044f87612666b1976ff34b145bd8f5b471dff676f32716396bc94` / `da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3`.
   - Frozen Q1 Gate claimed / final promoted Gate: `098c48bef05b2219b68acd2c308309b04bd91ca82a1eeb7ba80552a7caca7b0d` / `659fb65fafce7403a89b126ae91c9ef81aa6ce73a293b9f9244b9dd5a93ad1c5`.
4. The external slice-contract bytes still match the historical pinned digest `b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657`, but the file has no immutable carrier object in the audited chain. Supplying external working-root files would not repair the Contract/Map/Gate mismatch and was not used to manufacture a PASS.

Impact: local-default behavior is well tested, and every observed drift boundary fails closed, but the evidence chain does not provide one reproducible final-candidate compact snapshot/canary. A5 cannot establish the required coherent candidate identity or selective-context source set from the exact carrier. This is evidence/source coherence failure, not proof of a product runtime defect.

Required correction owner: Builder/Planner evidence promotion boundary. Create a final-candidate content-addressed bootstrap/canary whose complete source set is available from immutable objects, pins the final candidate/Gate inputs, and returns deterministic final A5-ready projection evidence. Preserve the historical Q1 canary and all failed/pass receipts; do not rewrite them. Fresh Release Audit is required after correction and promotion.

## Independent passing evidence

### Model, selective-context, rollback and conversation

- Focused Model v2/bootstrap/package/control-plane/API matrix: `130/130` PASS; failures/skips/cancellations/todos `0/0/0/0`.
- Exact default semantics passed: unset configuration returns Model v2; explicit `0` returns the exact v1 object and serialized bytes; invalid values fail closed.
- Selective-context unit coverage rejects historical Gates, raw conversations, unrelated skills, hostile accessors/Proxies and source drift; trap executions and automatic retries are `0`.
- Planner conversation accepts only exact observed four-field events; terminal, delivery-unknown and blocked states remain non-running/non-completed; normalized duplicates fail closed and timestamps normalize/sort by epoch.

### Privacy, auth, isolation and hostile behavior

- Account plus server projection matrix: `48/48` PASS, including authorization, signed-out/wrong-owner/expired/revoked denial, cross-workspace isolation, seven distinct states, event privacy, duplicate/timestamp handling and hostile accessor/Proxy rejection.
- Full server matrix: `392/392` PASS; failures/skips/cancellations/todos `0/0/0/0`.
- Built asset scan found `0` occurrences for the hostile milestone slug, raw action slug, private registry field, raw prompt/result classes, private runtime substring, absolute user path and task/thread/session/turn identifier classes.
- Server-owned labels omit slug-like, digest, numeric, malformed and private titles without inventing replacements.

### Frontend, build, browser and accessibility

- Full frontend: `99/99` PASS across `7/7` files.
- Production build: PASS; `1,654` modules transformed.
- Exact built-browser script: PASS for account-only/legacy convergence `6/6`, three non-ready viewports plus loading and three ready viewports including `1440x900`, `390x844` and `320x720`; anonymous project payload requests `0`.
- Ready/non-ready horizontal overflow `0`; 200% mobile/reflow overflow `0`; hostile slug API/markup/visible/accessibility survival `0`; browser/runtime errors `0`; reduced-motion animations `0`; minimum required controls `44px`; project switching and read-only authority preserved.

These green checks do not override F1 because passing behavior cannot manufacture a missing final coherent source/evidence identity.

## Required release-audit payload

- `commit_pin`: exact Gate, receipt, product, Builder and QA pins above; lineage `9/9`.
- `test_matrix`: focused `130/130`, frontend `99/99`, account/projection `48/48`, full server `392/392`, production build, built-browser and built-asset privacy scan.
- `regressions`: no runtime/product regression reproduced; one blocking evidence-source coherence regression F1.
- `accessibility`: DOM/source Projection-first semantics, responsive visual order, reduced motion, `44px` controls, overflow and accessibility-text privacy passed in the exact built browser.
- `runtime_evidence`: static/local disposable execution only; no persistent runtime or environment state was changed.
- `release_scope`: A5 evidence remains closed. No C1/Cherry acceptance, deployment, Production, release or Phase authority.
- `quality_score`: `4/5`; behavior, privacy, regression and authority boundaries pass, but immutable coherent-candidate reproducibility fails.
- `residual_unknowns`: final-candidate compact snapshot/source manifest and deterministic real-work canary remain unproved.
- `verdict`: `FAIL_RELEASE_AUDIT_ONLY`.

## Rollback, residue and counters

- Rollback: revert only this report carrier to its exact parent. No product/runtime rollback was executed or required.
- Audit report files / carrier commits: `1/1`.
- Product, test, Gate, Contract, Model, Map, registry, provider, credential, data, environment, deployment, Production, release, acceptance, push and external mutation: `0`.
- Disposable dependency links / build outputs created and removed: `1/1` each.
- Browser/server persistent residue: `0`.
- Automatic resend/replay: `0`.
- Automatic retry: `0`.
- Canary Audit invocations: `1`; successful final-carrier canaries: `0`.
- Diagnostic command correction count: `1`; it changed no evidence or candidate state.
- `false_completion_count`: `0`.

## Remaining authority

This FAIL keeps A5 evidence promotion closed. It is not A5 promotion, C1/Cherry acceptance, deployment, Production, release or Phase transition. Only a corrected immutable final-candidate evidence carrier followed by another fresh Release Audit can reopen A5 promotion consideration.
