import { isProxy } from 'node:util/types'

export const OBSERVER_BRIDGE_RUNTIME_ENV = Object.freeze({
  projectionEnrollmentEnabled: 'OUTCOME_OBSERVER_BRIDGE_PROJECTION_ENROLLMENT_ENABLED',
  ingestionEnabled: 'OUTCOME_OBSERVER_BRIDGE_INGESTION_ENABLED',
})

const disabledConfiguration = (valid) => Object.freeze({
  valid,
  enabled: false,
  projectionEnrollmentEnabled: false,
  ingestionEnabled: false,
})

export function readObserverBridgeRuntimeConfiguration(environment = {}) {
  if (typeof environment !== 'object' || environment === null || isProxy(environment)) return disabledConfiguration(false)
  let descriptors
  try {
    descriptors = Object.fromEntries(Object.values(OBSERVER_BRIDGE_RUNTIME_ENV).map((name) => [name, Object.getOwnPropertyDescriptor(environment, name)]))
  } catch {
    return disabledConfiguration(false)
  }
  const entries = Object.entries(descriptors)
  if (entries.every(([, descriptor]) => descriptor === undefined)) return disabledConfiguration(true)
  if (entries.some(([, descriptor]) => descriptor === undefined || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string' || !['0', '1'].includes(descriptor.value))) return disabledConfiguration(false)
  const projectionEnrollmentEnabled = descriptors[OBSERVER_BRIDGE_RUNTIME_ENV.projectionEnrollmentEnabled].value === '1'
  const ingestionEnabled = descriptors[OBSERVER_BRIDGE_RUNTIME_ENV.ingestionEnabled].value === '1'
  return Object.freeze({
    valid: true,
    enabled: projectionEnrollmentEnabled || ingestionEnabled,
    projectionEnrollmentEnabled,
    ingestionEnabled,
  })
}

const bridgeMethods = Object.freeze(['read', 'createEnrollment', 'completeEnrollment', 'revokeSource', 'ingest'])
function validRuntime(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) return null
  let descriptors
  try { descriptors = Object.getOwnPropertyDescriptors(value) } catch { return null }
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !['bridge', 'allowedOrigin', 'csrfSecret'].includes(key))) return null
  if (!['bridge', 'allowedOrigin', 'csrfSecret'].every((key) => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value'))) return null
  const bridge = descriptors.bridge.value
  if (typeof bridge !== 'object' || bridge === null || Array.isArray(bridge) || isProxy(bridge)) return null
  let bridgeDescriptors
  try { bridgeDescriptors = Object.getOwnPropertyDescriptors(bridge) } catch { return null }
  if (!bridgeMethods.every((name) => typeof bridgeDescriptors[name]?.value === 'function')) return null
  const maximumBytes = bridgeDescriptors.maxBodyBytes?.get ? (() => { try { return bridge.maxBodyBytes } catch { return null } })() : bridgeDescriptors.maxBodyBytes?.value
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0 || maximumBytes > 1_048_576) return null
  const allowedOrigin = descriptors.allowedOrigin.value
  const csrfSecret = descriptors.csrfSecret.value
  try {
    if (typeof allowedOrigin !== 'string' || new URL(allowedOrigin).protocol !== 'https:' || typeof csrfSecret !== 'string' || csrfSecret.length < 8) return null
  } catch {
    return null
  }
  return Object.freeze({ bridge, allowedOrigin, csrfSecret })
}

export function createObserverBridgeRuntimeControl({ environment = {}, runtimeFactory } = {}) {
  const configuration = readObserverBridgeRuntimeConfiguration(environment)
  let runtimePromise
  const select = async (accountRuntime) => {
    if (!configuration.enabled || typeof runtimeFactory !== 'function' || typeof accountRuntime?.service?.authenticate !== 'function') return null
    runtimePromise ??= Promise.resolve()
      .then(() => runtimeFactory({
        accountRuntime,
        capabilities: Object.freeze({
          projectionEnrollment: configuration.projectionEnrollmentEnabled,
          ingestion: configuration.ingestionEnabled,
        }),
      }))
      .then(validRuntime)
      .catch(() => null)
    return runtimePromise
  }
  return Object.freeze({ configuration, select })
}
