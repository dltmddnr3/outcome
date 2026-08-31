# OUTCOME Model v2 B2 workspace UI · fresh UX & Product QA receipt

Status: `FAIL_UX_PRODUCT_QA_ONLY`

This receipt records a fresh, isolated QA of the exact B2 UI candidate. It does not amend the candidate or Gate, promote B2, implement B3, close Q2, authorize Audit, deploy, release, imply Cherry acceptance, or advance the Phase.

## Immutable envelope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B2`
- QA handoff SHA-256: `b15136a0c23e611d09401dc15bf313265fcdf6ca7e332fda9a089eff41a00326`
- Corrected product commit/tree/parent: `4e9edaa65467490ff2785d30cdc9046c117d4faf` / `1c6f0fdb5f6d76fbec9e4d522cf8929f7e80293f` / `9d1e99d0b11986fbd2a867f21759a9980283fd23`
- Builder receipt carrier/tree/parent: `6938e2f9b0ee0ca849846e421795deade651de77` / `823a6bfeb6f828e2bba6aacb91ba3b807490da66` / `4e9edaa65467490ff2785d30cdc9046c117d4faf`
- Builder receipt SHA-256: `2c0fdcca22cc7386b71413ca012a38e1e43c71ab3d1efc0ac36729d19716c75b`
- Isolated QA base: exact detached Builder receipt carrier with a task-owned dependency symlink; no install or fetch.

All pin, tree, parent, handoff, receipt and one-path mobile correction identities reproduced before testing. The corrected product changes only `src/styles.css` from the initial B2 checkpoint; the full B2 implementation remains the six authorized product paths inherited from `9d1e99d...`.

## Blocking finding

### F1 · P0 · Authenticated real workspace becomes blank with the actual server projection

Expected: after synthetic owner authentication, the real local `/workspace` route must become meaningfully interactive and render the server-owned Current Projection without requiring v1 hierarchy fields. The B2 contract explicitly allows the Model v2 projection to be primary and forbids calculating a replacement from v1.

Actual: the production build completed and the exact built route loaded. Google synthetic authentication returned `200`, set the private session cookie, and the subsequent `/api/private/workspace` returned `200`. React then threw `TypeError: Cannot read properties of undefined (reading 'phaseId')`; `#root` became empty and no `.current-projection` appeared within five seconds. The actual account service returns each authorized project as `{ project, modelV2 }`, while `AccountWorkspace` unconditionally evaluates `project.current.phaseId` and `project.phases` before rendering `CurrentProjection`.

Independent reproduction:

1. Build the exact carrier once with the existing local dependencies.
2. Serve the built bytes with `createOutcomeServer`, an in-memory approved owner store, and a synthetic private transition adapter.
3. Open `/workspace` in system Chrome, select `Google로 계속`, and observe private auth and workspace API `200` responses.
4. Observe the `phaseId` TypeError, blank `#root`, and absent Current Projection.

Impact: the primary authenticated user journey is unusable. Destination, gap, Now, next boundary, project switch, v1 disclosure, technical disclosure, mobile target geometry, focus order and privacy markup cannot be accepted on the actual route. Static component geometry cannot override this runtime failure.

Correction owner: Builder. Make `AccountWorkspace` consume the actual minimal server projection without dereferencing absent v1 hierarchy, or change the server contract and validation so the exact required compatibility fields are always present. Add an end-to-end test that feeds the real `createAccountAccessService().readWorkspace()` result into the tracked app and asserts a nonblank interactive Current Projection at desktop and mobile.

## Additional runtime evidence

- Fresh Vite reported ready in `84ms`, but the first `/workspace` request returned zero bytes within a five-second HTTP bound and the Chromium measurement did not terminate within 30 seconds. This independently reproduced the handoff's dev-route blocker direction; no automatic retry loop was used.
- Exact production build: PASS, `1,653` modules transformed, exit `0`, built in `2.48s`.
- The built unauthenticated route failed closed to the login surface and leaked no private project data before authentication.
- After authentication, the definitive built-route failure above reproduced independently with API success followed by a client runtime exception.

## Passing bounded checks

- Focused Current Projection plus Account Workspace: `14/14 PASS` across `2/2` files.
- Current tracked component suite: `91/91 PASS` across `5/5` files. The Builder's `94/94` across `6/6` files did not reproduce on this carrier and is not used.
- Account authorization/isolation Node suite: `33/33 PASS`.
- Account frontend suite: `30/30 PASS` across `3/3` files.
- Seven Model v2 states remain distinct in component tests; session activity is not rendered as progress.
- Hostile event, private locator, raw prompt/result and extra-field component assertions pass; completion authority remains false.
- The one-line CSS correction adds `min-height:44px` to the mobile project search input, but actual-route geometry acceptance remains unmet because F1 prevents the authenticated product composition from rendering.

## Live and residue boundary

The live registry was read only. The QA binding remained uniquely active `29/29` with exact self-match `1`, doctor clean and lock clear. Global registry revision was `102`, an external drift from the earlier activation readback; this QA made no registry mutation and does not attribute that revision change. No runtime/provider/external/deploy/push/release/acceptance mutation occurred.

- `false_completion_count`: `0`
- live/external `mutation_count`: `0`
- `automatic_retry_count`: `0`
- `residue_count`: `0` after browser, servers, build output, dependency link and disposable worktree cleanup
- `identifiers_shared`: `0`

## Verdict

`FAIL_UX_PRODUCT_QA_ONLY`

B2 evidence promotion remains closed. The candidate requires Builder correction and a new immutable candidate followed by fresh independent QA. This verdict is not Release Audit, deployment, release, Cherry acceptance, Q2 closure or Phase transition.
