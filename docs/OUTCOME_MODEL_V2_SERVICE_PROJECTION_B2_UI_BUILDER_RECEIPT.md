# OUTCOME Model v2 B2 workspace UI · Builder receipt

Status: `B2_UI_CANDIDATE_READY · BUILDER ONLY`

This receipt records the immutable B2 UI candidate and its defect-specific mobile target correction. It does not mark B2 in the Gate and does not assert fresh UX & Product QA, B3, Q2, A5, C1, deployment, Production, release, Cherry acceptance or Phase completion.

## Immutable input and candidate

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · B2`
- Builder handoff SHA-256: `a3ee4ed79c8748c2308b739335c7a97fbf09031fb258ce8fdb2c51d579bbf6cc`
- B1 carrier/tree/parent: `fdffa53104bf72746a987c4e0113aa2d116974a5` / `ee8f4dc96ed34dbae4bf8d24d84075d67c9c0347` / `9a608fd422d5fdf2065ff0e560e089ea6bf4ca6c`
- Initial B2 implementation checkpoint/tree/parent: `9d1e99d0b11986fbd2a867f21759a9980283fd23` / `bb6ceb6462090d2cb251e752100b0ae1bfec6102` / `fdffa53104bf72746a987c4e0113aa2d116974a5`
- Corrected B2 product candidate/tree/parent: `4e9edaa65467490ff2785d30cdc9046c117d4faf` / `1c6f0fdb5f6d76fbec9e4d522cf8929f7e80293f` / `9d1e99d0b11986fbd2a867f21759a9980283fd23`
- Correction changes exactly `src/styles.css`: `.oc-project-search input` gains `min-height:44px`; no width, markup, state, auth or server semantics changed.
- The terminal Builder report fixes this receipt carrier and tree because a content-addressed receipt cannot self-embed its own commit identity.

## Implemented B2 boundary

- The actual server-owned `modelV2` projection is primary in the authenticated workspace and renders Destination, remaining gap, Now and next boundary in order; null Cherry action is omitted.
- Existing global sidebar, project switch and account/logout surfaces remain present.
- v1 hierarchy, role binding and technical evidence remain in collapsed disclosures by default.
- The client renders allowlisted projection fields only and performs no canonical progress, gap, frontier, next-action or Cherry-action calculation.
- Seven server states remain distinct; observed events are not rendered and B3 conversation behavior is not implemented.
- Desktop and mobile retain one readable projection surface, no horizontal overflow, visible focus, reduced-motion behavior and 44px mobile controls.

## RED and correction

Actual-component SSR Chromium on the initial checkpoint reproduced every opened mobile sidebar control at `390x844`:

- close `44x44`; new project `287x44`; project search input `239x18`;
- Cherry Note select/menu `241x44` / `44x44`;
- OUTCOME select/menu `241x44` / `44x44`;
- archive/connect controls `287x44` / `287x44`;
- account/logout `287x62.78`.

The only undersized focusable target was `.oc-project-search input`. The styles-only correction preserved its width `239px` and changed its height from `18px` to `44px`. Every opened mobile sidebar control then measured at least `44px`.

## Actual Chromium geometry and accessibility

The actual tracked `OutcomeDashboard` + `CurrentProjection` component composition was rendered with React `renderToStaticMarkup`; the exact tracked `src/styles.css` bytes were injected with that markup into Chromium. No substitute product markup or tracked fixture was used.

Component/style SHA-256 inputs:

- `CurrentProjection.tsx`: `c9eef9ad0b342ade8488a4dfbd9ebf17788e1872aaa99e35aeffdec0a46413fe`
- `OutcomeDashboard.tsx`: `19828a3ad5939b9358de0c0c722c8600fcd971ba3336dd10b0a4294a460590f6`
- `AccountWorkspace.tsx`: `677837ec215b9c91d424defa357f81dd0502c283ac623309b277aafb6a0eba34`
- pre-correction `styles.css`: `7f507c56d037ace75944c80df31849b3a42cbc168f889fbf3c79e8f08d9ea9fd`; corrected `styles.css`: `3981beefacf3c5a01253294f951f6e43fe0c62649d27e3116a8169a354dbbec7`.

Desktop `1440x900`:

- projection/main width `1144px` / `1192px`; document overflow `0px`;
- hero/projection, projection/v1 disclosure and sidebar/main overlap `0/0/0px²`;
- visible controls `19`; minimum height `44px`;
- projection labels `11`; clipped/overflow labels `0`;
- landmarks main/aside/nav `1/1/3`; heading levels `1,2,3,2,3,3,3` sequential;
- v1 and technical disclosures collapsed; reduced-motion active animations `0`;
- focus outline `3px solid rgb(173, 255, 47)`; console/page errors `0/0`.

Mobile `390x844`:

- projection/main width `374px` / `390px`; document overflow `0px`;
- hero/projection, projection/v1 disclosure and sidebar/main overlap `0/0/0px²`;
- visible primary controls `3`; minimum height `44px`;
- projection labels `11`; clipped/overflow labels `0`;
- landmarks main/aside/nav `1/1/3`; heading levels `1,2,3` sequential;
- v1 and technical disclosures collapsed; reduced-motion active animations `0`;
- focus outline `3px solid rgb(173, 255, 47)`; console/page errors `0/0`;
- opened-sidebar controls: all `10/10` at least `44px`; search input exact `239x44`.

Both viewports preserved field order `destination → gap → now → boundary`, omitted null Cherry action, rendered no hostile event summary, and retained completion authority `false`.

## Tests and privacy

- Focused Current Projection + Account Workspace: `14/14` PASS.
- Canonical tracked frontend Vitest: `94/94` PASS across `6/6` files.
- Account authorization/isolation Node suite: `33/33` PASS.
- Account frontend suite: `30/30` PASS across `3/3` files.
- `git diff --check`: PASS.
- Hostile extra/private fields, event summary, private locator, raw prompt/result and client canonical calculation in rendered markup: `0`.

## Explicit residual evidence

- Production build is not PASS. In the single bounded build attempt, `tsc -b` completed, Vite reached production transform, then produced no progress for five minutes. It was interrupted with exit `1`; `dist` was absent; retry `0`.
- Full `/workspace` route navigation is not PASS. Vite reported ready in `89ms`, but Chromium did not reach `DOMContentLoaded` within `30s`; retry `0`.
- The changed actual-component SSR geometry path isolates and passes the B2 component/layout contract. It does not convert either residual above into a PASS.

## Scope, rollback and counters

- Initial B2 implementation: exact six-path checkpoint `9d1e99d0b11986fbd2a867f21759a9980283fd23`.
- Defect correction: exact one-path styles candidate `4e9edaa65467490ff2785d30cdc9046c117d4faf`.
- Receipt carrier: this receipt path only; fixed by the terminal Builder report.
- Dependency install/fetch/network: `0/0/0`; task-owned dependency symlink removed before commit.
- Product changes outside the handoff's authorized B2 paths: `0`.
- Gate/Contract/Model/Map/root/registry/provider/runtime/environment/database/external mutations: `0`.
- Push/deploy/release/acceptance/Phase mutations: `0`.
- Automatic retry: `0`; duplicate execution: `0`; unauthorized transition: `0`; `false_completion_count`: `0`.
- Rollback: revert the receipt carrier, then revert corrected candidate `4e9edaa65467490ff2785d30cdc9046c117d4faf` to recover exact checkpoint `9d1e99d0b11986fbd2a867f21759a9980283fd23`. No rollback was executed.
