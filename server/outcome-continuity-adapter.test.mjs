import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createContinuityScheduler, commitContinuityCheckpoint, continuityWorkDigest } from './outcome-continuity-scheduler.mjs'
import { createFixtureEvidenceAuthority } from './outcome-role-transport-evidence-fixtures.test.mjs'

const realNow = Date.now
Date.now = () => 100
const { createTrustedRoleEvidenceVerifier } = await import('./outcome-role-transport-evidence.mjs')
Date.now = realNow
let api = null
try { api = await import('./outcome-continuity-adapter.mjs') } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e }
// Capability-absence RED is reported separately from behavioural failures. This
// guard makes every acceptance case visible before the new module is implemented.
const check = (id, name, fn) => test(`${id} ${name}`, () => { assert.ok(api, 'adapter capability absent at baseline'); return fn() })
const canonical = (v) => JSON.stringify(v, function (k, x) { return x && !Array.isArray(x) && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x })
const sha = (v) => createHash('sha256').update(v).digest('hex')
const index = (v) => sha('outcome-role-evidence-receipt-v1\0' + v)
// R5 permits only these process-local keys. Never export/log/persist the private key.
const keys = generateKeyPairSync('ed25519')
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' })
const dirs = []
after(() => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }) })
const startExpected = { project_id: 'outcome', role: 'builder', binding_version: 3, public_alias: 'builder_successor', instruction_id: 'instruction_alpha', attempt_id: 'attempt_alpha' }
const tokens = (verifier) => {
  const authority = createFixtureEvidenceAuthority(verifier)
  const start = authority.resolveStart(startExpected)
  const provider = authority.providerSend(start, { observation_cursor: 8 })
  const destination = authority.destinationStart(provider, { observation_cursor: 9, observation_kind: 'new_turn' })
  const { public_alias, ...correlated } = startExpected
  return { start, provider, destination, expected: { ...correlated, destination_key: start.payload.destination_key } }
}
const job = (n = 0) => ({ id: n ? `other_${n}` : 'instruction_alpha', workstream: n ? `attempt_${n}` : 'attempt_alpha', kind: 'implementation', capability: 'implement', target: 'canonical', candidate: sha('candidate'), scope: sha(`scope_${n}`), worker: 'destination_0d46ea30e703befb29d764ed', binding: sha('binding_v3'), priority: n, dependencies: [], locks: [], approvalSource: sha('authority'), parallelGroup: null })
const makeKernel = (count = 1) => {
  const scheduler = createContinuityScheduler({ publicKey, checkpoint: null, expectedDigest: null })
  let seq = 0
  const encode = (kind, data, overrides = {}) => { const body = canonical({ id: `event_${seq + 1}`, sequence: seq + 1, time: 10 + seq, kind, data, ...overrides }); return canonical({ body, signature: sign(null, Buffer.from(body), keys.privateKey).toString('hex') }) }
  const run = (kind, data, overrides = {}) => { const result = scheduler.reduce(encode(kind, data, overrides)); seq++; return result }
  const queue = Array.from({ length: count }, (_, n) => job(n))
  run('configure', { revision: 1, project: 'outcome', canonicalTarget: 'canonical', queue, grants: queue.map(j => ({ work: continuityWorkDigest(canonical(j)), source: j.approvalSource, expires: 1000 })), bindings: [{ worker: queue[0].worker, binding: queue[0].binding, role: 'builder' }] })
  return { scheduler, encode, run }
}
const environment = (phase = 'started', overrides = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'outcome-adapter-')); dirs.push(dir)
  const k = makeKernel(); const intent = k.scheduler.privateView().intents[0]
  if (phase !== 'claim') k.run('claim', { intent: intent.id, binding: intent.job.binding })
  const verifier = createTrustedRoleEvidenceVerifier(); const t = tokens(verifier)
  const options = { verifier, scheduler: k.scheduler, checkpointPath: join(dir, 'checkpoint.json'), checkpointDigest: null, ledgerPath: join(dir, 'ledger.json'), ledgerDigest: null, descriptorPath: join(dir, 'descriptor.json'), descriptorDigest: null, now: 100, ...overrides }
  const data = phase === 'claim' ? { intent: intent.id, binding: intent.job.binding } : { intent: intent.id, binding: intent.job.binding, phase, cursor: phase === 'delivered' ? 8 : 9, receipt: phase === 'unknown' || phase === 'terminal' ? sha('classification') : index((phase === 'delivered' ? t.provider : t.destination).payload.receipt_id), verdict: phase === 'terminal' ? 'accepted' : null }
  const text = k.encode(phase === 'claim' ? 'claim' : 'observe', data)
  const token = phase === 'claim' ? t.start : phase === 'delivered' ? t.provider : ['unknown', 'terminal'].includes(phase) ? null : t.destination
  const expected = phase === 'claim' ? startExpected : ['unknown', 'terminal'].includes(phase) ? { reason_class: 'missing_ack' } : t.expected
  return { ...k, ...t, dir, intent, options, data, text, token, expected, adapter: () => api.createContinuityAdapter(options), tick: (a) => a.tick(text, token, expected) }
}
const noFiles = (e) => assert.equal(readdirSync(e.dir).length, 0)
const mappedFacts = (e, token = e.destination) => ({ ...e.options.verifier.inspectDestination(token, e.expected), intent: e.intent.id, binding: e.intent.job.binding })
const restart = (e, a) => api.createContinuityAdapter({ ...e.options, verifier: createTrustedRoleEvidenceVerifier(), checkpointDigest: a.checkpointHead().digest, ledgerDigest: a.ledgerHead().digest, descriptorDigest: a.descriptorHead().digest })

check('R-01', 'facts are not forwarded as signed bytes', () => { const e = environment(); assert.throws(() => e.adapter().tick(canonical(mappedFacts(e)), e.token, e.expected), /shape|encoding/); noFiles(e) })
check('R-02', 'canonical equivalence through observable scheduler surfaces', () => {
  const k = makeKernel(); assert.equal(api.adapterCanonical(JSON.parse(k.scheduler.checkpoint())), k.scheduler.checkpoint())
  for (const v of [{ z: ['한글', { Ω: 2, a: 1 }], a: true }, [null, false, { b: 1, a: 0 }]]) assert.equal(api.adapterCanonical(v), canonical(v))
  const i = k.scheduler.privateView().intents[0]; const signed = k.encode('claim', { intent: i.id, binding: i.job.binding })
  assert.throws(() => k.scheduler.reduce(' ' + signed), /encoding/)
  assert.ok(k.scheduler.reduce(api.adapterCanonical(JSON.parse(signed))).send)
})
check('R-03', 'genuine new_turn maps to started', () => { const e = environment(); const r = e.tick(e.adapter()); assert.equal(r.data.phase, 'started'); assert.equal(r.data.verdict, null) })
check('R-04', 'unattested phase is not synthesized', () => { const e = environment('terminal'); assert.throws(() => e.tick(e.adapter()), /verdict_mapping_undecided/); const d = environment('delivered'); assert.throws(() => d.adapter().tick(d.text, d.destination, d.expected), /phase_unattested|evidence_mismatch/); noFiles(d) })
check('R-05', 'opaque receipt index and missing-id refusal', () => { const e = environment(); const facts = mappedFacts(e); assert.equal(api.adapterFactsToEventData(facts, 'started').receipt, index(facts.receipt_id)); for (const receipt_id of [null, '', 7]) assert.throws(() => api.adapterFactsToEventData({ ...facts, receipt_id }, 'started'), /receipt_shape/) })
check('R-06', 'durable receipt blocks replay before writes', () => { const e = environment(); const a = e.adapter(); e.tick(a); const before = readFileSync(e.options.ledgerPath, 'utf8'); assert.throws(() => e.tick(restart(e, a)), /receipt_replayed/); assert.equal(readFileSync(e.options.ledgerPath, 'utf8'), before) })
check('R-07', 'ledger-ahead crash image survives a fresh verifier', () => { const e = environment(); const a = e.adapter(); e.tick(a); const fresh = createTrustedRoleEvidenceVerifier(); assert.equal(fresh.inspectDestination(e.token, e.expected).consumed, false); assert.throws(() => e.tick(restart(e, a)), /receipt_replayed/) })
check('R-08', 'ledger cannot share checkpoint path', () => { const e = environment(); assert.throws(() => api.createContinuityAdapter({ ...e.options, ledgerPath: e.options.checkpointPath }), /storage_input/); noFiles(e) })
check('R-09', 'ledger lock is preserved, checkpoint ahead is explicit', () => { const e = environment('claim'); writeFileSync(e.options.ledgerPath + '.lock', 'existing'); assert.throws(() => e.tick(e.adapter()), /ledger_behind_checkpoint.*storage_locked/); assert.equal(readFileSync(e.options.ledgerPath + '.lock', 'utf8'), 'existing'); assert.equal(existsSync(e.options.descriptorPath), false) })
check('R-10', 'independent token window rejects before reduction', () => { const e = environment('started', { now: 1001 }); const before = e.scheduler.checkpoint(); assert.throws(() => e.tick(e.adapter()), /clock/); assert.equal(e.scheduler.checkpoint(), before); noFiles(e) })
check('R-11', 'callable or unsafe now cannot execute', () => { let calls = 0; for (const now of [() => calls++, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) { const e = environment('started', { now }); assert.throws(() => e.adapter(), /clock/); noFiles(e) } assert.equal(calls, 0) })
check('R-12', 'monotonic reducer clock remains authoritative', () => { const e = environment(); const before = e.scheduler.checkpoint(); assert.throws(() => e.adapter().tick(e.encode('observe', e.data, { time: 0 }), e.token, e.expected), /clock_regression/); assert.equal(e.scheduler.checkpoint(), before); noFiles(e) })
check('R-13', 'no invented age band or classifier', () => { const source = readFileSync(new URL('./outcome-continuity-adapter.mjs', import.meta.url), 'utf8'); assert.doesNotMatch(source, /(?:age|elapsed|freshness)\s*[<>]=?\s*(?:5|30)\b|freshBand|staleBand|classifyFresh/) })
check('R-14', 'failed checkpoint CAS retains claimed intent, no descriptor', () => { const e = environment('claim'); const a = e.adapter(); writeFileSync(e.options.checkpointPath, 'competing'); assert.throws(() => e.tick(a), /storage_conflict/); assert.equal(e.scheduler.privateView().intents[0].phase, 'claimed'); assert.ok(e.scheduler.privateView().needsReadback.includes(e.intent.id)); assert.equal(existsSync(e.options.descriptorPath), false) })
check('R-15', 'descriptor exact data-only fields', () => { const e = environment('claim'); const r = e.tick(e.adapter()); assert.deepEqual(Object.keys(r.descriptor).sort(), ['binding', 'checkpoint_head', 'created_at', 'intent_id', 'job_id', 'worker', 'workstream']); assert.doesNotMatch(JSON.stringify(r.descriptor), /endpoint|https?:|provider|credential|transport_class|opaque/) })
check('R-16', 'adapter has no transport or mutation imports', () => { const s = readFileSync(new URL('./outcome-continuity-adapter.mjs', import.meta.url), 'utf8'); assert.doesNotMatch(s, /from\s+['"]node:(?:http|https|net|dgram|tls|child_process|path)['"]|\bfetch\s*\(|mutateRegistry|recoverRegistryLock|migrateLegacyRegistry/) })
check('R-17', 'function-valued inputs refuse without callbacks', () => { let calls = 0; const fn = () => calls++; const e = environment(); assert.throws(() => api.createContinuityAdapter({ ...e.options, verifier: fn }), /invalid_dependency/); assert.throws(() => e.adapter().tick(fn, e.token, e.expected), /encoding/); assert.throws(() => api.adapterCanonical({ data: fn }), /shape/); assert.equal(calls, 0) })
check('R-18', 'hostile tick objects reject before side effects', () => { let calls = 0; const proxy = new Proxy({}, { ownKeys() { calls++; return [] }, get() { calls++ } }); const e = environment(); assert.throws(() => e.adapter().tick(e.text, proxy, e.expected), /shape/); assert.throws(() => api.adapterCanonical(JSON.parse('{"__proto__":{}}')), /shape/); assert.equal(calls, 0); noFiles(e) })
check('R-19', 'pinned non-regression source bytes unchanged', () => {
  const pins = { 'outcome-continuity-scheduler.mjs': '4dcbe17aa37b71248dc77c1471e25f8b57b78409a61bba1a68ee9cb6ad739421', 'outcome-continuity-scheduler.test.mjs': 'e26b5402fb6741405e553b1ac95e9197af29fc6fd01834007955a5c4bc4aed25', 'outcome-execution-control-plane.mjs': 'c2f93d6486d2504a9df077e3c1b20fb88057c969a60ce1f96960c907e3a3df31', 'outcome-execution-control-plane.test.mjs': '566f8d6b9672bcbd6ced71471aa09703bf42347dbab8227888a1ec32b8412eb3', 'outcome-role-transport-evidence.mjs': 'd01f432cfc763f9586b691b1fa71ec5f7816d3841df86a12d1718bb05286d7eb', 'outcome-role-transport-evidence.test.mjs': 'cb5878f91edb2ac709625054cae6c70e1655b5acec7c833e0df4786b25f88baa', 'outcome-role-transport-evidence-fixtures.test.mjs': '18e779bb670c92db02edc851a612e2fcbb17431941f6cc5234acc977632d27df' }
  for (const [name, hash] of Object.entries(pins)) assert.equal(sha(readFileSync(new URL(name, import.meta.url))), hash, name)
})
check('R-20', 'expected snapshot excludes proxies accessors and extra fields', () => { let calls = 0; const e = environment(); const samples = [new Proxy({}, { ownKeys() { calls++; return [] } }), Object.create(null), {}, { ...e.expected, extra: true }, { ...e.expected, get role() { calls++; return 'builder' } }]; for (const value of samples) assert.throws(() => api.adapterExpectedSnapshot(value, Object.keys(e.expected)), /shape/); assert.equal(calls, 0); noFiles(e) })
check('R-21', 'source-size capacity fails before any write', () => { const e = environment(); const row = { receipt_id: '', receipt_digest: sha('x'), payload_digest: sha('payload'), event_digest: sha('event'), attestation: 'signed', phase: 'started', reason_class: null }; const skeleton = canonical({ schema: 1, events: [row] }); row.receipt_id = 'x'.repeat(8_000_000 - skeleton.length - 1); row.receipt_digest = index(row.receipt_id); const bytes = canonical({ schema: 1, events: [row] }); assert.equal(bytes.length, 7_999_999); writeFileSync(e.options.ledgerPath, bytes); e.options.ledgerDigest = sha(bytes); assert.throws(() => e.tick(e.adapter()), /ledger_capacity/); assert.equal(readFileSync(e.options.ledgerPath, 'utf8'), bytes); assert.equal(existsSync(e.options.checkpointPath), false) })
check('R-22', 'small scheduler clock does not become epoch time', () => { const e = environment('claim'); const r = e.tick(e.adapter()); assert.ok(r.descriptor); assert.equal(JSON.parse(JSON.parse(e.text).body).time, 11); assert.equal(e.options.now, 100) })
check('R-23', 'real fixed-root destination token reaches reducer', () => { const e = environment(); e.tick(e.adapter()); assert.equal(e.scheduler.privateView().intents[0].phase, 'started') })
check('R-24', 'unverified token cannot create output or persisted index', () => { const e = environment(); const token = structuredClone(e.token); token.signature = 'invalid'; const before = e.scheduler.checkpoint(); assert.throws(() => e.adapter().tick(e.text, token, e.expected), /trusted_evidence_required/); assert.equal(e.scheduler.checkpoint(), before); noFiles(e) })
check('R-25', 'distinct verified opaque receipts produce distinct indexes', () => { const e = environment(); const a = e.options.verifier.inspectProvider(e.provider, e.expected); const b = e.options.verifier.inspectDestination(e.destination, e.expected); assert.notEqual(index(a.receipt_id), index(b.receipt_id)) })
check('R-26', 'controlling domain prefix separates receipt from raw and intent hashes', () => { const e = environment(); const data = api.adapterFactsToEventData(mappedFacts(e), 'started'); assert.equal(data.receipt, index(e.token.payload.receipt_id)); assert.notEqual(data.receipt, sha(e.token.payload.receipt_id)); assert.notEqual(data.receipt, e.intent.id) })
check('R-27', 'ledger keeps original opaque replay key privately', () => { const e = environment(); const a = e.adapter(); e.tick(a); const row = JSON.parse(readFileSync(e.options.ledgerPath, 'utf8')).events[0]; assert.equal(row.receipt_id, e.token.payload.receipt_id); assert.equal(row.receipt_digest, index(row.receipt_id)); assert.throws(() => e.tick(restart(e, a)), /receipt_replayed/) })
check('R-28', 'pure index mapping is unconditional for hypothetical hex facts, not an attestation test', () => { const e = environment(); const id = sha('hypothetical'); const data = api.adapterFactsToEventData({ ...mappedFacts(e), receipt_id: id }, 'started'); assert.equal(data.receipt, index(id)); assert.notEqual(data.receipt, id) })
check('R-29', 'descriptor and returned projection omit all opaque receipt ids', () => { const e = environment('claim'); const a = e.adapter(); const result = e.tick(a); const text = canonical({ result, checkpoint: a.checkpointHead(), ledger: a.ledgerHead(), descriptor: a.descriptorHead(), public: e.scheduler.projectPublic() }); for (const token of [e.start, e.provider, e.destination]) assert.equal(text.includes(token.payload.receipt_id), false) })
check('R-30', 'provider_send becomes delivered', () => { const e = environment('delivered'); const r = e.tick(e.adapter()); assert.equal(r.data.phase, 'delivered'); assert.equal(r.data.verdict, null) })
check('R-31', 'wrong verified kind cannot become delivered', () => { const e = environment('delivered'); assert.throws(() => e.adapter().tick(e.text, e.destination, e.expected), /phase_unattested|evidence_mismatch/); noFiles(e) })
check('R-32', 'unsigned unknown cannot downgrade existing observed phases', () => { for (const phase of ['delivered', 'started']) { const e = environment('unknown'); e.run('observe', { ...e.data, phase, receipt: sha(phase), cursor: 8 }); const text = e.encode('observe', { ...e.data, cursor: 10 }); e.adapter().tick(text, null, e.expected); assert.equal(e.scheduler.privateView().intents[0].phase, phase) } })
check('R-33', 'unknown requires a finite reason class', () => { const e = environment('unknown'); assert.throws(() => e.adapter().tick(e.text, null, { reason_class: 'generic wording' }), /reason_class/); noFiles(e) })
check('R-34', 'undecided terminal mapping refuses', () => { const e = environment('terminal'); assert.throws(() => e.tick(e.adapter()), /verdict_mapping_undecided/); noFiles(e) })
check('R-35', 'pinned reducer terminal outranks a later running observation', () => { const e = environment(); e.run('observe', { ...e.data, phase: 'terminal', verdict: 'accepted' }); e.run('observe', { ...e.data, cursor: 99 }); assert.equal(e.scheduler.privateView().intents[0].phase, 'terminal') })
check('R-36', 'pinned reducer refuses cross-intent receipt replay', () => { const k = makeKernel(2); const first = k.scheduler.privateView().intents[0]; k.run('claim', { intent: first.id, binding: first.job.binding }); const receipt = sha('shared'); k.run('observe', { intent: first.id, binding: first.job.binding, phase: 'terminal', cursor: 1, receipt, verdict: 'accepted' }); const next = k.scheduler.privateView().intents[1]; k.run('claim', { intent: next.id, binding: next.job.binding }); assert.throws(() => k.run('observe', { intent: next.id, binding: next.job.binding, phase: 'terminal', cursor: 2, receipt, verdict: 'accepted' }), /receipt_replayed/) })
check('R-37', 'signed observations and unsigned classification are distinguished durably', () => { for (const phase of ['delivered', 'started', 'unknown']) { const e = environment(phase); e.tick(e.adapter()); const row = JSON.parse(readFileSync(e.options.ledgerPath, 'utf8')).events[0]; assert.equal(row.attestation, phase === 'unknown' ? 'unsigned_classification' : 'signed'); if (phase === 'unknown') assert.equal(row.reason_class, 'missing_ack') } })
check('R-38', 'old constructor without checkpoint binding refuses', () => { const e = environment(); const { checkpointPath, checkpointDigest, ...old } = e.options; assert.throws(() => api.createContinuityAdapter(old), /shape/); noFiles(e) })
check('R-39', 'relative and non-string checkpoint paths refuse', () => { for (const checkpointPath of ['relative', 3]) { const e = environment(); assert.throws(() => api.createContinuityAdapter({ ...e.options, checkpointPath }), /storage_input/); noFiles(e) } })
check('R-40', 'invalid expected digest refuses', () => { const e = environment('claim', { checkpointDigest: 'bad' }); assert.throws(() => e.adapter(), /storage_input/); noFiles(e) })
check('R-41', 'null digest creates absent checkpoint and advances head', () => { const e = environment('claim'); const a = e.adapter(); e.tick(a); assert.equal(a.checkpointHead().digest, sha(readFileSync(e.options.checkpointPath))); assert.equal(a.checkpointHead().count, 2) })
check('R-42', 'null digest never adopts an existing checkpoint', () => { const e = environment('claim'); writeFileSync(e.options.checkpointPath, 'existing'); assert.throws(() => e.tick(e.adapter()), /storage_conflict/); assert.equal(readFileSync(e.options.checkpointPath, 'utf8'), 'existing') })
check('R-43', 'non-null head cannot create absent checkpoint', () => { const e = environment('claim'); e.options.checkpointDigest = sha(e.scheduler.checkpoint()); assert.throws(() => e.tick(e.adapter()), /storage_conflict/); noFiles(e) })
check('R-44', 'all pairwise path and CAS-derived collisions refuse', () => { const e = environment(); const names = ['checkpointPath', 'ledgerPath', 'descriptorPath']; for (const a of names) for (const b of names) if (a !== b) for (const suffix of ['', '.lock', '.next-old']) assert.throws(() => api.createContinuityAdapter({ ...e.options, [a]: e.options[b] + suffix }), /storage_input/); noFiles(e) })
check('R-45', 'checkpoint lock remains and stops all downstream work', () => { const e = environment('claim'); writeFileSync(e.options.checkpointPath + '.lock', 'lease'); assert.throws(() => e.tick(e.adapter()), /storage_locked/); assert.equal(readFileSync(e.options.checkpointPath + '.lock', 'utf8'), 'lease'); assert.equal(existsSync(e.options.ledgerPath), false); assert.equal(e.options.verifier.inspectStart(e.start, startExpected).consumed, false) })
check('R-46', 'failed tick cannot re-read and retry', () => { const e = environment('claim'); const a = e.adapter(); writeFileSync(e.options.checkpointPath, 'other'); assert.throws(() => e.tick(a), /storage_conflict/); assert.throws(() => e.tick(a), /tick_closed/); assert.equal(a.checkpointHead().digest, null); assert.equal(readFileSync(e.options.checkpointPath, 'utf8'), 'other') })
check('R-47', 'ledger-behind checkpoint is degraded no-send', () => { const e = environment('claim'); writeFileSync(e.options.ledgerPath, 'other'); const a = e.adapter(); assert.throws(() => e.tick(a), /ledger_behind_checkpoint/); assert.notEqual(a.checkpointHead().digest, null); assert.equal(a.ledgerHead().digest, null); assert.equal(existsSync(e.options.descriptorPath), false); assert.equal(e.options.verifier.inspectStart(e.start, startExpected).consumed, false) })
check('R-48', 'options Proxy rejection is trap-free', () => { let calls = 0; const p = new Proxy({}, { ownKeys() { calls++; return [] }, getPrototypeOf() { calls++; return Object.prototype } }); assert.throws(() => api.createContinuityAdapter(p), /shape/); assert.equal(calls, 0) })
check('R-49', 'checkpointPath getter never executes', () => { const e = environment(); let calls = 0; assert.throws(() => api.createContinuityAdapter({ ...e.options, get checkpointPath() { calls++; return 'bad' } }), /shape/); assert.equal(calls, 0); noFiles(e) })
check('R-50', 'old CAS temp artifact is preserved', () => { const e = environment('claim'); const path = e.options.checkpointPath + '.next-old'; writeFileSync(path, 'preserve'); e.tick(e.adapter()); assert.equal(readFileSync(path, 'utf8'), 'preserve') })
check('R-51', 'terminal remains fail-closed with no verdict invention', () => { const e = environment('terminal'); const before = e.scheduler.checkpoint(); assert.throws(() => e.tick(e.adapter()), /verdict_mapping_undecided/); assert.equal(e.scheduler.checkpoint(), before); noFiles(e) })
