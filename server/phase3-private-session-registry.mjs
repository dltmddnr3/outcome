const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const PROVIDERS = new Set(['codex'])
const ACTOR_CLASSES = new Set(['planner', 'builder', 'system', 'ux_product_qa', 'release_audit'])
const SAFE_ID = /^[a-z][a-z0-9-]{1,63}$/
const SYNTHETIC_LOCATOR = /^synthetic:[a-z0-9][a-z0-9_-]{7,63}$/
const SAFE_REASON = /^[a-z][a-z0-9_]{2,63}$/
const PROHIBITED_REASON_PART = /(?:^|_)(?:session|thread|token|secret|password|authorization|credential|api_key|locator|path|sk|pk|ghp)(?:_|$)/
const PROHIBITED_VALUE = /(?:\b(?:session|thread)[-_:/]|codex:\/\/|(?:token|secret|password|authorization)\s*[:=]|bearer\s+|(?:sk|pk|ghp)_[a-z0-9_-]+|-----BEGIN|^\/|^[a-z]:\\)/i

const clone = (value) => structuredClone(value)

const failure = (error) => ({ ok: false, error })

const validReason = (value) =>
  typeof value === 'string' && SAFE_REASON.test(value) && !PROHIBITED_REASON_PART.test(value)

const validLocator = (value) =>
  typeof value === 'string' && SYNTHETIC_LOCATOR.test(value) && !PROHIBITED_VALUE.test(value)

const bindingKey = (projectId, role) => `${projectId}:${role}`

export function createProjectRoleBindingRegistry({ projectIds, enabled = true, now = () => new Date().toISOString() } = {}) {
  if (!Array.isArray(projectIds) || projectIds.length === 0 || projectIds.some((id) => !SAFE_ID.test(id))) {
    throw new TypeError('invalid_project_registry')
  }
  if (new Set(projectIds).size !== projectIds.length) throw new TypeError('duplicate_project')
  if (typeof now !== 'function') throw new TypeError('invalid_clock')

  const projects = new Set(projectIds)
  const bindings = new Map()
  const activeByScope = new Map()
  const audit = []
  let registryEnabled = Boolean(enabled)
  let registryRevision = 0
  let bindingSequence = 0
  let eventSequence = 0
  let mutationInProgress = false

  const nextBindingId = () => `binding-${String(++bindingSequence).padStart(6, '0')}`
  const nextEventId = () => `event-${String(++eventSequence).padStart(6, '0')}`

  const validateScope = ({ projectId, role, providerClass = 'codex' }) => {
    if (!projects.has(projectId)) return 'project_not_found'
    if (!ROLES.has(role)) return 'unsupported_role'
    if (!PROVIDERS.has(providerClass)) return 'unsupported_provider'
    return null
  }

  const validateMutationMetadata = ({ actorClass, reason }) => {
    if (!ACTOR_CLASSES.has(actorClass)) return 'unsupported_actor'
    if (!validReason(reason)) return 'invalid_reason'
    return null
  }

  const validateExpectedVersion = (expectedVersion, actualVersion) => {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) return 'invalid_expected_version'
    if (expectedVersion !== actualVersion) return 'stale_version'
    return null
  }

  const readTimestamp = () => {
    try {
      const value = now()
      if (typeof value === 'string' && new Date(value).toISOString() === value) return { ok: true, value }
    } catch {}
    return failure('clock_unavailable')
  }

  const runMutation = (operation) => {
    if (mutationInProgress) return failure('mutation_in_progress')
    mutationInProgress = true
    try {
      return operation()
    } finally {
      mutationInProgress = false
    }
  }

  const appendAudit = ({ action, projectId = null, role = null, beforeVersion = null, afterVersion = null, actorClass, reason, occurredAt }) => {
    audit.push(Object.freeze({
      event_id: nextEventId(),
      action,
      project_id: projectId,
      role,
      before_version: beforeVersion,
      after_version: afterVersion,
      actor_class: actorClass,
      reason: reason.trim(),
      occurred_at: occurredAt,
    }))
  }

  const resolveActive = ({ bindingId, projectId, role, providerClass }) => {
    const scopeError = validateScope({ projectId, role, providerClass })
    if (scopeError) return { error: scopeError }
    const binding = bindings.get(bindingId)
    if (!binding) return { error: 'binding_not_found' }
    if (binding.project_id !== projectId || binding.role !== role || binding.provider_class !== providerClass) {
      return { error: 'binding_scope_mismatch' }
    }
    if (binding.status !== 'active') return { error: 'binding_not_active' }
    if (activeByScope.get(bindingKey(projectId, role)) !== bindingId) return { error: 'binding_not_active' }
    return { binding }
  }

  const rejectWhenDisabled = () => registryEnabled ? null : failure('registry_disabled')

  const bind = (input = {}) => runMutation(() => {
    const { projectId, role, providerClass = 'codex', locatorRef, expectedVersion, actorClass, reason } = input
    const disabled = rejectWhenDisabled()
    if (disabled) return disabled
    const scopeError = validateScope({ projectId, role, providerClass })
    if (scopeError) return failure(scopeError)
    const metadataError = validateMutationMetadata({ actorClass, reason })
    if (metadataError) return failure(metadataError)
    if (!validLocator(locatorRef)) return failure('invalid_locator')
    const scope = bindingKey(projectId, role)
    if (activeByScope.has(scope)) return failure('duplicate_active_binding')
    const prior = [...bindings.values()].filter((binding) => binding.project_id === projectId && binding.role === role)
    if (prior.length > 0) return failure('inactive_binding_reuse')
    const versionError = validateExpectedVersion(expectedVersion, 0)
    if (versionError) return failure(versionError)
    const timestamp = readTimestamp()
    if (!timestamp.ok) return timestamp

    const binding = {
      binding_id: nextBindingId(),
      project_id: projectId,
      role,
      provider_class: providerClass,
      locator_ref: locatorRef,
      binding_version: 1,
      status: 'active',
      bound_at: timestamp.value,
      revoked_at: null,
      replaced_by: null,
    }
    bindings.set(binding.binding_id, binding)
    activeByScope.set(scope, binding.binding_id)
    registryRevision += 1
    appendAudit({ action: 'bind', projectId, role, beforeVersion: 0, afterVersion: 1, actorClass, reason, occurredAt: timestamp.value })
    return { ok: true, binding: clone(binding) }
  })

  const rebind = (input = {}) => runMutation(() => {
    const { bindingId, projectId, role, providerClass = 'codex', locatorRef, expectedVersion, actorClass, reason } = input
    const disabled = rejectWhenDisabled()
    if (disabled) return disabled
    const metadataError = validateMutationMetadata({ actorClass, reason })
    if (metadataError) return failure(metadataError)
    if (!validLocator(locatorRef)) return failure('invalid_locator')
    const resolved = resolveActive({ bindingId, projectId, role, providerClass })
    if (resolved.error) return failure(resolved.error)
    const current = resolved.binding
    const versionError = validateExpectedVersion(expectedVersion, current.binding_version)
    if (versionError) return failure(versionError)
    const timestamp = readTimestamp()
    if (!timestamp.ok) return timestamp

    const replacement = {
      ...current,
      binding_id: nextBindingId(),
      locator_ref: locatorRef,
      binding_version: current.binding_version + 1,
      status: 'active',
      bound_at: timestamp.value,
      revoked_at: null,
      replaced_by: null,
    }
    current.status = 'replaced'
    current.replaced_by = replacement.binding_id
    bindings.set(replacement.binding_id, replacement)
    activeByScope.set(bindingKey(projectId, role), replacement.binding_id)
    registryRevision += 1
    appendAudit({ action: 'rebind', projectId, role, beforeVersion: current.binding_version, afterVersion: replacement.binding_version, actorClass, reason, occurredAt: timestamp.value })
    return { ok: true, binding: clone(replacement) }
  })

  const revoke = (input = {}) => runMutation(() => {
    const { bindingId, projectId, role, providerClass = 'codex', expectedVersion, actorClass, reason } = input
    const disabled = rejectWhenDisabled()
    if (disabled) return disabled
    const metadataError = validateMutationMetadata({ actorClass, reason })
    if (metadataError) return failure(metadataError)
    const resolved = resolveActive({ bindingId, projectId, role, providerClass })
    if (resolved.error) return failure(resolved.error)
    const current = resolved.binding
    const versionError = validateExpectedVersion(expectedVersion, current.binding_version)
    if (versionError) return failure(versionError)
    const timestamp = readTimestamp()
    if (!timestamp.ok) return timestamp

    current.status = 'revoked'
    current.revoked_at = timestamp.value
    activeByScope.delete(bindingKey(projectId, role))
    registryRevision += 1
    appendAudit({ action: 'revoke', projectId, role, beforeVersion: current.binding_version, afterVersion: current.binding_version, actorClass, reason, occurredAt: timestamp.value })
    return { ok: true, binding: clone(current) }
  })

  const disable = (input = {}) => runMutation(() => {
    const { expectedRevision, actorClass, reason } = input
    if (!registryEnabled) return failure('registry_disabled')
    const metadataError = validateMutationMetadata({ actorClass, reason })
    if (metadataError) return failure(metadataError)
    const versionError = validateExpectedVersion(expectedRevision, registryRevision)
    if (versionError) return failure(versionError)
    const timestamp = readTimestamp()
    if (!timestamp.ok) return timestamp

    for (const binding of bindings.values()) if (binding.status === 'active') binding.status = 'disabled'
    activeByScope.clear()
    const beforeRevision = registryRevision
    registryRevision += 1
    registryEnabled = false
    appendAudit({ action: 'disable', beforeVersion: beforeRevision, afterVersion: registryRevision, actorClass, reason, occurredAt: timestamp.value })
    return { ok: true, revision: registryRevision, enabled: false }
  })

  const publicProjection = () => {
    const rows = [...bindings.values()]
      .filter((binding) => binding.status !== 'replaced')
      .map((binding) => ({
        project_id: binding.project_id,
        role: binding.role,
        provider_class: binding.provider_class,
        status: binding.status,
        binding_version: binding.binding_version,
        history_count: [...bindings.values()].filter((row) => row.project_id === binding.project_id && row.role === binding.role).length,
      }))
    return clone({ bindings: rows })
  }

  const auditHistory = () => clone(audit)
  const inspectState = () => clone({ enabled: registryEnabled, revision: registryRevision, bindings: [...bindings.values()], active: [...activeByScope.entries()], audit })

  return Object.freeze({ bind, rebind, revoke, disable, publicProjection, auditHistory, inspectState })
}
