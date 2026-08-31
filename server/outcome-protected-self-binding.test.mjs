import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyRegistry, doctorRegistry, loadRegistry } from './outcome-session-registry-persistence.mjs'
import { runSessionControl } from './outcome-session-control.mjs'
import { createProtectedSelfBindingAdapter } from './outcome-protected-self-binding.mjs'

const setup = () => {
  const registryPath = join(mkdtempSync(join(tmpdir(), 'protected-self-binding-')), 'registry.json')
  createEmptyRegistry(registryPath, ['outcome'])
  runSessionControl({ registryPath, action: 'assign', projectId: 'outcome', role: 'ux_product_qa', expectedVersion: 0, publicAlias: 'qa-primary', actorClass: 'planner', reasonClass: 'fixture', privateInput: { locator: 'private-predecessor' } })
  return registryPath
}
const request = (registryPath, overrides = {}) => ({ registryPath, projectId: 'outcome', role: 'ux_product_qa', expectedVersion: 1, publicAlias: 'qa-successor', actorClass: 'planner', reasonClass: 'automatic_session_rotation', handoffSha256: 'a'.repeat(64), started: true, continuityReady: true, ...overrides })

const plannerSetup = () => {
  const registryPath = join(mkdtempSync(join(tmpdir(), 'protected-planner-binding-')), 'registry.json')
  createEmptyRegistry(registryPath, ['outcome'])
  runSessionControl({ registryPath, action: 'assign', projectId: 'outcome', role: 'planner', expectedVersion: 0, publicAlias: 'planner-primary', actorClass: 'planner', reasonClass: 'fixture', privateInput: { locator: 'private-predecessor' } })
  return registryPath
}
const plannerRequest = (registryPath, overrides = {}) => ({ ...request(registryPath), role: 'planner', publicAlias: 'planner-successor', ...overrides })

test('T3 protected Planner rotation derives required flags and replaces exactly once', () => {
  const registryPath = plannerSetup(); let controlCount = 0; let downstream
  const control = (input) => { controlCount += 1; downstream = input; return runSessionControl(input) }
  const adapter = createProtectedSelfBindingAdapter({ environment: { CODEX_THREAD_ID: 'private-successor' }, control })
  const result = adapter.replaceOnce(plannerRequest(registryPath))
  assert.equal(downstream.routingFreeze, true)
  assert.equal(downstream.handoffVerified, true)
  assert.equal(result.outcome, 'replaced')
  assert.equal(result.mutation_count, 1)
  assert.deepEqual(result.doctor, { ok: true, schema_version: 2, revision: 2, issues: [], lock_state: 'clear' })
  assert.equal(controlCount, 1)
  assert.equal(statSync(registryPath).mode & 0o777, 0o600)
  assert.deepEqual(adapter.replaceOnce(plannerRequest(registryPath, { expectedVersion: 2, publicAlias: 'planner-third' })), { outcome: 'safe_hold', reason: 'duplicate_invocation', mutation_count: 0, automatic_retry_count: 0 })
  assert.equal(controlCount, 1)
  const registry = loadRegistry(registryPath)
  assert.equal(registry.revision, 2)
  assert.equal(registry.bindings.find((row) => row.role === 'planner' && row.binding_version === 1).status, 'replaced')
  assert.equal(registry.bindings.find((row) => row.role === 'planner' && row.binding_version === 2).status, 'active')
  assert.equal(doctorRegistry(registryPath, ['outcome']).ok, true)
})

test('T3 invalid Planner requests fail before control without mutation', () => {
  const cases = [
    (path) => plannerRequest(path, { started: false }),
    (path) => plannerRequest(path, { continuityReady: false }),
    (path) => plannerRequest(path, { handoffSha256: 'bad' }),
    (path) => plannerRequest(path, { expectedVersion: 2 }),
    (path) => ({ ...plannerRequest(path), routingFreeze: true }),
    (path) => Object.defineProperty(plannerRequest(path), 'started', { get: () => true, enumerable: true }),
    (path) => new Proxy(plannerRequest(path), {}),
  ]
  for (const makeInput of cases) {
    const registryPath = plannerSetup(); let controlCount = 0
    const adapter = createProtectedSelfBindingAdapter({ environment: { CODEX_THREAD_ID: 'private-successor' }, control: () => { controlCount += 1 } })
    const result = adapter.replaceOnce(makeInput(registryPath))
    assert.equal(result.outcome, 'safe_hold')
    assert.equal(result.mutation_count, 0)
    assert.equal(controlCount, 0)
    assert.equal(loadRegistry(registryPath).revision, 1)
  }
})

test('T3 Builder QA and Audit replacement behavior is preserved', () => {
  for (const [role, publicAlias] of [['builder', 'builder-successor'], ['ux_product_qa', 'qa-successor'], ['release_audit', 'audit-successor']]) {
    const registryPath = join(mkdtempSync(join(tmpdir(), 'protected-role-binding-')), 'registry.json')
    createEmptyRegistry(registryPath, ['outcome'])
    runSessionControl({ registryPath, action: 'assign', projectId: 'outcome', role, expectedVersion: 0, publicAlias: `${publicAlias}-primary`, actorClass: 'planner', reasonClass: 'fixture', privateInput: { locator: 'private-predecessor' } })
    const result = createProtectedSelfBindingAdapter({ environment: { CODEX_THREAD_ID: 'private-successor' } }).replaceOnce({ ...request(registryPath), role, publicAlias })
    assert.equal(result.outcome, 'replaced')
    assert.equal(result.binding.role, role)
    assert.equal(result.mutation_count, 1)
  }
})

test('T3 protected runtime self context performs one CAS and returns only public-safe readback', () => {
  const registryPath = setup()
  const adapter = createProtectedSelfBindingAdapter({ environment: { CODEX_THREAD_ID: 'private-successor' } })
  const result = adapter.replaceOnce(request(registryPath))
  assert.equal(result.outcome, 'replaced')
  assert.deepEqual(result.binding, { project_id: 'outcome', role: 'ux_product_qa', public_alias: 'qa-successor', status: 'active', binding_version: 2, history_count: 2, has_predecessor: true })
  assert.deepEqual(result.predecessor, { binding_version: 1, status: 'replaced', archived: false })
  assert.equal(result.doctor.lock_state, 'clear')
  assert.equal(loadRegistry(registryPath).bindings.find((row) => row.role === 'ux_product_qa' && row.binding_version === 2).continuity_handoff_sha256, 'a'.repeat(64))
  assert.equal(JSON.stringify(result).includes('private-successor'), false)
  assert.deepEqual(adapter.replaceOnce(request(registryPath, { expectedVersion: 2, publicAlias: 'qa-third' })), { outcome: 'safe_hold', reason: 'duplicate_invocation', mutation_count: 0, automatic_retry_count: 0 })
})

test('T3 absent or malformed self context and version drift mutate nothing', () => {
  for (const [environment, overrides, reason] of [
    [{}, {}, 'self_context_unavailable'],
    [{ CODEX_THREAD_ID: 'bad\nlocator' }, {}, 'self_context_unavailable'],
    [{ CODEX_THREAD_ID: 'private-successor' }, { expectedVersion: 2 }, 'binding_version_conflict'],
    [{ CODEX_THREAD_ID: 'private-successor' }, { started: false }, 'continuity_unverified'],
  ]) {
    const registryPath = setup()
    const result = createProtectedSelfBindingAdapter({ environment }).replaceOnce(request(registryPath, overrides))
    assert.deepEqual(result, { outcome: 'safe_hold', reason, mutation_count: 0, automatic_retry_count: 0 })
  }
})

test('T3 unknown control outcome reconciles exact write once without retry', () => {
  const registryPath = setup()
  const control = (input) => { runSessionControl(input); throw new Error('response_lost') }
  const result = createProtectedSelfBindingAdapter({ environment: { CODEX_THREAD_ID: 'private-successor' }, control }).replaceOnce(request(registryPath))
  assert.equal(result.outcome, 'replaced')
  assert.equal(result.mutation_count, 1)
  assert.equal(result.automatic_retry_count, 0)
})
