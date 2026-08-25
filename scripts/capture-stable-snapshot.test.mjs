import assert from 'node:assert/strict'
import test from 'node:test'
import { buildStableSnapshot } from './capture-stable-snapshot.mjs'

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
