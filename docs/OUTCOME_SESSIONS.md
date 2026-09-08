# OUTCOME Sessions

schema_version: 3
project_id: outcome
registry_mode: private_runtime
registry_ref: outcome-local-private

## Execution ownership

```yaml
schema_version: 3
project_id: outcome
execution_mode: result_owned
owner_role: planner
stages: [implementation, qa_verification, release_verification, preview]
```

This declares the approved result-owned workflow, not a live assignment or completion. The existing Planner binding provides the single communication and work-owner observation; implementation, QA verification and Release verification are stages, not separate required sessions. Same-session checks are not independent QA/Audit. Historical role bindings remain in the private runtime registry and do not become current work merely by existing. Exact locators, observations and append-only events remain private; Cherry acceptance and external-action permissions remain separate.
