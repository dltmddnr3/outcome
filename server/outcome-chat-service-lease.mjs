import { createServer } from 'node:net'

// Host-local exclusivity only. This is not a health endpoint or a dispatch API.
// An occupied port is a safe hold; never evict it or choose a different port.
export function acquireChatServiceLease({ port = 61129 } = {}) {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) return Promise.resolve(null)
  return new Promise(resolve => {
    const server = createServer(socket => socket.destroy())
    server.once('error', () => resolve(null))
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      let released = false
      resolve(async () => {
        if (released) return
        released = true
        await new Promise(done => server.close(done))
      })
    })
  })
}
