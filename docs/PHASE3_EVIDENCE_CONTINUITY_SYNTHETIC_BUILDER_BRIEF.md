# OUTCOME Phase 3 · Evidence Continuity Synthetic Builder Brief

Updated: 2026-08-27 KST
Status: **PLANNER HANDOFF READY / IMPLEMENTATION LOCKED BY ROUTING AND O2 / NO SOURCE AUTHORITY**

## 1. 문서 권한과 exact boundary

- documentation source head: `4bc4d4c08fe1a00cf9d24ae05db96b49c1286e89`
- documentation source tree: `b5ca5e7c247604e97ee38df93f697d105c19ba4e`
- governing contract: `docs/PHASE3_EXISTING_SESSION_OPERATIONS_CONTRACT.md`
- preserved Gate: `GATES_PHASE3_EVIDENCE_CONTINUITY.md#E1-E6`
- routing dependency: `GATES_PHASE3_PLANNER_WORK_ROUTING.md#T1-T7`
- observation dependency: `GATES_PHASE3_MULTI_PC_OBSERVATION_RELAY.md#O1-O6`
- blocking receipt: `docs/PHASE3_O2_SUPPORTED_ADAPTER_DILIGENCE_RECEIPT.md`

이 문서는 future local synthetic candidate의 Planner handoff일 뿐 구현 source commit/tree, product mutation, provider 작업 또는 completion authority가 아니다. E1–E6는 모두 unchecked/open 상태로 유지한다. 현재 O2는 `OPEN/LOCKED`, verdict는 `BLOCKED_SUPPORTED_ADAPTER`, production relay는 `NO_GO`다.

## 2. 선행 의존성과 잠금

구현 source authority는 다음 순서를 모두 immutable evidence로 통과한 뒤 별도 Planner handoff로만 생긴다.

```text
O2 actual two-location evidence
  -> T1-T5 synthetic routing candidate
  -> separately authorized T6 provider dispatch
  -> separately authorized T7 real-use receipt
  -> E1-E6 implementation source pin and Builder authorization
```

- 문서 preflight, O2 synthetic source, T1–T5 문서 또는 synthetic PASS는 이 순서를 건너뛰지 못한다.
- T6는 provider dispatch 전용 Cherry-authorized proof window가 필요하다.
- T7은 exact project/Planner/target의 real-use receipt를 별도로 요구한다.
- T7까지 충족돼도 E1–E6 구현은 자동 시작되지 않는다. 새 exact source pin, allowed paths와 Builder authorization이 필요하다.
- 이 문서와 preflight는 O2, T1–T7, E1–E6, Phase 3 progress를 변경하지 않는다.

## 3. 미래 제안 경로 — 현재 미승인

선행 의존성이 모두 닫힌 뒤 Planner가 다시 승인할 수 있는 최소 경로는 다음뿐이다.

- `server/phase3-evidence-continuity-ledger.mjs`
- `server/phase3-evidence-continuity-ledger.test.mjs`
- `docs/PHASE3_EVIDENCE_CONTINUITY_SYNTHETIC_BUILDER_RECEIPT.md`

현재 이 경로들은 **NOT AUTHORIZED**다. 지금은 product/test/runtime/API/UI, existing Gate/Map/Contract, registry/observation/routing code, 기존 receipt를 생성·수정·실행하지 않는다. provider/session/thread/browser/device/private-store/network 작업, push, deploy, release, 외부 메시지도 금지한다.

## 4. 공통 입력·ID·digest 규칙

모든 command envelope는 plain object own data properties만 허용한다. mutation guard를 caller-controlled property evaluation보다 먼저 세우고 descriptor materialization 뒤 primitive type, finite vocabulary, exact length를 coercion 전에 검증한다. boxed primitive, Symbol, BigInt, function, array, accessor, Proxy, custom `toString`/`valueOf`, unknown key는 실패한다.

상관관계 식별자는 ledger가 생성한 opaque private ID만 쓴다. caller는 ID, sequence, authority 또는 completion state를 만들 수 없다. 각 entity는 다음 validated private correlation facts만 보존한다.

- `project_id`: configured project allowlist의 exact primitive string
- `planner_binding_version`, `target_binding_version`, `attempt_version`: positive safe integer와 current/referenced history exact match
- `instruction_id`, `attempt_id`, entity ID: ledger-generated opaque private ID
- canonical digest: lowercase hex만 허용하며 종류별 exact length 검증
- timestamps: ledger-generated canonical ISO, one-shot finite clock

Digest contract:

- `sha256`: 정확히 64 lowercase hex
- `git_commit`: 정확히 40 lowercase hex
- `git_tree`: 정확히 40 lowercase hex
- `artifact_sha256`: 정확히 64 lowercase hex

Digest는 correlation/integrity 사실일 뿐 evidence sufficiency나 authority 판정이 아니다. private ID와 exact digest는 public projection에 노출하지 않는다.

## 5. 분리된 immutable entities

여섯 entity는 각각 독립 append-only record와 독립 상태를 가진다. 한 entity의 존재, 상태 또는 digest가 다른 entity의 존재·충족·승인을 암시하지 않는다.

### 5.1 InstructionRef

- routing ledger에서 검증된 `instruction_id`, `project_id`, Planner/target binding version, `attempt_id`/version, instruction fingerprint digest를 참조한다.
- instruction content나 raw prompt를 복사하지 않는다.
- routed/delivered/acknowledged 상태는 result, evidence 또는 completion이 아니다.

### 5.2 DeliveryReceiptRef

- exact instruction+attempt+target binding과 receipt digest를 참조한다.
- finite state: `unconfirmed`, `delivered`, `acknowledged`, `delivery_unknown`, `timed_out`, `cancelled`, `failed`, `quarantined`.
- `delivered`와 `acknowledged`는 provider 또는 target receipt 사실만 뜻하며 role work success를 뜻하지 않는다.

### 5.3 RoleResultRef

- ledger-generated result ID, exact instruction/attempt/binding correlation과 private payload digest를 보존한다.
- finite state: `reported`, `withdrawn`, `invalid`, `quarantined`.
- `reported`는 role이 결과를 제출했다는 사실뿐이다. evidence sufficiency, Gate closure, QA, Audit, Cherry acceptance, release, progress 또는 `EXTERNAL_OUTCOME_COMPLETE`로 auto-promote하지 않는다.

### 5.4 EvidencePointerRef

- finite `kind_class`: `source_commit`, `source_tree`, `test_receipt`, `build_artifact`, `qa_report`, `audit_report`, `acceptance_receipt`.
- finite `source_class`: `builder`, `ux_product_qa`, `release_audit`, `cherry`.
- kind에 맞는 exact digest와 `project_id`, binding/attempt versions, CandidatePinRef correlation을 요구한다.
- raw evidence content, URL, path, provider locator 또는 free-text note는 pointer에 저장하지 않는다.

### 5.5 CandidatePinRef

- exact `project_id`, `git_commit`, `git_tree`, optional `artifact_sha256`를 독립 immutable record로 보존한다.
- commit/tree/artifact의 존재는 build PASS, QA PASS, release 또는 acceptance가 아니다.

### 5.6 AuthorityDecisionRef

- finite `authority_class`: `planner_gate_assessment`, `ux_product_qa`, `release_audit`, `cherry_acceptance`.
- finite `decision_state`: `pending`, `pass`, `fail`, `blocked`, `revoked`.
- authority별 authenticated source와 exact CandidatePinRef가 일치할 때만 attach한다.
- Planner, Builder, client 또는 caller가 다른 authority의 decision을 생성·대체할 수 없다. Builder result와 EvidencePointer는 decision이 아니다.

## 6. Attach authorization과 fail-closed matrix

Attach는 기존 immutable entity를 수정하지 않고 새 correlation event를 append한다. 다음 중 하나라도 맞으면 event, audit, sequence, ID를 소비하지 않고 전체 attach를 거부한다.

- required hash/digest 누락, 종류·길이·문자 오류 또는 digest mismatch
- wrong `project_id`, instruction, attempt, binding version 또는 CandidatePinRef
- revoked, replaced, stale, inactive 또는 cross-project binding
- RoleResult source role과 target role mismatch
- EvidencePointer kind/source class와 authority mismatch
- duplicate key+same canonical fingerprint: 기존 logical attach snapshot만 반환
- duplicate key+different fingerprint: conflict quarantine, 새 attach 생성 금지
- authority가 다른 candidate, project 또는 authority class를 주장
- missing/private correlation entity, terminal/cancelled instruction 또는 quarantined receipt

Attach 실패는 partial link, orphan record, counter advance, audit-only residue를 남기지 않는다. Caller-provided completion/approval/progress field는 unknown-key로 거부한다.

## 7. Binding replacement recovery

1. old binding과 new binding은 서로 다른 immutable version history로 보존한다.
2. replacement 시 old binding의 in-flight/unconfirmed instruction, receipt와 result는 `quarantined` recovery set에 들어간다.
3. old history를 new binding에 복사·상속·재연결하지 않는다.
4. 자동 redelivery, automatic replay dispatch와 delivery success 추론을 금지한다.
5. exact project Planner가 old/new binding, instruction, attempt와 receipt digest를 확인한 뒤 finite reconciliation command를 명시적으로 선택한다: `retain_old_history`, `cancel_old_instruction`, `accept_verified_old_receipt`, `start_new_instruction`.
6. `accept_verified_old_receipt`는 기존 old attempt에만 correlation하며 new binding ownership이나 success를 만들지 않는다.
7. `start_new_instruction`은 routing ledger의 새 instruction/idempotency contract를 따라야 하며 continuity ledger가 dispatch하지 않는다.

Wrong/replaced binding의 late result는 quarantine에 남고 EvidencePointer 또는 AuthorityDecision으로 승격되지 않는다.

## 8. Restart, offline, partial failure replay

- ledger source는 append-only event log다. projection은 validated genesis와 contiguous sequence를 deterministic fold해 만든다.
- write는 expected ledger revision과 entity version의 CAS를 요구한다.
- exact duplicate event ID+fingerprint는 idempotent no-op이며 기존 projection을 반환한다.
- 같은 event ID+다른 fingerprint, sequence gap, out-of-order event 또는 corrupt digest는 quarantine하고 last valid projection을 보존한다.
- restart는 persisted log를 처음부터 fold해 byte-equivalent entity state/count/freshness/reason classes를 복원한다.
- offline/partial write는 response materialization까지 완료되지 않으면 log에 append하지 않는다.
- recovery는 instruction/result/evidence/decision의 분리를 유지하며 missing event를 completion으로 보충하지 않는다.
- replay는 provider dispatch, redelivery, duplicate result, duplicate attach, Gate transition 또는 false completion을 실행하지 않는다.

## 9. Privacy, retention, export와 deletion

Public-safe projection은 다음 finite class만 포함한다.

- entity presence/state class
- per-kind count class
- freshness class: `fresh`, `stale`, `expired`, `unknown`
- reason class: `none`, `mismatch`, `revoked`, `replaced`, `duplicate_conflict`, `quarantined`, `disabled`

Public HTML/API/bundle/log에는 raw result/evidence content, opaque IDs, idempotency key, fingerprint, exact digest, provider locator/content, local/absolute path, credential/token/secret/cookie, email/account, session/thread/turn field가 0건이어야 한다. Public surface에는 progress, Gate evidence/closure, approval, dispatch, retry, export, deletion 또는 completion authority가 없다.

Future local synthetic candidate의 private payload lifecycle은 다음으로 고정한다.

- finite retention class: `synthetic_7d`; payload expiry는 ledger clock 기준 생성 후 최대 7일이며 caller가 연장하지 못한다.
- authorized export: exact project owner Planner가 expected revision과 finite `audit_export` purpose를 제시할 때 private encrypted export를 생성하되 export digest와 audit만 ledger에 남긴다. Public export는 없다.
- tombstone deletion: expiry 또는 authorized delete 시 raw private payload를 제거하고 entity ID class, digest class, deletion timestamp와 finite reason의 tombstone만 append한다.
- audit은 actor class, project class, operation/state/reason class, version/count/timestamp만 보존한다. raw content나 private identifier를 복제하지 않는다.
- tombstone 뒤 restore/replay/export는 raw payload를 재생성하거나 외부 source에서 다시 읽지 않는다. raw resurrection은 금지한다.

## 10. Atomicity, reentry, clock, disable/restore

- mutation guard를 caller-controlled property access보다 먼저 획득한다.
- validated primitive snapshots와 one-shot canonical clock으로 draft event, entities, indexes, audit와 response를 만든다.
- digest 생성, clone, fold, response materialization까지 성공한 뒤 event와 state를 한 번에 commit한다.
- getter/Proxy trap, nested mutation, clock throw/non-finite/out-of-range/non-canonical, digest/clone/materialization failure는 public-safe reason으로 끝나며 state가 deep-equal이고 ID/event/sequence를 소비하지 않는다.
- reentrant call은 `reentrant_mutation`이며 inner와 outer mutation 모두 실패한다.
- event와 audit history는 immutable append-only이며 delete/restore도 새 event다. ID, sequence, revision은 재사용하지 않는다.
- disable은 모든 attach/export/delete/reconcile write를 막고 validated public-safe/private read-only projection만 유지한다.
- restore는 exact expected disabled revision과 canonical snapshot digest를 요구한다. mismatch/corruption은 no-mutation이며 history truncate 또는 raw tombstone resurrection을 금지한다.

## 11. 미래 RED-first hostile matrix

새 implementation authorization 뒤에만 다음 RED를 먼저 추가한다.

| 영역 | 필수 RED 사례 |
| --- | --- |
| primitive/materialization | boxed primitive, Symbol, BigInt, accessor, Proxy, throwing coercion, unknown keys |
| entity separation | instruction만으로 result/evidence/decision 생성, result로 evidence/decision auto-promotion |
| correlation | wrong project/instruction/attempt/binding/candidate, cross-role, missing entity |
| digest | missing/wrong kind, uppercase/non-hex, 39/40/41 commit/tree, 63/64/65 sha256, candidate mismatch |
| authority | Builder→QA/Audit/Cherry decision, Planner→Audit, caller completion/progress fields |
| duplicates | same key+same fingerprint idempotence, same key+different fingerprint quarantine |
| rebind | revoked/replaced old binding late result, auto inheritance/redelivery, new-binding receipt mismatch |
| replay | duplicate/out-of-order/gap/corrupt event, restart byte parity, offline partial append |
| privacy | every raw content/ID/digest/locator/path/credential/account/session field in projection/log serialization |
| retention | caller extension, unauthorized export/delete, tombstone replay/raw resurrection |
| atomicity | clock/digest/clone/response failure, getter/Proxy reentry, partial entity/audit/ID consumption |
| rollback | disabled write, wrong revision restore, corrupt snapshot, history deletion, ID reuse |

GREEN은 expected finite reason, deep-equal no-mutation, contiguous event/ID sequence, deterministic replay, append-only audit, exact duplicate idempotence와 prohibited serialized hit `0`을 측정해야 한다. Synthetic fixtures만 사용하며 actual provider/session/device/private payload를 읽지 않는다.

## 12. 미래 전체 검증 명령 — 현재 실행 금지

아래 명령은 모든 선행 의존성이 닫히고 새 exact source pin과 Builder authorization이 발행된 미래 candidate에서만 실행한다.

```bash
node --test server/phase3-evidence-continuity-ledger.test.mjs
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

마지막 diff는 proposed module, matching test와 Builder receipt 세 경로만 보여야 한다. 현재 문서 작업에서는 위 implementation/product test를 실행하지 않는다.

## 13. Rollback과 ABANDON

미래 synthetic candidate rollback은 승인된 implementation commit과 별도 receipt commit을 revert하고 ledger를 disable/read-only로 유지하는 것이다. Append-only history와 tombstone을 삭제하지 않으며 외부 provider state가 없어야 한다.

**ABANDON:** 이 brief와 preflight는 문서 완전성만 증명한다. E1–E6와 Phase 3은 open이며, O2/T1–T7/implementation/QA/Release Audit/Cherry acceptance/release/progress/`EXTERNAL_OUTCOME_COMPLETE`를 닫거나 바꾸지 않는다.
