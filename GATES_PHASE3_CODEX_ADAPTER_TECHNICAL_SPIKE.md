# OUTCOME Phase 3 · Codex Adapter Technical Spike Gates

Outcome: Codex-only first adapter가 기존 세션의 public-safe 관찰과 Planner-routed instruction을 지원 가능한 공식·승인 interface로 구현될 수 있는지 증명하고, 불가능하거나 불명확하면 read-only observation 또는 manual deep-link fallback으로 fail closed한다.

- [x] S1: Codex app/API/CLI/local interface의 공식 지원 범위, 인증, 약관, 호출 한도, 비용, version lifecycle과 Mac mini 사용 허용 여부가 primary source로 고정된다.
  PROVES: technical_diligence
  CHECK: node --test --test-name-pattern='S1 inventory' spikes/codex-adapter/codex-adapter.test.mjs
  EXPECT: /pass 1[\s\S]*fail 0/
  EVIDENCE: 2026-08-26 KST official App Server/CLI/SDK/pricing 문서와 installed `codex-cli 0.149.0-alpha.4` schema를 pin했다. read/resume/start/ack/auth는 supported, native OUTCOME binding과 production WebSocket은 unsupported, idempotency/timeout/limit/cost/unattended permission/terms/credential lifecycle은 unknown으로 고정했다. unknown을 GO로 승격하지 않는다. targeted `1/1` PASS.
- [x] S2: existing thread/session을 project+role에 식별·관찰하는 최소 read interface가 raw private store 변조나 unsupported scraping 없이 재현된다.
  PROVES: implementation
  CHECK: node --test --test-name-pattern='S2 observation' spikes/codex-adapter/codex-adapter.test.mjs
  EXPECT: /pass 2[\s\S]*fail 0/
  EVIDENCE: official `thread/read`가 resume/subscription 없이 exact stored thread summary를 읽는 계약임을 확인하고 synthetic binding observation mapping을 구현했다. wrong project/role, unbound, missing binding은 conflict/unbound/unknown으로 fail closed한다. 실제 session enumeration/read `0`. targeted `2/2` PASS.
- [x] S3: Planner instruction을 exact existing target session으로 전달하는 지원 interface, acknowledgement 의미, timeout와 duplicate 동작이 synthetic/no-op proof로 검증된다.
  PROVES: test
  CHECK: node --test --test-name-pattern='S3 dispatch' spikes/codex-adapter/codex-adapter.test.mjs
  EXPECT: /pass 4[\s\S]*fail 0/
  EVIDENCE: synthetic `turn/start` envelope는 exact private target을 유지하되 `transmitted=false`; wrong project/role/binding과 confirmation 누락은 deny, timeout은 delivery_unknown/no retry, duplicate는 local dedupe, started/response와 completed를 분리한다. 실제 send/model/high-risk execution `0`. targeted `4/4` PASS.
- [x] S4: Codex source model을 OUTCOME binding·observation·instruction·receipt domain으로 정규화하는 adapter mapping과 unsupported/null/conflict 의미가 고정된다.
  PROVES: architecture
  CHECK: node --test --test-name-pattern='S4 mapping' spikes/codex-adapter/codex-adapter.test.mjs
  EXPECT: /pass 2[\s\S]*fail 0/
  EVIDENCE: binding/observation/instruction/receipt를 supported/unsupported/unknown/conflict로 정규화하고 protocol accepted/activity가 completion으로 바뀌지 않음을 고정했다. targeted `2/2` PASS.
- [x] S5: token, raw session/thread/task/turn ID, local path, prompt/result가 public surface와 logs에서 0건이며 least-privilege secret storage·rotation·revocation이 검증된다.
  PROVES: security
  CHECK: node --test --test-name-pattern='S5 boundary' spikes/codex-adapter/codex-adapter.test.mjs && node spikes/codex-adapter/check-public-output.mjs
  EXPECT: /pass 3[\s\S]*fail 0[\s\S]*prohibited_hits=0[\s\S]*high_risk_execution_count=0/
  EVIDENCE: synthetic public projection/log prohibited hits `0`, existing API/HTML/bundle/rendered UI prohibited identifiers `0`, high-risk execution `0`. credential을 읽거나 저장하지 않았고 production rotation/revocation design은 unknown으로 남겨 GO를 차단한다. targeted `3/3` PASS; security `29/29` PASS.
- [x] S6: GO/NO-GO가 exact evidence로 판정되고 NO-GO 시 read-only observation, manual open/deep-link 또는 unbound fallback 중 지원 가능한 최소 경로만 선택된다.
  PROVES: evidence
  CHECK: node --test --test-name-pattern='S6 decision' spikes/codex-adapter/codex-adapter.test.mjs && node spikes/codex-adapter/check-public-output.mjs
  EXPECT: /pass 1[\s\S]*fail 0[\s\S]*decision=NO_GO[\s\S]*fallback=UNBOUND_MANUAL_NAVIGATION/
  EVIDENCE: production relay `NO_GO`; fallback `UNBOUND_MANUAL_NAVIGATION`. App Server primitives는 확인됐지만 native binding과 7개 production safety/permission/cost semantics가 unresolved다. 이 결과는 spike decision only이며 Registry/relay/Phase 3/QA/Audit/Cherry/release를 닫지 않는다. targeted `1/1` PASS.

ABANDON: 공식·승인 interface가 확인되지 않으면 private Codex DB reverse engineering, UI scraping, credential extraction, hidden endpoint 호출 또는 실제 사용자 세션 mutation으로 가능성을 꾸며내지 않는다.
