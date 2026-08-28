import { createPublicKey, verify } from 'node:crypto'
import { isProxy } from 'node:util/types'

const AUTHORITY_PUBLIC_KEY = createPublicKey(`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAdwx1zFiFyJYsiA2ffdTTFEDA4BeL++oAzpT92jBp32s=
-----END PUBLIC KEY-----`)
const trustedVerifiers = new WeakSet()
const fail = (code) => { throw new Error(code) }
const exactObject = (value, keys) => {
  if (!value || typeof value !== 'object' || isProxy(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail('trusted_evidence_invalid')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !Object.hasOwn(descriptors[key], 'value') || descriptors[key].enumerable !== true)) fail('trusted_evidence_invalid')
  const actual = Object.keys(descriptors).sort(); const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail('trusted_evidence_invalid')
  return Object.fromEntries(actual.map((key) => [key, descriptors[key].value]))
}
const START = ['kind','project_id','role','binding_version','public_alias','instruction_id','attempt_id','destination_key','observation_cursor','receipt_id','issued_at','expires_at']
const PROVIDER = ['kind','project_id','role','binding_version','instruction_id','attempt_id','destination_key','observation_cursor','receipt_id','issued_at','expires_at']
const DESTINATION = [...PROVIDER, 'observation_kind']
const EXPECT_START = ['project_id','role','binding_version','public_alias','instruction_id','attempt_id']
const EXPECT_CORRELATED = ['project_id','role','binding_version','instruction_id','attempt_id','destination_key']
const safeInteger = (value) => Number.isSafeInteger(value) ? value : fail('trusted_evidence_invalid')
const same = (facts, expected, keys) => keys.every((key) => facts[key] === expected[key])

export const isTrustedRoleEvidenceResolver = (value) => trustedVerifiers.has(value)

export function createTrustedRoleEvidenceVerifier({ clock = Date.now } = {}) {
  if (typeof clock !== 'function') fail('trusted_verifier_invalid')
  const consumed = new Set()
  const inspect = (token, kind, expected) => {
    let envelope
    try { envelope = exactObject(token, ['payload', 'signature']) } catch { fail('trusted_evidence_required') }
    const keys = kind === 'start' ? START : kind === 'provider_send' ? PROVIDER : DESTINATION
    let payload
    try { payload = exactObject(envelope.payload, keys) } catch { fail('trusted_evidence_required') }
    if (payload.kind !== kind || typeof envelope.signature !== 'string' || !verify(null, Buffer.from(JSON.stringify(envelope.payload)), AUTHORITY_PUBLIC_KEY, Buffer.from(envelope.signature, 'base64'))) fail('trusted_evidence_required')
    const now = clock(); if (!Number.isFinite(now)) fail('trusted_clock_unavailable')
    if (safeInteger(payload.issued_at) > now || now > safeInteger(payload.expires_at)) fail('trusted_evidence_stale')
    if (!same(payload, expected, kind === 'start' ? EXPECT_START : EXPECT_CORRELATED)) fail('trusted_evidence_mismatch')
    if (!Number.isSafeInteger(payload.binding_version) || payload.binding_version < 1 || !Number.isSafeInteger(payload.observation_cursor) || payload.observation_cursor < 0 || typeof payload.receipt_id !== 'string' || !payload.receipt_id) fail('trusted_evidence_invalid')
    if (kind === 'destination_start' && !['new_turn', 'started'].includes(payload.observation_kind)) fail('trusted_evidence_invalid')
    return { ...payload, consumed: consumed.has(payload.receipt_id) }
  }
  const verifier = Object.freeze({
    inspectStart: (token, expected) => inspect(token, 'start', expected),
    inspectProvider: (token, expected) => inspect(token, 'provider_send', expected),
    inspectDestination: (token, expected) => inspect(token, 'destination_start', expected),
    commit(token) { const envelope = exactObject(token, ['payload', 'signature']); const receiptId = envelope.payload?.receipt_id; if (typeof receiptId !== 'string' || consumed.has(receiptId)) fail('trusted_evidence_replayed'); consumed.add(receiptId) },
  })
  trustedVerifiers.add(verifier)
  return verifier
}
