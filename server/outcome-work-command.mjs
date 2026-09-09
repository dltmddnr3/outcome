import { spawn } from 'node:child_process'
import { realpathSync, lstatSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'

// Internal command port, not an approval resolver. The stage receiver must
// validate the current grant and claim before calling this function. No caller
// may interpret exit zero as QA/Release acceptance. Unsupported programs hold.
export async function runBoundedWorkCommand({ program, args, cwd, readPaths, writePaths, timeoutMs, signal } = {}) {
  const unavailable = () => ({ outcome: 'command_unavailable', executionAuthority: false, completionAuthority: false })
  try {
    if (process.platform !== 'darwin' || program !== 'node' || !Array.isArray(args) || args.length > 64
      || args.some(arg => typeof arg !== 'string' || arg.length > 2048 || /[\u0000-\u001f\u007f]/.test(arg))
      || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3600000 || signal?.aborted) return unavailable()
    if (!isAbsolute(cwd) || realpathSync(cwd) !== cwd || !lstatSync(cwd).isDirectory()) return unavailable()
    for (const paths of [readPaths, writePaths]) if (!Array.isArray(paths) || paths.length > 128
      || paths.some(path => typeof path !== 'string' || !isAbsolute(path) || realpathSync(path) !== path || !lstatSync(path).isFile())) return unavailable()
    // Exact files only. The cwd directory itself (not its subtree) is readable
    // for getcwd; this also permits listing names, never unlisted file contents.
    // No implicit home/.git read or write permission.
    const executable = realpathSync(process.execPath)
    const literals = paths => paths.map(path => `(literal ${JSON.stringify(path)})`).join(' ')
    const profile = `(version 1)(allow default)(deny process-fork)(deny network*)(deny file-write*)(deny file-read-data)(allow file-read-data (literal "/") (subpath "/System") (subpath "/usr/lib") ${literals(['/dev/null', '/dev/random', '/dev/urandom', executable, cwd, ...readPaths])})${writePaths.length ? `(allow file-write* ${literals(writePaths)})` : ''}`
    return await new Promise(resolve => {
      let child, timer, reason = null, bytes = 0, settled = false
      const digest = createHash('sha256')
      const stop = why => {
        if (!reason) reason = why
        if (child?.pid) try { process.kill(-child.pid, 'SIGKILL') } catch {}
      }
      const cancel = () => stop('command_cancelled')
      const finish = (code, childSignal) => {
        if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel)
        // Also terminate lingering descendants after the direct child exits.
        if (child?.pid) try { process.kill(-child.pid, 'SIGKILL') } catch {}
        resolve({ outcome: reason ?? (code === 0 && !childSignal ? 'command_exited_zero' : 'command_failed'),
          exitCode: Number.isInteger(code) ? code : null, outputBytes: bytes, outputDigest: digest.digest('hex'), executionAuthority: false, completionAuthority: false })
      }
      try {
        child = spawn('/usr/bin/sandbox-exec', ['-p', profile, executable, ...args], { cwd, detached: true, shell: false, env: { PATH: '/usr/bin:/bin' }, stdio: ['ignore', 'pipe', 'pipe'] })
        for (const [index, stream] of [child.stdout, child.stderr].entries()) stream.on('data', chunk => {
          bytes += chunk.length
          if (bytes > 1048576) { stop('command_output_limit'); return }
          digest.update(String(index)); digest.update(chunk)
        })
        child.once('error', () => { reason = 'command_unavailable'; finish(null, null) })
        child.once('close', finish)
        timer = setTimeout(() => stop('command_timeout'), timeoutMs)
        signal?.addEventListener('abort', cancel, { once: true })
        if (signal?.aborted) cancel()
      } catch { reason = 'command_unavailable'; finish(null, null) }
    })
  } catch { return unavailable() }
}
