# OUTCOME Sessions

schema_version: 2
project_id: <stable-project-id>
registry_mode: private_runtime
registry_ref: <non-secret registry alias>

## Role slots

```yaml
schema_version: 2
project_id: <stable-project-id>
roles:
  planner:
    required: true
    active_binding_ref: null
    binding_version: 0
    state: unbound
  builder:
    required: true
    active_binding_ref: null
    binding_version: 0
    state: unbound
  ux_product_qa:
    required: true
    active_binding_ref: null
    binding_version: 0
    state: unbound
  release_audit:
    required: true
    active_binding_ref: null
    binding_version: 0
    state: unbound
```

## Rules

- This file declares durable project-role slots and public-safe binding references. It never stores a raw provider session/thread/task identifier, credential, local path or prompt/result transcript.
- This optional operational companion does not replace the stable Contract/Map/Gates core. Its absence leaves that core valid and projects role tracking as `setup_required`.
- The private runtime registry owns exact locator resolution, observation cursor and append-only binding events.
- A role may have at most one active binding. Replacement increments `binding_version` and preserves the predecessor as history.
- Missing or unresolved binding is `unbound` or `setup_required`, never inferred from conversation memory.
- Session activity may populate NOW only. Package progress and completion remain Gate-evidence decisions.
