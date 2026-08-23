# Outcome Map

Contract status: DRAFT

```yaml
project_id: project-id
phases:
  - id: phase-1
    title: Phase 1
    purpose: Define the outcome this Phase must achieve.
    scopes:
      - id: scope-1
        title: Scope 1
        purpose: Define the bounded product result.
        included: []
        excluded: []
        stages:
          - id: stage-1
            title: Stage 1
            purpose: Define the verifiable execution boundary.
            depends_on: []
            gates_file: GATES_STAGE_1.md
```

Every Phase, Scope, and Stage requires a stable ID and purpose. Stage order and dependencies must be explicit rather than inferred from numbering or session messages.
