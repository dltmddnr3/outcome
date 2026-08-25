# OUTCOME Phase 3 · Codex Adapter Technical Spike Gates

Outcome: Codex-only first adapter가 기존 세션의 public-safe 관찰과 Planner-routed instruction을 지원 가능한 공식·승인 interface로 구현될 수 있는지 증명하고, 불가능하거나 불명확하면 read-only observation 또는 manual deep-link fallback으로 fail closed한다.

- [ ] S1: Codex app/API/CLI/local interface의 공식 지원 범위, 인증, 약관, 호출 한도, 비용, version lifecycle과 Mac mini 사용 허용 여부가 primary source로 고정된다.
  PROVES: technical_diligence
  EVIDENCE: pending
- [ ] S2: existing thread/session을 project+role에 식별·관찰하는 최소 read interface가 raw private store 변조나 unsupported scraping 없이 재현된다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] S3: Planner instruction을 exact existing target session으로 전달하는 지원 interface, acknowledgement 의미, timeout와 duplicate 동작이 synthetic/no-op proof로 검증된다.
  PROVES: test
  EVIDENCE: pending
- [ ] S4: Codex source model을 OUTCOME binding·observation·instruction·receipt domain으로 정규화하는 adapter mapping과 unsupported/null/conflict 의미가 고정된다.
  PROVES: architecture
  EVIDENCE: pending
- [ ] S5: token, raw session/thread/task/turn ID, local path, prompt/result가 public surface와 logs에서 0건이며 least-privilege secret storage·rotation·revocation이 검증된다.
  PROVES: security
  EVIDENCE: pending
- [ ] S6: GO/NO-GO가 exact evidence로 판정되고 NO-GO 시 read-only observation, manual open/deep-link 또는 unbound fallback 중 지원 가능한 최소 경로만 선택된다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: 공식·승인 interface가 확인되지 않으면 private Codex DB reverse engineering, UI scraping, credential extraction, hidden endpoint 호출 또는 실제 사용자 세션 mutation으로 가능성을 꾸며내지 않는다.
