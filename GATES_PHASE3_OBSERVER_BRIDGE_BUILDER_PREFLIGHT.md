# OUTCOME Phase 3 · Observer Bridge Builder Preflight

Status: **CHERRY-APPROVED DIRECTION / SYNTHETIC BUILDER HANDOFF READY / HOSTED AND REAL-USE LOCKED**

Checked B items prove architecture and future handoff document completeness only. They issue no implementation source pin and do not close O2.

- [x] B1: approved amendment, exact source and hosted/real-use lock are explicit.
  PROVES: documentation
  CHECK: rg -q 'source commit: `70ecfef812ad89b0ed93bdaf5d2deae3cb02ff70`' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'approved amendment: `docs/PHASE3_O2_OBSERVER_BRIDGE_CONTRACT_AMENDMENT.md`' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'implementation source pin is not issued' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && echo B1_PASS
  EXPECT: the documents trace to the approved direction without authorizing implementation or hosted work.
  EVIDENCE: architecture Exact source and brief Authority boundary; completeness only.

- [x] B2: component/state ownership and separation from all three existing modules are complete.
  PROVES: architecture
  CHECK: test "$(sed -n '/^## Architecture components and state ownership/,/^## Cryptographic recommendation/p' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md | rg -c '^[|] (Local|Private|Bridge|Append|Deterministic|Authenticated|Privacy|Operations)')" -eq 8 && rg -q 'do \*\*not\*\* already implement this architecture' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'two-source topology must not be reused as proof semantics' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && echo B2_PASS
  EXPECT: the bridge is a separate ingest/auth/ledger boundary with one publisher and two viewers.
  EVIDENCE: architecture Relationship and Components; completeness only.

- [x] B3: Ed25519, public-key-only server custody, strict schema and unambiguous canonical serialization are pinned.
  PROVES: architecture
  CHECK: rg -Fq "generateKeyPairSync('ed25519')" docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'server registry stores only the corresponding public verification key' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'OUTCOME_OBSERVER_BRIDGE_EVENT_V1' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && test "$(sed -n '/^## Strict event schema/,/^## Constructor-only synthetic registration/p' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md | rg -c '^[|] `')" -eq 12 && echo B3_PASS
  EXPECT: every semantic field except signature has one canonical signed byte representation.
  EVIDENCE: architecture Cryptographic recommendation, Canonical bytes and Strict schema; completeness only.

- [x] B4: constructor authorization, exact validation order and atomic no-mutation failure are defined.
  PROVES: architecture
  CHECK: rg -q 'synthetic factory receives immutable source registrations' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && test "$(sed -n '/^## Ingest validation and atomic commit order/,/^## Time and freshness/p' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md | rg -c '^[1-9][0-9]*\. ')" -eq 10 && rg -q 'No failure exposes which private source/key value exists' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && echo B4_PASS
  EXPECT: hostile materialization, authorization, time, crypto and response failures consume no state or IDs.
  EVIDENCE: architecture Constructor registration and Ingest order; completeness only.

- [x] B5: sequence, quarantine, resync, lifecycle and exact-revision recovery semantics are complete.
  PROVES: architecture
  CHECK: rg -q 'Same sequence plus the same canonical digest is idempotent' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'Same sequence plus a different digest' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'A jump greater than one' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'There is no automatic replay or redelivery' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q '`restore`: exact disabled revision' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && echo B5_PASS
  EXPECT: replay/conflict/gap and disable/restore cannot silently promote or replay activity.
  EVIDENCE: architecture Sequence and Operations; completeness only.

- [x] B6: viewer classes, authorization and privacy-minimal projection are finite and non-enumerating.
  PROVES: privacy
  CHECK: rg -q '`workstation|remote_device`' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && rg -q 'class alone grants nothing' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && test "$(sed -n '/^## Projection and viewer authorization/,/^## Operations/p' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md | rg -c '^```text$')" -eq 1 && rg -q 'Anonymous, wrong-project' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md && echo B6_PASS
  EXPECT: two synthetic locations can compare one projection without exposing private source/key/event data or becoming identity.
  EVIDENCE: architecture Constructor viewers and Projection; completeness only.

- [x] B7: future paths are exact and the RED matrix plus focused/full/security/build/scope validation is complete.
  PROVES: handoff
  CHECK: test "$(sed -n '/^## Future allowed paths/,/^## Candidate outcome/p' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md | rg -c '^[1-3]\. `')" -eq 3 && test "$(rg -c '^### R[1-8] ·' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md)" -eq 8 && rg -q 'node --test server/phase3-observer-bridge.test.mjs' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'npm run test:security' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'npm run check:scope' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && echo B7_PASS
  EXPECT: a future exact-pin Builder can execute red-first without broadening files or checks.
  EVIDENCE: synthetic brief Allowed paths, RED matrix and Required validation; completeness only.

- [x] B8: threat model, rollback, staged authority and ABANDON keep synthetic, hosted, O2, routing and upper authorities separate.
  PROVES: non_authority
  CHECK: test "$(sed -n '/^## Threat model/,/^## Rollback/p' docs/PHASE3_OBSERVER_BRIDGE_ARCHITECTURE.md | rg -c '^[|] (Forged|Cross|Replay|Stolen|Parser|Clock|Viewer|Private|False|Disable)')" -eq 10 && rg -q 'passing synthetic candidate still requires fresh independent QA' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && rg -q 'does not close O2 or authorize hosting/real use' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && rg -q '^\*\*ABANDON:\*\* this brief is documentation handoff readiness' docs/PHASE3_OBSERVER_BRIDGE_SYNTHETIC_BUILDER_BRIEF.md && echo B8_PASS
  EXPECT: documentation readiness cannot be promoted to implementation, hosted, real-use or completion authority.
  EVIDENCE: architecture Threat model/Rollback/Staging and brief terminal boundary; completeness only.

ABANDON: B1–B8 prove architecture and handoff documentation completeness only. No implementation source pin, code authority, hosted/account/provider/device authority, O2 proof, progress, routing, QA, Audit, release or Cherry acceptance is created.
