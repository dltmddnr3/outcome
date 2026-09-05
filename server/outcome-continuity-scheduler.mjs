import { createHash, createPublicKey, verify, randomUUID } from 'node:crypto'
import { isProxy } from 'node:util/types'
import { openSync, closeSync, readFileSync, writeFileSync, fsyncSync, renameSync, unlinkSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'

// Private, event-driven composition beside the existing control-plane API.
// The hosting adapter pins the verification key and checkpoint head. Only signed
// adapter facts enter here; a signature authenticates that boundary, not Cherry.
// The adapter must verify original authority, registry and destination receipts.
const fail = (code) => { throw new Error(`continuity:${code}`) }
const hash = (text) => createHash('sha256').update(text).digest('hex')
const canonical = (v) => JSON.stringify(v, function (key, value) {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]])) : value
})
const record = (value, keys) => {
  if (!value || typeof value !== 'object' || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('shape')
  const d = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(d).length !== keys.length || keys.some((k) => !d[k] || !Object.hasOwn(d[k], 'value') || !d[k].enumerable)) fail('shape')
  return Object.fromEntries(keys.map((k) => [k, d[k].value]))
}
const parse = (text) => {
  if (typeof text !== 'string' || text.length > 8_000_000) fail('encoding')
  let value
  try { value = JSON.parse(text) } catch { fail('encoding') }
  // Signed bytes and checkpoint bytes must have one canonical encoding.
  try { if (canonical(value) !== text) fail('encoding') } catch { fail('encoding') }
  return value
}
const id = (v) => { if (typeof v !== 'string' || !/^[a-z][a-z0-9_-]{0,95}$/.test(v)) fail('identifier'); return v }
const digest = (v) => { if (typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v)) fail('digest'); return v }
const number = (v) => { if (!Number.isSafeInteger(v) || v < 0) fail('number'); return v }
const oneOf = (v, allowed) => { if (!allowed.includes(v)) fail('enum'); return v }
const list = (v) => { if (!Array.isArray(v) || v.length > 256) fail('list'); return v }
const unique = (rows, field) => { if (new Set(rows.map((r) => r[field])).size !== rows.length) fail('duplicate'); return rows }
const JOB_KEYS = ['id', 'workstream', 'kind', 'capability', 'target', 'candidate', 'scope', 'worker', 'binding', 'priority', 'dependencies', 'locks', 'approvalSource', 'parallelGroup']
const job = (v) => {
  const r = record(v, JOB_KEYS)
  for (const k of ['id', 'workstream', 'target', 'worker']) id(r[k])
  oneOf(r.kind, ['implementation', 'preparation', 'qa', 'audit', 'control', 'observer', 'ceo'])
  oneOf(r.capability, ['implement', 'prepare', 'verify', 'audit', 'deploy', 'release', 'credential', 'destructive'])
  for (const k of ['candidate', 'scope', 'binding', 'approvalSource']) digest(r[k])
  number(r.priority)
  if (r.parallelGroup !== null) digest(r.parallelGroup)
  unique(list(r.dependencies).map((d) => { record(d, ['job', 'requires']); id(d.job); oneOf(d.requires, ['accepted', 'terminal']); return d }), 'job')
  list(r.locks).forEach(id)
  if (new Set(r.locks).size !== r.locks.length) fail('duplicate')
  return r
}
const workHash = (j) => {
  // Queue labels/priority do not create a new dispatch budget for the same work.
  const { id: ignored, priority, dependencies, ...identity } = j
  return hash(canonical(identity))
}
export const continuityWorkDigest = (jobJSON) => workHash(job(parse(jobJSON)))

const normalizeConfig = (v) => {
  const c = record(v, ['revision', 'project', 'canonicalTarget', 'queue', 'grants', 'bindings'])
  number(c.revision); id(c.project); id(c.canonicalTarget)
  c.queue = unique(list(c.queue).map(job), 'id')
  c.grants = unique(list(c.grants).map((v) => {
    const g = record(v, ['work', 'source', 'expires']); digest(g.work); digest(g.source); number(g.expires); return g
  }), 'work')
  c.bindings = unique(list(c.bindings).map((v) => {
    const b = record(v, ['worker', 'binding', 'role']); id(b.worker); digest(b.binding)
    oneOf(b.role, ['builder', 'ux_product_qa', 'release_audit', 'specialist', 'control', 'observer', 'ceo']); return b
  }), 'worker')
  return c
}
const initial = () => ({ config: null, intents: [], consumed: [], stopped: [], time: 0, events: [] })
const excluded = (j) => ['control', 'observer', 'ceo'].includes(j.kind)
const authorityReason = (s, j, time) => {
  if (excluded(j)) return 'excluded_role'
  if (s.stopped.includes(j.workstream)) return 'explicit_stop'
  const capability = { implementation: 'implement', preparation: 'prepare', qa: 'verify', audit: 'audit' }[j.kind]
  if (j.capability !== capability) return 'high_risk_or_capability_boundary'
  if (j.kind === 'implementation' && j.target !== s.config.canonicalTarget) return 'canonical_target'
  const g = s.config.grants.find((g) => g.work === workHash(j) && g.source === j.approvalSource && g.expires >= time)
  if (!g) return 'missing_scoped_authority'
  const b = s.config.bindings.find((b) => b.worker === j.worker && b.binding === j.binding)
  const roles = { implementation: ['builder'], preparation: ['builder', 'specialist'], qa: ['ux_product_qa'], audit: ['release_audit'] }
  if (!b || !roles[j.kind].includes(b.role)) return 'binding_drift'
  return null
}
const busy = (s) => s.intents.filter((i) => i.phase !== 'terminal')
const conflict = (a, b) => {
  if (a.worker === b.worker || a.workstream === b.workstream || a.locks.some((k) => b.locks.includes(k))) return true
  if (a.kind === 'implementation' && b.kind === 'implementation') return true
  if (a.target !== b.target) return false
  if (a.kind === 'implementation' || b.kind === 'implementation') return true
  if (['qa', 'audit'].includes(a.kind) && ['qa', 'audit'].includes(b.kind)) return a.candidate !== b.candidate || !a.parallelGroup || a.parallelGroup !== b.parallelGroup
  return false
}
const reason = (s, j, time) => {
  const denied = authorityReason(s, j, time)
  if (denied) return denied
  if (s.consumed.includes(workHash(j))) return 'fingerprint_consumed'
  if (j.dependencies.some((d) => !s.intents.some((i) => i.job.id === d.job && i.phase === 'terminal' && (d.requires === 'terminal' || i.verdict === 'accepted')))) return 'dependency_unmet'
  if (busy(s).some((i) => conflict(j, i.job))) return 'lane_conflict'
  return null
}
const schedule = (s, event) => {
  if (!s.config) return []
  const selected = []
  const queue = [...s.config.queue].sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const j of queue) {
    if (busy(s).length >= 4) break
    if (reason(s, j, event.time)) continue
    const fingerprint = workHash(j)
    const intent = { id: hash(`${s.config.project}:${fingerprint}`), job: j, fingerprint, phase: 'pending', cursor: -1, receipt: null, verdict: null, created: event.time }
    s.intents.push(intent); s.consumed.push(fingerprint); selected.push(intent.id)
  }
  if (busy(s).length < 4 && queue.some((j) => reason(s, j, event.time) === null)) fail('ready_free_unselected')
  return selected
}

const apply = (s, e) => {
  if (e.kind === 'configure') {
    const config = normalizeConfig(e.data)
    if (s.config && (config.project !== s.config.project || config.revision <= s.config.revision)) fail('config_drift')
    // Existing queue IDs cannot be rebound to a different instruction.
    for (const j of config.queue) {
      const prior = s.config?.queue.find((p) => p.id === j.id) ?? s.intents.find((i) => i.job.id === j.id)?.job
      if (prior && canonical(prior) !== canonical(j)) fail('job_identity_drift')
    }
    s.config = config
    for (const i of busy(s)) {
      if (i.phase === 'pending' && (authorityReason(s, i.job, e.time) || !config.queue.some((j) => j.id === i.job.id))) { i.phase = 'terminal'; i.verdict = 'cancelled' }
    }
  } else if (e.kind === 'stop') {
    record(e.data, ['workstream']); id(e.data.workstream)
    if (!s.stopped.includes(e.data.workstream)) s.stopped.push(e.data.workstream)
    for (const i of busy(s)) if (i.job.workstream === e.data.workstream && i.phase === 'pending') { i.phase = 'terminal'; i.verdict = 'cancelled' }
    // A claimed/started worker is not freed by a stop request; terminal readback is required.
  } else {
    const d = record(e.data, e.kind === 'claim' ? ['intent', 'binding'] : ['intent', 'binding', 'phase', 'cursor', 'receipt', 'verdict'])
    digest(d.intent); digest(d.binding)
    const i = s.intents.find((i) => i.id === d.intent)
    if (!i || i.job.binding !== d.binding) fail('intent_binding')
    if (e.kind === 'claim') {
      if (i.phase !== 'pending') fail('claim_consumed')
      if (authorityReason(s, i.job, e.time)) fail('claim_authority')
      i.phase = 'claimed'
    } else {
      oneOf(d.phase, ['delivered', 'started', 'unknown', 'terminal']); number(d.cursor); digest(d.receipt)
      if (d.phase === 'terminal') oneOf(d.verdict, ['accepted', 'prepared', 'failed', 'safe_hold', 'cancelled'])
      else if (d.verdict !== null) fail('verdict')
      if (i.phase === 'pending') fail('claim_required')
      if (i.phase === 'terminal') {
        if (d.phase === 'terminal' && (i.receipt !== d.receipt || i.verdict !== d.verdict)) fail('terminal_conflict')
        return [] // Terminal always supersedes late running badges, even with a larger cursor.
      }
      // A verified terminal receipt outranks a previously observed running badge;
      // source cursors can arrive out of order and must not keep the lane busy.
      if (d.phase !== 'terminal' && d.cursor <= i.cursor) return []
      if (d.phase !== 'terminal' && (i.phase === 'started' || (i.phase === 'delivered' && d.phase === 'unknown'))) return []
      if (d.phase === 'terminal' && s.intents.some((p) => p.id !== i.id && p.receipt === d.receipt)) fail('receipt_replayed')
      i.phase = d.phase; i.cursor = d.cursor; i.receipt = d.receipt; i.verdict = d.verdict
    }
  }
  return schedule(s, e) // Consume terminal AND reserve successors in one state reduction.
}

export function createContinuityScheduler(options) {
  const o = record(options, ['publicKey', 'checkpoint', 'expectedDigest'])
  if (typeof o.publicKey !== 'string') fail('key')
  let key
  try { key = createPublicKey(o.publicKey) } catch { fail('key') }
  if (key.asymmetricKeyType !== 'ed25519') fail('key')
  let state = initial()
  const decode = (text) => {
    const signed = record(parse(text), ['body', 'signature'])
    if (typeof signed.body !== 'string' || typeof signed.signature !== 'string' || !/^[0-9a-f]{128}$/.test(signed.signature)) fail('signature')
    if (!verify(null, Buffer.from(signed.body), key, Buffer.from(signed.signature, 'hex'))) fail('signature')
    const e = record(parse(signed.body), ['id', 'sequence', 'time', 'kind', 'data'])
    id(e.id); number(e.sequence); number(e.time); oneOf(e.kind, ['configure', 'claim', 'observe', 'stop'])
    return e
  }
  const advance = (current, text) => {
    const e = decode(text)
    const prior = current.events.find((row) => row.id === e.id)
    if (prior) {
      if (prior.text !== text) fail('event_conflict')
      return { next: current, selected: [], send: null, duplicate: true }
    }
    if (current.events.length >= 4096 || e.sequence !== current.events.length + 1) fail('sequence')
    if (e.time < current.time) fail('clock_regression')
    const next = structuredClone(current)
    const selected = apply(next, e)
    next.time = e.time; next.events.push({ id: e.id, text })
    return { next, selected, send: e.kind === 'claim' ? e.data.intent : null, duplicate: false }
  }
  if (o.checkpoint !== null) {
    if (typeof o.checkpoint !== 'string' || digest(o.expectedDigest) !== hash(o.checkpoint)) fail('checkpoint_digest')
    const c = record(parse(o.checkpoint), ['schema', 'events'])
    if (c.schema !== 1 || !Array.isArray(c.events) || c.events.length > 4096) fail('checkpoint')
    for (const text of c.events) {
      const r = advance(state, text)
      if (r.duplicate) fail('checkpoint_duplicate')
      state = r.next
    }
  } else if (o.expectedDigest !== null) fail('checkpoint_digest')
  const checkpoint = () => canonical({ schema: 1, events: state.events.map((r) => r.text) })
  return Object.freeze({
    reduce(text) {
      const r = advance(state, text)
      state = r.next
      return { selected: r.selected, send: r.send, duplicate: r.duplicate, checkpoint: checkpoint(), persistenceRequiredBeforeSend: true }
    },
    checkpoint,
    privateView() {
      const holds = (state.config?.queue ?? []).filter((j) => !state.intents.some((i) => i.job.id === j.id)).map((j) => ({ job: j.id, workstream: j.workstream, capability: j.capability, approvingSource: j.approvalSource, reason: reason(state, j, state.time) ?? 'capacity_full', permittedIndependent: busy(state).filter((i) => i.job.workstream !== j.workstream).map((i) => i.job.id) }))
      return structuredClone({ intents: state.intents, holds, needsReadback: state.intents.filter((i) => ['claimed', 'unknown'].includes(i.phase)).map((i) => i.id) })
    },
    projectPublic() {
      const rows = state.intents
      const counts = Object.fromEntries(['pending', 'claimed', 'delivered', 'started', 'unknown', 'terminal'].map((phase) => [phase, rows.filter((i) => i.phase === phase).length]))
      counts.queued = (state.config?.queue ?? []).filter((j) => !excluded(j) && !rows.some((i) => i.job.id === j.id)).length
      counts.accepted = rows.filter((i) => i.verdict === 'accepted').length
      counts.active = counts.started
      counts.implementationActive = rows.filter((i) => i.phase === 'started' && i.job.kind === 'implementation').length
      counts.preparationActive = rows.filter((i) => i.phase === 'started' && i.job.kind === 'preparation').length
      return { counts, free: 4 - busy(state).length, authority: 'projection_only', canDispatch: false, completionAuthority: false, liveCyclesVerified: false }
    },
  })
}

// Single-writer durable CAS for a private adapter-owned path, never called by the
// reducer. Only the successful claimant may use its freshly returned send intent.
// Any failure/ambiguous write requires readback; stale locks are never auto-cleared.
export function commitContinuityCheckpoint(options) {
  const o = record(options, ['path', 'expectedDigest', 'checkpoint'])
  if (typeof o.path !== 'string' || !isAbsolute(o.path) || typeof o.checkpoint !== 'string') fail('storage_input')
  if (o.expectedDigest !== null) digest(o.expectedDigest)
  const c = record(parse(o.checkpoint), ['schema', 'events'])
  if (c.schema !== 1 || !Array.isArray(c.events)) fail('checkpoint')
  const lock = `${o.path}.lock`
  let fd
  try { fd = openSync(lock, 'wx', 0o600) } catch { fail('storage_locked') }
  try {
    let prior = null
    try { prior = readFileSync(o.path, 'utf8') } catch (e) { if (e.code !== 'ENOENT') throw e }
    if ((prior === null ? null : hash(prior)) !== o.expectedDigest) fail('storage_conflict')
    const temp = `${o.path}.next-${randomUUID()}`
    const file = openSync(temp, 'wx', 0o600)
    try { writeFileSync(file, o.checkpoint); fsyncSync(file) } finally { closeSync(file) }
    renameSync(temp, o.path)
    const directory = openSync(dirname(o.path), 'r')
    try { fsyncSync(directory) } finally { closeSync(directory) }
    if (readFileSync(o.path, 'utf8') !== o.checkpoint) fail('storage_readback')
    return { digest: hash(o.checkpoint) }
  } finally {
    // Success moves this attempt's temp to the target. Failure leaves any temp
    // intact as evidence; only our acquired lock is released, never scavenged.
    closeSync(fd); unlinkSync(lock)
  }
}
