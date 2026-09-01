import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  CURRENT_PROJECTION_SOURCES,
  compileOutcomeCurrentProjection,
  outcomeCurrentProjectionInput,
  serializeOutcomeCurrentProjection,
} from './outcome-current-projection.mjs'

const root = new URL('../', import.meta.url)
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const sourceBytes = () => Object.fromEntries(Object.entries(CURRENT_PROJECTION_SOURCES).map(([sourceClass, row]) => [sourceClass, readFileSync(new URL(row.source_ref, root))]))
const input = () => outcomeCurrentProjectionInput(sourceBytes())
const attempt = (state = 'delivery_unknown') => ({ id: 'attempt-one', work_id: 'work-o1-selective-context-dogfood', fingerprint: input().work_items[0].fingerprint, state, automatic_retry_count: 0 })

test('O1 current projection is deterministic and terminal after evidence closure', () => {
  const first = compileOutcomeCurrentProjection(input())
  const second = compileOutcomeCurrentProjection(input())
  assert.deepEqual(first, second)
  assert.equal(serializeOutcomeCurrentProjection(first), serializeOutcomeCurrentProjection(second))
  assert.equal(first.authority, 'projection_only')
  assert.deepEqual(first.current, {
    primary_destination: 'destination-model-v2-canonical-package',
    acceptance_gap: { remaining: 0, closed: 8, total: 8 },
    ready_frontier: [],
    active_work: null,
    next_action: null,
    cherry_action: null,
  })
  assert.deepEqual(first.state, { stale: false, conflict: false, delivery_unknown_count: 0 })
  assert.match(first.projection_digest, /^[a-f0-9]{64}$/)
  assert.match(input().work_items[0].fingerprint, /^[a-f0-9]{64}$/)
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

test('O1 milestone mismatch stale conflict delivery-unknown and active-work states remain explicit and fail closed', () => {
  const mismatch = input(); mismatch.work_items = [{ ...mismatch.work_items[0], milestone_id: 'milestone-b1' }]
  const mismatchProjection = compileOutcomeCurrentProjection(mismatch)
  assert.deepEqual(mismatchProjection.current.ready_frontier, [])
  assert.equal(mismatchProjection.current.next_action, null)
  assert.equal(mismatchProjection.current.cherry_action, null)

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
  assert.equal(conflictProjection.current.cherry_action, null)
  assert.equal(conflictProjection.safety.duplicate_execution_count, 1)

  const unknown = input(); unknown.attempts = [attempt()]
  const unknownProjection = compileOutcomeCurrentProjection(unknown)
  assert.equal(unknownProjection.state.delivery_unknown_count, 1)
  assert.equal(unknownProjection.current.active_work, null)
  assert.equal(unknownProjection.safety.automatic_retry_count, 0)

  const active = input(); active.attempts = [attempt('started')]
  const activeProjection = compileOutcomeCurrentProjection(active)
  assert.deepEqual(activeProjection.current.active_work, { work_id: 'work-o1-selective-context-dogfood', state: 'started' })
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

test('O1 terminal canary fails closed without a second consumption or callback', () => {
  const run = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs', '--source-root', new URL('../', import.meta.url).pathname], { encoding: 'utf8' })
  assert.equal(run.status, 2)
  const result = JSON.parse(run.stdout)
  assert.equal(result.outcome, 'cold_compile_required')
  assert.equal(result.reason, 'o1_evidence_closed')
  assert.equal(Object.hasOwn(result, 'local_consumption_count'), false)
  assert.equal(Object.hasOwn(result, 'selective_context_receipt'), false)
  assert.equal(result.automatic_retry_count, 0)
  assert.equal(result.safety.duplicate_execution_count, 0)
  assert.equal(result.safety.false_completion_count, 0)
  const serialized = JSON.stringify(result)
  for (const pattern of [/\/Users\//, /(?:thread|session|task|turn)[_-]?id/i, /credential|password|secret|token/i, /raw[_-]?(?:prompt|result)/i, /source_ref|locator_ref|registry_payload/i]) assert.doesNotMatch(serialized, pattern)
})

test('O1 canary rejects snapshot whitespace drift and missing snapshot before consumption', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'outcome-o1-canary-'))
  try {
    cpSync(new URL('../', import.meta.url), fixture, { recursive: true })
    const snapshot = join(fixture, 'snapshot/outcome-model-v2-current.json')
    const snapshotBytes = readFileSync(snapshot)
    appendFileSync(snapshot, ' ')
    const driftRun = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs', '--source-root', fixture], { encoding: 'utf8' })
    assert.equal(driftRun.status, 2)
    const drift = JSON.parse(driftRun.stdout)
    assert.equal(drift.outcome, 'cold_compile_required'); assert.equal(drift.reason, 'source_digest_drift'); assert.equal(drift.automatic_retry_count, 0); assert.equal(drift.safety.duplicate_execution_count, 0); assert.equal(Object.hasOwn(drift, 'local_consumption_count'), false)
    writeFileSync(snapshot, snapshotBytes)
    unlinkSync(snapshot)
    const missingRun = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs', '--source-root', fixture], { encoding: 'utf8' })
    assert.equal(missingRun.status, 2)
    const missing = JSON.parse(missingRun.stdout)
    assert.equal(missing.outcome, 'cold_compile_required'); assert.equal(missing.reason, 'source_input_missing'); assert.equal(missing.automatic_retry_count, 0); assert.equal(Object.hasOwn(missing, 'local_consumption_count'), false)
    symlinkSync(join(fixture, 'AGENTS.md'), snapshot)
    const symlinkRun = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs', '--source-root', fixture], { encoding: 'utf8' })
    assert.equal(symlinkRun.status, 2)
    const symlink = JSON.parse(symlinkRun.stdout)
    assert.equal(symlink.outcome, 'cold_compile_required'); assert.equal(symlink.reason, 'source_input_invalid'); assert.equal(Object.hasOwn(symlink, 'local_consumption_count'), false)
    const extraRun = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs', '--source-root', fixture, '--extra'], { encoding: 'utf8' })
    assert.equal(extraRun.status, 2); assert.equal(JSON.parse(extraRun.stdout).reason, 'invalid_source_root')
  } finally { rmSync(fixture, { recursive: true, force: true }) }
})

test('O1 default canary binds one HEAD tree and ignores dirty Contract and Map overlays', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'outcome-o1-head-'))
  try {
    execFileSync('git', ['clone', '--quiet', '--no-checkout', new URL('../', import.meta.url).pathname, fixture])
    execFileSync('git', ['-C', fixture, 'checkout', '--quiet', '--detach', 'HEAD'])
    writeFileSync(join(fixture, 'scripts/outcome-model-v2-local-canary.mjs'), readFileSync(new URL('../scripts/outcome-model-v2-local-canary.mjs', import.meta.url)))
    writeFileSync(join(fixture, 'snapshot/outcome-model-v2-current.json'), readFileSync(new URL('../snapshot/outcome-model-v2-current.json', import.meta.url)))
    execFileSync('git', ['-C', fixture, 'add', 'snapshot/outcome-model-v2-current.json'])
    execFileSync('git', ['-C', fixture, '-c', 'user.name=OUTCOME Test', '-c', 'user.email=outcome-test.invalid', 'commit', '--quiet', '--allow-empty', '-m', 'Materialize terminal snapshot'])
    const contract = join(fixture, 'docs/OUTCOME_CONTRACT.md'); const map = join(fixture, 'docs/OUTCOME_MAP.md')
    appendFileSync(contract, '\nHEAD-bound hostile Contract overlay\n'); appendFileSync(map, '\nHEAD-bound hostile Map overlay\n')
    const before = { contract: sha256(readFileSync(contract)), map: sha256(readFileSync(map)), contractMode: statSync(contract).mode, mapMode: statSync(map).mode }
    const run = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs'], { cwd: fixture, encoding: 'utf8' })
    assert.equal(run.status, 2)
    const result = JSON.parse(run.stdout)
    const after = { contract: sha256(readFileSync(contract)), map: sha256(readFileSync(map)), contractMode: statSync(contract).mode, mapMode: statSync(map).mode }
    assert.deepEqual(after, before)
    assert.equal(result.outcome, 'cold_compile_required'); assert.equal(result.reason, 'o1_evidence_closed'); assert.equal(Object.hasOwn(result, 'local_consumption_count'), false); assert.equal(result.safety.duplicate_execution_count, 0)
  } finally { rmSync(fixture, { recursive: true, force: true }) }
})

test('O1 default canary fails closed when its repository has no resolvable HEAD', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'outcome-o1-no-head-'))
  try {
    cpSync(new URL('../', import.meta.url), fixture, { recursive: true })
    unlinkSync(join(fixture, '.git'))
    const run = spawnSync(process.execPath, ['scripts/outcome-model-v2-local-canary.mjs'], { cwd: fixture, encoding: 'utf8' })
    assert.equal(run.status, 2)
    const result = JSON.parse(run.stdout)
    assert.equal(result.outcome, 'cold_compile_required'); assert.equal(result.reason, 'canonical_source_unavailable'); assert.equal(result.automatic_retry_count, 0); assert.equal(Object.hasOwn(result, 'local_consumption_count'), false)
  } finally { rmSync(fixture, { recursive: true, force: true }) }
})
