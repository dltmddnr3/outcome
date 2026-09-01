# OUTCOME Model v2 canonical package promotion — fresh Release Audit receipt

Verdict: `PASS_RELEASE_AUDIT_ONLY`

Authority: fresh independent Release Audit evidence for A1 only. This receipt does not authorize Cherry acceptance, active-root cutover, dogfood completion, Preview, Production, deployment, release, external activation or Phase completion.

## Immutable subject and continuity

- Audit handoff SHA-256: `1b307e85b709761010e9bd7d46bb2703bcb0861053d66cd7920b6a1fbe4a9e4d`.
- Accepted source / tree / parent: `a40ee664e194c21554b0497382d499296cb2c52b` / `6dcf343769ff08c6fd507de12baf3b0bbdb9c43b` / `46b6d89cc09189739aab690a882c43cb7edd3723`.
- Builder semantic candidate / tree / parent: `8333a410e66ce154e9d3b5857b50fa9bb3c4df5f` / `00b2fe6662a8a2e52e05a4afb970645828c5681e` / exact accepted source.
- Builder receipt carrier / tree / parent: `6ab2135aae8e2d3aae418a19434a51da45e42c05` / `68ff154aaafe9552a48baf2c9e520372c563a354` / exact semantic candidate.
- QA carrier / tree / parent: `12c49b2b9486717d64a3c0c20ba17d42305c753f` / `b53e8dd7f3cbbad812eb304916268c6b76699f0a` / exact Builder receipt carrier.
- Builder and QA receipt SHA-256: `f82eb598f53897dee7984dc1dc1b36e8722314f2cefdcc29e2cc44310aa2d62d` / `8393bac64d818efe2add97ea0bbea139879fb7b3143cd34fc63c9ac4a1b99126`.
- Post-CAS readback before Audit: active Release Audit binding count `1`, binding version `22`, protected self-match `1`, predecessor version `21` `replaced` and recoverable, doctor issues `0`, lock clear, mode `0600`.

The four commits are a single-parent linear chain and the accepted-source-to-QA range contains zero merge commits. The semantic candidate changes exactly seven paths: the canonical Gate, Builder handoff, `package.json`, generator, projection module, projection test and projection artifact. The Builder and QA carriers each add only their respective receipt. Historical `scripts/outcome-model-v2-local-canary.mjs` diff bytes are `0`.

## Test matrix and hostile reproduction

- Two clean generator runs in a disposable `git archive` of the exact QA carrier produced byte-identical `2,174`-byte artifacts. Initial, first-run and second-run SHA-256 were all `3c91151af4694292d5a94ede1d39c29d6ab176510acb984e258519a094125ead`.
- Focused plus related regressions independently passed `102/102`, failed `0`, skipped `0`: `node --test server/outcome-current-projection.test.mjs server/outcome-model-v2.test.mjs server/outcome-context-bootstrap.test.mjs server/outcome-package.test.mjs server/account-model-v2-projection.test.mjs`.
- A separate Audit probe changed one source byte and received `cold_compile_required` / `source_digest_drift`, no partial `current`, and automatic retry `0`.
- Separate Proxy and accessor inputs were rejected with hostile trap count `0`; the compiled projection remained frozen.
- Artifact serialization privacy patterns produced `0/7` hits. A value scan across the artifact and both prior receipts found `0` local-path, task/thread/session locator-shaped or credential-token values.
- Authority remained exactly `projection_only`; automatic retry, duplicate execution, unauthorized canonical transition, registry/provider/environment mutation and false completion counters were all `0`.
- Explicit `v1_rollback` returned schema `1`, authority `v1_compatible`, `original_value_required=true`, `persistent_state_changed=false`, and automatic retry `0`. The regression suite also passed unset-default Model v2 and explicit-zero exact-v1 compatibility coverage.
- Existing dependencies only were used through a disposable read-only dependency symlink. Install, fetch, listener, persistent flag and external activation counts were `0`.
- One initial shell composition was rejected by harness policy before process creation because it contained a disallowed cleanup spelling. No candidate code, test or generator ran in that rejected command; the corrected disposable command ran once. Product automatic retry and duplicate execution remain `0`.

## Active-root, ref and rollback boundary

- Active root HEAD / tree / branch ref remained `517f436150b684a2f7d72f6144bfa848af397bb4` / `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c` / `refs/heads/codex/hp1-session-bearer` at the same commit.
- Active-root tracked binary diff SHA-256 remained `f5338a0f7a19827923f466558478a30e0457bbc389b2aad22619bfd3d7af8eb1`; staged binary diff SHA-256 remained the empty digest `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Excluding exactly the current stage's four Planner-owned untracked Gate/Builder-handoff/QA-handoff/Audit-handoff inputs reproduced the pre-Gate NUL-terminated porcelain SHA-256 `e9e907d0b0d9f5ef030f3bdeb589f48f149c17722af15a3a9c80b0d2943bdb11`.
- The isolated candidate branch remained at the Builder receipt carrier; the QA lineage was not confused with or merged into the active canonical branch. Root checkout, index and ref mutation count was `0`.
- Rejection remains recoverable by reverting only the Audit receipt carrier, then the QA receipt carrier if required. The isolated candidate branch preserves the Builder carrier, semantic candidate and accepted-source ancestry; no accepted history rewrite is needed.

## Profile payload

- `commit_pin`: exact QA carrier, tree and parent above; Audit carrier is the commit containing only this receipt and is read back after commit.
- `test_matrix`: deterministic generation, seven source-drift classes through the focused suite, state separation, hostile shapes, privacy, rollback, package/bootstrap/model/service projection regressions.
- `regressions`: `102/102` passed, `0` failed, `0` skipped.
- `accessibility`: deterministic JSON information contract only; no deployed rendering, geometry, screen-reader order, motion or external accessibility proof exists.
- `runtime_evidence`: local disposable exact-carrier reproduction only; no hosted or deployed runtime was activated.
- `release_scope`: A1 Audit-only; active-root cutover, acceptance, Preview, Production, deployment, release and Phase transition remain excluded.
- `quality_score`: handoff-required hostile audit items `9/9` satisfied; no finding lowered the fail-closed threshold.
- `verdict`: `PASS_RELEASE_AUDIT_ONLY`.

## Findings, residuals and counters

Findings: none.

Residuals: no deployed rendering/accessibility proof; no Preview, Production, deployment, release or external activation; dirty-aware active-root cutover and Cherry C1 remain separate. O1 dogfood remains separate.

- Audit receipt file writes: `1`.
- Audit receipt commits: `1` after commit.
- Product, test, Gate, generator, artifact, package, root, branch/ref, registry, provider and environment mutation count: `0`.
- Install/fetch/push/tag/deploy/release count: `0`.
- Automatic retry count: `0`.
- Duplicate execution count: `0`.
- Unauthorized canonical transition count: `0`.
- `false_completion_count: 0`.
