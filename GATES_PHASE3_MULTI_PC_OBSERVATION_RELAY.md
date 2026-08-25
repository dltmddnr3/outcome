# OUTCOME Phase 3 · Multi-PC Observation Relay Gates

Outcome: 여러 관찰 위치의 기존 세션 상태를 source·sequence·freshness가 붙은 public-safe NOW로 일관되게 투영한다.

- [ ] O1: observation event가 project, role, binding version, source host, sequence, observed_at, availability, redacted NOW를 보존한다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] O2: Mac mini와 MacBook/모바일 원격 중 서로 다른 두 관찰 위치에서 같은 binding 의미와 freshness가 증명된다.
  PROVES: real_use
  EVIDENCE: pending
- [ ] O3: missing, stale, offline, unknown, conflicting observation을 active/NOW/progress로 합성하지 않는다.
  PROVES: test
  EVIDENCE: pending
- [ ] O4: duplicate와 out-of-order sequence가 최신 valid projection을 덮지 않고 conflict evidence를 남긴다.
  PROVES: test
  EVIDENCE: pending
- [ ] O5: observation payload의 raw IDs, path, prompt/result, credentials가 public projection과 logs에서 redacted된다.
  PROVES: security
  EVIDENCE: pending
- [ ] O6: source disconnect/reconnect, sequence gap, relay disable/restore의 복구와 read-only fallback이 증명된다.
  PROVES: rollback
  EVIDENCE: pending

ABANDON: observation activity는 Gate closure·진행률·approval 또는 message dispatch 권한이 아니다.
