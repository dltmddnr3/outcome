# Phase 3 · 목적 정의 결정 패킷

상태: `Decision: APPROVED · 2026-08-25 KST · NO IMPLEMENTATION AUTHORITY`

Cherry가 2026-08-25 KST `추천안 적용`으로 Q1 `A 추천안`, Q2 `A Planner-only`, Q3 `A 추천 proof`를 승인했다. 이 결정은 Phase 3 Outcome Contract와 실행 Stage/Gate 정의만 허용하며 Phase 3 진입·구현·세션 연결·외부 mutation·QA·Audit·release를 승인하지 않는다.

## 기존 Phase 경계

- Phase 2 · Public Multi-project Service: 여러 프로젝트를 계정 기반 공개 서비스에서 안전하게 전환·조회한다. 안정 호스팅, 프로젝트 포트폴리오, 계정 접근이 이 Phase의 책임이다.
- Phase 4 · In-OUTCOME Development: OUTCOME에서 프로젝트와 Package를 만들고, Planner·Builder·UX & Product QA·Release Audit 세션을 생성·연결하며, 외부 Codex/Claude 화면 없이 작업 대화와 개발을 완결한다.
- Phase 5 · Outcome-first Creation: 목적지를 발견하고 Question 200으로 Outcome Contract를 만든 뒤, 고정된 네 역할을 넘어 필요한 실행 구성을 만든다.

따라서 Phase 3은 공개 계정 서비스도, 새 프로젝트·세션 생성도, 목적 탐색도 맡아서는 안 된다.

## 발견된 구조 공백

현재 OUTCOME Package는 프로젝트의 목적·위계·Gate 증거를 추적할 수 있지만, 이미 다른 PC와 Codex/Claude에 존재하는 역할 세션을 프로젝트에 안전하게 연결하고 관찰하며 Planner를 통해 다음 업무를 전달하는 표준 운영 층은 아직 정의되지 않았다.

이 공백을 두면 Phase 2의 읽기 서비스에서 Phase 4의 완전한 내부 개발 환경으로 바로 도약해야 한다. 반대로 이 공백을 좁은 연결 운영 Phase로 두면, 기존 세션을 그대로 사용하면서 실제 운영 요구와 실패 상태를 먼저 검증할 수 있다.

## 추천 Phase 3 · 기존 역할 세션 연결 운영

추천 Outcome: Cherry가 OUTCOME에서 프로젝트별 기존 역할 세션의 연결 상태와 source-grounded NOW를 파악하고, Planner-only 경로로 다음 업무를 전달한 뒤 증거 영수증을 받을 수 있다. OUTCOME은 세션을 새로 만들지 않으며, 세션 활동을 진행률로 추론하지 않는다.

추천 Scope는 다음 네 덩어리다. 이는 승인 전 후보이며 아직 `OUTCOME_MAP` Stage가 아니다.

1. Existing Session Registry: 프로젝트와 Planner·Builder·UX & Product QA·Release Audit의 실제 기존 세션 binding을 비공개로 보관한다.
2. Multi-PC Observation Relay: Mac mini, MacBook, 모바일 원격 등 접속 위치가 달라도 세션 가용성·관찰 시각·NOW 출처를 일관되게 보여준다.
3. Planner-only Work Routing: Cherry의 지시는 먼저 해당 프로젝트 Planner에 들어가며, Planner가 역할 경계와 Gate를 확인해 대상 세션으로 전달한다.
4. Evidence Return & Continuity: 지시 ID, 대상 역할, 전달·수신 상태, 결과 포인터와 증거 영수증을 남기고 세션 교체·오프라인 후에도 연속성을 복구한다.

권장 흐름:

`기존 역할 세션 binding → 비공개 registry → 관찰/NOW → Planner 지시 → 대상 역할 세션 → 결과·증거 영수증 → GATES 문서 판정`

NOW는 “무엇을 하고 있는가”의 관찰값이다. 진행률은 오직 해당 Package의 Gate evidence와 별도 승인 상태에서 계산하며, 세션 활성·메시지 수·작업시간으로 만들지 않는다.

## 상태 소유권

| 상태 | 소유자 | 공개 화면에 허용되는 값 |
| --- | --- | --- |
| Project → Phase → Scope → Stage → Gate | 프로젝트의 OUTCOME Package 문서 | source-grounded 위계와 Gate 상태 |
| Project·role·session binding | 비공개 session registry | 역할명, 연결/미연결, freshness만 |
| session ID·provider locator·접속 credential | 비공개 서버 저장소 또는 승인된 secret store | 원문 비공개; 필요 시 opaque public-safe identifier만 |
| NOW·last observed·availability | observation relay | 출처, 관찰 시각, stale 여부가 붙은 요약 |
| routed instruction·target role·receipt | Planner routing ledger | 지시 상태와 public-safe receipt pointer |
| 구현 결과 | Builder | 구현 증거이며 자기 승인 아님 |
| UX/Product 판정 | 독립 UX & Product QA | 해당 pin에 대한 QA 판정만 |
| 출시 판정 | 별도 Release Audit | 해당 pin에 대한 Audit 판정만 |
| 진행률·Stage 전환 | Gate evidence + 요구된 Cherry 결정 | 활동량이 아닌 닫힌 Gate만 |

세션 ID는 공개 대시보드 HTML, 공개 API, 클라이언트 bundle, 로그 요약에 노출하지 않는다. 프로젝트 간 binding을 공유하지 않고, 역할 변경이나 세션 교체 시 기존 binding을 명시적으로 폐기하거나 이력으로 보존한다.

## 비목표

- Phase 2 책임인 계정 기반 공개 서비스, 다중 사용자 권한, stable public hosting을 다시 구현하지 않는다.
- OUTCOME에서 project/session을 생성하지 않는다. 이는 Phase 4 책임이다.
- OUTCOME 안에서 코딩·검수·출시를 완전히 수행하지 않는다. 이는 Phase 4의 full development 책임이다.
- 역할을 자율 생성·변경하는 autonomous composition을 만들지 않는다. 이는 Phase 5 책임이다.
- Question 200이나 목적지 탐색을 시작하지 않는다. 이는 Phase 5 책임이다.
- 세션 활동, 경과 시간, 메시지 수로 진행률·완료·승인을 추론하지 않는다.
- QA, Audit, Cherry acceptance, release 또는 external mutation을 Planner가 대신 닫지 않는다.

## 최소 Proof

승인된다면 첫 proof는 OUTCOME과 Cherry Note 두 프로젝트를 대상으로 한다.

- 프로젝트마다 실제로 존재하고 Cherry가 연결을 승인한 역할 세션만 등록한다. 네 역할 전부가 없으면 없는 상태를 그대로 표시한다.
- Mac mini와 MacBook/모바일 원격 중 서로 다른 두 관찰 위치에서 같은 project→role binding과 freshness 의미가 유지되는지 확인한다.
- Cherry의 한 가지 작업 요청을 OUTCOME → 해당 Planner → 한 대상 역할 세션으로 전달하고, 전달·수신·결과 포인터 영수증을 분리해 남긴다.
- 공개 화면에서는 session ID와 credential이 0건 노출되고, 연결되지 않음·오래됨·오프라인을 진행 중으로 오인하지 않아야 한다.
- proof는 제품 코드 배포, 실제 release, Gate closure 또는 외부 서비스 변경을 요구하지 않는 격리 후보에서 먼저 수행한다.

## 실패 안전 경계

- binding 누락·중복·프로젝트 불일치·역할 불일치이면 지시를 보내지 않고 fail closed한다.
- 세션 또는 관찰 PC가 오프라인이면 `오프라인/관찰 오래됨`으로 표시하고 NOW나 진행률을 새로 만들지 않는다.
- receipt가 대상 지시와 일치하지 않으면 결과를 Gate evidence로 연결하지 않는다.
- 세션 교체 시 이전 session ID로 자동 재전송하지 않는다. Cherry 또는 Planner의 명시적 rebind가 필요하다.
- timeout·provider 오류에서 무제한 재시도하거나 중복 지시를 만들지 않는다.
- 공개 redaction 검사가 실패하면 관련 project/session 정보를 제공하지 않는다.
- 어떤 실패도 release·Cherry acceptance·Phase completion·`EXTERNAL_OUTCOME_COMPLETE`를 자동 변경하지 않는다.

## 대안 비교

| 안 | 내용 | 장점 | 핵심 한계 |
| --- | --- | --- | --- |
| A · 추천 | 기존 세션 관찰 + Planner-only 업무 전달 + 영수증 | Phase 4 전 실제 운영을 검증하고 Cherry가 OUTCOME을 단일 입구로 사용 가능 | 비공개 binding·routing 안전 계약 필요 |
| B | 읽기 전용 세션 관찰만 | 가장 작은 mutation 경계 | Cherry가 결국 외부 세션 화면에서 직접 지시해야 함 |
| C | Phase 3을 비우고 Phase 4로 바로 이동 | 중간 시스템을 만들지 않음 | project/session 생성과 전체 개발 환경을 한 번에 검증해야 해 범위와 위험이 큼 |

## Cherry 결정 질문

### Q1 · Phase 3 목적

추천안 A: Phase 3을 **기존 역할 세션 연결 운영**으로 확정한다. 기존 세션의 private binding, multi-PC 관찰, NOW, Planner 경유 지시와 evidence receipt까지만 맡긴다.

결정: `A 추천안` / `B 읽기 전용 관찰` / `C Phase 3 비움` / 수정안

### Q2 · 업무 지시 권한

추천안 A: Cherry의 모든 다음 작업 요청은 프로젝트 Planner에 먼저 들어가고, Planner만 Builder·UX & Product QA·Release Audit 세션에 역할별 업무를 route한다. 각 역할 결과는 독립 상태이고 Planner도 자기 승인하지 않는다.

결정: `A Planner-only` / `B Cherry가 각 역할에 직접 지시도 허용` / 수정안

### Q3 · 첫 운영 Proof

추천안 A: OUTCOME + Cherry Note에서 실제로 존재하는 역할 세션만 연결하고, 두 관찰 위치의 연속성·public redaction·한 건의 Planner routed task와 receipt를 검증한다. release나 실제 Gate closure는 포함하지 않는다.

결정: `A 추천 proof` / `B OUTCOME 단일 프로젝트부터` / 수정안

## 결정 이후에만 가능한 다음 단계

Cherry가 Q1–Q3을 결정하면 그 응답을 source로 Phase 3 Outcome Contract, Scope, Stage, Gate와 acceptance를 별도 변경으로 작성한다. 그때도 구현 handoff, QA, Audit, Cherry acceptance, release는 각각 분리한다.

확정 결정: `[Q1=A, Q2=A, Q3=A]`

현재 residual unknowns: Phase 3 구현 인계 전에 별도 결정할 provider/session adapter 범위, private control-plane 실행 위치, 고위험 지시의 Cherry 재확인 정책.

## 구현 인계 결정 · 2026-08-25 KST

Cherry가 후속 세 추천안에도 `추천안 적용`으로 답했다.

- first adapter: Codex-only; Claude는 provider-neutral 호환 경계만 보존
- private control plane: Mac mini가 raw binding, credential, observation과 dispatch를 소유하고 Vercel/private workspace는 public-safe projection과 encrypted envelope만 중계
- high-risk authority: push·deploy·release·credential·billing·delete·external mutation은 exact target·intent digest·rollback을 확인한 만료형 single-use Cherry 재승인 필수

이 결정은 `docs/PHASE3_CODEX_RELAY_IMPLEMENTATION_HANDOFF.md`와 Codex adapter technical spike Stage 정의를 허용한다. 실제 Codex 접근, message dispatch, provider/resource mutation, 구현 시작, push/deploy/release는 승인하지 않는다.

구현 인계 residual unknowns: Codex supported interface 실사 결과와 exact Builder private session binding. 둘은 제품 방향 질문이 아니라 technical spike evidence와 private runtime assignment로 해결한다.

## 첫 Proof 행동 결정 · 2026-08-25 KST

Cherry가 후속 세 추천안에 다시 `추천안 적용`으로 답했다.

- first routed task: 읽기 전용 분석과 비파괴 테스트만 허용하고 tracked/untracked product file mutation은 0건
- binding UX: Mac mini local picker에서 public-safe 세션 정보를 선택한 뒤 project+role을 명시적으로 확인해야 binding
- offline behavior: Mac mini가 offline/stale이면 새 지시를 거부하고 browser-local draft만 보존하며 자동 replay 금지

이 결정은 first proof 행동 계약과 Technical Spike Builder brief를 dispatch-ready로 작성할 권한만 연다. 실제 picker 실행, session enumeration/binding, Builder assignment, Codex observation/message dispatch와 파일·외부 mutation은 승인하지 않는다.

Notion·Linear connector가 이 작업 환경에 연결되어 있지 않으므로 이 로컬 패킷은 decision-ready 초안일 뿐 외부 PRD·task completion을 주장하지 않는다.
