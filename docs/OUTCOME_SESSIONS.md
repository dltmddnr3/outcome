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
    active_binding_ref: planner-primary
    binding_version: 2
    state: active
  builder:
    required: true
    active_binding_ref: builder-primary
    binding_version: 2
    state: idle
  ux_product_qa:
    required: true
    active_binding_ref: ux-qa-primary
    binding_version: 2
    state: idle
  release_audit:
    required: true
    active_binding_ref: release-audit-primary
    binding_version: 2
    state: idle
```

No role assignment is inferred by this manifest. Exact locators, observations, and append-only events belong only to the private runtime registry.
