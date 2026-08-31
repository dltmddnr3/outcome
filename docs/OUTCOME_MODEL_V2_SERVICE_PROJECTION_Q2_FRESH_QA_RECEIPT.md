# OUTCOME Model v2 Q2 coherent Slice B · fresh independent QA receipt

Status: `FAIL_UX_PRODUCT_QA_ONLY`

This receipt records fresh, isolated, read-only Q2 UX & Product QA. It does not modify product code or a Gate, promote Q2, perform Release Audit, imply Cherry acceptance, authorize deployment/release, close A5/C1, or advance the Phase.

## Immutable envelope

- Gate/predicate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md` / `Q2`
- QA handoff SHA-256: `c68b0869cd2c7b500dad02df8f5237d0031ad042eff2771410a2a668da870ef6`
- Exact source commit/tree/parent: `dd94e889ae1fedfd63fc5bb67c698b697cea7db9` / `a5b7c04844b2bffc991c6500324a6b840e1da9d2` / `5fa7477c5092d347b9f887c391da4369ce4fee51`
- Coherent product candidate: `1ab53276e8dc75b6b25089888bf5a29d47a5d7bd`; later commits through the source contain evidence only.
- B3 promotion receipt SHA-256: `7ba413266ca99d166f1c1f0cabec5c0850e4698dcd5919494e34f9ad24a19ba0`
- Q2/A5/C1 readback: all unchecked.

The canonical checkout's unrelated user-owned dirty state was preserved. QA used a fresh disposable detached checkout, task-owned evidence script, dependency link and Chromium profile with no install or fetch.

## Blocking findings

### F1 · P1 · Primary action answers expose internal identifiers instead of meaningful user actions

Expected: without opening technical/v1 detail, the owner can understand the next ready action and whether Cherry must act.

Actual: the primary Current Projection rendered `q2-independent-qa` and `verify-coherent-slice` for the ready fixture, and `resolve-blocker` for the blocker/decision fixture. These are internal kebab-case identifiers, not human-readable action descriptions. The server projection enforces `safeId` for `nextAction` and `cherryAction`, so these fields cannot carry the Korean explanatory text exercised by the presentation unit fixture. `readyBoundary` likewise renders raw stage identifiers.

Impact: questions 4 and 5 are technically locatable but not meaningfully answerable by a non-technical owner. DOM presence and sub-second visibility cannot establish comprehension. This violates the Q2 requirement for technical-detail interactions `0` and unambiguous five-question meaning.

Correction owner: Builder. Project separate public labels for boundary, next action and Cherry action under an exact server allowlist, retain identifiers only in collapsed technical evidence, and add built semantic tests using realistic source data.

### F2 · P1 · Mobile visual reading order conflicts with DOM and assistive-technology order

Expected: the primary five-question Current Projection precedes observed conversation on mobile in both visual and semantic reading order.

Actual: DOM and heading order at all widths is `Planner conversation` then `Current Projection`. Mobile CSS visually moves Current Projection to row 1 and conversation to row 2, yielding the opposite visual order. At desktop, conversation is both first in DOM and the left-hand first pane, so observed session activity competes with and precedes the canonical five-question source.

Impact: screen-reader/linear navigation encounters activity before Destination, gap, Now and next action, while a sighted mobile user sees the reverse. This creates two competing hierarchies and risks mistaking observed activity for progress, the exact Q2 ambiguity the Gate must disprove.

Correction owner: Builder. Put Current Projection before conversation in source order and use layout rules that preserve the same semantic order across viewports; re-test heading/landmark and visual order independently.

## Five-question and built evidence

Ready fixture, secondary disclosures collapsed:

- Desktop `1440x900`: all five fields visible in `736ms`; project-selection interactions `1`; technical disclosure interactions `0`.
- Mobile `390x844`: visible in `716ms`; navigation/project interactions `2`; technical disclosure interactions `0`.
- Narrow mobile `320x720`: visible in `724ms`; navigation/project interactions `2`; technical disclosure interactions `0`.
- Destination and acceptance gap were clear (`안전한 Model v2 전환`, `2 / 5`); Now was truthful; null Cherry action correctly omitted its surface.
- Questions 4/5 failed semantic comprehension because their values were raw identifiers, as F1 records.

Blocker/decision fixture rendered `blocked`, delivery-unknown and blocked observations without running/completed language, exposed a Cherry-action surface, and preserved observed-only conversation. Its action value remained the ambiguous raw identifier in F1.

At `1440`, `390` and `320`: nonblank root, horizontal overflow `0`, card overlap `0`, reduced-motion running animations `0`, page errors `0`, synthetic composer/streaming/tool controls `0`, completion-authority true markers `0`. Mobile minimum visible target was `44px`. Desktop 200% zoom retained horizontal overflow `0`. Secondary v1 disclosure stayed collapsed and visible technical receipt/hash/role-binding content was `0`.

## Regression and hostile evidence

- Focused B1-B3 frontend: `78/78 PASS` across `4/4` files.
- Full tracked frontend: `99/99 PASS` across `7/7` files.
- Account plus projection Node: `46/46 PASS` (`33/33` account, `13/13` projection).
- Production build: PASS; TypeScript plus Vite, `1,654` modules transformed, exit `0`, built in `715ms`.
- Seven server-owned states have distinct state codes and labels and do not claim running/progress. Auth/session/owner, logout/recovery, exact two-project allowlist, unmatched-project denial, read-only authority and project switching remained green.
- Hostile event/root accessors, Proxies, symbols, non-enumerable descriptors, cycles, unexpected keys, identifiers, hashes, local paths, credentials, raw prompt/result and registry/provider payloads failed closed in the checked-in suites; trap execution `0`.

## Counters and verdict

- `automatic_retry_count`: `0`
- `product_retry_count`: `0`
- `mutation_count`: `0`
- `identifiers_shared`: `0` real identifiers; browser fixtures were synthetic
- `runtime_error_count`: `0`
- `browser_error_count`: `0`
- `residue_count`: `0` after build output, evidence script, dependency link, browser profile and disposable worktree cleanup

`FAIL_UX_PRODUCT_QA_ONLY`

Q2 evidence promotion remains closed. A new immutable Builder correction and fresh independent QA are required. This verdict is not A5/C1 closure, Release Audit, Cherry acceptance, deployment, Production, release or Phase transition.
