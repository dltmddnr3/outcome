import { doctorRegistry, loadRegistry, publicRegistryProjection } from './outcome-session-registry-persistence.mjs'
import { runSessionControl } from './outcome-session-control.mjs'
import { types } from 'node:util'

const SHA256 = /^[a-f0-9]{64}$/
const REQUEST_KEYS = ['actorClass', 'continuityReady', 'expectedVersion', 'handoffSha256', 'projectId', 'publicAlias', 'reasonClass', 'registryPath', 'role', 'started'].sort()
const safeHold = (reason, mutationCount = 0) => ({ outcome: 'safe_hold', reason, mutation_count: mutationCount, automatic_retry_count: 0 })

function materializeRequest(input) {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input) || types.isProxy(input) || Object.getPrototypeOf(input) !== Object.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(input)
    if (Object.keys(descriptors).sort().join(',') !== REQUEST_KEYS.join(',') || Object.values(descriptors).some((descriptor) => !Object.hasOwn(descriptor, 'value'))) return null
    return Object.fromEntries(REQUEST_KEYS.map((key) => [key, descriptors[key].value]))
  } catch { return null }
}

export function createProtectedSelfBindingAdapter({ environment = process.env, control = runSessionControl, doctor = doctorRegistry } = {}) {
  let invoked = false
  return Object.freeze({
    replaceOnce(input) {
      if (invoked) return safeHold('duplicate_invocation')
      invoked = true
      const request = materializeRequest(input)
      if (!request) return safeHold('invalid_request')
      const locator = environment?.CODEX_THREAD_ID
      if (typeof locator !== 'string' || !locator || locator.length > 512 || /[\u0000-\u001f\u007f]/.test(locator)) return safeHold('self_context_unavailable')
      if (request.started !== true || request.continuityReady !== true || !SHA256.test(request.handoffSha256 ?? '') || !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 1) return safeHold('continuity_unverified')
      let before
      try {
        const registry = loadRegistry(request.registryPath)
        before = publicRegistryProjection(registry, request.projectId).find((row) => row.role === request.role)
      } catch { return safeHold('registry_unavailable') }
      if (!before || before.binding_version !== request.expectedVersion || !['active', 'idle', 'stale', 'rotating', 'blocked'].includes(before.status)) return safeHold('binding_version_conflict')
      try {
        control({ ...request, action: 'replace', routingFreeze: true, handoffVerified: true, privateInput: { locator } })
      } catch {
        return reconcile(request, before, doctor)
      }
      return reconcile(request, before, doctor)
    },
  })
}

function reconcile(input, before, doctor) {
  try {
    const registry = loadRegistry(input.registryPath)
    const current = publicRegistryProjection(registry, input.projectId).find((row) => row.role === input.role)
    const predecessor = registry.bindings.find((row) => row.project_id === input.projectId && row.role === input.role && row.binding_version === input.expectedVersion)
    const diagnosis = doctor(input.registryPath, [input.projectId])
    if (!current || current.public_alias !== input.publicAlias || current.binding_version !== input.expectedVersion + 1 || current.status !== 'active' || current.history_count !== before.history_count + 1 || predecessor?.status !== 'replaced' || !diagnosis.ok || diagnosis.lock?.state !== 'clear') return safeHold('readback_conflict', 'unknown')
    return {
      outcome: 'replaced', mutation_count: 1, automatic_retry_count: 0,
      binding: { project_id: current.project_id, role: current.role, public_alias: current.public_alias, status: current.status, binding_version: current.binding_version, history_count: current.history_count, has_predecessor: current.has_predecessor },
      predecessor: { binding_version: predecessor.binding_version, status: predecessor.status, archived: false },
      doctor: { ok: true, schema_version: diagnosis.schemaVersion, revision: diagnosis.revision, issues: diagnosis.issues, lock_state: diagnosis.lock.state },
    }
  } catch { return safeHold('readback_unknown', 'unknown') }
}
