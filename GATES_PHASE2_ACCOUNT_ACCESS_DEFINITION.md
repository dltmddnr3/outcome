# OUTCOME Phase 2 · Account Access Definition Gates

Outcome: 계정 구현을 시작하기 전에 공개 배포본과 인증된 비공개 작업공간의 경계, 사용자·프로젝트 권한, 데이터 수명주기와 운영 책임을 Cherry가 선택한 검증 가능한 계약으로 고정한다.

- [ ] K1: Cherry가 1차 사용자 범위와 공개 화면·비공개 작업공간의 분리를 승인한다.
  PROVES: cherry_decision
  EVIDENCE: pending
- [ ] K2: 인증 제공자, 소유자 식별, 접속 수명, 로그아웃·접속 철회, 요청 위조 방지와 계정 복구 계약이 승인된다.
  PROVES: security
  EVIDENCE: pending
- [ ] K3: 작업공간 간 격리, 프로젝트 가시성, 최소 권한, 비밀정보 소유권과 감사 경계가 승인된다.
  PROVES: security
  EVIDENCE: pending
- [ ] K4: 영속 저장소, 배포본 최신성, 삭제·내보내기, 보존 기간, 이전과 백업·복구 계약이 승인된다.
  PROVES: architecture
  EVIDENCE: pending
- [ ] K5: 오남용 방지, 관측, 사고 대응, 비용 상한, 단계적 적용과 되돌리기 수용 조건이 승인된다.
  PROVES: operations
  EVIDENCE: pending
- [ ] K6: Cherry가 정확한 계정 접근 결과 계약을 승인하고 첫 구현 작업의 허용 범위를 연다.
  PROVES: cherry_acceptance
  EVIDENCE: pending

ABANDON: 인증 provider 설치, 계정 생성, secret·database·domain 변경, product code mutation은 K1-K6 결정 전 수행하지 않는다.
ABANDON: live multi-PC collector, role session relay, 작업 dispatch, approval mutation과 account billing은 이 definition Stage 범위가 아니다.
ABANDON: C1, C2, H13, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 계속 open이다.

<!-- Internal trace vocabulary: tenant isolation; deletion/export. -->
