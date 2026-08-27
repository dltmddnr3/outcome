import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OBSERVER_BRIDGE_RUNTIME_ENV,
  createObserverBridgeRuntimeControl,
  readObserverBridgeRuntimeConfiguration,
} from './phase3-observer-bridge-runtime.mjs'

const validBridge = () => ({
  maxBodyBytes: 32_768,
  read() {},
  createEnrollment() {},
  completeEnrollment() {},
  revokeSource() {},
  ingest() {},
})
const validRuntime = () => ({ bridge: validBridge(), allowedOrigin: 'https://preview.invalid', csrfSecret: 'synthetic-csrf-value' })

test('default disabled configuration is names-only and both capabilities are false', () => {
  assert.deepEqual(Object.values(OBSERVER_BRIDGE_RUNTIME_ENV), [
    'OUTCOME_OBSERVER_BRIDGE_PROJECTION_ENROLLMENT_ENABLED',
    'OUTCOME_OBSERVER_BRIDGE_INGESTION_ENABLED',
  ])
  assert.deepEqual(readObserverBridgeRuntimeConfiguration({ unrelated: 'secret-value' }), {
    valid: true,
    enabled: false,
    projectionEnrollmentEnabled: false,
    ingestionEnabled: false,
  })
})

test('configuration requires both named flags and keeps projection enrollment independent from ingestion', () => {
  const projection = OBSERVER_BRIDGE_RUNTIME_ENV.projectionEnrollmentEnabled
  const ingestion = OBSERVER_BRIDGE_RUNTIME_ENV.ingestionEnabled
  for (const [environment, expected] of [
    [{ [projection]: '1', [ingestion]: '0' }, [true, false]],
    [{ [projection]: '0', [ingestion]: '1' }, [false, true]],
    [{ [projection]: '1', [ingestion]: '1' }, [true, true]],
    [{ [projection]: '0', [ingestion]: '0' }, [false, false]],
  ]) {
    const value = readObserverBridgeRuntimeConfiguration(environment)
    assert.equal(value.valid, true)
    assert.deepEqual([value.projectionEnrollmentEnabled, value.ingestionEnabled], expected)
  }
  for (const environment of [
    { [projection]: '1' },
    { [ingestion]: '1' },
    { [projection]: 'true', [ingestion]: '0' },
    { [projection]: '1', [ingestion]: '' },
  ]) assert.deepEqual(readObserverBridgeRuntimeConfiguration(environment), {
    valid: false,
    enabled: false,
    projectionEnrollmentEnabled: false,
    ingestionEnabled: false,
  })
})

test('malformed configuration objects fail closed without evaluating accessors', () => {
  let getterHits = 0
  const environment = {}
  Object.defineProperty(environment, OBSERVER_BRIDGE_RUNTIME_ENV.projectionEnrollmentEnabled, { enumerable: true, get() { getterHits += 1; return '1' } })
  Object.defineProperty(environment, OBSERVER_BRIDGE_RUNTIME_ENV.ingestionEnabled, { enumerable: true, value: '1' })
  assert.deepEqual(readObserverBridgeRuntimeConfiguration(environment), {
    valid: false,
    enabled: false,
    projectionEnrollmentEnabled: false,
    ingestionEnabled: false,
  })
  assert.equal(getterHits, 0)
  assert.deepEqual(readObserverBridgeRuntimeConfiguration(new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('trap') } })), {
    valid: false,
    enabled: false,
    projectionEnrollmentEnabled: false,
    ingestionEnabled: false,
  })
})

test('factory missing throw reject and invalid outputs are cached fail closed', async () => {
  const environment = {
    [OBSERVER_BRIDGE_RUNTIME_ENV.projectionEnrollmentEnabled]: '1',
    [OBSERVER_BRIDGE_RUNTIME_ENV.ingestionEnabled]: '1',
  }
  for (const runtimeFactory of [
    undefined,
    () => { throw new Error('sensitive construction detail') },
    async () => { throw new Error('sensitive rejection detail') },
    async () => null,
    async () => ({}),
    async () => ({ ...validRuntime(), csrfSecret: '' }),
    async () => ({ ...validRuntime(), bridge: { ...validBridge(), ingest: null } }),
  ]) {
    let calls = 0
    const wrapped = typeof runtimeFactory === 'function' ? (...args) => { calls += 1; return runtimeFactory(...args) } : runtimeFactory
    const control = createObserverBridgeRuntimeControl({ environment, runtimeFactory: wrapped })
    assert.equal(await control.select({ service: { authenticate() {} } }), null)
    assert.equal(await control.select({ service: { authenticate() {} } }), null)
    assert.equal(calls, typeof runtimeFactory === 'function' ? 1 : 0)
  }
})

test('factory receives only safe capability booleans and a server account runtime', async () => {
  const environment = {
    [OBSERVER_BRIDGE_RUNTIME_ENV.projectionEnrollmentEnabled]: '1',
    [OBSERVER_BRIDGE_RUNTIME_ENV.ingestionEnabled]: '0',
  }
  const accountRuntime = { service: { authenticate() {} } }
  let input
  const control = createObserverBridgeRuntimeControl({ environment, runtimeFactory: async (value) => { input = value; return validRuntime() } })
  assert.equal((await control.select(accountRuntime)).bridge.maxBodyBytes, 32_768)
  assert.deepEqual(input, {
    accountRuntime,
    capabilities: { projectionEnrollment: true, ingestion: false },
  })
})
