import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runBoundedWorkCommand } from './outcome-work-command.mjs'
test('real command obeys exact-file sandbox and never returns raw output', { skip: process.platform !== 'darwin' }, async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'oc-command-'))), allowed = join(root, 'allowed'), forbidden = join(root, 'forbidden')
  writeFileSync(allowed, 'before'); writeFileSync(forbidden, 'preserve')
  try {
    const code = `const fs=require('node:fs');fs.writeFileSync(process.argv[1],'after');try{fs.writeFileSync(process.argv[2],'bad');process.exitCode=7}catch{}try{fs.readFileSync(process.argv[2]);process.exitCode=8}catch{}console.log('private-output-sentinel')`
    const result = await runBoundedWorkCommand({ program: 'node', args: ['-e', code, allowed, forbidden], cwd: root, readPaths: [allowed], writePaths: [allowed], timeoutMs: 5000 })
    assert.equal(result.outcome, 'command_exited_zero'); assert.equal(result.completionAuthority, false)
    assert.equal(readFileSync(allowed, 'utf8'), 'after'); assert.equal(readFileSync(forbidden, 'utf8'), 'preserve')
    assert(!JSON.stringify(result).includes('private-output-sentinel')); assert.match(result.outputDigest, /^[a-f0-9]{64}$/)
    const base = { program: 'node', cwd: root, readPaths: [], writePaths: [], timeoutMs: 100 }
    assert.equal((await runBoundedWorkCommand({ ...base, args: ['-e', 'setInterval(()=>{},1000)'] })).outcome, 'command_timeout')
    const controller = new AbortController(); controller.abort()
    assert.equal((await runBoundedWorkCommand({ ...base, args: [], signal: controller.signal })).outcome, 'command_unavailable')
    assert.equal((await runBoundedWorkCommand({ ...base, program: 'npm', args: [] })).outcome, 'command_unavailable')
    // The internal single-process port must not allow a detached process to
    // escape the process group and outlive cancellation.
    const forkCode = `const r=require('node:child_process').spawnSync(process.execPath,['-e','process.exit(0)'],{detached:true,stdio:'inherit'});process.exit(r.error&&['EPERM','EACCES'].includes(r.error.code)?0:9)`
    assert.equal((await runBoundedWorkCommand({ ...base, timeoutMs: 5000, args: ['-e', forkCode] })).outcome, 'command_exited_zero')
    assert.equal((await runBoundedWorkCommand({ ...base, timeoutMs: 5000, args: ['-e', `process.stdout.write('x'.repeat(2097152))`] })).outcome, 'command_output_limit')
    const active = new AbortController()
    const executing = runBoundedWorkCommand({ ...base, timeoutMs: 5000, signal: active.signal, args: ['-e', 'setInterval(()=>{},1000)'] })
    const abortTimer = setTimeout(() => active.abort(), 50)
    try { assert.equal((await executing).outcome, 'command_cancelled') } finally { clearTimeout(abortTimer) }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
