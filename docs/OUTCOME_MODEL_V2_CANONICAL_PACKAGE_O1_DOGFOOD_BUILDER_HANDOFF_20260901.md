# OUTCOME Model v2 canonical package O1 dogfood — Builder handoff

Outcome: Compile one immutable, source-addressed O1 work selection from the current canonical repository HEAD, verify it independently, and only then consume one local selective-context plan without external activation or canonical transition.

Authority: Cherry instructed the remaining work to proceed in order and approved the bounded cutover cleanup. This handoff uses the already-open O1 predicate in `GATES_OUTCOME_MODEL_V2_CANONICAL_PACKAGE_PROMOTION_20260901.md`. It does not authorize Preview, Production, deployment, release, provider/database/credential/registry mutation, Phase completion, or use of unrelated dirty working-tree bytes as canonical inputs.

## Exact starting pins

- Active and isolated starting commit/tree/parent: `75e449de24b01e56df7b896cd2b89e849df17efe` / `a35ff3cbabdbd578ea9085844ed32ff8403e15de` / `4e8f155852595effed4c054904fb03ac8f386fff`.
- Accepted product candidate remains `28db58fd5018dc4094c9cbbf764d0e86e83cbea4`; do not replace this identity with an evidence-only carrier.
- Canonical-package Gate at HEAD: `87b43ff38fa397d4832894960274d31715b68078c47166281612d7fadf29140c`.
- Accepted selector Gate at HEAD: `50987cbba74c275ce5143c26d4ecb20c2fad377dfea2b7f50b75c621a989628f`.
- `AGENTS.md` at HEAD: `cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93`.
- Contract at HEAD: `c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442`.
- Map at HEAD: `da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3`.
- Slice contract at HEAD: `b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657`.
- Active-root unrelated dirty manifest before this handoff: `396` entries / SHA-256 `94026362dc61e27549a8b9ed9fb620d3751a734b353978d0d875148b4df3f48f`.
- Manifest grammar for that fixed digest: collect the union of `git diff --name-only -z`, `git diff --cached --name-only -z`, and `git ls-files --others --exclude-standard -z`; sort paths lexically; emit one JSON row per applicable class in `worktree`, `index`, `untracked` order using the established cutover fields (`path`, `class`, file kind, Git mode, SHA-256 content digest; index rows use sorted `mode/blob/stage` entries); hash the UTF-8 bytes of `JSON.stringify(rows)`. Exclude exactly this Planner handoff path before row generation. A raw porcelain/status-stream digest is a different measurement and must not be compared with `94026362...`.
- The active-root Contract and Map working bytes differ from the immutable HEAD pins. They are user-owned/unrelated for O1 and must not be copied, normalized, committed, deleted, restored, or treated as source authority.

## Required RED

Before editing, reproduce exactly once in the isolated worktree:

1. Current-projection compile returns `cold_compile_required/source_digest_drift`, automatic retry `0`, because the canonical-package Gate pin is stale.
2. `scripts/outcome-model-v2-local-canary.mjs` returns exit `2`, `cold_compile_required/source_digest_drift`, consumption `0`, because the selector Gate pin is stale.
3. The stale projection exposes ready frontier `milestone-o1` while its only work item remains attached to `milestone-b1`, yielding `next_action=null` and `cherry_action=resolve_blocker`.

Any different RED, source mismatch beyond the named Gate pins, or protected-role mismatch is `SAFE_HOLD`.

## Minimal implementation contract

Allowed implementation paths are exactly:

- `server/outcome-current-projection.mjs`
- `server/outcome-current-projection.test.mjs`
- `scripts/outcome-model-v2-local-canary.mjs`
- `snapshot/outcome-model-v2-current.json`

Allowed evidence-carrier paths, separate from implementation, are exactly:

- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_DOGFOOD_BUILDER_HANDOFF_20260901.md`
- `docs/OUTCOME_MODEL_V2_CANONICAL_PACKAGE_O1_DOGFOOD_BUILDER_RECEIPT_20260901.md`

Required behavior:

1. Refresh the current-projection manifest to the exact canonical-package Gate HEAD digest above. Keep the accepted source candidate identity unchanged.
2. Replace the stale B1 work binding with one O1 work item:
   - work id: `work-o1-selective-context-dogfood`
   - milestone: `milestone-o1`
   - fingerprint: a deterministic digest derived from the accepted product candidate, the canonical HEAD, and the complete expected source manifest; no private locator or mutable working-tree state.
3. The deterministic Current Projection must truthfully return `7/8` closed, ready frontier `milestone-o1`, next action `work-o1-selective-context-dogfood`, Cherry action `null`, no active work, rollback available, and all safety counters zero.
4. Refresh only the accepted selector Gate digest in the local canary manifest. Contract and Map must use the immutable HEAD bytes above, not the active-root dirty bytes.
5. The canary must consume the newly compiled `snapshot/outcome-model-v2-current.json` as `active-bootstrap-snapshot`, use the projected O1 work id, and preserve:
   - current Gate ref `GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md`;
   - work type `builder`;
   - role skill `mango-implementation-engineer`;
   - `current_handoff: null`;
   - empty expansion allowlist and zero expansions.
6. The public dogfood result must record exact content-addressed loaded and skipped source classes, projection/source/plan digests, the truthful projected next action, local consumption receipt, and zero execution-started, retry, duplicate, persistent-setting, registry/provider/environment, unauthorized-transition and false-completion counters. It must expose no local path, private task/session/thread/turn locator, raw prompt/result, credential, registry payload, or unrelated dirty content.
7. Add RED-before-GREEN tests for the O1 milestone/work mismatch, both stale Gate pins, deterministic double compilation, single local consumption, wrong role, nonempty/unapproved expansion, source drift, and rollback. No automatic retry or fallback is allowed.

## Candidate and verification sequence

1. Builder creates one single-parent immutable candidate and one receipt carrier from the exact starting pin. Do not touch the active root.
2. Fresh independent UX & Product QA verifies the exact candidate read-only, including deterministic output, loaded/skipped sources, privacy, wrong-role/expansion/drift holds and consumption count `1` only in the isolated dogfood probe.
3. Separate fresh Release Audit verifies lineage, four-path scope, source authority, dirty-root isolation, rollback and zero external/canonical-transition mutation.
4. QA/Audit PASS are evidence-only. Do not promote or consume O1 on the active root until Cherry accepts the exact audited candidate or explicitly delegates that local-only acceptance.
5. After acceptance, Builder performs a separately bounded dirty-aware fast-forward and then one local dogfood consumption. O1 closes only after immutable receipt evidence is promoted.

## Stop conditions

- Any use of active-root dirty Contract/Map bytes, additional path, broadened source/skill/expansion allowlist, non-null handoff, role mismatch, nondeterminism, privacy hit, duplicate consumption, retry, staged residue, dirty-manifest drift, or source/candidate ambiguity is `SAFE_HOLD`.
- No Preview, Production, deployment, release, provider/database/credential/registry/external mutation or Phase transition.

## Builder terminal contract

Return exactly `O1_CANDIDATE_READY`, `SAFE_HOLD`, or `BLOCKED`, with exact candidate/tree/parent, changed paths, projection/source/plan digests, loaded/skipped sources, test counts, rollback result, root dirty-manifest readback, mutation counters and `false_completion_count`.
