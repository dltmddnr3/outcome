import { createHash, createPublicKey } from 'node:crypto'
import { isProxy } from 'node:util/types'

export const DURABLE_REPOSITORY_OPERATIONS = Object.freeze([
  'createEnrollmentChallenge',
  'completeEnrollment',
  'readProjection',
  'revokeSource',
  'rotateSource',
  'ingestEvent',
])

const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const STATUS_CODES = new Set(['작업 준비 중', '구현 진행 중', '테스트 실행 중', '검수 진행 중', '결과 정리 중', '응답 대기 중'])
const SAFE_ID = /^[a-z][a-z0-9_-]{0,63}$/
const PRIVATE_REF = /^[a-z][A-Za-z0-9_-]{7,95}$/
const DIGEST = /^[a-f0-9]{64}$/
const BASE_FIELDS = ['workspace_id', 'project_id', 'role', 'binding_version', 'source_ref', 'source_version', 'expected_durable_revision']
const INPUT_FIELDS = Object.freeze({
  createEnrollmentChallenge: new Set([...BASE_FIELDS, 'idempotency_digest', 'challenge_digest', 'expires_at']),
  completeEnrollment: new Set([...BASE_FIELDS, 'challenge_digest', 'certificate_digest', 'key_version', 'public_key_spki', 'public_key_digest', 'activated_at']),
  readProjection: new Set(BASE_FIELDS),
  revokeSource: new Set([...BASE_FIELDS, 'certificate_digest', 'revoked_at']),
  rotateSource: new Set([...BASE_FIELDS, 'certificate_digest', 'expected_key_version', 'new_key_version', 'public_key_spki', 'public_key_digest', 'rotated_at']),
  ingestEvent: new Set([...BASE_FIELDS, 'certificate_digest', 'request_digest', 'nonce_digest', 'event_digest', 'sequence', 'status_code', 'observed_at', 'expires_at']),
})
const OPTION_FIELDS = new Set(['schema_version', 'rate_limit_count', 'clone', 'before_commit'])

export class ObserverBridgeDurableRepositoryError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ObserverBridgeDurableRepositoryError'
    this.code = code
  }
}

const fail = (code) => { throw new ObserverBridgeDurableRepositoryError(code) }
const positive = (value) => Number.isSafeInteger(value) && value > 0
const nonNegative = (value) => Number.isSafeInteger(value) && value >= 0
const iso = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
const digest = (value) => typeof value === 'string' && DIGEST.test(value)
const canonicalSpkiDigest = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{40,256}$/.test(value)) return null
  let bytes
  try { bytes = Buffer.from(value, 'base64url') } catch { return null }
  if (bytes.length === 0 || bytes.toString('base64url') !== value) return null
  try {
    const key = createPublicKey({ key: bytes, format: 'der', type: 'spki' })
    if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') return null
    const canonical = key.export({ format: 'der', type: 'spki' })
    if (!Buffer.isBuffer(canonical) || !canonical.equals(bytes)) return null
    return createHash('sha256').update(canonical).digest('hex')
  } catch { return null }
}

function ownRecord(value, allowed, code = 'input_invalid') {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail(code)
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail(code) }
  if (prototype !== Object.prototype && prototype !== null) fail(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.length !== allowed.size || keys.some((key) => typeof key !== 'string' || !allowed.has(key))) fail(code)
  const output = Object.create(null)
  for (const key of allowed) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail(code)
    output[key] = descriptor.value
  }
  return output
}

function ownOptions(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) fail('configuration_invalid')
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { fail('configuration_invalid') }
  if (prototype !== Object.prototype && prototype !== null) fail('configuration_invalid')
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !OPTION_FIELDS.has(key))) fail('configuration_invalid')
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('configuration_invalid')
    output[key] = descriptor.value
  }
  return output
}

function exactClone(source, output, seen = new Map()) {
  if (source === null || typeof source !== 'object') {
    if (!Object.is(source, output)) fail('materialization_failed')
    return
  }
  if (typeof output !== 'object' || output === null || output === source || isProxy(output)) fail('materialization_failed')
  let sourcePrototype; let outputPrototype
  try { sourcePrototype = Object.getPrototypeOf(source); outputPrototype = Object.getPrototypeOf(output) } catch { fail('materialization_failed') }
  if (sourcePrototype !== outputPrototype) fail('materialization_failed')
  if (seen.has(source)) {
    if (seen.get(source) !== output) fail('materialization_failed')
    return
  }
  seen.set(source, output)
  const left = Object.getOwnPropertyDescriptors(source)
  const right = Object.getOwnPropertyDescriptors(output)
  const keys = Reflect.ownKeys(left)
  if (keys.length !== Reflect.ownKeys(right).length || keys.some((key) => !Object.hasOwn(right, key))) fail('materialization_failed')
  for (const key of keys) {
    if (!Object.hasOwn(left[key], 'value') || !Object.hasOwn(right[key], 'value') || left[key].enumerable !== right[key].enumerable) fail('materialization_failed')
    exactClone(left[key].value, right[key].value, seen)
  }
}

function validateBase(value) {
  if (!SAFE_ID.test(value.workspace_id) || !SAFE_ID.test(value.project_id) || !ROLES.has(value.role) || !positive(value.binding_version)
    || !PRIVATE_REF.test(value.source_ref) || !positive(value.source_version) || !nonNegative(value.expected_durable_revision)) fail('input_invalid')
}

function validateInput(operation, input) {
  const value = ownRecord(input, INPUT_FIELDS[operation])
  validateBase(value)
  if (operation === 'createEnrollmentChallenge') {
    if (!digest(value.idempotency_digest) || !digest(value.challenge_digest) || !iso(value.expires_at)) fail('input_invalid')
  } else if (operation === 'completeEnrollment') {
    if (!digest(value.challenge_digest) || !digest(value.certificate_digest) || !positive(value.key_version) || !digest(value.public_key_digest) || canonicalSpkiDigest(value.public_key_spki) !== value.public_key_digest || !iso(value.activated_at)) fail('input_invalid')
  } else if (operation === 'revokeSource') {
    if (!digest(value.certificate_digest) || !iso(value.revoked_at)) fail('input_invalid')
  } else if (operation === 'rotateSource') {
    if (!digest(value.certificate_digest) || !positive(value.expected_key_version) || value.new_key_version !== value.expected_key_version + 1 || !digest(value.public_key_digest) || canonicalSpkiDigest(value.public_key_spki) !== value.public_key_digest || !iso(value.rotated_at)) fail('input_invalid')
  } else if (operation === 'ingestEvent') {
    if (![value.certificate_digest, value.request_digest, value.nonce_digest, value.event_digest].every(digest) || !positive(value.sequence) || !STATUS_CODES.has(value.status_code) || !iso(value.observed_at) || !iso(value.expires_at) || Date.parse(value.expires_at) <= Date.parse(value.observed_at)) fail('input_invalid')
  }
  return value
}

const scopeKey = (value) => [value.workspace_id, value.project_id, value.role, value.binding_version, value.source_ref, value.source_version].join('\u001f')
const sameScope = (left, right) => scopeKey(left) === scopeKey(right)
const cloneMap = (value) => new Map([...value].map(([key, item]) => [key, structuredClone(item)]))
const cloneState = (state) => ({
  durableRevision: state.durableRevision,
  challenges: cloneMap(state.challenges),
  sources: cloneMap(state.sources),
  keys: cloneMap(state.keys),
  certificates: cloneMap(state.certificates),
  replays: cloneMap(state.replays),
  idempotency: cloneMap(state.idempotency),
  rate: cloneMap(state.rate),
  events: cloneMap(state.events),
  projections: cloneMap(state.projections),
  audit: state.audit.map((item) => structuredClone(item)),
})

export function createObserverBridgeDurableRepositoryMemoryFake(options = {}) {
  const supplied = ownOptions(options)
  const config = { schema_version: supplied.schema_version ?? 1, rate_limit_count: supplied.rate_limit_count ?? 60, clone: supplied.clone ?? structuredClone, before_commit: supplied.before_commit ?? (async () => {}) }
  if (![1, 2].includes(config.schema_version) || !positive(config.rate_limit_count) || typeof config.clone !== 'function' || isProxy(config.clone) || typeof config.before_commit !== 'function' || isProxy(config.before_commit)) fail('configuration_invalid')
  let state = {
    durableRevision: 0,
    challenges: new Map(), sources: new Map(), keys: new Map(), certificates: new Map(), replays: new Map(), idempotency: new Map(), rate: new Map(), events: new Map(), projections: new Map(), audit: [],
  }
  let busy = false
  let reentered = false

  const materializeInput = (operation, input) => {
    const value = validateInput(operation, input)
    let copy
    try { copy = config.clone(value) } catch { fail('input_invalid') }
    const materialized = validateInput(operation, copy)
    try { exactClone(value, materialized) } catch { fail('input_invalid') }
    return materialized
  }

  const transact = async (operation, input, action) => {
    if (busy) { reentered = true; fail('reentrant_operation') }
    const value = materializeInput(operation, input)
    busy = true
    reentered = false
    try {
      if (config.schema_version !== 1) fail('schema_mismatch')
      if (value.expected_durable_revision !== state.durableRevision) fail('revision_conflict')
      const draft = cloneState(state)
      const outcome = action(draft, value)
      let response
      try { response = config.clone(outcome.response) } catch { fail('materialization_failed') }
      exactClone(outcome.response, response)
      try { await config.before_commit() } catch (error) {
        if (error instanceof ObserverBridgeDurableRepositoryError) throw error
        fail('storage_unavailable')
      }
      if (reentered) fail('reentrant_operation')
      if (outcome.commit) state = draft
      return response
    } finally {
      busy = false
    }
  }

  const createEnrollmentChallenge = async (input) => transact('createEnrollmentChallenge', input, (draft, value) => {
    const key = scopeKey(value)
    const prior = draft.idempotency.get(value.idempotency_digest)
    if (prior) {
      if (!sameScope(prior, value) || prior.challenge_digest !== value.challenge_digest) fail('idempotency_conflict')
      return { commit: false, response: { status: 'duplicate', durable_revision: draft.durableRevision } }
    }
    if (draft.challenges.has(value.challenge_digest) || draft.sources.get(key)?.status === 'active') fail('enrollment_conflict')
    draft.challenges.set(value.challenge_digest, { ...value, state: 'pending' })
    draft.idempotency.set(value.idempotency_digest, { ...value })
    draft.audit.push({ action: 'challenge_created', revision: draft.durableRevision + 1 })
    draft.durableRevision += 1
    return { commit: true, response: { status: 'challenge_created', durable_revision: draft.durableRevision } }
  })

  const completeEnrollment = async (input) => transact('completeEnrollment', input, (draft, value) => {
    const challenge = draft.challenges.get(value.challenge_digest)
    if (!challenge || !sameScope(challenge, value)) fail('access_denied')
    if (challenge.state !== 'pending' || Date.parse(challenge.expires_at) <= Date.parse(value.activated_at)) fail('enrollment_invalid')
    const key = scopeKey(value)
    if (draft.sources.get(key)?.status === 'active' || draft.certificates.has(value.certificate_digest)) fail('enrollment_conflict')
    challenge.state = 'consumed'
    const { public_key_spki: publicKeySpki, ...sourceValue } = value
    draft.sources.set(key, { ...sourceValue, status: 'active', key_version: value.key_version })
    draft.keys.set(`${key}\u001f${value.key_version}`, { public_key_spki: publicKeySpki, public_key_digest: value.public_key_digest, status: 'active' })
    draft.certificates.set(value.certificate_digest, { scope: key, status: 'active' })
    draft.projections.set(key, null)
    draft.audit.push({ action: 'source_active', revision: draft.durableRevision + 1 })
    draft.durableRevision += 1
    return { commit: true, response: { status: 'source_active', durable_revision: draft.durableRevision, source_version: value.source_version, key_version: value.key_version } }
  })

  const readProjection = async (input) => transact('readProjection', input, (draft, value) => {
    const key = scopeKey(value)
    if (draft.sources.get(key)?.status !== 'active') fail('access_denied')
    return { commit: false, response: { status: 'projection_read', durable_revision: draft.durableRevision, projection: structuredClone(draft.projections.get(key) ?? null) } }
  })

  const revokeSource = async (input) => transact('revokeSource', input, (draft, value) => {
    const key = scopeKey(value)
    const source = draft.sources.get(key)
    const certificate = draft.certificates.get(value.certificate_digest)
    if (source?.status !== 'active' || certificate?.scope !== key || certificate.status !== 'active') fail('access_denied')
    source.status = 'revoked'
    certificate.status = 'revoked'
    for (const [entryKey, item] of draft.keys) if (entryKey.startsWith(`${key}\u001f`)) item.status = 'revoked'
    draft.audit.push({ action: 'source_revoked', revision: draft.durableRevision + 1 })
    draft.durableRevision += 1
    return { commit: true, response: { status: 'source_revoked', durable_revision: draft.durableRevision } }
  })

  const rotateSource = async (input) => transact('rotateSource', input, (draft, value) => {
    const key = scopeKey(value)
    const source = draft.sources.get(key)
    const certificate = draft.certificates.get(value.certificate_digest)
    if (source?.status !== 'active' || certificate?.scope !== key || certificate.status !== 'active') fail('access_denied')
    if (source.key_version !== value.expected_key_version) fail('revision_conflict')
    const prior = draft.keys.get(`${key}\u001f${value.expected_key_version}`)
    if (!prior || prior.status !== 'active') fail('access_denied')
    prior.status = 'replaced'
    draft.keys.set(`${key}\u001f${value.new_key_version}`, { public_key_spki: value.public_key_spki, public_key_digest: value.public_key_digest, status: 'active' })
    source.key_version = value.new_key_version
    draft.audit.push({ action: 'key_rotated', revision: draft.durableRevision + 1 })
    draft.durableRevision += 1
    return { commit: true, response: { status: 'key_rotated', durable_revision: draft.durableRevision, key_version: value.new_key_version } }
  })

  const ingestEvent = async (input) => transact('ingestEvent', input, (draft, value) => {
    const key = scopeKey(value)
    const source = draft.sources.get(key)
    const certificate = draft.certificates.get(value.certificate_digest)
    if (source?.status !== 'active' || certificate?.scope !== key || certificate.status !== 'active') fail('access_denied')
    const replayKey = `${key}\u001f${value.request_digest}\u001f${value.nonce_digest}`
    const replay = draft.replays.get(replayKey)
    if (replay) {
      if (replay.event_digest !== value.event_digest) fail('request_conflict')
      return { commit: false, response: { status: 'duplicate', durable_revision: draft.durableRevision, sequence: replay.sequence } }
    }
    const used = draft.rate.get(value.certificate_digest) ?? 0
    if (used >= config.rate_limit_count) fail('rate_limited')
    const current = draft.projections.get(key)
    if (current && value.sequence !== current.sequence + 1 || !current && value.sequence !== 1) fail('sequence_conflict')
    const projection = { sequence: value.sequence, status_code: value.status_code, observed_at: value.observed_at, expires_at: value.expires_at }
    draft.replays.set(replayKey, { event_digest: value.event_digest, sequence: value.sequence })
    draft.rate.set(value.certificate_digest, used + 1)
    draft.events.set(`${key}\u001f${value.sequence}`, projection)
    draft.projections.set(key, projection)
    draft.audit.push({ action: 'event_accepted', revision: draft.durableRevision + 1 })
    draft.durableRevision += 1
    return { commit: true, response: { status: 'accepted', durable_revision: draft.durableRevision, sequence: value.sequence } }
  })

  return Object.freeze({ createEnrollmentChallenge, completeEnrollment, readProjection, revokeSource, rotateSource, ingestEvent })
}
