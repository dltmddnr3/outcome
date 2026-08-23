# OUTCOME Stage 6 Fresh UX & Product QA

- Verdict: `NEEDS_REVISION`
- Candidate commit: `d77a52fe5ad32a4454f045e4fcae7774fac6472f`
- Candidate tree: `ba4b44ae13016aa9eb9e16e872956488b4754bb4`
- Candidate parent: `37a08b75a2e66799d7e82df32354ad5216c3972a`
- Public receipt: `d77a52fe5ad3 / ba4b44ae1301 / index-BOiIIQiH.js`
- Public URL: `https://van-staff-excellence-investigated.trycloudflare.com/cherry-note-dashboard`
- Fresh Claude session: `52ba3df8-b846-4a1e-abac-62f9eb418f13`
- Fresh Claude model: `opus`, high effort, safe-mode, read-only
- Repository mutations by QA: none
- `false_completion_count`: `9` cumulative; 4 open, 4 resolved, 1 partially resolved

## Gate disposition

| Gate | State | Evidence |
| --- | --- | --- |
| Q1 | OPEN | Desktop 30-second comprehension passed. Mobile failed because five Cherry Note Stages clip eight evidence-axis values and hide scope-limiting qualifiers. |
| Q2 | OPEN | Hierarchy, Gate meaning, project switching, contrast, controls, focus, labels and fail-closed metadata passed. Axis vocabulary and Stage completion semantics still produce false completion labels; some honesty text remains below 11 px. |
| Q3 | PASS as QA-process evidence | Exact commit/tree/parent/origin and public receipt/asset were verified; no repository mutation or self-acceptance occurred. |
| Q4 | OPEN | This corrected candidate received fresh affected QA. A new fresh QA run is required after the next correction. |

## Passed independently

- Exact Git candidate, origin/main, public build receipt and served asset identity.
- Public GET `200`, mutation `405 read_only`, and redaction of local paths, task/session identifiers and full hashes.
- Project switching, full Current/Next values, all 8 OUTCOME and 9 Cherry Note Stages, and inline non-overlay detail.
- Project -> Phase -> Scope -> Stage -> Gate hierarchy and purpose funnel; no Gate appears as a Stage.
- Stage33 nine Package-sourced Korean-primary labels, codes secondary, and 57/57 referenced checks. No OUTCOME translation table exists; malformed metadata fails closed.
- No invented numeric fallback or cross-Stage percentage.
- WCAG text contrast, controls >=44 px, keyboard focus and selected/current Stage semantics.
- GitHub Local/Published/Checks/Release separation and `completion_authority=false`.

## Open findings

### F1 · Mobile evidence-axis clipping — High

At `390x844`, five Cherry Note Stages contain eight clipped `.oc-axis > strong` values. Examples:

- `complete 57 of 57 engineering gates`: client 150 px, scroll 204 px
- `complete for engineering and internal distribution`: client 149 px, scroll 278 px
- `independently reproduced not started`: client 150 px, scroll 213 px
- `must be complete but not sufficient`: client 150 px, scroll 200 px

The ellipsis removes qualifiers such as `internal distribution` and `not sufficient`. The value cannot be recovered on touch. Desktop and OUTCOME default do not reproduce it.

Smallest correction: include `.oc-axis strong` in the existing unclamp reset: `white-space:normal; overflow:visible; text-overflow:clip; overflow-wrap:anywhere`.

### F2 · Shared vocabulary creates false Gate completion — High

`entityStateNames` is applied to Stage state, role binding, GitHub state and raw axis values. A Package axis value `complete` therefore renders as `Gate 완료` even when the same Stage has no parsed Gate evidence and its detail reads `unknown`.

Smallest correction: use a dedicated axis-value vocabulary or render sanitized Package axis values without the Stage/Gate label map.

### F3 · Stage state ignores declared evidence closure — High

`stageState` returns `complete` whenever all parsed Gate checkboxes are closed, even when the Package declares `implementation_state: work_in_progress_not_candidate` and `evidence_closure_state: pending`. The unconditional second complete return makes the preceding evidence-aware condition ineffective.

Smallest correction: remove the unconditional complete return or emit a distinct `gates_closed_evidence_pending` state. Package-declared evidence closure must govern the Stage badge.

### F4 · Verification coverage is an allowlist — High

The shipped browser flow asserts Cherry Note labels, switches back to OUTCOME, and only then measures geometry. It therefore measures only OUTCOME default. Text, contrast, controls and intersections also use selector allowlists; every fresh defect is immediately outside those lists.

Smallest correction: measure every project x selected Stage state and scan visible document descendants, excluding only intentionally hidden accessibility text.

### F5 · Remaining text below 11 px — Medium

Important examples include role freshness verdicts at 9 px, remaining Gate codes at 8 px, the hierarchy sequence label at 8 px, and the mobile project outcome sentence at 10 px.

Smallest correction: enforce the 11 px honesty-text floor as a container invariant or add every missed semantic selector.

### F6 · Mobile information order — Medium

The optional GitHub connector appears above live NOW and evidence axes, lengthening the mobile scan to roughly 3.45 viewports. The non-authoritative connector should not delay the authoritative current-work and evidence summary.

Smallest correction: order NOW and evidence axes before GitHub on mobile while preserving desktop hierarchy.

## Prior false-completion regression

1. Stacked-sibling overlap metric: resolved by independent all-visible pairwise testing.
2. Document-only overflow metric: open; eight clipped axis values remain.
3. Fixture-only axes: resolved for real OUTCOME Package evidence.
4. Invented count fallbacks: resolved.
5. Hardcoded Korean group lookup: resolved with Package metadata and fail-closed validation.
6. Unpinned served artifact: partially resolved by safe receipt and asset-byte match; full tree-to-artifact reproducibility remains Release Audit scope.
7. New: geometry measures OUTCOME default only.
8. New: shared vocabulary maps raw axis `complete` to `Gate 완료`.
9. New: Stage state ignores pending evidence closure.

## Terminal boundary

Stage 6 is `NEEDS_REVISION`. Q1, Q2 and Q4 remain open. Stage 7 Release Audit must remain closed. This is independent QA evidence only; it is not Cherry acceptance, release approval or external outcome completion.
