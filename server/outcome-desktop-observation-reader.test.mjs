import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { mkdtempSync, chmodSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDesktopObservationReader } from './outcome-desktop-observation-reader.mjs'
const thread = '11111111-1111-4111-8111-111111111111', client = '22222222-2222-4222-8222-222222222222', owner = '33333333-3333-4333-8333-333333333333'
test('internal desktop one-shot reads exact owner snapshot, never starts a turn or exposes conversation', async () => {
  for (const mode of ['valid', 'foreign_owner', 'foreign_thread', 'version', 'patch', 'invalid_status', 'oversize', 'timeout']) {
    const dir = mkdtempSync(join(tmpdir(), 'oc-observation-')), socketPath = join(dir, 'ipc.sock'), methods = []
    chmodSync(dir, 0o700)
    const clients = new Set()
    const server = createServer(socket => {
      clients.add(socket); socket.on('close', () => clients.delete(socket)); socket.on('error', () => {})
      let buffer = Buffer.alloc(0)
      const send = value => { const data = Buffer.from(JSON.stringify(value)), header = Buffer.alloc(4); header.writeUInt32LE(data.length); socket.write(Buffer.concat([header, data])) }
      socket.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk])
        while (buffer.length >= 4) {
          const length = buffer.readUInt32LE(0); if (buffer.length < length + 4) return
          const message = JSON.parse(buffer.subarray(4, length + 4)); buffer = buffer.subarray(length + 4); methods.push(message.method)
          if (message.method === 'initialize') send({ type: 'response', requestId: message.requestId, method: message.method, resultType: 'success', result: { clientId: client } })
          else if (message.method === 'thread-owner-discovery') send({ type: 'response', requestId: message.requestId, method: message.method, resultType: 'success', handledByClientId: owner, result: { supportsUntrustedAppInput: true } })
          else if (message.params.following && mode !== 'timeout') {
            assert.deepEqual(message.targetClientIds, [owner]); assert.equal(message.params.conversationId, thread)
            if (mode === 'oversize') { const header = Buffer.alloc(4); header.writeUInt32LE(100001); socket.write(header); continue }
            send({ type: 'broadcast', method: 'thread-stream-state-changed', version: mode === 'version' ? 12 : 11, sourceClientId: mode === 'foreign_owner' ? client : owner,
              params: { hostId: 'local', conversationId: mode === 'foreign_thread' ? client : thread, change: { type: mode === 'patch' ? 'patches' : 'snapshot', revision: 3,
                conversationState: { id: thread, threadRuntimeStatus: { type: mode === 'invalid_status' ? 'invented' : 'active', activeFlags: [] }, turns: ['private secret'] } } } })
          }
        }
      })
    })
    try {
      server.listen(socketPath); await once(server, 'listening'); chmodSync(socketPath, 0o600)
      const diagnostics = []
      const result = await createDesktopObservationReader({ socketPath, timeoutMs: 100, maxBytes: 100000, now: () => 20000, onDiagnostic: value => diagnostics.push(value) })(thread)
      assert.equal(diagnostics.length, 1)
      assert.equal(diagnostics[0].phase, 'snapshot')
      assert.equal(diagnostics[0].reason, mode === 'valid' ? 'observed' : mode === 'patch' ? 'snapshot_invalid' : mode === 'invalid_status' ? 'runtime_status_invalid' : mode === 'oversize' ? 'payload_limit' : 'timeout')
      assert.deepEqual(Object.keys(diagnostics[0]).sort(), ['bytes', 'phase', 'reason'])
      assert(Number.isSafeInteger(diagnostics[0].bytes)); assert(!JSON.stringify(diagnostics).includes(thread))
      if (mode === 'valid') {
        assert.equal(result.observedAtMs, 20000); assert.equal(result.revision, 3)
        assert.deepEqual(JSON.parse(result.runtimeJson), { thread: { id: thread, status: { type: 'active', activeFlags: [] } } })
        assert(!JSON.stringify(result).includes('private secret'))
      } else assert.equal(result, null, mode)
      assert(methods.every(method => ['initialize', 'thread-owner-discovery', 'thread-stream-following-changed'].includes(method)))
    } finally { for (const socket of clients) socket.destroy(); await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }) }
  }
})
test('missing socket and invalid identity fail without startup or mutation', async () => {
  const reader = createDesktopObservationReader({ socketPath: '/nonexistent/outcome-observation.sock' })
  assert.equal(await reader(thread), null); assert.equal(await reader('invalid'), null)
  assert.throws(() => createDesktopObservationReader({ socketPath: 'relative' }), /configuration/)
  assert.equal(await createDesktopObservationReader({ socketPath: '/nonexistent/outcome-observation.sock', onDiagnostic: () => { throw Error('private') } })(thread), null)
})
