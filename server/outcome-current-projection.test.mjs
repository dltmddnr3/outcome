import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  CURRENT_PROJECTION_SOURCES,
  compileOutcomeCurrentProjection,
  outcomeCurrentProjectionInput,
  serializeOutcomeCurrentProjection,
} from './outcome-current-projection.mjs'

const root = new URL('../', import.meta.url)
const sourceBytes = () => Object.fromEntries(Object.entries(CURRENT_PROJECTION_SOURCES).map(([sourceClass, row]) => [sourceClass, readFileSync(new URL(row.source_ref, root))]))
const input = () => outcomeCurrentProjectionInput(sourceBytes())
const attempt = (state = 'delivery_unknown') => ({ id: 'attempt-one', work_id: 'work-canonical-package-candidate', fingerprint: 'canonical-package-promotion', state, automatic_retry_count: 0 })

test('B1-B2 current projection is deterministic and answers the canonical five questions', () => {
  const first = compileOutcomeCurrentProjection(input())
  const second = compileOutcomeCurrentProjection(input())
  assert.deepEqual(first, second)
  assert.equal(serializeOutcomeCurrentProjection(first), serializeOutcomeCurrentProjection(second))
  assert.equal(first.authority, 'projection_only')
  assert.deepEqual(first.current, {
    primary_destination: 'destination-model-v2-canonical-package',
    acceptance_gap: { remaining: 7, closed: 1, total: 8 },
    ready_frontier: ['milestone-b1'],
    active_work: null,
    next_action: 'work-canonical-package-candidate',
    cherry_action: null,
  })
  assert.deepEqual(first.state, { stale: false, conflict: false, delivery_unknown_count: 0 })
  assert.match(first.projection_digest, /^[a-f0-9]{64}$/)
  assert.equal(Object.isFrozen(first), true)
})

test('B2 source digest drift fails closed without retry or partial projection', () => {
  for (const sourceClass of Object.keys(CURRENT_PROJECTION_SOURCES)) {
    const hostile = input()
    hostile.source_bytes = { ...hostile.source_bytes, [sourceClass]: Buffer.concat([hostile.source_bytes[sourceClass], Buffer.from('drift')]) }
    assert.deepEqual(compileOutcomeCurrentProjection(hostile), {
      schema_version: 2,
      authority: 'projection_only',
      outcome: 'cold_compile_required',
      reason: 'source_digest_drift',
      automatic_retry_count: 0,
      safety: { duplicate_execution_count: 0, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 },
    })
  }
})

test('B2 stale conflict delivery-unknown and active-work states remain explicit and fail closed', () => {
  const stale = input(); stale.expected_source_revision = 'b'.repeat(40)
  const staleProjection = compileOutcomeCurrentProjection(stale)
  assert.equal(staleProjection.state.stale, true)
  assert.equal(staleProjection.state.conflict, true)
  assert.equal(staleProjection.current.next_action, null)
  assert.equal(staleProjection.current.cherry_action, 'resolve_source_revision')

  const conflict = input(); conflict.work_items = [...conflict.work_items, { ...conflict.work_items[0], id: 'work-conflict' }]
  const conflictProjection = compileOutcomeCurrentProjection(conflict)
  assert.equal(conflictProjection.state.conflict, true)
  assert.equal(conflictProjection.current.next_action, null)
  assert.equal(conflictProjection.current.cherry_action, 'resolve_blocker')
  assert.equal(conflictProjection.safety.duplicate_execution_count, 1)

  const unknown = input(); unknown.attempts = [attempt()]
  const unknownProjection = compileOutcomeCurrentProjection(unknown)
  assert.equal(unknownProjection.state.delivery_unknown_count, 1)
  assert.equal(unknownProjection.current.active_work, null)
  assert.equal(unknownProjection.safety.automatic_retry_count, 0)

  const active = input(); active.attempts = [attempt('started')]
  const activeProjection = compileOutcomeCurrentProjection(active)
  assert.deepEqual(activeProjection.current.active_work, { work_id: 'work-canonical-package-candidate', state: 'started' })
  assert.equal(activeProjection.current.next_action, null)
})

test('B2 hostile shapes Proxy and accessors are rejected before traps', () => {
  let traps = 0
  const proxied = new Proxy(input(), { get() { traps += 1 }, ownKeys() { traps += 1 }, getOwnPropertyDescriptor() { traps += 1 }, getPrototypeOf() { traps += 1 } })
  assert.throws(() => compileOutcomeCurrentProjection(proxied), /proxy_forbidden/)
  const accessor = input()
  Object.defineProperty(accessor.source_bytes, 'agents', { enumerable: true, get() { traps += 1; return Buffer.from('forged') } })
  assert.throws(() => compileOutcomeCurrentProjection(accessor), /accessor_forbidden/)
  assert.equal(traps, 0)
  assert.throws(() => compileOutcomeCurrentProjection({ ...input(), extra_authority: true }), /invalid_current_projection_input/)
})

test('B2 public serialization excludes private/runtime carriers and transition authority', () => {
  const serialized = serializeOutcomeCurrentProjection(compileOutcomeCurrentProjection(input()))
  for (const pattern of [/\/Users\//, /(?:thread|session|task|turn)[_-]?id/i, /credential|password|secret|token/i, /raw[_-]?(?:prompt|result)/i, /locator[_-]?ref/i, /provider[_-]?payload/i, /dispatch_authority|release_authority|canonical_transition_authority/i]) assert.doesNotMatch(serialized, pattern)
  assert.doesNotMatch(serialized, /source_ref/)
})

test('B3 explicit rollback returns exact v1-compatible local result', () => {
  const rollback = input(); rollback.mode = 'v1_rollback'
  assert.deepEqual(compileOutcomeCurrentProjection(rollback), {
    schema_version: 1,
    authority: 'v1_compatible',
    outcome: 'rollback_selected',
    original_value_required: true,
    persistent_state_changed: false,
    automatic_retry_count: 0,
  })
})
