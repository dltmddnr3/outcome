# OUTCOME 운영 모델

## 세션 구성

| 순서 | 세션 | 책임 | 변경 권한 |
|---|---|---|---|
| 1 | OUTCOME · Planner | Outcome Contract, IA, Scope/Stage/Gate 구조, acceptance와 우선순위 확정 | 기획 문서만 |
| 2 | OUTCOME · Builder | 승인된 계약을 최소 변경으로 구현하고 테스트·candidate 증거 생성 | 제품 코드와 Builder Gate |
| 3 | OUTCOME · UX & Product QA | fresh Claude가 실제 사용성, 정보 이해, 반례, 모바일/데스크톱 패턴을 독립 검수 | 원칙적으로 read/test/use only |
| 4 | OUTCOME · Release Audit | 다른 fresh Claude가 exact Git/artifact/build/security/rollback을 독립 감사 | read-only audit |

최종 수용자는 Cherry입니다. QA와 Audit은 서로의 PASS를 대신할 수 없고 Builder는 self-accept하지 않습니다.

## 현재 생성된 Codex 작업

- Planner: `OUTCOME · Planner`
- Builder: `OUTCOME · Builder`
- UX & Product QA: `OUTCOME · UX & Product QA`
- Release Audit: `OUTCOME · Release Audit`

이 작업들은 생성 당시 기존 WhiteCastle Desk 저장소의 worktree에 연결되었습니다. OUTCOME 독립 저장소로 실제 구현을 옮긴 뒤에는 새 repository root를 authoritative project로 다시 연결해야 합니다.

## 기본 작업 규율

- `karpathy-guidelines`: 가정과 tradeoff를 드러내고 가장 단순한 경로를 선택하며 요청 밖 변경을 하지 않습니다.
- `unlazy`: 실질 작업 전 Gate를 파일로 작성하고, 모든 Gate에 실제 증거가 없으면 완료 보고하지 않습니다.
- Builder product edit ownership: 제품 코드는 Builder만 변경합니다.
- independent verification: QA와 Audit은 fresh session과 immutable candidate를 사용합니다.
- release boundary: push, deploy, 외부 공개, 자격 증명 변경은 별도 권한입니다.

## 인계 형식

각 세션은 다음을 남깁니다.

1. exact objective와 scope
2. 변경 파일 또는 읽은 근거
3. Gate N/N와 검사 결과
4. commit/tree 또는 artifact identity
5. blocker와 `needs_cherry_decision`
6. 다음 한 가지 안전한 행동
7. `false_completion_count`

## 작업 흐름

Planner → Builder ↔ UX/Product QA → Release Audit → Cherry acceptance

QA가 결함을 찾으면 Builder로 돌아가며, 수정 candidate는 새 immutable identity로 다시 QA와 Audit을 거칩니다. Phase 2는 Phase 1 세션을 그대로 연장하지 않고 새 Outcome Contract와 fresh Builder로 시작합니다.

