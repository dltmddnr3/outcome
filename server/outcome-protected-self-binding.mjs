import { doctorRegistry, loadRegistry, publicRegistryProjection } from './outcome-session-registry-persistence.mjs'
import { runSessionControl } from './outcome-session-control.mjs'

const SHA256 = /^[a-f0-9]{64}$/
const safeHold = (reason, mutationCount = 0) => ({ outcome: 'safe_hold', reason, mutation_count: mutationCount, automatic_retry_count: 0 })

export function createProtectedSelfBindingAdapter({ environment = process.env, control = runSessionControl, doctor = doctorRegistry } = {}) {
  let invoked = false
  return Object.freeze({
    replaceOnce(input) {
      if (invoked) return safeHold('duplicate_invocation')
      invoked = true
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join(',') !== ['actorClass', 'continuityReady', 'expectedVersion', 'handoffSha256', 'projectId', 'publicAlias', 'reasonClass', 'registryPath', 'role', 'started'].sort().join(',')) return safeHold('invalid_request')
      const locator = environment?.CODEX_THREAD_ID
      if (typeof locator !== 'string' || !locator || locator.length > 512 || /[\u0000-\u001f\u007f]/.test(locator)) return safeHold('self_context_unavailable')
      if (input.started !== true || input.continuityReady !== true || !SHA256.test(input.handoffSha256 ?? '') || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) return safeHold('continuity_unverified')
      let before
      try {
        const registry = loadRegistry(input.registryPath)
        before = publicRegistryProjection(registry, input.projectId).find((row) => row.role === input.role)
      } catch { return safeHold('registry_unavailable') }
      if (!before || before.binding_version !== input.expectedVersion || !['active', 'idle', 'stale', 'rotating', 'blocked'].includes(before.status)) return safeHold('binding_version_conflict')
      try {
        control({ ...input, action: 'replace', privateInput: { locator } })
      } catch {
        return reconcile(input, before, doctor)
      }
      return reconcile(input, before, doctor)
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
