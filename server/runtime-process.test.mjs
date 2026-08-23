import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { cleanupPidRecord, inspectRecordedProcess, stopRecordedProcess, validateProcessIdentity, writePidRecord } from './runtime-process.mjs'

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const unusedPort = async () => { const server = createServer(); server.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve)); const port = server.address().port; server.close(); await new Promise((resolve) => server.once('close', resolve)); return port }
const waitFor = async (check) => { for (let attempt = 0; attempt < 50; attempt += 1) { if (check()) return; await wait(50) } throw new Error('condition timeout') }

test('PID record cleanup removes only its own atomic record', () => {
  const runtime = mkdtempSync(join(tmpdir(), 'outcome-pid-')); const pidFile = join(runtime, 'server.pid')
  writePidRecord(pidFile, 12345); assert.equal(readFileSync(pidFile, 'utf8'), '12345\n')
  writeFileSync(pidFile, '54321\n'); cleanupPidRecord(pidFile, 12345); assert.equal(readFileSync(pidFile, 'utf8'), '54321\n')
  cleanupPidRecord(pidFile, 54321); assert.equal(existsSync(pidFile), false)
})

test('runtime identity validates origin port and Quick Tunnel command relation', () => {
  assert.equal(validateProcessIdentity({ kind: 'origin', command: '/usr/local/bin/node /repo/server/index.mjs', listens: [8791], port: 8791 }).ok, true)
  assert.equal(validateProcessIdentity({ kind: 'origin', command: '/usr/local/bin/node /repo/server/index.mjs', listens: [9999], port: 8791 }).ok, false)
  assert.equal(validateProcessIdentity({ kind: 'tunnel', command: '/repo/.outcome-runtime/cloudflared tunnel --url http://127.0.0.1:8791 --no-autoupdate', listens: [], port: 8791 }).ok, true)
  assert.equal(validateProcessIdentity({ kind: 'tunnel', command: '/usr/bin/sleep 999', listens: [], port: 8791 }).ok, false)
})

test('stale PID record fails closed without signaling an unrelated process', async () => {
  const runtime = mkdtempSync(join(tmpdir(), 'outcome-stale-')); const pidFile = join(runtime, 'server.pid'); const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'])
  writeFileSync(pidFile, `${child.pid}\n`)
  await assert.rejects(() => stopRecordedProcess({ pidFile, kind: 'origin', port: 8791 }), /identity_mismatch/)
  assert.equal(child.exitCode, null); const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited
})

test('validated isolated origin stop terminates only the recorded target and cleans its PID record', async () => {
  const runtime = mkdtempSync(join(tmpdir(), 'outcome-origin-')); const port = await unusedPort()
  const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, OUTCOME_HOST: '127.0.0.1', OUTCOME_PORT: String(port), OUTCOME_PUBLIC_READ_ONLY: '1', OUTCOME_RUNTIME_DIR: runtime }, stdio: 'ignore' })
  const pidFile = join(runtime, 'server.pid'); await waitFor(() => existsSync(pidFile))
  assert.equal(inspectRecordedProcess({ pidFile, kind: 'origin', port }).ok, true)
  await assert.rejects(() => stopRecordedProcess({ pidFile, kind: 'origin', port: port + 1 }), /identity_mismatch/); assert.equal(child.exitCode, null)
  const exited = once(child, 'exit'); await stopRecordedProcess({ pidFile, kind: 'origin', port }); await exited; await waitFor(() => !existsSync(pidFile))
  assert.notEqual(child.exitCode, null)
})
