# OUTCOME Model v2 B2 workspace UI P0 correction · Builder receipt

Status: `B2_UI_CORRECTION_CANDIDATE_READY`

This receipt records only the isolated Builder correction candidate and its bounded verification. It does not promote B2, perform fresh independent QA or Release Audit, authorize deployment or release, imply Cherry acceptance, close Q2, or advance the Phase.

## Immutable input and candidate

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `B2`
- Corrected product input commit/tree/parent: `4e9edaa65467490ff2785d30cdc9046c117d4faf` / `1c6f0fdb5f6d76fbec9e4d522cf8929f7e80293f` / `9d1e99d0b11986fbd2a867f21759a9980283fd23`
- Prior Builder receipt carrier: `6938e2f9b0ee0ca849846e421795deade651de77`
- Fresh QA carrier/tree/parent: `7060c7e39f6de1e3ee804b7d88cd479498e9b644` / `12a83d515694f00004c4defec06410893060c402` / `6938e2f9b0ee0ca849846e421795deade651de77`
- Fresh QA report SHA-256: `08ceded791c70187286a9e51d215764a7c2ea62d7c00cc68947b7749271ed322`
- Correction product commit/tree/parent: `47f3bc3109dac9562866269e515511ea4bd0501d` / `69fee207cdce03d578527d31b07b7ada7f3b622a` / `7060c7e39f6de1e3ee804b7d88cd479498e9b644`
- Isolated worktree: exact detached QA carrier; task-owned dependency symlink used for verification and removed before commit.

## Exact correction scope

- `src/components/AccountWorkspace.tsx`
- `src/components/OutcomeDashboard.tsx`
- `src/components/AccountWorkspace.test.tsx`

The authenticated dashboard branch now wins before `AccountWorkspace` evaluates optional v1 hierarchy. `OutcomeDashboard` selects the server-owned Model v2 projection before resolving or dereferencing v1 current hierarchy. When that projection is valid and v1 current hierarchy is absent, the existing navigation, project switcher and `CurrentProjection` render; compatibility stays collapsed and truthfully reports that no v1 compatibility hierarchy exists. No phase, scope or stage is synthesized. The existing v1 path remains unchanged when Model v2 is absent. No client canonical calculation or B3 event behavior was added.

## Red before green

- Added the actual minimal server-envelope component case: valid Model v2 plus absent project `current`, with dashboard v1 `current: null` and an empty current hierarchy.
- RED reproduced exactly: `Cannot read properties of undefined (reading 'phaseId')` at `AccountWorkspace.tsx:37`; `11/12` passed and `1/12` failed.
- Focused GREEN: Current Projection, Outcome Dashboard and Account Workspace `74/74` across `3/3` files.

## Verification evidence

- Full frontend: `95/95 PASS` across `6/6` files.
- Dashboard frontend: `92/92 PASS` across `5/5` files.
- Account authorization/isolation Node suite: `33/33 PASS`.
- Account frontend suite: `31/31 PASS` across `3/3` files.
- Production build: PASS; TypeScript plus Vite, `1,653` modules transformed, exit `0`.
- Exact built authenticated route in system Chrome, desktop `1440x900` and mobile `390x844`: synthetic owner login `200`; `/api/private/workspace` `200`; `#root` nonblank; `CurrentProjection` visible; project switching preserved; compatibility collapsed; no fabricated v1 hierarchy; horizontal overflow `0`; visible navigation controls at least `44px`; mobile project search `239x44`; keyboard-visible project-search focus; reduced-motion animations `0`; private marker matches `0`; page errors `0`; unexpected post-auth console errors `0`.
- The expected anonymous pre-auth workspace request returned `401` and exposed no project surface. No error overlay or residual dialog remained after authentication.

## Boundary and residue

- Product/test correction count: `3` files; receipt is the only subsequent file.
- Gate, Contract, Model, Map, root docs, registry, runtime, provider and environment were not mutated.
- No push, deploy, release, acceptance, B3 event, QA verdict, Audit verdict, Q2 closure or Phase transition occurred.
- `false_completion_count`: `0`
- live/external `mutation_count`: `0`
- `automatic_retry_count`: `0`
- `residue_count`: `0` after temporary browser script, server, browser, build output reference and dependency symlink cleanup.
- `identifiers_shared`: `0`

## Handoff

`B2_UI_CORRECTION_CANDIDATE_READY`

Fresh independent UX & Product QA must reproduce this exact correction candidate and this receipt carrier before any promotion. Release Audit, Cherry acceptance, deployment and release remain separate and closed.
