# OUTCOME Phase 3 · Multi-PC Observation Synthetic Builder Brief

상태: `PLANNER AUTHORIZED · LOCAL SYNTHETIC CANDIDATE ONLY · O2 REAL USE LOCKED`

## Outcome

실제 Codex session·thread나 원격 기기에 연결하지 않는 in-memory observation relay로 O1, O3, O4, O5, O6의 event schema, ordering, freshness, redaction, recovery와 read-only fallback을 검증한다.

O2의 서로 다른 두 실제 관찰 위치 증거는 이 slice에 포함하지 않는다. synthetic `source-a`와 `source-b`는 O2를 닫거나 실제 사용을 대체하지 않는다.

## 실행 source pin

Builder는 Planner task envelope가 전달하는 exact commit/tree와 이 brief SHA-256을 검증한 뒤에만 시작한다. mismatch면 product mutation 전에 `SAFE_HOLD_SOURCE_DRIFT`로 종료한다.

## 허용 경로

- `server/phase3-observation-relay.mjs` 신규
- `server/phase3-observation-relay.test.mjs` 신규
- `docs/PHASE3_MULTI_PC_OBSERVATION_SYNTHETIC_BUILDER_RECEIPT.md` 신규

기존 registry, runtime/API/UI, Package parser, account access, Vercel 설정, Gate/Map과 다른 문서는 Builder가 수정하지 않는다.

## 구현 계약

### Constructor

- 허용 project/role/binding version 목록을 public-safe primitive 값으로 받는다.
- 허용 source host는 synthetic opaque ID(`source-a`, `source-b`)만 받는다.
- `freshness_ms`, deterministic clock과 initial enabled 상태를 받는다.
- 모든 configured 값은 regex·Set key·clone 전에 primitive schema를 검증한다.

### Observation event

성공 event는 다음 필드를 보존한다.

- `project_id`
- `role`
- positive integer `binding_version`
- opaque `source_host`
- positive integer `sequence`
- canonical ISO `observed_at`
- `availability`: `available | idle | offline | unknown`
- optional `now_summary`: 짧은 public-safe 텍스트

raw session/thread ID, provider locator, prompt/result 원문, credential, local path, UUID-shaped identifier는 입력 단계에서 거부한다. 모든 caller object coercion과 post-commit clone failure를 방지한다.

### Ordering과 freshness

- source host별 sequence는 strictly increasing이다.
- 동일 sequence와 동일 canonical event는 idempotent duplicate로 mutation 없이 반환한다.
- 동일 sequence의 다른 event와 낮은 sequence는 latest valid projection을 덮지 않고 public-safe conflict evidence를 남긴다.
- sequence gap은 projection을 `conflicting`으로 만들고 NOW를 제거한다. 명시적 reconnect/resync만 다음 valid baseline을 연다.
- `observed_at`이 미래 허용오차 밖이거나 freshness window를 넘으면 NOW를 노출하지 않는다.
- missing, stale, offline, unknown, conflicting은 `active`, NOW 또는 Gate/progress로 합성하지 않는다.
- relay에는 progress 필드와 completion authority가 존재하지 않는다.

### Disconnect, reconnect, disable/restore

- disconnect는 source를 offline으로 만들고 NOW를 제거하되 last valid metadata와 evidence를 보존한다.
- reconnect/resync는 expected last sequence compare-and-swap과 새 monotonic baseline이 맞을 때만 성공한다.
- disable은 모든 ingest/reconnect write를 차단하고 public-safe projection·conflict history를 보존한다.
- restore는 registry revision compare-and-swap으로만 가능하며 실패는 deep-equal no mutation이다.
- clock throw·invalid timestamp, re-entrant mutation과 response materialization 실패는 commit 전 fail closed한다.

### Public projection과 evidence

- projection은 project, role, binding version, opaque source host, sequence, availability, freshness class, observed_at과 redacted NOW만 허용한다.
- raw payload, internal event ID, locator, prompt/result, credential, path, conflict raw value는 노출하지 않는다.
- conflict/recovery evidence는 action, safe scope, before/after sequence, safe reason code와 timestamp만 append-only로 보존한다.
- observation activity는 Gate closure·progress·approval·dispatch authority가 아니다.

## 필수 RED/GREEN tests

- primitive schema guard 전 regex/coercion 차단: constructor와 모든 mutation input의 boxed String, Symbol, object, Proxy, throwing `toString`
- duplicate idempotency와 conflicting duplicate 분리
- out-of-order와 sequence gap이 latest valid projection을 덮지 않음
- missing/stale/offline/unknown/conflicting에서 NOW 없음
- wrong project/role/binding/source, stale CAS, invalid/future timestamp no mutation
- raw ID·UUID·credential·path·prompt/result-shaped summary 거부와 serialized prohibited scan 0
- disconnect/reconnect, gap resync, disable/restore, re-entrant clock, clock failure atomicity
- failure 전후 deep-equal state와 contiguous evidence ID

## 검증 명령

```text
node --test server/phase3-observation-relay.test.mjs
npm run test:package-model
npm run check:mutations
npm test
npm run build
git diff --check
```

## 완료 영수증

receipt는 exact parent/commit/tree, changed paths, RED와 GREEN, full regression, prohibited hit count, actual device/provider/session operation `0`, O2 `OPEN`, rollback과 residual unknown을 기록한다.

## 금지 범위

- 실제 Codex thread/session list/read/resume, provider API, 실제 device observation
- credential/private store/browser local storage, hosted DB/queue, network listener
- runtime/API/UI/auth/provider setting, 기존 registry 수정
- push/deploy/release/external message
- O2, O1/O3-O6, Phase 3, QA, Audit, Cherry acceptance를 Builder가 자체 폐쇄

## Rollback

implementation candidate commit 하나를 revert하면 신규 module/test가 제거된다. receipt commit은 evidence history로 별도 보존한다.
