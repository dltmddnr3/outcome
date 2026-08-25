# OUTCOME Contract · MVP

Updated: 2026-08-25 KST
Status: **Phase 1 internal-use Local MVP accepted · external public MVP not accepted**

## Package identity

- Package name: `OUTCOME Package`
- Package schema version: `1`
- Project ID: `outcome`
- Project name: `OUTCOME`
- Repository: `/Users/rosum/Documents/ChatGPT/OUTCOME`
- GitHub connector: `connected · dltmddnr3/outcome · origin/main · initial push published and synchronized`
- Outcome: Cherry가 여러 역할과 세션의 활동을 결과 구조와 검증 증거로 이해하고 현재 위치와 다음 경계를 30초 안에 판단한다.
- Acceptance authority: `Cherry`
- Required Package files:
  - `docs/OUTCOME_CONTRACT.md`
  - `docs/OUTCOME_MAP.md`
  - `GATES.md`
  - `GATES_OUTCOME_MVP.md`

## Source connector contract

- GitHub is a standard optional connector of the OUTCOME Package, not a fourth required Package document.
- Package documents define intent and acceptance; local Git proves unpublished working candidates; GitHub proves published commits, pull requests, checks, and releases.
- GitHub activity never substitutes for Gate closure, independent QA, Release Audit, or Cherry acceptance.
- Repository identity is non-secret Package metadata. Tokens, credentials, local paths, and provider-specific bindings remain in the runtime registry.
- A missing or mismatched remote is shown as `unbound` or `conflict`; a connected empty remote is shown as `not_published / empty_remote`, never as progress or conflict.

## Phase contract

- Phase ID: `outcome-phase-1`
- Phase name: `Phase 1 · Local MVP`
- Purpose: Cherry Note와 OUTCOME 자체를 같은 Package 의미로 추적하는 독립 로컬 대시보드를 실제 사용 가능한 상태로 닫는다.
- Entry condition: Cherry가 OUTCOME 제품 방향과 OUTCOME Package 운영 모델을 승인하고 기존 Cherry Note 1차 대시보드 근거가 읽기 가능하다.
- Completion conditions:
  - `GATES_OUTCOME_MVP.md`의 Stage 3–8 Gate가 실제 증거로 모두 닫힌다.
  - fresh UX & Product QA와 별도 fresh Release Audit이 동일한 immutable candidate를 순서대로 검증한다.
  - Cherry가 30초 이해 과업을 실제 화면에서 수용한다.
- Included:
  - Cherry Note 및 OUTCOME self-tracking
  - standalone local runtime
  - OUTCOME Package parser와 fail-closed validation
  - 프로젝트별 역할 session binding과 NOW
  - desktop/mobile outcome funnel
  - 맥미니 source collector를 유지하면서 MacBook·모바일에서 접근 가능한 Cherry-approved public read-only 원격 피드백 화면
- Excluded:
  - 제3 프로젝트 포트폴리오
  - 다른 PC·계정 수집
  - 검색엔진 배포 최적화와 안정 URL·SLA 보장
  - 원격 화면에서의 작업 dispatch·파일 변경·승인 mutation
  - 원격 mutation·dispatch·release
  - Cherry Note iOS 제품 변경

## Approved future Phase contract

- Phase ID: `outcome-phase-3`
- Phase name: `Phase 3 · Existing Session Operations`
- Approval: 2026-08-25 KST Cherry `추천안 적용`
- Purpose: 여러 PC와 외부 Codex/Claude에 이미 존재하는 역할 세션을 project-scoped private binding으로 연결·관찰하고 Planner-only 경로로 업무를 전달해 결과·증거 영수증을 회수한다.
- Canonical detail: `docs/PHASE3_EXISTING_SESSION_OPERATIONS_CONTRACT.md`
- Execution boundary: Phase 2가 current이고 Phase 3 실행 Gate는 `0/37`; 계약 승인은 Phase 3 entry, 구현, session binding/message dispatch, QA/Audit/Cherry acceptance, release 또는 external completion이 아니다.

## 1. 누구를 위한 제품인가

여러 Codex·Claude 세션으로 제품을 만드는 Cherry가 사용합니다. Cherry는 로그나 JSON을 직접 해석하지 않고도 프로젝트가 어디까지 왔고 무엇이 막혔으며 다음에 무엇을 해야 하는지 알고 싶습니다.

## 2. 해결할 한 가지 문제

작업 세션과 Gate가 많아질수록 “많이 진행된 느낌”과 “원하는 결과에 실제 도달함”이 분리됩니다. OUTCOME은 흩어진 로컬 근거를 읽어 결과 도달 구조와 현재 위치를 한눈에 보여줍니다.

## 3. 핵심 사용자 행동

Cherry가 대시보드를 열고 다음을 30초 안에 판단합니다.

1. 지금 어느 Project / Phase / Scope / Stage인가.
2. 현재 실제로 실행 중인지, 마지막 근거는 언제 갱신됐는가.
3. 구현·테스트·증거 확정 중 무엇이 얼마나 닫혔는가.
4. 현재 Stage가 끝나려면 어떤 Gate가 남았는가.
5. 다음 작업과 Cherry가 개입할 지점은 무엇인가.

## 4. 실제 전달 형태

- MVP: 로컬에서 즉시 열리는 독립 HTML/React 대시보드
- 초기 URL: `http://127.0.0.1:5173/cherry-note-dashboard`
- MVP 데이터: Cherry Note의 관측 가능한 로컬 근거와 OUTCOME 프로젝트 자체의 표준 문서·역할 세션·delivery evidence
- 원격 피드백: MacBook·모바일에서 접근 가능한 Cherry-approved public read-only 웹. 로컬 source collector, 민감정보 redaction, mutation 차단을 유지한다. 현재 Quick Tunnel URL은 임시이며 재시작 시 변경될 수 있다.
- 후속: 다중 계정·다중 source host·원격 mutation은 새 계약에서 결정

## 5. 완료 조건

MVP는 아래 조건이 모두 증명될 때 완료입니다.

- Cherry Note의 Project → Phase → Scope → Stage → Gate 구조가 실제 근거와 일치합니다.
- OUTCOME 자체가 `OUTCOME_CONTRACT.md`, `OUTCOME_MAP.md`, `GATES*.md`로 등록되고 같은 화면 의미와 source authority로 추적됩니다.
- Cherry Note와 OUTCOME의 역할별 현재 세션 binding 및 freshness를 NOW에서 구분할 수 있습니다.
- 현재 위치, 다음 경계, 실행 상태, 경과 시간, 최근 속도가 자동 갱신됩니다.
- 구현·테스트·증거 확정은 서로 분리되어 표시됩니다.
- Gate는 진행 순서가 아니라 선택한 Stage의 완료 조건임이 직관적으로 보입니다.
- Stage 상세가 다른 콘텐츠를 가리지 않고 데스크톱·모바일에서 읽힙니다.
- 근거 없음·오래됨·충돌은 `unknown` 또는 `stale`로 정직하게 표시됩니다.
- 로컬 절대 경로, task/turn ID, 자격 증명, 전체 SHA 같은 내부 정보가 사용자 화면에 노출되지 않습니다.
- 공개 모드에서는 사용자에게 필요한 정제된 프로젝트·NOW·Gate 정보만 읽을 수 있고, 로컬 경로·자격 증명·raw session/thread payload·민감 식별자는 읽을 수 없습니다.
- Cherry가 실제 화면을 사용하고 “현재 위치와 다음 행동을 이해할 수 있다”고 수용합니다.

테스트 PASS, 문서 작성, 빌드 성공만으로는 완료가 아닙니다.

## 6. 이번 MVP에서 하지 않는 것

- Cherry Note와 OUTCOME을 제외한 임의의 제3 프로젝트 포트폴리오 관리
- 다른 PC 또는 다른 계정의 세션 수집
- Slack/Desk/Provider 로그인과 결합
- 원격 mutation, 작업 dispatch, 승인 대행
- 임의로 계산한 단일 종합 진행률
- Cherry Note iOS 제품 파일 변경
- OUTCOME 저장소와 기존 구현 저장소에 동시에 활성 원본 유지

## 7. 종료 또는 다음 Phase 진입

- Phase 1 내부사용 Local MVP 종료: 2026-08-25 KST Cherry의 명시적 `내부사용기준 종료 승인`으로 위 완료 조건과 Cherry 수용이 닫혔다.
- 승인 경계: 같은 결정에서 Cherry가 `외부 공개수준의 mvp는 아님`을 명시했으므로 외부 공개 수준 MVP, release approval, 외부 서비스 완료는 미승인이다.
- Phase 2 진입: 다중 프로젝트 공개 서비스의 남은 경계인 계정 접근 계약 K1–K6 정의부터 진행한다.
- `MVP_SCOPE_CLOSED`는 Phase 1 내부사용 Local MVP 범위의 종료만 뜻하며 `EXTERNAL_OUTCOME_COMPLETE`와 항상 구분합니다.

## 8. Final acceptance axes

- Functional outcome: 두 프로젝트의 Package·Gate·NOW가 실제 source authority와 일치한다.
- UX and product outcome: Cherry가 위계, 현재 위치, 남은 Gate, 다음 행동을 30초 안에 오해 없이 판단한다.
- Real-use outcome: 재실행과 freshness 변화 후에도 실제 로컬 근거가 stale/unknown을 포함해 정직하게 반영된다.
- Independent QA requirement: Builder와 분리된 fresh UX & Product QA가 pinned candidate를 반증한다.
- Release audit requirement: QA PASS 뒤 별도 fresh Release Audit이 동일 candidate의 독립 실행·privacy·build·rollback을 감사한다.
- Cherry acceptance requirement: Cherry의 명시적 Local MVP 수용이 필요하며 QA/Audit PASS가 이를 대신하지 않는다.
- Release authority: 별도 Cherry 승인 전 push, deploy, 공개, 외부 mutation을 수행하지 않는다.
