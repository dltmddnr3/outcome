# OUTCOME Model v2 canonical package promotion and current projection

Outcome: The exact Cherry-accepted local-only Model v2 source is anchored as a durable canonical-package candidate, produces one deterministic Current Projection from current canonical inputs, and is proven reversible without changing Preview, Production, deployment or release state.

Status: **C1 CHERRY ACCEPTED · DIRTY-AWARE ACTIVE ROOT CUTOVER AUTHORIZED · CUTOVER EVIDENCE PENDING**

- [x] D1: Planner pins the accepted source, current canonical base, dirty-state boundary, expected user delta and stop conditions.
  CHECK: test "$(git rev-parse HEAD)" = 517f436150b684a2f7d72f6144bfa848af397bb4 && git merge-base --is-ancestor 517f436150b684a2f7d72f6144bfa848af397bb4 a40ee664e194c21554b0497382d499296cb2c52b && test "$(git show -s --format=%T a40ee664e194c21554b0497382d499296cb2c52b)" = 6dcf343769ff08c6fd507de12baf3b0bbdb9c43b && echo D1_PASS
  EXPECT: `D1_PASS`
  EVIDENCE: accepted source `a40ee664e194c21554b0497382d499296cb2c52b`, tree `6dcf343769ff08c6fd507de12baf3b0bbdb9c43b`, parent `46b6d89cc09189739aab690a882c43cb7edd3723`; canonical base `517f436150b684a2f7d72f6144bfa848af397bb4`, tree `ea8d54f0cc7415ddcdced78fdeecd6f795ae0f8c`; pre-Gate dirty porcelain SHA-256 `e9e907d0b0d9f5ef030f3bdeb589f48f149c17722af15a3a9c80b0d2943bdb11`. The accepted source is a linear descendant, but it has no durable branch ref and the checked-out root contains overlapping user-owned changes. Therefore direct merge, checkout or ref movement is not authorized.

- [x] B1: Builder anchors the exact accepted source on one durable isolated candidate branch and adds only the bounded implementation, projection, tests and receipt needed by this Gate.
  CHECK: Builder receipt proves exact ancestry from `a40ee664e194c21554b0497382d499296cb2c52b`, enumerates every changed path, and proves the active root branch/ref/worktree were not mutated.
  EXPECT: one immutable candidate carrier; no merge commit, history rewrite, push, tag, stash, reset, clean, active-root ref movement or unrelated dirty-byte change.
  EVIDENCE: semantic candidate `8333a410e66ce154e9d3b5857b50fa9bb3c4df5f`, tree `00b2fe6662a8a2e52e05a4afb970645828c5681e`, parent exact accepted source; receipt carrier `6ab2135aae8e2d3aae418a19434a51da45e42c05`, tree `68ff154aaafe9552a48baf2c9e520372c563a354`, parent semantic candidate; isolated branch `codex/model-v2-canonical-package-promotion-20260901`; no merge commit or active-root mutation.

- [x] B2: Builder replaces the historical one-shot canary pattern with a deterministic, source-addressed Model v2 Current Projection compiler and immutable local projection artifact.
  CHECK: two runs over identical pinned inputs produce byte-identical output and digest; any source-digest drift returns `cold_compile_required`; the projection alone computes destination, acceptance gap, ready frontier, active work, next action and Cherry action.
  EXPECT: no manually competing current/progress values, no private locator/path/raw prompt/result, and no canonical-transition authority in the projection.
  EVIDENCE: artifact SHA-256 `3c91151af4694292d5a94ede1d39c29d6ab176510acb984e258519a094125ead`; projection digest `e0bb5a27f7ce91b825e0918b615c28b06912218ff69f4bbf039ec709cb59b21b`; two runs produced byte-identical 2,174-byte output; all seven source-class byte changes returned `cold_compile_required`; focused and related regressions `102/102` passed. Builder receipt SHA-256 `f82eb598f53897dee7984dc1dc1b36e8722314f2cefdcc29e2cc44310aa2d62d`.

- [x] B3: Builder proves local rollback and compatibility while preserving the accepted local-only authority boundary.
  CHECK: explicit local rollback restores verified v1-compatible behavior; root dirty fingerprint remains unchanged after excluding only this Planner Gate/handoff; listeners, persistent flags, provider/database/credential/registry/external mutations are zero.
  EXPECT: rollback evidence is reproducible and no Preview, Production, deployment, release or Phase transition occurs.
  EVIDENCE: explicit rollback returned `authority=v1_compatible`, `persistent_state_changed=false`, automatic retry zero; root HEAD/ref remained `517f436150b684a2f7d72f6144bfa848af397bb4`, tracked diff SHA-256 remained `f5338a0f7a19827923f466558478a30e0457bbc389b2aad22619bfd3d7af8eb1`, filtered status remained `e9e907d0b0d9f5ef030f3bdeb589f48f149c17722af15a3a9c80b0d2943bdb11`; all external/persistent/listener mutation counters zero.

- [x] Q1: A fresh independent UX & Product QA task validates the exact B1-B3 candidate read-only.
  CHECK: QA reproduces deterministic projection, source-drift hold, rollback, privacy and the five-question comprehension boundary against the immutable candidate.
  EXPECT: `PASS_UX_PRODUCT_QA_ONLY` or a fail-closed verdict; no promotion authority.
  EVIDENCE: `PASS_UX_PRODUCT_QA_ONLY` at QA carrier `12c49b2b9486717d64a3c0c20ba17d42305c753f`, tree `b53e8dd7f3cbbad812eb304916268c6b76699f0a`, parent exact Builder receipt carrier `6ab2135aae8e2d3aae418a19434a51da45e42c05`; receipt SHA-256 `8393bac64d818efe2add97ea0bbea139879fb7b3143cd34fc63c9ac4a1b99126`; regressions `102/102`, seven source-drift holds, five distinct states, privacy hits `0/7`, hostile traps `0`, retries/transitions/root/registry/provider mutations and false completions all zero. Residual: deterministic JSON contract only; no deployed rendering or accessibility evidence.

- [x] A1: A separate fresh Release Audit validates exact lineage, scope, rollback, privacy, test evidence and active-root non-mutation.
  CHECK: audit independently re-pins the candidate and Q1 carrier and attacks dirty-state/ref/cutover boundaries.
  EXPECT: `PASS_RELEASE_AUDIT_ONLY` or a fail-closed verdict; no activation, deployment or release authority.
  EVIDENCE: `PASS_RELEASE_AUDIT_ONLY` at Audit carrier `66a8a79447e07140e4cf976c51dcf83a0c79e783`, tree `85db5b484e9aece1586d2746812bff7689bab9b4`, parent exact QA carrier `12c49b2b9486717d64a3c0c20ba17d42305c753f`; receipt SHA-256 `1a9297b76a53b7158da6ce9e4dd3bce460c29f0c77a42fad5d0ae464002075e6`; linear single-parent lineage, merges zero, artifact bytes/digest reproduced, regressions `102/102`, source drift/Proxy/accessor/privacy/authority/rollback hostile checks passed, active root unchanged, mutation/retry/unauthorized-transition/false-completion counters zero. Residuals remain no deployed rendering/accessibility, Preview, Production, deployment, release, external activation, active-root cutover, Cherry C1 or Phase completion.

- [x] C1: Cherry accepts the independently verified canonical-package candidate before any active-root cutover.
  CHECK: exact candidate and audit carriers are named in an immutable acceptance receipt.
  EXPECT: candidate acceptance only; active-root cutover remains a separate dirty-aware Builder operation.
  EVIDENCE: Cherry replied exact `승인` on 2026-09-01 KST after receiving the immutable result: Audit carrier `66a8a79447e07140e4cf976c51dcf83a0c79e783`, `PASS_RELEASE_AUDIT_ONLY`, deterministic projection artifact SHA-256 `3c91151af4694292d5a94ede1d39c29d6ab176510acb984e258519a094125ead`, regressions `102/102`, and active-root mutation count zero. Authority accepts this exact canonical-package candidate and permits one separate dirty-aware Builder cutover handoff; it does not authorize unsafe conflict resolution, Preview, Production, deployment, release, external activation or Phase completion.

- [ ] O1: The accepted candidate performs one real OUTCOME selective-context dogfood selection from current repository inputs.
  CHECK: exact loaded/skipped sources, projected next action, source digest and safety counters are recorded; automatic retry, duplicate execution, unauthorized transition and false completion remain zero.
  EXPECT: dogfood evidence may update the projection and Phase 3 residual assessment only; it cannot activate external runtime or close Phase 3 by itself.
  EVIDENCE: pending.

## Stop conditions

- Any source, ancestry, role binding, dirty fingerprint, output determinism, privacy allowlist or rollback mismatch is `SAFE_HOLD`.
- The checked-out `codex/hp1-session-bearer` ref and root worktree remain untouched until B1-B3, Q1, A1 and C1 are closed and a separate dirty-aware cutover handoff exists.
- Preview, Production, deployment, release, provider/database/credential/registry mutation and Phase completion are outside this Gate.
