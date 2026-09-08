import { connect } from 'node:net'
import { lstatSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'
import { projectCodexRuntimeObservation } from './outcome-codex-work-observation.mjs'

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
// Version-pinned INTERNAL desktop IPC, not the public app-server protocol.
// No daemon, resume, turn, permission or data publication. Bounded one-shot read.
export function createDesktopObservationReader({ socketPath, timeoutMs = 3000, maxBytes = 8_000_000, now = Date.now } = {}) {
  if (typeof socketPath !== 'string' || !isAbsolute(socketPath) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 8_000_000 || typeof now !== 'function') throw Error('reader_configuration_invalid')
  return threadId => new Promise(resolve => {
    if (!uuid(threadId)) { resolve(null); return }
    try {
      const socket = lstatSync(socketPath), parent = lstatSync(dirname(socketPath)), uid = process.getuid?.()
      if (uid === undefined || !socket.isSocket() || socket.uid !== uid || (socket.mode & 0o777) !== 0o600
        || !parent.isDirectory() || parent.uid !== uid || (parent.mode & 0o777) !== 0o700) { resolve(null); return }
    } catch { resolve(null); return }
    const initId = randomUUID(), requestId = randomUUID()
    let client, owner, socket, buffer = Buffer.alloc(0), bytes = 0, done = false, following = false
    const send = value => { const data = Buffer.from(JSON.stringify(value)), header = Buffer.alloc(4); header.writeUInt32LE(data.length); socket.write(Buffer.concat([header, data])) }
    const follow = value => send({ type: 'broadcast', method: 'thread-stream-following-changed', version: 1, sourceClientId: client,
      targetClientIds: [owner], params: { hostId: 'local', conversationId: threadId, following: value } })
    const finish = value => {
      if (done) return
      done = true; clearTimeout(timer); buffer = Buffer.alloc(0)
      try { if (following && socket?.writable) follow(false) } catch {}
      socket?.end(); socket?.destroy(); resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    try {
      socket = connect(socketPath)
      socket.on('error', () => finish(null)); socket.on('end', () => finish(null)); socket.on('close', () => finish(null))
      socket.on('connect', () => send({ type: 'request', requestId: initId, sourceClientId: randomUUID(), version: 0,
        method: 'initialize', params: { clientType: 'outcome-observer' }, timeoutMs }))
      socket.on('data', chunk => {
        if (done) return
        try {
          bytes += chunk.length; if (bytes > maxBytes) { finish(null); return }
          buffer = Buffer.concat([buffer, chunk])
          while (!done && buffer.length >= 4) {
            const length = buffer.readUInt32LE(0)
            if (!length || length > maxBytes) { finish(null); return }
            if (buffer.length < length + 4) return
            const message = JSON.parse(buffer.subarray(4, length + 4)); buffer = buffer.subarray(length + 4)
            if (message.type === 'response' && message.requestId === initId && !client) {
              if (message.method !== 'initialize' || message.resultType !== 'success' || !uuid(message.result?.clientId)) { finish(null); return }
              client = message.result.clientId
              send({ type: 'request', requestId, sourceClientId: client, version: 1, method: 'thread-owner-discovery', params: { hostId: 'local', conversationId: threadId }, timeoutMs })
            } else if (message.type === 'response' && message.requestId === requestId && client && !owner) {
              if (message.method !== 'thread-owner-discovery' || message.resultType !== 'success' || !uuid(message.handledByClientId)
                || message.handledByClientId === client || message.result?.supportsUntrustedAppInput !== true) { finish(null); return }
              owner = message.handledByClientId; following = true; follow(true)
            } else if (message.type === 'broadcast' && message.method === 'thread-stream-state-changed' && following) {
              const params = message.params, change = params?.change
              if (message.sourceClientId !== owner || message.version !== 11 || params?.hostId !== 'local' || params?.conversationId !== threadId) continue
              if (change?.type !== 'snapshot' || !Number.isSafeInteger(change.revision) || change.revision < 0 || change.conversationState?.id !== threadId) { finish(null); return }
              const observedAtMs = now()
              const runtimeJson = JSON.stringify({ thread: { id: threadId, status: change.conversationState.threadRuntimeStatus } })
              const projection = projectCodexRuntimeObservation(runtimeJson, threadId, observedAtMs, observedAtMs)
              if (projection.reason === 'source_unavailable') { finish(null); return }
              finish(Object.freeze({ runtimeJson, observedAtMs, revision: change.revision }))
            }
          }
        } catch { finish(null) }
      })
    } catch { finish(null) }
  })
}
