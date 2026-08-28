import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { createFixtureEvidenceAuthority } from './outcome-role-transport-evidence-fixtures.test.mjs'

const actualDateNow = Date.now
Date.now = () => 100
const surface = await import('./outcome-role-transport-evidence.mjs')
const { createTrustedRoleEvidenceVerifier, isTrustedRoleEvidenceResolver } = surface
const { createOutcomeExecutionControlPlane } = await import('./outcome-execution-control-plane.mjs')
Date.now = actualDateNow

const facts = { project_id: 'outcome', role: 'builder', binding_version: 3, public_alias: 'builder_successor', instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha' }
const fixture = () => { const verifier = createTrustedRoleEvidenceVerifier(); return { verifier, authority: createFixtureEvidenceAuthority(verifier) } }

test('T0 public surface cannot mint authority from invented binding and peer data', () => {
  assert.equal(surface.createTrustedRoleEvidenceResolver, undefined)
  assert.equal(surface.createTrustedRoleEvidenceAuthority, undefined)
  const verifier = createTrustedRoleEvidenceVerifier()
  const plane = createOutcomeExecutionControlPlane({ registry: { bindings: [{ project_id: 'outcome', role: 'builder', version: 3, state: 'active', health: 'fresh', public_alias: 'builder_successor', transport_class: 'codex_app_peer_thread' }] }, clock: () => 100, evidenceResolver: verifier })
  const invented = { payload: { kind: 'start', ...facts, destination_key: 'invented', observation_cursor: 1, receipt_id: 'invented', issued_at: 0, expires_at: 1000 }, signature: 'invented' }
  assert.throws(() => plane.start({ project_id: 'outcome', role: 'builder', instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha', expected_binding_version: 3, action: 'implement', risk_class: 'standard', source_state: 'matched', stage_gate_present: true, authority: 'within_scope', retry_of_attempt_id: null, transport_class: 'codex_app_peer_thread', public_alias: 'builder_successor', trusted_evidence: invented }), /trusted_evidence_required/)
  assert.deepEqual(plane.exportPrivateState().events, [])
})

test('C1 C2 expired signed evidence cannot be revived by a caller backdated clock', () => {
  assert.throws(() => createTrustedRoleEvidenceVerifier({ clock: () => 100 }), /trusted_verifier_invalid/)
  const script = `import { createTrustedRoleEvidenceVerifier } from ${JSON.stringify(new URL('./outcome-role-transport-evidence.mjs', import.meta.url).href)}; import { createFixtureEvidenceAuthority } from ${JSON.stringify(new URL('./outcome-role-transport-evidence-fixtures.test.mjs', import.meta.url).href)}; import { createOutcomeExecutionControlPlane } from ${JSON.stringify(new URL('./outcome-execution-control-plane.mjs', import.meta.url).href)}; const verifier=createTrustedRoleEvidenceVerifier(); const authority=createFixtureEvidenceAuthority(verifier); const plane=createOutcomeExecutionControlPlane({registry:{bindings:[{project_id:'outcome',role:'builder',version:3,state:'active',health:'fresh',public_alias:'builder_successor',transport_class:'codex_app_peer_thread'}]},clock:()=>100,evidenceResolver:verifier}); const trusted_evidence=authority.resolveStart({project_id:'outcome',role:'builder',binding_version:3,public_alias:'builder_successor',instruction_id:'instruction_alpha',attempt_id:'attempt_alpha'}); let code='none'; try { plane.start({project_id:'outcome',role:'builder',instruction_id:'instruction_alpha',attempt_id:'attempt_alpha',expected_binding_version:3,action:'implement',risk_class:'standard',source_state:'matched',stage_gate_present:true,authority:'within_scope',retry_of_attempt_id:null,transport_class:'codex_app_peer_thread',public_alias:'builder_successor',trusted_evidence}) } catch(error) { code=error.code }; process.stdout.write(JSON.stringify({code,events:plane.exportPrivateState().events.length}))`
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  assert.equal(result.status, 0)
  assert.deepEqual(JSON.parse(result.stdout), { code: 'trusted_evidence_stale', events: 0 })
})

test('T1 pinned verifier rejects mismatch, stale, tamper, and replay', () => {
  const { verifier, authority } = fixture(); const start = authority.resolveStart(facts)
  assert.equal(isTrustedRoleEvidenceResolver(verifier), true)
  assert.throws(() => verifier.inspectStart(start, { ...facts, role: 'planner' }), /trusted_evidence_mismatch/)
  assert.equal(verifier.inspectStart(start, facts).observation_cursor, 7)
  const tampered = structuredClone(start); tampered.payload.role = 'planner'
  assert.throws(() => verifier.inspectStart(tampered, { ...facts, role: 'planner' }), /trusted_evidence_required/)
  verifier.commit(start); assert.equal(verifier.inspectStart(start, facts).consumed, true)
  assert.throws(() => verifier.commit(start), /trusted_evidence_replayed/)
})

test('T2 signed provider and destination receipts preserve correlation and cursor', () => {
  const { verifier, authority } = fixture(); const start = authority.resolveStart(facts); verifier.commit(start)
  const provider = authority.providerSend(start, { observation_cursor: 8 })
  const expected = { ...facts, destination_key: verifier.inspectStart(start, facts).destination_key }
  assert.throws(() => verifier.inspectProvider(provider, { ...expected, attempt_id: 'attempt_wrong' }), /trusted_evidence_mismatch/)
  verifier.commit(provider)
  const destination = authority.destinationStart(provider, { observation_cursor: 9, observation_kind: 'new_turn' })
  assert.equal(verifier.inspectDestination(destination, expected).observation_cursor, 9)
  verifier.commit(destination); assert.throws(() => verifier.commit(destination), /trusted_evidence_replayed/)
})
