# Phase 2 · Hosted Preview Fresh Release Audit Gates

Outcome: QA PASS 뒤 별도 fresh auditor가 동일 hosted candidate의 auth, hosted RLS/data lifecycle, privacy, operations, cost, runtime identity와 rollback을 독립 검증한다.

- [ ] A1: 새 격리 감사자가 독립 검수를 통과한 정확한 커밋·트리·배포·인증·데이터 영수증과 독립성을 확인한다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] A2: 전체 회귀, 실제 인증·세션, 행 단위 접근 제어 거부, 정보 가림, 요청 위조·출처, 변경 거부, 접근성과 영수증 일치가 통과한다.
  PROVES: test
  EVIDENCE: pending
- [ ] A3: 복원, 우선 비활성화 되돌리기, 세션 철회, 인증 제공자 장애, 방화벽·경보·비용 상한과 운영 환경 비활성 경계가 재현된다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] A4: 보고서가 출시 감사만 통과 또는 실패로 끝나며 Cherry 승인, 운영 환경 변경, 출시와 완료 권한을 주장하지 않는다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: Release Audit은 provider/data mutation, Cherry acceptance, release approval, Phase completion 또는 `EXTERNAL_OUTCOME_COMPLETE`를 수행하지 않는다.
