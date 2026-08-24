# OUTCOME Phase 2 · Registered Package Portfolio Foundation Gates

Outcome: 세 번째 이후 프로젝트도 코드에 프로젝트 이름이나 로컬 경로를 추가하지 않고, 검증된 OUTCOME Package 등록만으로 같은 읽기 전용 포트폴리오와 결과 지도에서 안전하게 전환·조회할 수 있다.

- [ ] P1: 프로젝트 레지스트리는 명시적 schema와 Package root/Contract/Map 입력을 가지며 기존 Cherry Note와 OUTCOME 기본 등록을 동일한 경로로 표현한다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] P2: 누락·형식 오류·중복 프로젝트·허용되지 않은 문서 경로는 fail closed하며 조용한 기본값 대체나 프로젝트 identity 혼합이 없다.
  PROVES: test
  EVIDENCE: pending
- [ ] P3: 새 프로젝트의 Project·Phase·Scope·Stage 사용자 표시명과 목적은 Package source metadata에서 오며, 프로젝트별 코드 번역표 추가가 등록 조건이 아니다.
  PROVES: implementation
  EVIDENCE: pending
- [ ] P4: 세 프로젝트 이상 fixture에서 프로젝트 전환, 현재 위치, Phase→Scope→Stage→Gate 탐색, 모바일 progressive drill-down이 각 Package identity를 보존한다.
  PROVES: test
  EVIDENCE: pending
- [ ] P5: 로컬 레지스트리 경로와 source credential은 공개 snapshot/API/UI에 포함되지 않고, GET-only·mutation 405·completion authority false 경계를 유지한다.
  PROVES: security
  EVIDENCE: pending
- [ ] P6: exact candidate가 전체 회귀와 fresh affected UX & Product QA를 통과하고 고정 공개 주소에서 Git commit/tree/asset과 일치한다.
  PROVES: evidence
  EVIDENCE: pending

ABANDON: 실제 제3 프로젝트 등록은 그 프로젝트의 Contract·Map·Gates와 root authority가 제공된 뒤 별도 Gate로 수행한다.
ABANDON: 계정, 권한, durable database, 다중 PC/CLI collector, live session relay, dispatch, custom domain, release approval은 이 Stage 범위가 아니다.
ABANDON: C1, C2, H13, `MVP_SCOPE_CLOSED`, `EXTERNAL_OUTCOME_COMPLETE`는 계속 open이다.
