import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isProxy } from 'node:util/types'
import { isTrustedRoleEvidenceResolver } from './outcome-role-transport-evidence.mjs'
import { commitContinuityCheckpoint } from './outcome-continuity-scheduler.mjs'

// Private host composition only. The host owns the genuine scheduler instance,
// its verification root, storage leases and correlation inputs. No public route,
// external transport, signer, registry resolver or callback seam is created here.
const fail = (code) => { throw new Error(`continuity_adapter:${code}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')
const receiptIndex = (id) => sha('outcome-role-evidence-receipt-v1\0' + id)
const hex = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const descriptors = (v) => {
  if (!v || typeof v !== 'object' || isProxy(v) || Object.getPrototypeOf(v) !== Object.prototype) fail('shape')
  const d = Object.getOwnPropertyDescriptors(v)
  for (const key of Reflect.ownKeys(d)) if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || !Object.hasOwn(d[key], 'value') || !d[key].enumerable) fail('shape')
  return d
}
const exact = (v, keys) => {
  const d = descriptors(v)
  if (Object.keys(d).length !== keys.length || keys.some(k => !Object.hasOwn(d, k))) fail('shape')
  return Object.fromEntries(keys.map(k => [k, d[k].value]))
}
const copyData = (v, seen = new Set()) => {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (!v || typeof v !== 'object' || isProxy(v) || seen.has(v)) fail('shape')
  seen.add(v)
  let result
  if (Array.isArray(v)) {
    if (Object.getPrototypeOf(v) !== Array.prototype) fail('shape')
    const d = Object.getOwnPropertyDescriptors(v)
    if (Reflect.ownKeys(d).length !== v.length + 1) fail('shape')
    result = []
    for (let n = 0; n < v.length; n++) { if (!d[n] || !Object.hasOwn(d[n], 'value') || !d[n].enumerable) fail('shape'); result.push(copyData(d[n].value, seen)) }
  } else {
    const d = descriptors(v)
    // Preserve original payload insertion order for the existing verifier's
    // signature domain. Sorting belongs only to adapterCanonical below.
    result = Object.fromEntries(Object.keys(d).map(k => [k, copyData(d[k].value, seen)]))
  }
  seen.delete(v)
  return result
}
export const adapterCanonical = (value) => JSON.stringify(copyData(value), function (k, v) {
  return v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v
})
const parse = (s) => {
  if (typeof s !== 'string' || s.length > 8_000_000) fail('encoding')
  let value
  try { value = JSON.parse(s) } catch { fail('encoding') }
  if (adapterCanonical(value) !== s) fail('encoding')
  return value
}
export function adapterExpectedSnapshot(input, keys) {
  const names = copyData(keys)
  if (!Array.isArray(names) || names.some(k => typeof k !== 'string') || new Set(names).size !== names.length) fail('shape')
  const r = exact(input, names)
  for (const v of Object.values(r)) if (!(typeof v === 'string' && v.length > 0) && !Number.isSafeInteger(v)) fail('shape')
  return r
}

// Pure index/mapping helper, NOT an attestation API. Its facts precondition is
// established by tick's genuine inspect call. Calling this helper in isolation
// computes data only; it can neither consume evidence nor reach the reducer.
export function adapterFactsToEventData(facts, kind) {
  const f = copyData(facts)
  if (!f || typeof f.receipt_id !== 'string' || !f.receipt_id) fail('receipt_shape')
  if (!hex(f.intent) || !hex(f.binding) || !Number.isSafeInteger(f.observation_cursor) || f.observation_cursor < 0) fail('evidence_mismatch')
  if (kind === 'terminal') fail('verdict_mapping_undecided')
  if (kind === 'claim' && f.kind === 'start') return { intent: f.intent, binding: f.binding }
  if (!(kind === 'delivered' && f.kind === 'provider_send') && !(kind === 'started' && f.kind === 'destination_start' && ['new_turn', 'started'].includes(f.observation_kind))) fail('phase_unattested')
  return { intent: f.intent, binding: f.binding, phase: kind, cursor: f.observation_cursor, receipt: receiptIndex(f.receipt_id), verdict: null }
}
const START = ['project_id', 'role', 'binding_version', 'public_alias', 'instruction_id', 'attempt_id']
const CORRELATED = ['project_id', 'role', 'binding_version', 'instruction_id', 'attempt_id', 'destination_key']
const REASONS = ['timeout', 'missing_ack', 'operator_cancelled', 'execution_failed', 'evidence_conflict', 'authority_boundary']
const LEDGER_KEYS = ['receipt_id', 'receipt_digest', 'payload_digest', 'event_digest', 'attestation', 'phase', 'reason_class']
const DESCRIPTOR_KEYS = ['intent_id', 'job_id', 'workstream', 'worker', 'binding', 'created_at', 'checkpoint_head']
const pathValid = (v) => typeof v === 'string' && v.startsWith('/') && !v.includes('\0') && v.split('/').slice(1).every(part => part && part !== '.' && part !== '..')
const fileState = (text) => { const r = exact(parse(text), ['schema', 'events']); if (r.schema !== 1 || !Array.isArray(r.events)) fail('shape'); return r }
const storageCode = (error) => error instanceof Error && /^continuity:storage_[a-z_]+$/.test(error.message) ? error.message.slice('continuity:'.length) : 'storage_failure'

export function createContinuityAdapter(options) {
  const o = exact(options, ['verifier', 'scheduler', 'checkpointPath', 'checkpointDigest', 'ledgerPath', 'ledgerDigest', 'descriptorPath', 'descriptorDigest', 'now'])
  const paths = [o.checkpointPath, o.ledgerPath, o.descriptorPath]
  if (paths.some(p => !pathValid(p)) || [o.checkpointDigest, o.ledgerDigest, o.descriptorDigest].some(d => d !== null && !hex(d))) fail('storage_input')
  for (const a of paths) for (const b of paths) if (a !== b && (a === b + '.lock' || a.startsWith(b + '.next-'))) fail('storage_input')
  if (new Set(paths).size !== 3) fail('storage_input')
  if (!Number.isSafeInteger(o.now)) fail('clock')
  if (!isTrustedRoleEvidenceResolver(o.verifier)) fail('invalid_dependency')
  const methods = exact(o.scheduler, ['reduce', 'checkpoint', 'privateView', 'projectPublic'])
  if (!Object.isFrozen(o.scheduler) || Object.values(methods).some(v => typeof v !== 'function')) fail('invalid_dependency')
  // Scheduler is a host-owned dependency, not reconstructed from caller methods.
  const checkpoint = fileState(o.scheduler.checkpoint())
  const heads = {
    checkpoint: { digest: o.checkpointDigest, count: checkpoint.events.length },
    ledger: { digest: o.ledgerDigest, count: 0 }, descriptor: { digest: o.descriptorDigest, count: 0 },
  }
  const load = (path, expected) => {
    if (expected === null) return [] // Expect absent; CAS, not a probe, decides creation.
    let text
    try { text = readFileSync(path, 'utf8') } catch { fail('storage_conflict') }
    if (sha(text) !== expected) fail('storage_conflict')
    return fileState(text).events
  }
  const ledger = load(o.ledgerPath, o.ledgerDigest)
  const descriptorRows = load(o.descriptorPath, o.descriptorDigest)
  const receipts = new Set()
  for (const value of ledger) {
    const row = exact(value, LEDGER_KEYS)
    if (!hex(row.receipt_digest) || !hex(row.event_digest) || !['signed', 'unsigned_classification'].includes(row.attestation)) fail('shape')
    if (row.attestation === 'signed') {
      if (typeof row.receipt_id !== 'string' || !row.receipt_id || !hex(row.payload_digest) || row.receipt_digest !== receiptIndex(row.receipt_id) || receipts.has(row.receipt_id) || !['claim', 'delivered', 'started'].includes(row.phase) || row.reason_class !== null) fail('shape')
      receipts.add(row.receipt_id)
    } else if (row.receipt_id !== null || row.payload_digest !== null || row.phase !== 'unknown' || !REASONS.includes(row.reason_class)) fail('shape')
  }
  for (const value of descriptorRows) {
    const row = exact(value, DESCRIPTOR_KEYS)
    if (![row.intent_id, row.binding, row.checkpoint_head].every(hex) || !Number.isSafeInteger(row.created_at) || ['job_id', 'workstream', 'worker'].some(k => typeof row[k] !== 'string')) fail('shape')
  }
  heads.ledger.count = ledger.length; heads.descriptor.count = descriptorRows.length
  let closed = false
  const persist = (which, path, text, count) => {
    try { const result = commitContinuityCheckpoint({ path, expectedDigest: heads[which].digest, checkpoint: text }); heads[which] = { digest: result.digest, count } }
    catch (error) {
      // Only these CAS refusals prove the target was not written. Native I/O,
      // readback and finalization errors may follow persistence: never keep an
      // apparently known old head or adopt bytes to resolve that uncertainty.
      if (!['storage_input', 'storage_locked', 'storage_conflict'].includes(storageCode(error))) heads[which] = { digest: 'UNKNOWN', count: null }
      throw error
    }
  }
  return Object.freeze({
    checkpointHead: () => ({ ...heads.checkpoint }),
    ledgerHead: () => ({ ...heads.ledger }),
    descriptorHead: () => ({ ...heads.descriptor }),
    tick(signedEventText, verifiedToken, expectedInput) {
      if (closed) fail('tick_closed')
      closed = true // One constructor/now snapshot per tick; failure never retries.
      const envelope = exact(parse(signedEventText), ['body', 'signature'])
      const event = exact(parse(envelope.body), ['id', 'sequence', 'time', 'kind', 'data'])
      if (!['claim', 'observe'].includes(event.kind)) fail('event_kind')
      const data = exact(event.data, event.kind === 'claim' ? ['intent', 'binding'] : ['intent', 'binding', 'phase', 'cursor', 'receipt', 'verdict'])
      const phase = event.kind === 'claim' ? 'claim' : data.phase
      if (phase === 'terminal') fail('verdict_mapping_undecided')
      if (!['claim', 'delivered', 'started', 'unknown'].includes(phase)) fail('phase_unattested')
      const view = copyData(o.scheduler.privateView())
      const intent = view.intents.find(i => i.id === data.intent && i.job.binding === data.binding)
      if (!intent) fail('intent_binding')
      let token = null, facts = null, reason = null, mapped
      if (phase === 'unknown') {
        if (verifiedToken !== null) fail('phase_unattested')
        const input = adapterExpectedSnapshot(expectedInput, ['reason_class'])
        if (!REASONS.includes(input.reason_class)) fail('reason_class')
        reason = input.reason_class
        mapped = data // Binding/intent classification; scheduler still verifies its envelope.
      } else {
        const expected = adapterExpectedSnapshot(expectedInput, phase === 'claim' ? START : CORRELATED)
        // Only semantically available fields are derived. Correlation IDs and
        // binding version must remain host-resolved, signature-matched inputs.
        const configs = checkpoint.events.map(t => parse(parse(t).body)).filter(e => e.kind === 'configure')
        const config = configs.at(-1)?.data
        const binding = config?.bindings.find(b => b.worker === intent.job.worker && b.binding === intent.job.binding)
        if (!config || expected.project_id !== config.project || expected.role !== binding?.role) fail('evidence_mismatch')
        const safeExpected = { ...expected, project_id: config.project, role: binding.role }
        token = copyData(verifiedToken)
        exact(token, ['payload', 'signature'])
        const kind = { claim: 'start', delivered: 'provider_send', started: 'destination_start' }[phase]
        if (token.payload?.kind !== kind) fail('phase_unattested')
        const inspect = { claim: 'inspectStart', delivered: 'inspectProvider', started: 'inspectDestination' }[phase]
        facts = o.verifier[inspect](token, safeExpected)
        if (facts.consumed || receipts.has(facts.receipt_id)) fail('receipt_replayed')
        if (!(facts.issued_at <= o.now && o.now <= facts.expires_at)) fail('clock')
        mapped = adapterFactsToEventData({ ...facts, intent: intent.id, binding: intent.job.binding }, phase)
        if (adapterCanonical(mapped) !== adapterCanonical(data)) fail('evidence_mismatch')
      }
      const row = {
        receipt_id: facts ? facts.receipt_id : null,
        receipt_digest: facts ? receiptIndex(facts.receipt_id) : data.receipt,
        payload_digest: facts ? sha(JSON.stringify(token.payload)) : null,
        event_digest: sha(signedEventText), attestation: facts ? 'signed' : 'unsigned_classification', phase, reason_class: reason,
      }
      const ledgerText = adapterCanonical({ schema: 1, events: [...ledger, row] })
      // Capacity preflight precedes every write; it is not a rotation policy.
      if (ledgerText.length > 8_000_000) fail('ledger_capacity')
      const reduction = o.scheduler.reduce(signedEventText)
      persist('checkpoint', o.checkpointPath, reduction.checkpoint, fileState(reduction.checkpoint).events.length)
      try { persist('ledger', o.ledgerPath, ledgerText, ledger.length + 1) }
      catch (error) { fail(`ledger_behind_checkpoint:${storageCode(error)}`) }
      if (facts) o.verifier.commit(token)
      let descriptor = null
      if (reduction.send !== null) {
        descriptor = { intent_id: intent.id, job_id: intent.job.id, workstream: intent.job.workstream, worker: intent.job.worker, binding: intent.job.binding, created_at: o.now, checkpoint_head: heads.checkpoint.digest }
        const text = adapterCanonical({ schema: 1, events: [...descriptorRows, descriptor] })
        persist('descriptor', o.descriptorPath, text, descriptorRows.length + 1)
      }
      return { data: copyData(mapped), descriptor, attestation: row.attestation, reason_class: reason, completionAuthority: false }
    },
  })
}
