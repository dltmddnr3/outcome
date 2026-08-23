# OUTCOME Stage 6 Fresh UX & Product QA · aa90faf

- Verdict: `NEEDS_REVISION`
- Candidate commit: `aa90faffcd90d0d132e896dbec7037bffee32457`
- Candidate tree: `502ff40d0aaea372b970194592268423bc5b5ffa`
- Candidate parent: `d77a52fe5ad32a4454f045e4fcae7774fac6472f`
- Public receipt: `aa90faffcd90 / 502ff40d0aae / index-DLRYzMVQ.js`
- Fresh Claude session: `9c7e0ed1-79aa-4f08-92d4-d71dc40fa762`
- Fresh Claude model: `opus`, high effort, safe-mode, read-only
- Repository mutations by QA: none
- `false_completion_count`: `10` cumulative; 8 resolved, 1 partially resolved, 1 open

## Gate disposition

| Gate | State | Evidence |
| --- | --- | --- |
| Q1 | OPEN | Geometry, mobile order and rapid scan pass, but locked Final Feed reads as 10/10 evidence-closed, 100%, and 0 remaining. |
| Q2 | OPEN | Hierarchy, switching, stale/unknown/locked states, accessibility, labels and fail-closed metadata pass; the detail pane still produces false completion. |
| Q3 | PASS | Exact commit/tree/parent/origin, public receipt and served bytes verified; no repository mutation or self-acceptance. |
| Q4 | OPEN | `aa90faf` received fresh affected QA. A new corrected candidate requires a new fresh run. |

## Independently passed

- Public GET 200 and 24/24 mutation probes returned `405 read_only`.
- Payload, HTML and bundle exposed no local paths, credentials, full hashes or task/session identifiers.
- Receipt, served HTML and `index-DLRYzMVQ.js` bytes match the candidate runtime.
- All 34 project x Stage x viewport states were independently measured: descendant clipping 0, viewport escape 0, document overflow 0, low contrast 0, undersized controls 0, pairwise intersections 0.
- Inside `.oc-dashboard`, 3,868 direct-text nodes produced zero sub-11 px results. Focus rings were 3 px with minimum 12.81:1 contrast.
- The independent harness rebuilt isolated `d77a52f` and reproduced all eight prior axis clips across five mobile Cherry Note Stages, then verified zero on `aa90faf`.
- Mobile information-order violations fell from 17/17 on `d77a52f` to 0/17; desktop hierarchy remains intact.
- Dedicated axis and NOW observation vocabularies pass; no axis value renders with Gate vocabulary.
- Stage35 no longer shows a Gate-complete/unknown contradiction. The model-layer pending-evidence guard and Stage badge pass.
- Stage33 nine Package-sourced Korean labels, code-secondary display, 57 checks and malformed-metadata fail-closed behavior pass.
- Hierarchy, purpose funnel, project isolation, current/selected semantics, no invented aggregate progress and GitHub `completion_authority=false` pass.

## F10 · Detail pane asserts completion for locked or evidence-pending Stages — High

The model-layer Stage badge is correct, but `summarizeStage` and the detail renderer still derive completion copy from raw checked/total counts without consulting `stage.state`.

Live reproduction on both viewports:

1. Open the public URL.
2. Select `Cherry Note`.
3. Select `Final Feed Product Stage`.

Observed on one screen:

- Stage badge: `선행 Gate 잠김`
- Detail header: `10/10` labelled `evidence-closed / total`
- Progress bar: `100% · Gate evidence only`
- Remaining panel: `연결된 Gate가 모두 evidence-closed입니다.`
- Next condition: close the remaining `0` of 10 Gates

The same contradiction was observed earlier on bottom-shell while its live Package state was work-in-progress/pending: the badge correctly read `Gate 체크 닫힘 · 증거 대기`, while the detail asserted 9/9 evidence-closed and 100%.

This blocks 30-second comprehension because the dominant detail surface says the sole Final Feed product Stage is complete even though its dependency locks it.

Smallest correction: make the detail summary state-aware. For `locked`, `queued`, `blocked`, `pending`, and `gates_closed_evidence_pending`, preserve checked/total as checkbox evidence but do not label it evidence-closed, suppress the 100% completion bar, and make the next-condition copy explain the Stage state or unmet dependencies. Completion copy and the bar are allowed only when `stage.state === complete`.

## Non-blocking observations

- The 9 px standalone shell eyebrow is outside `.oc-dashboard`, carries branding rather than evidence meaning, and has high contrast.
- Cherry Note `OUTCOME_MAP.md` changed during QA, as expected for a live collector. The open detail-semantic defect survived the data change and moved from bottom-shell to locked Final Feed.
- Public receipt and served bytes are consistent for this candidate. Atomic build/swap remains Release Audit scope.
- Hardcoded server-side Package roots remain a Release Audit portability concern; no path leaked publicly.

## Terminal boundary

Stage 6 is `NEEDS_REVISION`. Q1, Q2 and Q4 remain open; Q3 passes. Stage 7 Release Audit must remain closed. This is independent QA evidence only and is not Cherry acceptance, release approval or external outcome completion.
