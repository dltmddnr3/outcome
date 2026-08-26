# OUTCOME Phase 3 · Multi-PC Observation Fresh Independent Re-QA v4

상태: `PASS_INDEPENDENT_QA_ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `ab4d3bbc9a40f14e2e48abdf5e416471b88d6f14`
- receipt tree: `93ff58511e3b879e0fa31cd93ee731f13c4b1656`
- receipt parent: `6155595684500e201192a0ab2096ead822abbde7`
- implementation commit: `6155595684500e201192a0ab2096ead822abbde7`
- implementation tree: `3876b7d51b7c541cfc627c7bf495b080e8754687`
- implementation parent: `8fe4d351924c16b1185e23fb5a2935f5a4dd16df`
- amendment SHA-256: `6d95bda06d4537af282fc9c734dab06794f77b8c99053f8faa6b15c28db0f434`
- isolated worktree: `/private/tmp/outcome-phase3-vocabulary.8fe4d35`, at the exact receipt head before this report
- implementation changed paths: exactly `server/phase3-observation-relay.mjs` and `server/phase3-observation-relay.test.mjs`
- receipt changed path: exactly `docs/PHASE3_MULTI_PC_OBSERVATION_NOW_VOCABULARY_CORRECTION_RECEIPT.md`
- receipt source parity: both implementation paths are byte-identical between the implementation commit and receipt head

Git object types, commit/tree/parent identities, direct ancestry, changed-path scope, source parity, amendment digest, clean starting state, and diff cleanliness were resolved independently. The correction receipt, earlier QA reports, and committed tests were treated as hypotheses.

## Verdict

`PASS_INDEPENDENT_QA_ONLY`

No actionable defect was reproduced in the exact pinned local synthetic candidate. This verdict accepts only the independent QA boundary. It does not close O1-O6, O2, Phase 3, any Gate or Map item, Release Audit, Cherry acceptance, release, or external completion.

## Finite NOW vocabulary evidence

The implementation admits exactly these six primitive Korean strings plus explicit `null`:

- `작업 준비 중`
- `구현 진행 중`
- `테스트 실행 중`
- `검수 진행 중`
- `결과 정리 중`
- `응답 대기 중`

Fresh independent checks exercised all six through both `ingest` and the nested `reconnect.event` envelope. Every accepted string was preserved byte-for-byte in the mutation response and subsequent public projection.

- explicit `null` was accepted and projected as `null` for `available`, `idle`, `offline`, and `unknown` through both event envelopes;
- non-null vocabulary was accepted only when availability was exactly `available`;
- missing `now_summary`, boxed String, Symbol, object, array, number, boolean, function, and Proxy values failed before mutation;
- empty, ASCII whitespace, leading/trailing/newline variants, removed-space variants, ideographic-space/fullwidth variants, NFKD variants, percent-encoded text, punctuation suffixes, repetition, and lengths `160`, `321`, and `10000` all failed atomically;
- all exact prior F1, F5, and F7 reproductions plus formerly safe Korean/English prose, prompt/result wording, relative path, public HTTPS, percentage, and benign fullwidth controls failed atomically in both event envelopes: `69 × 2 = 138/138` negative envelope checks;
- every negative left a deep-equal state, exposed no candidate input, consumed no evidence ID, and allowed the next valid ingest to begin at evidence ID `1`.

The source is a direct primitive-string membership check against a six-entry `Set`; it performs no coercion, case folding, trimming, NFKC normalization, decoding, free-text classification, URL allowance, or path allowance. Therefore a string outside the six exact values cannot satisfy the acceptance predicate.

## Availability, ordering, recovery, and authority evidence

- fresh `available` records expose their exact accepted NOW; the freshness boundary remains fresh at `60000 ms` and becomes stale with `now_summary: null` at `60001 ms`;
- future time is accepted at the exact `+5000 ms` tolerance and rejected atomically at `+5001 ms`, leaving no projection and therefore no public NOW;
- `idle`, `offline`, `unknown`, stale, duplicate conflict, out-of-order conflict, sequence gap, resync-required conflict, and disconnect expose `now_summary: null`;
- exact duplicate remains idempotent; conflict and gap preserve the last accepted sequence; explicit reconnect requires source and sequence CAS and opens a new monotonic baseline;
- exact authorized source set remains only `source-a` plus `source-b`, in either order; missing, extra, duplicate, and unknown sources fail closed;
- invalid, non-finite, boxed, throwing, and finite out-of-ISO-range clocks normalize to `clock_unavailable` without state or evidence mutation;
- project, role, binding version, source, sequence, and registry revision boundaries remain fail-closed;
- disable blocks ingest, disconnect, and reconnect; restore requires exact registry CAS; failure states remain deep-equal;
- evidence IDs remain append-only and contiguous, and public projection/evidence expose only the contracted key sets;
- serialized state contains no progress, completion, approval, dispatch, or Gate authority field. NOW remains activity observation only.

## Hostile shape, clone, and reentry evidence

Fresh attacks covered accessor descriptors, symbol keys, and `getPrototypeOf`, `ownKeys`, and `getOwnPropertyDescriptor` Proxy traps across ingest, disconnect, reconnect, nested reconnect event, and restore. Unused hostile disable input was not evaluated. Nested mutations attempted from accessors/traps either failed as invalid input before evaluation or tripped the reentry guard; every outer failure preserved deep-equal state.

Response materialization was independently forced to throw and to swallow a nested `disable()` attempt for each of ingest, disconnect, reconnect, disable, and restore. All ten cases failed with `materialization_failed` or `reentrant_mutation`, committed no draft state, and consumed no evidence ID.

## Regression and scope evidence

| Check | Result |
| --- | --- |
| Builder focused relay suite | `15/15 PASS` |
| Fresh independent adversarial runner | `9/9 test groups PASS` |
| Historical/free-text negative event envelopes | `138/138 PASS` |
| Exact six vocabulary through ingest and reconnect | `12/12 PASS · exact original preserved` |
| Explicit null availability/envelope matrix | `8/8 PASS` |
| Package model | `39/39 PASS` |
| Mutation assertion unit suite | `3/3 PASS` |
| Injected no-network mutation matrix | `local 32/32 = 405 · API read_only JSON 28/28 · empty page boundary 0/4` |
| Frontend Vitest suite | `89/89 PASS` |
| Full server Node suite | `144/144 PASS` |
| Full script + server `.mjs` Node suite | `172/172 PASS` |
| Production build | `1652 modules · PASS` |
| Repository scope check | `PASS · 35 files scanned` |
| Candidate and report `git diff --check` | `PASS` |

The independent runner and acceptance ledger remained under `/private/tmp` and are not repository artifacts. The isolated worktree used the canonical checkout's existing `node_modules` through a temporary local symlink; the symlink and build output are absent from this report commit.

## Operation boundary and residual state

- actual device observation operations: `0`
- actual provider/session/thread/browser operations: `0`
- real credential/private-store access: `0`
- external network or hosted-data operations: `0`
- product/runtime/API/UI/registry/Gate/Map modifications: `0`
- push/deploy/release/external messages: `0`
- actual two-location O2 proof: `OPEN/LOCKED`
- O1, O3, O4, O5, O6: `OPEN`
- Phase 3, Release Audit, Cherry acceptance, and `EXTERNAL_OUTCOME_COMPLETE`: `OPEN`

This is an independent QA verdict for the exact pinned local synthetic candidate only. It grants no progress, completion, acceptance, approval, dispatch, release, provider, production, or external authority.
