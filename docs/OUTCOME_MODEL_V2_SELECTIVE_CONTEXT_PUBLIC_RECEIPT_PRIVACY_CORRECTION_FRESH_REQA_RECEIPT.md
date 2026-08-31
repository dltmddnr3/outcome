# OUTCOME Model v2 selective-context public receipt privacy correction · fresh re-QA

Status: `FAIL_UX_PRODUCT_QA_ONLY`

## Immutable envelope

- Handoff SHA-256: `2fa7737a1130d37ad09cec21156cfa014182c71915aa61490a2755bd3a0b4623`
- Correction commit/tree/parent: `02a7a66b64ff759da1082d111daa5082794f32e0` / `12b0e0736f1b87fd2672c9d960363c619a11af2a` / `78f089fbd9fd32b1b00bde43dd354e21a1d2ff0f`
- Builder receipt carrier/tree/parent: `881a91afe94291ce36e32c47e91d08f3794a83e3` / `d7517b971beda2cbf0cd77590aa568be6ed2a13b` / `02a7a66b64ff759da1082d111daa5082794f32e0`
- Builder receipt SHA-256: `bd802838214b189aac441fba9812bc8b5f1a941361cc64f6aad972922475d0a6`

Protected preflight: active/self/app match `1/1/1`, version/history `29/29`, registry revision `103`, doctor clean, issues `0`, lock clear; private `locator_ref` was not output.

## P1 finding

`consumeOutcomeSelectiveContextPlan` trusts any caller-supplied object with `schema_version:2`, `authority:projection_only` and `outcome:ready`. A forged plan carrying a synthetic private thread source ref invoked the capable adapter callback once before `contextReceipt` rejected the ref. Actual: callback `1`, receipt `0`, terminal `invalid_context_source_ref`. Expected: forged shape/digest/private content rejected before callback, callback `0`.

Impact: compile-time positive grammar can be bypassed at the exported consume boundary, so unverified content may reach the adapter despite public serialization later failing. Builder must validate exact plan shape, recompute/compare `plan_digest`, validate all source rows and safety fields before callback, with hostile direct-consume tests.

## Passing evidence

- Original compile-path thread/locator/provider leaks are closed; positive grammar and projected finite receipt classes pass.
- Focused Model v2 `17/17`, full server `396/396`, frontend `99/99`, browser assertions `22/22`, production build `1,654` modules PASS (`734ms`).
- Default v2, exact v1 rollback, role/no-role manifests and finite negative controls remain green.
- Stable-host gap remains pre-existing/outside the four-path candidate scope and was not repaired or waived.

## Boundaries

- Automatic resend/replay/retry, real dispatch/session replacement, execution, duplicate execution, false completion and all product/Gate/registry/runtime/environment/provider/deploy/release/acceptance/push/external mutation: `0`.
- Real identifiers shared: `0`; hostile value synthetic.
- Rollback: return from `02a7a66b64ff759da1082d111daa5082794f32e0` to `78f089fbd9fd32b1b00bde43dd354e21a1d2ff0f`; explicit compatibility rollback remains `OUTCOME_MODEL_V2_ENABLED=0`.
- Residue: `0` after dependency/build/worktree cleanup.
- Operational role-canary planning remains closed. This is not activation, Audit, acceptance, deployment or release.

`FAIL_UX_PRODUCT_QA_ONLY`
