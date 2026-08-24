# OUTCOME 포트폴리오 검증용 Outcome Map

```yaml
schema_version: 1
project_id: outcome
project_title: OUTCOME
project_purpose: 실제 진행 근거를 복제하지 않고 기존 프로젝트의 등록과 전환만 검증합니다.
phases:
  - id: fixture-outcome-phase
    title: 아웃컴 등록 검증 페이즈
    purpose: 외부 작업 폴더 없이 추적된 검증 자료만 읽습니다.
    scopes:
      - id: fixture-outcome-scope
        title: 아웃컴 전환 검증 범위
        purpose: 프로젝트 전환 뒤 아웃컴 식별자가 유지되는지 확인합니다.
        stages:
          - id: fixture-outcome-stage
            title: 아웃컴 위계 검증 스테이지
            purpose: 페이즈·범위·스테이지·완료 조건 탐색의 식별자 보존을 확인합니다.
            depends_on: []
            gates_file: GATES.md
            implementation_state: work_in_progress
            evidence_closure_state: pending
```

- Current: `fixture-outcome-stage`
