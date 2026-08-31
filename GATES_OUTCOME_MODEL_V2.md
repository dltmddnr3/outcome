# OUTCOME Model v2 acceptance predicates

Outcome: OUTCOME이 안정적인 목적 의미와 동적 실행을 분리하고, 현재 frontier를 자동 계산해 세션·runtime 교체와 재계획 중에도 canonical 목적 달성을 지속한다.

Status: **C3 ACCEPTED · ACTIVATION / DEPLOYMENT / RELEASE OPEN**

## A · Architecture contract

- [x] A1: The model separates the durable Outcome Graph, dynamic Execution Graph and derived Current Projection.
  CHECK: rg -q "Outcome Graph" docs/OUTCOME_MODEL_V2.md && rg -q "Execution Graph" docs/OUTCOME_MODEL_V2.md && rg -q "Current Projection" docs/OUTCOME_MODEL_V2.md && echo A1_PASS
  EXPECT: `A1_PASS`
  EVIDENCE: `docs/OUTCOME_MODEL_V2.md` defines all three owners.

- [x] A2: Scope is not a canonical execution level and Phase/Stage/Gate have explicit compatibility meanings.
  CHECK: rg -q 'Scope.*canonical entity에서 제거' docs/OUTCOME_MODEL_V2.md && rg -q 'Phase.*Destination' docs/OUTCOME_MODEL_V2.md && rg -q 'Gate.*Acceptance Predicate' docs/OUTCOME_MODEL_V2.md && echo A2_PASS
  EXPECT: `A2_PASS`
  EVIDENCE: v1 compatibility section records the migration semantics.

- [x] A3: Canonical, derived and runtime state have one write authority each.
  CHECK: rg -q "Canonical, derived and runtime ownership" docs/OUTCOME_MODEL_V2.md && rg -q "deterministic projector only" docs/OUTCOME_MODEL_V2.md && echo A3_PASS
  EXPECT: `A3_PASS`
  EVIDENCE: ownership table forbids manual projection authority.

- [x] A4: Mission authority, risk escalation and verification triggers are explicit.
  CHECK: rg -q "Mission envelope default" docs/OUTCOME_MODEL_V2.md && rg -q "Triggered verification" docs/OUTCOME_MODEL_V2.md && echo A4_PASS
  EXPECT: `A4_PASS`
  EVIDENCE: authority and trigger sections are present.

- [x] A5: The migration preserves historical evidence and has a one-candidate rollback.
  CHECK: rg -q "기존 226개 root" docs/OUTCOME_MODEL_V2.md && rg -q "feature flag default OFF" docs/OUTCOME_MODEL_V2.md && rg -q "v1 projection으로 복귀" docs/OUTCOME_MODEL_V2.md && echo A5_PASS
  EXPECT: `A5_PASS`
  EVIDENCE: migration and rollback contract preserves existing files.

## P · Live pilot

- [x] P1: A machine-readable v2 Outcome Graph schema validates Project, Destination, Milestone, Acceptance Predicate and Evidence Claim without Scope as a required entity.
  CHECK: git show 9f806d611292cb801962962db2133042750e19ee:docs/OUTCOME_MODEL_V2_PILOT_BUILDER_RECEIPT.md | rg -q 'P1: implemented a strict machine-readable v2 graph' && git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'Model/control-plane focused tests: `51/51` passed' && echo P1_PASS
  EXPECT: `P1_PASS`
  EVIDENCE: Builder receipt carrier `9f806d611292cb801962962db2133042750e19ee`; fresh optimization QA carrier `e20f29c922719a6fe0c1ba0ad168da97c39eef8e`, receipt SHA-256 `f4f6c907223cd3b28f81d44374dd07b43ce2a7770923a0b96c2e3aa72748f68c`.

- [x] P2: Existing v1 Package input is translated into a compatibility projection without changing historical Gate evidence.
  CHECK: git show 9f806d611292cb801962962db2133042750e19ee:docs/OUTCOME_MODEL_V2_PILOT_BUILDER_RECEIPT.md | rg -q 'P2: implemented a pure v1 compatibility translator' && git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'exact v1 object and preserved serialized source bytes' && echo P2_PASS
  EXPECT: `P2_PASS`
  EVIDENCE: exact default-off object/byte compatibility was revalidated by fresh QA on the optimization candidate.

- [x] P3: Current position, progress, ready frontier, next action and Cherry action come from one versioned projector snapshot.
  CHECK: git show 9f806d611292cb801962962db2133042750e19ee:docs/OUTCOME_MODEL_V2_PILOT_BUILDER_RECEIPT.md | rg -q 'P3: implemented one versioned projection' && git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'Source or candidate drift returns `cold_compile_required`' && echo P3_PASS
  EXPECT: `P3_PASS`
  EVIDENCE: Builder projection evidence plus fresh QA drift rejection on candidate `6379cfd0c47dd8b97e80fd6876c90ef1b38b0c88`.

- [x] P4: The existing execution control plane is wired behind a default-off Codex runtime adapter for one low-risk local canary.
  CHECK: git show 9f806d611292cb801962962db2133042750e19ee:docs/OUTCOME_MODEL_V2_PILOT_BUILDER_RECEIPT.md | rg -q 'P4: reused the existing execution control plane' && git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'has no canonical commit method' && echo P4_PASS
  EXPECT: `P4_PASS`
  EVIDENCE: fresh C2 audit confirms the adapter is projection-only and has no canonical-transition authority.

- [x] P5: Duplicate fingerprints, stale frontier, expired mission envelope and overlapping lease are denied atomically.
  CHECK: git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'duplicate work fingerprints and an already-active fingerprint allocate no next action' && git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'overlapping live lease keys fail closed' && echo P5_PASS
  EXPECT: `P5_PASS`
  EVIDENCE: fresh Release Audit hostile matrix on the exact candidate, carrier `c58eea93f93098d2f66c886cc2c066d991048a47`.

- [x] P6: Timeout remains terminal `delivery_unknown`; no automatic retry occurs.
  CHECK: git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'Automatic retry count: `0`' && git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'terminal `delivery_unknown` requires an explicit decision' && echo P6_PASS
  EXPECT: `P6_PASS`
  EVIDENCE: QA and Audit both independently retain terminal `delivery_unknown` and automatic retry count zero.

- [x] P7: Triggered QA/Audit runs once per coherent candidate and does not trigger for no-semantic-delta history events.
  CHECK: git show 9f806d611292cb801962962db2133042750e19ee:docs/OUTCOME_MODEL_V2_PILOT_BUILDER_RECEIPT.md | rg -q 'P7: coherent candidate identity includes source tree' && git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'Source or candidate drift returns' && echo P7_PASS
  EXPECT: `P7_PASS`
  EVIDENCE: coherent-candidate identity and drift behavior were implemented and revalidated; the optimization candidate received exactly one fresh QA and one fresh C2 audit.

- [x] P8: v2 can be disabled and v1 projection restored without registry, Gate, receipt or external mutation.
  CHECK: git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'Rollback is to remove or avoid the exact opt-in flag' && git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'does not delete or mutate the private registry' && echo P8_PASS
  EXPECT: `P8_PASS`
  EVIDENCE: fresh C2 audit verifies exact flag-off v1 restoration and non-destructive rollback.

## S · Speed and safety

- [x] S1: The local decision engine stays within an absolute latency budget: hot eligible-work start p95 <= `0.01 ms/op` and cold compile p95 <= `0.1 ms/compile` on the pinned local canary fixture. Relative v1 parity is diagnostic only because the v1 baseline is near zero and does not include the v2 safety checks.
  CHECK: git show 149e77c99f564d50cd2ef35bd182bd4832ec06d7:docs/OUTCOME_MODEL_V2_PILOT_S1_OPTIMIZATION_RECEIPT.md | rg -q 'v2 hot p50/p95: `11.018541 / 11.817167 ms`' && git show 149e77c99f564d50cd2ef35bd182bd4832ec06d7:docs/OUTCOME_MODEL_V2_PILOT_S1_OPTIMIZATION_RECEIPT.md | rg -q 'p95: `11.977083 ms/200`' && echo S1_PASS
  EXPECT: `S1_PASS` (hot p95 `0.0059085835 ms/op`; cold p95 `0.059885415 ms/compile`)
  EVIDENCE: optimization receipt carrier `149e77c99f564d50cd2ef35bd182bd4832ec06d7`, receipt SHA-256 `3e406a2a03794cf3032c7e0ab1f997f970a882a736a6f1c7ed4500a480469dea`. This closes only the latency predicate; candidate promotion still requires fresh C1/C2 on exact candidate `6379cfd0c47dd8b97e80fd6876c90ef1b38b0c88`.

- [x] S2: Normal-path Cherry intervention, duplicate execution, automatic retry, unauthorized canonical transition and false completion are all zero in the pinned canary.
  CHECK: git show 149e77c99f564d50cd2ef35bd182bd4832ec06d7:docs/OUTCOME_MODEL_V2_PILOT_S1_OPTIMIZATION_RECEIPT.md | rg -q 'Duplicate execution count: `0`' && git show 149e77c99f564d50cd2ef35bd182bd4832ec06d7:docs/OUTCOME_MODEL_V2_PILOT_S1_OPTIMIZATION_RECEIPT.md | rg -q 'Automatic retry count: `0`' && git show 149e77c99f564d50cd2ef35bd182bd4832ec06d7:docs/OUTCOME_MODEL_V2_PILOT_S1_OPTIMIZATION_RECEIPT.md | rg -q 'Unauthorized canonical transition count: `0`' && git show 149e77c99f564d50cd2ef35bd182bd4832ec06d7:docs/OUTCOME_MODEL_V2_PILOT_S1_OPTIMIZATION_RECEIPT.md | rg -q '`false_completion_count`: `0`' && echo S2_PASS
  EXPECT: `S2_PASS`
  EVIDENCE: the same immutable S1/S4 canary records all four counters at zero. No human intervention was required in the measured local decision path.

- [x] S3: At least 70% of correction/handoff/status artifacts are excluded from the active projection while remaining recoverable as history.
  CHECK: git show 9f806d611292cb801962962db2133042750e19ee:docs/OUTCOME_MODEL_V2_PILOT_BUILDER_RECEIPT.md | rg -q 'S3: three of three supplied correction/handoff/status artifact classes are excluded' && echo S3_PASS
  EXPECT: `S3_PASS`
  EVIDENCE: `3/3` supplied history artifact classes excluded from the active graph and retained in v1 history (`100%`).

- [x] S4: Every completed pilot cycle produces a non-zero outcome delta or an exact Cherry decision request.
  CHECK: git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'The disposable canary ran `27/27` terminal cycles' && git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'Invalid terminal count: `0`' && echo S4_PASS
  EXPECT: `S4_PASS`
  EVIDENCE: fresh QA independently passed `27/27` terminal cycles with invalid terminals and all safety counters at zero.

## C · Activation

- [x] C1: Fresh UX & Product QA validates the same immutable v2 candidate and affected current/next semantics.
  CHECK: git show e20f29c922719a6fe0c1ba0ad168da97c39eef8e:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_REQA_RECEIPT.md | rg -q 'Verdict: \*\*PASS_UX_PRODUCT_QA_ONLY\*\*' && echo C1_PASS
  EXPECT: `C1_PASS`
  EVIDENCE: fresh QA carrier `e20f29c922719a6fe0c1ba0ad168da97c39eef8e`, tree `2e970fe6c0756ace48773eb4672548cfb363f2d4`, receipt SHA-256 `f4f6c907223cd3b28f81d44374dd07b43ce2a7770923a0b96c2e3aa72748f68c`. Exact diff is server-only, so rendered UI/accessibility was correctly N/A rather than inferred PASS.

- [x] C2: Separate fresh Release Audit validates scope, privacy, rollback, runtime authority and artifact identity.
  CHECK: git show c58eea93f93098d2f66c886cc2c066d991048a47:docs/OUTCOME_MODEL_V2_PILOT_OPTIMIZATION_RELEASE_AUDIT_RECEIPT.md | rg -q 'Verdict: \*\*PASS_RELEASE_AUDIT_ONLY\*\*' && echo C2_PASS
  EXPECT: `C2_PASS`
  EVIDENCE: fresh audit carrier `c58eea93f93098d2f66c886cc2c066d991048a47`, tree `010e593dccef7929e4cad61d2966b97112402af8`, receipt SHA-256 `ccade6294f693bfac6c86bf0fec645dfdddc3ced31292acccf810b5d67dd3606`, quality `97/100`. Formal WhiteCastle completion and live deployment remain excluded.

- [x] C3: Cherry accepts the exact v2 candidate as the OUTCOME Package model; canonical promotion, runtime activation, deployment and release remain separate decisions.
  CHECK: printf '%s  %s\n' '19623f26b061a233de17935cda2e44273c31f099fb629b8f6016fee7c4b8170a' 'docs/OUTCOME_MODEL_V2_C3_CHERRY_ACCEPTANCE_RECEIPT.md' | shasum -a 256 -c -
  EXPECT: `docs/OUTCOME_MODEL_V2_C3_CHERRY_ACCEPTANCE_RECEIPT.md: OK`
  EVIDENCE: Cherry's exact decision `Model v2 C3 수용 승인 — 활성화·배포·릴리즈는 별도 결정`, recorded in the content-addressed acceptance receipt SHA-256 `19623f26b061a233de17935cda2e44273c31f099fb629b8f6016fee7c4b8170a`.
