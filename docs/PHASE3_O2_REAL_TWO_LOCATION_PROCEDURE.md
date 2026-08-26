# OUTCOME Phase 3 · O2 Real Two-Location Observation Procedure

상태: `EXECUTION PREFLIGHT READY · IMPORTANT AUTHORITY REQUIRED · O2 OPEN/LOCKED`

Observed: 2026-08-26 KST

## 목적

동일 project·role·binding version 의미가 Mac mini와 MacBook 또는 모바일 원격의 서로 다른 두 관찰 위치에서 같은 availability·freshness 의미로 보이는지 read-only로 증명한다.

## 실행 전 authority envelope

Planner는 실행 직전에 다음 값을 하나의 10분 유효 envelope로 고정한다.

- public-safe `project_id`
- `role`
- expected `binding_version`
- source A: Mac mini local observation
- source B: MacBook 또는 모바일 remote observation
- private target resolver: raw session/thread ID를 문서·채팅·로그에 쓰지 않는 approved adapter
- 허용 작업: exact target의 read-only availability/freshness 관찰 1회씩
- 금지 작업: list-all, prompt/result 원문 read, resume, turn start, message send, credential/private-store 탐색
- operation count ceiling: source별 read 1, 총 2
- expiry: 승인 시점부터 10분

raw identifier, credential, cookie, bearer, private path는 envelope와 receipt에 기록하지 않는다. target은 private adapter 내부 alias로만 해석한다.

## 사전 조건

1. supported adapter가 exact private target을 list-all 없이 resolve할 수 있다.
2. adapter가 availability와 provider-observed timestamp만 반환하며 prompt/result/content는 반환하지 않는다.
3. production relay는 여전히 `NO_GO`; 이 실행은 bounded proof이며 상시 relay 활성화가 아니다.
4. 두 source의 clock skew와 freshness window가 고정된다.
5. any output에 identifier/content/credential/path가 보이면 receipt 기록 전에 즉시 중단하고 `SAFE_HOLD_DISCLOSURE`로 분류한다.
6. adapter·target·source identity가 불명확하거나 supported read-only primitive가 없으면 `BLOCKED_SUPPORTED_ADAPTER`로 종료한다.

## 실행 순서

1. exact envelope digest와 expiry를 확인한다.
2. source A에서 private alias의 availability·observed_at을 한 번 읽는다.
3. source B에서 같은 alias와 expected binding version을 한 번 읽는다.
4. 두 결과를 relay의 finite NOW vocabulary와 freshness class로 각각 변환한다.
5. 동일 binding version, availability meaning, freshness window인지 비교한다.
6. raw values를 폐기하고 public-safe receipt만 고정한다.

## PASS 조건

- distinct source count `2/2`
- exact target alias match `2/2`
- expected binding version match `2/2`
- availability semantic match `2/2`
- both observations within freshness window
- raw identifier/content/credential/path exposure `0`
- list/resume/turn/message/provider mutation `0`
- other sessions changed `0`

한 항목이라도 불명확하면 O2는 PASS가 아니라 FAIL 또는 BLOCKED다. source activity는 Gate progress나 approval을 뜻하지 않는다.

## Public-safe receipt schema

```text
O2_TWO_LOCATION_RESULT
source_count=2
target_alias_match=2
binding_version_match=2
availability_semantic_match=2
fresh_observation_count=2
prohibited_disclosure=0
provider_mutation=0
other_sessions_changed=0
verdict=PASS|FAIL|BLOCKED
```

source hostname, raw session/thread identifier, user/account identity, timestamp 원문과 adapter credential은 receipt에 포함하지 않는다.

## 현재 blocker

현재 production relay는 `NO_GO`, fallback은 `UNBOUND_MANUAL_NAVIGATION`이다. exact target을 list-all 없이 읽는 supported private adapter와 10분 execution authority가 아직 고정되지 않았으므로 O2 실행은 `OPEN/LOCKED`다.
