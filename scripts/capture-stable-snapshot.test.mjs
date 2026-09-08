import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import sealedSource from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { buildStableSnapshot, sourceEvidenceObservation, refreshSourceBindings } from './capture-stable-snapshot.mjs'

test('fresh canonical binding observations replace stale snapshot session conflicts without deleting unrelated evidence', () => {
  const old = { project: { id: 'outcome' }, status: 'conflict', conflict: true, errors: ['sessions_registry_conflict:builder'], bindings: [{ role: 'builder' }], now: { status: 'active' } }
  const canonical = { project: { id: 'outcome' }, errors: [], bindings: [{ role: 'planner', status: 'stale' }], now: { status: 'stale', observedAt: null, source: 'owner_binding' } }
  const fresh = refreshSourceBindings(old, canonical)
  assert.equal(fresh.status, 'valid')
  assert.equal(fresh.now.status, 'stale')
  assert.deepEqual(fresh.bindings, canonical.bindings)
  assert.deepEqual(fresh.errors, [])
  assert.equal(old.bindings[0].role, 'builder')
  const unrelated = refreshSourceBindings({ ...old, errors: [...old.errors, 'source_projection_conflict:map_primary_narrative_stale'] }, canonical)
  assert.equal(unrelated.status, 'conflict')
  assert.deepEqual(unrelated.errors, ['source_projection_conflict:map_primary_narrative_stale'])
  assert.deepEqual(refreshSourceBindings(old, { ...canonical, errors: ['sessions_manifest_invalid'] }).errors, ['sessions_manifest_invalid'])
  assert.throws(() => refreshSourceBindings(old, { ...canonical, project: { id: 'other' } }), /current_source_binding_projection_invalid/)
})

test('source observation is content-bound and cannot be refreshed by capture time or file metadata', () => {
  const text = 'exact observed Gate bytes'
  const receipt = { schema_version: 1, kind: 'source_content_read', gate_ref: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md', gate_sha256: createHash('sha256').update(text).digest('hex'), observed_at: '2026-09-08T01:00:00.000Z' }
  for (const captured of ['2026-09-08T02:00:00.000Z', '2026-09-09T02:00:00.000Z']) assert.equal(sourceEvidenceObservation(text, receipt, captured), receipt.observed_at)
  for (const invalid of [undefined, { ...receipt, gate_sha256: '0'.repeat(64) }, { ...receipt, observed_at: '2027-01-01T00:00:00.000Z' }, { ...receipt, observed_at: 'not-a-time' }, { ...receipt, kind: 'qa_pass' }, { ...receipt, gate_ref: 'OTHER.md' }, { ...receipt, mtime: '2026-09-08T02:00:00.000Z' }]) assert.throws(() => sourceEvidenceObservation(text, invalid, '2026-09-08T02:00:00.000Z'), /current_source_observation_invalid/)
  assert.throws(() => sourceEvidenceObservation(`${text}\nchanged`, receipt, '2026-09-08T02:00:00.000Z'), /current_source_observation_invalid/)
})

const capturedAt = '2026-08-25T10:00:00.000Z'
const unavailableCherry = { status: 'unknown', errors: ['contract_missing', 'map_missing'], project: { id: 'unknown', name: 'Unknown project' }, phases: [], progress: { available: false } }
const currentOutcome = { status: 'valid', errors: [], observedAt: '2026-08-25T09:59:00.000Z', sourceFreshness: { state: 'observed', observedAt: '2026-08-25T09:59:00.000Z' }, project: { id: 'outcome', name: 'OUTCOME' }, phases: [{ id: 'phase-current', scopes: [] }] }
const priorCherry = { status: 'valid', errors: [], observedAt: '2026-08-24T12:00:00.000Z', sourceFreshness: { state: 'observed', observedAt: '2026-08-24T12:00:00.000Z' }, project: { id: 'cherry-note', name: 'Cherry Note' }, phases: [{ id: 'phase-preserved', scopes: [] }] }
const priorOutcome = { status: 'valid', errors: [], observedAt: '2026-08-24T12:01:00.000Z', sourceFreshness: { state: 'observed', observedAt: '2026-08-24T12:01:00.000Z' }, project: { id: 'outcome', name: 'OUTCOME' }, phases: [{ id: 'phase-old', scopes: [] }] }

const capture = ({ currentProjects = [unavailableCherry, currentOutcome], priorProjects = [priorCherry, priorOutcome], prior = true } = {}) => buildStableSnapshot({
  currentProjection: { schemaVersion: 2, observedAt: capturedAt, projects: currentProjects },
  priorSnapshot: prior ? { schemaVersion: 2, observedAt: '2026-08-24T12:02:00.000Z', projects: priorProjects } : null,
  capturedAt,
})

test('same-count unavailable slot preserves prior projection and its original observation evidence while valid current replaces its slot', () => {
  const snapshot = capture()
  assert.deepEqual(snapshot.projects[0], priorCherry)
  assert.equal(snapshot.projects[0].observedAt, '2026-08-24T12:00:00.000Z')
  assert.deepEqual(snapshot.projects[0].sourceFreshness, priorCherry.sourceFreshness)
  assert.deepEqual(snapshot.projects[1], currentOutcome)
  assert.notDeepEqual(snapshot.projects[1], priorOutcome)
  assert.equal(snapshot.observedAt, capturedAt)
})

test('no prior snapshot or project-count drift keeps the current slot unknown', () => {
  assert.deepEqual(capture({ prior: false }).projects[0], unavailableCherry)
  assert.deepEqual(capture({ priorProjects: [priorCherry] }).projects[0], unavailableCherry)
})

test('prior unknown never fabricates an available project', () => {
  const priorUnknown = { ...unavailableCherry, observedAt: '2026-08-24T12:00:00.000Z' }
  assert.deepEqual(capture({ priorProjects: [priorUnknown, priorOutcome] }).projects[0], unavailableCherry)
})

test('a source-verified non-unknown prior slot remains eligible even when its semantic status is conflict', () => {
  const priorConflict = { ...priorCherry, status: 'conflict', errors: ['current_stage_gate_closed_conflict'] }
  assert.deepEqual(capture({ priorProjects: [priorConflict, priorOutcome] }).projects[0], priorConflict)
})

test('post-merge public projection sanitizes prohibited fields and raw Gate evidence', () => {
  const unsafePrior = {
    ...priorCherry,
    sourcePath: '/Users/example/private-package',
    access_token: 'private-value',
    phases: [{ id: 'phase-preserved', scopes: [{ id: 'scope-preserved', stages: [{ id: 'stage-preserved', gate: { gates: [{ id: 'S1', evidence: 'private raw evidence', title: 'safe' }] } }] }] }],
  }
  const snapshot = capture({ priorProjects: [unsafePrior, priorOutcome] })
  const text = JSON.stringify(snapshot)
  assert.doesNotMatch(text, /\/Users\/|private-value|private raw evidence/)
  assert.equal(Object.hasOwn(snapshot.projects[0].phases[0].scopes[0].stages[0].gate.gates[0], 'evidence'), false)
})

test('sealed deployment source carries the current OUTCOME result-view baseline', () => {
  const outcome = sealedSource.projects.find((project) => project.project.id === 'outcome')
  assert.ok(outcome?.resultView)
  assert.equal(outcome.resultView.hierarchy.id, 'outcome')
  assert.deepEqual(outcome.current, { phaseId: 'outcome-phase-5', scopeId: 'outcome-phase-5-composition', stageId: 'outcome-milestone-model-v2-local-default-projection' })
  assert.deepEqual({ closed: outcome.resultView.source_projection.primary.acceptance.closed, total: outcome.resultView.source_projection.primary.acceptance.total, unmapped: outcome.resultView.source_projection.primary.acceptance.unmapped }, { closed: 13, total: 13, unmapped: 0 })
  assert.equal(new Set(outcome.resultView.source_projection.primary.acceptance.unit_ids).size, 13)
  assert.deepEqual({ label: outcome.resultView.source_projection.compatibility.label, closed: outcome.resultView.source_projection.compatibility.closed, total: outcome.resultView.source_projection.compatibility.total }, { label: 'compatibility', closed: 38, total: 43 })
  assert.deepEqual({ label: outcome.resultView.source_projection.historical[0].label, closed: outcome.resultView.source_projection.historical[0].closed, total: outcome.resultView.source_projection.historical[0].total }, { label: 'historical', closed: 5, total: 6 })
  assert.deepEqual(outcome.resultView.source_projection.conflicts, [])
  assert.equal(outcome.status, 'valid')
  assert.deepEqual(outcome.errors, [])
  assert.deepEqual(outcome.bindings.map(binding => binding.role), ['planner'])
  assert.notEqual(outcome.resultView.source_projection.captured_at, outcome.observedAt)
  assert.equal(outcome.resultView.hierarchy.work.initial_hours, null)
  assert.equal(outcome.resultView.hierarchy.work.actual_hours, null)
  assert.equal(outcome.resultView.hierarchy.work.remaining_hours, null)
  assert.equal(outcome.resultView.hierarchy.comparison.message, '이 날짜 이전의 비교 기록 없음')
  assert.equal(outcome.resultView.completion_authority, false)
})
