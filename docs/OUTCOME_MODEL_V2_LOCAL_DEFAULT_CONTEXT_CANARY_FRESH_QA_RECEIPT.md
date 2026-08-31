# OUTCOME Model v2 Slice A fresh UX & Product QA receipt

Status: `NEEDS_REVISION_UX_PRODUCT_QA`

## Immutable scope

- Gate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · Q1`
- Candidate commit/tree/parent: `33b8022db05432e84463571b1d796e7a66993ae9` / `7c9017a1ff78ebdacb99b1247fec5dad8da4b618` / `ca1229488dd4311c6beeddcc846eb3b326580664`
- Builder receipt carrier/tree/parent: `aa50b94f20a7a7092ffeda2a8d4e4c3e77dab962` / `ad1a4eea59cc68be47831d14b9c09c6803f34bfc` / `33b8022db05432e84463571b1d796e7a66993ae9`
- Fresh-QA handoff SHA-256: `aa3c78bbd59a24b50c99946dd4c91d2b28279575cf3ec00c2bf07a02d7363473`
- Candidate changed-path allowlist: seven expected paths; `git diff --check` passed.

## Successor activation

- One protected registry CAS replaced QA binding version/history `24` with `25`.
- Public alias and Phase/Scope/Stage match the Q1 activation request.
- Readback found exactly one current active QA self-match and exactly one matching active app self.
- The predecessor is `replaced`, unarchived and recoverable.
- Registry doctor passed, lock state was clear, and registry revision became `94`.
- Registry mutation count: `1`; CAS invocation count: `1`; automatic retry count: `0`.

## Independent execution environment

- Parent and candidate were expanded from their exact Git objects into separate disposable evidence roots.
- No package installation or dependency change occurred. The dependency-complete run used the repository's existing dependency tree through a disposable-root link.
- The first isolated regression invocation was evidence-environment incomplete: `56` tests passed and `2` test files failed to load the existing `yaml` package. It is retained as a non-verdict setup failure.
- The dependency-complete focused regression then passed `123/123`, with `0` failed, skipped or cancelled.
- Candidate, Planner, provider, persistent environment, database and external state were not mutated by QA.

## Red before green

- The exact parent failed the unset-default-v2 probe with exit `1`; the exact candidate passed the same probe with exit `0`.
- The parent has no `server/outcome-context-bootstrap.mjs`; the candidate does.
- This proves the tested default-v2 and bootstrap behavior is candidate-specific.

## Passing evidence

- Unset configuration returns Model v2; explicit `1` returns Model v2.
- Explicit `0` returns the exact original v1 object and preserves serialized bytes.
- Five invalid configured values fail closed as `invalid_model_v2_configuration`.
- The source object remains unmodified.
- Source digest drift returns `cold_compile_required` with automatic retry `0`.
- Ordinary accessors and Proxies are rejected before traps execute.
- Two current-input canary executions were byte-identical with SHA-256 `77acd9e6b61bb4a35924e015859823791a821d6d496dadba19963cf6ab37f617`.
- Canary safety counters were all zero; public-output scan passed; no canary process or persistent Model v2 flag remained.

## Falsification failures

### F1 — selective-context deny classes are labels, not enforced boundaries

Severity: **High**

Reproduction against the exact candidate:

1. Compile a bootstrap whose current Gate is `GATES_PHASE3_HISTORICAL.md`.
2. Select context with unrelated role skill `lime-release-auditor` and an expansion source `docs/raw-conversation.md`.
3. Observe all three appear in `loaded_sources`, while `excluded_source_classes` still claims historical Gates, raw conversation and unrelated skills are excluded.
4. Compile a projection value `thread-id`; observe it is accepted as `primary_destination`.

Expected: historical Gate families, raw conversations, unrelated skills and private-identifier-like projection values fail closed before selection or serialization.

Actual: all four hostile values are accepted. The current implementation validates generic path/ID syntax but does not enforce the contract's semantic deny classes or private-identifier denylist.

Impact: the selective-context and client privacy boundaries can be bypassed by otherwise syntactically valid inputs. A final canary regex is not a reusable server-side invariant.

Fix owner: Builder. Enforce semantic source/skill allowlists and private-identifier rejection in the bootstrap compiler/selector, then add hostile regression cases for each bypass.

### F2 — current-repository canary loses the open Q1 frontier

Severity: **High**

Reproduction against the exact candidate plus the current authorized canonical inputs:

1. Run `scripts/outcome-model-v2-local-canary.mjs` twice.
2. Observe deterministic snapshot `51dbb24b8a2fc827e60e0c075838b3fcd975971a3dcde3c730f27e401550246a` and identical output bytes.
3. Observe acceptance gap `{ remaining: 0, closed: 4, total: 4 }`, empty frontier, `next_action: null` and outcome `no_eligible_action`.
4. Compare with the current canonical Gate, where Q1 remains open.

Expected: the current-repository canary represents the current acceptance gap and selects the current Q1 boundary, or rejects changed canonical inputs as `cold_compile_required` against an independently pinned digest set.

Actual: the script parses only A1–A4, computes digests from the same current files it immediately validates, and therefore reports no eligible action after Builder evidence closes A1–A4 even though Q1 is open.

Impact: the real-work canary can deterministically project false completion/no-work semantics and does not prove the current selective-context work selection.

Fix owner: Builder. Bind the canary to an independently pinned source-digest set and model the current canonical predicate/frontier, including Q1, without treating Builder evidence as QA closure.

## Mutation and residue ledger

- Protected registry CAS mutations: `1`.
- QA receipt paths mutated: `1`.
- Candidate, Planner and Gate paths mutated: `0`.
- Provider, database, credential, persistent-environment and external mutations: `0`.
- Automatic retry count: `0`.
- Duplicate execution count: `0`.
- Unauthorized canonical transition count: `0`.
- False completion count: `0`.
- Listener/canary process residue: `0`.

## Verdict and open boundaries

`NEEDS_REVISION_UX_PRODUCT_QA`

Q1 remains open. This receipt makes no Slice B/UI, Release Audit, deployment, Production, release, Cherry acceptance or Phase-transition claim. The predecessor remains recoverable and no archive/delete action was performed.
