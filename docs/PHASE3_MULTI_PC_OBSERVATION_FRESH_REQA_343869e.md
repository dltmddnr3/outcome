# OUTCOME Phase 3 · Multi-PC Observation Fresh Independent Re-QA v2

상태: `FAIL · INDEPENDENT QA ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `6fb1e080dc27775f07ecff31913559fbd90aae12`
- receipt tree: `672006d7ab86e806d223450740e633b10f9f332e`
- receipt parent: `343869e4d03a6df54f56c3704942fd80a54b9e9e`
- implementation commit: `343869e4d03a6df54f56c3704942fd80a54b9e9e`
- implementation tree: `94044647692def28319abed3882cfe11b541d450`
- implementation parent: `d9d526cfedf432e47c52355fc7a8682e05aa14db`
- brief SHA-256: `6cf7a7a77d1bac63e863e78cf645cb4887118004f4cf9a7384c8fe083bb9682f`
- isolated worktree: `/private/tmp/outcome-phase3-observation-fresh-reqa-v2.ZVQLYU`, created from the exact receipt head; the canonical dirty checkout was not modified
- implementation changed paths: exactly `server/phase3-observation-relay.mjs` and `server/phase3-observation-relay.test.mjs`
- receipt changed path: exactly `docs/PHASE3_MULTI_PC_OBSERVATION_CANONICALIZATION_REENTRANCY_CORRECTION_RECEIPT.md`
- receipt source parity: both implementation paths are byte-identical between the implementation commit and receipt head

Git object types, commit/tree/parent identities, direct ancestry, changed-path scope, source parity, brief digest, and diff cleanliness were resolved independently. The correction receipt, prior QA reports, and committed tests were treated as hypotheses.

## Verdict

`FAIL`

The exact prior F1 12-case bypass set and exact prior F4 getter exploit withstand fresh refutation. The broader required canonicalization audit found 17 new ordinary representations that are accepted and exposed unchanged as fresh public NOW, and the promised canonical expansion bound is absent on the no-percent-decode path. Input-materialization and response-materialization atomicity, ordering, clocks, recovery, CAS, and no-authority behavior otherwise withstand the bounded synthetic attacks. This report closes no Gate.

## Blocking findings

### F5 · HIGH · Delimiter, malformed-escape, single-colon scheme, and raw-field variants survive into public NOW

- Contract: raw session/thread identifiers, provider locators, prompt/result originals, credentials/keys, file/non-HTTPS locators, paths, and encoded-adjacent equivalents must fail before mutation. Case, delimiter, NFKC/fullwidth, and percent variants are part of this re-QA boundary.
- Location: `server/phase3-observation-relay.mjs:7-21` and `server/phase3-observation-relay.mjs:65-79`.
- Cause: field-name patterns enumerate selected separators; scheme detection requires `://`; percent canonicalization starts only when a complete `%HH` triplet exists. Slash, colon, middle-dot, incomplete/invalid percent escapes, and RFC-style single-colon schemes therefore bypass validation.
- Independent reproduction: each otherwise valid synthetic event used one `now_summary` from this set:
  - delimiter/field forms: `session/id=synthetic-opaque-123`, `thread:id=synthetic-opaque-123`, `thread・id=synthetic-opaque-123`, `session token | synthetic-opaque-123`, `thread/token=synthetic-opaque-123`, `provider/locator=synthetic:opaque-123`, `api/key=synthetic-not-real`, `private/key=synthetic-not-real`, `result・raw synthetic response`
  - malformed escapes: `session_id%GG=synthetic-opaque-123`, `api_key%=synthetic-not-real`, `prompt%2=raw synthetic request`
  - schemes: `FILE:/opt/synthetic/private.txt`, `mailto:synthetic@example.invalid`, `urn:synthetic:opaque-123`, `ssh:synthetic@example.invalid`, `synthetic:opaque-123`
- Expected: all 17 calls throw public-safe `summary_prohibited`, preserve deep-equal state, expose no raw input, and consume no evidence ID.
- Actual: `17/17` return `status: accepted`; `17/17` exact original strings round-trip through `read().projections[0].now_summary` as fresh NOW.
- Impact: O5's public projection boundary remains bypassable by ordinary representations across every named sensitive family. The focused suite's zero-hit claim is not contract-complete.
- Fix owner: Builder. Replace separator and scheme enumeration with a bounded structural policy that rejects prohibited semantic labels across allowed delimiter classes, rejects malformed/incomplete percent escape attempts, and accepts only the explicitly safe URL scheme. Add isolated negatives for every reproduction and retain positive controls to prevent overblocking.

All reproduction values are synthetic placeholders. No real identifier, locator, prompt/result, credential, key, or path was used.

### F6 · MEDIUM · NFKC expansion bound is skipped when no percent decode occurs

- Contract: canonicalization is bounded; expansion beyond the declared validation-copy limit must fail closed while accepted safe text preserves its original representation.
- Location: `server/phase3-observation-relay.mjs:65-72`.
- Cause: the `canonical.length > 320` guard exists only inside the percent-decode loop. Initial NFKC normalization is not checked when the input contains no complete percent triplet.
- Independent reproduction: use a 20-code-unit synthetic summary made from 20 repetitions of `U+FDFA`; NFKC expands the validation copy to 360 code units.
- Expected: public-safe `summary_prohibited`, deep-equal empty state, and the first later valid evidence ID remains `1`.
- Actual: ingest returns `status: accepted`; the original 20-code-unit text is preserved in fresh public NOW even though its canonical validation copy is 360 code units.
- Impact: the correction receipt's bounded canonicalization claim is false for the initial normalization path. Input length is still capped at 160, so this finding does not demonstrate unbounded memory growth, but it violates the explicit validation boundary.
- Fix owner: Builder. Apply the canonical length check immediately after initial NFKC and after every decode/normalization pass; add exact 320/321 canonical-length boundary tests and verify original safe text remains preserved only on acceptance.

## Exact prior findings re-tested

- Prior F1: `12/12 PASS`. Case variants, fullwidth slash, one-pass percent, file URI, locator, key, encoded path, prompt/result, and every exact prior reproduction now fail atomically as `summary_prohibited`.
- Prior F4: `PASS`. An enumerable `project_id` getter that swallows a nested `disable()` attempt cannot mutate state or consume evidence. The same property-materialization boundary also passes for disconnect, reconnect, nested reconnect event, and restore.
- One/two/remaining encoding: one-pass and two-pass prohibited values reject; a three-pass value rejects because an encoded triplet remains. NFKC/fullwidth prohibited controls pass `3/3`.
- Path coverage: POSIX, Windows, UNC, and quoted absolute-path negatives pass `9/9`.
- Safe controls: Korean/English prose, ordinary API/provider/prompt/result wording, relative paths, public HTTPS, literal percentage text, and benign fullwidth text pass `13/13`; every accepted control preserves the exact original string. Original lengths 160/161 accept/reject at the intended boundary.

## Atomicity, lifecycle, and semantic evidence that passed

The independent runner executed `104` assertions: `86 PASS / 18 FAIL`. The 18 failures are exactly F5's 17 accepted prohibited summaries plus F6's one accepted expansion case.

- `32/32` hostile materialization checks pass across ingest, disconnect, reconnect, disable, and restore: direct accessors; `getPrototypeOf`, `ownKeys`, and `getOwnPropertyDescriptor` Proxy traps; nested reconnect-event accessors; unused hostile disable input; normalized trap exceptions; throwing response clone; and response clone that swallows a nested mutation.
- Every failed hostile call has no caller exception leakage, deep-equal state, and no consumed evidence ID. The combined lifecycle sequence preserves contiguous IDs `1..8` across ingest, duplicate/conflict, reconnect, gap, disconnect, reconnect, disable, and restore.
- Exact authorized source set only; project/role/binding/source allowlists; primitive schema; invalid and out-of-ISO clock; future tolerance at `+5000/+5001 ms`; freshness at `60000/60001 ms`; duplicate/conflict/out-of-order/gap; disconnect/reconnect/resync; disabled ingest/disconnect/reconnect; sequence and registry CAS; and restore all pass.
- idle, offline, unknown, stale, future, and conflicting projections expose no NOW and synthesize no active/progress/Gate/completion/approval/dispatch authority.
- Public projection and evidence retain only the contracted key sets; safe evidence IDs remain append-only and contiguous.

These passing observations are candidate evidence only. They do not close O1, O3, O4, O5, O6, Phase 3, Release Audit, Cherry acceptance, or external completion.

## Regression and scope evidence

| Check | Result |
| --- | --- |
| Builder focused relay suite | `14/14 PASS` |
| Fresh independent adversarial runner | `104 assertions · 86 PASS / 18 FAIL` |
| Exact prior F1 / exact prior F4 | `12/12 PASS · PASS` |
| Safe positive controls | `13/13 PASS · exact original preserved` |
| Package model | `39/39 PASS` |
| Mutation assertion unit suite | `3/3 PASS` |
| Injected no-network mutation matrix | `local 32/32 = 405 · API read_only JSON 28/28 · empty page boundary 0/4` |
| Frontend component suite | `86/86 PASS` |
| Full Vitest suite | `89/89 PASS` |
| Full server Node suite | `143/143 PASS` |
| Full script + server `.mjs` Node suite | `171/171 PASS` |
| Production build | `1652 modules · PASS` |
| Candidate `git diff --check` | `PASS` |
| Candidate changed-path scope | `PASS · 2/2 declared implementation paths` |
| Repository scope check | `PASS · 35 files scanned` |

An additional unfiltered `node --test` discovery run reported `184/186 PASS`: Node directly selected two TypeScript tests whose extensionless TypeScript imports require the Vitest resolver. Both files pass in the intended `89/89` Vitest run, and neither file is in the candidate diff. This is a runner-discovery incompatibility, not candidate evidence. The isolated worktree used the canonical checkout's existing `node_modules` through a temporary local symlink; the symlink and build output are absent from this report commit.

## Boundary and residual state

- actual two-location O2 proof: `OPEN/LOCKED`
- actual device observation operations: `0`
- actual provider/session/thread/browser operations: `0`
- real credential/private-store access: `0`
- external network operations: `0`
- product/runtime/API/UI/registry/Gate/Map modifications: `0`
- push/deploy/release/external messages: `0`
- implementation candidate: `NO_GO` pending Builder correction and another fresh independent re-QA
- O1, O3, O4, O5, O6: `OPEN`
- Phase 3, Release Audit, Cherry acceptance, and `EXTERNAL_OUTCOME_COMPLETE`: `OPEN`

This is an independent QA verdict for the exact pinned local synthetic candidate only. It grants no progress, completion, acceptance, approval, dispatch, release, provider, production, or external authority.
