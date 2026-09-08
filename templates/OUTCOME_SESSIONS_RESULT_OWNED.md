# OUTCOME Sessions · One work owner

```yaml
schema_version: 3
project_id: <stable-project-id>
execution_mode: result_owned
owner_role: planner
stages: [implementation, qa_verification, release_verification, preview]
```

- One existing execution session owns the work through implementation, QA verification and Release verification. These stages are not separate required sessions.
- This companion declares topology only. It does not create a session, binding, project, Gate, execution permission or deployment.
- The private runtime registry resolves the actual owner. Missing or stale owner evidence remains unknown or unbound.
- Same-session verification is not independent QA/Audit. Explicit independent-evidence requirements remain unmet until separately satisfied or amended by the owner.
- Preview requires its existing explicit authority. Cherry alone accepts the result; stage position and session activity do not imply completion.
- Observer reads activity and evidence; the execution controller separately checks permission, dependencies and one-shot claims before any next action.
