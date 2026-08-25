# Phase 2 · Account Access Implementation Gates

Outcome: 승인된 K1-K6 계약을 벗어나지 않는 Cherry-only authenticated read-only workspace candidate와 재현 가능한 증거를 만든다.

- [ ] I1: exact Builder ticket, base commit, allowed paths와 non-scope가 고정된다.
  PROVES: architecture
  EVIDENCE: pending
- [ ] I2: public page/API/health와 mutation 405/redaction/receipt 동작이 회귀 없이 보존된다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] I3: Google primary, Apple linked access, email-code fallback의 provider-neutral auth boundary와 session/logout/revoke/recovery failure states가 red-first tests로 구현된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] I4: server-derived owner/workspace membership, two-project allowlist, RLS contract와 forged/cross-workspace deny tests가 구현된다.
  PROVES: security
  EVIDENCE: pending
- [ ] I5: append-only snapshot/current pointer, migration, retention/export/deletion/restore contract가 synthetic fixtures로 검증된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] I6: rate limit, redacted metrics/alerts, cost thresholds, incident receipt와 fail-closed rollback binding이 검증된다.
  PROVES: evidence
  EVIDENCE: pending
- [ ] I7: MacBook/mobile의 login/loading/empty/stale/conflict/unavailable/session-expired/access-denied/safe-degraded states와 accessibility가 검증된다.
  PROVES: test
  EVIDENCE: pending
- [ ] I8: exact candidate commit/tree/asset, tests, migrations, synthetic fixtures, rollout/rollback과 changed-files receipt가 immutable handoff로 전달된다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: production provider/resource/secret/database/domain mutation, additional projects/users, write features, session relay/dispatch와 release는 포함하지 않는다.
