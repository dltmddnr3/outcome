# Current Public View · Independent User QA

## Candidate

- Public URL: `https://outcome-five.vercel.app/cherry-note-dashboard`
- Git pin: `bb1586a29b7018ee72189acd6119d5edc3e4d816`
- Tree: `b7267b1c19467ddc75e023221efdf1f91b960ce1`
- Served asset: `index-C9f0_wrJ.js`
- Review environment: fresh detached worktree, production 1440×900 and 390×844, Korean locale
- Boundary: user QA only; no Cherry acceptance, release approval, or scope closure

## Result

`FAIL_NEEDS_REVISION`

The current view is visually coherent and the Project → Phase → Scope → Stage → Gate drill-down is operable on desktop and mobile. The fixed top summary, compact role states, responsive single-column mobile drill-down, keyboard movement, 44px controls, reduced-motion behavior, and zero-overflow geometry should be preserved. Three usability defects prevent acceptance.

### U1 · Phase completion overclaim — High

- Reproduction: open OUTCOME and inspect the five-Phase overview or Phase list.
- Actual: Phase 2 is labeled `완료` even though only Stable public delivery contains a completed Stage; Multi-project portfolio and Account-based access have no defined Stages.
- Expected: a Phase can be `완료` only when every owned Scope has defined Stages and all of those Stages are evidence-complete. Mixed complete and undefined Scopes must show an explicit partial state such as `일부 완료`, not `완료` or an invented percentage.
- Impact: the primary glance view overstates project progress and contradicts the Phase 2 completion contract.
- Repair owner: Builder.

### U2 · Stage ordinal looks like Gate progress — Medium

- Reproduction: inspect the Stage column for 독립 승인.
- Actual: rows read `완료 조건 충족 · 1/3`, `완료 조건 충족 · 2/3`, and `진행 중 · 3/3`; the fractions are Stage positions but visually read as Gate completion.
- Expected: label the denominator explicitly, for example `스테이지 위치 1/3`, while the Gate inspector alone owns `확인된 항목 / 전체`.
- Impact: users can mistake navigation position for acceptance progress.
- Repair owner: Builder.

### U3 · Snapshot freshness controls imply live refresh — Medium

- Reproduction: open the fixed Vercel host and inspect the hero source state and refresh icon.
- Actual: the deployment snapshot says `원본 묶음 정상`, `원본 관측`, and exposes `원본 묶음 새로고침`, while the same screen correctly says a new deployment is required.
- Expected: on `deployment_snapshot`, distinguish structural validity from recency: `패키지 구조 정상`, `스냅샷 생성 <time>`, and `배포 스냅샷 다시 불러오기`. Live-source wording remains unchanged outside snapshot mode.
- Impact: users can believe the button fetches current sessions or source files.
- Repair owner: Builder.

## Preserve

- One-container overview with all five Phases visible
- Current-location lime treatment and evidence-derived gauges
- Four-column desktop drill-down and progressive mobile drill-down
- Compact Planner / Builder / UX & Product QA / Release Audit state rows
- NOW activity separated from progress proof
- Technical evidence collapsed below the core journey
- No invented percentage, duration, ETA, or completion inference

## Reverification contract

Fresh QA must pin the corrected commit and prove: Phase 2 is not complete; Stage fractions state that they are positions; snapshot language cannot imply live collection; hierarchy and current-location truth remain unchanged; desktop/mobile keyboard, geometry, accessibility, security, and read-only hosting regressions pass.
