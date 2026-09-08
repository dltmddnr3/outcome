import { spawn } from 'node:child_process'
import { types } from 'node:util'
import { isAbsolute } from 'node:path'
import { loadRegistry } from './outcome-session-registry-persistence.mjs'
import { plannerRequestEnvelope, projectCompletedPlannerResponse } from './outcome-chat-result-source.mjs'
import { createPlannerThreadReader } from './outcome-chat-thread-reader.mjs'

const CURRENT = new Set(['active'])
const CORRELATION = /^message-[a-f0-9]{16}$/
const fail = () => { throw new Error('binding_unavailable') }
const exact = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) fail()
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.keys(descriptors).sort().join(',') !== [...keys].sort().join(',') || Object.values(descriptors).some((item) => !item.enumerable || !Object.hasOwn(item, 'value'))) fail()
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]))
}
const unknown = Object.freeze({ delivery: 'delivery_unknown' })
const queuedReceipt = (status, locator) => {
  if (status === 'queued' || status === 'acknowledged') return true
  const match = /^Queued message ([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}) for thread (.+)\.$/.exec(status)
  return Boolean(match && match[2] === locator)
}

export function createCodexQueueAdapter({ enabled = false, registryPath, spawnProcess = spawn, codexExecutable = 'codex', readThread, ownerProbe = null, expectedCwd = null, now = () => new Date().toISOString(), maxFreshMs = 15 * 60_000, timeoutMs = 5_000, maxOutputBytes = 256, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (enabled !== true) return null
  if (typeof registryPath !== 'string' || !registryPath || typeof spawnProcess !== 'function' || typeof now !== 'function' || typeof setTimer !== 'function' || typeof clearTimer !== 'function' || !Number.isSafeInteger(maxFreshMs) || maxFreshMs < 1 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000 || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 4_096) return null
  let reader
  if (ownerProbe !== null && (typeof ownerProbe !== 'function' || typeof expectedCwd !== 'string' || !isAbsolute(expectedCwd))) return null
  try { reader = readThread ?? createPlannerThreadReader({ executable:codexExecutable }) } catch { return null }
  const destinations = new WeakMap(), bindings = new WeakMap(), invoked = new WeakSet()
  const liveBinding = async binding => {
    if (await ownerProbe(binding.locator_ref) !== true) return false
    const raw = await reader(binding.locator_ref, { includeTurns: false })
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > 8_000_000) return false
    const metadata = JSON.parse(raw)?.thread
    if (metadata?.id !== binding.locator_ref || metadata?.cwd !== expectedCwd) return false
    if (await ownerProbe(binding.locator_ref) !== true) return false
    const rows = loadRegistry(registryPath).bindings.filter(row => row.project_id === binding.project_id && row.role === 'planner' && !['replaced','revoked'].includes(row.status))
    return rows.length === 1 && rows[0].status === 'active' && rows[0].binding_version === binding.binding_version && rows[0].locator_ref === binding.locator_ref
  }
  return Object.freeze({
    async bindingResolver(input) {
      const request = exact(input, ['project_id', 'role'])
      if (request.role !== 'planner' || typeof request.project_id !== 'string') fail()
      let registry, clock
      try { registry = loadRegistry(registryPath); clock = Date.parse(now()) } catch { fail() }
      if (!Number.isFinite(clock)) fail()
      const matches = registry.bindings.filter((row) => row.project_id === request.project_id && row.role === 'planner' && !['replaced','revoked'].includes(row.status))
      if (matches.length !== 1 || !CURRENT.has(matches[0].status)) fail()
      const binding = matches[0], observed = Date.parse(binding.observed_at ?? binding.bound_at)
      if (!Number.isFinite(observed) || observed > clock || (!ownerProbe && clock - observed > maxFreshMs) || typeof binding.locator_ref !== 'string' || !binding.locator_ref || binding.locator_ref.length > 512 || /[\u0000-\u001f\u007f]/.test(binding.locator_ref)) fail()
      if (ownerProbe) { try { if (!await liveBinding(binding)) fail() } catch { fail() } }
      const destination = Object.freeze({ opaque: true }); destinations.set(destination, binding.locator_ref)
      bindings.set(destination, { projectId:request.project_id, version:binding.binding_version })
      return { project_id: request.project_id, role: 'planner', binding_version: binding.binding_version, status: 'active', freshness: 'fresh', destination }
    },
    async readPlannerResponse(input) {
      try {
        const request = exact(input, ['destination','message','correlation_id'])
        const locator = destinations.get(request.destination), expected = bindings.get(request.destination)
        if (!locator || !expected || typeof reader !== 'function') return { outcome:'unavailable' }
        const currentMatches = () => loadRegistry(registryPath).bindings.filter(row => row.project_id === expected.projectId && row.role === 'planner' && ['active','idle'].includes(row.status))
        const matches = currentMatches()
        if (matches.length !== 1 || matches[0].binding_version !== expected.version || matches[0].locator_ref !== locator) return { outcome:'unavailable' }
        const json = await reader(locator)
        const after = currentMatches()
        if (after.length !== 1 || after[0].binding_version !== expected.version || after[0].locator_ref !== locator) return { outcome:'unavailable' }
        return projectCompletedPlannerResponse({json,threadId:locator,message:request.message,correlationId:request.correlation_id})
      } catch { return { outcome:'unavailable' } }
    },
    async transport(input) {
      let request
      try { request = exact(input, ['destination', 'message', 'correlation_id']) } catch { return unknown }
      const locator = destinations.get(request.destination)
      if (!locator || invoked.has(request.destination) || typeof request.message !== 'string' || !request.message.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(request.message) || [...request.message].length > 4_000 || Buffer.byteLength(request.message) > 16_000 || !CORRELATION.test(request.correlation_id)) return unknown
      invoked.add(request.destination)
      try {
        const expected = bindings.get(request.destination)
        const rows = loadRegistry(registryPath).bindings.filter(row => row.project_id === expected.projectId && row.role === 'planner' && !['replaced','revoked'].includes(row.status))
        const row = rows[0], clock = Date.parse(now()), observed = Date.parse(row?.observed_at ?? row?.bound_at)
        if (rows.length !== 1 || !CURRENT.has(row.status) || row.binding_version !== expected.version || row.locator_ref !== locator || !Number.isFinite(clock) || !Number.isFinite(observed) || observed > clock || (!ownerProbe && clock - observed > maxFreshMs)) return unknown
        if (ownerProbe && !await liveBinding(row)) return unknown
      } catch { return unknown }
      return new Promise((resolve) => {
        let child, settled = false, timer, output = Buffer.alloc(0), killed = false
        const kill = () => { if (killed || !child) return; killed = true; try { child.kill('SIGTERM') } catch {} }
        const finish = (result = unknown) => { if (settled) return; settled = true; if (timer !== undefined) clearTimer(timer); resolve(result) }
        const collect = (chunk) => {
          if (settled) return
          if (!(typeof chunk === 'string' || Buffer.isBuffer(chunk) || chunk instanceof Uint8Array)) { kill(); finish(); return }
          const bytes = Buffer.from(chunk); if (output.length + bytes.length > maxOutputBytes) { kill(); finish(); return }
          output = Buffer.concat([output, bytes])
        }
        try {
          child = spawnProcess(codexExecutable, ['queue', '--thread', locator, '--message', plannerRequestEnvelope(request.message, request.correlation_id)], { shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
          if (!child || typeof child.once !== 'function' || !child.stdout || !child.stderr || typeof child.stdout.on !== 'function' || typeof child.stderr.on !== 'function' || typeof child.kill !== 'function') { finish(); return }
          child.stdout.on('data', collect); child.stderr.on('data', collect)
          child.once('error', () => finish())
          child.once('close', (code, signal) => { if (settled) return; const status = output.toString('utf8').trim(); finish(code === 0 && signal == null && queuedReceipt(status, locator) ? { delivery: 'acknowledged' } : unknown) })
          timer = setTimer(() => { kill(); finish() }, timeoutMs)
        } catch { kill(); finish() }
      })
    },
  })
}
