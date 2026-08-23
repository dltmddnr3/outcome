import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'

const readPid = (pidFile) => {
  try { const value = Number(readFileSync(pidFile, 'utf8').trim()); return Number.isSafeInteger(value) && value > 1 ? value : null } catch { return null }
}
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
const commandFor = (pid) => { try { return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 1000 }).trim() } catch { return '' } }
const listeningPorts = (pid) => { try { return execFileSync('lsof', ['-nP', '-a', '-p', String(pid), '-iTCP', '-sTCP:LISTEN'], { encoding: 'utf8', timeout: 1000 }).split('\n').slice(1).flatMap((line) => { const match = line.match(/TCP .*:(\d+) \(LISTEN\)$/); return match ? [Number(match[1])] : [] }) } catch { return [] } }

export function writePidRecord(pidFile, pid = process.pid) {
  mkdirSync(dirname(pidFile), { recursive: true, mode: 0o700 })
  const temporary = `${pidFile}.${pid}.tmp`
  writeFileSync(temporary, `${pid}\n`, { mode: 0o600 })
  renameSync(temporary, pidFile)
}

export function cleanupPidRecord(pidFile, pid = process.pid) {
  if (readPid(pidFile) !== pid) return false
  try { unlinkSync(pidFile); return true } catch { return false }
}

export function validateProcessIdentity({ kind, command, listens, port }) {
  const executable = basename(command.trim().split(/\s+/)[0] ?? '')
  if (kind === 'origin') return executable.startsWith('node') && /(?:^|\s)(?:[^\s]*\/)?server\/index\.mjs(?:\s|$)/.test(command) && listens.includes(Number(port)) ? { ok: true } : { ok: false, reason: 'identity_mismatch' }
  if (kind === 'tunnel') return executable === 'cloudflared' && /\btunnel\b/.test(command) && command.includes(`--url http://127.0.0.1:${Number(port)}`) ? { ok: true } : { ok: false, reason: 'identity_mismatch' }
  return { ok: false, reason: 'unsupported_kind' }
}

export function inspectRecordedProcess({ pidFile, kind, port }) {
  const pid = readPid(pidFile)
  if (!pid) return { ok: false, reason: existsSync(pidFile) ? 'invalid_pid_record' : 'missing_pid_record', pid: null }
  if (!alive(pid)) return { ok: false, reason: 'stale_pid_record', pid }
  const command = commandFor(pid); const listens = listeningPorts(pid)
  const identity = validateProcessIdentity({ kind, command, listens, port })
  return { ...identity, pid, command, listens }
}

export function registerRecordedProcess({ pidFile, pid, kind, port }) {
  if (!Number.isSafeInteger(pid) || pid <= 1 || !alive(pid)) throw new Error('stale_pid_record')
  const command = commandFor(pid); const identity = validateProcessIdentity({ kind, command, listens: listeningPorts(pid), port })
  if (!identity.ok) throw new Error(identity.reason)
  writePidRecord(pidFile, pid)
  return inspectRecordedProcess({ pidFile, kind, port })
}

export async function stopRecordedProcess({ pidFile, kind, port }) {
  const status = inspectRecordedProcess({ pidFile, kind, port })
  if (!status.ok) throw new Error(status.reason)
  process.kill(status.pid, 'SIGTERM')
  for (let attempt = 0; attempt < 40 && alive(status.pid); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 50))
  if (alive(status.pid)) throw new Error('validated_process_did_not_stop')
  cleanupPidRecord(pidFile, status.pid)
  return { stopped: status.pid }
}
