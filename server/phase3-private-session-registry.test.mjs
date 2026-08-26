import assert from 'node:assert/strict'
import test from 'node:test'
import { createProjectRoleBindingRegistry } from './phase3-private-session-registry.mjs'

const clock = () => {
  let tick = 0
  return () => new Date(Date.UTC(2026, 7, 26, 0, 0, tick++)).toISOString()
}

const createRegistry = () => createProjectRoleBindingRegistry({ projectIds: ['outcome', 'cherry-note'], now: clock() })
const metadata = { actorClass: 'planner', reason: 'approved_synthetic_registry_test' }
const bind = (registry, overrides = {}) => registry.bind({
  projectId: 'outcome',
  role: 'builder',
  providerClass: 'codex',
  locatorRef: 'synthetic:builder_alpha',
  expectedVersion: 0,
  ...metadata,
  ...overrides,
})

test('bind creates one versioned active binding and a public-safe projection', () => {
  const registry = createRegistry()
  const result = bind(registry)
  assert.equal(result.ok, true)
  assert.equal(result.binding.binding_version, 1)
  assert.deepEqual(registry.publicProjection(), {
    bindings: [{ project_id: 'outcome', role: 'builder', provider_class: 'codex', status: 'active', binding_version: 1, history_count: 1 }],
  })
})

test('duplicate active bind and stale initial version fail without mutation', () => {
  const registry = createRegistry()
  assert.equal(bind(registry).ok, true)
  const before = registry.inspectState()
  assert.deepEqual(bind(registry), { ok: false, error: 'duplicate_active_binding' })
  assert.deepEqual(registry.inspectState(), before)

  const fresh = createRegistry()
  const freshBefore = fresh.inspectState()
  assert.deepEqual(bind(fresh, { expectedVersion: 1 }), { ok: false, error: 'stale_version' })
  assert.deepEqual(fresh.inspectState(), freshBefore)
})

test('rebind preserves replaced history and compare-and-swap rejects the losing writer', () => {
  const registry = createRegistry()
  const original = bind(registry).binding
  const replacement = registry.rebind({
    bindingId: original.binding_id,
    projectId: 'outcome',
    role: 'builder',
    locatorRef: 'synthetic:builder_bravo',
    expectedVersion: 1,
    providerClass: 'codex',
    ...metadata,
  })
  assert.equal(replacement.ok, true)
  assert.equal(replacement.binding.binding_version, 2)
  assert.equal(registry.inspectState().bindings.find((row) => row.binding_id === original.binding_id).status, 'replaced')
  const before = registry.inspectState()
  assert.deepEqual(registry.rebind({ bindingId: replacement.binding.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', locatorRef: 'synthetic:builder_charlie', expectedVersion: 1, ...metadata }), { ok: false, error: 'stale_version' })
  assert.deepEqual(registry.inspectState(), before)
  assert.equal(registry.publicProjection().bindings[0].history_count, 2)
})

test('cross-project replace and revoke fail closed', () => {
  const registry = createRegistry()
  const current = bind(registry).binding
  for (const action of ['rebind', 'revoke']) {
    const before = registry.inspectState()
    const result = registry[action]({
      bindingId: current.binding_id,
      projectId: 'cherry-note',
      role: 'builder',
      providerClass: 'codex',
      locatorRef: 'synthetic:builder_bravo',
      expectedVersion: 1,
      ...metadata,
    })
    assert.deepEqual(result, { ok: false, error: 'binding_scope_mismatch' })
    assert.deepEqual(registry.inspectState(), before)
  }
})

test('unsupported project role provider and actor fail without mutation', () => {
  const cases = [
    [{ projectId: 'missing' }, 'project_not_found'],
    [{ role: 'operator' }, 'unsupported_role'],
    [{ providerClass: 'other' }, 'unsupported_provider'],
    [{ actorClass: 'visitor' }, 'unsupported_actor'],
  ]
  for (const [override, error] of cases) {
    const registry = createRegistry()
    const before = registry.inspectState()
    assert.deepEqual(bind(registry, override), { ok: false, error })
    assert.deepEqual(registry.inspectState(), before)
  }
})

test('raw locator credential and absolute path shaped values are rejected', () => {
  const prohibited = [
    'session-12345678',
    'thread:12345678',
    'codex://threads/12345678',
    'token=secret-value',
    'sk_test_secret',
    '/Users/cherry/private',
    'C:\\Users\\cherry\\private',
  ]
  for (const locatorRef of prohibited) {
    const registry = createRegistry()
    const before = registry.inspectState()
    assert.deepEqual(bind(registry, { locatorRef }), { ok: false, error: 'invalid_locator' })
    assert.deepEqual(registry.inspectState(), before)
  }
})

test('audit reason rejects private identifier credential and path shaped values without mutation', () => {
  const prohibited = [
    'session 123e4567-e89b-12d3-a456-426614174000',
    'thread abcdefghijklmnop',
    'from /Users/cherry/private',
    'uses C:\\Users\\cherry\\private',
    'uses sk-proj-secretvalue',
    'credential_token',
  ]
  for (const reason of prohibited) {
    const registry = createRegistry()
    const before = registry.inspectState()
    assert.deepEqual(bind(registry, { reason }), { ok: false, error: 'invalid_reason' })
    assert.deepEqual(registry.inspectState(), before)
  }
})

test('re-entrant clock mutation fails closed and preserves one active binding per scope', () => {
  let registry
  let nestedResult
  let armed = true
  const now = () => {
    if (armed) {
      armed = false
      nestedResult = bind(registry, { locatorRef: 'synthetic:builder_nested' })
    }
    return '2026-08-26T00:00:00.000Z'
  }
  registry = createProjectRoleBindingRegistry({ projectIds: ['outcome', 'cherry-note'], now })
  const outerResult = bind(registry)
  assert.deepEqual(nestedResult, { ok: false, error: 'mutation_in_progress' })
  assert.equal(outerResult.ok, true)
  assert.equal(registry.inspectState().bindings.filter((row) => row.status === 'active').length, 1)
  assert.equal(registry.auditHistory().length, 1)
})

test('clock is materialized before commit and clock failure leaves state unchanged', () => {
  let secondCallCount = 0
  const oneShotClock = () => {
    secondCallCount += 1
    if (secondCallCount > 1) throw new Error('clock_failure')
    return '2026-08-26T00:00:00.000Z'
  }
  const oneShotRegistry = createProjectRoleBindingRegistry({ projectIds: ['outcome'], now: oneShotClock })
  assert.equal(bind(oneShotRegistry).ok, true)
  assert.equal(secondCallCount, 1)
  assert.equal(oneShotRegistry.inspectState().bindings.length, 1)
  assert.equal(oneShotRegistry.auditHistory().length, 1)

  const failedRegistry = createProjectRoleBindingRegistry({ projectIds: ['outcome'], now: () => { throw new Error('clock_failure') } })
  const before = failedRegistry.inspectState()
  assert.deepEqual(bind(failedRegistry), { ok: false, error: 'clock_unavailable' })
  assert.deepEqual(failedRegistry.inspectState(), before)
})

test('revoked and replaced bindings cannot be reused', () => {
  const replacedRegistry = createRegistry()
  const first = bind(replacedRegistry).binding
  assert.equal(replacedRegistry.rebind({ bindingId: first.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', locatorRef: 'synthetic:builder_bravo', expectedVersion: 1, ...metadata }).ok, true)
  const replacedBefore = replacedRegistry.inspectState()
  assert.deepEqual(replacedRegistry.revoke({ bindingId: first.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', expectedVersion: 1, ...metadata }), { ok: false, error: 'binding_not_active' })
  assert.deepEqual(replacedRegistry.inspectState(), replacedBefore)

  const revokedRegistry = createRegistry()
  const active = bind(revokedRegistry).binding
  assert.equal(revokedRegistry.revoke({ bindingId: active.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', expectedVersion: 1, ...metadata }).ok, true)
  const revokedBefore = revokedRegistry.inspectState()
  assert.deepEqual(revokedRegistry.rebind({ bindingId: active.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', locatorRef: 'synthetic:builder_bravo', expectedVersion: 1, ...metadata }), { ok: false, error: 'binding_not_active' })
  assert.deepEqual(bind(revokedRegistry, { locatorRef: 'synthetic:builder_charlie' }), { ok: false, error: 'inactive_binding_reuse' })
  assert.deepEqual(revokedRegistry.inspectState(), revokedBefore)
})

test('disable requires registry CAS, blocks writes and preserves projection and audit history', () => {
  const registry = createRegistry()
  bind(registry)
  const beforeStale = registry.inspectState()
  assert.deepEqual(registry.disable({ expectedRevision: 0, ...metadata }), { ok: false, error: 'stale_version' })
  assert.deepEqual(registry.inspectState(), beforeStale)

  assert.deepEqual(registry.disable({ expectedRevision: 1, ...metadata }), { ok: true, revision: 2, enabled: false })
  const projection = registry.publicProjection()
  const audit = registry.auditHistory()
  assert.deepEqual(projection.bindings[0], { project_id: 'outcome', role: 'builder', provider_class: 'codex', status: 'disabled', binding_version: 1, history_count: 1 })
  assert.deepEqual(audit.map((entry) => entry.action), ['bind', 'disable'])
  const disabledState = registry.inspectState()
  assert.deepEqual(bind(registry, { role: 'planner', locatorRef: 'synthetic:planner_alpha' }), { ok: false, error: 'registry_disabled' })
  assert.deepEqual(registry.inspectState(), disabledState)
})

test('audit is append-only and contains the required public-safe mutation facts', () => {
  const registry = createRegistry()
  const original = bind(registry).binding
  const replacement = registry.rebind({ bindingId: original.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', locatorRef: 'synthetic:builder_bravo', expectedVersion: 1, ...metadata }).binding
  registry.revoke({ bindingId: replacement.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', expectedVersion: 2, ...metadata })
  assert.deepEqual(registry.auditHistory().map(({ action, project_id, role, before_version, after_version, actor_class }) => ({ action, project_id, role, before_version, after_version, actor_class })), [
    { action: 'bind', project_id: 'outcome', role: 'builder', before_version: 0, after_version: 1, actor_class: 'planner' },
    { action: 'rebind', project_id: 'outcome', role: 'builder', before_version: 1, after_version: 2, actor_class: 'planner' },
    { action: 'revoke', project_id: 'outcome', role: 'builder', before_version: 2, after_version: 2, actor_class: 'planner' },
  ])
})

test('public projection and serialized audit exclude private keys and values', () => {
  const registry = createRegistry()
  const first = bind(registry).binding
  registry.rebind({ bindingId: first.binding_id, projectId: 'outcome', role: 'builder', providerClass: 'codex', locatorRef: 'synthetic:builder_bravo', expectedVersion: 1, ...metadata })
  const serialized = JSON.stringify({ projection: registry.publicProjection(), audit: registry.auditHistory() })
  for (const prohibited of ['binding_id', 'locator_ref', 'synthetic:builder_alpha', 'synthetic:builder_bravo', 'bound_at', 'revoked_at', 'replaced_by']) {
    assert.equal(serialized.includes(prohibited), false, prohibited)
  }
})

test('invalid constructors fail closed', () => {
  assert.throws(() => createProjectRoleBindingRegistry(), /invalid_project_registry/)
  assert.throws(() => createProjectRoleBindingRegistry({ projectIds: ['outcome', 'outcome'] }), /duplicate_project/)
  assert.throws(() => createProjectRoleBindingRegistry({ projectIds: ['Invalid'] }), /invalid_project_registry/)
})
