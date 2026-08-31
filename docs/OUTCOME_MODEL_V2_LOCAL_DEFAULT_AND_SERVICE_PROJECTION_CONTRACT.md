# OUTCOME Model v2 local default and service projection contract

Updated: 2026-08-31 KST
Authority: Cherry direction approved; deployment, Production and release remain excluded.

## Product outcome

OUTCOME의 기본 실행이 Model v2의 Outcome Graph, Execution Graph와 deterministic Current Projection을 사용하고, Cherry가 서비스에서 내부 운영 절차가 아니라 목적지 도달 상태와 다음 행동을 즉시 이해한다.

## Problem

Model v2는 canonical source에 존재하고 local opt-in 검증까지 통과했지만 기본 실행은 여전히 v1이며, 현재 서비스는 `Phase → Scope → Stage → Gate`, 세션 binding과 기술 증거를 화면 중심에 둔다. 또한 긴 세션이 모든 과거 문서와 스킬을 반복해서 읽으면 목적지보다 continuity와 감사 절차에 주의를 빼앗긴다.

## Target user and job

- User: 여러 AI 작업을 하나의 논리적 Planner를 통해 운영하는 Cherry.
- Job: 30초 안에 `어디로 가는가`, `무엇이 남았는가`, `지금 무엇을 하는가`, `다음 경계는 무엇인가`, `내 결정이 필요한가`를 판단하고 Planner와 계속 작업한다.

## Canonical product model

- Outcome Graph가 Project, Destination, Milestone, Acceptance Predicate와 Evidence Claim을 소유한다.
- Execution Graph가 Work Item, Attempt, Event, Blocker와 Mission Envelope를 소유한다.
- Current Projection만 primary destination, acceptance gap, ready frontier, active work, next action과 Cherry action을 계산한다.
- v1 위계는 historical compatibility와 상세 탐색에서만 유지하며 사용자 화면의 기본 정보 구조나 수기 현재 위치가 아니다.

## Selective context contract

Model v2의 기본 실행은 전체 저장소를 다시 읽는 대신 source-addressed bootstrap projection을 사용한다.

### Default load set

1. `AGENTS.md`
2. content-addressed active snapshot: destination version, source digests, current acceptance gap, ready frontier, active work, next best action, Cherry action
3. snapshot이 가리키는 단 하나의 current canonical Gate
4. current work가 있으면 단 하나의 immutable handoff 또는 compact checkpoint
5. substantial work에 공통 `karpathy-guidelines`, `unlazy`와 work type에 필요한 역할 skill 최대 하나

### On-demand expansion

- Contract 또는 Map digest가 바뀌었거나 snapshot을 재컴파일할 때만 해당 원문을 다시 읽는다.
- predicate 판정, source conflict 또는 위험 경계에 필요한 supporting receipt만 exact reference로 연다.
- 추가 문서·skill load는 `reason`, `source digest`, `work id`를 가진 관측 이벤트로 남긴다.

### Default deny

- unrelated `GATES*.md`, correction chain, 과거 raw conversation, archived receipt 전체 탐색
- `docs/ROADMAP 2.md`
- 현재 work type과 무관한 design, deploy, provider, database, Figma 또는 audit skill
- 활성 목적지·Gate와 관계없는 history를 current projection에 포함하는 행위

### Context safety invariants

- compact snapshot은 canonical을 변경하지 않고 deterministic compiler만 생성한다.
- source digest가 맞지 않으면 `cold_compile_required`; 오래된 snapshot으로 실행하지 않는다.
- snapshot 또는 skill allowlist가 불완전하면 범위를 추정하지 않고 exact missing input만 요청한다.
- 세션 교체는 raw history가 아니라 snapshot, current Gate, active work와 next action만 전달한다.

## Service information architecture

### Primary workspace

1. **Destination** — 승인된 사용자 결과와 현재 목적지.
2. **Current gap** — 닫힌 predicate 수가 아니라 아직 참이 아닌 핵심 조건과 blocker.
3. **Now** — 실제 active work 또는 `작업 없음`; 세션 활동을 진행으로 표현하지 않는다.
4. **Next boundary** — ready frontier에서 선택된 다음 사용자 가치 경계.
5. **Cherry action** — 결정이 필요할 때만 노출하고 평상시에는 숨긴다.
6. **Planner conversation** — 목적 해석, 실행 결과, 재계획과 동적 작업 내용을 이어가는 중심 표면. 실제 adapter event가 없으면 가짜 streaming이나 tool activity를 만들지 않는다.

### Secondary surfaces

- Project switcher and archive entry
- Milestone explorer
- Acceptance detail
- Activity and evidence detail
- Account and connection management

### Hidden by default

- physical thread/session identifiers, binding history, hashes and raw receipts
- retry/dedup/lease/event ledger
- compatibility `Scope` columns and correction Gate files
- provider/runtime logs and worker routing

이 정보는 troubleshooting 또는 audit disclosure에서만 public-safe 형태로 연다.

## State ownership and API boundary

- Server returns one versioned `modelV2` projection per authorized project.
- Client renders the projection and may hold only selection/disclosure state; it cannot calculate canonical progress or next action.
- Account membership remains server-authoritative. Signed-out responses contain no project projection.
- Projection fields are allowlisted and must exclude local paths, exact task/thread locators, credentials, raw prompts/results and private registry payload.
- Stale, conflict, blocked, delivery unknown and no-active-work are distinct user states.

## Delivery slices

### Slice A — local default and real-work canary

- Model v2 becomes the local default without persistent provider/environment mutation.
- One explicit local rollback switch restores byte/object-compatible v1 behavior.
- A deterministic compact bootstrap projection is generated from current canonical inputs.
- One real OUTCOME work selection runs against current repository inputs, not only fixtures, and records loaded/skipped sources, next action and zero unauthorized transition.

### Slice B — service projection

- The private workspace consumes the versioned Model v2 projection.
- Destination, gap, Now, next boundary and Cherry action replace the v1 hierarchy as the default desktop/mobile surface.
- v1 compatibility exploration and technical evidence move behind disclosure.
- Existing authentication, account isolation and read-only boundaries remain unchanged.

Only one slice is active at a time. Slice B starts after Slice A has an immutable Builder candidate and independent verification.

## Acceptance

- Local startup with no opt-in flag returns Model v2 schema and deterministic projection.
- Explicit local rollback returns the unchanged v1 object/bytes and leaves no listener or persistent setting.
- Real-work canary reads only the default load set unless an exact on-demand reason is recorded.
- Irrelevant skills and historical Gate families are not loaded for the canary.
- Current Projection is the only source for destination, gap, frontier, next action and Cherry action.
- Desktop and mobile allow Cherry to answer the five user questions in 30 seconds without opening technical detail.
- No private identifier, local path, credential or raw provider/session payload reaches the client.
- Duplicate execution, automatic retry, unauthorized transition and false completion remain zero.

## Non-goals

- Preview or Production deployment, external release, domain or provider mutation
- persistent credential or database changes
- Phase completion or Cherry final product acceptance
- Hermes adoption
- arbitrary project creation, real-time provider chat or fabricated activity
- deletion or rewriting of historical Gate and receipt evidence

## Rollback

- Disable the local-default switch to restore the verified v1 compatibility projection.
- Keep canonical evidence and historical files intact.
- If source digest, privacy allowlist or rollback parity fails, stop at `LOCAL_V2_DEFAULT_SAFE_HOLD`; do not start Slice B.
