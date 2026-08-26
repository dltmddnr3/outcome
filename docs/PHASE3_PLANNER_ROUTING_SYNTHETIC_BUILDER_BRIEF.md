# OUTCOME Phase 3 · Planner Routing Synthetic Builder Brief

Updated: 2026-08-27 KST
Status: **PLANNER HANDOFF READY / IMPLEMENTATION LOCKED BY O2 / NO SOURCE AUTHORITY**

## 1. 문서의 권한과 정확한 기준

- documentation source head: `58d176ba477e29fbf540d69bfd5c8bb19bcd8f46`
- documentation source tree: `33b18bd6427e1ee73644b90aca88b6117d9dbae6`
- governing product contract: `docs/PHASE3_EXISTING_SESSION_OPERATIONS_CONTRACT.md`
- routing Gate: `GATES_PHASE3_PLANNER_WORK_ROUTING.md#T1-T7`
- observation dependency: `GATES_PHASE3_MULTI_PC_OBSERVATION_RELAY.md#O1-O6`
- blocking diligence: `docs/PHASE3_O2_SUPPORTED_ADAPTER_DILIGENCE_RECEIPT.md`

이 문서는 미래 Builder가 구현 계약을 검토할 수 있게 만드는 Planner handoff다. 구현 source commit/tree, 실행 권한, provider 권한 또는 실제 지시 권한이 아니다. 현재 O2는 `OPEN/LOCKED`, supported adapter verdict는 `BLOCKED_SUPPORTED_ADAPTER`, production relay는 `NO_GO`, fallback은 `UNBOUND_MANUAL_NAVIGATION`이다.

Planner는 O2가 실제 두 관찰 위치와 supported read-only adapter evidence로 닫힌 뒤에만 새로운 immutable source commit/tree와 별도 Builder authorization을 발행할 수 있다. 그 전에는 아래 제안 경로를 생성·수정·테스트하지 않는다.

## 2. Stage 분할과 잠금

| Gate | 미래 후보 범위 | 현재 상태 |
| --- | --- | --- |
| T1–T5 | provider와 분리된 local in-memory synthetic routing ledger | O2 evidence closure 전 구현 잠금 |
| T6 | 실제 provider dispatch, proof window, allowlist와 mutation boundary | T1–T5와 별개로 잠금; 별도 Cherry 승인 필요 |
| T7 | OUTCOME 또는 Cherry Note의 실제 단일 routed task | T6와 별개로 잠금; 별도 real-use envelope 필요 |

T1–T5의 synthetic PASS는 T6 dispatch 또는 T7 real-use를 허용하지 않는다. 어떤 receipt도 T1–T7, Phase 3, QA, Release Audit, Cherry acceptance, release, Gate progress 또는 `EXTERNAL_OUTCOME_COMPLETE`를 스스로 바꾸지 않는다.

## 3. 미래 허용 경로 제안 — 아직 승인되지 않음

새 source pin이 발행될 때 Planner가 다시 승인할 수 있는 최소 경로는 다음뿐이다.

- `server/phase3-planner-routing-ledger.mjs`
- `server/phase3-planner-routing-ledger.test.mjs`
- `docs/PHASE3_PLANNER_ROUTING_SYNTHETIC_BUILDER_RECEIPT.md`

현재 product, test, runtime, API, UI, Gate, Map, Package, registry 또는 observation 코드를 바꾸지 않는다. provider/session/thread/browser/device/private-store/network 작업, push, deploy, release, 외부 메시지도 0이어야 한다.

## 4. 유한 타입 계약

모든 command envelope는 plain object의 own data property만 허용한다. 각 값은 coercion 전에 primitive type, 길이, finite vocabulary를 검증한다. boxed primitive, Symbol, BigInt, array, function, accessor, Proxy 또는 사용자 `toString`/`valueOf` 호출은 거부한다. 검증 실패는 state, counter, audit, receipt, ID를 전혀 소비하지 않는다.

### 4.1 InstructionRecord — private ledger only

| field | type/생성 | 규칙 |
| --- | --- | --- |
| `instruction_id` | ledger-generated opaque string | 요청자가 제공하지 않음; public projection에 노출하지 않음 |
| `project_id` | primitive string | 생성자에서 확정된 project allowlist의 정확한 값 |
| `planner_binding_version` | positive safe integer | 해당 project의 single owner Planner active binding과 일치 |
| `target_role` | finite enum | `builder`, `ux_product_qa`, `release_audit`만; `planner` self-target 금지 |
| `target_binding_version` | positive safe integer | 같은 project+target role의 current active binding과 일치 |
| `intent_code` | finite enum | `read_only_analysis`, `non_destructive_test_observation`, `evidence_summary` |
| `scope_code` | finite enum | `package_read`, `repository_read`, `test_observation` |
| `idempotency_key` | primitive public-safe code | 16–96 ASCII chars; private ledger key; public 노출 금지 |
| `request_fingerprint` | ledger-generated digest | 위의 canonical primitive intent fields만 사용; raw prompt/result 없음 |
| `requested_at` | ledger clock ISO timestamp | 한 mutation당 clock 1회 materialization |
| `expires_at` | ledger-generated ISO timestamp | `requested_at + 10 minutes`; caller override 금지 |
| `status` | finite enum | 아래 state machine만 허용 |
| `last_transition_at` | ledger clock ISO timestamp | 상태 전이와 같은 immutable transition receipt에 기록 |
| `reason_code` | finite enum 또는 null | public-safe code만; 자유 텍스트 금지 |

`intent_code`와 `scope_code`는 지시의 유한 의미만 표현한다. raw prompt, result, free-text instruction, provider locator, session/thread/turn ID, path, credential, secret, token, email, provider content 또는 shell command를 envelope나 ledger에 넣지 않는다.

### 4.2 AttemptRecord — private ledger only

| field | type/생성 | 규칙 |
| --- | --- | --- |
| `attempt_id` | ledger-generated opaque string | instruction마다 생성; public 노출 금지 |
| `instruction_id` | internal reference | 같은 logical instruction만 참조 |
| `attempt_version` | positive safe integer | 1부터 연속 증가; instruction당 최대 `3` |
| `target_binding_version` | positive safe integer | attempt 생성 시점 current binding과 exact match |
| `status` | finite enum | instruction 상태와 허용된 전이만 반영 |
| `requested_at`, `expires_at`, `transition_at` | canonical ISO timestamps | one-shot clock, 범위 검증, caller override 금지 |
| `reason_code` | finite enum 또는 null | 아래 목록 외 거부 |

### 4.3 유한 상태와 reason vocabulary

- instruction/attempt status: `queued`, `delivered`, `acknowledged`, `delivery_unknown`, `timed_out`, `cancelled`, `failed`
- public-safe failure/recovery reason: `not_planner`, `cross_project`, `wrong_role`, `wrong_binding`, `stale_binding`, `offline_target`, `binding_replaced`, `expired`, `timeout`, `cancelled_by_planner`, `provider_unavailable`, `delivery_unknown`, `attempt_limit`, `idempotency_conflict`, `registry_disabled`, `clock_unavailable`, `invalid_envelope`, `materialization_failed`, `reentrant_mutation`

Arbitrary reason/message/error text는 보존·로그·projection하지 않는다. 내부 provider error가 생겨도 위 code 하나로만 매핑하고 raw 값은 폐기한다.

## 5. 단일 owner Planner authorization

한 project에는 정확히 하나의 active Planner binding이 routing owner다. Route command는 authenticated private control-plane actor가 해당 `project_id`의 current Planner binding version을 제시할 때만 검토한다.

다음은 모두 commit 전 fail closed다.

- Planner가 아닌 actor 또는 target role의 직접 dispatch
- 다른 project의 Planner, target 또는 idempotency key 재사용
- `planner` target, unknown role 또는 허용되지 않은 intent/scope 조합
- wrong, stale, revoked, replaced 또는 disabled Planner/target binding
- target observation이 stale, offline, unknown, conflict 또는 gap 상태
- expired instruction, disabled ledger 또는 O2-supported source 부재

Client-selected project/role은 권한을 만들지 않는다. 권한과 current binding은 server/private registry가 결정한다.

## 6. 상태 전이와 성공 의미 금지

허용 전이는 다음뿐이다.

```text
queued -> delivered -> acknowledged
queued -> timed_out | cancelled | failed
delivered -> delivery_unknown | timed_out | cancelled | failed
delivery_unknown -> acknowledged | timed_out | cancelled | failed
```

- `acknowledged`는 exact instruction+attempt+target binding receipt의 수신만 뜻한다.
- `delivered`는 adapter가 전달을 수락했다는 뜻이며 target receipt 또는 작업 성공이 아니다.
- `delivery_unknown`은 비성공 격리 상태다. 자동 성공·자동 재전송하지 않는다. 동일 attempt의 exact receipt가 나중에 검증될 때만 `acknowledged`로 reconciliate할 수 있다.
- terminal state는 `timed_out`, `cancelled`, `failed`다. terminal에서 다른 상태로 전이하지 않는다.
- 어떤 상태도 role 결과 성공, candidate 완성, evidence 충족, Gate closure, QA/Audit/Cherry 승인 또는 release를 의미하지 않는다.

잘못된 전이, 중복 receipt, 다른 attempt/binding receipt, expiry 이후 receipt는 state와 history를 바꾸지 않고 public-safe conflict reason을 반환한다.

## 7. Idempotency, attempt, timeout/cancel/retry

1. `(project_id, idempotency_key)`가 처음이면 canonical primitives에서 fingerprint를 만들고 logical instruction 하나를 생성한다.
2. 같은 key+같은 fingerprint 재요청은 기존 instruction snapshot을 반환하며 instruction, attempt, audit 또는 ID를 추가하지 않는다.
3. 같은 key+다른 fingerprint는 `idempotency_conflict`로 atomically 거부한다.
4. attempt는 instruction과 별도 version history를 가지며 최대 3개다.
5. `delivery_unknown`은 자동 retry하지 않는다. Planner가 exact receipt 부재를 확인하고 기존 attempt를 terminal 처리한 뒤에만 manual retry를 요청할 수 있다.
6. `cancelled` instruction은 retry하지 않는다. 새 idempotency key의 새 instruction이 필요하다.
7. `timed_out` 또는 `failed`만 current, online, unchanged target binding에 manual retry할 수 있다.
8. target binding이 교체되면 queued/delivered attempt는 `binding_replaced`로 fail closed한다. 새 binding에는 새 instruction/key가 필요하며 이전 receipt를 승계하지 않는다.
9. expiry는 one-shot clock으로 판정한다. clock이 없거나 non-finite/out-of-ISO-range이면 `clock_unavailable`이고 무변경이다.

## 8. Atomicity, reentry, response materialization

- mutation guard를 caller-controlled property evaluation보다 먼저 세운다.
- envelope descriptor를 inspect하고 accessor/Proxy/trap/coercion 가능 입력을 state 접근 전에 거부한다.
- 모든 input을 validated primitive snapshot으로 materialize한 뒤 authorization과 transition을 판정한다.
- clock은 mutation마다 정확히 한 번 읽고 finite canonical ISO로 검증한다.
- instruction, attempt, transition, audit, counters를 draft에 만들고 response/receipt의 clone-safe materialization까지 성공한 뒤 한 번에 commit한다.
- clock, digest, clone, response materialization 또는 nested call이 실패하면 state와 immutable histories는 deep-equal이고 generated IDs도 소비하지 않는다.
- reentrant mutation은 `reentrant_mutation`이며 outer mutation도 commit하지 않는다.

Audit과 receipt history는 append-only다. actor class, project class, role, binding version, safe state/reason, count, canonical timestamps만 보존하며 raw payload는 기록하지 않는다. Disable은 모든 write를 막고 read-only private history 조회만 유지한다. Restore는 exact expected revision과 validated snapshot만 허용하며 history 삭제나 ID 재사용을 금지한다.

## 9. Public projection boundary

Public projection이 미래에 별도 승인되더라도 다음 class만 허용한다.

- instruction state class
- attempt state class
- attempt count class
- timestamp freshness class (`fresh`, `expired`, `unknown`)
- safe reason code class

다음은 public HTML/API/bundle/log/receipt에서 0건이어야 한다.

- raw instruction/attempt/idempotency/fingerprint/binding/session/thread/turn identifier
- provider locator, provider response/content, raw prompt/result 또는 free text
- local/absolute path, credential, token, secret, cookie, email 또는 account identifier
- exact private audit record 또는 private timestamp
- progress percentage, Gate evidence/closure, approval, dispatch authority, candidate success 또는 completion authority

Public mutation은 계속 `405 read_only`로 fail closed한다. Public projection은 조회 정보일 뿐 routing command 또는 재시도 권한이 아니다.

## 10. 미래 RED-first matrix

새 authorization 이후 Builder는 구현 전에 최소 다음 RED를 추가하고 기존 빈 module/import 실패 또는 계약 부재를 확인한다.

| 영역 | 반드시 실패시킬 사례 |
| --- | --- |
| primitive guard | boxed/string-like, Symbol, BigInt, array, function, accessor, Proxy, throwing coercion, unknown keys |
| finite vocabulary | unknown/case/whitespace/NFKC 변형 role, intent, scope, state, reason |
| authority | non-Planner, cross-project, wrong-role, wrong/stale/revoked/replaced binding, disabled registry |
| availability | stale/offline/unknown/conflict/gap target |
| idempotency | same key+same fingerprint duplicate, same key+different fingerprint conflict, cross-project key |
| state | every disallowed transition, receipt 없이 acknowledged, wrong attempt/binding/expired receipt |
| attempts | non-contiguous version, fourth attempt, auto retry from delivery_unknown, retry after cancel/binding replacement |
| time | throwing, non-finite, malformed, non-canonical, out-of-range, backwards clock |
| atomicity | response clone failure, digest failure, getter/Proxy reentry, nested mutation, partial audit/ID consumption |
| privacy | every private field/value in projection, serialization and loggable output |
| authority leakage | progress, Gate, approval, release, success/completion or provider-dispatch field |
| rollback | disabled write, wrong restore revision, corrupt snapshot, history deletion or ID reuse |

GREEN은 모든 case의 expected public-safe error, deep-equal no-mutation, contiguous IDs, append-only history, exact state transition과 prohibited serialized hit `0`을 측정해야 한다. 테스트 fixture는 synthetic `source-a`/`source-b` 같은 가상 값만 쓰며 실제 provider/session을 호출하지 않는다.

## 11. 미래 전체 검증 명령

아래 명령은 O2 closure 뒤 새 source pin과 Builder 권한이 생긴 미래 candidate에서만 실행한다.

```bash
node --test server/phase3-planner-routing-ledger.test.mjs
npm run test:package-model
npm run check:mutations
npm run test:security
npm test
node --test scripts/*.test.mjs server/*.test.mjs
npm run build
npm run check:scope
git diff --check
git diff --name-only <authorized-source>...HEAD
```

마지막 path diff는 제안된 module, test, Builder receipt 세 경로만 보여야 한다. 별도 Planner authorization 없이는 Gate/Map/runtime/API/UI 변경을 허용하지 않는다.

## 12. Rollback과 ABANDON

미래 synthetic candidate rollback은 승인된 implementation commit과 별도 receipt commit을 순서대로 revert하는 것뿐이다. 외부 provider 상태가 없어야 한다. disable/read-only 전환은 ledger history를 삭제하지 않는다.

**ABANDON:** 이 pre-implementation brief와 preflight 8/8은 문서 완전성만 증명한다. O2, T1–T7, Phase 3, implementation, provider dispatch, real-use, QA, Audit, Cherry acceptance, release 또는 external completion의 증거가 아니다. O2 missing primitive가 하나라도 남으면 implementation source pin을 발행하지 않고 이 handoff를 잠금 상태로 유지한다.
