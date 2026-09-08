import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { mkdtempSync, chmodSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPlannerOwnerProbe } from './outcome-chat-owner-probe.mjs'

const thread = '11111111-1111-4111-8111-111111111111', client = '22222222-2222-4222-8222-222222222222', owner = '33333333-3333-4333-8333-333333333333'
test('protected real IPC validates exact ownership and fails closed on bad replies', async () => {
  for (const mode of ['valid', 'wrong-id', 'wrong-method', 'no-owner', 'oversized', 'timeout', 'permissions']) {
    const dir = mkdtempSync(join(tmpdir(), 'oc-owner-')), path = join(dir, 'ipc.sock'), methods = []
    const server = createServer(socket => {
      let buffer = Buffer.alloc(0)
      socket.on('data', data => {
        buffer = Buffer.concat([buffer, data])
        while (buffer.length >= 4 && buffer.length >= buffer.readUInt32LE(0) + 4) {
          const size = buffer.readUInt32LE(0), request = JSON.parse(buffer.subarray(4, size + 4)); buffer = buffer.subarray(size + 4)
          methods.push(request.method)
          if (mode === 'timeout') return
          if (mode === 'oversized') { const header = Buffer.alloc(4); header.writeUInt32LE(2_000_000); socket.write(header); return }
          const initial = request.method === 'initialize'
          if (!initial) assert.deepEqual(request.params, { hostId: 'local', conversationId: thread })
          const reply = { type: 'response', requestId: mode === 'wrong-id' ? owner : request.requestId,
            resultType: mode === 'no-owner' ? 'error' : 'success', method: mode === 'wrong-method' ? 'other' : request.method,
            handledByClientId: owner, result: initial ? { clientId: client } : { supportsUntrustedAppInput: true } }
          const body = Buffer.from(JSON.stringify(reply)), header = Buffer.alloc(4); header.writeUInt32LE(body.length)
          socket.write(header.subarray(0, 2)); socket.write(Buffer.concat([header.subarray(2), body]))
        }
      })
      socket.on('error', () => {})
    })
    await new Promise(resolve => server.listen(path, resolve)); chmodSync(path, mode === 'permissions' ? 0o666 : 0o600)
    try {
      assert.equal(await createPlannerOwnerProbe({ socketPath: path, timeoutMs: 100 })(thread), mode === 'valid')
      assert(methods.every(method => ['initialize', 'thread-owner-discovery'].includes(method)))
      if (mode === 'valid') assert.deepEqual(methods, ['initialize', 'thread-owner-discovery'])
      if (mode === 'permissions') assert.deepEqual(methods, [])
    } finally { await new Promise(resolve => server.close(resolve)); rmdirSync(dir) }
  }
})
test('invalid identity and absent endpoint do not connect or create endpoints', async () => {
  const probe = createPlannerOwnerProbe({ socketPath: '/nonexistent/outcome-owner-probe.sock' })
  assert.equal(await probe(thread), false); assert.equal(await probe('not-a-thread'), false)
  assert.throws(() => createPlannerOwnerProbe({ socketPath: 'relative' }), /configuration/)
})
