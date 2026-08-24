# Stage 8 C1 visual progress and timing — fresh independent UX & Product QA

- 관측일: 2026-08-24 KST
- fresh Claude Opus session: `a9da0573-b246-4c37-b45c-30eb11e49adb`
- 역할: affected-scope UX & Product QA
- verdict: **NEEDS_REVISION**
- `false_completion_count`: **13** (보존)

## Exact target and receipt

- candidate: `645e516a716744b0aa8f0ea1fa2bf173bd975abe`
- tree: `12aa080c171264a864beaba78f6843e54e89b36d`
- parent: `474099a102abafcc80f74e9c17c31436f719aed7`
- origin/main: candidate와 일치
- public receipt: `645e516a7167` / `12aa080c1712` / `index-CUaTLI12.js` / `runtimeNowPinned=false`
- public URL: `https://escape-lined-mercury-there.trycloudflare.com/cherry-note-dashboard` (`GET 200`)
- runtime: origin PID `57247` on `127.0.0.1:8791`; tunnel PID `88741`; signal/restart 없음

Exact-tree clean isolated build와 local/public served bytes가 일치했다.

| artifact | SHA-256 |
|---|---|
| `index-CUaTLI12.js` | `d7096aeb23959e3d8dabbf454240645e73f3ff5d785a6f68716696f2c45e4e67` |
| `index-fHIt55L3.css` | `cefb2811c4e4bac5df614ca9df09abb6aabf9cc912fc53452a16b9cd45c9e5aa` |
| dashboard HTML | `1b8daee96c55fb3cf2a47300129e3321244aba781491cc6158870fe6f9c1cfef` |

## Blocking finding

### D1 — desktop Scope rail connector is occluded before the current node

- severity: **Medium, candidate-blocking for V2**
- affected: desktop 1440×900 and landscape 844×390, both projects, every selected Stage — **36/72 states**
- unaffected: mobile 390×844 and 375×812 — **0/36 affected**

Public OUTCOME at 1440×900, `deviceScaleFactor=1` pixel scan:

- lime connector visible: `x=738→925`
- current Scope node: `x=1103`
- expected segment length: `365px`
- occluded length: `178px` = **48.8%**
- pixels `x=926→1305`: `rgb(21,32,20)`

The current Scope therefore appears as an opaque square slab behind the intended raised card, and the completed connector does not visibly reach the current node. This contradicts V2's continuous line/node rail and the brief's completed connector requirement.

Root cause is CSS specificity:

- `.oc-rail article.active` retains `background:rgb(21,32,20)` with specificity `(0,2,1)`.
- desktop `.oc-scope-rail article` tries `background:transparent` with specificity `(0,1,1)`.
- siblings are transparent, while active article remains opaque at `379×79`, radius `0px`, hiding the preceding `::after` line.

Reproduction: open the public URL at width `>=601px`, select either project, and inspect `.oc-scope-rail`. The completed line stops at the active article's left edge instead of meeting its node.

Minimum correction inside the existing desktop media block:

```css
.oc-scope-rail article.active{background:transparent;border-color:transparent}
```

Fresh QA injected this correction through browser CSSOM only. The active background became transparent and the connector changed from `738→925` to `738→1103`, reaching the node. No repository source was edited.

The shipped assertion checks only that `::after` exists, not that it is visible/unoccluded. Add a desktop assertion for active article transparency or pixel continuity so the defect fails automatically.

## Passed affected scope

### Information and source truth

- Hero, NOW, four role cards, hierarchy purposes, current Stage Gate, selected detail and collapsed technical evidence: `72/72` preserved.
- Current funnel stayed fixed while exploring all 18 stages.
- Phase/Scope/Stage uses `i / total` only; aggregate placement percent: `0` occurrences.
- Technical evidence remained collapsed and after the primary progress flow.

### Gate progress

Fresh shipped-bundle interception covered 11 Gate cases:

- missing/unavailable and total `0`: no percent and no gauge
- `1/3→33%`, `2/3→67%`, `1/8→13%`, `8/8→100%`
- exactly one current Gate gauge with matching ARIA percent
- adjacent `프로젝트 전체 진행률이 아닙니다.` preserved

The public current states are Cherry Note `0/8 · 0%` and OUTCOME `0/2 · 0%`; total is nonzero, so numeric 0% with empty fill is source-grounded.

### Timing honesty

Fresh synthetic matrix: **33/33 PASS**, including 22 elapsed/ETA cases.

- elapsed appears only for active + fresh + current Stage + valid `boundAt`
- stale, idle, mismatched/null Stage, missing/malformed/future `boundAt` all show `작업시간 측정 근거 없음`
- `observedAt` never substitutes for start
- 400-character activity, history `999`, Gate `7/8` cannot fabricate elapsed or ETA
- ETA requires trusted start plus positive integer `expected_duration_minutes`
- `0`, negative, fractional, string and missing duration show `남은 시간 예상 근거 없음`
- current public data correctly shows both elapsed and ETA fallbacks

### Full traversal and regression

- independent public traversal: 4 viewports × 2 projects × 18 stages = **72/72**
- local traversal: **72/72**
- `documentOverflow=0`, `viewportEscape=0`, `intersections=0`, `clipping=0`, `ellipsis=0`
- unexpected English `0`, translation fallback `0`
- min contrast `4.70:1`, min control `44px`, one H1 and sequential headings
- motion: live data `0`; synthetic eligible binding has at most `2` semantic repeating elements; reduced-motion `0`
- frontend `35/35`, Node `64/64`, security `16/16`
- local/public mutations each `24/24 = 405 read_only`
- public prohibited hits `0`
- scope PASS (`17` product/runtime/test paths), runbook PASS, production build PASS, `git diff --check` PASS

## UX and visual-quality judgment

Fresh full-page screenshots confirmed mobile reflow without horizontal scrolling and a desktop line/node structure. State is never color-only: complete/current/pending use distinct icon shape, card/node shape and Korean labels.

`ui-ux-pro-max` final checks covered 375px, landscape, reduced motion, 44px targets, contrast, heading order and overflow. `kill-ai-slop` scanned 92 files and returned 7 leads in 5 groups. Source triage found inherited login gradient/shadow, dashboard radius and the intentional Inter/system stack; this candidate added no generic pill/kicker/decorative glow. The D1 opaque active wrapper is the material nested-surface exception and is the reason the visual result does not pass.

## 30-second comprehension boundary

Desktop places project, current hierarchy names, Scope rail states, Gate count/percent, NOW role, time fallbacks and next boundary on the first screen; Stage index requires about `35px` additional scroll. Mobile exposes Hero/Gate/NOW/timing/roles above the fold; hierarchy and rail occupy `1011–1421px`, about two flicks.

This proves information reachability, but the reviewer timing was a structured reading estimate rather than a human-subject stopwatch. It is not used to override the blocking visual defect or Cherry's V11 authority.

## Additional observations

- Low: at 0%, the gauge's `1px` track border can resemble a filled hairline; `0/N · 0%` disambiguates it.
- Informational: malformed client-only `closed>total` can render above 100%, but the production server constructs closed as a filtered subset of total, making it unreachable.
- Informational: Cherry Note source order is `대기→완료→진행 중`; reordering would invent source sequence, so no change is recommended.

## QA harness correction and boundaries

The fresh external reviewer stayed read-only and built only from `/tmp`. During coordinator cross-checking, the first intended isolated build command omitted `cd` after exporting to `/tmp`, so `npm ci && npm run build` ran once in the repository cwd. This changed no tracked Git bytes and produced byte-identical `dist` files, but refreshed ignored build-output timestamps. The command was corrected and rerun from the exact-tree temp directory; active `.outcome-runtime/candidate-dist`, origin and tunnel were not modified. This correction is recorded rather than hidden.

Verdict: **NEEDS_REVISION**. V10 cannot pass on this candidate. V11, R11, C1/C2, Cherry acceptance, release approval, `MVP_SCOPE_CLOSED` and `EXTERNAL_OUTCOME_COMPLETE` remain open. `docs/ROADMAP 2.md` was not opened, read, searched, hashed, staged or modified.
