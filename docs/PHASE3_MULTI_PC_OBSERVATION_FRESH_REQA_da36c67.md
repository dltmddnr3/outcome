# OUTCOME Phase 3 · Multi-PC Observation Fresh Independent Re-QA

상태: `FAIL · INDEPENDENT QA ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `5e7274b9581b24d5221289f4da6b936625c8f001`
- receipt tree: `254e1ec459c50597904ad37bbe2ace08577bf941`
- receipt parent: `da36c673d52219a52ac06b35883a6ecc84e6cf06`
- implementation commit: `da36c673d52219a52ac06b35883a6ecc84e6cf06`
- implementation tree: `2f957f5539dc230f8459f172de3ae6e369d728ab`
- implementation parent: `8c5f4dae7194311c7c3a7ec74511c2c1d1600ad0`
- brief SHA-256: `6cf7a7a77d1bac63e863e78cf645cb4887118004f4cf9a7384c8fe083bb9682f`
- isolated worktree: `/tmp/outcome-phase3-fresh-reqa.z9zd1H`, created detached from the exact receipt head; the canonical dirty checkout was not modified
- implementation changed paths: exactly `server/phase3-observation-relay.mjs` and `server/phase3-observation-relay.test.mjs`
- receipt changed path: exactly `docs/PHASE3_MULTI_PC_OBSERVATION_PRIVACY_SCOPE_CLOCK_CORRECTION_RECEIPT.md`

Git object types, commit/tree/parent identities, direct ancestry, brief digest, changed-path scope, and diff cleanliness were resolved independently. The correction receipt and its tests were treated as hypotheses.

## Verdict

`FAIL`

F2 exact-source-set semantics and F3 clock normalization withstand fresh refutation. F1 remains incomplete: ordinary delimiter, locator, path, and encoding-adjacent representations are accepted and exposed as fresh public NOW. A separate pre-validation reentrancy path also permits caller code to commit a relay mutation before the outer ingest fails. O1-O6 and Phase 3 remain open; this report closes no Gate.

## Blocking findings

### F1 · HIGH · Prohibited summary families remain bypassable through ordinary representations

- Contract: raw session/thread identifiers, provider locators, prompt/result originals, credentials, absolute local paths, and encoded-adjacent equivalents must fail before mutation; ordinary public Korean/English text, relative paths, and public HTTPS must remain usable.
- Location: `server/phase3-observation-relay.mjs:7-21` and `server/phase3-observation-relay.mjs:47-50`.
- Cause: the denylist matches selected literal separators and schemes without canonicalizing ordinary encodings or delimiter variants. It also misses a generic non-HTTPS locator, file URI, quoted absolute path, and fullwidth delimiter.
- Independent reproduction: ingest valid synthetic events whose `now_summary` is each of:
  - `SeSsIoN_ID | synthetic-opaque-123`
  - `THREAD.ID=synthetic-opaque-123`
  - `session_id%3Dsynthetic-opaque-123`
  - `provider_locator | synthetic://opaque-123`
  - `SYNTHETIC://opaque-123`
  - `API_KEY | synthetic-not-real`
  - `api_key%3Dsynthetic-not-real`
  - `file:///opt/synthetic/private.txt`
  - `path="/opt/synthetic/private.txt"`
  - `%2Fopt%2Fsynthetic%2Fprivate.txt`
  - `prompt%3Draw synthetic request`
  - `RESULT／raw synthetic response`
- Expected: all 12 calls throw public-safe `summary_prohibited`, preserve deep-equal state, and leave no raw public value.
- Actual: 12/12 return `status: accepted`; 12/12 exact values survive in `read().projections[0].now_summary`. Eleven appear byte-for-byte in JSON; the quoted-path value is JSON-escaped but round-trips unchanged.
- Non-overblocking control: 10/10 legitimate controls were accepted, covering Korean/English public prose, API/provider/result/prompt ordinary prose, `docs/...`, `./docs/...`, `../docs/...`, and `https://example.invalid/public/status?page=summary`.
- Impact: O5 public projection can still preserve prohibited raw values, so the correction's 24-case scan is not contract-complete and can again report a false zero-hit result.
- Fix owner: Builder. Canonicalize and validate bounded alternate representations before matching, cover delimiter/scheme/path families structurally, and retain explicit positive controls so public text, relative paths, and public HTTPS are not overblocked. Add isolated tests for each reproduction with deep-equal failure and semantic post-serialization checks.

All reproduction strings are synthetic placeholders; no real identifier, locator, prompt/result, credential, or path was used.

### F4 · HIGH · Enumerable input getter can commit a relay mutation before ingest atomicity begins

- Contract: hostile/caller-controlled inputs and re-entrant mutation must fail closed with no state change and contiguous evidence IDs.
- Location: `server/phase3-observation-relay.mjs:70-86` reads caller properties before `ingest` enters `mutate` at lines 172-174; the reentrancy guard is activated only inside `mutate` at lines 150-154.
- Independent reproduction: create an otherwise valid plain event and define an enumerable `project_id` getter that calls `relay.disable()` and returns `outcome`; snapshot the empty enabled relay, then call `ingest`.
- Expected: `input_invalid` or `reentrant_mutation`, deep-equal state, and no evidence ID consumed.
- Actual: the getter commits `disable`; outer ingest then throws `Phase3ObservationError: relay_disabled`. State changes to `enabled: false` and evidence ID `1` records `action: disable`.
- Impact: an ingest that reports failure can still change relay availability and append evidence. This breaks the required hostile-input/reentrancy atomicity boundary and can create misleading recovery history.
- Fix owner: Builder. Reject accessor-bearing input records before property evaluation or extend the mutation/reentrancy guard across input materialization and validation. Add getter-driven reentry tests for ingest and the other mutation envelopes, asserting deep-equal state and unconsumed IDs.

## Fresh evidence that passed

- F2: 14 invalid source configurations covering missing/extra/unknown/duplicate and primitive/type/coercion variants all fail `configuration_invalid`; exactly `source-a` plus `source-b` succeeds in either order.
- F3: `NaN`, both infinities, both finite out-of-ISO-range endpoints, string, boxed number, null, and a throwing clock all normalize to `clock_unavailable`; recovery preserves empty deep-equal state and the first successful evidence ID is `1`.
- exact duplicate is idempotent; conflicting duplicate, out-of-order, and gap preserve the last valid sequence, remove NOW, and append contiguous safe evidence.
- gap and disconnect reject ordinary ingest recovery; explicit reconnect with source and sequence CAS opens a new monotonic baseline.
- missing, stale, future-outside-tolerance, idle, offline, unknown, and conflicting states expose no NOW or progress/completion/approval/dispatch authority.
- project, role, binding version, source, sequence CAS, and registry revision CAS failures preserve deep-equal state.
- throwing/invalid clock, clock-driven reentry, and response clone failure are public-safe and atomic.
- disable blocks ingest/disconnect/reconnect, preserves the read-only projection/evidence view, and restore requires registry revision CAS.
- the public projection and evidence expose only the contracted field sets; no active/progress/Gate/completion authority is synthesized.

These passing observations are candidate evidence only. They do not close O1, O3, O4, O5, O6, Phase 3, Release Audit, Cherry acceptance, or external completion.

## Regression evidence

| Check | Result |
| --- | --- |
| Builder focused relay suite | `12/12 PASS` |
| Fresh independent adversarial runner | `35 reported tests · 21 PASS / 14 FAIL`; 13 distinct refutations plus the aggregate F1 parent failure |
| Safe-summary positive controls | `10/10 PASS` |
| Package model | `39/39 PASS` |
| Mutation assertion unit suite | `3/3 PASS` |
| Injected no-network mutation matrix | `32/32 = 405 · API read_only JSON 28/28` |
| Frontend suite | `89/89 PASS` |
| Full Node suite | `141/141 PASS` |
| Production build | `1652 modules · PASS` |
| Candidate `git diff --check` | `PASS` |
| Candidate changed-path scope | `PASS · 2/2 declared implementation paths` |
| Repository scope check | `PASS · 35 files scanned` |

The isolated worktree used the canonical checkout's existing `node_modules` through a temporary local symlink, so no install or package-lock mutation occurred. The injected mutation matrix used a synthetic fetch implementation and made no network call. The repository's full Node suite used only its existing local `127.0.0.1` synthetic harnesses; no remote host was contacted. Temporary QA files, symlink, and build output are excluded from the report commit.

## Boundary and residual state

- actual two-location O2 proof: `OPEN/LOCKED`
- actual device/provider/session/thread/browser operations: `0`
- real credential/private-store access: `0`
- external network operation: `0`; no real endpoint was contacted
- product/runtime/API/UI/registry/Gate/Map modification: `0`
- push/deploy/release/external message: `0`
- correction candidate: `NO_GO` pending Builder correction and another fresh independent re-QA
- O1, O3, O4, O5, O6: `OPEN`
- Phase 3, Release Audit, Cherry acceptance, and `EXTERNAL_OUTCOME_COMPLETE`: `OPEN`

This is an independent QA verdict for the exact pinned local synthetic candidate only. It grants no progress, completion, approval, dispatch, release, provider, production, or external authority.
