# OUTCOME Phase 3 · Multi-PC Observation Fresh Independent Re-QA v3

상태: `FAIL · INDEPENDENT QA ONLY · LOCAL SYNTHETIC ONLY · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## Exact audit pin

- receipt head: `29a50b51c057afa50093b40d746ef9ae513b6713`
- receipt tree: `da3267a310518efc7886b59a948d1b09a349373b`
- receipt parent: `2d0134da1e243e9302bd6eb6a7d7d3988dddfab4`
- implementation commit: `2d0134da1e243e9302bd6eb6a7d7d3988dddfab4`
- implementation tree: `d7b181a0167c1e4cc2182234766554a1a2a095a9`
- implementation parent: `d0c4858bf7b75cd613ee7ed44669269cbd403916`
- brief SHA-256: `6cf7a7a77d1bac63e863e78cf645cb4887118004f4cf9a7384c8fe083bb9682f`
- isolated worktree: `/private/tmp/outcome-phase3-observation-fresh-reqa-v3.IH90kB`, created from the exact receipt head; the canonical dirty checkout was not modified
- implementation changed paths: exactly `server/phase3-observation-relay.mjs` and `server/phase3-observation-relay.test.mjs`
- receipt changed path: exactly `docs/PHASE3_MULTI_PC_OBSERVATION_STRUCTURAL_POLICY_CORRECTION_RECEIPT.md`
- receipt source parity: both implementation paths are byte-identical between the implementation commit and receipt head

Git object types, commit/tree/parent identities, direct ancestry, changed-path scope, source parity, brief digest, and diff cleanliness were resolved independently. The correction receipt, prior QA reports, and committed tests were treated as hypotheses.

## Verdict

`FAIL`

The exact F5 17-case set, F6 NFKC 360 rejection, canonical 320/321 boundary, all prior F1/F4 cases, lifecycle atomicity, and full regressions withstand direct reproduction. Broader bounded refutation does not: `23/23` prohibited synthetic label, scheme, and path variants are accepted and exposed unchanged as fresh public NOW. One harmless ordinary prompt/result prose control is also rejected. This report closes no Gate.

## Blocking findings

### F7 · HIGH · Symbol delimiters, punctuation-prefixed schemes, and wrapped absolute paths bypass the structural policy

- Contract: raw session/thread identifiers, provider locators, prompt/result originals, credentials/keys, non-HTTPS locators, and local paths must fail before mutation. Validation must cover bounded ASCII/Unicode delimiter classes, label boundaries, case/NFKC, URI allowlisting, and path variants without relying on a finite separator list.
- Location: `server/phase3-observation-relay.mjs:8-22` and `server/phase3-observation-relay.mjs:78-103`.
- Cause:
  - semantic normalization replaces Unicode punctuation and whitespace, but not Unicode/ASCII symbol delimiters such as `+`, `→`, `＝`, or `∕`;
  - sensitive label patterns enumerate `id` and `token` but not the equivalent `identifier` spelling;
  - scheme detection requires start-of-string or whitespace before the scheme, so brackets, punctuation, arrows, and `=` can hide a non-HTTPS scheme;
  - the absolute POSIX path rule recognizes only a small predecessor set, so brackets, braces, backticks, commas, and home-relative `~/` forms bypass it.
- Independent reproduction: each otherwise valid synthetic event used one `now_summary` from this set:
  - symbol-delimited labels (`11`): `session+id+synthetic-opaque-123`, `session→id→synthetic-opaque-123`, `session＝id＝synthetic-opaque-123`, `session∕id=synthetic-opaque-123`, `thread+token=synthetic-opaque-123`, `provider+locator=synthetic:opaque-123`, `api+key=synthetic-not-real`, `private+key=synthetic-not-real`, `secret→key→synthetic-not-real`, `prompt+raw=synthetic request`, `result∕raw=synthetic response`
  - equivalent identifier labels (`2`): `session identifier=synthetic-opaque-123`, `thread identifier synthetic-opaque-123`
  - punctuation-prefixed schemes (`5`): `(mailto:synthetic@example.invalid)`, `[ssh:synthetic@example.invalid]`, `public—urn:synthetic:opaque-123`, `see→file:/opt/synthetic/private.txt`, `link=synthetic:opaque-123`
  - path wrappers (`5`): `[/opt/synthetic/private.txt]`, `{/opt/synthetic/private.txt}`, `` `/opt/synthetic/private.txt` ``, `path,/opt/synthetic/private.txt`, `~/synthetic/private.txt`
- Expected: all `23` calls throw public-safe `summary_prohibited`, preserve deep-equal state, expose no raw value, and consume no evidence ID.
- Actual: `23/23` return `status: accepted`; `23/23` exact originals round-trip through `read().projections[0].now_summary` as fresh NOW and each creates evidence ID `1`.
- Impact: O5's public projection boundary remains bypassable across every named sensitive family despite the exact F5 set passing. The correction's structural-policy claim is therefore incomplete.
- Fix owner: Builder. Canonicalize a bounded, explicit delimiter/scheme/path grammar before classification; treat all relevant Unicode symbol and punctuation separator classes consistently; detect scheme tokens at safe lexical boundaries independent of a whitespace-only prefix; cover equivalent identifier labels; and recognize absolute/home path forms independent of a small wrapper list. Preserve original text only after the validation copy passes. Add every reproduction as an isolated negative with deep-equal/no-evidence assertions.

All values above are synthetic placeholders. No real identifier, locator, prompt/result, credential, key, or path was used.

### F8 · MEDIUM · Ordinary prompt/result prose is overblocked when slash-separated

- Contract: ordinary mentions of API, provider, prompt, and result must remain accepted exactly; only raw-label/value structures are prohibited.
- Location: `server/phase3-observation-relay.mjs:21`.
- Cause: the legacy expression treats any slash immediately after `prompt` or `result` as a raw-value delimiter without checking whether the following token is another harmless vocabulary term.
- Independent reproduction: `Prompt/result wording review`.
- Expected: `status: accepted`, with the exact original preserved in the response and public projection.
- Actual: throws `summary_prohibited` before mutation.
- Impact: the structural correction introduces a false positive in ordinary public prose and does not satisfy the requested acceptance-control boundary.
- Fix owner: Builder. Require a structurally complete raw-label/value form instead of interpreting every slash-separated ordinary term as raw content, and retain explicit safe prose controls beside the negative delimiter matrix.

## Exact prior findings and required boundaries re-tested

- exact prior F1: `12/12 PASS`; every canonicalization bypass rejects atomically as `summary_prohibited`, exposes no raw input, and leaves the next evidence ID at `1`.
- exact F5: `17/17 PASS`; delimiter, malformed-percent, and non-HTTPS scheme cases reject atomically.
- exact F6: U+FDFA repeated `20` times expands from `20` original code units to NFKC length `360` and rejects atomically.
- canonical expansion: NFKC length `320` accepts and preserves the exact original; `321` rejects without mutation or evidence consumption.
- exact prior F4 and broadened lifecycle materialization: accessors and `getPrototypeOf`, `ownKeys`, and `getOwnPropertyDescriptor` Proxy traps remain atomic across ingest, disconnect, reconnect, restore, and nested reconnect event envelopes; unused hostile disable input is not touched.
- response clone throw and swallowed nested reentry remain atomic across ingest, disconnect, reconnect, disable, and restore.
- malformed, one-pass, two-pass, recursive/residual percent cases pass the intended fail-closed checks. Literal percentage prose including `Coverage is 75% complete` and `Public status code is 100%25` accepts with the exact original.
- required Korean/English prose, separate ordinary API/provider/prompt/result mentions, relative paths, explicit public HTTPS including parenthesized/bracketed forms, benign fullwidth prose, and label word-boundary controls accept exactly. The single slash-separated ordinary-term failure is F8.

## Atomicity, lifecycle, and semantic evidence that passed

The prior independent runner was executed fresh against this exact receipt source and passed `104/104` assertions. The additional structural-policy runner executed `44` assertions: `20 PASS / 24 FAIL`. Those failures are exactly F7's `23` accepted prohibited summaries and F8's one rejected harmless summary.

- exact configured source set only; project/role/binding/source allowlists and primitive schema guard remain fail closed.
- canonical and invalid ISO time; future tolerance at `+5000/+5001 ms`; freshness at `60000/60001 ms`; missing/stale/future/idle/offline/unknown/conflicting states; clock throw/out-of-range; and reentrant clock checks pass.
- duplicate, conflicting duplicate, out-of-order, gap, disconnect/reconnect/resync, sequence CAS, disabled writes, registry CAS, restore, clone failure, and clone reentry preserve the expected state and contiguous evidence IDs.
- missing, stale, future, idle, offline, unknown, and conflicting projections expose no NOW and synthesize no active/progress/Gate/completion/approval/dispatch authority.
- public projection and evidence retain only the contracted key sets; accepted prohibited summaries in F7 are the blocking raw-value exposure.

These passing observations are candidate evidence only. They do not close O1, O3, O4, O5, O6, Phase 3, Release Audit, Cherry acceptance, or external completion.

## Regression and scope evidence

| Check | Result |
| --- | --- |
| Builder focused relay suite | `16/16 PASS` |
| Fresh prior independent runner | `104/104 PASS` |
| Fresh broadened policy runner | `44 assertions · 20 PASS / 24 FAIL` |
| Package model | `39/39 PASS` |
| Injected no-network mutation matrix | `local 32/32 = 405 · API read_only JSON 28/28 · empty page boundary 0/4` |
| Frontend Vitest suite | `89/89 PASS` |
| Full server Node suite | `145/145 PASS` |
| Full script + server `.mjs` Node suite | `173/173 PASS` |
| Production build | `1652 modules · PASS` |
| Candidate `git diff --check` | `PASS` |
| Candidate changed-path scope | `PASS · 2/2 declared implementation paths` |
| Repository scope check | `PASS · 35 files scanned` |

The isolated worktree used the canonical checkout's existing `node_modules` through a temporary local symlink. The symlink is removed and build output is ignored/absent from this report commit.

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
