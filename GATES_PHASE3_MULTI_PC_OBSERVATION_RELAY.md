# OUTCOME Phase 3 · Multi-PC Observation Relay Gates

Outcome: 여러 관찰 위치의 기존 세션 상태를 source·sequence·freshness가 붙은 public-safe NOW로 일관되게 투영한다.

- [x] O1: observation event가 project, role, binding version, source host, sequence, observed_at, availability, redacted NOW를 보존한다.
  PROVES: implementation
  EVIDENCE: implementation `6155595684500e201192a0ab2096ead822abbde7` / tree `3876b7d51b7c541cfc627c7bf495b080e8754687`; exact six-state Korean NOW vocabulary와 null, typed event fields를 fresh QA가 독립 확인했다.
- [ ] O2: Mac mini와 MacBook/모바일 원격 중 서로 다른 두 관찰 위치에서 같은 binding 의미와 freshness가 증명된다.
  PROVES: real_use
  EVIDENCE: pending
- [x] O3: missing, stale, offline, unknown, conflicting observation을 active/NOW/progress로 합성하지 않는다.
  PROVES: test
  EVIDENCE: idle·offline·unknown·stale 60001ms·future +5001ms·duplicate conflict·out-of-order·gap·disconnect에서 NOW `null`; progress/completion/approval/dispatch field 0.
- [x] O4: duplicate와 out-of-order sequence가 최신 valid projection을 덮지 않고 conflict evidence를 남긴다.
  PROVES: test
  EVIDENCE: exact duplicate idempotent, conflicting duplicate/out-of-order/gap은 last valid sequence를 덮지 않고 append-only safe evidence를 남겼다.
- [x] O5: observation payload의 raw IDs, path, prompt/result, credentials가 public projection과 logs에서 redacted된다.
  PROVES: security
  EVIDENCE: free-text input을 제거하고 exact six-state vocabulary+null만 허용; 과거 raw/encoded/path/locator/credential envelope `138/138` 거부, public projection/evidence key set과 serialization에서 원문 노출 0.
- [x] O6: source disconnect/reconnect, sequence gap, relay disable/restore의 복구와 read-only fallback이 증명된다.
  PROVES: rollback
  EVIDENCE: gap/disconnect는 ordinary ingest로 우회 불가, explicit reconnect+sequence CAS만 복구; disable은 write 차단, exact revision restore와 read-only projection/evidence 보존이 통과했다.

ABANDON: observation activity는 Gate closure·진행률·approval 또는 message dispatch 권한이 아니다.

Closure receipt: fresh independent `PASS_INDEPENDENT_QA_ONLY` report `b155ccf66269e0b4ee223c50706a22f439999518` / tree `92fb9734940283b99586b5d026625f5bf499270a`. O1·O3–O6만 evidence-closed며 O2 실제 두 위치는 `OPEN/LOCKED`; Phase 3·Release Audit·Cherry acceptance는 별도다.
