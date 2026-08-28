import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyRegistry, loadRegistry } from './outcome-session-registry-persistence.mjs'
import { runSessionControl } from './outcome-session-control.mjs'
import { createProtectedSelfBindingAdapter } from './outcome-protected-self-binding.mjs'

const setup = () => {
  const registryPath = join(mkdtempSync(join(tmpdir(), 'protected-self-binding-')), 'registry.json')
  createEmptyRegistry(registryPath, ['outcome'])
  runSessionControl({ registryPath, action: 'assign', projectId: 'outcome', role: 'ux_product_qa', expectedVersion: 0, publicAlias: 'qa-primary', actorClass: 'planner', reasonClass: 'fixture', privateInput: { locator: 'private-predecessor' } })
  return registryPath
}
const request = (registryPath, overrides = {}) => ({ registryPath, projectId: 'outcome', role: 'ux_product_qa', expectedVersion: 1, publicAlias: 'qa-successor', actorClass: 'planner', reasonClass: 'automatic_session_rotation', handoffSha256: 'a'.repeat(64), started: true, continuityReady: true, ...overrides })

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
