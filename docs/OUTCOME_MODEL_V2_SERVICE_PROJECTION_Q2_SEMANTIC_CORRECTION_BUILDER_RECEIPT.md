# OUTCOME Model v2 Q2 semantic/read-order correction · Builder receipt

Status: `Q2_CORRECTION_CANDIDATE_READY_BUILDER_ONLY`

This receipt records one Builder correction candidate. It does not check Q2, perform UX & Product QA or Release Audit, imply Cherry acceptance, authorize deployment or release, close A5/C1, or advance the Phase.

## Immutable envelope

- Gate / predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `Q2` (still unchecked)
- Failed-QA carrier / tree / parent: `12f8538baf16cbadb9ec1ef9df366169d01b1c99` / `959bde692532bd19de6add15dc6a0625afd1f80c` / `dd94e889ae1fedfd63fc5bb67c698b697cea7db9`
- Failed-QA report SHA-256: `f02d7a85fae82e10207c00e6439013cb1fe1967437ea9bdd424bd5b1b32b1606`
- Continuity checkpoint SHA-256: `6efaa1a7c2655fe277f69b94e15b66903e46a7a67e1be4e3591c02e20aa59e3e`
- Product/test candidate / tree / parent: `6797df2906189b1fcaa2eac2e35ae7bb9f73056f` / `c676ed0c95aa29b9b549e1d180f53099d3afaaf2` / `12f8538baf16cbadb9ec1ef9df366169d01b1c99`
- Isolated worktree began detached at the exact failed-QA carrier. Canonical root dirty fingerprint remained `a3f97e60bdf9749ec577e80d2af7ddf3693ee0da6cea2b64c677d5ed726b15d7`.

## Protected Builder binding

- Exactly one corrected-adapter replacement ran from adapter commit `5ccf49791576130edf2f52882594a8d64884d3d9`.
- Readback: `outcome / builder`, alias `builder-v2-q2-v21`, active version/history `16/16`, exact self-match `1`; predecessor version `15` is `replaced` and recoverable, not archived.
- Registry doctor is clean at revision `103`, issues `0`, lock clear. Registry mutation count `1`; automatic retry/replay `0`.

## Changed scope

- Server projection now emits canonical milestone titles as `readyBoundaryLabels`, closed server-owned Korean labels for finite next/Cherry actions, and `null` for unknown or unavailable action labels.
- The client contract contains label fields only and performs no slug-to-copy conversion or canonical inference.
- Current Projection precedes observed Planner conversation in DOM, screen-reader and keyboard order. CSS keeps conversation-left / projection-right on desktop and Projection-first on mobile.
- Browser checks cover semantic and visual order, raw slug absence, 1440/390/320 layouts, 200% equivalent reflow, overflow, reduced motion, project switching, authentication boundaries and 44px controls.

Changed files are limited to the server projection and test, client projection contract/render/tests, dashboard source order, responsive CSS, and the existing account browser verification script.

## RED → GREEN evidence

- RED server: `12/14` passed; raw milestone identifiers and missing closed Cherry label reproduced two failures.
- RED UI: `8/16` passed; label-only objects were not renderable and the old source order remained incompatible.
- Focused GREEN: server projection `14/14`; Current Projection plus AccountWorkspace `16/16`.
- Full frontend: `99/99` across `7/7` files.
- Account plus projection Node: `47/47`.
- Production build: PASS, TypeScript plus Vite, `1,654` modules transformed.
- Built browser: PASS. Ready shell at `1440x900`, `390x844`, and `320x720` has horizontal overflow `0`; desktop visual order is conversation-left / projection-right; mobile visual and semantic order is Projection-first; raw action slug visibility `0`; 200% equivalent `720px` reflow overflow `0`; minimum required controls remain `44px`; reduced-motion animations `0`.

## Rollout, rollback and remaining authority

- Rollout: none. No deploy, provider/runtime/environment mutation, Production activation, release or external mutation occurred.
- Rollback: revert the product/test candidate before any later promotion; preserve this receipt and failed-QA history.
- Required next step: fresh independent UX & Product QA of the immutable receipt carrier produced from this receipt.
- Open: Q2, A5 and C1. Builder does not self-QA, self-promote or check the Gate.

Counters: product retry `0`; registry retry `0`; external mutation `0`; false completion `0`.
