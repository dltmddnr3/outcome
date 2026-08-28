# OUTCOME Role Transport Trusted Evidence Correction Gate

Outcome: actual Codex app peer-thread inventory, provider delivery, destination start, and same-role binding rotation are correlated through trusted private evidence rather than caller assertions, so OUTCOME can rotate and dispatch role sessions automatically without false progress or private locator exposure.

- [x] T1: role start rejects caller-declared match counts or verification booleans and consumes only evidence issued by a trusted resolver boundary.
  - CHECK: hostile focused tests forge exact-match booleans/counts without resolver evidence, use wrong project/role/version/destination, and replay stale resolver evidence.
  - EXPECT: every forged, mismatched, stale, duplicate, or replayed input fails atomically before event allocation.
  EVIDENCE: trust-origin RED reproduced the public factory-forgery acceptance path. The corrected public surface has no issuer/factory that accepts binding or peer arrays; a verifier pinned to one Ed25519 authority key rejects invented, tampered, mismatched, stale, duplicate, and replayed receipts before allocation; focused 41/41 PASS.

- [x] T2: provider delivery and destination start are separate correlated receipts for the same instruction, attempt, binding version, and destination.
  - CHECK: hostile tests cover wrong destination, wrong binding, wrong attempt, stale cursor, reused prior-turn `STARTED`, receipt substitution, and out-of-order transition.
  - EXPECT: only a fresh provider receipt can create `dispatch_observed`; only a later fresh destination observation can create `execution_started`.
  EVIDENCE: signed provider and destination receipts bind project, role, binding version, destination key, instruction, attempt, receipt identity, issue/expiry time, and observation cursor; wrong attempt, substitution, tamper, stale receipt, replay and out-of-order cases reject; focused 41/41 PASS.

- [x] T3: a protected same-role self-binding adapter supports one fail-closed CAS without argv, PTY, log, Git, API, or UI disclosure.
  - CHECK: focused adapter tests exercise verified private FD/protected context input, version drift, absent self context, malformed locator, unknown outcome, readback conflict, and duplicate invocation.
  - EXPECT: success returns only public-safe version/alias/history/doctor facts; every ambiguity is `SAFE_HOLD` with mutation 0 or exact readback evidence and automatic retry 0.
  EVIDENCE: adapter tests cover protected runtime self context, absent/malformed context, version drift, continuity failure, duplicate invocation and response-lost reconciliation; private locator is absent from serialized result; automatic retry 0.

- [x] T4: automatic rotation preserves predecessor until successor `STARTED + CONTINUITY_READY`, CAS readback, and registry doctor success.
  - CHECK: lifecycle tests prove archive eligibility only after those three facts and preserve replaced history/checkpoint digest.
  - EXPECT: predecessor remains recoverable; no delete or archive occurs inside the adapter.
  EVIDENCE: adapter requires both readiness facts and checkpoint digest, verifies exact CAS readback plus clean doctor, retains predecessor as replaced with archived=false, and preserves the digest; focused lifecycle/adapter tests PASS.

- [x] T5: existing execution lifecycle, session registry, Package projection, public redaction, privacy, retry lineage, and rotation regressions remain green.
  - CHECK: focused suites, complete frontend and Node suites, exhaustive Node suite, production build, security/public-boundary/scope/runbook checks.
  - EXPECT: all pass with prohibited public/private disclosure hits 0.
  EVIDENCE: npm test frontend 90/90 and Node 348/348 PASS; exhaustive Node 348/348 PASS; production build transformed 1,652 modules; git diff --check PASS. No registry, provider, runtime, environment, deploy, or predecessor state was mutated.

- [ ] T6: the correction is dogfooded only for the already-started actual UX & Product QA successor after the Builder candidate is immutable.
  - CHECK: exact version-2 binding, checkpoint SHA, successor `STARTED + CONTINUITY_READY`, one CAS attempt, version-3 readback, predecessor `replaced`, registry doctor clean.
  - EXPECT: QA successor becomes the sole current binding; no predecessor archive, provider/runtime/deploy mutation, or automatic retry occurs.
  - EVIDENCE: pending

Authority boundary: this Gate authorizes a Builder correction candidate and one private registry bootstrap CAS for the already-started QA successor after immutable Builder evidence. It does not authorize QA PASS, Release Audit, Cherry acceptance, deployment, release, or Phase progress.
