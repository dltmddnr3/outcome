# OUTCOME Phase 3 · Multi-PC Observation Fresh Independent QA

상태: `FAIL · INDEPENDENT QA ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `4c78a686f2dfb5664a86061f94488c70afdebfcf`
- receipt tree: `f494f8d3a4c995cc95be8e6dcdd5ffa1bc2c371c`
- receipt parent: `821e8cfd550f69d8e5667870b4ab5fe543d05c19`
- implementation commit: `821e8cfd550f69d8e5667870b4ab5fe543d05c19`
- implementation tree: `0e01d3cd0a2eb67505d2b508f4f571775f4d3ef4`
- implementation parent: `f9364ca87e80b8cb0b59d94f68a4c99c9eeb760d`
- brief SHA-256: `6cf7a7a77d1bac63e863e78cf645cb4887118004f4cf9a7384c8fe083bb9682f`
- isolated worktree: `/Users/rosum/.codex/worktrees/phase3-observation-qa.fkxCBC`, created from the exact receipt head; canonical dirty checkout was not modified
- implementation changed paths: exactly `server/phase3-observation-relay.mjs` and `server/phase3-observation-relay.test.mjs`
- receipt changed path: exactly `docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_RECEIPT.md`

Git object types, commit/tree/parent identities, direct ancestry, changed-path scope, and the brief digest were resolved independently. Builder receipt and tests were treated as hypotheses.

## Verdict

`FAIL`

The ordering, freshness, recovery, CAS, primitive-schema, no-authority, and ordinary failure-atomicity paths withstand fresh refutation. The candidate does not satisfy the O5 input-redaction boundary, does not enforce the brief's exact two synthetic source hosts, and does not safely classify a finite clock outside the ISO timestamp range. O1 and O3-O6 remain open; this report closes no Gate.

## Blocking findings

### F1 · HIGH · Prohibited raw values are accepted and exposed as fresh NOW

- Contract: raw session/thread IDs, UUID-shaped identifiers, provider locators, prompt/result originals, credentials, and local POSIX/Windows paths must be rejected at input; projection, serialization, evidence, and loggable values must remain public-safe.
- Location: `server/phase3-observation-relay.mjs:6-7` and `server/phase3-observation-relay.mjs:33-35`.
- Cause: UUID matching is restricted to versions 1-5; POSIX matching covers only six named roots; Windows matching requires a drive plus backslash; prompt/result matching requires a colon; raw session-ID, provider-locator, and API-key shapes have no complete boundary.
- Independent reproduction: ingest otherwise valid synthetic events whose `now_summary` is each of `session_id=synthetic-opaque-123`, a standalone synthetic UUIDv7, `codex://synthetic/opaque-123`, `/etc/passwd`, `/opt/outcome/private.json`, a synthetic `C:/...` path, a synthetic UNC path, `prompt=...`, `result=...`, or `api_key=sk-synthetic-not-a-real-secret`.
- Expected: every ingest throws the public-safe `summary_prohibited` error and state remains deep-equal.
- Actual: all 10 events return `status: accepted`; `read().projections[0].now_summary` and its JSON serialization preserve the exact prohibited input as fresh NOW.
- Impact: the public observation projection can disclose every prohibited data family named by O5. The Builder's prohibited scan is a false negative for these ordinary representations.
- Fix owner: Builder. Replace the enumerated substring filter with a contract-complete public-safe validator/redactor covering delimiter variants, UUIDv7/all UUID shapes, provider locator schemes, credential/key shapes, generic absolute POSIX paths, drive paths using either separator, and UNC paths. Add one isolated negative test per family and assert deep-equal no mutation plus serialized/loggable zero hits.

All reproduction values were synthetic literals; no real identifier, locator, prompt/result, credential, or path was used.

### F2 · MEDIUM · Constructor accepts synthetic source hosts outside `source-a` and `source-b`

- Contract: the brief permits only the synthetic opaque source hosts `source-a` and `source-b` for this candidate.
- Location: `server/phase3-observation-relay.mjs:67` and `server/phase3-observation-relay.mjs:82`.
- Independent reproduction: construct with `source_hosts: ['source-c']` and otherwise valid configuration.
- Expected: `configuration_invalid` before state creation.
- Actual: construction succeeds and `source-c` can become a projected/evidence scope when supplied by an event.
- Impact: the candidate can represent an undeclared synthetic observation location, weakening source containment and making source-count evidence unsuitable for O2 or any real-location inference.
- Fix owner: Builder. Constrain configured source hosts to the exact authorized set for this slice, and add constructor tests for unknown but regex-valid `source-*` values.

### F3 · MEDIUM · Finite out-of-range clock escapes as raw `RangeError`

- Contract: throwing or invalid clocks fail closed before commit with public-safe behavior and deep-equal state.
- Location: `server/phase3-observation-relay.mjs:99-107` accepts every finite number, while `server/phase3-observation-relay.mjs:128-132` later calls `new Date(clock).toISOString()`.
- Independent reproduction: use the synthetic deterministic clock value `9000000000000000` and ingest a valid event.
- Expected: `Phase3ObservationError` with `clock_unavailable`; after restoring the clock, state is deep-equal empty and evidence IDs remain unconsumed.
- Actual: raw `RangeError: Invalid time value` with no safe code. State is nevertheless deep-equal empty after the clock is restored.
- Impact: atomicity survives, but invalid-clock classification and the public-safe failure contract do not.
- Fix owner: Builder. Validate that the clock is within the ECMAScript/ISO materialization range inside `safeNow`, normalize conversion failures to `clock_unavailable`, and retain the pre/post deep-equal assertion.

## Fresh contract evidence that passed

The independent adversarial suite used boxed primitives, Symbols, objects, methods/functions, Proxies, and throwing `toString`/`valueOf` values across constructor lists/scalars and every mutation boundary. The following passed independently:

- constructor and mutation primitives reject without caller coercion or leaked caller exceptions
- failed ingest/disconnect/reconnect/restore/disable inputs preserve deep-equal state
- exact duplicate is idempotent; conflicting duplicate, out-of-order, and gaps preserve the last valid sequence and remove NOW
- gaps and disconnect cannot be bypassed by ingest; explicit reconnect with sequence CAS opens a new monotonic baseline
- stale, future-outside-tolerance, idle, offline, unknown, and conflicting states expose no NOW
- wrong project, role, binding version, source, stale sequence CAS, and registry-revision CAS fail without mutation
- evidence IDs remain contiguous across accepted, conflict, disconnect, reconnect, disable, and restore transitions
- throwing, NaN, infinite, boxed, and Symbol clock outputs; re-entrant clock mutation; and response clone failure are public-safe and atomic
- disable blocks ingest, disconnect, and reconnect while preserving read-only projection/evidence; restore requires registry revision CAS
- public state contains no `active`, Gate, progress, completion, approval, or dispatch field or authority

These passing observations are candidate evidence only. They do not close O1, O3, O4, O6, Phase 3, Release Audit, Cherry acceptance, or external completion.

## Regression evidence

| Check | Result |
| --- | --- |
| Builder focused relay suite | `9/9 PASS` |
| Fresh independent adversarial runner | `23 reported tests · 10 PASS / 13 FAIL`; 12 distinct refutations, plus one aggregate parent failure |
| Package model | `39/39 PASS` |
| Mutation matrix | `local 32/32 = 405 · API read_only JSON 28/28 · empty page boundary 0/4` |
| Frontend suite | `89/89 PASS` |
| Full Node suite | `138/138 PASS` |
| Production build | `1652 modules · PASS` |
| Candidate `git diff --check` | `PASS` |
| Candidate changed-path scope | `PASS · 2/2 declared implementation paths` |

The isolated worktree used the canonical checkout's pre-existing `node_modules` through a temporary local symlink, so dependency-backed checks required no install or package-lock mutation. The symlink and throwaway adversarial suite were removed before the report commit; no dependency or build output is part of the commit.

## Boundary and residual state

- actual two-location O2 proof: `OPEN/LOCKED`
- actual device/provider/session/thread/browser operations: `0`
- real credential/private-store access: `0`
- real/external network operation: `0`
- product/runtime/API/UI/registry/Gate/Map modification: `0`
- push/deploy/release/external message: `0`
- implementation candidate: `NO_GO` pending Builder correction and fresh re-QA
- O1, O3, O4, O5, O6: `OPEN`
- Phase 3, Release Audit, Cherry acceptance, and `EXTERNAL_OUTCOME_COMPLETE`: `OPEN`

This is an independent QA verdict for the exact pinned local synthetic candidate only. It grants no progress, completion, approval, dispatch, release, provider, or production authority.
