# OUTCOME Phase 4 · Session Workspace Contract

Updated: 2026-08-26 KST
Status: **Cherry-approved product direction · definition only · implementation not started**

## Product decision

OUTCOME의 역할별 채팅은 보조적인 텍스트 입력창이 아니다. Codex 앱과 거의 동일한 수준으로 세션의 대화와 실제 작업 흐름을 이해하고 제어할 수 있는 실시간 작업 워크스페이스여야 한다.

현재 대시보드의 `세션 채팅 · 연결 준비 중` 영역은 이 최종 제품의 자리만 예약한다. 실제 session event source가 연결되기 전에는 메시지 입력, 전송, 작업 애니메이션이나 완료 상태를 가장하지 않는다.

## Outcome

Cherry가 OUTCOME을 벗어나 Codex/Claude 화면을 따로 열지 않고도 프로젝트의 Planner, Builder, UX & Product QA, Release Audit 세션과 대화하고, 각 세션이 무엇을 계획하고 실행하고 검증하며 무엇을 기다리는지 실시간으로 이해한다.

## 사용자 판단

Cherry는 선택 프로젝트에서 다음을 즉시 판단할 수 있어야 한다.

1. 지금 어느 역할 세션을 보고 있으며 실제로 연결되어 있는가.
2. 내가 보낸 요청이 수신·실행·검증·대기 중 어디에 있는가.
3. 어떤 도구가 실행됐고 어떤 파일·테스트·증거가 바뀌었는가.
4. 승인이 필요한가, 추가 입력이 필요한가, 안전하게 중단하거나 재시도할 수 있는가.
5. 세션 작업이 Package의 어느 Stage와 연결되며 왜 아직 Gate 완료가 아닌가.

## 실시간 작업 타임라인

하나의 ordered timeline에서 다음 event type을 같은 시간축으로 제공한다.

- 사용자 메시지와 첨부
- 에이전트 응답의 실시간 streaming
- commentary와 사용자에게 공개 가능한 작업 설명
- 계획 생성·수정과 단계별 상태
- 도구 호출, 명령 실행, 탐색과 결과 요약
- 파일 변경과 diff, 생성·수정·삭제된 artifact
- 테스트·빌드·검증 명령과 통과·실패 결과
- 승인 요청, 사용자 입력 요청, 안전 중단과 재개
- candidate commit/tree/asset 및 evidence pointer
- 오류, 재시도, 취소, provider disconnect와 재연결

각 event는 최소 `event_id`, `thread_ref`, `role`, `sequence`, `created_at`, `kind`, `state`, `public_payload`, `correlation_id`를 가진다. 같은 event를 다시 받아도 중복 표시하지 않으며 sequence gap과 충돌을 숨기지 않는다.

## 상태 모델

| 상태 | 화면 의미 | 허용 동작 |
| --- | --- | --- |
| `queued` | 요청이 순서에 들어갔으나 실행은 시작하지 않음 | 취소 |
| `responding` | 에이전트 응답이 streaming 중 | 중단 |
| `tool_running` | 명시된 도구·명령이 실행 중 | 세부 보기, 허용될 때 중단 |
| `verifying` | 테스트·빌드·근거 검증 중 | 세부 보기 |
| `waiting_approval` | 외부 변경 또는 고위험 동작에 Cherry 결정 필요 | 승인, 거절 |
| `waiting_user` | 질문이나 자료가 필요해 멈춤 | 답변, 첨부 |
| `completed` | 해당 turn이 정상 종료됨 | 후속 요청, artifact 열기 |
| `failed` | 오류로 turn이 종료됨 | 오류 보기, 안전한 재시도 |
| `cancelled` | 사용자 또는 시스템이 중단함 | 새 요청 |
| `reconnecting` | event stream 재연결과 sequence 복구 중 | 대기, 수동 새로고침 |

세션 상태는 작업 진행 신호이며 Project/Phase/Scope/Stage/Gate 진행률이 아니다. Gate는 Package evidence가 조건을 충족할 때만 별도로 바뀐다.

## 상호작용 계약

- 프로젝트별 네 역할 탭에서 역할 전환과 연결·신선도 상태를 확인한다.
- 각 역할에는 project-scoped active thread와 교체 이력이 연결된다.
- 새 요청은 기본적으로 Planner에게 들어가며 다른 역할 전달은 Planner routing receipt로 표시한다.
- 사용자는 메시지·첨부를 보내고 streaming을 중단하며 실패한 turn을 명시적으로 재시도할 수 있다.
- 승인 카드는 exact action, target, impact, expiry, rollback을 보여준 뒤 승인·거절을 받는다.
- tool result, diff, test, artifact는 timeline을 압도하지 않는 접기 상세로 제공한다.
- Stage 연결은 문맥 표시와 evidence pointer를 제공하지만 세션 UI가 Gate를 자기 폐쇄하지 않는다.
- 과거 기록은 날짜·역할·상태·Stage로 탐색하고 끊긴 세션은 replacement history를 보존한다.

## 동작과 모션

- 새 token은 안정적인 streaming cursor와 함께 나타난다.
- 활성 역할은 한 개의 절제된 live indicator로 표시한다.
- 계획·tool·검증 상태 전환은 위치를 흔들지 않는 짧은 transition을 사용한다.
- 장기 실행은 spinner만 반복하지 않고 현재 event kind와 마지막 관측 시각을 함께 보여준다.
- `prefers-reduced-motion`에서는 pulse·shimmer·이동 애니메이션을 정적 아이콘과 상태 문구로 바꾼다.
- 애니메이션의 빈도·길이·메시지 수는 진행률이 아니다.

## Source truth와 실패 시 차단

- Phase 3 adapter가 공식·승인 interface로 event observation, exact dispatch, acknowledgement와 receipt를 증명해야 Phase 4 live interaction을 연다.
- event source가 없거나 stale이면 `연결 준비 중`, `관측 오래됨`, `오프라인` 중 실제 상태를 표시한다.
- 가짜 메시지, 가짜 tool activity, 합성된 streaming, 추정 완료, 자동 성공 처리를 만들지 않는다.
- sequence gap, duplicate, binding mismatch, permission failure는 fail closed하고 timeline에 명시한다.
- provider가 지원하지 않는 기능은 유사 구현으로 속이지 않고 비활성 상태와 이유를 표시한다.

## Privacy와 보안 경계

- 사용자에게 필요한 공개 가능한 commentary와 tool summary만 표시하며 private reasoning 또는 숨겨진 chain-of-thought는 표시·저장·요청하지 않는다.
- credential, token, cookie, raw session/thread/task/turn ID, local path와 unredacted prompt/result는 public surface와 일반 log에서 0건이어야 한다.
- private workspace도 project·role·actor 권한과 최소 공개 payload를 강제한다.
- 승인·거절·중단·재시도·routing·artifact 접근은 actor와 timestamp가 있는 audit event를 남긴다.
- provider message dispatch, shell/file mutation과 external operation은 해당 capability와 별도 승인 경계를 따른다.

## UX acceptance

- desktop에서는 왼쪽 세션 timeline과 오른쪽 Outcome Map을 동시에 읽고, 필요하면 어느 쪽이든 폭을 조절하거나 집중 보기로 전환할 수 있다.
- mobile에서는 역할 전환 → timeline → tool/artifact 상세 → Outcome Map을 한 손 탐색으로 오가며 현재 맥락을 잃지 않는다.
- streaming 중에도 메시지, 계획, 도구, 검증, 승인 요청이 시각적으로 구분된다.
- 현재 역할, 현재 turn state, 마지막 관측 시각과 Stage 연결이 첫 화면에서 식별된다.
- 긴 tool output과 diff는 접혀 있고 사용자가 열기 전까지 대화 흐름을 밀어내지 않는다.
- 연결 중단 후 재연결하면 마지막 confirmed sequence부터 복구하며 중복 event와 누락을 표시한다.
- keyboard, screen reader, focus restoration, 44px touch target, reduced-motion과 contrast 요구를 충족한다.
- OUTCOME 사용자는 Codex 앱과 비교해 핵심 작업 정보나 필수 제어가 빠졌다고 느끼지 않아야 한다.

## Phase ownership

- Phase 3: existing session binding, observation, Planner routing, receipt와 Phase 3 adapter proof.
- Phase 4: project/Package 생성, 역할 세션 생성·연결, 이 Session Workspace, OUTCOME-native full development.
- Phase 5: Question 200과 목적 기반의 동적 역할·도구 구성.

Phase 4 entry에는 Phase 3 supported adapter evidence, account/private workspace authorization, ordered event persistence, reconnect recovery와 mutation approval architecture가 필요하다. 이 문서 작성은 Phase 3·4 진행률, 구현 완료, QA, Release Audit, Cherry acceptance 또는 `EXTERNAL_OUTCOME_COMPLETE`를 의미하지 않는다.

## Non-goals

- Codex 화면의 픽셀 단위 복제
- private reasoning 또는 숨겨진 내부 추론 노출
- 활동량을 결과 진행률로 계산
- 승인 없는 provider/resource/file/release mutation
- 실제 event source가 없는 demo animation을 운영 UI에 표시
