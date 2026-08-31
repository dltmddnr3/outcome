import assert from 'node:assert/strict'
import test from 'node:test'
import { compileOutcomeContextBootstrap, selectOutcomeBootstrapContext, validateOutcomeContextBootstrap } from './outcome-context-bootstrap.mjs'

const digest = (value) => value.repeat(64)
const input = () => ({
  source_digests: { agents: digest('a'), contract: digest('b'), map: digest('c'), gate: digest('d'), handoff: digest('e') },
  destination_version: 'model-v2-local-default-v1',
  projection: { primary_destination: 'destination-one', progress: { closed: 1, total: 4 }, ready_frontier: ['milestone-one'], next_action: 'work-one', cherry_action: null },
  active_work: { work_id: 'work-one', state: 'execution-started' },
  current_gate_ref: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md',
  current_handoff_ref: 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_CONTEXT_CANARY_BUILDER_HANDOFF.md',
})

test('A2 bootstrap is deterministic content addressed and contains only the selective projection', () => {
  const first = compileOutcomeContextBootstrap(input()); const second = compileOutcomeContextBootstrap(input())
  assert.deepEqual(first, second); assert.equal(first.snapshot_digest.length, 64); assert.equal(first.acceptance_gap.remaining, 3)
  assert.deepEqual(Object.keys(first).sort(), ['acceptance_gap','active_work','cherry_action','current_gate_ref','current_handoff_ref','destination_version','next_action','primary_destination','ready_frontier','schema_version','snapshot_digest','source_digests'].sort())
})

test('A2 source drift returns cold_compile_required without retry', () => {
  const snapshot = compileOutcomeContextBootstrap(input())
  assert.equal(validateOutcomeContextBootstrap(snapshot, snapshot.source_digests).outcome, 'ready')
  assert.deepEqual(validateOutcomeContextBootstrap(snapshot, { ...snapshot.source_digests, gate: digest('f') }), { outcome: 'cold_compile_required', reason: 'source_digest_drift', automatic_retry_count: 0 })
  assert.throws(() => validateOutcomeContextBootstrap({ ...snapshot, extra: true }, snapshot.source_digests), /invalid_bootstrap_shape/)
})

test('A2 default selection denies history correction raw conversation roadmap and unrelated skills', () => {
  const snapshot = compileOutcomeContextBootstrap(input())
  const selected = selectOutcomeBootstrapContext(snapshot, { role_skill: 'mango-implementation-engineer', expansions: [] })
  assert.equal(selected.expansion_count, 0)
  assert.deepEqual(selected.excluded_source_classes, ['historical_gate_families', 'correction_chains', 'raw_conversation', 'roadmap_2', 'unrelated_skills'])
  assert.equal(selected.loaded_sources.includes('docs/ROADMAP 2.md'), false)
  assert.equal(selected.loaded_sources.filter((source) => source.startsWith('skill:')).length, 3)
})

test('A2 on-demand expansion requires a machine-readable reason digest and work id', () => {
  const snapshot = compileOutcomeContextBootstrap(input())
  const expansion = { source_ref: 'docs/supporting-receipt.md', reason: 'predicate-evidence-required', source_digest: digest('f'), work_id: 'work-one' }
  const selected = selectOutcomeBootstrapContext(snapshot, { role_skill: 'mango-implementation-engineer', expansions: [expansion] })
  assert.deepEqual(selected.expansion_reasons, [{ reason: 'predicate-evidence-required', work_id: 'work-one' }])
  for (const invalid of [{ ...expansion, reason: '' }, { ...expansion, source_digest: 'bad' }, { ...expansion, source_ref: '../private' }]) assert.throws(() => selectOutcomeBootstrapContext(snapshot, { role_skill: 'mango-implementation-engineer', expansions: [invalid] }))
})

test('A2 hostile prototypes accessors and proxies fail before traps execute', () => {
  let traps = 0
  const proxy = new Proxy(input(), { get() { traps += 1 }, ownKeys() { traps += 1 } })
  assert.throws(() => compileOutcomeContextBootstrap(proxy), /proxy_forbidden/)
  const accessor = input(); Object.defineProperty(accessor, 'destination_version', { enumerable: true, get() { traps += 1; return 'unsafe' } })
  assert.throws(() => compileOutcomeContextBootstrap(accessor), /accessor_forbidden/)
  assert.throws(() => compileOutcomeContextBootstrap(Object.assign(Object.create(null), input())))
  assert.equal(traps, 0)
})
