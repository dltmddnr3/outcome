import assert from 'node:assert/strict'
import test from 'node:test'
import { compileCurrentGateFrontier, compileOutcomeContextBootstrap, selectOutcomeBootstrapContext, validateOutcomeContextBootstrap, validateOutcomeSourceManifest } from './outcome-context-bootstrap.mjs'

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
  const expansion = { source_ref: 'docs/OUTCOME_CONTRACT.md', reason: 'predicate-evidence-required', source_digest: digest('f'), work_id: 'work-one' }
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

test('Q1 F1 semantic deny classes fail closed instead of contradicting exclusions', () => {
  const snapshot = compileOutcomeContextBootstrap(input())
  assert.throws(() => compileOutcomeContextBootstrap({ ...input(), current_gate_ref: 'GATES_PHASE3_HISTORICAL.md' }), /non_current_gate_forbidden/)
  assert.throws(() => selectOutcomeBootstrapContext(snapshot, { role_skill: 'lime-release-auditor', expansions: [] }), /unrelated_skill_forbidden/)
  assert.throws(() => selectOutcomeBootstrapContext(snapshot, { role_skill: 'mango-implementation-engineer', expansions: [{ source_ref: 'docs/raw-conversation.md', reason: 'predicate-evidence-required', source_digest: digest('f'), work_id: 'work-one' }] }), /expansion_source_forbidden/)
})

test('Q1 F1 private identifier classes fail in every projectable identifier field', () => {
  const variants = [
    { ...input(), destination_version: 'thread-id' },
    { ...input(), projection: { ...input().projection, primary_destination: 'thread-id' } },
    { ...input(), projection: { ...input().projection, ready_frontier: ['thread-id'] } },
    { ...input(), projection: { ...input().projection, next_action: 'thread-id' } },
    { ...input(), projection: { ...input().projection, cherry_action: 'thread-id' } },
    { ...input(), active_work: { work_id: 'thread-id', state: 'execution-started' } },
    { ...input(), active_work: { work_id: 'work-one', state: 'thread-id' } },
    { ...input(), source_digests: { 'thread-id': digest('a') } },
    { ...input(), projection: { ...input().projection, primary_destination: '123e4567-e89b-42d3-a456-426614174000' } },
    { ...input(), projection: { ...input().projection, next_action: digest('a') } },
  ]
  for (const value of variants) assert.throws(() => compileOutcomeContextBootstrap(value))
})

test('Q1 F2 pinned source Gate and evidence drift require cold compile with no retry', () => {
  const expected = { agents: digest('a'), contract: digest('b'), map: digest('c'), 'slice-contract': digest('d'), gate: digest('e'), handoff: digest('f'), 'manifest-handoff': digest('1'), 'qa-receipt': digest('2'), 'reqa-receipt': digest('3') }
  assert.deepEqual(validateOutcomeSourceManifest(expected, expected), { outcome: 'ready', automatic_retry_count: 0 })
  for (const key of Object.keys(expected)) assert.deepEqual(validateOutcomeSourceManifest({ ...expected, [key]: digest('9') }, expected), { outcome: 'cold_compile_required', reason: 'source_digest_drift', automatic_retry_count: 0 })
})

test('Q1 F2 complete current Gate keeps Q1 ready until independent QA evidence passes', () => {
  const ids = ['D1', 'D2', 'A1', 'A2', 'A3', 'A4', 'Q1', 'B1', 'B2', 'B3', 'Q2', 'A5', 'C1']
  const gate = ids.map((id, index) => `- [${index < 7 ? 'x' : ' '}] ${id}: Predicate ${id}`).join('\n')
  const failed = compileCurrentGateFrontier(gate, 'Status: `NEEDS_REVISION_UX_PRODUCT_QA`')
  assert.equal(failed.length, 13); assert.equal(failed.find((row) => row.id === 'Q1').closed, false); assert.deepEqual(failed.find((row) => row.id === 'B1').depends_on, ['Q1'])
  const passed = compileCurrentGateFrontier(gate, 'Status: `PASS_INDEPENDENT_UX_PRODUCT_QA_ONLY`')
  assert.equal(passed.find((row) => row.id === 'Q1').closed, true)
})
