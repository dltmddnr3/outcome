# OUTCOME Phase 3 · Codex Relay 구현 인계 계약

Updated: 2026-08-25 KST

Status: **DECISION-CLOSED · TECHNICAL SPIKE REQUIRED · NO IMPLEMENTATION AUTHORITY**

Decision set P3-IMPLEMENTATION-1: APPROVED

- `Codex-only first adapter`: Phase 3 첫 adapter와 proof는 Codex existing sessions만 대상으로 한다. Claude는 provider-neutral interface 호환성만 보존하고 구현하지 않는다.
- `Mac mini private control plane`: raw session locator, adapter credential, registry, routing decision과 dispatch는 Mac mini 안에서만 소유한다. Vercel/private workspace는 public-safe projection과 end-to-end encrypted command envelope만 중계한다.
- `high-risk Cherry reconfirmation`: push, deploy, release, credential, billing, delete와 모든 외부 mutation은 exact target·intent digest·rollback을 보여준 Cherry의 만료형 single-use 재승인 없이는 전달하지 않는다.

Decision set P3-PROOF-1: APPROVED

- `read-only first task`: 최초 실제 routed task는 source analysis와 non-destructive test observation만 허용하며 repository file mutation은 0건이어야 한다.
- `local picker explicit bind`: raw locator는 Mac mini local picker 안에서만 읽고 Cherry가 project+role을 확인한 뒤에만 binding한다.
- `offline reject and draft-only`: Mac mini offline/stale 상태에서는 submit을 거부하고 browser-local draft만 보존하며 자동 replay하지 않는다.

Cherry는 2026-08-25 KST 직전 세 추천안에 `추천안 적용`으로 답했다. 이 승인은 본 architecture와 initial Builder spike handoff 작성만 허용하며 실제 Codex 접근, binding, observation, message dispatch, hosted queue/resource/secret 생성, product implementation, push/deploy/release를 허용하지 않는다.

## Immutable input

- repository: `dltmddnr3/outcome`
- local source commit before this handoff: `36c6e585e37a0ddff80811f3408124badc877051`
- tree: `7bced21e670047a4b5fb6f31b747b99ccf82d1a2`
- product contract: `docs/PHASE3_EXISTING_SESSION_OPERATIONS_CONTRACT.md`
- execution Gates: Phase 3 technical spike + registry + observation + routing + continuity + fresh QA + fresh Audit + Cherry acceptance
- acceptance authority: Cherry

## Current source baseline

Current code has projection primitives, not a Phase 3 control plane.

- `server/outcome-package.mjs`의 `bindingViews`와 `buildPackageModel`은 호출자가 제공한 `bindingRegistry` 배열을 project-scoped role status/NOW로 정제한다. 영속 private registry나 Codex adapter를 소유하지 않는다.
- `server/cherry-note-dashboard.mjs`는 task/thread/session ID, local path, credential과 full identifiers를 redaction한다.
- `server/index.mjs`는 public dashboard GET을 제공하고 임의 `/api/*` mutation을 `405 read_only`로 거부한다. Phase 3 bind/observe/route/receipt endpoint는 없다.
- current Package tests는 role binding history, stale, NOW/progress 분리와 public redaction을 검증한다. 실제 Codex session 관찰·전달 가능성을 증명하지 않는다.
- `docs/SOURCE_OF_TRUTH.md`는 local Codex task store를 source 후보로 언급하지만 지원 API, read consistency, write authority와 provider 약관 증거가 아니다.

따라서 Builder는 먼저 Codex adapter technical spike를 수행해야 한다. private store 구조를 추측하거나 기존 tests를 실연동 증거로 승격하면 안 된다.

## Service structure

### 1. OUTCOME browser

- authenticated Cherry-only private workspace에서 project, role binding state, freshness, redacted NOW와 routed receipt를 표시한다.
- raw locator, token, local path, full prompt/result를 받지 않는다.
- low-risk instruction intent 또는 high-risk confirmation을 제출하지만 provider session에 직접 접근하지 않는다.

### 2. Hosted private workspace boundary

- Phase 2 account access가 완료된 뒤에만 사용할 수 있다.
- public-safe read projection과 opaque instruction status를 제공한다.
- Mac mini용 command는 end-to-end encrypted envelope로 보관하며 hosted service는 raw intent/session locator를 복호화하지 못한다.
- command envelope는 24시간 뒤 만료하며 acknowledgement 뒤 제거한다. immutable public-safe audit metadata만 남긴다.
- anonymous/public endpoint는 계속 GET-only이며 mutation은 405다.

### 3. Mac mini private control plane

- project/role binding metadata, encrypted private locator reference, observation cursor, instruction ledger와 receipt correlation의 canonical owner다.
- raw locator/credential은 macOS Keychain에 보관하고 SQLite에는 opaque key reference와 non-secret metadata만 둔다.
- outbound-only authenticated polling 또는 stream으로 hosted envelope를 가져온다. inbound public port를 열지 않는다.
- decrypt → project/role/binding/version/authority validation → Codex adapter 호출 → receipt 업로드 순서를 소유한다.
- Mac mini가 offline이면 observation은 stale, dispatch는 queued가 아니라 `control_plane_offline`으로 차단한다.

### 4. Codex adapter

- technical spike에서 확인된 공식·지원 interface만 사용한다.
- provider model을 OUTCOME의 bind/observe/route/ack domain으로 정규화한다.
- unsupported capability는 `unsupported`, missing은 `unbound`, provider failure는 `unavailable`로 구분한다.
- hidden endpoint, credential extraction, private DB mutation, UI scraping은 금지한다.

### 5. Package/Gate projection

- observation과 routed activity는 NOW만 갱신한다.
- role result와 evidence pointer는 instruction에 연결하지만 Gate closure로 자동 승격하지 않는다.
- Package parser만 실제 Gate ledger를 읽어 Stage progress를 결정한다.

## Information architecture

기존 OUTCOME 화면 형태를 깨지 않고 다음 progressive disclosure를 사용한다.

1. Project Hero: Phase/Scope/Stage/Gate current truth 유지
2. NOW/역할 영역: role별 `연결 없음 / 관찰됨 / 오래됨 / 오프라인 / 충돌`, last observed, source class 표시
3. 선택 역할 drawer: provider=`Codex`, private locator 비공개, binding version과 safe history count만 표시
4. Planner 요청 composer: project Planner가 선택된 상태에서 target role, 의도, 허용 범위, risk class를 먼저 보여줌
5. 전달 timeline: requested → validated → dispatched → acknowledged → result attached → evidence attached를 분리
6. high-risk confirmation: exact target, operation, affected resource, intent digest, expiry, rollback을 별도 화면으로 확인
7. technical evidence: 기본 접힘; public-safe receipt, stale reason, adapter capability만 표시

브라우저를 새로 열거나 PC를 바꿔도 project와 current Phase/Scope/Stage는 Package truth로 복귀한다. 탐색 선택은 실제 current나 NOW를 바꾸지 않는다.

## Domain boundaries and dependency DAG

`Phase 2 authenticated private workspace`
→ `Codex adapter technical spike S1-S6`
→ `Private Registry R1-R6`
→ `Observation Relay O1-O6`
→ `Planner Routing T1-T7`
→ `Evidence Continuity E1-E6`
→ `fresh QA Q1-Q4`
→ `fresh Audit A1-A4`
→ `Cherry acceptance C1-C4`

| Domain | Owns | Must not own | Failure propagation | Fallback |
| --- | --- | --- | --- | --- |
| Package parser | hierarchy, Gate progress | session activity/dispatch | invalid Package → project conflict | fail closed project view |
| Hosted private workspace | Cherry auth, safe projection, encrypted envelope queue | raw locator/credential, provider call | auth/store outage → no private read/write | public read-only snapshot only |
| Mac mini registry | binding/version/history/key reference | public display, Gate decision | offline/corrupt → route disabled | stale/unbound projection |
| Observation relay | source event/cursor/freshness | progress, instruction success | gap/conflict → stale/conflict | last valid safe observation |
| Planner router | intent validation, risk class, instruction state | Builder/QA/Audit result judgment | mismatch/timeout → blocked/failed | manual retry or cancel |
| Codex adapter | supported provider observe/send/ack translation | Package/Gate mutation | unsupported/outage → unavailable | read-only/manual fallback |
| Evidence ledger | receipt/result/evidence correlation | evidence sufficiency decision | mismatch → attach denied | manual reconciliation |

No domain may own both instruction execution and its QA/Audit/Cherry acceptance. Cyclic dependencies are forbidden; observations never depend on Gate progress and Gate progress never depends on activity.

## State ownership

| Entity | Canonical store | Public-safe projection |
| --- | --- | --- |
| `ProjectRoleBinding` | Mac mini SQLite + Keychain locator reference | project, role, status, provider class, version, freshness |
| `ObservationEvent` | Mac mini append-only store | availability, redacted NOW, observed_at, stale reason |
| `InstructionIntent` | hosted encrypted envelope until ack; Mac mini ledger after decrypt | opaque instruction ID, target role, risk, state |
| `CherryConfirmation` | signed hosted receipt + Mac mini consumed nonce set | confirmed/expired/consumed only |
| `DeliveryAttempt` | Mac mini ledger | attempt state, safe error class, timestamps |
| `RoleResultPointer` | Mac mini evidence ledger | safe result available flag, candidate short pin |
| `EvidenceReceipt` | repository/immutable artifact + correlation ledger | safe receipt pointer and validation state |
| Gate state | project `GATES*.md` | closed/total and source axes |

Owner가 없는 state와 중복 canonical store를 허용하지 않는다. hosted queue loss는 Mac mini ledger의 accepted instruction을 삭제하지 않으며, Mac mini loss는 hosted ciphertext만으로 raw locator나 intent를 복구할 수 없어야 한다.

## Data model and invariants

### `ProjectRoleBinding`

- keys: `project_id`, `role`, `binding_version`
- fields: `provider=codex`, `locator_key_ref`, `status`, `bound_at`, `revoked_at`, `replaced_by`, `actor`, `reason`
- invariant: `(project_id, role)` active row 최대 1개
- invariant: replacement는 expected current version compare-and-swap
- invariant: raw session/thread ID는 SQLite, API, logs에 저장하지 않고 Keychain secret value로만 존재

### `ObservationEvent`

- keys: `binding_id`, `sequence`
- fields: `source_host_id`, `observed_at`, `availability`, `redacted_now`, `adapter_version`, `missing_reason`
- invariant: sequence 증가; out-of-order event는 projection을 덮지 않음
- invariant: event age 90초 초과 시 stale, Mac mini disconnect 즉시 offline

### `InstructionIntent`

- keys: `instruction_id`, unique `idempotency_key`
- fields: `project_id`, `planner_binding_version`, `target_role`, `target_binding_version`, `risk_class`, `intent_digest`, `encrypted_payload_ref`, `requested_at`, `expires_at`, `state`
- invariant: receipt 없는 `acknowledged`, result 없는 `result_attached`, evidence 없는 `evidence_attached` 금지
- invariant: high-risk에는 valid unconsumed confirmation digest 필수

### `CherryConfirmation`

- keys: `confirmation_id`, `nonce`
- fields: `instruction_id`, `target_digest`, `operation_digest`, `rollback_digest`, `issued_at`, `expires_at`, `consumed_at`, `owner_subject`
- invariant: 10분 만료, single-use, exact digest match, owner session 재인증

### Retention

- encrypted pending command: acknowledgement 또는 24시간 만료 중 먼저 발생할 때 제거
- observation events: 30일; latest safe projection은 binding lifecycle 동안 유지
- instruction/delivery/result metadata: 90일
- binding/confirmation/security audit: 365일
- raw prompt/result body: OUTCOME 저장 금지; provider/session에만 존재
- Cherry export/delete 요구 시 public-safe JSON export와 tombstone audit를 남기며 active in-flight instruction은 먼저 cancel/expire한다.

## Command, query, and event contract

### Private commands

- `BindExistingCodexSession(project, role, locator_secret, expected_version)`
- `ReplaceCodexSessionBinding(project, role, locator_secret, expected_version)`
- `DisableProjectRouting(project, reason)`
- `SubmitPlannerInstruction(project, target_role, idempotency_key, encrypted_intent)`
- `ConfirmHighRiskInstruction(instruction_id, target_digest, operation_digest, rollback_digest)`
- `CancelInstruction(instruction_id, expected_state)`
- `AttachRoleResult(instruction_id, candidate_pin, safe_pointer)`
- `AttachEvidenceReceipt(instruction_id, evidence_hash, safe_pointer)`

모든 command는 authenticated Cherry workspace, CSRF protection, explicit project scope, expected version 또는 idempotency key를 요구한다. public route에서 같은 path는 405다.

### Private queries

- `GetProjectRoleBindings(project)`
- `GetRoleObservation(project, role)`
- `GetInstructionTimeline(project, instruction_id)`
- `GetAdapterCapabilities(provider=codex)`

query는 raw locator/credential/payload를 반환하지 않는다. 존재 권한이 없는 project는 404/403 차이로 존재를 누출하지 않고 generic deny를 반환한다.

### Events

- `BindingActivated | BindingReplaced | BindingRevoked`
- `ObservationRecorded | ObservationStale | ControlPlaneOffline`
- `InstructionRequested | InstructionValidated | DispatchAttempted | InstructionAcknowledged | InstructionTimedOut | InstructionCancelled | InstructionFailed`
- `RoleResultAttached | EvidenceReceiptAttached`
- `HighRiskConfirmed | ConfirmationExpired | ConfirmationConsumed`

event는 schema version, event ID, entity version, occurred_at, actor class와 correlation ID를 가진다. payload는 최소화·redaction하며 duplicate event ID는 idempotently 무시한다.

## Technical spike

첫 Builder slice는 `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md#S1-S6`만 수행한다.

### Required evidence

- 공식 primary source 또는 local supported interface 문서의 exact version/date
- observation과 dispatch capability matrix: supported / unsupported / unknown
- synthetic/no-op observation·dispatch/ack transcript와 secret-redacted reproduction command
- authentication, permissions, limits, cost, ToS and failure behavior
- raw private store mutation·unsupported scraping·credential extraction이 없다는 negative proof
- GO/NO-GO receipt와 fallback

### GO

supported observation과 exact-session instruction delivery가 모두 재현되고 least privilege, acknowledgement, idempotency와 redaction이 충족될 때만 Registry implementation handoff를 연다.

### NO-GO

- observation만 지원: Phase 3을 read-only observation + manual open/deep-link로 축소하는 Cherry 결정 요청
- safe open/deep-link만 지원: binding status와 manual navigation만 제공, NOW/dispatch 미제공
- 어느 것도 지원하지 않음: `unbound/unsupported` 표시만 유지하고 Phase 3 implementation을 hold

NO-GO는 실패가 아니라 source-grounded scope correction이며 hidden/private interface로 우회하지 않는다.

## First proof behavior

Technical Spike가 GO이고 Registry·Observation·Routing candidate가 각자의 Gate를 충족한 뒤에만 최초 실제 routed task를 연다.

First task intent:

`선택 프로젝트의 현재 Package 문서와 exact Git 상태를 읽고, 현재 Phase/Scope/Stage/Gate 및 다음 미충족 경계를 source reference와 함께 요약하라. 파일을 변경하지 말고 외부 mutation을 수행하지 말라.`

Allowed:

- Package 계약·지도·Gate와 allowlisted source의 read-only inspection
- `git status`, `git show`, `git diff --check`, read-only search
- 이미 승인된 non-destructive test command 실행과 출력 관찰
- source pin, command, exit code, result pointer와 limitation 반환

Forbidden:

- tracked/untracked product 파일 생성·수정·삭제
- formatter, build finalizer, migration, generated snapshot 등 workspace를 변경할 수 있는 command
- Git index/commit/branch/remote mutation
- provider/session 설정 변경, message fan-out, push/deploy/release 또는 외부 mutation
- Gate checkbox/evidence 작성과 QA/Audit/Cherry acceptance 판정

Proof 전후 `git status --porcelain=v1`의 task-owned delta는 파일 변경 0건이어야 한다. 기존 unrelated `docs/ROADMAP 2.md`는 열거나 변경하거나 task delta로 흡수하지 않는다.

## Proof success receipt

다음 항목이 모두 있어야 first routed task를 성공으로 기록한다.

- immutable instruction ID와 idempotency key
- exact project, Planner binding version, target role/binding version
- requested/validated/dispatched/acknowledged/result timestamps
- read-only intent digest와 risk=`low_read_only`
- result pointer와 source references; evidence/Gate pointer는 별도이며 자동 closure 없음
- before/after Git status와 file mutation count `0`
- raw session/thread/task/turn ID, local path, credential public leak `0`
- timeout/duplicate/offline negative probe receipt

Receipt가 없어도 result text가 보이면 success로 승격하지 않는다.

## Mac mini local picker contract

- picker는 `127.0.0.1` 또는 Mac mini의 승인된 local-only UI에서만 동작한다.
- Codex technical spike가 허용한 supported interface로만 existing session candidates를 읽는다.
- raw locator와 full title/prompt는 Mac mini memory/Keychain boundary 밖으로 나가지 않는다.
- 화면에는 provider=`Codex`, safe alias, last observed, availability와 existing binding conflict만 보여준다.
- candidate 선택만으로 binding하지 않는다. Cherry가 project와 role을 선택하고 safe alias를 다시 확인한 explicit action 뒤 compare-and-swap binding을 만든다.
- 이미 다른 project/role에 active binding된 candidate, ambiguous/stale candidate, unsupported source는 bind disabled다.
- cancel은 state mutation 0건이다. rebind는 old binding revoke와 new version을 한 transaction으로 기록하며 자동 복제하지 않는다.
- picker telemetry에는 candidate count와 error class만 허용하고 raw locator/session ID는 기록하지 않는다.

Raw locator는 Mac mini 내부에만 존재하며 hosted workspace에는 opaque binding ID와 public-safe metadata만 전송한다.

## Offline draft-only contract

- Mac mini heartbeat가 30초 내 없거나 observation age가 90초를 넘으면 control plane을 offline/stale로 판정한다.
- offline/stale이면 submit control을 disabled하고 provider queue write, hosted encrypted envelope 생성, instruction ID 발행을 모두 거부한다. provider queue write count는 `0`이다.
- 사용자가 작성한 draft는 현재 authenticated browser의 session-scoped local storage에만 보존하고 서버·Mac mini·provider로 전송하지 않는다.
- draft는 logout, tab/session 종료 또는 24시간 중 먼저 발생할 때 삭제한다. 다른 기기와 동기화하지 않는다.
- Mac mini가 online으로 돌아와도 automatic replay는 금지한다. Cherry가 freshness와 exact target을 다시 보고 명시적으로 재제출해야 새 instruction을 만든다.
- offline 전 이미 acknowledged된 instruction만 기존 ledger에서 관찰할 수 있으며 미확인 instruction을 success로 승격하지 않는다.

## High-risk Cherry reconfirmation

High-risk operations:

- Git push, merge, tag, release, deployment, production promotion
- credential/secret/OAuth/provider account or permission change
- billing, paid resource, DNS/domain, database migration
- delete, destructive overwrite, irreversible data mutation
- external message/publication or action affecting third parties

Confirmation UI는 exact project, target role/session safe label, normalized operation, affected resource, intent digest, expected outcome, rollback, expiry를 보여준다. Cherry owner가 재인증해 발행한 confirmation은 10분 만료, single-use이며 instruction/target/operation/rollback digest가 하나라도 다르면 Mac mini가 거부한다.

Phase 3 first proof에서는 high-risk operation을 실제 실행하지 않는다. denial과 confirmation contract만 synthetic test한다.

## Mutation authority matrix

| Action | Planner route | Cherry reconfirmation | First proof |
| --- | --- | --- | --- |
| observe binding/NOW | allowed after binding approval | not per event | allowed |
| request code analysis or local reversible edit | allowed | not required if no external effect | one allowlisted task only |
| run local non-destructive tests | allowed | not required | allowed if target session supports it |
| push/deploy/release | blocked by default | exact-target required | forbidden |
| credential/billing/domain/database mutation | blocked by default | exact-target required | forbidden |
| delete/destructive overwrite | blocked by default | exact-target required | forbidden |
| QA/Audit/Cherry acceptance/Gate closure | no mutation authority | separate authority | forbidden |

## Reliability, capacity, cost, and recovery

- first proof capacity: projects 2, roles up to 4 per project, one active instruction at a time
- observation target: online Mac mini에서 30초 이내 projection, 90초 뒤 stale
- dispatch target: supported adapter acknowledgement가 있으면 10초 이내; 없으면 success를 표시하지 않음
- retry: exponential bounded maximum 3 attempts, same idempotency key; high-risk는 automatic retry 0
- cost: technical spike와 local proof는 새 paid resource 0; hosted durable queue/storage가 필요하면 별도 Cherry cost approval
- backup: encrypted SQLite daily local backup, 7일 보존; Keychain secret은 backup에 export하지 않음
- rollback: route intake disable → pending envelope expire/cancel → adapter disable → observation read-only → public snapshot only
- recovery proof: restart, network loss, duplicate envelope, partial receipt, DB restore, revoked binding을 synthetic fixtures로 재현

## Builder handoff

Initial recipient role: `Builder`

Initial slice: `Codex adapter technical spike only`

Handoff state: `PREPARED_NOT_DISPATCHED`

First proof behavior state: `APPROVED_NOT_EXECUTED`

### Allowed

- current repository의 새 spike harness와 tests, `GATES_PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE.md` evidence receipt
- official/local supported interface에 대한 read-only capability probe
- synthetic/no-op adapter mapping, red-first negative fixtures와 reproduction commands
- public redaction과 existing 405 mutation boundary 재검증
- exact commit/tree, commands, outputs, limitations, GO/NO-GO receipt가 있는 로컬 candidate commit

### Forbidden

- 기존 Codex private DB mutation, UI scraping, hidden endpoint, credential extraction
- 실제 사용자 세션에 message 전송 또는 작업 실행
- Phase 3 registry/relay/router product code implementation
- Vercel/provider/resource/secret/queue 생성 또는 변경
- `docs/ROADMAP 2.md`, Cherry Note iOS, unrelated Phase 2 files 변경
- push, deploy, release, external mutation, QA/Audit/Cherry acceptance 자기 판정

### Required red-first tests

1. unsupported/missing interface returns `unsupported`, not active
2. wrong project/role/locator and stale binding cannot observe or route
3. duplicate idempotency key never creates a second logical instruction
4. public API/HTML/bundle/log expose zero raw session/thread/task/turn IDs, paths, secrets
5. no acknowledgement never becomes success
6. high-risk instruction without exact unexpired single-use confirmation is denied
7. Mac mini offline produces stale/offline and route denial

### Receipt

Builder must return exact commit/tree, changed files, test commands/counts, capability matrix, primary source pins, observed limitations, security scan, rollback command, `git status`, GO/NO-GO and residual unknowns. Natural-language completion without artifacts is not evidence.

### Stop conditions

- no supported interface or unclear provider terms
- need for raw private store mutation/scraping/credential extraction
- any actual message/provider/resource mutation required to prove feasibility
- public disclosure or cross-project isolation failure
- scope beyond technical spike

Stop means preserve evidence and return `SAFE_HOLD`; do not improvise around the boundary.

Exact dispatch-ready task brief: `docs/PHASE3_CODEX_ADAPTER_TECHNICAL_SPIKE_BUILDER_BRIEF.md`.

## Skill and external-system boundary

`berry-service-architect` requires a WhiteCastle `job_type=berry-service-structure` ticket, exact profile binding and immutable skill/input receipts. Those inputs are absent, so this document does not claim that skill's `complete` payload or `residual_unknowns=[]`.

Notion and Linear connectors are also absent. This is a local source-controlled handoff, not a Notion PRD or Linear execution ticket. No Builder session ID is written into Package documents; actual assignment remains private registry state and needs separate routing authority.
