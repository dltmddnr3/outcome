# OUTCOME Model v2 B2 UI P0 correction · fresh independent re-QA receipt

Status: `FAIL_UX_PRODUCT_QA_ONLY`

This receipt records a fresh, isolated, read-only re-QA of the exact P0 correction candidate. It does not amend the candidate or Gate, promote B2, authorize Audit, deployment or release, imply Cherry acceptance, close Q2, or advance the Phase.

## Immutable envelope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B2`
- QA handoff SHA-256: `b15136a0c23e611d09401dc15bf313265fcdf6ca7e332fda9a089eff41a00326`
- Failed QA carrier: `7060c7e39f6de1e3ee804b7d88cd479498e9b644`
- Correction product commit/tree/parent: `47f3bc3109dac9562866269e515511ea4bd0501d` / `69fee207cdce03d578527d31b07b7ada7f3b622a` / `7060c7e39f6de1e3ee804b7d88cd479498e9b644`
- Builder receipt carrier/tree/parent: `51d3b64047f398e09f11eb8a8a752d2851cd11d7` / `f29f288efaf05e7477b5323a4d7cf15c61d976f3` / `47f3bc3109dac9562866269e515511ea4bd0501d`
- Builder receipt SHA-256: `9950514dac19a91d9af3755cbc7139e19762bc3a360d5e519c0dfa31de0d12ed`
- Correction scope reproduced: `AccountWorkspace.tsx`, `OutcomeDashboard.tsx`, and `AccountWorkspace.test.tsx` only.

All commit, tree, parent, handoff and receipt identities were reproduced before execution. The isolated worktree used only a task-owned link to existing dependencies; no install or fetch occurred.

## Blocking finding

### F1 · P0 · Exact authenticated Model v2 route remains blank

Expected: the actual `createAccountAccessService().readWorkspace()` result must render the built `/workspace` after owner authentication even though its project rows contain only `{ project, modelV2 }` and do not contain legacy `current`, `phases`, or a synthetic `dashboard`.

Actual: desktop `1440x900` and mobile `390x844` both reproduced the prior P0 on the exact correction carrier. The injected owner login returned `200`, set the private session cookie, and `/api/private/workspace` returned `200`. Within about `2.65s`, both viewports had body length `0`, root length `0`, Current Projection count `0`, and one page error: `Cannot read properties of undefined (reading 'phaseId')`.

Root cause: the correction moves the `workspace.dashboard` branch before the legacy hierarchy dereference, but the real account service output has no `dashboard`. The non-dashboard path still calls `initialSelection(project)` and reads `project.current.phaseId`, then reads `project.phases`. The added component test supplies a synthetic dashboard and therefore does not exercise the actual service envelope that failed QA.

Impact: v2-only current hierarchy, project switching, compatibility truthfulness, desktop/mobile geometry, focus, reduced motion and leakage checks cannot be accepted on the real authenticated surface. Static or synthetic-dashboard rendering cannot override a blank production route.

Correction owner: Builder. Add an end-to-end test that passes the unmodified result of `createAccountAccessService().readWorkspace()` through the actual built app. The non-dashboard Model v2 path must not evaluate absent legacy hierarchy, and it must render truthful compatibility absence without synthesizing phase/scope/stage.

## Independent execution evidence

- Focused Current Projection, Outcome Dashboard and Account Workspace: `74/74 PASS` across `3/3` files.
- Full tracked frontend: `95/95 PASS` across `6/6` files.
- Account authorization/isolation Node suite: `33/33 PASS`.
- Account frontend suite: `31/31 PASS` across `3/3` files.
- Production build: PASS, `1,653` modules transformed, exit `0`, Vite build `782ms`.
- Built authenticated route: FAIL on both required viewports as described above.
- The expected anonymous pre-auth request returned `401` before synthetic authentication; no private marker appeared.
- Post-auth unexpected console resource errors beyond the expected initial anonymous `401`: `0`; page runtime errors: `1` per viewport; error overlays: `0`.
- Private locator/secret/registry marker hits in rendered text: `0`, but the rendered root was blank after the runtime failure.
- Mobile 44px, overflow/overlap, label wrapping, keyboard focus and reduced-motion acceptance: unmet because the actual authenticated composition never rendered.
- Legacy v1 regression suites remain green, but they do not close the v2-only route defect.

## Live boundary and counters

The live registry was read only. UX & Product QA remained uniquely active `29/29`, exact self-match `1`, registry revision `102`, doctor clean, issues `0`, lock clear.

- `false_completion_count`: `0`
- live/external `mutation_count`: `0`
- `automatic_retry_count`: `0`
- `residue_count`: `0` after server, browser, screenshots, build output, dependency link and disposable worktree cleanup
- `identifiers_shared`: `0`

## Verdict

`FAIL_UX_PRODUCT_QA_ONLY`

B2 promotion remains closed. A new immutable Builder correction and another fresh independent QA are required. This verdict is not Release Audit, deployment, release, Cherry acceptance, Q2 closure or Phase transition.
