import { createHash, createPublicKey, timingSafeEqual, verify as nodeVerify } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { canonicalObserverBridgeBytes, createPhase3ObserverBridge, ObserverBridgeError } from './phase3-observer-bridge.mjs'

const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const VIEWER_CLASSES = new Set(['workstation', 'remote_device'])
const MODES = new Set(['enroll', 'rotate'])
const SAFE_ID = /^[a-z][a-z0-9_-]{0,63}$/
const PRIVATE_REF = /^[a-z][A-Za-z0-9_-]{7,95}$/
const IDEMPOTENCY = /^[A-Za-z0-9_-]{8,96}$/
const BASE64URL_SIGNATURE = /^[A-Za-z0-9_-]{86}$/
const BASE64URL_KEY = /^[A-Za-z0-9_-]{40,256}$/
const CHALLENGE_MS = 300_000
const FRESHNESS_MS = 60_000
const CONFIG_FIELDS = new Set(['feature_enabled', 'ingest_enabled', 'bindings', 'viewers', 'authorize_owner', 'authorize_viewer', 'now', 'random_bytes', 'verify_signature', 'clone', 'domain_bridge_factory', 'transaction_store', 'max_body_bytes', 'rate_limit_count', 'rate_window_ms'])
const BINDING_FIELDS = new Set(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref'])
const VIEWER_FIELDS = new Set(['workspace_id', 'viewer_ref', 'viewer_class', 'project_ids'])
const AUTH_FIELDS = new Set(['account_ref', 'workspace_id', 'project_ids'])
const AUTH_CONTEXT_FIELDS = new Set(['token'])
const ENROLL_FIELDS = new Set(['auth_context', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'mode', 'idempotency_key'])
const COMPLETE_FIELDS = new Set(['challenge_ref', 'public_key_spki', 'proof_signature'])
const INGEST_FIELDS = new Set(['certificate_ref', 'request_id', 'nonce', 'event', 'request_signature', 'body_bytes'])
const EVENT_FIELDS = new Set(['schema_version', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'key_version', 'sequence', 'observed_at', 'expires_at', 'status_code', 'signature'])
const READ_FIELDS = new Set(['auth_context', 'viewer_ref', 'viewer_class', 'project_id'])
const REVOKE_FIELDS = new Set(['auth_context', 'certificate_ref', 'expected_revision'])
const ENROLLMENT_CANONICAL_FIELDS = Object.freeze(['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'key_version', 'mode', 'challenge_ref', 'challenge_nonce', 'public_key_spki'])
const ENROLLMENT_FINGERPRINT_FIELDS = Object.freeze(['account_ref', 'workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'mode'])
const HOSTED_ERROR_BRAND = new WeakSet()
const HOSTED_ERROR_ORIGINAL_CODE = new WeakMap()
const HOSTED_ERROR_TOKEN = Object.freeze(Object.create(null))
const HOSTED_API_ERROR_CODES = new Set(['unavailable', 'access_denied', 'auth_unavailable', 'enrollment_invalid', 'enrollment_conflict', 'idempotency_conflict', 'request_conflict', 'sequence_conflict', 'signature_invalid', 'csrf_invalid', 'rate_limited', 'body_too_large', 'bad_request', 'input_invalid'])
const DOMAIN_ERROR_CODES = new Set(['signature_invalid', 'out_of_order', 'resync_required'])
const HOSTED_ERROR_KEYS = new Set(['stack', 'message', 'name', 'code'])

export class HostedObserverBridgeError extends Error {
  constructor(code, token) {
    super(code)
    let stack = ''
    try { const value = this.stack; stack = typeof value === 'string' ? value : '' } catch {}
    Object.defineProperty(this, 'stack', { value: stack, writable: true, enumerable: false, configurable: true })
    this.name = 'HostedObserverBridgeError'
    this.code = code
    if (token === HOSTED_ERROR_TOKEN) {
      HOSTED_ERROR_BRAND.add(this)
      HOSTED_ERROR_ORIGINAL_CODE.set(this, code)
    }
  }
}

const exactDataDescriptor = (descriptor, enumerable) => descriptor
  && Object.hasOwn(descriptor, 'value')
  && descriptor.writable === true
  && descriptor.enumerable === enumerable
  && descriptor.configurable === true

export function safeHostedObserverBridgeErrorCode(error) {
  try {
    if (typeof error !== 'object' || error === null || isProxy(error) || !HOSTED_ERROR_BRAND.has(error)) return null
    if (Object.getPrototypeOf(error) !== HostedObserverBridgeError.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(error)
    const keys = Reflect.ownKeys(descriptors)
    if (keys.length !== HOSTED_ERROR_KEYS.size || keys.some((key) => typeof key !== 'string' || !HOSTED_ERROR_KEYS.has(key))) return null
    if (!exactDataDescriptor(descriptors.stack, false) || typeof descriptors.stack.value !== 'string') return null
    if (!exactDataDescriptor(descriptors.message, false) || typeof descriptors.message.value !== 'string') return null
    if (!exactDataDescriptor(descriptors.name, true) || descriptors.name.value !== 'HostedObserverBridgeError') return null
    if (!exactDataDescriptor(descriptors.code, true) || typeof descriptors.code.value !== 'string') return null
    if (descriptors.message.value !== descriptors.code.value || HOSTED_ERROR_ORIGINAL_CODE.get(error) !== descriptors.code.value || !HOSTED_API_ERROR_CODES.has(descriptors.code.value)) return null
    return descriptors.code.value
  } catch {
    return null
  }
}

const safeDomainErrorCode = (error) => {
  try {
    if (typeof error !== 'object' || error === null || isProxy(error) || Object.getPrototypeOf(error) !== ObserverBridgeError.prototype) return null
    const descriptor = Object.getOwnPropertyDescriptor(error, 'code')
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string') return null
    return DOMAIN_ERROR_CODES.has(descriptor.value) ? descriptor.value : null
  } catch {
    return null
  }
}

const fail = (code) => { throw new HostedObserverBridgeError(code, HOSTED_ERROR_TOKEN) }
export const createHostedObserverBridgeError = (code) => new HostedObserverBridgeError(code, HOSTED_ERROR_TOKEN)
const positiveInteger = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const nonNegativeInteger = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const safeId = (value) => typeof value === 'string' && SAFE_ID.test(value)
const privateRef = (value) => typeof value === 'string' && PRIVATE_REF.test(value)
const idempotencyKey = (value) => typeof value === 'string' && IDEMPOTENCY.test(value)

function ownRecord(value, allowed, required = allowed, code = 'input_invalid') {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail(code)
  let prototype
  let descriptors
  try {
    prototype = Object.getPrototypeOf(value)
    descriptors = Object.getOwnPropertyDescriptors(value)
  } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) fail(code)
  if ([...required].some((key) => !Object.hasOwn(descriptors, key))) fail(code)
  const result = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    Object.defineProperty(result, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true })
  }
  return result
}

function ownArray(value, materialize, code = 'configuration_invalid') {
  if (!Array.isArray(value) || isProxy(value)) fail(code)
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail(code) }
  if (prototype !== Array.prototype) fail(code)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) fail(code)
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) fail(code)
  const output = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    output.push(materialize(descriptor.value))
  }
  return output
}

function stringArray(value, code = 'configuration_invalid') {
  const output = ownArray(value, (item) => {
    if (!safeId(item)) fail(code)
    return item
  }, code)
  if (output.length === 0 || new Set(output).size !== output.length) fail(code)
  return output
}

function exactIndependentClone(source, output, seen = new Map()) {
  if (source === null || typeof source !== 'object') {
    if (!Object.is(source, output) || !['string', 'number', 'boolean'].includes(typeof source) && source !== null) fail('materialization_failed')
    return
  }
  if (typeof output !== 'object' || output === null || output === source || isProxy(source) || isProxy(output)) fail('materialization_failed')
  if (seen.has(source)) {
    if (seen.get(source) !== output) fail('materialization_failed')
    return
  }
  seen.set(source, output)
  if (Array.isArray(source) !== Array.isArray(output)) fail('materialization_failed')
  let left
  let right
  try { left = Object.getOwnPropertyDescriptors(source); right = Object.getOwnPropertyDescriptors(output) } catch { fail('materialization_failed') }
  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => typeof key !== 'string' || !Object.hasOwn(right, key))) fail('materialization_failed')
  for (const key of leftKeys) {
    const a = left[key]
    const b = right[key]
    if (!Object.hasOwn(a, 'value') || !Object.hasOwn(b, 'value') || a.enumerable !== b.enumerable) fail('materialization_failed')
    exactIndependentClone(a.value, b.value, seen)
  }
}

function cloneState(state) {
  return {
    storeRevision: state.storeRevision,
    revision: state.revision,
    challenges: new Map([...state.challenges].map(([key, value]) => [key, { ...value, scope: { ...value.scope }, response: { ...value.response, enrollment_scope: { ...value.response.enrollment_scope } } }])),
    sources: new Map([...state.sources].map(([key, value]) => [key, { ...value, actions: value.actions.map((action) => ({ ...action, input: action.input ? { ...action.input } : undefined, event: action.event ? { ...action.event } : undefined })) }])),
    certificates: new Map(state.certificates),
    replays: new Map([...state.replays].map(([key, value]) => [key, { ...value, response: { ...value.response } }])),
    idempotency: new Map([...state.idempotency].map(([key, value]) => [key, { ...value, response: { ...value.response, enrollment_scope: { ...value.response.enrollment_scope } } }])),
    rate: new Map([...state.rate].map(([key, value]) => [key, [...value]])),
  }
}

function persistenceSnapshot(state) {
  return {
    revision: state.revision,
    challenges: [...state.challenges.values()].map((value) => ({ scope: { ...value.scope }, challenge_ref: value.response.challenge_ref, challenge_nonce: value.challengeNonce, issued_at: value.issuedAt, expires_at: value.expiresAt, consumed: value.consumed })),
    sources: [...state.sources.values()].map((value) => ({ workspace_id: value.workspace_id, project_id: value.project_id, role: value.role, binding_version: value.binding_version, source_ref: value.source_ref, source_version: value.source_version, key_version: value.key_version, certificate_ref: value.certificate_ref, public_key_spki: value.public_key_spki, status: value.status, actions: value.actions.map((action) => ({ type: action.type, at: action.at, event: action.event ? { ...action.event } : undefined, key_version: action.input?.new_key_version, public_key_spki: action.public_key_spki })) })),
    replay: [...state.replays.entries()].map(([key, value]) => ({ key, digest: value.digest, response: { ...value.response } })),
  }
}

function serializeFixed(domain, fields, value) {
  let output = `${domain}\n`
  for (const field of fields) {
    const item = typeof value[field] === 'number' ? String(value[field]) : value[field]
    if (typeof item !== 'string') fail('input_invalid')
    output += `${field}=${Buffer.byteLength(item, 'utf8')}:${item}\n`
  }
  return Buffer.from(output, 'utf8')
}

function validSignature(value) {
  if (typeof value !== 'string' || !BASE64URL_SIGNATURE.test(value)) return null
  let decoded
  try { decoded = Buffer.from(value, 'base64url') } catch { return null }
  return decoded.length === 64 && decoded.toString('base64url') === value ? decoded : null
}

function publicKeyFromSpki(value) {
  if (typeof value !== 'string' || !BASE64URL_KEY.test(value)) fail('input_invalid')
  let der
  let key
  try {
    der = Buffer.from(value, 'base64url')
    if (der.toString('base64url') !== value) fail('input_invalid')
    key = createPublicKey({ key: der, format: 'der', type: 'spki' })
  } catch (error) {
    if (safeHostedObserverBridgeErrorCode(error) !== null) throw error
    fail('input_invalid')
  }
  if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') fail('input_invalid')
  const canonical = key.export({ format: 'der', type: 'spki' })
  if (!Buffer.isBuffer(canonical) || canonical.length !== der.length || !timingSafeEqual(canonical, der)) fail('input_invalid')
  return { key, spki: value, digest: createHash('sha256').update(der).digest('hex') }
}

function enrollmentScope(value) {
  if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positiveInteger(value.binding_version) || !privateRef(value.source_ref) || !positiveInteger(value.source_version) || !positiveInteger(value.key_version) || !MODES.has(value.mode) || !privateRef(value.challenge_ref) || !privateRef(value.challenge_nonce) || typeof value.public_key_spki !== 'string') fail('input_invalid')
  return value
}

export function canonicalEnrollmentBytes(input) {
  const value = ownRecord(input, new Set(ENROLLMENT_CANONICAL_FIELDS), new Set(ENROLLMENT_CANONICAL_FIELDS))
  enrollmentScope(value)
  if (!BASE64URL_KEY.test(value.public_key_spki)) fail('input_invalid')
  return serializeFixed('OUTCOME_OBSERVER_BRIDGE_ENROLLMENT_V1', ENROLLMENT_CANONICAL_FIELDS, value)
}

export function canonicalHostedRequestBytes(input) {
  const value = ownRecord(input, new Set(['certificate_ref', 'request_id', 'nonce', 'event']), new Set(['certificate_ref', 'request_id', 'nonce', 'event']))
  if (!privateRef(value.certificate_ref) || !privateRef(value.request_id) || !privateRef(value.nonce)) fail('input_invalid')
  const event = ownRecord(value.event, EVENT_FIELDS, EVENT_FIELDS)
  const { signature, ...unsigned } = event
  let eventBytes
  try { eventBytes = canonicalObserverBridgeBytes(unsigned) } catch { fail('input_invalid') }
  if (!validSignature(signature)) fail('input_invalid')
  const eventDigest = createHash('sha256').update(eventBytes).update(signature, 'utf8').digest('hex')
  return serializeFixed('OUTCOME_OBSERVER_BRIDGE_REQUEST_V1', ['certificate_ref', 'request_id', 'nonce', 'event_digest'], { ...value, event_digest: eventDigest })
}

function materializeBinding(value) {
  const item = ownRecord(value, BINDING_FIELDS, BINDING_FIELDS, 'configuration_invalid')
  if (!safeId(item.workspace_id) || !safeId(item.project_id) || !ROLES.has(item.role) || !positiveInteger(item.binding_version) || !privateRef(item.source_ref)) fail('configuration_invalid')
  return item
}

function materializeViewer(value) {
  const item = ownRecord(value, VIEWER_FIELDS, VIEWER_FIELDS, 'configuration_invalid')
  if (!safeId(item.workspace_id) || !privateRef(item.viewer_ref) || !VIEWER_CLASSES.has(item.viewer_class)) fail('configuration_invalid')
  return { ...item, project_ids: stringArray(item.project_ids) }
}

const bindingKey = (value) => `${value.workspace_id}:${value.project_id}:${value.role}:${value.binding_version}:${value.source_ref}`
const viewerKey = (value) => `${value.workspace_id}:${value.viewer_ref}`

export function createHostedObserverBridge(options = {}) {
  let config
  let bindings
  let viewers
  try {
    config = ownRecord(options, CONFIG_FIELDS, new Set(['bindings', 'viewers', 'authorize_owner', 'authorize_viewer']), 'configuration_invalid')
    bindings = ownArray(config.bindings, materializeBinding)
    viewers = ownArray(config.viewers, materializeViewer)
  } catch { fail('configuration_invalid') }
  if (bindings.length === 0 || new Set(bindings.map(bindingKey)).size !== bindings.length || viewers.length < 2 || new Set(viewers.map(viewerKey)).size !== viewers.length) fail('configuration_invalid')
  const workspaces = new Set(bindings.map((value) => value.workspace_id))
  if (viewers.some((viewer) => !workspaces.has(viewer.workspace_id) || viewer.project_ids.some((projectId) => !bindings.some((binding) => binding.workspace_id === viewer.workspace_id && binding.project_id === projectId)))) fail('configuration_invalid')
  for (const workspaceId of workspaces) {
    const registered = viewers.filter((viewer) => viewer.workspace_id === workspaceId)
    if (registered.length !== 2 || new Set(registered.map((viewer) => viewer.viewer_class)).size !== 2 || !registered.some((viewer) => viewer.viewer_class === 'workstation') || !registered.some((viewer) => viewer.viewer_class === 'remote_device')) fail('configuration_invalid')
  }
  const dependencyFunctions = ['authorize_owner', 'authorize_viewer']
  for (const field of dependencyFunctions) if (typeof config[field] !== 'function' || isProxy(config[field])) fail('configuration_invalid')
  const now = config.now ?? Date.now
  const randomBytes = config.random_bytes ?? (() => fail('entropy_unavailable'))
  const verifySignature = config.verify_signature ?? ((key, bytes, signature) => nodeVerify(null, bytes, key, signature))
  const clone = config.clone ?? structuredClone
  const domainFactory = config.domain_bridge_factory ?? createPhase3ObserverBridge
  const transactionStore = config.transaction_store ?? Object.freeze({ commit: () => true })
  let storePort
  try { storePort = ownRecord(transactionStore, new Set(['commit']), new Set(['commit']), 'configuration_invalid') } catch { fail('configuration_invalid') }
  for (const dependency of [now, randomBytes, verifySignature, clone, domainFactory, storePort.commit]) if (typeof dependency !== 'function' || isProxy(dependency)) fail('configuration_invalid')
  if ((config.feature_enabled !== undefined && typeof config.feature_enabled !== 'boolean') || (config.ingest_enabled !== undefined && typeof config.ingest_enabled !== 'boolean')) fail('configuration_invalid')
  const featureEnabled = config.feature_enabled ?? false
  const ingestEnabled = config.ingest_enabled ?? false
  const maxBodyBytes = config.max_body_bytes ?? 32_768
  const rateLimitCount = config.rate_limit_count ?? 60
  const rateWindowMs = config.rate_window_ms ?? 60_000
  if (!positiveInteger(maxBodyBytes) || !positiveInteger(rateLimitCount) || !positiveInteger(rateWindowMs)) fail('configuration_invalid')

  let state = { storeRevision: 0, revision: 0, challenges: new Map(), sources: new Map(), certificates: new Map(), replays: new Map(), idempotency: new Map(), rate: new Map() }
  let busy = false
  let reentry = false
  let lastClock = null

  const transact = (operation) => {
    if (busy) { reentry = true; fail('reentrant_operation') }
    busy = true
    reentry = false
    let clockRead = false
    let clockValue
    const clock = () => {
      if (clockRead) return clockValue
      try { clockValue = now() } catch { fail('clock_unavailable') }
      if (reentry) fail('reentrant_operation')
      if (typeof clockValue !== 'number' || !Number.isFinite(clockValue) || (lastClock !== null && clockValue < lastClock)) fail('clock_unavailable')
      try { new Date(clockValue).toISOString() } catch { fail('clock_unavailable') }
      clockRead = true
      return clockValue
    }
    try {
      const draft = cloneState(state)
      const outcome = operation(draft, clock)
      if (reentry) fail('reentrant_operation')
      let response
      try { response = clone(outcome.response) } catch { fail('materialization_failed') }
      if (reentry) fail('reentrant_operation')
      exactIndependentClone(outcome.response, response)
      if (outcome.commit) {
        let persisted
        try { persisted = storePort.commit(draft.storeRevision, persistenceSnapshot(draft)) } catch { fail('storage_unavailable') }
        if (reentry) fail('reentrant_operation')
        if (persisted !== true) fail('storage_unavailable')
        draft.storeRevision += 1
        state = draft
      }
      if (clockRead) lastClock = clockValue
      return response
    } finally {
      busy = false
    }
  }

  const callAuth = (kind, context) => {
    let result
    let safeContext
    try { safeContext = ownRecord(context, AUTH_CONTEXT_FIELDS, AUTH_CONTEXT_FIELDS, 'access_denied') } catch { fail('access_denied') }
    if (typeof safeContext.token !== 'string' || safeContext.token.length === 0 || safeContext.token.length > 1024) fail('access_denied')
    try { result = config[kind](safeContext) } catch { fail('auth_unavailable') }
    if (reentry) fail('reentrant_operation')
    if (result === null) fail('access_denied')
    let auth
    try { auth = ownRecord(result, AUTH_FIELDS, AUTH_FIELDS, 'access_denied') } catch { fail('access_denied') }
    if (!privateRef(auth.account_ref) || !safeId(auth.workspace_id)) fail('access_denied')
    auth.project_ids = stringArray(auth.project_ids, 'access_denied')
    return auth
  }

  const requireFeature = () => { if (!featureEnabled) fail('unavailable') }
  const requireOwnerScope = (context, scope) => {
    const auth = callAuth('authorize_owner', context)
    if (auth.workspace_id !== scope.workspace_id || !auth.project_ids.includes(scope.project_id)) fail('access_denied')
    const allowed = bindings.find((item) => bindingKey(item) === bindingKey(scope))
    if (!allowed) fail('access_denied')
    return auth
  }

  const enrollmentFingerprint = (auth, value) => createHash('sha256').update(serializeFixed(
    'OUTCOME_OBSERVER_BRIDGE_ENROLLMENT_IDEMPOTENCY_V1',
    ENROLLMENT_FINGERPRINT_FIELDS,
    { account_ref: auth.account_ref, workspace_id: auth.workspace_id, project_id: value.project_id, role: value.role, binding_version: value.binding_version, source_ref: value.source_ref, mode: value.mode },
  )).digest('hex')

  const entropyRef = (prefix, length = 18) => {
    let bytes
    try { bytes = randomBytes(length) } catch { fail('entropy_unavailable') }
    if (reentry) fail('reentrant_operation')
    if (!Buffer.isBuffer(bytes) || bytes.length !== length) fail('entropy_unavailable')
    return `${prefix}_${bytes.toString('base64url')}`
  }

  const verify = (key, bytes, signature, failureCode) => {
    const decoded = validSignature(signature)
    if (!decoded) fail('input_invalid')
    let result
    try { result = verifySignature(key, bytes, decoded) } catch { fail('crypto_unavailable') }
    if (reentry) fail('reentrant_operation')
    if (typeof result !== 'boolean') fail('crypto_unavailable')
    if (!result) fail(failureCode)
  }

  const buildDomain = (source, clockValue) => {
    let activeClock = clockValue
    let registryRevision = 1
    const create = () => domainFactory({
      sources: [{ project_id: source.project_id, role: source.role, binding_version: source.binding_version, source_ref: source.source_ref, source_version: source.source_version, key_version: source.initial_key_version, public_key: source.initial_public_key, status: 'active' }],
      viewers: viewers.filter((viewer) => viewer.workspace_id === source.workspace_id).map((viewer) => ({ viewer_ref: viewer.viewer_ref, viewer_class: viewer.viewer_class, project_ids: [...viewer.project_ids], status: 'active' })),
      freshness_ms: FRESHNESS_MS,
      now: () => activeClock,
      enabled: true,
    })
    let domain
    try { domain = create() } catch { fail('domain_unavailable') }
    if (reentry || !domain || isProxy(domain) || typeof domain.ingest !== 'function' || typeof domain.read !== 'function') fail('domain_unavailable')
    for (const action of source.actions) {
      activeClock = action.at
      try {
        if (action.type === 'ingest') domain.ingest(action.event)
        else if (action.type === 'rotate') {
          domain.rotateKey(action.input)
          registryRevision += 1
        } else if (action.type === 'resync') domain.resync(action.input)
        else fail('domain_unavailable')
      } catch { fail('domain_unavailable') }
      if (reentry) fail('reentrant_operation')
    }
    activeClock = clockValue
    return { domain, registryRevision }
  }

  return Object.freeze({
    get featureEnabled() { return featureEnabled },
    get ingestEnabled() { return ingestEnabled },
    get maxBodyBytes() { return maxBodyBytes },

    createEnrollment(input) {
      return transact((draft, clock) => {
        requireFeature()
        const value = ownRecord(input, ENROLL_FIELDS, ENROLL_FIELDS)
        if (!safeId(value.workspace_id) || !safeId(value.project_id) || !ROLES.has(value.role) || !positiveInteger(value.binding_version) || !privateRef(value.source_ref) || !MODES.has(value.mode) || !idempotencyKey(value.idempotency_key)) fail('input_invalid')
        const auth = requireOwnerScope(value.auth_context, value)
        const scopeKey = bindingKey(value)
        const current = draft.sources.get(scopeKey)
        if (value.mode === 'rotate' && (!current || current.status !== 'active')) fail('access_denied')
        if (value.mode === 'enroll' && current?.status === 'active') fail('enrollment_conflict')
        const fingerprint = enrollmentFingerprint(auth, value)
        const idempotencyScopeKey = `${auth.account_ref}:${auth.workspace_id}:${value.idempotency_key}`
        const prior = draft.idempotency.get(idempotencyScopeKey)
        if (prior) {
          if (prior.fingerprint !== fingerprint) fail('idempotency_conflict')
          return { commit: false, response: prior.response }
        }
        const issued = clock()
        const challengeRef = entropyRef('challenge')
        const challengeNonce = entropyRef('nonce')
        const sourceVersion = value.mode === 'rotate' ? current.source_version : (current?.source_version ?? 0) + 1
        const keyVersion = value.mode === 'rotate' ? current.key_version + 1 : 1
        const scope = { workspace_id: value.workspace_id, project_id: value.project_id, role: value.role, binding_version: value.binding_version, source_ref: value.source_ref, source_version: sourceVersion, key_version: keyVersion, mode: value.mode }
        const response = { status: 'challenge_created', challenge_ref: challengeRef, challenge_nonce: challengeNonce, expires_at: new Date(issued + CHALLENGE_MS).toISOString(), enrollment_scope: { ...scope } }
        draft.challenges.set(challengeRef, { scope, challengeNonce, issuedAt: issued, expiresAt: issued + CHALLENGE_MS, consumed: false, response })
        draft.idempotency.set(idempotencyScopeKey, { fingerprint, response })
        return { commit: true, response }
      })
    },

    completeEnrollment(input) {
      return transact((draft, clock) => {
        requireFeature()
        const value = ownRecord(input, COMPLETE_FIELDS, COMPLETE_FIELDS)
        if (!privateRef(value.challenge_ref) || typeof value.public_key_spki !== 'string') fail('input_invalid')
        const challenge = draft.challenges.get(value.challenge_ref)
        const completedAt = clock()
        if (!challenge || challenge.consumed || completedAt >= challenge.expiresAt) fail('enrollment_invalid')
        const publicKey = publicKeyFromSpki(value.public_key_spki)
        const bytes = canonicalEnrollmentBytes({ ...challenge.scope, challenge_ref: value.challenge_ref, challenge_nonce: challenge.challengeNonce, public_key_spki: value.public_key_spki })
        verify(publicKey.key, bytes, value.proof_signature, 'enrollment_invalid')
        const scopeKey = bindingKey(challenge.scope)
        const current = draft.sources.get(scopeKey)
        if (challenge.scope.mode === 'rotate' && (!current || current.status !== 'active' || current.source_version !== challenge.scope.source_version || current.key_version + 1 !== challenge.scope.key_version)) fail('enrollment_invalid')
        if (challenge.scope.mode === 'enroll' && current?.status === 'active') fail('enrollment_conflict')
        if ([...draft.sources.values()].some((source) => source.public_key_digest === publicKey.digest && source.status === 'active')) fail('enrollment_conflict')
        const certificateRef = entropyRef('certificate')
        let actions = []
        let initialPublicKey = publicKey.key
        let initialPublicKeySpki = publicKey.spki
        let initialKeyVersion = challenge.scope.key_version
        let lastSequence = 0
        let domainLedgerRevision = 0
        let domainRegistryRevision = 1
        let needsResync = false
        if (challenge.scope.mode === 'rotate') {
          const rebuilt = buildDomain(current, completedAt)
          const rotateInput = { project_id: current.project_id, role: current.role, binding_version: current.binding_version, source_ref: current.source_ref, source_version: current.source_version, expected_registry_revision: rebuilt.registryRevision, expected_key_version: current.key_version, new_key_version: challenge.scope.key_version, new_public_key: publicKey.key }
          let rotated
          try { rotated = rebuilt.domain.rotateKey(rotateInput) } catch { fail('domain_unavailable') }
          if (reentry || rotated?.status !== 'key_rotated') fail('domain_unavailable')
          actions = [...current.actions, { type: 'rotate', at: completedAt, input: rotateInput, public_key_spki: publicKey.spki }]
          initialPublicKey = current.initial_public_key
          initialPublicKeySpki = current.initial_public_key_spki
          initialKeyVersion = current.initial_key_version
          lastSequence = current.last_sequence
          domainLedgerRevision = rotated.ledger_revision
          domainRegistryRevision = rotated.registry_revision
          needsResync = true
        }
        const source = { ...challenge.scope, certificate_ref: certificateRef, public_key: publicKey.key, public_key_spki: publicKey.spki, public_key_digest: publicKey.digest, initial_public_key: initialPublicKey, initial_public_key_spki: initialPublicKeySpki, initial_key_version: initialKeyVersion, status: 'active', actions, last_sequence: lastSequence, domain_ledger_revision: domainLedgerRevision, domain_registry_revision: domainRegistryRevision, needs_resync: needsResync }
        draft.sources.set(scopeKey, source)
        draft.certificates.set(certificateRef, scopeKey)
        if (current) current.status = 'replaced'
        challenge.consumed = true
        draft.revision += 1
        return { commit: true, response: { status: 'source_active', certificate_ref: certificateRef, role: source.role, binding_version: source.binding_version, source_version: source.source_version, key_version: source.key_version } }
      })
    },

    ingest(input) {
      return transact((draft, clock) => {
        requireFeature()
        if (!ingestEnabled) fail('unavailable')
        const value = ownRecord(input, INGEST_FIELDS, new Set(['certificate_ref', 'request_id', 'nonce', 'event', 'request_signature']))
        if (!privateRef(value.certificate_ref) || !privateRef(value.request_id) || !privateRef(value.nonce) || (value.body_bytes !== undefined && (!nonNegativeInteger(value.body_bytes) || value.body_bytes > maxBodyBytes))) fail('input_invalid')
        const scopeKey = draft.certificates.get(value.certificate_ref)
        const source = scopeKey ? draft.sources.get(scopeKey) : null
        if (!source || source.status !== 'active' || source.certificate_ref !== value.certificate_ref) fail('access_denied')
        const requestBytes = canonicalHostedRequestBytes({ certificate_ref: value.certificate_ref, request_id: value.request_id, nonce: value.nonce, event: value.event })
        verify(source.public_key, requestBytes, value.request_signature, 'signature_invalid')
        const digest = createHash('sha256').update(requestBytes).update(value.request_signature).digest('hex')
        const replayKey = `${source.workspace_id}:${bindingKey(source)}:${value.certificate_ref}:${value.request_id}:${value.nonce}`
        const prior = draft.replays.get(replayKey)
        if (prior) {
          if (prior.digest !== digest) fail('request_conflict')
          return { commit: false, response: prior.response }
        }
        const nowValue = clock()
        const recent = (draft.rate.get(value.certificate_ref) ?? []).filter((time) => nowValue - time < rateWindowMs)
        if (recent.length >= rateLimitCount) fail('rate_limited')
        const rebuilt = buildDomain(source, nowValue)
        let domainResponse
        let action
        try {
          if (source.needs_resync) {
            const resyncInput = { expected_ledger_revision: source.domain_ledger_revision, expected_last_sequence: source.last_sequence, event: value.event }
            domainResponse = rebuilt.domain.resync(resyncInput)
            action = { type: 'resync', at: nowValue, input: resyncInput, event: { ...value.event } }
          } else {
            domainResponse = rebuilt.domain.ingest(value.event)
            action = { type: 'ingest', at: nowValue, event: { ...value.event } }
          }
        } catch (error) {
          const code = safeDomainErrorCode(error)
          if (code === 'signature_invalid') fail('signature_invalid')
          if (code === 'out_of_order' || code === 'resync_required') fail('sequence_conflict')
          fail('domain_unavailable')
        }
        if (domainResponse?.status === 'conflict') fail('sequence_conflict')
        if (!domainResponse || !['accepted', 'duplicate', 'resynced'].includes(domainResponse.status) || !nonNegativeInteger(domainResponse.ledger_revision)) fail('domain_unavailable')
        const status = domainResponse.status === 'resynced' ? 'accepted' : domainResponse.status
        const response = { status, ledger_revision: domainResponse.ledger_revision }
        if (domainResponse.status !== 'duplicate') {
          source.actions.push(action)
          source.last_sequence = value.event.sequence
          source.domain_ledger_revision = domainResponse.ledger_revision
          source.domain_registry_revision = rebuilt.registryRevision
          source.needs_resync = false
        }
        draft.replays.set(replayKey, { digest, response })
        draft.rate.set(value.certificate_ref, [...recent, nowValue])
        draft.revision += 1
        return { commit: true, response }
      })
    },

    read(input) {
      return transact((draft, clock) => {
        requireFeature()
        const value = ownRecord(input, READ_FIELDS, READ_FIELDS)
        if (!privateRef(value.viewer_ref) || !VIEWER_CLASSES.has(value.viewer_class) || !safeId(value.project_id)) fail('access_denied')
        const auth = callAuth('authorize_viewer', value.auth_context)
        if (!auth.project_ids.includes(value.project_id)) fail('access_denied')
        const viewer = viewers.find((item) => item.workspace_id === auth.workspace_id && item.viewer_ref === value.viewer_ref && item.viewer_class === value.viewer_class && item.project_ids.includes(value.project_id))
        if (!viewer) fail('access_denied')
        const source = [...draft.sources.values()].find((item) => item.workspace_id === auth.workspace_id && item.project_id === value.project_id && item.status === 'active')
        if (!source) fail('access_denied')
        const rebuilt = buildDomain(source, clock())
        let response
        try { response = rebuilt.domain.read({ viewer_ref: value.viewer_ref, viewer_class: value.viewer_class, project_id: value.project_id }) } catch { fail('domain_unavailable') }
        return { commit: false, response }
      })
    },

    revokeSource(input) {
      return transact((draft) => {
        requireFeature()
        const value = ownRecord(input, REVOKE_FIELDS, REVOKE_FIELDS)
        if (!privateRef(value.certificate_ref) || !nonNegativeInteger(value.expected_revision)) fail('input_invalid')
        const scopeKey = draft.certificates.get(value.certificate_ref)
        const source = scopeKey ? draft.sources.get(scopeKey) : null
        if (!source || source.status !== 'active') fail('access_denied')
        requireOwnerScope(value.auth_context, source)
        if (value.expected_revision !== draft.revision) fail('cas_mismatch')
        source.status = 'revoked'
        draft.revision += 1
        return { commit: true, response: { status: 'source_revoked', revision: draft.revision } }
      })
    },
  })
}
