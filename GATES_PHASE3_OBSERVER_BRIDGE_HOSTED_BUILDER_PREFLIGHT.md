# OUTCOME Phase 3 · Observer Bridge Hosted Builder Preflight

Status: **LOCAL SYNTHETIC QA PASS / HOSTED HANDOFF READY / IMPLEMENTATION AND DEPLOYMENT LOCKED**

Checked H items prove documentation completeness only. They do not issue an implementation pin, authorize any hosted/external operation or close O2.

- [x] H1: exact local synthetic candidate and independent QA-only PASS are pinned without promotion.
  PROVES: documentation
  CHECK: rg -q 'hosted-planning source commit: `f864cdbe71e7d3e449bac2217a3ab17fa2034692`' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'local synthetic candidate: `3b0852a607c9eef984e72e08211d0297b9cde7f0`' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'QA verdict: `PASS_INDEPENDENT_QA_ONLY`' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && echo H1_PASS
  EXPECT: H1_PASS
  EVIDENCE: architecture Exact evidence; QA is local synthetic only and O2 remains open.

- [x] H2: owner browser, local companion, authenticated viewer and operations authority are separated; enrollment is scoped, expiring, single-use and proof-of-possession based.
  PROVES: architecture
  CHECK: test "$(sed -n '/^## Actors and authority separation/,/^## Enrollment protocol/p' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md | rg -c '^\| (Owner browser|Local companion publisher|Authenticated private viewer|Server operations authority)')" -eq 4 && rg -q 'exact `300`-second expiry, one-use state' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'private key never leaves the companion' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'unsupported Clerk machine tokens' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && echo H2_PASS
  EXPECT: H2_PASS
  EVIDENCE: architecture Actors and Enrollment protocol; viewer class and browser identity do not grant publisher authority.

- [x] H3: planned endpoints bind owner Origin/CSRF, companion signature/certificate/replay and authenticated viewer authorization while public mutations stay 405.
  PROVES: architecture
  CHECK: test "$(sed -n '/^## Planned private endpoint contracts/,/^## Companion ingest envelope/p' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md | rg -c '^\| `(?:POST|GET) /api/private/bridge/')" -eq 8 && rg -q 'same-origin verification and an explicit CSRF token' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'Companion endpoints do not use ambient cookies' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'public mutation `405 read_only` remain unchanged' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && echo H3_PASS
  EXPECT: H3_PASS
  EVIDENCE: architecture Planned endpoints and Companion ingest envelope; authentication precedes domain ingest.

- [x] H4: bridge-specific persistence, tenant authorization/RLS, CAS and atomic event/replay/projection/audit behavior are complete.
  PROVES: architecture
  CHECK: test "$(sed -n '/^## Persistence and authorization model/,/^## Privacy and retention/p' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md | rg -c '^\| `bridge_')" -eq 8 && rg -q 'Anonymous has no grants' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'locks/resolves the source revision, consumes replay state, appends the event/audit entry and advances the fold checkpoint atomically' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'real PostgreSQL tests' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md && echo H4_PASS
  EXPECT: H4_PASS
  EVIDENCE: architecture Persistence model and brief H3; static inspection is explicitly insufficient for future RLS proof.

- [x] H5: finite-state privacy, anonymous non-presence, safe logs/metrics, retention/export/deletion and no-raw-resurrection are explicit.
  PROVES: privacy
  CHECK: rg -q 'Prohibited everywhere: prompt/result/chat content' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'Public/anonymous dashboard: no private-project presence' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'no raw IDs or timestamps' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'reapply tombstones after restore so raw data cannot resurrect' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && echo H5_PASS
  EXPECT: H5_PASS
  EVIDENCE: architecture Privacy and retention; no raw provider/content/private-key surface is permitted.

- [x] H6: default-off operations, kill switch/read-only, revoke/rotate, limits, backup/restore and rollback cannot replay events or create false NOW.
  PROVES: operations
  CHECK: rg -q 'Feature flag defaults `off`' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'Independent ingest kill switch and private read-only mode' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'Rollback disables ingest first' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'never replays events or refreshes NOW' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md && echo H6_PASS
  EXPECT: H6_PASS
  EVIDENCE: architecture Operations and rollback plus brief H4; stale/offline is not progress.

- [x] H7: threat matrix, proposed path scope, H1-H5 slices, RED R1-R8 and proportional validation are complete but unauthorized.
  PROVES: handoff
  CHECK: test "$(sed -n '/^## Threat and failure matrix/,/^## Staged proof/p' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md | rg -c '^\| (Cross|Stolen|Compromised|Duplicate|Sequence|Clock|Database|Cache|Log|Rate|Migration|Account)')" -eq 12 && test "$(rg -c '^### H[1-5] ·' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md)" -eq 5 && test "$(rg -c '^### R[1-8] ·' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md)" -eq 8 && rg -Fq 'every proposed path below is **NOT YET AUTHORIZED**' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md && rg -q 'npm run test:security' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md && echo H7_PASS
  EXPECT: H7_PASS
  EVIDENCE: architecture Threat matrix and brief Proposed paths, H1-H5, R1-R8 and Required validation.

- [x] H8: real two-viewer proof, O2, routing and upper authorities remain separate; ABANDON denies implementation/deployment authority.
  PROVES: non_authority
  CHECK: rg -q 'real ten-minute O2 proof' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'Chat/message dispatch and Planner Routing T1–T7 remain separately locked' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_ARCHITECTURE.md && rg -q 'A passing hosted code candidate cannot close O2' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md && rg -q '^\*\*ABANDON:\*\* this brief is hosted Builder handoff documentation only' docs/PHASE3_OBSERVER_BRIDGE_HOSTED_BUILDER_BRIEF.md && echo H8_PASS
  EXPECT: H8_PASS
  EVIDENCE: architecture Staged proof/ABANDON and brief Locked boundary/ABANDON; no progress or completion authority.

ABANDON: H1–H8 prove hosted architecture and future Builder handoff documentation completeness only. No implementation source pin, code/migration authority, account/provider/environment/resource/device/network/deploy permission, O2 proof, progress, routing, QA, Audit, release or Cherry acceptance is created.
