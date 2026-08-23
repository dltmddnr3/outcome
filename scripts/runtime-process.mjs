import { spawn } from 'node:child_process'
import { mkdirSync, openSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanupPidRecord, inspectRecordedProcess, registerRecordedProcess, stopRecordedProcess } from '../server/runtime-process.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = process.env.OUTCOME_RUNTIME_DIR ?? join(root, '.outcome-runtime')
const [command, kind, value] = process.argv.slice(2)
const port = Number(process.env.OUTCOME_PORT ?? 8791)
const pidFile = join(runtime, kind === 'tunnel' ? 'tunnel.pid' : 'server.pid')

if (command === 'status' && ['origin', 'tunnel'].includes(kind)) {
  const status = inspectRecordedProcess({ pidFile, kind, port }); console.log(JSON.stringify(status)); if (!status.ok) process.exitCode = 1
} else if (command === 'register' && ['origin', 'tunnel'].includes(kind)) {
  console.log(JSON.stringify(registerRecordedProcess({ pidFile, pid: Number(value), kind, port })))
} else if (command === 'stop' && ['origin', 'tunnel'].includes(kind)) {
  console.log(JSON.stringify(await stopRecordedProcess({ pidFile, kind, port })))
} else if (command === 'start-tunnel' && kind) {
  mkdirSync(runtime, { recursive: true, mode: 0o700 })
  const log = openSync(join(runtime, 'tunnel.log'), 'a'); const child = spawn(resolve(kind), ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], { stdio: ['ignore', log, log] })
  try {
    let registered = false
    for (let attempt = 0; attempt < 40; attempt += 1) { await new Promise((resolveWait) => setTimeout(resolveWait, 50)); try { const status = registerRecordedProcess({ pidFile: join(runtime, 'tunnel.pid'), pid: child.pid, kind: 'tunnel', port }); console.log(JSON.stringify(status)); registered = true; break } catch { if (child.exitCode != null) throw new Error('tunnel_start_failed') } }
    if (!registered) throw new Error('tunnel_identity_not_verified')
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill('SIGTERM'))
    await new Promise((resolveExit) => child.once('exit', resolveExit))
  } finally { cleanupPidRecord(join(runtime, 'tunnel.pid'), child.pid) }
} else {
  throw new Error('usage: runtime-process.mjs status|register|stop origin|tunnel [pid], or start-tunnel <cloudflared-path>')
}
