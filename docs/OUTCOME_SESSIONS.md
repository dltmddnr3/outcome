# OUTCOME Sessions

schema_version: 2
project_id: outcome
registry_mode: private_runtime
registry_ref: outcome-local-private

## Role slots

```yaml
schema_version: 2
project_id: outcome
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

No role assignment is inferred by this manifest. Exact locators, observations, and append-only events belong only to the private runtime registry.
