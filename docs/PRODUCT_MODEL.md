# 제품 진행 모델

OUTCOME은 **Project → Phase → Scope → Stage**를 진행 순서로 보여주고, **Gate**는 선택한 Stage의 완료 조건으로 분리합니다.

## 계층의 의미

| 계층 | 답하는 질문 | 예시 | 진행률 사용 |
|---|---|---|---|
| Project | 최종적으로 무엇을 달성하는가? | Cherry Note Phase 1 MVP | 최종 결과 상태 |
| Phase | 큰 결과 계약이 어디까지인가? | Phase 1 MVP closure | Phase 종료 여부 |
| Scope | 어떤 결과 묶음을 순서대로 닫는가? | Core loop, UI/UX hardening, Feed | 순서와 현재 위치 |
| Stage | 현재 Scope 안의 검증 가능한 작업 단위는? | Stage 33 physical UI/UX | 실행·후속 경계 |
| Gate | 이 Stage를 완료라고 말하려면 무엇을 증명해야 하는가? | 구현, 테스트, 증거, 실기기 수용 | 체크리스트 |

Gate는 다음 Stage가 아닙니다. 여러 Gate는 병렬 또는 서로 다른 증거 축일 수 있습니다.

## 진행 상태 축

하나의 퍼센트가 아니라 다음 축을 분리합니다.

- **구현**: 요청한 동작이 제품 코드에 존재함
- **테스트**: 재현 가능한 검증이 통과함
- **증거 확정**: immutable artifact 또는 ledger로 완료 주장이 가능함
- **UI/UX 수용**: Cherry가 실제 화면과 사용 흐름을 수용함
- **실사용 수용**: 실제 데이터·기기·재실행에서 결과가 유지됨
- **독립 QA**: Builder와 다른 세션이 반증 관점으로 검증함
- **Release Audit**: 배포 바이트·서명·권한·복구 경계를 독립 확인함

어떤 축이 N/A인지도 근거와 함께 표시합니다. 미검증을 0% 완료처럼 보이게 하거나, 테스트 PASS를 사용자 수용으로 승격하지 않습니다.

## MVP 화면 구성

1. Project outcome 및 현재 Phase
2. 실제 실행 상태와 근거 갱신 시각
3. 구현 / 테스트 / 증거 확정 레이어
4. Phase 1 진행 순서
5. 현재 위치와 다음 Scope
6. 선택한 Stage와 Gate 그룹
7. Outcome scorecard
8. 지금 포함할 범위와 다음 Phase로 보낼 범위

## 상태 어휘

- `complete`: 요구된 증거까지 닫힘
- `active`: 신선한 authoritative 실행 근거가 있음
- `queued`: 선행 경계 이후 시작 예정
- `pending`: 판단에 필요한 증거 대기
- `stale`: 마지막 근거가 freshness 기준을 넘김
- `unknown`: 읽을 수 있는 근거가 없음 또는 충돌을 해결하지 못함
- `locked`: 새 Outcome Contract 또는 승인 전 진입 금지

