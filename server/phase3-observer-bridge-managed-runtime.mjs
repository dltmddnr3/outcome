import { createHash, randomBytes, X509Certificate } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { createHostedObserverBridgeError } from './phase3-observer-bridge-hosted.mjs'
import { createObserverBridgeDurableV2Repository, ObserverBridgePostgresError } from './phase3-observer-bridge-postgres.mjs'

export const MANAGED_OBSERVER_BRIDGE_ENV = Object.freeze({
  databaseUrl: 'OUTCOME_OBSERVER_BRIDGE_V2_DATABASE_URL',
  databaseCaPem: 'OUTCOME_OBSERVER_BRIDGE_V2_DATABASE_CA_PEM',
  csrfSecret: 'OUTCOME_OBSERVER_BRIDGE_V2_CSRF_SECRET',
  bindings: 'OUTCOME_OBSERVER_BRIDGE_V2_BINDINGS_JSON',
  recoveryKeyV1: 'OUTCOME_OBSERVER_BRIDGE_V2_RECOVERY_KEY_V1',
})

const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const SAFE_ID = /^[a-z][a-z0-9_-]{0,63}$/
const PRIVATE_REF = /^[a-z][A-Za-z0-9_-]{7,95}$/
const BINDING_KEYS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref'])
const MAX_DATABASE_CA_PEM_BYTES = 16_384
const DATABASE_CA_PEM = /^-----BEGIN CERTIFICATE-----\n(?:[A-Za-z0-9+/]{64}\n)*(?:[A-Za-z0-9+/]{1,64}={0,2}\n)-----END CERTIFICATE-----\n$/
const DATABASE_URL_TLS_PARAMETERS = new Set(['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat'])
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const fail = () => { throw new Error('managed_runtime_unavailable') }

function ownDataRecord(value, fields) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) return null
  let descriptors; let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { return null }
  if (prototype !== Object.prototype && prototype !== null) return null
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || (fields && !fields.has(key)))) return null
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return null
    output[key] = descriptor.value
  }
  return output
}

function dataMethod(value, name) {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null || isProxy(value)) return null
  let cursor = value
  try {
    while (cursor !== null) {
      if (isProxy(cursor)) return null
      const descriptor = Object.getOwnPropertyDescriptor(cursor, name)
      if (descriptor) return Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'function' && !isProxy(descriptor.value) ? descriptor.value : null
      cursor = Object.getPrototypeOf(cursor)
    }
  } catch { return null }
  return null
}

function ownString(environment, name) {
  if (typeof environment !== 'object' || environment === null || isProxy(environment)) return null
  let descriptor
  try { descriptor = Object.getOwnPropertyDescriptor(environment, name) } catch { return null }
  return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' ? descriptor.value : null
}

function canonicalCertificatePem(value) {
  if (typeof value !== 'string' || Buffer.byteLength(value) > MAX_DATABASE_CA_PEM_BYTES || !DATABASE_CA_PEM.test(value)) return null
  try {
    const certificate = new X509Certificate(value)
    return certificate.toString() === value ? value : null
  } catch { return null }
}

function hasGlobalTlsOverride(environment) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(environment, 'NODE_TLS_REJECT_UNAUTHORIZED')
    return descriptor !== undefined
  } catch { return true }
}

export function readDeploymentPreviewOrigin(environment = {}) {
  const vercelEnvironment = ownString(environment, 'VERCEL_ENV')
  const hostname = ownString(environment, 'VERCEL_URL')
  if (vercelEnvironment !== 'preview' || hostname === null || hostname !== hostname.toLowerCase()
    || !/^[a-z0-9.-]+$/.test(hostname) || !hostname.endsWith('.vercel.app') || hostname.endsWith('.')
    || hostname.length > 253) return null
  const labels = hostname.split('.')
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return null
  return `https://${hostname}`
}

function materializeBinding(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.length !== BINDING_KEYS.size || keys.some((key) => typeof key !== 'string' || !BINDING_KEYS.has(key))) return null
  const output = Object.create(null)
  for (const key of BINDING_KEYS) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return null
    output[key] = descriptor.value
  }
  if (!SAFE_ID.test(output.workspace_id) || !SAFE_ID.test(output.project_id) || !ROLES.has(output.role)
    || !Number.isSafeInteger(output.binding_version) || output.binding_version <= 0 || !PRIVATE_REF.test(output.source_ref)) return null
  return Object.freeze(output)
}

function parseConfiguration(environment) {
  if (typeof environment !== 'object' || environment === null || Array.isArray(environment) || isProxy(environment)) return null
  const databaseUrl = ownString(environment, MANAGED_OBSERVER_BRIDGE_ENV.databaseUrl)
  const databaseCaPem = canonicalCertificatePem(ownString(environment, MANAGED_OBSERVER_BRIDGE_ENV.databaseCaPem))
  const allowedOrigin = readDeploymentPreviewOrigin(environment)
  const csrfSecret = ownString(environment, MANAGED_OBSERVER_BRIDGE_ENV.csrfSecret)
  const bindingsJson = ownString(environment, MANAGED_OBSERVER_BRIDGE_ENV.bindings)
  const recoveryKeyText = ownString(environment, MANAGED_OBSERVER_BRIDGE_ENV.recoveryKeyV1)
  if ([databaseUrl, databaseCaPem, allowedOrigin, csrfSecret, bindingsJson, recoveryKeyText].some((value) => value === null) || hasGlobalTlsOverride(environment)) return null
  try {
    const database = new URL(databaseUrl)
    const origin = new URL(allowedOrigin)
    if (!['postgres:', 'postgresql:'].includes(database.protocol) || database.username !== 'outcome_bridge_runtime' || !database.password || !database.hostname || database.pathname.length <= 1) return null
    if ([...database.searchParams.keys()].some((name) => DATABASE_URL_TLS_PARAMETERS.has(name.toLowerCase()))) return null
    if (origin.protocol !== 'https:' || origin.origin !== allowedOrigin || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null
  } catch { return null }
  if (csrfSecret.length < 16 || csrfSecret.length > 4096) return null
  let rawBindings
  let recoveryKey
  try {
    rawBindings = JSON.parse(bindingsJson)
    recoveryKey = Buffer.from(recoveryKeyText, 'base64url')
  } catch { return null }
  if (!Array.isArray(rawBindings) || isProxy(rawBindings) || Object.getPrototypeOf(rawBindings) !== Array.prototype || rawBindings.length < 1 || rawBindings.length > 16) return null
  if (recoveryKey.length !== 32 || recoveryKey.toString('base64url') !== recoveryKeyText) return null
  const bindings = rawBindings.map(materializeBinding)
  if (bindings.some((value) => value === null)) return null
  const tupleKeys = bindings.map((value) => `${value.workspace_id}\0${value.project_id}\0${value.role}\0${value.binding_version}`)
  const sourceKeys = bindings.map((value) => `${value.workspace_id}\0${value.source_ref}`)
  if (new Set(tupleKeys).size !== bindings.length || new Set(sourceKeys).size !== bindings.length) return null
  const canonicalBindings = JSON.stringify(bindings.map((value) => ({
    workspace_id: value.workspace_id,
    project_id: value.project_id,
    role: value.role,
    binding_version: value.binding_version,
    source_ref: value.source_ref,
  })))
  return Object.freeze({
    databaseUrl,
    databaseCaPem,
    allowedOrigin,
    csrfSecret,
    bindings: Object.freeze(bindings),
    bindingDigest: sha256(canonicalBindings),
    recoveryKey: Buffer.from(recoveryKey),
    recoveryKeyFingerprint: sha256(recoveryKey),
  })
}

export function readManagedObserverBridgeConfiguration(environment = {}) {
  const value = parseConfiguration(environment)
  return value ? Object.freeze({
    valid: true,
    bindingCount: value.bindings.length,
    bindingDigest: value.bindingDigest,
    recoveryKeyVersion: 1,
    recoveryKeyFingerprint: value.recoveryKeyFingerprint,
  }) : Object.freeze({ valid: false, bindingCount: 0, recoveryKeyVersion: 1 })
}

export function createPostgresTransactionPort(options) {
  const value = ownDataRecord(options === undefined ? {} : options, new Set(['pool']))
  const pool = value?.pool
  const connect = dataMethod(pool, 'connect')
  if (!connect) fail()
  return async (scope, callback) => {
    if (typeof scope !== 'object' || scope === null || isProxy(scope) || scope.effective_role !== 'outcome_bridge_backend' || typeof callback !== 'function' || isProxy(callback)) fail()
    let client
    let begun = false
    try {
      client = await Reflect.apply(connect, pool, [])
      if (typeof client !== 'object' || client === null || isProxy(client) || typeof client.query !== 'function' || isProxy(client.query) || typeof client.release !== 'function' || isProxy(client.release)) fail()
      await client.query('BEGIN')
      begun = true
      await client.query('SET LOCAL ROLE outcome_bridge_backend')
      const identity = (await client.query('select session_user, current_user'))?.rows?.[0]
      if (identity?.session_user !== 'outcome_bridge_runtime' || identity?.current_user !== 'outcome_bridge_backend') fail()
      const result = await callback(Object.freeze({ query: client.query.bind(client) }))
      await client.query('COMMIT')
      begun = false
      return result
    } catch (error) {
      if (begun) { try { await client?.query('ROLLBACK') } catch {} }
      if (error instanceof ObserverBridgePostgresError) throw error
      fail()
    } finally {
      try { client?.release() } catch {}
    }
  }
}

const MAX_BODY_BYTES = 32_768
const IDEMPOTENCY = /^[A-Za-z0-9_-]{8,96}$/
const VIEWER_CLASSES = new Set(['workstation', 'remote_device'])
const STATUS_CODES = new Set(['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중'])
const bridgeFail = (code) => { throw createHostedObserverBridgeError(code) }
const digest = (value) => sha256(Buffer.isBuffer(value) ? value : Buffer.from(String(value)))

function ordinary(value, fields, required = fields) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) bridgeFail('input_invalid')
  let descriptors; let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { bridgeFail('input_invalid') }
  if (prototype !== Object.prototype && prototype !== null) bridgeFail('input_invalid')
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !fields.has(key)) || [...required].some((key) => !Object.hasOwn(descriptors, key))) bridgeFail('input_invalid')
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) bridgeFail('input_invalid')
    output[key] = descriptor.value
  }
  return output
}

function mapRepository(error) {
  const code = error instanceof ObserverBridgePostgresError ? error.code : null
  const mapped = new Map([
    ['access_denied', 'access_denied'], ['enrollment_invalid', 'enrollment_invalid'], ['enrollment_conflict', 'enrollment_conflict'],
    ['idempotency_conflict', 'idempotency_conflict'], ['request_conflict', 'request_conflict'], ['sequence_conflict', 'sequence_conflict'],
    ['signature_invalid', 'signature_invalid'], ['rate_limited', 'rate_limited'], ['input_invalid', 'input_invalid'],
    ['revision_conflict', 'enrollment_conflict'], ['schema_mismatch', 'unavailable'], ['storage_unavailable', 'unavailable'],
  ])
  bridgeFail(mapped.get(code) ?? 'unavailable')
}

function authority(value, workspaceId, projectId) {
  const auth = ordinary(value, new Set(['account_ref', 'workspace_id', 'project_ids']))
  if (!/^[a-f0-9]{64}$/.test(auth.account_ref) || !SAFE_ID.test(auth.workspace_id) || !Array.isArray(auth.project_ids)
    || auth.project_ids.some((item) => !SAFE_ID.test(item)) || new Set(auth.project_ids).size !== auth.project_ids.length
    || (workspaceId !== undefined && auth.workspace_id !== workspaceId) || !auth.project_ids.includes(projectId)) bridgeFail('access_denied')
  return auth
}

function bindingFor(config, value) {
  const match = config.bindings.find((item) => item.workspace_id === value.workspace_id && item.project_id === value.project_id && item.role === value.role && item.binding_version === value.binding_version && item.source_ref === value.source_ref)
  if (!match) bridgeFail('access_denied')
  return match
}

function createManagedBridge(config, repository, now = Date.now) {
  return Object.freeze({
    maxBodyBytes: MAX_BODY_BYTES,
    async createEnrollment(input) {
      const value = ordinary(input, new Set(['auth_context', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'mode', 'idempotency_key']))
      if (!SAFE_ID.test(value.workspace_id) || !SAFE_ID.test(value.project_id) || !ROLES.has(value.role) || !Number.isSafeInteger(value.binding_version) || value.binding_version <= 0 || !PRIVATE_REF.test(value.source_ref) || !['enroll', 'rotate'].includes(value.mode) || !IDEMPOTENCY.test(value.idempotency_key)) bridgeFail('input_invalid')
      const auth = authority(value.auth_context, value.workspace_id, value.project_id)
      bindingFor(config, value)
      const issuedAt = new Date(now()).toISOString()
      const expiresAt = new Date(Date.parse(issuedAt) + 300_000).toISOString()
      const challengeRef = `challenge_${randomBytes(18).toString('base64url')}`
      const challengeNonce = `nonce_${randomBytes(18).toString('base64url')}`
      const fingerprint = digest(`OUTCOME_OBSERVER_BRIDGE_ENROLLMENT_IDEMPOTENCY_V1\0${auth.account_ref}\0${value.workspace_id}\0${value.project_id}\0${value.role}\0${value.binding_version}\0${value.source_ref}\0${value.mode}`)
      try {
        const response = await repository.createEnrollment({ workspace_id: value.workspace_id, project_id: value.project_id, role: value.role, binding_version: value.binding_version, source_ref: value.source_ref, mode: value.mode, account_ref: auth.account_ref, challenge_ref: challengeRef, challenge_nonce: challengeNonce, challenge_digest: digest(challengeRef), idempotency_digest: digest(`OUTCOME_OBSERVER_BRIDGE_IDEMPOTENCY_V1\0${auth.account_ref}\0${value.workspace_id}\0${value.idempotency_key}`), fingerprint, issued_at: issuedAt, expires_at: expiresAt })
        return { status: response.status, challenge_ref: response.challenge_ref, challenge_nonce: response.challenge_nonce, expires_at: response.expires_at, enrollment_scope: { workspace_id: value.workspace_id, project_id: value.project_id, role: value.role, binding_version: value.binding_version, source_ref: value.source_ref, source_version: response.source_version, key_version: response.key_version, mode: value.mode } }
      } catch (error) { mapRepository(error) }
    },
    async completeEnrollment(input) {
      const value = ordinary(input, new Set(['challenge_ref', 'public_key_spki', 'proof_signature']))
      if (!PRIVATE_REF.test(value.challenge_ref) || typeof value.public_key_spki !== 'string' || typeof value.proof_signature !== 'string') bridgeFail('input_invalid')
      try { return await repository.completeEnrollment({ challenge_ref: value.challenge_ref, challenge_digest: digest(value.challenge_ref), public_key_spki: value.public_key_spki, proof_signature: value.proof_signature, recovery_key: Buffer.from(config.recoveryKey), completed_at: new Date(now()).toISOString() }) } catch (error) { mapRepository(error) }
    },
    async ingest(input) {
      const value = ordinary(input, new Set(['certificate_ref', 'request_id', 'nonce', 'event', 'request_signature', 'body_bytes']), new Set(['certificate_ref', 'request_id', 'nonce', 'event', 'request_signature']))
      if (![value.certificate_ref, value.request_id, value.nonce].every((item) => PRIVATE_REF.test(item)) || typeof value.request_signature !== 'string' || (value.body_bytes !== undefined && (!Number.isSafeInteger(value.body_bytes) || value.body_bytes < 0 || value.body_bytes > MAX_BODY_BYTES))) bridgeFail('input_invalid')
      const event = ordinary(value.event, new Set(['schema_version', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'key_version', 'sequence', 'observed_at', 'expires_at', 'status_code', 'signature']))
      if (event.schema_version !== 1 || !STATUS_CODES.has(event.status_code)) bridgeFail('input_invalid')
      try { return await repository.ingest({ workspace_id: config.bindings.find((item) => item.project_id === event.project_id && item.role === event.role && item.binding_version === event.binding_version && item.source_ref === event.source_ref)?.workspace_id ?? '', certificate_ref: value.certificate_ref, certificate_digest: digest(value.certificate_ref), request_id: value.request_id, nonce: value.nonce, event: { ...event }, request_signature: value.request_signature, received_at: new Date(now()).toISOString() }) } catch (error) { mapRepository(error) }
    },
    async read(input) {
      const value = ordinary(input, new Set(['auth_context', 'viewer_ref', 'viewer_class', 'project_id']))
      if (!PRIVATE_REF.test(value.viewer_ref) || !VIEWER_CLASSES.has(value.viewer_class) || !SAFE_ID.test(value.project_id)) bridgeFail('input_invalid')
      const auth = ordinary(value.auth_context, new Set(['account_ref', 'workspace_id', 'project_ids']))
      authority(auth, auth.workspace_id, value.project_id)
      try { return await repository.read({ account_ref: auth.account_ref, workspace_id: auth.workspace_id, project_id: value.project_id, viewer_ref: value.viewer_ref, viewer_class: value.viewer_class }) } catch (error) { mapRepository(error) }
    },
    async revokeSource(input) {
      const value = ordinary(input, new Set(['auth_context', 'certificate_ref', 'expected_revision']))
      if (!PRIVATE_REF.test(value.certificate_ref) || !Number.isSafeInteger(value.expected_revision) || value.expected_revision <= 0) bridgeFail('input_invalid')
      const auth = ordinary(value.auth_context, new Set(['account_ref', 'workspace_id', 'project_ids']))
      if (!/^[a-f0-9]{64}$/.test(auth.account_ref) || !SAFE_ID.test(auth.workspace_id)) bridgeFail('access_denied')
      try { return await repository.revokeSource({ workspace_id: auth.workspace_id, certificate_digest: digest(value.certificate_ref), expected_revision: value.expected_revision, revoked_at: new Date(now()).toISOString() }) } catch (error) { mapRepository(error) }
    },
  })
}

export function createManagedObserverBridgeRuntimeFactory(options) {
  const value = ownDataRecord(options === undefined ? {} : options, new Set(['environment', 'driverLoader', 'repositoryFactory', 'now']))
  if (!value) return async () => null
  const environment = Object.hasOwn(value, 'environment') ? value.environment : process.env
  const driverLoader = Object.hasOwn(value, 'driverLoader') ? value.driverLoader : () => import('pg')
  const repositoryFactory = Object.hasOwn(value, 'repositoryFactory') ? value.repositoryFactory : createObserverBridgeDurableV2Repository
  const now = Object.hasOwn(value, 'now') ? value.now : Date.now
  const configuration = parseConfiguration(environment)
  let runtimePromise
  return async (input) => {
    const invocation = ownDataRecord(input === undefined ? {} : input, new Set(['accountRuntime', 'capabilities']))
    const capabilities = invocation && ownDataRecord(invocation.capabilities, new Set(['projectionEnrollment', 'ingestion']))
    const accountRuntime = invocation && ownDataRecord(invocation.accountRuntime, null)
    const service = accountRuntime && ownDataRecord(accountRuntime.service, null)
    const resolveBridgeAuthority = dataMethod(service, 'resolveBridgeAuthority')
    if (!configuration || !invocation || capabilities?.projectionEnrollment !== true || capabilities?.ingestion !== true || !resolveBridgeAuthority) return null
    runtimePromise ??= Promise.resolve().then(async () => {
      const driver = await driverLoader()
      const Pool = driver?.Pool ?? driver?.default?.Pool
      if (typeof Pool !== 'function' || isProxy(Pool)) fail()
      const pool = new Pool({ connectionString: configuration.databaseUrl, ssl: { ca: configuration.databaseCaPem, rejectUnauthorized: true }, max: 4, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, statement_timeout: 8_000, query_timeout: 8_000 })
      const repository = repositoryFactory({ with_transaction: createPostgresTransactionPort({ pool }) })
      const resolveAdminAuthority = async (token, workspaceId, projectId) => {
        let resolved
        try { resolved = await Reflect.apply(resolveBridgeAuthority, service, [{ token }]) } catch { bridgeFail('auth_unavailable') }
        return authority(resolved, workspaceId, projectId)
      }
      const admin = Object.freeze({
        async registerViewer(input) {
          const value = ordinary(input, new Set(['token', 'workspace_id', 'project_id', 'viewer_ref', 'viewer_class', 'idempotency_key', 'expected_schema_revision']))
          if (typeof value.token !== 'string' || !SAFE_ID.test(value.workspace_id) || !SAFE_ID.test(value.project_id) || !PRIVATE_REF.test(value.viewer_ref) || !VIEWER_CLASSES.has(value.viewer_class) || !IDEMPOTENCY.test(value.idempotency_key) || value.expected_schema_revision !== 2) bridgeFail('input_invalid')
          const auth = await resolveAdminAuthority(value.token, value.workspace_id, value.project_id)
          const fingerprint = digest(`OUTCOME_OBSERVER_BRIDGE_VIEWER_REGISTER_V1\0${auth.account_ref}\0${value.workspace_id}\0${value.project_id}\0${value.viewer_ref}\0${value.viewer_class}`)
          try { return await repository.registerViewer({ account_ref: auth.account_ref, workspace_id: value.workspace_id, project_id: value.project_id, viewer_ref: value.viewer_ref, viewer_class: value.viewer_class, idempotency_digest: digest(`OUTCOME_OBSERVER_BRIDGE_VIEWER_REGISTER_IDEMPOTENCY_V1\0${auth.account_ref}\0${value.idempotency_key}`), fingerprint, created_at: new Date(now()).toISOString() }) } catch (error) { mapRepository(error) }
        },
        async revokeViewer(input) {
          const value = ordinary(input, new Set(['token', 'workspace_id', 'project_id', 'viewer_ref', 'expected_revision', 'idempotency_key']))
          if (typeof value.token !== 'string' || !SAFE_ID.test(value.workspace_id) || !SAFE_ID.test(value.project_id) || !PRIVATE_REF.test(value.viewer_ref) || !Number.isSafeInteger(value.expected_revision) || value.expected_revision <= 0 || !IDEMPOTENCY.test(value.idempotency_key)) bridgeFail('input_invalid')
          const auth = await resolveAdminAuthority(value.token, value.workspace_id, value.project_id)
          const fingerprint = digest(`OUTCOME_OBSERVER_BRIDGE_VIEWER_REVOKE_V1\0${auth.account_ref}\0${value.workspace_id}\0${value.project_id}\0${value.viewer_ref}\0${value.expected_revision}`)
          try { return await repository.revokeViewer({ account_ref: auth.account_ref, workspace_id: value.workspace_id, project_id: value.project_id, viewer_ref: value.viewer_ref, expected_revision: value.expected_revision, idempotency_digest: digest(`OUTCOME_OBSERVER_BRIDGE_VIEWER_REVOKE_IDEMPOTENCY_V1\0${auth.account_ref}\0${value.idempotency_key}`), fingerprint, revoked_at: new Date(now()).toISOString() }) } catch (error) { mapRepository(error) }
        },
        async cleanupExpiredChallenges(input) {
          const value = ordinary(input, new Set(['token', 'project_id', 'before', 'limit']))
          if (typeof value.token !== 'string' || !SAFE_ID.test(value.project_id) || typeof value.before !== 'string' || !Number.isFinite(Date.parse(value.before)) || !Number.isInteger(value.limit) || value.limit < 1 || value.limit > 100) bridgeFail('input_invalid')
          const auth = await resolveAdminAuthority(value.token, undefined, value.project_id)
          try { return await repository.cleanupExpiredChallenges({ workspace_id: auth.workspace_id, before: value.before, limit: value.limit }) } catch (error) { mapRepository(error) }
        },
        async readiness(input) {
          const value = ordinary(input, new Set(['token', 'workspace_id', 'project_id']))
          if (typeof value.token !== 'string' || !SAFE_ID.test(value.workspace_id) || !SAFE_ID.test(value.project_id)) bridgeFail('input_invalid')
          const auth = await resolveAdminAuthority(value.token, value.workspace_id, value.project_id)
          try { return await repository.readiness({ account_ref: auth.account_ref, workspace_id: value.workspace_id, project_id: value.project_id }) } catch (error) { mapRepository(error) }
        },
      })
      return Object.freeze({
        bridge: createManagedBridge(configuration, repository, now),
        admin,
        allowedOrigin: configuration.allowedOrigin,
        csrfSecret: configuration.csrfSecret,
      })
    }).catch(() => null)
    return runtimePromise
  }
}
