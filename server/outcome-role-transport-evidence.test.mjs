import assert from 'node:assert/strict'
import test from 'node:test'
import { createTrustedRoleEvidenceResolver, isTrustedRoleEvidenceResolver } from './outcome-role-transport-evidence.mjs'

const facts = { project_id: 'outcome', role: 'builder', binding_version: 3, public_alias: 'builder_successor', instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha' }
const fixture = ({ duplicate = false } = {}) => {
  let now = 100
  const binding = { project_id: 'outcome', role: 'builder', binding_version: 3, public_alias: 'builder_successor', state: 'active', destination_ref: 'private-destination' }
  const thread = { project_id: 'outcome', role: 'builder', destination_ref: 'private-destination', observation_cursor: 7 }
  const resolver = createTrustedRoleEvidenceResolver({ bindings: [binding], peer_threads: duplicate ? [thread, { ...thread }] : [thread], clock: () => now, ttl_ms: 10 })
  return { resolver, tick(value) { now = value } }
}

test('T1 resolver requires exact-one binding and peer thread and rejects mismatch stale and replay', () => {
  const { resolver, tick } = fixture()
  assert.equal(isTrustedRoleEvidenceResolver(resolver), true)
  const start = resolver.resolveStart(facts)
  assert.throws(() => resolver.inspectStart(start, { ...facts, role: 'planner' }), /trusted_evidence_mismatch/)
  assert.equal(resolver.inspectStart(start, facts).observation_cursor, 7)
  resolver.commit(start)
  assert.equal(resolver.inspectStart(start, facts).consumed, true)
  assert.throws(() => resolver.commit(start), /trusted_evidence_replayed/)
  const stale = resolver.resolveStart({ ...facts, attempt_id: 'attempt_stale' })
  tick(111)
  assert.throws(() => resolver.inspectStart(stale, { ...facts, attempt_id: 'attempt_stale' }), /trusted_evidence_stale/)
  assert.throws(() => fixture({ duplicate: true }).resolver.resolveStart(facts), /trusted_resolution_failed/)
})

test('T2 provider and destination receipts require correlation and increasing fresh cursor', () => {
  const { resolver } = fixture()
  const start = resolver.resolveStart(facts)
  assert.throws(() => resolver.providerSend(start, { observation_cursor: 8 }), /trusted_evidence_required/)
  resolver.commit(start)
  assert.throws(() => resolver.providerSend(start, { observation_cursor: 7 }), /trusted_evidence_stale/)
  const provider = resolver.providerSend(start, { observation_cursor: 8 })
  const expected = { ...facts, destination_key: resolver.inspectStart(start, facts).destination_key }
  assert.throws(() => resolver.inspectProvider(provider, { ...expected, attempt_id: 'attempt_wrong' }), /trusted_evidence_mismatch/)
  assert.throws(() => resolver.inspectDestination(provider, expected), /trusted_evidence_required/)
  resolver.commit(provider)
  assert.throws(() => resolver.destinationStart(provider, { observation_cursor: 8, observation_kind: 'started' }), /trusted_evidence_stale/)
  assert.throws(() => resolver.destinationStart(provider, { observation_cursor: 9, observation_kind: 'prior_turn_started' }), /trusted_evidence_stale/)
  const destination = resolver.destinationStart(provider, { observation_cursor: 9, observation_kind: 'new_turn' })
  assert.equal(resolver.inspectDestination(destination, expected).observation_cursor, 9)
  resolver.commit(destination)
  assert.throws(() => resolver.commit(destination), /trusted_evidence_replayed/)
})
