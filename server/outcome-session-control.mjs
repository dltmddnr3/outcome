import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { doctorRegistry, loadRegistry, mutateRegistry, publicRegistryProjection, recoverRegistryLock } from './outcome-session-registry-persistence.mjs'

const defaultTime = () => new Date().toISOString()

export function runSessionControl(input) {
  if (input.action === 'doctor') return doctorRegistry(input.registryPath, input.projectIds)
  if (input.action === 'recover-lock') return { ...recoverRegistryLock(input.registryPath, { recoveryRef: input.recoveryRef }), action: 'recover-lock' }
  if (Object.hasOwn(input, 'locator')) throw new Error('locator_private_input_required')
  if (['assign', 'replace'].includes(input.action) && (typeof input.privateInput?.locator !== 'string' || !input.privateInput.locator)) throw new Error('locator_private_input_required')
  if (input.action === 'replace' && input.role === 'planner' && !(input.routingFreeze && input.handoffVerified && input.started && input.continuityReady && /^[a-f0-9]{64}$/.test(input.handoffSha256 ?? ''))) throw new Error('planner_rotation_unsafe')
  const binding = mutateRegistry(input.registryPath, { ...input, locator: input.privateInput?.locator, occurredAt: input.occurredAt ?? defaultTime() })
  const row = publicRegistryProjection(loadRegistry(input.registryPath), input.projectId).find(({ role }) => role === input.role)
  return { ok: true, action: input.action, binding: { ...row, predecessor_archive_eligible: Boolean(binding.predecessor_archive_eligible) } }
}

function parseArgs(argv) {
  const [action, ...rest] = argv; const result = { action }
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index]?.replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    const value = rest[index + 1]
    if (!key || value === undefined || key === 'locator') throw new Error(key === 'locator' ? 'locator_argv_forbidden' : 'invalid_arguments')
    result[key] = ['expectedVersion'].includes(key) ? Number(value) : ['routingFreeze', 'handoffVerified', 'started', 'continuityReady'].includes(key) ? value === 'true' : value
  }
  return result
}

export function runSessionCli(argv, stdin = '') {
  const input = parseArgs(argv)
  if (['assign', 'replace'].includes(input.action)) {
    try { input.privateInput = JSON.parse(stdin) } catch { throw new Error('private_input_invalid') }
  }
  return runSessionControl(input)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(runSessionCli(process.argv.slice(2), readFileSync(0, 'utf8')))}\n`) } catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'control_failed' })}\n`); process.exitCode = 1 }
}
