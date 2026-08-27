# OUTCOME Package · 세션 연속성 및 교체 운영 계약

Status: **CHERRY-APPROVED ADDITIVE OPERATING CONTRACT / ROTATION EXECUTION NOT IMPLIED**

Observed: 2026-08-27 KST

## 목적과 적용 범위

이 문서는 `OUTCOME_CONTRACT`, `OUTCOME_MAP`, `GATES*.md`와 함께 사용하는 OUTCOME Package의 additive operating contract다. 긴 역할 세션의 대화량 자체를 진척으로 취급하지 않고, 검증 가능한 결과 상태만 durable handoff로 넘겨 같은 프로젝트·같은 역할의 successor가 source-grounded하게 이어받도록 한다.

다음 네 역할 모두에 적용한다.

- Planner
- Builder
- UX & Product QA
- Release Audit

세션 교체는 진행률, Gate PASS, QA PASS, Audit PASS, Cherry acceptance, release 또는 `EXTERNAL_OUTCOME_COMPLETE`를 만들지 않는다. 특히 fresh UX & Product QA와 fresh Release Audit은 이전 역할 세션의 대화 서사를 상속하지 않는다. successor는 exact source pin, 승인된 contract, Gate와 candidate/receipt만 새로 고정하고 독립 검증한다.

## 관측과 checkpoint

Planner는 각 role binding의 continuity health를 매일 한 번 확인하고, 다음 경계에서 durable checkpoint를 먼저 확정한다.

1. terminal milestone 결과를 운영 상태에 반영하기 전
2. Cherry 승인·거부·범위 변경 등 authority 변경을 적용하기 전
3. 새 Stage, Gate 작업 또는 bounded correction을 dispatch하기 전
4. source/candidate/receipt binding이 바뀌기 전
5. rotation trigger가 관측된 즉시

Checkpoint는 append-only receipt 또는 `templates/SESSION_CONTINUITY_HANDOFF.md` 형식의 source-controlled artifact다. 대화 기억, 요약 메시지 또는 세션 activity만으로 대체하지 않는다.

## health와 rotation trigger

기본 판단은 관측 증거로 한다. 다음 중 하나가 반복되거나 source/authority 안전성을 훼손하면 `watch` 또는 `handoff_required`로 전환한다.

- task delivery/read의 반복 `timeout` 또는 `delivery_unknown`
- handoff나 source 재수화 지연이 반복되어 bounded action 시작을 방해함
- context loss 또는 compaction 반복으로 exact pin·authority·open Gate 재확인이 자주 필요함
- project, role, worktree, candidate 또는 receipt binding drift
- Phase/Scope의 다음 Stage 경계 또는 현재 Stage의 Gate 책임 경계 도달
- authority, source pin, contract 또는 allowed/forbidden scope drift
- successor가 최소 durable handoff만으로 다음 bounded action을 재현할 수 없음

플랫폼이 공식적으로 제공하는 capacity metric이 있을 때만 프로젝트별 watch/rotate threshold를 구성할 수 있다. metric 이름, 측정 주체, 단위, 관측 시각, threshold 근거와 변경 권한을 receipt에 기록한다. 공식 metric이 없거나 신뢰할 수 없으면 크기·line count·memory 같은 추정 수치를 rotation authority로 사용하지 않는다.

security, authority 또는 source drift는 용량 상태와 무관하게 `blocked` 또는 `SAFE_HOLD`가 우선한다.

## lifecycle

| State | 의미 | 허용되는 다음 상태 |
|---|---|---|
| `healthy` | exact binding과 bounded action 수행이 안정적이다. | `watch`, `handoff_required`, `blocked` |
| `watch` | trigger 증거가 관측되었으나 현재 작업을 안전하게 checkpoint할 수 있다. | `healthy`, `handoff_required`, `blocked` |
| `handoff_required` | successor 시작 전에 durable handoff가 필수다. | `successor_starting`, `blocked`, `rotation_failed` |
| `successor_starting` | successor가 handoff와 source/authority를 검증 중이다. predecessor는 active/recoverable 상태를 유지한다. | `successor_verified`, `blocked`, `rotation_failed` |
| `successor_verified` | successor가 `STARTED`와 `CONTINUITY_READY`를 모두 반환했고 binding 전환이 검증되었다. | `predecessor_archived`, `blocked` |
| `predecessor_archived` | predecessor가 recoverable archive/replaced history로 남고 active routing에서 제외되었다. | terminal |
| `blocked` | source, authority, privacy, contract 또는 evidence 문제가 해결 전 진행을 금지한다. | `healthy`, `handoff_required`, `rotation_failed` |
| `rotation_failed` | successor 검증 또는 binding 전환이 실패했다. predecessor는 archive하지 않고 recovery decision을 기다린다. | `handoff_required`, `blocked` |

상태 전이는 append-only receipt로 기록한다. `delivery_unknown`, timeout 또는 successor 생성 요청만으로 성공 상태를 추정하지 않는다.

## durable handoff 최소 계약

Handoff는 다음을 포함한다.

- Package position: Project → Phase → Scope → Stage → Gate
- exact role title과 bounded objective
- exact source root, commit/tree/parent 또는 문서 SHA-256
- exact candidate와 immutable receipt/evidence identity
- 현재 authority, 승인된 action과 forbidden action
- closed evidence와 open Gates, blocker, decision owner
- next bounded action과 stop condition
- rollback/cleanup 상태와 외부 mutation count
- `false_completion_count`
- `learning_receipt`
- 작성 시각과 handoff artifact SHA-256

Handoff에서 제외한다.

- raw 대화, prompt/result 전문, chain-of-thought 또는 중복 status history
- secret, token, credential, private locator, account/session/thread/turn identifier
- Gate 또는 immutable receipt로 증명되지 않은 진행률·완료 추정
- successor의 bounded action에 필요하지 않은 로그·화면·provider history

## 교체 절차

1. Planner가 current lifecycle, 실행 turn, queued follow-up과 external mutation 상태를 확인한다.
2. 안전한 checkpoint 경계가 아니면 predecessor를 유지하고 `blocked` 또는 `watch` receipt를 남긴다.
3. durable handoff의 exact source/candidate/receipt와 artifact SHA-256을 검증한다.
4. 동일 project와 exact same-role title로 successor를 시작하고 handoff path와 SHA-256만 전달한다.
5. successor는 source·contract·authority·open Gates·allowed/forbidden scope를 독립 재검증한다.
6. successor가 `STARTED`와 `CONTINUITY_READY`를 모두 반환한 뒤에만 active binding을 전환한다.
7. binding 전환이 확인된 뒤 predecessor를 recoverable `replaced` history로 archive하고 active routing에서 제외한다.
8. 어느 단계든 실패·timeout·delivery unknown이면 archive하지 않고 `rotation_failed` 또는 `blocked`로 기록한다.

## 자동화와 보관 경계

자동화는 health recommendation, checkpoint request, handoff draft와 receipt만 만들 수 있다. successor의 `STARTED` 및 `CONTINUITY_READY`를 대신 선언하거나 active binding을 추정 전환할 수 없다.

- successor 검증 전 predecessor archive 금지
- 자동 물리 삭제 금지
- rollout, handoff, receipt와 Git evidence는 recoverable history로 유지
- 실제 삭제는 exact target, retention, 복구 불가 영향과 보존 의무를 고정한 별도 Cherry 승인 필요
- archived predecessor에는 새 instruction을 전달하지 않고 current NOW로 투영하지 않음

## 역할과 권한

Planner는 continuity recommendation, handoff contract와 binding transition을 조정한다. 각 역할은 자신의 source-grounded 결과와 receipt만 소유한다. Builder 구현, fresh UX & Product QA, fresh Release Audit, Cherry acceptance와 release authority는 교체와 분리된다.

이 문서와 template/Gate의 존재는 rotation 실행 증거가 아니다. 실제 rotation은 successor 검증 receipt가 있을 때만 해당 프로젝트의 별도 Gate에서 증명한다.

## ABANDON

**ABANDON:** 고정 용량 추정, 대화 activity 또는 자동화 추천을 rotation 성공이나 제품 진척으로 사용하는 방식을 폐기한다. successor 검증 없는 archive와 자동 삭제는 허용하지 않는다.
