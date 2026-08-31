# OUTCOME Model v2 Slice A Q1 manifest-recompile fresh re-QA receipt

Status: `NEEDS_REVISION_UX_PRODUCT_QA`

## Immutable scope

- Gate: `GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md · Q1`
- Frozen Gate SHA-256: `098c48bef05b2219b68acd2c308309b04bd91ca82a1eeb7ba80552a7caca7b0d`
- Source-drift hold carrier/tree/parent: `b11c09832b601f12cff68c465ae78efc8ddbe758` / `9ca358fe582896d8442a91bc7dab725fcc2b0877` / `d33b9deb58487cc6476afce76f72764cb19f87b1`
- Candidate/tree/parent: `ee9e3bfc85377c5a2c993afee0041e6a24b86919` / `3906e4d19eb0d231cb40ca6fac513c09377652a7` / `b11c09832b601f12cff68c465ae78efc8ddbe758`
- Builder receipt carrier/tree/parent: `1c8794d1d1d84da11ced7ee0bfcd627d9fe80676` / `a565c9ec803bf319ce32f67689638e33fe662275` / `ee9e3bfc85377c5a2c993afee0041e6a24b86919`
- Builder receipt SHA-256: `0d17f009897a101eb19ea13fc6fad08fa9f2186e2c701031ee340b893589405c`
- Re-QA handoff SHA-256: `c2761fa374d2d4256c1ac1726541c647c523b09eb6e0efe2cbab2fde813828b4`
- Candidate changed-path allowlist: exactly the canary script and bootstrap test; `git diff --check` passed.

## Binding and isolation

- Current `outcome/ux_product_qa` binding remained active at version/history `25`/`25`.
- Registry current-binding count and protected self-match count were each `1`; doctor passed and lock was clear.
- App inventory resolved exactly one active matching self.
- Fresh RED and GREEN roots were created from exact repository objects. No prior evidence directory was reused.
- Existing dependencies were linked read-only into the disposable GREEN root; installs and fetches were `0`.

## Nine-source manifest

All nine independently pinned source bytes matched before execution. Manifest digest was `5fd841779b568386b2388afe3d2014b1624c6e3e59bb503e239fd88aec097f34`.

Changing each manifest key independently returned `cold_compile_required/source_digest_drift` with automatic retry `0`:

- `agents`
- `contract`
- `map`
- `slice-contract`
- `gate`
- `handoff`
- `manifest-handoff`
- `qa-receipt`
- `reqa-receipt`

Expected hashes remained immutable constants; current source bytes were only actual inputs and could not replace the expected manifest.

## RED and GREEN

- Exact source-drift hold carrier RED: exit `2`, `cold_compile_required`, reason `source_digest_drift`, automatic retry `0`, runtime mutation `0`, false completion `0`.
- Exact new candidate GREEN: exit `0`, all nine sources present, manifest ready.
- Two GREEN canary outputs were byte-identical with SHA-256 `30dbe7334fb5fdc95b7d40ab3aaeb92e26fe6cc3268a99b575ff1b2ff5d4566e`.
- Snapshot digest: `bfec1e8f158207ac6bf5397bc4cc72b5e67ca13c2a87935cd3ff9cc192b66bcb`.

## Independent Gate and projection readback

- Predicate total: `13`.
- Closed: `6`; remaining: `7`.
- Q1 remains open and owned by independent QA.
- Ready frontier: `outcome-milestone-q1`.
- Next action: `work-q1-independent-qa`.
- Cherry action: `null`.
- Outcome: `next_action_selected`.
- Duplicate execution, automatic retry, unauthorized transition, runtime mutation and false completion were all `0`.

## Bounded regression, rollback and residue

- Focused regression: `127/127` passed, with `0` failed, skipped or cancelled.
- Explicit `OUTCOME_MODEL_V2_ENABLED=0` returned the exact v1 object and preserved serialized bytes.
- Unset configuration returned Model v2 without mutating the source object.
- Canary/listener process residue: `0`.
- Persistent Model v2 flag: absent.
- Candidate, Planner, Gate, registry, provider, dependency, persistent environment, database and external mutations during QA: `0`.

## Falsification failure

### F1-R — exported selector accepts an unvalidated forged snapshot

Severity: **High**

Reproduction against the exact candidate:

1. Call exported `selectOutcomeBootstrapContext` directly with an ordinary snapshot-like object rather than a value returned by `compileOutcomeContextBootstrap`.
2. Set `current_gate_ref` to `GATES_PHASE3_HISTORICAL.md` and `current_handoff_ref` to `docs/raw-conversation.md`.
3. Use the allowed role skill and an empty expansion array.
4. Observe that the call succeeds and both denied source references survive in `loaded_sources` and its serialized output.

Expected: the selector validates or cryptographically brands the snapshot before reading source references, so only the exact current Gate/handoff allowlists accepted by the compiler can reach output.

Actual: `selectOutcomeBootstrapContext` calls the Proxy/accessor tree check but does not validate snapshot shape, digest or current source references. Its safety depends on every caller having compiled and validated the snapshot first.

Impact: a direct or future server caller can bypass the corrected F1 semantic deny boundary without a Proxy, accessor, malformed descriptor or invalid expansion. The 127-test suite covers only selector calls with compiler-produced snapshots.

Fix owner: Builder. Require a validated immutable snapshot capability or repeat exact snapshot validation inside the exported selector, and add a direct forged-snapshot regression covering historical Gate, raw conversation, private identifier and serialization survival.

## Other hostile matrix results

The compiled path correctly rejected historical Gate input, unrelated role skill, raw-conversation expansion, task/thread/session/turn-like identifiers, UUIDs, digest-shaped identifiers, nested private values, accessors and Proxies before trap execution. Hidden malformed descriptor content did not survive projection. These passing checks do not neutralize the direct-selector bypass.

## Mutation ledger and boundaries

- QA receipt paths mutated: `1`.
- Candidate, Planner, Gate, registry, provider, runtime, environment, database, dependency and external mutations: `0`.
- Automatic retry count: `0`.
- Unauthorized transition count: `0`.
- Duplicate execution count: `0`.
- False completion count: `0`.

`NEEDS_REVISION_UX_PRODUCT_QA`

Q1 remains open. This receipt makes no Slice B/UI, Release Audit, deployment, Production, release, Cherry acceptance or Phase-transition claim.
