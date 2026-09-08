import { connect } from 'node:net'
import { lstatSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'

const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)

// Desktop ownership is not execution activity. Never starts a daemon or a turn.
export function createPlannerOwnerProbe({ socketPath, timeoutMs = 3000, maxBytes = 1_000_000 } = {}) {
  if (typeof socketPath !== 'string' || !isAbsolute(socketPath) || !Number.isSafeInteger(timeoutMs)
    || timeoutMs < 1 || timeoutMs > 10000 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 8_000_000) throw new Error('probe_configuration_invalid')
  return threadId => new Promise(resolve => {
    if (!uuid(threadId)) { resolve(false); return }
    try {
      const socket = lstatSync(socketPath), parent = lstatSync(dirname(socketPath)), uid = process.getuid?.()
      if (uid === undefined || !socket.isSocket() || socket.uid !== uid || (socket.mode & 0o777) !== 0o600
        || !parent.isDirectory() || parent.uid !== uid || (parent.mode & 0o777) !== 0o700) { resolve(false); return }
    } catch { resolve(false); return }
    const initId = randomUUID(), requestId = randomUUID()
    let clientId = null, initialized = false, done = false, bytes = 0, buffer = Buffer.alloc(0), socket
    const finish = result => { if (done) return; done = true; clearTimeout(timer); socket?.destroy(); resolve(result) }
    const timer = setTimeout(() => finish(false), timeoutMs)
    const send = value => {
      const data = Buffer.from(JSON.stringify(value)), header = Buffer.alloc(4)
      header.writeUInt32LE(data.length); socket.write(Buffer.concat([header, data]))
    }
    try {
      socket = connect(socketPath)
      socket.on('error', () => finish(false)); socket.on('end', () => finish(false)); socket.on('close', () => finish(false))
      socket.on('connect', () => send({ type: 'request', requestId: initId, sourceClientId: randomUUID(), version: 0,
        method: 'initialize', params: { clientType: 'outcome-observer' }, timeoutMs }))
      socket.on('data', data => {
        if (done) return
        try {
          bytes += data.length; if (bytes > maxBytes) { finish(false); return }
          buffer = Buffer.concat([buffer, data])
          while (!done && buffer.length >= 4) {
            const size = buffer.readUInt32LE(0)
            if (!size || size > maxBytes) { finish(false); return }
            if (buffer.length < size + 4) return
            const message = JSON.parse(buffer.subarray(4, size + 4)); buffer = buffer.subarray(size + 4)
            if (message?.type !== 'response') continue
            if (!initialized && message.requestId === initId) {
              if (message.resultType !== 'success' || message.method !== 'initialize' || !uuid(message.result?.clientId)) { finish(false); return }
              initialized = true; clientId = message.result.clientId
              send({ type: 'request', requestId, sourceClientId: clientId, version: 1, method: 'thread-owner-discovery',
                params: { hostId: 'local', conversationId: threadId }, timeoutMs })
            } else if (initialized && message.requestId === requestId) {
              finish(message.resultType === 'success' && message.method === 'thread-owner-discovery'
                && uuid(message.handledByClientId) && message.handledByClientId !== clientId
                && message.result?.supportsUntrustedAppInput === true)
            } else { finish(false) }
          }
        } catch { finish(false) }
      })
    } catch { finish(false) }
  })
}
