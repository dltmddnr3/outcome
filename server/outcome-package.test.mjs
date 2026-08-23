import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildPackageModel, parseGateLedger } from './outcome-package.mjs'

const map = (overrides = '') => `# Map\n\`\`\`yaml\nschema_version: 1\nproject_id: demo\ntitle: Demo\nphases:\n  - id: phase-one\n    title: Phase\n    purpose: Phase purpose\n    scopes:\n      - id: scope-one\n        title: Scope\n        purpose: Scope purpose\n        stages:\n          - id: stage-one\n            title: Stage\n            purpose: Stage purpose\n            depends_on: []\n            gates_file: GATES_STAGE.md\n            implementation_state: work_in_progress\n            evidence_closure_state: pending\n${overrides}\n\`\`\`\n`
const contract = '- Project ID: `demo`\n- Project name: `Demo`\n- Outcome: Measured outcome\n- Acceptance authority: `Cherry`\n'
function fixture({ contractText = contract, mapText = map(), gateText = '- [x] G1: first\n- [ ] G2: second', registry = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'outcome-package-')); mkdirSync(join(root, 'docs'))
  writeFileSync(join(root, 'docs/OUTCOME_CONTRACT.md'), contractText); writeFileSync(join(root, 'docs/OUTCOME_MAP.md'), mapText); if (gateText !== null) writeFileSync(join(root, 'docs/GATES_STAGE.md'), gateText)
  return buildPackageModel({ root, contractFile: 'docs/OUTCOME_CONTRACT.md', mapFile: 'docs/OUTCOME_MAP.md', bindingRegistry: registry, now: new Date(), staleAfterSeconds: 3600 })
}

test('valid package parses contract map and referenced gates', () => { const model = fixture(); assert.equal(model.errors.length, 0); assert.equal(model.phases[0].scopes[0].stages[0].gate.total, 2) })
test('missing package documents fail closed unknown', () => { const model = buildPackageModel({ root: '/missing', contractFile: 'none', mapFile: 'none' }); assert.equal(model.status, 'unknown'); assert.ok(model.errors.includes('contract_missing')) })
test('reference mismatch fails closed conflict', () => { const model = fixture({ mapText: map().replace('project_id: demo', 'project_id: other') }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('project_reference_mismatch')) })
test('missing Gate reference fails closed unknown', () => { const model = fixture({ gateText: null }); assert.equal(model.status, 'unknown'); assert.ok(model.errors.includes('gate_reference_missing:stage-one')) })
test('unknown current Stage reference fails closed conflict', () => { const model = fixture({ mapText: `${map()}\n- Current: \`stage-missing\`` }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('current_reference_mismatch')) })
test('conflicting current boundaries fail closed conflict', () => { const model = fixture({ mapText: `${map()}\n- Current: \`stage-one\`\n- Current: \`stage-two\`` }); assert.equal(model.status, 'conflict') })
test('stable hierarchy has project phase scope stage and Gate acceptance child', () => { const model = fixture(); const stage = model.phases[0].scopes[0].stages[0]; assert.equal(stage.gate.gates[0].stageId, stage.id); assert.equal(stage.gatePurpose.includes('acceptance checklist'), true) })
test('invalid stable id fails closed unknown', () => { const model = fixture({ mapText: map().replace('id: stage-one', 'id: Stage One') }); assert.equal(model.status, 'unknown'); assert.ok(model.errors.includes('invalid_stable_id')) })
test('gate acceptance child preserves closed and total without aggregate inference', () => { const ledger = parseGateLedger('- [x] A1: done\n- [ ] A2: open', 'stage-one'); assert.deepEqual({ closed: ledger.closed, total: ledger.total }, { closed: 1, total: 2 }) })
test('gate reference anchor selects only the owning Stage range', () => { const ledger = parseGateLedger('- [x] M5: parser\n- [x] M6: ids\n- [ ] M10: ui', 'stage-four', 'M5-M9'); assert.deepEqual(ledger.gates.map((gate) => gate.id), ['M5', 'M6']) })
test('role bindings are project scoped with replaced history', () => { const now = new Date().toISOString(); const model = fixture({ registry: [{ project_id: 'demo', role: 'builder', status: 'replaced', bound_at: '2026-01-01T00:00:00Z', replaced_at: '2026-02-01T00:00:00Z' }, { project_id: 'demo', role: 'builder', status: 'active', bound_at: now, observed_at: now, activity: 'current work' }, { project_id: 'other', role: 'builder', status: 'active', bound_at: now }] }); const builder = model.bindings.find((item) => item.role === 'builder'); assert.equal(builder.status, 'active'); assert.equal(builder.historyCount, 2) })
test('NOW separation uses Builder binding while progress refuses activity inference', () => { const now = new Date().toISOString(); const model = fixture({ registry: [{ project_id: 'demo', role: 'builder', status: 'active', bound_at: now, observed_at: now, activity: 'edited 200 files' }] }); assert.equal(model.now.activity, 'edited 200 files'); assert.deepEqual(model.progress, { available: false, reason: 'no_cross_stage_aggregate' }) })
test('fail-closed states cover missing stale conflicting unbound blocked and locked inputs', () => { const model = fixture({ gateText: null }); assert.equal(model.phases[0].scopes[0].stages[0].state, 'unknown'); assert.equal(model.bindings.every((item) => item.status === 'unbound'), true); assert.equal(model.progress.available, false) })
