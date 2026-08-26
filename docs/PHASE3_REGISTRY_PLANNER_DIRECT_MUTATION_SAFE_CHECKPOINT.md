# OUTCOME Phase 3 · Registry Planner Direct-Mutation SAFE_CHECKPOINT

상태: `SAFE_CHECKPOINT · BUILDER REVALIDATION REQUIRED · NO EXTERNAL MUTATION`

Observed: 2026-08-26 KST

## 원인

현재 `AGENTS.md`의 역할 경계 확인 전, Planner가 fresh QA FAIL correction loop에서 Registry 제품 소스와 테스트를 직접 수정·검증·commit했다. 이는 현재 운영 계약상 Builder 소유 작업이다. 자연어 완료나 fresh QA PASS만으로 이 역할 위반을 상쇄하지 않는다.

## 직접 변경 lineage

- initial Builder candidate: `9a00f2549d7eee3193bea1f61fe4134f9ed3028a`
- Planner direct correction 1: `97cb4d337b16dab2c08b835f25c98914e3ece470`
- Planner direct correction 2: `b2e8b1398d0acbe6867b0c490b59f8ac90855f5a`
- Planner direct correction 3: `f0acd350a7c900cc41a85980fab153ddabcdfe41`
- final registry implementation tree: `7366d1d7ad8f9b88e642321e8468564464a3c6f3`
- directly changed product paths:
  - `server/phase3-private-session-registry.mjs`
  - `server/phase3-private-session-registry.test.mjs`
- fresh independent QA-only PASS report: `70071fd5a7ca3f7ac7b29369075f129342e2969f`
- Planner Gate closure commit requiring revalidation: `d2a6ce1cbe9d3bf2e49c02e7de87202afe0f4cfc`

## 외부·runtime boundary

- provider/session/thread/browser operation: `0`
- credential/private-store access: `0`
- runtime/API/UI integration: `0`
- push/deploy/release/external message: `0`
- registry module은 현재 standalone synthetic module이며 production relay는 `NO_GO`

## Dirty state

canonical checkout에는 이 checkpoint와 무관한 기존 Planner/user modified·untracked 문서가 남아 있다. Builder는 canonical dirty checkout을 수정·정리·stage하지 않고 새 isolated worktree에서 exact Git objects만 검증한다. `docs/ROADMAP 2.md`는 열거나 수정하거나 commit하지 않는다.

## Promotion boundary

- `false_completion_count=1`: Planner가 Builder revalidation 전에 R1-R6을 evidence-closed로 기록한 역할 경계 위반 1건.
- R1-R6 closure와 그에 의존한 Phase 3 `17/43` 표기는 Builder revalidation receipt 전까지 `UNPROMOTED_CHECKPOINT`로 해석한다.
- QA PASS는 Builder role receipt를 대신하지 않으며 Release Audit·Cherry acceptance·Phase 3 completion은 계속 open이다.

## Required Builder revalidation

전담 Builder는 새 isolated worktree에서 exact final registry implementation `f0acd350...`와 현재 branch의 byte parity를 확인하고 다음을 수행한다.

1. direct correction 세 개의 diff와 fresh QA findings를 읽고 계약 대비 semantic review
2. focused Registry suite와 독립 hostile input matrix 재실행
3. Package, mutation, frontend, full Node, build, diff·scope 검증
4. provider/runtime/external operation 0 확인
5. exact revalidation commit/tree, result, rollback과 residual unknown을 receipt-only commit으로 고정

Builder가 FAIL하면 R1-R6을 다시 열고 correction ownership을 Builder로 돌린다. PASS면 기존 QA report와 함께 Planner가 R1-R6 promotion을 재확인할 수 있다.

## Rollback

Builder revalidation 전에는 registry가 runtime에 연결되지 않았으므로 외부 rollback은 불필요하다. 코드 rollback이 필요하면 direct correction commits를 역순으로 임의 revert해 취약한 상태로 되돌리지 말고, Builder가 initial registry candidate부터 전체 module을 quarantine/revert하는 단일 안전 rollback commit을 제안해야 한다.

## learning_receipt

Planner는 이후 제품 소스·테스트를 직접 수정하지 않는다. correction이 반복되더라도 exact pin·allowed paths·Gate·rollback을 Builder에 전달하고, fresh QA와 Release Audit은 각각 별도 역할로 유지한다. 사용자에게 중단을 줄이는 것은 역할을 합치는 것이 아니라 Builder→QA correction loop를 자동 라우팅하는 방식으로 달성한다.
