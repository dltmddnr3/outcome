import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import fs, { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync, statSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createContinuityScheduler, continuityWorkDigest, commitContinuityCheckpoint } from './outcome-continuity-scheduler.mjs'

const canonical = (v) => JSON.stringify(v, function (key, value) { return value && !Array.isArray(value) && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]])) : value })
const sha = (v) => createHash('sha256').update(v).digest('hex')
const keys = generateKeyPairSync('ed25519')
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' })
const make = (checkpoint = null) => createContinuityScheduler({ publicKey, checkpoint, expectedDigest: checkpoint === null ? null : sha(checkpoint) })
const work = (n, overrides = {}) => ({ id: `job_${n}`, workstream: `stream_${n}`, kind: n % 4 === 0 ? 'implementation' : 'preparation', capability: n % 4 === 0 ? 'implement' : 'prepare', target: n % 4 === 0 ? 'canonical' : `target_${n}`, candidate: sha('candidate'), scope: sha(`scope_${n}`), worker: `worker_${n % 4}`, binding: sha(`binding_${n % 4}`), priority: n, dependencies: [], locks: [], approvalSource: sha('direct_authority'), parallelGroup: null, ...overrides })
const config = (queue, overrides = {}) => ({ revision: 1, project: 'outcome', canonicalTarget: 'canonical', queue, grants: queue.map((j) => ({ work: continuityWorkDigest(canonical(j)), source: j.approvalSource, expires: 10000 })), bindings: Array.from({ length: 4 }, (_, n) => ({ worker: `worker_${n}`, binding: sha(`binding_${n}`), role: n === 0 ? 'builder' : 'specialist' })), ...overrides })
const harness = (kernel = make()) => {
  const events = JSON.parse(kernel.checkpoint()).events
  let seq = events.length
  let lastTime = events.length ? JSON.parse(JSON.parse(events.at(-1)).body).time : 0
  const encode = (kind, data, overrides = {}) => {
    const event = { id: `event_${seq + 1}`, sequence: seq + 1, time: Math.max(100 + seq, lastTime + 1), kind, data, ...overrides }
    const body = canonical(event)
    return canonical({ body, signature: sign(null, Buffer.from(body), keys.privateKey).toString('hex') })
  }
  const run = (kind, data, overrides = {}) => {
    const text = encode(kind, data, overrides)
    const result = kernel.reduce(text); seq++; lastTime = JSON.parse(JSON.parse(text).body).time; return { ...result, text }
  }
  const claim = (i) => run('claim', { intent: i.id, binding: i.job.binding })
  const observe = (i, phase, overrides = {}) => run('observe', { intent: i.id, binding: i.job.binding, phase, cursor: seq + 1, receipt: sha(`receipt_${seq + 1}`), verdict: phase === 'terminal' ? 'accepted' : null, ...overrides })
  return { kernel, run, encode, claim, observe }
}

test('four useful lanes refill in the same terminal reduction through three full cycles', () => {
  let h = harness()
  assert.equal(h.run('configure', config(Array.from({ length: 16 }, (_, i) => work(i)))).selected.length, 4)
  for (let cycle = 0; cycle < 3; cycle++) {
    const four = h.kernel.privateView().intents.filter((i) => i.phase === 'pending')
    assert.equal(four.length, 4)
    for (const i of four) { h.claim(i); h.observe(i, 'delivered'); h.observe(i, 'started') }
    assert.equal(h.kernel.projectPublic().counts.active, 4)
    // All four complete in one observation tick; stable adapter ordering, no sends
    // until all four reductions have been persisted in one checkpoint.
    const observedAt = 500 + cycle * 100
    for (const i of four) {
      const result = h.run('observe', { intent: i.id, binding: i.job.binding, phase: 'terminal', cursor: observedAt, receipt: sha(`terminal_${i.id}`), verdict: 'accepted' }, { time: observedAt })
      assert.equal(result.selected.length, 1)
      assert.equal(h.kernel.projectPublic().free, 0)
    }
    assert.equal(h.kernel.projectPublic().counts.active, 0)
    // Actually reload each cycle; receive time and replay budget survive restart.
    assert.equal(make(h.kernel.checkpoint()).checkpoint(), h.kernel.checkpoint())
    h = harness(make(h.kernel.checkpoint()))
    console.info(JSON.stringify({ simulatedCycle: cycle + 1, completed: 4, replenished: 4, actualStartsInNextCycle: false }))
  }
})

test('terminal dominates a stale running badge; duplicate completion produces no intent', () => {
  const h = harness(); h.run('configure', config([work(0), work(4)]))
  const i = h.kernel.privateView().intents[0]; h.claim(i); h.observe(i, 'started', { cursor: 9000 })
  // Receipt authority outranks a stale badge even when it arrives out of order.
  const done = h.observe(i, 'terminal', { cursor: 2 })
  const before = h.kernel.checkpoint()
  assert.deepEqual(h.kernel.reduce(done.text).selected, [])
  assert.equal(h.kernel.checkpoint(), before)
  h.observe(i, 'started', { cursor: 9999 })
  assert.equal(h.kernel.projectPublic().counts.active, 0)
  assert.equal(h.kernel.projectPublic().counts.pending, 1)
  assert.equal(h.kernel.projectPublic().counts.accepted, 1)
})

test('authority hold is scoped; new exact grant selects the previously held work without approval inference', () => {
  const queue = Array.from({ length: 4 }, (_, i) => work(i))
  const c = config(queue); c.grants.shift()
  const h = harness(); assert.equal(h.run('configure', c).selected.length, 3)
  const hold = h.kernel.privateView().holds[0]
  assert.equal(hold.capability, 'implement'); assert.equal(hold.workstream, 'stream_0')
  assert.equal(hold.approvingSource, sha('direct_authority')); assert.equal(hold.permittedIndependent.length, 3)
  assert.equal(h.run('configure', config(queue, { revision: 2 })).selected.length, 1)
  assert.equal(h.kernel.projectPublic().counts.active, 0) // intent is NOT execution
})

test('control Observer CEO, missing dependencies and high-risk scope cannot manufacture four', () => {
  const queue = [work(0, { kind: 'control' }), work(1, { kind: 'observer' }), work(2, { kind: 'ceo' }), work(3, { capability: 'deploy' }), work(4, { dependencies: [{ job: 'absent', requires: 'accepted' }] })]
  const h = harness(); assert.equal(h.run('configure', config(queue)).selected.length, 0)
  assert.equal(h.kernel.projectPublic().free, 4)
  assert.deepEqual(h.kernel.privateView().holds.map((h) => h.reason), ['excluded_role', 'excluded_role', 'excluded_role', 'high_risk_or_capability_boundary', 'dependency_unmet'])
})

test('one canonical implementation and exact worker/lock conflicts preserve priority', () => {
  const queue = [work(0), work(1, { locks: ['shared'] }), work(2, { locks: ['shared'] }), work(3, { kind: 'implementation', capability: 'implement', target: 'other' })]
  const h = harness(); assert.equal(h.run('configure', config(queue)).selected.length, 2)
  assert.deepEqual(h.kernel.privateView().intents.map((i) => i.job.id), ['job_0', 'job_1'])
})

test('same immutable QA/Audit concurrency requires exact explicit parallel scope and fresh roles', () => {
  const q = work(1, { kind: 'qa', capability: 'verify', target: 'review', parallelGroup: sha('parallel') })
  const a = work(2, { kind: 'audit', capability: 'audit', target: 'review', parallelGroup: sha('parallel') })
  const bindings = [{ worker: q.worker, binding: q.binding, role: 'ux_product_qa' }, { worker: a.worker, binding: a.binding, role: 'release_audit' }]
  for (const [candidate, parallelGroup, count] of [[q.candidate, q.parallelGroup, 2], [sha('other'), q.parallelGroup, 1], [q.candidate, null, 1]]) {
    const h = harness(); assert.equal(h.run('configure', config([q, { ...a, candidate, parallelGroup }], { bindings })).selected.length, count)
  }
})

test('claimed or unknown delivery never becomes a resend after checkpoint reload', () => {
  for (const phase of ['claimed', 'unknown', 'delivered', 'started']) {
    const h = harness(); h.run('configure', config([work(0)])); const i = h.kernel.privateView().intents[0]
    const claim = h.claim(i)
    if (phase !== 'claimed') h.observe(i, phase)
    const restarted = harness(make(h.kernel.checkpoint()))
    assert.equal(restarted.kernel.reduce(claim.text).send, null)
    assert.throws(() => restarted.claim(i), /claim_consumed/)
    assert.equal(restarted.kernel.projectPublic().free, 3)
  }
})

test('exact readback resolves unknown without resend and accepted dependencies refill', () => {
  const h = harness(); h.run('configure', config([work(0), work(4, { dependencies: [{ job: 'job_0', requires: 'accepted' }] })]))
  const i = h.kernel.privateView().intents[0]; h.claim(i); h.observe(i, 'unknown')
  assert.equal(h.kernel.privateView().needsReadback.length, 1)
  h.observe(i, 'started'); assert.equal(h.kernel.privateView().needsReadback.length, 0)
  assert.equal(h.observe(i, 'terminal').selected.length, 1)
})

test('explicit stop, expired grant and binding drift deny claims without global suppression', () => {
  for (const mode of ['stop', 'expiry', 'drift']) {
    const h = harness(); const c = config([work(0), work(1)])
    h.run('configure', c); const i = h.kernel.privateView().intents[0]
    if (mode === 'stop') h.run('stop', { workstream: i.job.workstream })
    if (mode === 'drift') h.run('configure', { ...c, revision: 2, bindings: c.bindings.filter((b) => b.worker !== i.job.worker) })
    const text = h.encode('claim', { intent: i.id, binding: i.job.binding }, mode === 'expiry' ? { time: 10001 } : {})
    const before = h.kernel.checkpoint(); assert.throws(() => h.kernel.reduce(text), /claim_/); assert.equal(h.kernel.checkpoint(), before)
    assert.ok(h.kernel.privateView().intents.some((i) => i.job.id === 'job_1' && i.phase === 'pending'))
  }
})

test('fingerprint is consumed across renamed queue IDs; no-ready is explicit', () => {
  const h = harness(); h.run('configure', config([work(0)])); const i = h.kernel.privateView().intents[0]
  h.claim(i); h.observe(i, 'terminal', { verdict: 'safe_hold' })
  const alias = work(0, { id: 'renamed' })
  assert.equal(h.run('configure', config([alias], { revision: 2 })).selected.length, 0)
  assert.equal(h.kernel.privateView().holds[0].reason, 'fingerprint_consumed')
  assert.equal(h.kernel.projectPublic().free, 4)
})

test('signature, caller override, clock, sequence and conflicting evidence failures are atomic', () => {
  const h = harness(); const first = h.run('configure', config([work(0)])); const before = h.kernel.checkpoint()
  const envelope = JSON.parse(first.text); envelope.signature = '0'.repeat(128)
  assert.throws(() => h.kernel.reduce(canonical(envelope)), /signature/)
  for (const text of [h.encode('configure', { ...config([]), approved: true }), h.encode('configure', config([], { revision: 2 }), { time: 0 }), h.encode('configure', config([], { revision: 2 }), { sequence: 99 })]) assert.throws(() => h.kernel.reduce(text))
  assert.equal(h.kernel.checkpoint(), before)
  const i = h.kernel.privateView().intents[0]; h.claim(i); h.observe(i, 'terminal')
  assert.throws(() => h.observe(i, 'terminal', { verdict: 'failed' }), /terminal_conflict/)
})

test('hostile getter Proxy callback and corrupted/truncated checkpoint never execute', () => {
  const h = harness(); h.run('configure', config([work(0)]))
  let calls = 0
  const proxy = new Proxy({}, { get() { calls++; throw Error('trap') }, ownKeys() { calls++; throw Error('trap') } })
  assert.throws(() => h.kernel.reduce(proxy), /encoding/)
  assert.throws(() => createContinuityScheduler(proxy), /shape/)
  assert.throws(() => createContinuityScheduler({ get publicKey() { calls++; return publicKey }, checkpoint: null, expectedDigest: null }), /shape/)
  assert.throws(() => h.kernel.reduce(() => { calls++ }), /encoding/)
  assert.equal(calls, 0)
  assert.throws(() => createContinuityScheduler({ publicKey, checkpoint: canonical({ schema: 1, events: [] }), expectedDigest: sha(h.kernel.checkpoint()) }), /checkpoint_digest/)
  const c = JSON.parse(h.kernel.checkpoint()); c.events.push(c.events[0])
  assert.throws(() => make(canonical(c)), /checkpoint_duplicate/)
})

test('durable CAS admits one claimant; crash at claim/send/ack requires exact readback', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outcome-continuity-'))
  try {
    const path = join(dir, 'checkpoint.json'); const h = harness()
    h.run('configure', config([work(0)]))
    const head = commitContinuityCheckpoint({ path, expectedDigest: null, checkpoint: h.kernel.checkpoint() }).digest
    const i = h.kernel.privateView().intents[0]; const competing = harness(make(h.kernel.checkpoint()))
    const claim = h.claim(i); const other = competing.claim(i)
    commitContinuityCheckpoint({ path, expectedDigest: head, checkpoint: claim.checkpoint })
    assert.throws(() => commitContinuityCheckpoint({ path, expectedDigest: head, checkpoint: other.checkpoint }), /storage_conflict/)
    for (const crash of ['before_send', 'after_send_before_ack', 'after_ack_before_checkpoint']) {
      const recovered = make(readFileSync(path, 'utf8'))
      assert.equal(recovered.privateView().needsReadback.length, 1, crash)
      assert.equal(recovered.reduce(claim.text).send, null, crash)
    }
    writeFileSync(`${path}.lock`, 'existing lease', { mode: 0o600 })
    assert.throws(() => commitContinuityCheckpoint({ path, expectedDigest: sha(claim.checkpoint), checkpoint: claim.checkpoint }), /storage_locked/)
    assert.equal(readFileSync(`${path}.lock`, 'utf8'), 'existing lease')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('public projection contains only finite counts and no private work or receipt identifiers', () => {
  const h = harness(); h.run('configure', config([work(0)])); const i = h.kernel.privateView().intents[0]
  const view = JSON.stringify(h.kernel.projectPublic())
  for (const value of [i.id, i.job.id, i.job.worker, i.job.candidate, i.job.scope, i.job.approvalSource]) assert.equal(view.includes(value), false)
  assert.equal(h.kernel.projectPublic().completionAuthority, false)
  assert.equal(h.kernel.projectPublic().liveCyclesVerified, false)
})

for (const mode of ['partial-write', 'file-fsync', 'rename']) {
  test(`QA-C1 failed transaction retains its own temp after ${mode}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'outcome-cas-retention-'))
    const native = Object.fromEntries(['openSync', 'writeFileSync', 'fsyncSync', 'renameSync'].map(k => [k, fs[k]]))
    const path = join(dir, 'checkpoint.json'), old = canonical({ schema: 1, events: [] }), next = canonical({ schema: 1, events: ['next-evidence'] })
    let tempPath = null, tempFd = null, injected = 0
    try {
      writeFileSync(path, old)
      writeFileSync(path + '.next-unrelated', 'older evidence')
      writeFileSync(join(dir, 'unrelated.lock'), 'foreign lease')
      const fault = () => { injected++; throw Object.assign(new Error('test-owned EIO'), { code: 'EIO' }) }
      fs.openSync = (...args) => { const fd = native.openSync(...args); if (typeof args[0] === 'string' && args[0].startsWith(path + '.next-')) { tempPath = args[0]; tempFd = fd } return fd }
      fs.writeFileSync = (...args) => { if (mode === 'partial-write' && args[0] === tempFd) { native.writeFileSync(tempFd, args[1].slice(0, 7)); fault() } return native.writeFileSync(...args) }
      fs.fsyncSync = (fd) => { if (mode === 'file-fsync' && fd === tempFd) fault(); return native.fsyncSync(fd) }
      fs.renameSync = (...args) => { if (mode === 'rename' && args[0] === tempPath) fault(); return native.renameSync(...args) }
      syncBuiltinESMExports()
      try { assert.throws(() => commitContinuityCheckpoint({ path, expectedDigest: sha(old), checkpoint: next }), /test-owned EIO/) }
      finally { Object.assign(fs, native); syncBuiltinESMExports() }
      assert.equal(injected, 1)
      assert.equal(readFileSync(path, 'utf8'), old)
      assert.equal(readFileSync(path + '.next-unrelated', 'utf8'), 'older evidence')
      assert.equal(readFileSync(join(dir, 'unrelated.lock'), 'utf8'), 'foreign lease')
      assert.equal(existsSync(path + '.lock'), false)
      assert.equal(existsSync(tempPath), true)
      assert.equal(statSync(tempPath).mode & 0o777, 0o600)
      assert.equal(readFileSync(tempPath, 'utf8'), mode === 'partial-write' ? next.slice(0, 7) : next)
    } finally { Object.assign(fs, native); syncBuiltinESMExports(); rmSync(dir, { recursive: true, force: true }) }
  })
}

test('QA-C1 successful transaction renames its temp and preserves unrelated artifacts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outcome-cas-success-'))
  try {
    const path = join(dir, 'checkpoint.json'), checkpoint = canonical({ schema: 1, events: [] })
    writeFileSync(path + '.next-old', 'older evidence'); writeFileSync(join(dir, 'unrelated.lock'), 'foreign lease')
    assert.deepEqual(commitContinuityCheckpoint({ path, expectedDigest: null, checkpoint }), { digest: sha(checkpoint) })
    assert.equal(readFileSync(path, 'utf8'), checkpoint)
    assert.deepEqual(readdirSync(dir).sort(), ['checkpoint.json', 'checkpoint.json.next-old', 'unrelated.lock'])
    assert.equal(readFileSync(path + '.next-old', 'utf8'), 'older evidence')
    assert.equal(readFileSync(join(dir, 'unrelated.lock'), 'utf8'), 'foreign lease')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
