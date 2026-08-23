import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCherryNoteDashboard, parseGateContract, parseLiveTestPulse, parseProgressSnapshots, sanitizeEvidenceText, sanitizeRemotePayload } from './cherry-note-dashboard.mjs'

test('gate contract preserves hierarchy and exact counts', () => {
  const result = parseGateContract('- [ ] Y1: first\n- [x] Y2: second\n- [ ] G1: close')
  assert.equal(result.total, 3)
  assert.deepEqual(result.groups.map(({ id, total }) => ({ id, total })), [{ id: 'Y', total: 2 }, { id: 'G', total: 1 }])
})
test('progress layers remain separate', () => assert.deepEqual(parseProgressSnapshots('implemented: 54/57 tested: 50/57 evidence-closed: 44/57'), { implemented: 54, tested: 50, evidenceClosed: 44 }))
test('live pulse is not aggregate progress', () => assert.deepEqual(parseLiveTestPulse('small passed=8 failed=1\nfull passed=12 failed=1 DockUITests'), { passed: 12, failed: 1, delta: 4, currentTest: 'DockUITests' }))
test('collector offline fails closed instead of reporting fresh success', () => {
  const result = buildCherryNoteDashboard({ root: '/missing', now: new Date('2026-08-23T12:00:00Z'), process: { running: false, elapsedSeconds: null, label: 'none' } })
  assert.equal(result.collector.state, 'offline'); assert.equal(result.live.state, 'unknown'); assert.equal(result.outcomes.externalReady, false)
})
test('collector stale state is explicit', () => {
  const result = buildCherryNoteDashboard({ gateText: '- [ ] G1: close', sourceObservedAt: '2026-08-23T11:00:00Z', now: new Date('2026-08-23T12:00:00Z'), process: { running: false, elapsedSeconds: null, label: 'none' } })
  assert.equal(result.collector.state, 'stale'); assert.equal(result.live.state, 'stale')
})
test('evidence text redacts paths ids hashes and credentials', () => {
  const value = sanitizeEvidenceText('/Users/cherry/private task_id=abc123 token=secret 0123456789abcdef0123456789abcdef01234567')
  assert.equal(value.includes('/Users'), false); assert.equal(value.includes('abc123'), false); assert.equal(value.includes('secret'), false); assert.equal(value.includes('0123456789abcdef'), false)
})
test('remote payload removes prohibited nested fields defensively', () => {
  const value = sanitizeRemotePayload({ project: { name: 'safe', local_path: '/Users/private' }, session_id: 'private', nested: [{ token: 'secret', title: 'visible' }] })
  assert.deepEqual(value, { project: { name: 'safe' }, nested: [{ title: 'visible' }] })
})
