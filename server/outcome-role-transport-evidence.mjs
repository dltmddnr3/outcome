import { createHash } from 'node:crypto'
import { isProxy } from 'node:util/types'

const trustedResolvers = new WeakSet()
const fail = (code) => { throw new Error(code) }
const record = (value, keys) => {
  if (!value || typeof value !== 'object' || isProxy(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail('trusted_evidence_invalid')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !Object.hasOwn(descriptors[key], 'value') || descriptors[key].enumerable !== true)) fail('trusted_evidence_invalid')
  const actual = Object.keys(descriptors).sort(); const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail('trusted_evidence_invalid')
  return Object.fromEntries(actual.map((key) => [key, descriptors[key].value]))
}
const text = (value) => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,95}$/.test(value) ? value : fail('trusted_evidence_invalid')
const version = (value) => Number.isSafeInteger(value) && value > 0 ? value : fail('trusted_evidence_invalid')
const cursor = (value) => Number.isSafeInteger(value) && value >= 0 ? value : fail('trusted_evidence_invalid')
const destinationKey = (value) => `destination_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`
const same = (left, right, keys) => keys.every((key) => left[key] === right[key])
const START_KEYS = ['project_id', 'role', 'binding_version', 'public_alias', 'instruction_id', 'attempt_id']
const CORRELATION_KEYS = ['project_id', 'role', 'binding_version', 'instruction_id', 'attempt_id', 'destination_key']

export const isTrustedRoleEvidenceResolver = (value) => trustedResolvers.has(value)

export function createTrustedRoleEvidenceResolver({ bindings, peer_threads, clock = Date.now, ttl_ms = 30_000 } = {}) {
  if (!Array.isArray(bindings) || !Array.isArray(peer_threads) || typeof clock !== 'function' || !Number.isSafeInteger(ttl_ms) || ttl_ms < 1) fail('trusted_resolver_invalid')
  const normalizedBindings = bindings.map((item) => {
    const row = record(item, ['project_id', 'role', 'binding_version', 'public_alias', 'state', 'destination_ref'])
    return { project_id: text(row.project_id), role: text(row.role), binding_version: version(row.binding_version), public_alias: text(row.public_alias), state: text(row.state), destination_ref: typeof row.destination_ref === 'string' && row.destination_ref ? row.destination_ref : fail('trusted_resolver_invalid') }
  })
  const normalizedThreads = peer_threads.map((item) => {
    const row = record(item, ['project_id', 'role', 'destination_ref', 'observation_cursor'])
    return { project_id: text(row.project_id), role: text(row.role), destination_ref: typeof row.destination_ref === 'string' && row.destination_ref ? row.destination_ref : fail('trusted_resolver_invalid'), observation_cursor: cursor(row.observation_cursor) }
  })
  const evidence = new WeakMap()
  const consumed = new WeakSet()
  let nextReceipt = 1
  const now = () => { const value = clock(); if (!Number.isFinite(value)) fail('trusted_clock_unavailable'); return value }
  const issue = (kind, facts) => {
    const token = Object.freeze(Object.create(null))
    const issuedAt = now()
    evidence.set(token, Object.freeze({ kind, receipt_id: `resolver_receipt_${nextReceipt++}`, issued_at: issuedAt, expires_at: issuedAt + ttl_ms, ...facts }))
    return token
  }
  const inspect = (token, kind, expected) => {
    const facts = evidence.get(token)
    if (!facts || facts.kind !== kind) fail('trusted_evidence_required')
    if (now() > facts.expires_at) fail('trusted_evidence_stale')
    if (!same(facts, expected, kind === 'start' ? START_KEYS : CORRELATION_KEYS)) fail('trusted_evidence_mismatch')
    return { ...facts, consumed: consumed.has(token) }
  }
  const resolver = Object.freeze({
    resolveStart(value) {
      const facts = record(value, START_KEYS)
      const normalized = { project_id: text(facts.project_id), role: text(facts.role), binding_version: version(facts.binding_version), public_alias: text(facts.public_alias), instruction_id: text(facts.instruction_id), attempt_id: text(facts.attempt_id) }
      const matches = normalizedBindings.filter((binding) => binding.project_id === normalized.project_id && binding.role === normalized.role && binding.binding_version === normalized.binding_version && binding.public_alias === normalized.public_alias && binding.state === 'active')
      if (matches.length !== 1) fail('trusted_resolution_failed')
      const threads = normalizedThreads.filter((thread) => thread.project_id === normalized.project_id && thread.role === normalized.role && thread.destination_ref === matches[0].destination_ref)
      if (threads.length !== 1) fail('trusted_resolution_failed')
      return issue('start', { ...normalized, destination_key: destinationKey(matches[0].destination_ref), observation_cursor: threads[0].observation_cursor })
    },
    providerSend(startEvidence, { observation_cursor } = {}) {
      const start = evidence.get(startEvidence)
      if (!start || start.kind !== 'start' || !consumed.has(startEvidence)) fail('trusted_evidence_required')
      const nextCursor = cursor(observation_cursor)
      if (nextCursor <= start.observation_cursor) fail('trusted_evidence_stale')
      return issue('provider_send', Object.fromEntries([...CORRELATION_KEYS.map((key) => [key, start[key]]), ['observation_cursor', nextCursor]]))
    },
    destinationStart(providerEvidence, { observation_cursor, observation_kind } = {}) {
      const provider = evidence.get(providerEvidence)
      if (!provider || provider.kind !== 'provider_send' || !consumed.has(providerEvidence)) fail('trusted_evidence_required')
      const nextCursor = cursor(observation_cursor)
      if (nextCursor <= provider.observation_cursor || !['new_turn', 'started'].includes(observation_kind)) fail('trusted_evidence_stale')
      return issue('destination_start', { ...Object.fromEntries(CORRELATION_KEYS.map((key) => [key, provider[key]])), observation_cursor: nextCursor, observation_kind })
    },
    inspectStart(token, expected) { return inspect(token, 'start', expected) },
    inspectProvider(token, expected) { return inspect(token, 'provider_send', expected) },
    inspectDestination(token, expected) { return inspect(token, 'destination_start', expected) },
    commit(token) { if (!evidence.has(token) || consumed.has(token)) fail('trusted_evidence_replayed'); consumed.add(token) },
  })
  trustedResolvers.add(resolver)
  return resolver
}
