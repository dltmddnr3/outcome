# OUTCOME Model v2 Q2 semantic correction · fresh independent re-QA receipt

Status: `FAIL_UX_PRODUCT_QA_ONLY`

This is one fresh, isolated, read-only report-only carrier. It does not modify product/Gate/registry/runtime/provider/external state, promote Q2, perform Release Audit, close A5/C1, imply Cherry acceptance, deploy or release.

## Immutable envelope and continuity

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `Q2`
- Handoff SHA-256: `66cec9af47bf955a72faca777eed13545d55515b9c78ee951b7ceb4250b9945a`
- Failed-QA carrier/tree/parent: `12f8538baf16cbadb9ec1ef9df366169d01b1c99` / `959bde692532bd19de6add15dc6a0625afd1f80c` / `dd94e889ae1fedfd63fc5bb67c698b697cea7db9`
- Failed-QA report SHA-256: `f02d7a85fae82e10207c00e6439013cb1fe1967437ea9bdd424bd5b1b32b1606`
- Product/test candidate/tree/parent: `6797df2906189b1fcaa2eac2e35ae7bb9f73056f` / `c676ed0c95aa29b9b549e1d180f53099d3afaaf2` / `12f8538baf16cbadb9ec1ef9df366169d01b1c99`
- Builder receipt carrier/tree/parent: `6962be82952c84cceff6ea2aa959f6bae1b2bc5d` / `8d8f547f044c021c4492a08aaa58fc517cd03389` / `6797df2906189b1fcaa2eac2e35ae7bb9f73056f`
- Builder receipt SHA-256: `e9943b73bf89f9d7963cbd2d1a6d850ec33c7a13ce6ebb6eb41d1926695a0952`

Protected preflight used the registry schema's private `locator_ref` without printing it: active `outcome / ux_product_qa` count `1`, exact self-match `1`, version/history `29/29`, registry revision `103`, doctor clean, issues `0`, lock clear. The app inventory correction supplied by the protected Planner readback resolved this task exactly once; the calling-task inventory endpoint did not re-list the current task. Canonical dirty state was preserved.

## RED-before-GREEN

The exact failed candidate independently reproduced a raw ready-boundary identifier: `readyBoundary` contained the milestone id rather than its title, and source order placed conversation before Current Projection.

The correction closed the two original ordinary-fixture failures:

- closed server-owned Korean labels are emitted for approved next/Cherry action codes;
- unknown/unapproved action codes return `null` and render no action surface;
- Current Projection precedes conversation in DOM, screen-reader and keyboard/source order;
- desktop remains conversation-left/projection-right; mobile remains Projection-first.

However, a fresh hostile display-label case remains open as F1.

## Blocking finding

### F1 · P1 · Raw milestone slug survives through the new display-label field and built markup

Expected: user-visible milestone, next action and Cherry action are human-readable server-owned labels; no internal slug or raw canonical identifier appears in API display fields, accessibility text or markup.

Actual: a schema-valid milestone with id `milestone-one` and title `q2-independent-qa` projected as `readyBoundaryLabels: ["q2-independent-qa"]`. `safeText` accepts the raw slug and the UI renders the display field verbatim. A production-build browser probe confirmed markup survival `1`. At `390x844` this hostile label also produced horizontal overflow `4px`.

Impact: the correction moves the trust boundary from milestone id to milestone title without proving that the title is human-readable. A malformed, migrated or unapproved canonical title can still expose the exact technical slug and prevent five-question comprehension, contrary to terminal contract items 1 and 5.

Correction owner: Builder. Apply a server-owned public-label contract to milestone titles (or use an approved id-to-label table), reject/omit slug-like and private values before API projection, and add API plus built-markup hostile tests. Do not infer copy client-side.

## Passing evidence

- Focused Current Projection plus Account Workspace: `16/16 PASS` across `2/2` files.
- Full tracked frontend: `99/99 PASS` across `7/7` files.
- Account plus projection Node: `47/47 PASS`, including projection `14/14` and account `33/33`.
- Production build: PASS; TypeScript plus Vite, `1,654` modules transformed, exit `0`, built in `746ms`.
- Existing built browser suite: PASS for account-only/legacy convergence `6/6`, three ready viewports, eight non-ready account states, authentication/logout, two-project switching, project isolation, reduced motion, required `44px` controls and its approved-fixture overflow checks.
- Closed next/Cherry labels and unknown omission passed; seven projection states remain distinct and non-running unless an exact observed active event exists.
- Event/root hostile accessors, Proxies, symbols, non-enumerable descriptors, cycles, unexpected keys, hashes, local paths, credentials, raw prompt/result and registry/provider payloads remained fail-closed with trap execution `0`.
- DOM/source order and mobile visual order passed in the independent hostile built probe; synthetic composer/stream/tool/progress/completion controls remain absent.

## Counters, rollback and authority

- `automatic_resend_replay_count`: `0`
- `automatic_retry_count`: `0`
- `product_retry_count`: `0`
- `qa_harness_invalid_attempt_count`: `1` (the first hostile browser assertion stopped on the newly observed overflow before the assertion was converted to observation-only)
- product/Gate/registry/runtime/provider/deploy/release/acceptance/external `mutation_count`: `0`
- `identifiers_shared`: `0` real identifiers; hostile values were synthetic
- `browser_error_count`: `0`
- `runtime_error_count`: `0`
- `residue_count`: `0` after build output, dependency link, QA scripts, browser process/profile and both disposable worktrees are removed
- rollback: revert product candidate `6797df2906189b1fcaa2eac2e35ae7bb9f73056f` to exact parent `12f8538baf16cbadb9ec1ef9df366169d01b1c99`; no external rollback is required
- remaining authority: Q2 promotion, Release Audit, A5/C1, Cherry acceptance, deployment, Production, release and Phase transition remain separate and unopened

## Verdict

`FAIL_UX_PRODUCT_QA_ONLY`

Q2 evidence promotion remains closed. A corrected immutable candidate and another fresh independent QA are required.
