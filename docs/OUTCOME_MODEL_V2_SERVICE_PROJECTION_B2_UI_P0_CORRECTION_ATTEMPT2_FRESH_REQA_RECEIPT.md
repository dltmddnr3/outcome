# OUTCOME Model v2 B2 UI P0 correction attempt 2 · fresh independent re-QA receipt

Status: `PASS_UX_PRODUCT_QA_ONLY`

This receipt records a fresh, isolated, read-only re-QA of the exact attempt 2 candidate. It does not amend the candidate or Gate, promote B2, authorize Audit, deployment or release, imply Cherry acceptance, close Q2, or advance the Phase.

## Immutable envelope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B2`
- Original QA handoff SHA-256: `b15136a0c23e611d09401dc15bf313265fcdf6ca7e332fda9a089eff41a00326`
- Prior FAIL receipt: `36750b1e9a525aafead84dea8be97dc138c1801c`
- Corrected product commit/tree/parent: `84d9739965a2a8211b703d7ffd6cc6f085678b94` / `ef25337fde110722270bcbba236fbc72279b7096` / `36750b1e9a525aafead84dea8be97dc138c1801c`
- Builder receipt carrier/tree/parent: `0752123c88402136c46f1d0b70afda91664a1b50` / `c8cb04e6d3ca41c578c2e6839731ab0036ff564f` / `84d9739965a2a8211b703d7ffd6cc6f085678b94`
- Builder receipt SHA-256: `ef2955e7bcb1b162c38d104f78cd174a956a5c3d0de51ddb1e45af0a82a9e4fc`
- Correction scope reproduced: `AccountWorkspace.tsx`, `OutcomeDashboard.tsx`, and `AccountWorkspace.test.tsx` only.

All commit, tree, parent, handoff and receipt identities were reproduced before execution. The isolated worktree used a task-owned link to existing dependencies; no install, fetch or network mutation occurred.

## Exact P0 closure

The built app was served by `createOutcomeServer` with the unmodified result of `createAccountAccessService().readWorkspace()`: two server-authorized rows whose exact product shape is `{ project, modelV2 }`, with no dashboard, current or phases.

Desktop `1440x900` and mobile `390x844` both passed synthetic owner authentication and received `/api/private/workspace` `200`. In both viewports:

- body and root were nonzero;
- exactly one Current Projection was visible;
- `phaseId` TypeError, blank root and error overlay counts were `0`;
- page errors and unexpected post-auth console errors were `0`;
- primary field order was Destination → gap → Now → next boundary;
- completion authority remained false and private marker hits were `0`.

The prior P0 is therefore directly closed on the actual service envelope, not inferred from a synthetic dashboard component case.

## Authorization and compatibility hostility

A hostile public dashboard response containing a third unmatched project, `HOSTILE PUBLIC`, was injected after private authentication. The rendered private switcher contained exactly `cherry-note` and `outcome`; the hostile project was absent from text, controls and selection. Project switching changed the authoritative root `data-project-id` from `outcome` to `cherry-note` and retained one Current Projection.

When the public v1 dashboard was available for the authorized projects, v1 hierarchy and technical evidence remained in a collapsed semantic disclosure. When `/api/dashboard` returned a synthetic unavailable response, the private Model v2 shell remained interactive and the collapsed disclosure truthfully said `v1 호환 정보 없음`; no phase, scope or stage was synthesized. Legacy v1 suites remained green.

## Chromium geometry and accessibility

- Desktop/mobile steady-state horizontal overflow: `0px`.
- Current Projection / compatibility overlap: `0px²`.
- Projection label overflow: `0`.
- Minimum visible focusable control height: `44px`; undersized controls: `0`.
- Mobile project search height: `44px`.
- Keyboard focus indicator: `2px` lime outline with visible border.
- Reduced-motion running animations: `0`.
- Desktop/mobile landmarks: main `1`, aside `1`, nav `3`.
- Private IDs rendered: exactly `cherry-note`, `outcome`.
- Secret, private locator, raw prompt/result, registry payload and fabricated B3 activity hits: `0`.

One immediate measurement taken in the same frame as mobile project-switch close observed a transient `4px` document width delta. After the navigation transition settled, both open and closed states remeasured at `0px` with no offending element. The terminal geometry claim uses the settled interactive state.

## Independent suites

- Focused Current Projection, Outcome Dashboard and Account Workspace: `75/75 PASS` across `3/3` files.
- Full tracked frontend: `96/96 PASS` across `6/6` files.
- Dashboard frontend: `93/93 PASS` across `5/5` files.
- Account authorization/isolation Node suite: `33/33 PASS`.
- Account frontend suite: `32/32 PASS` across `3/3` files.
- Production build: PASS, `1,653` modules transformed, exit `0`.
- Logout API: `200` in `0.001s`; unit regressions cover visible transition behavior. A browser click diagnostic initially targeted the closed off-canvas sidebar control and was discarded as a harness targeting error, not product evidence.

Two successful local build invocations occurred because the QA orchestration issued one redundant verification after the first successful build. Both were byte-source-identical and successful; this caused no source, registry, runtime, provider or external mutation. `automatic_retry_count` remains `0`; redundant local build verification count is `1` and is disclosed rather than hidden.

## Live boundary and counters

The live registry was read only. UX & Product QA remained uniquely active `29/29`, exact self-match `1`, registry revision `102`, doctor clean, issues `0`, lock clear.

- `false_completion_count`: `0`
- live/external `mutation_count`: `0`
- `automatic_retry_count`: `0`
- `residue_count`: `0` after server, browser, screenshots, build output, dependency link and disposable worktree cleanup
- `identifiers_shared`: `0`

## Verdict

`PASS_UX_PRODUCT_QA_ONLY`

This PASS opens only the separately controlled B2 evidence-promotion decision. It is not B2 promotion, Release Audit, deployment, release, Cherry acceptance, Q2 closure or Phase transition.
