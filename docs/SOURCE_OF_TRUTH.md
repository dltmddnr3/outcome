# 근거와 원본 계약

## 현재 원본 위치

OUTCOME 저장소는 현재 문서 원본입니다. MVP 실행 코드는 아직 아래 기존 저장소에 있습니다.

- 구현 저장소: `/Users/rosum/Documents/ChatGPT/WhiteCastle Desk 2`
- 화면: `src/CherryNoteDashboardApp.tsx`, `src/components/CherryNoteDashboard.tsx`
- 화면 테스트: `src/components/CherryNoteDashboard.test.ts`
- 로컬 수집기: `server/cherry-note-dashboard.mjs`
- 수집기 테스트: `server/cherry-note-dashboard.test.mjs`
- 기존 MVP Gate: `GATES_CHERRY_NOTE_DASHBOARD_MVP.md`
- UX Gate: `GATES_CHERRY_NOTE_DASHBOARD_JOURNEY_UX.md`

이 코드를 OUTCOME으로 옮길 때는 Builder가 한 번의 명시적 migration slice로 수행합니다. 두 저장소에서 동시에 기능 개발하지 않습니다.

## Cherry Note 근거

- 제품 Builder root: `/Users/rosum/.codex/worktrees/cn-outcome-candidate`
- Outcome scorecard: `OUTCOME_SCORECARD.md`
- Stage 33 Gate: `GATES_STAGE33_PHYSICAL_UIUX.md`
- Build 41 Release Scope: `RELEASE_SCOPE_STAGE33.md`
- Build 41 TestFlight 결과: `TESTFLIGHT_BUILD41_UPLOAD_RESULT.md`
- immutable receipts: `.whitecastle/outcome-events/`
- Codex task/thread 상태: 로컬 Codex task store
- 실제 실행 보조 근거: 현재 테스트 프로세스와 rollout tail

## 우선순위

충돌할 때 다음 순서로 판단합니다.

1. 최신 authoritative task/thread 상태
2. exact Git commit/tree와 immutable outcome receipt
3. Release Scope, Gate ledger, scorecard
4. 실제 실행 프로세스
5. rollout tail 또는 이전 채팅 요약

낮은 우선순위의 terminal 기록이 최신 task의 `inProgress`를 덮지 못합니다. 충돌은 숨기지 않고 사용자에게 자연어로 설명합니다.

## Freshness

- 실행 상태는 갱신 시각을 항상 표시합니다.
- freshness 한도를 넘으면 `active`를 유지하지 않고 `stale`로 내립니다.
- 근거가 없으면 `unknown`이며, 과거 상태로 보간하지 않습니다.
- 진행률 수치는 Gate 파일 또는 scorecard에서 실제 분모·분자를 읽을 수 있을 때만 표시합니다.

## 사용자 화면의 민감 정보 경계

다음은 수집에 필요하더라도 사용자 화면에 표시하지 않습니다.

- `/Users/...` 절대 경로
- task ID, turn ID, PID
- 전체 commit/tree/artifact SHA
- 토큰, 이메일, 계정 claim, credential marker
- 내부 JSON schema와 충돌 원문

대신 안전한 source 이름, 짧은 commit, 관측 시각, 자연어 상태를 제공합니다.

