# Stage 8 C1 visual progress timing — D1 connector fresh affected UX & Product QA

- verdict: **PASS_INDEPENDENT_QA_ONLY_NOT_CHERRY_ACCEPTANCE**
- scope: D1 connector correction only
- independent reviewer: fresh Claude Opus high safe/read-only session `37ce7085-fca5-40cb-b221-14e5f39d41e6`
- product commit: `5cb9ad5c2ad5142a7712b32d9f36037559caa968`
- product tree: `a5414e4443fb90e4f01292af940281d75a195be3`
- product parent: `19322de118ce7913d4048a3cfecf0d3f591d8d29`
- public URL: `https://escape-lined-mercury-there.trycloudflare.com/cherry-note-dashboard`
- public receipt: commit `5cb9ad5c2ad5` / tree `a5414e4443fb` / asset `index-Cmxpoqfc.js` / `runtimeNowPinned=false`
- false_completion_count: **13** (preserved)

## Independence and boundary

The reviewer was launched in a new session and did not resume any prior reviewer or Builder context. Builder evidence and the prior immutable `NEEDS_REVISION` report were treated as claims to refute. The reviewer was read/test/use-only and made no repository, product, Gate, runtime, deployment, release, or acceptance mutation. The candidate was built only from an exact-tree archive in a temporary directory. The preserved user residue was not opened, read, searched, hashed, staged, or modified.

The coordinator wrote this single QA evidence receipt only after receiving the terminal external verdict. This receipt does not change the product pin.

## Exact identity and served bytes

| Check | Measured result |
|---|---|
| HEAD / origin/main | exact product commit |
| tree / parent | exact expected tree and parent |
| origin | PID `36847`, `127.0.0.1:8791` |
| tunnel | PID `88741`, bound to `http://127.0.0.1:8791` |
| public receipt | exact commit, tree, asset and unpinned runtime NOW |

Clean isolated exact-tree build and public/repo bytes matched 3/3:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `index-Cmxpoqfc.js` | 232355 | `d7096aeb23959e3d8dabbf454240645e73f3ff5d785a6f68716696f2c45e4e67` |
| `index-CkPjV4HP.css` | 39142 | `e6ec7945cb5bc72ff05a393d436eac42108424742d566ff0bcb6a110ca147df1` |
| `index.html` | 448 | `914ea4eb75e9c56d75c086011c23e72c8ed24c03c6c9c3508790adcddfb6652a` |

## D1 primary refutation

The reviewer used an independent DOM and pixel probe with a private PNG decoder, headless Chrome 151, and device scale factor 3. It did not rely solely on the shipped assertion.

| Viewport | States | wrapper background/border alpha | maximum connector gap | minimum lime-pixel ratio | longest pixel break | dark occluder pixels |
|---|---:|---:|---:|---:|---:|---:|
| desktop 1440×900 | 18 | `0 / 0` | `0.015px` | `1.0000` | `0px` | `0` |
| landscape 844×390 | 18 | `0 / 0` | `0px` | `1.0000` | `0px` | `0` |

All **36/36 desktop-class states** across Cherry Note 10 stages and OUTCOME 8 stages had exactly one active Scope, a transparent active wrapper, no background image, and a completed connector visibly reaching the current node within the required `<=1px` gap. Every sampled connector pixel was `rgb(173,255,47)`.

### Old-failure negative control

The reviewer restored the old opaque active-wrapper rule through same-origin CSSOM in isolated browser contexts. Closing each context reverted the change; no runtime or source was mutated.

| Negative control | background alpha | unchanged geometry gap | lime-pixel ratio | longest break | dark occluder pixels |
|---|---:|---:|---:|---:|---:|
| desktop 1440×900, 18 states | `1` | `0.015px` | `0.5042` | `177px` | `531` |
| landscape 844×390, 18 states | `1` | `0px` | `0.5000` | `90px` | `270` |

The negative control reproduced the visible obstruction. The shipped assertion accepted clean desktop and landscape states, rejected both opaque-wrapper states with `scopeConnectorContinuity=false`, and correctly did not apply the desktop connector condition at mobile 390×844 where the connector is absent. Geometry alone remained unchanged in the broken state; the new alpha predicate is therefore the effective red-first guard.

## Affected truth regressions

| Check | Result |
|---|---|
| public four viewports × two projects × selected stages | **72/72 PASS** |
| local exact-tree four-viewport traversal | **72/72 PASS** |
| browser assertion harness | **4/4 PASS**, including opaque-wrapper rejection |
| frontend | **35/35 PASS** |
| Node | **64/64 PASS** |
| security | **16/16 PASS** |
| public boundary | local/public prohibited identifiers **0/0** |
| mutations | local **24/24 = 405 read_only**; public **24/24 = 405 read_only** |
| scope / runbook / diff check | PASS / PASS / clean |

Across public and local traversal, overflow, clipping, intersections, ellipsis, viewport escape, unexpected English and fallback counts were all zero. Controls were at least 44px on both axes, minimum measured contrast was 4.70, headings were sequential with one H1, and text below 11px was zero. Normal motion had zero running animations and reduced-motion had zero animations and zero non-zero transitions. The raised active Scope treatment remained visually dominant after making only its wrapper transparent.

The UI preserved the Project Hero, NOW, four role cards, Phase → Scope → Stage → Gate funnel, current Stage Gate conditions, selected detail, and default-collapsed technical evidence. Gate progress remained current-Stage-only (`0/8 · 0%` for Cherry Note and `0/2 · 0%` for OUTCOME) beside the statement that it is not overall project progress. Phase, Scope and Stage placement remained `i / total` without aggregate percentages.

Timing stayed honest: both projects showed `작업시간 측정 근거 없음` and `남은 시간 예상 근거 없음`; activity, history and Gate ratio did not fabricate elapsed time or ETA. NOW remained explicitly separate from progress and stale activity rendered as `관측 오래됨`.

## 30-second reachability

Instrumented user paths needed one project-selection click and at most one scroll:

| Surface / project | answerable | current location | Gate progress | next condition |
|---|---:|---|---|---|
| desktop / Cherry Note | 564ms | above fold | above fold | 345px scroll |
| desktop / OUTCOME | 1082ms | above fold | above fold | 304px scroll |
| mobile / Cherry Note | 640ms | above fold | above fold | 1111px scroll |
| mobile / OUTCOME | 602ms | above fold | above fold | 1037px scroll |

These instrumented measurements support, but do not replace, a human-subject comprehension test.

## Non-blocking observations

1. V9 evidence in `GATES_STAGE8_C1_VISUAL_PROGRESS_TIMING.md` still says browser harness 3 while the candidate has 4 tests. This is stale docs-only evidence, not a D1 product defect.
2. `scripts/check-public-redaction.mjs` does not accept an absolute candidate-dist path consistently with `scripts/browser-check.mjs`; the reviewer used a working-directory-relative exact-tree path. This is low-severity tooling robustness, not a product or D1 defect.
3. The shipped D1 guard tests active-wrapper alpha plus geometry, not arbitrary future sibling/overlay pixel occlusion. The independent pixel negative control proves the shipped guard detects the corrected defect; broader pixel-occluder coverage is informational follow-up.

## Verdict and preserved boundaries

The D1 defect is closed for this exact product candidate. The old obstruction is independently reproducible, while the shipped candidate has continuous unoccluded connector pixels and a guard that rejects the old state. No affected product regression was found.

**PASS_INDEPENDENT_QA_ONLY_NOT_CHERRY_ACCEPTANCE**

This is affected independent QA only. It is not self-acceptance, Cherry acceptance, Release Audit, or release approval. **V11, R11, C1, C2, release, `MVP_SCOPE_CLOSED`, and `EXTERNAL_OUTCOME_COMPLETE` remain open.**
