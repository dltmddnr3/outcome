# Outcome Map

Contract status: DRAFT

```yaml
project_id: project-id
project_title: 사용자에게 표시할 프로젝트명
project_purpose: 사용자가 이해할 프로젝트 목적
phases:
  - id: phase-1
    title: 사용자에게 표시할 페이즈명
    purpose: 사용자가 이해할 페이즈 목적
    scopes:
      - id: scope-1
        title: 사용자에게 표시할 범위명
        purpose: 사용자가 이해할 범위 목적
        included: []
        excluded: []
        stages:
          - id: stage-1
            title: 사용자에게 표시할 스테이지명
            purpose: 사용자가 이해할 검증 가능 실행 목적
            depends_on: []
            gates_file: GATES_STAGE_1.md
```

Every Project, Phase, Scope, and Stage requires a stable ID plus user-facing `title` and `purpose` in the project's primary language. New project registration must render these source values without a project-specific code translation table. Stage order and dependencies must be explicit rather than inferred from numbering or session messages.
