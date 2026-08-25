# OUTCOME Phase 3 · Planner-only Work Routing Gates

Outcome: Cherry 요청을 project Planner가 유일한 routing authority로 검증해 exact target role binding에 중복 없이 전달한다.

- [ ] T1: instruction ledger가 immutable instruction ID, project, Planner binding, target role/binding, intent, scope, timestamps와 상태 전이를 보존한다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] T2: Planner 이외의 직접 role dispatch와 cross-project/wrong-role/wrong-binding route가 fail closed한다.
  PROVES: security
  EVIDENCE: pending
- [ ] T3: idempotency key와 attempt ID가 duplicate request/retry에서 단일 logical instruction과 receipt를 보장한다.
  PROVES: test
  EVIDENCE: pending
- [ ] T4: queued, delivered, acknowledged, timed_out, cancelled, failed 상태가 receipt 없이 success로 승격되지 않는다.
  PROVES: test
  EVIDENCE: pending
- [ ] T5: timeout, provider unavailable, replaced binding, cancellation과 bounded/manual retry가 안전하게 동작한다.
  PROVES: rollback
  EVIDENCE: pending
- [ ] T6: 실제 provider dispatch는 Cherry-authorized proof window와 allowlisted project/role 밖에서 비활성이고 임의 shell/file/release mutation을 허용하지 않는다.
  PROVES: security
  EVIDENCE: pending
- [ ] T7: OUTCOME+Cherry Note 중 승인 프로젝트에서 단일 routed task가 Planner→target receipt까지 immutable candidate evidence로 증명된다.
  PROVES: real_use
  EVIDENCE: pending

ABANDON: routing candidate는 Builder 결과, QA, Audit, Cherry acceptance, release 또는 Gate closure를 자기 승인하지 않는다.
