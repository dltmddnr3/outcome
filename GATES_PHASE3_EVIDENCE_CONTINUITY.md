# OUTCOME Phase 3 · Evidence Return & Continuity Gates

Outcome: routed instruction, role result, evidence receipt, Gate 판정과 session replacement history를 분리·상관시켜 중단 후에도 검증 가능한 연속성을 보존한다.

- [ ] E1: instruction, delivery receipt, role result, evidence pointer, candidate pin이 별도 entity와 immutable correlation로 보존된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] E2: role result가 evidence 또는 Gate closure로 자동 승격되지 않고 QA/Audit/Cherry authority가 분리된다.
  PROVES: test
  EVIDENCE: pending
- [ ] E3: receipt mismatch, candidate mismatch, missing hash, revoked binding의 evidence attach가 fail closed한다.
  PROVES: security
  EVIDENCE: pending
- [ ] E4: session replacement 뒤 old/new binding과 미확인 instruction을 재구성하고 자동 오배송 없이 explicit recovery한다.
  PROVES: rollback
  EVIDENCE: pending
- [ ] E5: public-safe receipt/result pointer와 private payload가 분리되고 export·retention·deletion·audit 계약이 검증된다.
  PROVES: privacy
  EVIDENCE: pending
- [ ] E6: restart/offline/partial failure 뒤 ledger replay가 duplicate result나 false completion 없이 같은 상태를 복원한다.
  PROVES: test
  EVIDENCE: pending

ABANDON: evidence continuity는 증거의 존재를 보존할 뿐 그 증거의 충분성이나 승인 판정을 대신하지 않는다.
