# OUTCOME Model v2 Slice A Builder receipt

Status: `SLICE_A_CANDIDATE_READY`

## Immutable inputs

- Handoff SHA-256: `050362eaf7f66f81e72e9c2cf767cbe231640f8231e4cc39ca081dd74d528fc0`
- Source commit: `ca1229488dd4311c6beeddcc846eb3b326580664`
- Source tree: `77eb0545dfb1e4a3687ddbd9affe5e3e52bb4e1a`
- `docs/OUTCOME_CONTRACT.md`: `36860ad7e0103170c6f1be3eaa25a221b873ccf1b46b668f0d684c385412851f`
- `docs/OUTCOME_MAP.md`: `10bfe76927a044f87612666b1976ff34b145bd8f5b471dff676f32716396bc94`
- Slice contract: `b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657`
- Current Gate: `4798c5c5a305cd13e4fc89df7a23dbce149eff6fbcd6b53bac5db14f5607a70f`
- Builder binding at start: active `builder-model-v2-pilot`, version `11`, history count `11`; unique active Builder self-match verified.

## Candidate

- Commit: `33b8022db05432e84463571b1d796e7a66993ae9`
- Tree: `7c9017a1ff78ebdacb99b1247fec5dad8da4b618`
- Parent: `ca1229488dd4311c6beeddcc846eb3b326580664`
- Changed paths:
  - `scripts/outcome-model-v2-local-canary.mjs`
  - `server/outcome-context-bootstrap.mjs`
  - `server/outcome-context-bootstrap.test.mjs`
  - `server/outcome-model-v2.mjs`
  - `server/outcome-model-v2.test.mjs`
  - `server/outcome-package.mjs`
  - `server/outcome-package.test.mjs`

## Implemented behavior

- Unset `OUTCOME_MODEL_V2_ENABLED` now selects Model v2 locally. Exact value `0` restores the prior v1 package object and serialized project bytes; exact value `1` remains accepted. Other configured values fail closed as `invalid_model_v2_configuration`.
- Local package collection derives a deterministic source revision from the exact Contract and Map bytes when no revision is supplied, without persisting environment state.
- The selective bootstrap snapshot is immutable and content-addressed. It contains only source digests, destination version, current acceptance gap, ready frontier, active work, next action, Cherry action, current Gate/handoff references and its digest.
- Snapshot/source mismatch returns `cold_compile_required` with `automatic_retry_count: 0`.
- Context selection defaults to excluding historical Gate families, correction chains, raw conversation, `docs/ROADMAP 2.md` and unrelated skills. Any expansion requires a source digest, machine-readable reason and work ID.
- Plain-record, exact-key, accessor and Proxy validation occurs before accepted hostile inputs can execute traps.

## Deterministic checks

- `node --test server/outcome-model-v2.test.mjs server/outcome-context-bootstrap.test.mjs server/outcome-package.test.mjs server/outcome-execution-control-plane.test.mjs server/index.test.mjs`
  - Result: `123` passed, `0` failed, `0` skipped, `0` cancelled.
- `node scripts/outcome-model-v2-local-canary.mjs` executed twice from the committed candidate.
  - Both serialized outputs SHA-256: `a2dcfa8cd57040a6a235f0f439df7dc743f281a69b62fce51fc17e867a77d6b3`.
  - Bootstrap snapshot SHA-256: `a7ce97eb6548ab4257913a6c8fc11eea19630131fff86cde4c73e3cb39931859`.
  - Outcome: `next_action_selected`.
  - Primary destination: `destination-model-v2-service`.
  - Acceptance gap: remaining `4`, closed `0`, total `4`.
  - Ready frontier: `outcome-milestone-model-v2-local-default-projection`.
  - Active and next work: `work-slice-a-local-default-canary`; Cherry action: `null`.
- Allowed-path `git diff --check`: pass. A repository-wide check encountered one pre-existing whitespace defect in an unrelated user-owned Gate and did not modify it.

## Source selection and public safety

- Default loaded sources: `AGENTS.md`, active bootstrap snapshot, current Gate, current handoff, and the three active Builder skills.
- Justified cold-compile expansions: `docs/OUTCOME_CONTRACT.md`, `docs/OUTCOME_MAP.md`, and the current Slice A contract; expansion count `3`, each reason `cold-compile-source-verification`.
- Excluded source classes: `historical_gate_families`, `correction_chains`, `raw_conversation`, `roadmap_2`, `unrelated_skills`.
- Public-output scan rejected absolute user paths, private runtime paths, `docs/ROADMAP 2.md`, and private task/session/thread/turn identifiers. No raw prompt/result carrier is emitted.
- `docs/ROADMAP 2.md` and historical Gate families were not opened.

## Preservation, rollback and residue

- Unrelated dirty path count before and after candidate: `312`.
- Byte-sorted unrelated path-list SHA-256 before and after candidate: `67fed18c67aaa049d8f021a82ee641e19c659f2de25dc873393ce1876f345e14`.
- Planner-owned inputs remained unmodified and unstaged.
- Listener count after canary: `0`; persistent Model v2 environment flag: absent; staged path count: `0`.
- Rollback: set local `OUTCOME_MODEL_V2_ENABLED=0`; tests prove exact prior v1 object and serialized project-byte parity. Removing the candidate commit returns the source tree without touching Planner/user-owned dirty paths.

## Mutation ledger

- Product/test/canary paths mutated: `7`, all allowlisted and contained in the candidate commit.
- Receipt paths mutated: `1`, this allowlisted file only.
- Candidate commits: `1`; receipt carrier commits: `1` (this carrier).
- Registry/provider/database/credential/persistent-environment mutations: `0`.
- Canonical transition, push, deployment, Production, release and Phase mutations: `0`.
- Automatic retry count: `0`.
- Duplicate execution count: `0`.
- Unauthorized canonical transition count: `0`.
- False completion count: `0`.

## Open boundaries

- A1-A4 remain subject to fresh independent QA and Release Audit; this Builder receipt does not close the canonical Gate.
- Slice B/UI, activation outside this local default, deployment, Production, acceptance, release and Phase transition were not attempted and are not claimed.
