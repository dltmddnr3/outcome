# Stage 6 detail semantics correction evidence

Observed: 2026-08-24 KST
Authority: Cherry-approved OUTCOME-only Builder correction
Prior candidate: `aa90faffcd90d0d132e896dbec7037bffee32457`
Prior independent QA: `docs/STAGE6_FRESH_UX_PRODUCT_QA_aa90faf.md` (`NEEDS_REVISION`, cumulative `false_completion_count=10`)

## Corrected invariant

- Checked/total remains visible as checkbox evidence for every Stage.
- Only `stage.state === complete` may label the count `evidence-closed / total`, show a completion percentage/bar, or state that all connected Gates are evidence-closed.
- `locked`, `blocked`, `queued`, `pending`, `active`, `unknown`, and `gates_closed_evidence_pending` use non-completion copy that states the Package boundary. Locked and blocked copy names the referenced preceding Stage; blocked copy also preserves the Package Gate source requirement.
- Final Feed `10/10 + locked`, bottom-shell fixture `9/9 + gates_closed_evidence_pending`, and a valid complete Stage are fixed regressions.
- The all-state browser scanner checks this semantic invariant for every project × selected Stage at both supported viewports, in addition to its clipping, viewport, intersection, text, contrast, control, focus, hierarchy and connector checks.

## Live-source boundary

Cherry Note Package source can move while QA is observing it. Between the prior QA and this correction, bottom-shell moved from pending evidence to complete, while Final Feed remained locked with 10/10 checkbox evidence. The renderer does not pin or reinterpret that live state: it applies the same state-aware detail invariant to each current Package observation.

## Local verification

- Focused detail semantics: 5/5 PASS.
- Full frontend: 16/16 PASS; full Node: 52/52 PASS; security subset rerun: 14/14 PASS.
- Production build and scope/diff checks: PASS.
- Chrome 1440x900 and 390x844: each measured 2 projects x 17 selected Stage states; detail semantics PASS, clipping/intersection/viewport escape 0, controls >=44px, semantic text >=11px and >=4.5:1, focus >=14.83:1.
- Prior QA artifact SHA-256: `8b002c84a1b49166b46a89fd49dbae811fc9aeea9fc6fa16be713619b0007ed6`.

## Acceptance boundary

This is Builder correction evidence only. It preserves the prior QA verdict and does not constitute fresh affected UX & Product QA, Stage 7 Release Audit, Cherry acceptance, release approval, or external outcome completion. Release Audit reproducibility remains partially open because atomic build/swap and hardcoded Package-root portability are outside this correction.
