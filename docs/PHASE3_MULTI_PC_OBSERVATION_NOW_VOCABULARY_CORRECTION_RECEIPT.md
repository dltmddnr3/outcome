# OUTCOME Phase 3 · Multi-PC Observation NOW Vocabulary Correction Receipt

상태: `CANDIDATE READY ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## Exact pins

- source commit: `8fe4d351924c16b1185e23fb5a2935f5a4dd16df`
- source tree: `b8c84d8286785001debe960364d4a301998915f1`
- implementation commit: `6155595684500e201192a0ab2096ead822abbde7`
- implementation tree: `3876b7d51b7c541cfc627c7bf495b080e8754687`
- implementation parent: `8fe4d351924c16b1185e23fb5a2935f5a4dd16df`
- amendment SHA-256: `6d95bda06d4537af282fc9c734dab06794f77b8c99053f8faa6b15c28db0f434`
- changed implementation paths: exactly `server/phase3-observation-relay.mjs`, `server/phase3-observation-relay.test.mjs`

## Correction

`now_summary` free-text normalization and denylist logic was removed. The relay now accepts only an exact primitive string from the six Planner-defined Korean states when availability is `available`, or explicit `null`. Missing values, all other strings, boxed values, symbols, objects, accessors, and Proxy values fail before state mutation. Idle, offline, unknown, stale, conflict, gap, and disconnect projections expose `now_summary: null`.

The accepted state is preserved byte-for-byte. It remains an activity observation only and carries no Gate progress, completion, approval, or dispatch authority.

## Failure-first and final evidence

- RED on prior implementation: focused relay `10 PASS / 5 FAIL`; failures covered unauthorized free text acceptance, explicit null rejection, unavailable-state non-null acceptance, and omitted rather than null public NOW.
- GREEN focused relay: `15/15 PASS`.
- exact vocabulary: `6/6` accepted only under `available`, each exact original preserved.
- unauthorized strings: all tracked prior F1/F5/F7 cases, former positive prose/URL/path controls, empty/whitespace/NFKC/fullwidth/percent/160/321-length variants rejected atomically.
- hostile values: boxed String, Symbol, object, array, accessor, and Proxy rejected without consuming evidence IDs; Proxy value trap was not touched.
- package model: `39/39 PASS`.
- mutation matrix: `32/32` local mutations returned `405`; API read-only JSON `28/28`; page empty-body boundary `0/4`.
- frontend: `89/89 PASS`.
- full server Node: `144/144 PASS`.
- full script + server Node: `172/172 PASS`.
- production build: `1652 modules · PASS`; assets `index-DgbgRsT8.js`, `index-R1nuadtV.css`.
- repository scope check: `PASS · 35 files scanned`.
- `git diff --check`: `PASS`.

## Preserved invariants

Materialization guards, exact synthetic source set, clock safety, ordering/gap/conflict behavior, disconnect/reconnect recovery, CAS, evidence continuity, disable/restore, response-clone failure, and reentrant-mutation protections remain covered by the focused and full regressions.

## Operation boundary

- actual device observation operations: `0`
- actual provider/session/thread/browser operations: `0`
- real credential/private-store access: `0`
- external network/hosted data operations: `0`
- runtime/API/UI/Gate/Map modifications: `0`
- push/deploy/release/external messages: `0`

## Rollback and residual state

Rollback is a revert of the implementation commit followed by this receipt commit; no external state exists to undo. O1-O6, actual two-location O2 proof, Phase 3, fresh independent QA, Release Audit, Cherry acceptance, and `EXTERNAL_OUTCOME_COMPLETE` remain open.
