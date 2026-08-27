import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyRegistry } from './outcome-session-registry-persistence.mjs'
import { runSessionCli, runSessionControl } from './outcome-session-control.mjs'

const setup = () => { const path = join(mkdtempSync(join(tmpdir(), 'outcome-control-')), 'registry.json'); createEmptyRegistry(path, ['outcome']); return path }
const common = { projectId: 'outcome', actorClass: 'planner', reasonClass: 'approved_local_test' }

test('doctor and six local controls return only public-safe results', () => {
  const path = setup()
  assert.equal(runSessionControl({ registryPath: path, action: 'doctor', projectIds: ['outcome'] }).ok, true)
  runSessionControl({ registryPath: path, action: 'assign', role: 'builder', expectedVersion: 0, privateInput: { locator: 'provider-secret-locator' }, ...common })
  runSessionControl({ registryPath: path, action: 'observe', role: 'builder', expectedVersion: 1, status: 'idle', observedAt: '2026-08-27T00:00:00.000Z', ...common })
  runSessionControl({ registryPath: path, action: 'checkpoint', role: 'builder', expectedVersion: 1, handoffSha256: 'b'.repeat(64), checkpointRef: 'checkpoint-1', ...common })
  runSessionControl({ registryPath: path, action: 'replace', role: 'builder', expectedVersion: 1, privateInput: { locator: 'provider-new-locator' }, ...common })
  const revoked = runSessionControl({ registryPath: path, action: 'revoke', role: 'builder', expectedVersion: 2, ...common })
  const output = JSON.stringify(revoked)
  for (const token of ['provider-secret-locator', 'provider-new-locator', 'locator_ref', 'binding_ref', 'event_ref']) assert.equal(output.includes(token), false, token)
})

test('Planner replace requires routing freeze, verified handoff, STARTED and CONTINUITY_READY', () => {
  const path = setup()
  runSessionControl({ registryPath: path, action: 'assign', role: 'planner', expectedVersion: 0, privateInput: { locator: 'planner-one' }, ...common })
  const base = { registryPath: path, action: 'replace', role: 'planner', expectedVersion: 1, privateInput: { locator: 'planner-two' }, handoffSha256: 'c'.repeat(64), routingFreeze: true, handoffVerified: true, started: true, continuityReady: true, ...common }
  for (const missing of ['routingFreeze', 'handoffVerified', 'started', 'continuityReady']) assert.throws(() => runSessionControl({ ...base, [missing]: false }), /planner_rotation_unsafe/)
  const result = runSessionControl(base)
  assert.equal(result.binding.binding_version, 2)
  assert.equal(result.binding.predecessor_archive_eligible, true)
})

test('locator cannot be supplied as an ordinary command argument', () => {
  const path = setup()
  assert.throws(() => runSessionControl({ registryPath: path, action: 'assign', role: 'builder', expectedVersion: 0, locator: 'argv-leak', ...common }), /locator_private_input_required/)
})

test('CLI accepts locator only through private stdin and its serializable result stays redacted', () => {
  const path = setup()
  const result = runSessionCli(['assign', '--registry-path', path, '--project-id', 'outcome', '--role', 'builder', '--expected-version', '0', '--actor-class', 'planner', '--reason-class', 'approved_local_test'], JSON.stringify({ locator: 'stdin-private-locator' }))
  const output = JSON.stringify(result)
  assert.equal(result.ok, true)
  assert.equal(output.includes('stdin-private-locator'), false)
  assert.throws(() => runSessionCli(['assign', '--locator', 'argv-private'], ''), /locator_argv_forbidden/)
})
