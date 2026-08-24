# 포트폴리오 등록 검증용 Outcome Map

```yaml
schema_version: 1
project_id: portfolio-fixture
project_title: 포트폴리오 등록 검증용 묶음
project_purpose: 실제 세 번째 프로젝트가 아닌 등록·전환·위계 동일성 검증 전용 원본입니다.
phases:
  - id: fixture-phase
    title: 등록 검증 페이즈
    purpose: 코드별 번역 추가 없이 원본 제목과 목적을 표시합니다.
    scopes:
      - id: fixture-scope
        title: 전환 검증 범위
        purpose: 프로젝트 전환 뒤 같은 위계 구조가 유지되는지 확인합니다.
        stages:
          - id: fixture-stage
            title: 위계 동일성 검증 스테이지
            purpose: 데스크톱과 모바일에서 페이즈·범위·스테이지·완료 조건을 동일하게 탐색합니다.
            depends_on: []
            gates_file: GATES.md
            implementation_state: work_in_progress
            evidence_closure_state: pending
```

- Current: `fixture-stage`
