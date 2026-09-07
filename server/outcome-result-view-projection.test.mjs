import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { outcomeSnapshotId, projectOutcomeResultView } from './outcome-result-view-projection.mjs'

const stage = (id, sourceRef, gates) => ({ id, title: id, purpose: `${id} result`, gate: { available: Boolean(sourceRef), sourceRef, gates, total: gates.length, closed: gates.filter((gate) => gate.closed).length } })
const project = {
  project: { id: 'outcome', name: 'OUTCOME', outcome: 'usable result' },
  phases: [{ id: 'phase-one', title: 'Phase one', purpose: 'phase result', scopes: [{ id: 'scope-one', title: 'Scope one', purpose: 'scope result', stages: [
    stage('stage-one', 'GATES.md', [{ id: 'G1', closed: true }, { id: 'G2', closed: false }]),
    stage('stage-two', 'GATES.md', [{ id: 'G2', closed: false }, { id: 'G3', closed: true }]),
    stage('stage-unmapped', null, []),
  ] }] }],
}
const base = {
  schema_version: 1,
  project_id: 'outcome',
  observed_at: '2026-09-07T03:00:00.000Z',
  calendar: { plan_started_at: '2026-09-04T07:55:25+09:00', planned_finish_at: '2026-09-18T07:55:25+09:00', source_ref: 'docs/MVP_14_DAY_EXECUTION_PLAN.md' },
  nodes: {}, snapshots: [],
  links: { source: '#result-node-outcome', usable_result: '#result-node-stage-one', planner_conversation: 'planner' },
  completion_authority: false,
}
const cutoff = { observedAtCutoff: '2026-09-07T06:00:00.000Z' }
const sourceRefs = ['docs/MVP_14_DAY_EXECUTION_PLAN.md', 'docs/WORK.md', 'docs/FORECAST.md', 'evidence/snapshot-before.json', 'evidence/snapshot-current.json', 'evidence/snapshot-old.json', 'evidence/node-local.json', 'evidence/snapshot.json']
const resultView = (sourceProject, tracking, options = cutoff, refs = sourceRefs) => projectOutcomeResultView(sourceProject, tracking, options, refs)
const denominator = (unitIds) => createHash('sha256').update(JSON.stringify(unitIds)).digest('hex')

test('deduplicates acceptance identities and unions descendant denominators', () => {
  const view = resultView(project, base)
  assert.equal(view.hierarchy.acceptance.total, 3)
  assert.equal(view.hierarchy.acceptance.closed, 2)
  assert.equal(view.hierarchy.acceptance.unmapped, 1)
  assert.equal(view.hierarchy.acceptance.partial, true)
  assert.equal(view.hierarchy.acceptance.label, '부분 분모 · 전체 완료율 아님')
  assert.deepEqual(view.hierarchy.acceptance.unit_ids, ['GATES.md#G1', 'GATES.md#G2', 'GATES.md#G3'])
  assert.deepEqual(view.hierarchy.children.map((node) => node.id), ['phase-one'])
  assert.deepEqual(view.hierarchy.children[0].children.map((node) => node.id), ['scope-one'])
  assert.deepEqual(view.hierarchy.children[0].children[0].children.map((node) => node.id), ['stage-one', 'stage-two', 'stage-unmapped'])
  assert.equal(view.completion_authority, false)
})

test('known 100 percent plus an unmapped descendant stays partial and non-authoritative', () => {
  const closedProject = structuredClone(project)
  for (const item of closedProject.phases[0].scopes[0].stages) for (const gate of item.gate.gates) gate.closed = true
  const view = resultView(closedProject, base)
  assert.equal(view.hierarchy.acceptance.closed, view.hierarchy.acceptance.total)
  assert.equal(view.hierarchy.acceptance.partial, true)
  assert.equal(view.hierarchy.acceptance.label.includes('전체 완료율 아님'), true)
  assert.equal(view.hierarchy.acceptance.completion_authority, false)
})

test('empty structural nodes stay unknown partial and propagate unmapped coverage', () => {
  const emptyProject = {
    project: { id: 'outcome', name: 'OUTCOME', outcome: 'usable result' },
    phases: [
      { id: 'phase-no-scopes', title: 'No scopes', purpose: 'unknown phase result', scopes: [] },
      { id: 'phase-empty-scope', title: 'Empty scope phase', purpose: 'unknown phase result', scopes: [{ id: 'scope-no-stages', title: 'No stages', purpose: 'unknown scope result', stages: [] }] },
    ],
  }
  const view = resultView(emptyProject, base)
  const [noScopes, emptyScopePhase] = view.hierarchy.children
  const emptyScope = emptyScopePhase.children[0]
  for (const node of [noScopes, emptyScopePhase, emptyScope]) {
    assert.equal(node.acceptance.total, 0)
    assert.equal(node.acceptance.unmapped, 1)
    assert.equal(node.acceptance.partial, true)
    assert.equal(node.acceptance.label, '완료 조건 미연결 · 전체 완료율 아님')
    assert.equal(node.acceptance.completion_authority, false)
  }
  assert.equal(view.hierarchy.acceptance.unmapped, 2)
  assert.equal(view.hierarchy.acceptance.label, '완료 조건 미연결 · 전체 완료율 아님')
})

test('keeps unsourced work facts unknown and preserves only sourced calendar dates', () => {
  const view = resultView(project, base)
  assert.equal(view.hierarchy.work.initial_hours, null)
  assert.equal(view.hierarchy.work.actual_hours, null)
  assert.equal(view.hierarchy.work.remaining_hours, null)
  assert.equal(view.hierarchy.work.latest_forecast, null)
  assert.equal(view.hierarchy.work.planned_finish_at, base.calendar.planned_finish_at)
  assert.equal(view.hierarchy.work.provenance.planned_finish_at.source_ref, base.calendar.source_ref)
})

test('aggregates time ranges only when every direct child has the same provenance', () => {
  const proof = { source_ref: 'docs/WORK.md', observed_at: base.observed_at }
  const all = Object.fromEntries(['stage-one', 'stage-two', 'stage-unmapped'].map((id) => [id, { initial_hours: [1, 2], actual_hours: [0.5, 1], remaining_hours: [1, 3], latest_forecast: { earliest_at: '2026-09-10T00:00:00Z', latest_at: '2026-09-11T00:00:00Z' }, ...proof }]))
  const complete = resultView(project, { ...base, nodes: all })
  const scope = complete.hierarchy.children[0].children[0]
  assert.deepEqual(scope.work.initial_hours, [3, 6]); assert.deepEqual(scope.work.actual_hours, [1.5, 3]); assert.deepEqual(scope.work.remaining_hours, [3, 9])
  assert.deepEqual(scope.work.latest_forecast, { earliest_at: '2026-09-10T00:00:00.000Z', latest_at: '2026-09-11T00:00:00.000Z' })
  const incompleteNodes = structuredClone(all); incompleteNodes['stage-unmapped'].actual_hours = null
  const incomplete = resultView(project, { ...base, nodes: incompleteNodes })
  assert.equal(incomplete.hierarchy.children[0].children[0].work.actual_hours, null)
})

test('runtime activity fields cannot change acceptance or recorded actual work', () => {
  const first = resultView({ ...project, now: { activity: 'one message' } }, base)
  const second = resultView({ ...project, now: { activity: 'many commits and tests', boundAt: '2020-01-01T00:00:00Z' } }, base)
  assert.deepEqual(second.hierarchy.acceptance, first.hierarchy.acceptance)
  assert.equal(first.hierarchy.work.actual_hours, null); assert.equal(second.hierarchy.work.actual_hours, null)
})

test('keeps planned finish separate from a sourced latest forecast', () => {
  const tracked = { ...base, nodes: { outcome: { latest_forecast: { earliest_at: '2026-09-20T00:00:00Z', latest_at: '2026-09-22T00:00:00Z' }, source_ref: 'docs/FORECAST.md', observed_at: base.observed_at } } }
  const view = resultView(project, tracked)
  assert.equal(view.hierarchy.work.planned_finish_at, base.calendar.planned_finish_at)
  assert.deepEqual(view.hierarchy.work.latest_forecast, tracked.nodes.outcome.latest_forecast)
  assert.equal(view.hierarchy.work.provenance.planned_finish_at.source_ref, base.calendar.source_ref)
  assert.equal(view.hierarchy.work.provenance.latest_forecast.source_ref, 'docs/FORECAST.md')
})

test('computes dated delta only across the same denominator', () => {
  const denominator = resultView(project, base).hierarchy.acceptance.denominator_sha256
  const snapshots = [
    { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot-before.json', denominator_sha256: denominator, nodes: { outcome: { closed: 1, total: 3, unmapped: 1, denominator_sha256: denominator, unit_ids: ['GATES.md#G1', 'GATES.md#G2', 'GATES.md#G3'] } } },
    { observed_at: '2026-09-07T03:00:00.000Z', source_ref: 'evidence/snapshot-current.json', denominator_sha256: denominator, nodes: { outcome: { closed: 2, total: 3, unmapped: 1, denominator_sha256: denominator, unit_ids: ['GATES.md#G1', 'GATES.md#G2', 'GATES.md#G3'] } } },
  ].map((snapshot) => ({ snapshot_id: outcomeSnapshotId(snapshot), ...snapshot }))
  const view = resultView(project, { ...base, snapshots })
  assert.equal(view.hierarchy.comparison.yesterday.closed, 1)
  assert.equal(view.hierarchy.comparison.current.closed, 2)
  assert.equal(view.hierarchy.comparison.today_delta, 1)
})

test('fails closed on denominator drift and emits a dated scope change', () => {
  const oldUnitIds = ['GATES.md#G1', 'GATES.md#G2']
  const oldDenominator = denominator(oldUnitIds)
  const source = { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot-old.json', denominator_sha256: oldDenominator, nodes: { outcome: { closed: 1, total: 2, unmapped: 0, denominator_sha256: oldDenominator, unit_ids: oldUnitIds } } }
  const snapshots = [{ snapshot_id: outcomeSnapshotId(source), ...source }]
  const view = resultView(project, { ...base, snapshots })
  assert.equal(view.hierarchy.comparison.today_delta, null)
  assert.equal(view.hierarchy.comparison.message, '완료 조건 범위 변경 · 같은 분모로 비교 불가')
  assert.equal(view.hierarchy.timeline.at(-1).type, 'scope_change')
  assert.deepEqual(view.hierarchy.timeline.at(-1).old_unit_ids, ['GATES.md#G1', 'GATES.md#G2'])
  assert.deepEqual(view.hierarchy.timeline.at(-1).new_unit_ids, ['GATES.md#G1', 'GATES.md#G2', 'GATES.md#G3'])
})

test('rejects snapshot rows whose total identities and denominator are not mutually canonical', () => {
  const current = resultView(project, base).hierarchy.acceptance
  const forgedIds = [...current.unit_ids]
  forgedIds[0] = 'GATES.md#FORGED'
  const rows = [
    { closed: 1, total: forgedIds.length, unmapped: 1, denominator_sha256: current.denominator_sha256, unit_ids: forgedIds },
    { closed: 1, total: current.unit_ids.length + 1, unmapped: 1, denominator_sha256: current.denominator_sha256, unit_ids: current.unit_ids },
    { closed: 1, total: current.unit_ids.length, unmapped: 1, denominator_sha256: current.denominator_sha256, unit_ids: [...current.unit_ids].reverse() },
    { closed: 1, total: current.unit_ids.length + 1, unmapped: 1, denominator_sha256: denominator([...current.unit_ids, current.unit_ids[0]].sort()), unit_ids: [...current.unit_ids, current.unit_ids[0]].sort() },
  ]
  for (const row of rows) {
    const body = { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot.json', denominator_sha256: row.denominator_sha256, nodes: { outcome: row } }
    assert.throws(() => resultView(project, { ...base, snapshots: [{ snapshot_id: outcomeSnapshotId(body), ...body }] }), /work_tracking_invalid/)
  }
})

test('rejects private locator-like snapshot unit identities before scope-change projection', () => {
  for (const unitId of ['/Users/private/task/thread-123', 'GATES.md#thread-123', 'GATES.md#session-456', 'GATES.md#550e8400-e29b-41d4-a716-446655440000', 'GATES.md#token=secret']) {
    const unitIds = [unitId]
    const row = { closed: 0, total: 1, unmapped: 0, denominator_sha256: denominator(unitIds), unit_ids: unitIds }
    const body = { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot.json', denominator_sha256: row.denominator_sha256, nodes: { outcome: row } }
    assert.throws(() => resultView(project, { ...base, snapshots: [{ snapshot_id: outcomeSnapshotId(body), ...body }] }), /work_tracking_invalid/)
  }
})

test('rejects all seven credential and camelCase locator unit identities before projection', () => {
  const identities = ['GATES.md#token-secret', 'GATES.md#secret', 'GATES.md#password', 'GATES.md#authorization', 'GATES.md#api-key', 'GATES.md#sessionId123', 'GATES.md#taskId123']
  let callbacks = 0
  for (const unitId of identities) {
    const unitIds = [unitId]
    const row = { closed: 0, total: 1, unmapped: 0, denominator_sha256: denominator(unitIds), unit_ids: unitIds }
    const body = { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot.json', denominator_sha256: row.denominator_sha256, nodes: { outcome: row } }
    const tracking = { ...base, snapshots: [{ snapshot_id: outcomeSnapshotId(body), ...body }] }
    assert.throws(() => resultView(project, tracking), /work_tracking_invalid/, unitId)
    assert.equal(JSON.stringify({ rejected: true }).includes(unitId), false, unitId)
  }
  const accessor = structuredClone(base)
  Object.defineProperty(accessor.snapshots, '0', { enumerable: true, get() { callbacks += 1; return null } })
  accessor.snapshots.length = 1
  assert.throws(() => resultView(project, accessor), /work_tracking_invalid/)
  assert.equal(callbacks, 0)
})

test('rejects accessor and Proxy snapshot unit identities without executing caller code', () => {
  const row = { closed: 0, total: 1, unmapped: 0, denominator_sha256: denominator(['GATES.md#G1']), unit_ids: ['GATES.md#G1'] }
  const body = { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot.json', denominator_sha256: row.denominator_sha256, nodes: { outcome: row } }
  const snapshot = { snapshot_id: outcomeSnapshotId(body), ...body }
  let reads = 0
  const accessorSnapshot = structuredClone(snapshot)
  Object.defineProperty(accessorSnapshot.nodes.outcome.unit_ids, '0', { enumerable: true, get() { reads += 1; return 'GATES.md#G1' } })
  assert.throws(() => resultView(project, { ...base, snapshots: [accessorSnapshot] }), /work_tracking_invalid/)
  assert.equal(reads, 0)
  let traps = 0
  const proxySnapshot = structuredClone(snapshot)
  proxySnapshot.nodes.outcome.unit_ids = new Proxy(proxySnapshot.nodes.outcome.unit_ids, { get() { traps += 1; return undefined }, ownKeys() { traps += 1; return [] } })
  assert.throws(() => resultView(project, { ...base, snapshots: [proxySnapshot] }), /work_tracking_invalid/)
  assert.equal(traps, 0)
})

test('rejects fabricated, malformed, private, and authority-bearing tracking inputs', () => {
  for (const invalid of [
    { ...base, completion_authority: true },
    { ...base, project_id: 'other' },
    { ...base, observed_at: 'not-a-time' },
    { ...base, nodes: { outcome: { actual_hours: [1, 1] } } },
    { ...base, nodes: { outcome: { weight: 2 } } },
    { ...base, calendar: { ...base.calendar, source_ref: '/Users/private/file' } },
  ]) assert.throws(() => resultView(project, invalid), /work_tracking_invalid/)
})

test('rejects accessors and cycles without executing a getter', () => {
  let reads = 0
  const accessor = { ...base, nodes: {} }
  Object.defineProperty(accessor.nodes, 'outcome', { enumerable: true, get() { reads += 1; return {} } })
  assert.throws(() => resultView(project, accessor), /work_tracking_invalid/)
  assert.equal(reads, 0)
  const cyclic = { ...base, nodes: {} }; cyclic.nodes.outcome = cyclic
  assert.throws(() => resultView(project, cyclic), /work_tracking_invalid/)
  let traps = 0
  const proxy = new Proxy(base, { get() { traps += 1; return undefined }, ownKeys() { traps += 1; return [] } })
  assert.throws(() => resultView(project, proxy), /work_tracking_invalid/)
  assert.equal(traps, 0)
})

test('unsafe optional links become disconnected without leaking their value', () => {
  const view = resultView(project, { ...base, links: { ...base.links, usable_result: 'https://example.com/private' } })
  assert.deepEqual(view.links.usable_result, { href: null, action: null, label: '링크 미연결' })
  assert.equal(JSON.stringify(view).includes('example.com'), false)
})

test('keeps delta node-local when only a sibling denominator changes', () => {
  const current = resultView(project, base)
  const scope = current.hierarchy.children[0].children[0]
  const [stableNode, changedNode] = scope.children
  const snapshotSource = {
    observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/node-local.json', denominator_sha256: 'b'.repeat(64),
    nodes: {
      [stableNode.id]: { closed: 0, total: stableNode.acceptance.total, unmapped: 0, denominator_sha256: stableNode.acceptance.denominator_sha256, unit_ids: stableNode.acceptance.unit_ids },
      [changedNode.id]: { closed: 0, total: 1, unmapped: 0, denominator_sha256: denominator(['GATES.md#OLD']), unit_ids: ['GATES.md#OLD'] },
    },
  }
  const snapshot = { snapshot_id: outcomeSnapshotId(snapshotSource), ...snapshotSource }
  const view = resultView(project, { ...base, snapshots: [snapshot] })
  const [stable, changed] = view.hierarchy.children[0].children[0].children
  assert.equal(stable.comparison.today_delta, 1)
  assert.equal(stable.timeline.some((event) => event.type === 'scope_change'), false)
  assert.equal(changed.comparison.today_delta, null)
  assert.equal(changed.timeline.at(-1).type, 'scope_change')
})

test('rejects future unprovenanced duplicate and identity-conflicting snapshots', () => {
  const denominator = resultView(project, base).hierarchy.acceptance.denominator_sha256
  const body = { observed_at: '2026-09-06T12:00:00.000Z', source_ref: 'evidence/snapshot.json', denominator_sha256: denominator, nodes: { outcome: { closed: 1, total: 3, unmapped: 1, denominator_sha256: denominator, unit_ids: ['GATES.md#G1', 'GATES.md#G2', 'GATES.md#G3'] } } }
  const snapshot = { snapshot_id: outcomeSnapshotId(body), ...body }
  const futureBody = { ...body, observed_at: '2026-09-08T00:00:00.000Z' }
  const missingProof = { ...body }; delete missingProof.source_ref
  const conflict = { ...snapshot, nodes: { outcome: { ...snapshot.nodes.outcome, closed: 2 } } }
  for (const snapshots of [[{ snapshot_id: outcomeSnapshotId(futureBody), ...futureBody }], [{ snapshot_id: outcomeSnapshotId(missingProof), ...missingProof }], [snapshot, snapshot], [conflict]]) {
    assert.throws(() => resultView(project, { ...base, snapshots }), /work_tracking_invalid/)
  }
})

test('uses only external registry provenance membership and an external passive cutoff', () => {
  assert.throws(() => resultView(project, { ...base, calendar: { ...base.calendar, source_ref: 'docs/PLAUSIBLE.md' } }), /work_tracking_invalid/)
  assert.throws(() => resultView(project, { ...base, observed_at: '2026-09-08T00:00:00.000Z' }), /work_tracking_invalid/)
  assert.throws(() => resultView(project, { ...base, nodes: { outcome: { actual_hours: [1, 2], source_ref: 'docs/WORK.md', observed_at: '2026-09-08T00:00:00.000Z' } } }), /work_tracking_invalid/)
  assert.throws(() => resultView(project, { ...base, work_tracking_source_refs: ['docs/PLAUSIBLE.md'] }), /work_tracking_invalid/)
  const futureSnapshotBody = { observed_at: '2026-09-08T00:00:00.000Z', source_ref: 'evidence/snapshot.json', denominator_sha256: 'd'.repeat(64), nodes: {} }
  const futureTogether = { ...base, observed_at: '2026-09-08T00:00:00.000Z', snapshots: [{ snapshot_id: outcomeSnapshotId(futureSnapshotBody), ...futureSnapshotBody }] }
  assert.throws(() => resultView(project, futureTogether), /work_tracking_invalid/)
})

test('rejects missing inherited accessor Proxy and invalid external cutoffs without executing hostile code', () => {
  assert.throws(() => projectOutcomeResultView(project, base), /work_tracking_invalid/)
  assert.throws(() => resultView(project, base, Object.create({ observedAtCutoff: cutoff.observedAtCutoff })), /work_tracking_invalid/)
  assert.throws(() => resultView(project, base, { observedAtCutoff: 'invalid' }), /work_tracking_invalid/)
  assert.throws(() => resultView(project, base, { observedAtCutoff: 1 }), /work_tracking_invalid/)
  let reads = 0
  const accessor = {}; Object.defineProperty(accessor, 'observedAtCutoff', { enumerable: true, get() { reads += 1; return cutoff.observedAtCutoff } })
  assert.throws(() => resultView(project, base, accessor), /work_tracking_invalid/); assert.equal(reads, 0)
  let traps = 0
  const proxy = new Proxy(cutoff, { get() { traps += 1; return undefined }, ownKeys() { traps += 1; return [] } })
  assert.throws(() => resultView(project, base, proxy), /work_tracking_invalid/); assert.equal(traps, 0)
})
