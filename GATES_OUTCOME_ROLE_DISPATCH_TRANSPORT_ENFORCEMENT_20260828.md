# OUTCOME 역할 전달 transport 강제 Gate

Outcome: Planner가 collaboration/sub-agent를 전담 역할 세션으로 오인할 수 없고, private binding과 실제 Codex 앱 peer thread가 일치한 경우에만 역할 업무 전달을 시작하도록 fail-closed 검증을 추가한다.

- [x] R1: 역할 transport 종류를 `codex_app_peer_thread`와 `bounded_read_only_subagent`로 분리하고 sub-agent의 Builder/QA/Audit 역할 사용을 거절한다.
  EXPECT: role dispatch with sub-agent transport rejects before instruction/attempt/event allocation; next valid sequence remains unchanged.
  EVIDENCE: focused Node suite 36/36 PASS; three role-looking bounded sub-agent aliases safe-hold before event allocation and the next valid sequence is 1.

- [x] R2: role dispatch start는 private registry project+role current binding, public alias/version/state와 actual app thread exact-one match를 모두 요구한다.
  EXPECT: missing, duplicate, title-only, wrong project/host/role/version/state and unverified locator all fail closed with no partial ledger mutation.
  EVIDENCE: focused hostile start and replay tests PASS for alias, version, state, zero/duplicate match, unverified binding and stored transport drift with zero partial events.

- [x] R3: `dispatch_observed`는 앱 send receipt, `execution_started`는 destination 새 turn 또는 `STARTED` receipt가 있을 때만 허용한다.
  EXPECT: send success without destination receipt remains `dispatch_observed`; timeout/not-loadable becomes `delivery_unknown`; automatic retry 0.
  EVIDENCE: lifecycle regression PASS; provider acknowledgement is required before target-start acknowledgement, delivery unknown is terminal, and no automatic retry API exists.

- [x] R4: collaboration tool 이름이 `builder`, `qa`, `audit`를 포함하는 hostile fixtures와 현재 오인 사례를 회귀 테스트한다.
  EXPECT: all role-like sub-agent aliases denied; public/private raw locator disclosure 0; false role receipt 0.
  EVIDENCE: hostile builder, QA and audit aliases all denied; public projection redaction test PASS; prohibited locator scan returned zero matches.

- [x] R5: 기존 lightweight/standard/high-risk lifecycle, registry CAS/history, rotation, Package projection과 public redaction 회귀가 통과한다.
  EXPECT: focused and full test suites pass; existing registry bytes and bindings unchanged; external mutation 0.
  EVIDENCE: npm test 90 frontend plus 339 Node PASS; exhaustive Node 369/369 PASS; security 54/54 PASS; build 1,652 modules; public-boundary, scope and runbook checks PASS; external mutation 0.

- [x] R6: 정확한 별도 `OUTCOME · Builder` 앱 thread로 본 handoff 자체가 전달되고 destination `STARTED`가 관측된다.
  EXPECT: app thread exact match 1; sub-agent dispatch 0; duplicate instruction 0; delivery unknown이면 SAFE_HOLD.
  EVIDENCE: exact-one app peer-thread handoff was received in this dedicated Builder thread and the destination emitted exactly `STARTED + CONTINUITY_READY`; sub-agent dispatch 0 and duplicate instruction 0.

ABANDON: actual app thread 또는 private binding을 검증할 수 없으면 역할 구현을 시작하지 않고 `SAFE_HOLD_ROLE_DISPATCH_UNVERIFIED`로 종료한다. 이름이 비슷한 sub-agent로 대체하지 않는다.
