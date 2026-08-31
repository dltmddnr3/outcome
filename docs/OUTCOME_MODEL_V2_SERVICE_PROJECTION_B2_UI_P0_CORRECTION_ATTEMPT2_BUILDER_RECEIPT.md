# OUTCOME Model v2 B2 UI P0 correction attempt 2 · Builder receipt

Status: `B2_UI_CORRECTION_ATTEMPT2_CANDIDATE_READY`

This receipt records only the isolated Builder correction candidate and bounded verification. It does not promote B2, perform fresh independent QA or Release Audit, authorize deployment or release, imply Cherry acceptance, close Q2, or advance the Phase.

## Immutable input and candidate

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B2`
- Failed re-QA receipt commit/tree/parent: `36750b1e9a525aafead84dea8be97dc138c1801c` / `d120e75e4f144333cd126c5143c1c1b3225c820d` / `51d3b64047f398e09f11eb8a8a752d2851cd11d7`
- Failed re-QA report SHA-256: `3a184028274098b91e110f28be88f2be4f6f9301e1df5f5a9458a3c295b5a580`
- Prior correction product commit: `47f3bc3109dac9562866269e515511ea4bd0501d`
- Attempt 2 product commit/tree/parent: `84d9739965a2a8211b703d7ffd6cc6f085678b94` / `ef25337fde110722270bcbba236fbc72279b7096` / `36750b1e9a525aafead84dea8be97dc138c1801c`
- Isolated worktree: exact detached failed re-QA carrier; task-owned dependency symlink only, with no install or fetch.

## Exact correction scope

- `src/components/AccountWorkspace.tsx`
- `src/components/OutcomeDashboard.tsx`
- `src/components/AccountWorkspace.test.tsx`

`AccountWorkspace` now routes a ready Model v2-only envelope into `OutcomeDashboard` before evaluating legacy selection. `OutcomeDashboard` renders its existing navigation shell, authorized project switcher and server-owned `CurrentProjection` while dashboard data is absent. If a later public dashboard does not cover every authorized private project, the private Model v2 shell remains authoritative and does not expose an unmatched public project. Compatibility remains collapsed and truthfully unavailable; no phase, scope or stage is synthesized. When actual legacy fields are present for the complete authorized set, the existing v1 compatibility path remains unchanged.

No server/API contract, Model v2 calculation, B3 event behavior, broad refactor or client canonical calculation was added.

## Red before green

- Added the exact account-service envelope fixture containing two project rows with only `{ project, modelV2 }` and no dashboard, current or phases.
- RED: `Cannot read properties of undefined (reading 'phaseId')` at `AccountWorkspace.tsx:37`; `12/13` passed and `1/13` failed.
- Focused GREEN: Current Projection, Outcome Dashboard and Account Workspace `75/75` across `3/3` files.

## Verification evidence

- Full frontend: `96/96 PASS` across `6/6` files.
- Dashboard frontend: `93/93 PASS` across `5/5` files.
- Account authorization/isolation Node suite: `33/33 PASS`.
- Account frontend suite: `32/32 PASS` across `3/3` files.
- Production build: PASS; TypeScript plus Vite, `1,653` modules transformed, exit `0`.
- Actual account service readback before browser launch: dashboard absent; `2/2` project rows; exact keys on each row were `project` and `modelV2` only.
- Exact production build served by `createOutcomeServer`; synthetic owner login and subsequent `/api/private/workspace` returned `200` on desktop `1440x900` and mobile `390x844`.
- Both viewports: body/root nonzero; one visible Current Projection; two authorized project controls; project switch successful; compatibility collapsed and truthfully unavailable; fabricated hierarchy `0`; horizontal overflow `0`; error overlays `0`; reduced-motion animations `0`; undersized visible controls `0`; private marker hits `0`; page errors `0`; unexpected post-auth console errors `0`.
- Mobile project search measured at least `44px`; desktop/mobile keyboard focus indicator was `2px` lime. The expected anonymous pre-auth workspace request returned `401` and exposed no private project surface.

## Boundary, rollback and residue

- Product/test correction count: `3` files; this receipt is the only subsequent file.
- Rollback: return from the attempt 2 product commit to exact parent `36750b1e9a525aafead84dea8be97dc138c1801c`; no external state rollback is required.
- Gate, Contract, Model, Map, root docs, registry, runtime, provider and environment were not mutated.
- No push, deploy, release, acceptance, B3 event, QA verdict, Audit verdict, Q2 closure or Phase transition occurred.
- `false_completion_count`: `0`
- live/external `mutation_count`: `0`
- `automatic_retry_count`: `0`
- `residue_count`: `0` after temporary browser script, server, browser, build output and dependency symlink cleanup.
- `identifiers_shared`: `0`

## Handoff

`B2_UI_CORRECTION_ATTEMPT2_CANDIDATE_READY`

Fresh independent UX & Product QA must reproduce this exact product candidate and receipt carrier. All later gates remain closed.
