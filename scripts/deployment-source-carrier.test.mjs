import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { CARRIER_PATH, OBSERVED_VERCEL_BYTES, OBSERVED_VERCEL_SHA256, OBSERVED_VERCEL_SOURCE_SHA256, UPLOAD_SOURCE_EXCLUDED_TRACKED_PATHS, VALIDATION_RECEIPT_PATH, canonical, sha256, writeCarrier } from './create-deployment-source-carrier.mjs'
import { matchVercelRepresentation, readAndValidateCarrier, validateDeploymentSource } from './validate-deployment-source-carrier.mjs'
import { normalizeProviderCommit, readValidatedCarrierSource } from './finalize-stable-snapshot.mjs'

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
function fixture(vercelContents = '{\n  "buildCommand": "npm run build:vercel",\n  "outputDirectory": "dist"\n}\n') {
  const root = mkdtempSync(resolve(tmpdir(), 'outcome-carrier-fixture-'))
  mkdirSync(resolve(root, 'src'))
  writeFileSync(resolve(root, 'src/app.mjs'), 'export const value = 1\n')
  writeFileSync(resolve(root, 'run.sh'), '#!/bin/sh\nexit 0\n')
  writeFileSync(resolve(root, '.gitignore'), 'node_modules\n')
  writeFileSync(resolve(root, 'vercel.json'), vercelContents)
  chmodSync(resolve(root, 'run.sh'), 0o755)
  git(root, 'init', '-q')
  git(root, 'add', 'src/app.mjs', 'run.sh', '.gitignore', 'vercel.json')
  git(root, '-c', 'user.name=OUTCOME Test', '-c', 'user.email=test@invalid', 'commit', '-qm', 'fixture')
  const first = writeCarrier(root)
  const second = writeCarrier(root)
  assert.deepEqual(second, first)
  return { root, carrier: first }
}
function productionFixture() {
  return fixture(readFileSync(resolve(import.meta.dirname, '..', 'vercel.json'), 'utf8'))
}
function sourceOnly(source) {
  const target = mkdtempSync(resolve(tmpdir(), 'outcome-carrier-source-'))
  cpSync(source, target, { recursive: true })
  rmSync(resolve(target, '.git'), { recursive: true, force: true })
  return target
}
function carrier(root) { return JSON.parse(readFileSync(resolve(root, CARRIER_PATH), 'utf8')) }
function vercelRow(root) { return carrier(root).files.find((file) => file.path === 'vercel.json') }
function writeProviderVercel(root, mutate = (value) => value) {
  const target = resolve(root, 'vercel.json')
  writeFileSync(target, JSON.stringify(mutate(JSON.parse(readFileSync(target, 'utf8')))))
}
function resign(value) {
  const body = { schemaVersion: value.schemaVersion, commit: value.commit, tree: value.tree, files: value.files }
  value.digest = sha256(canonical(body))
  return value
}
function writeJson(root, value) {
  const target = resolve(root, CARRIER_PATH)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, canonical(value))
}
function expectedVercelMismatch(root) {
  const bytes = readFileSync(resolve(root, 'vercel.json'))
  return `carrier file bytes mismatch: vercel.json observedBytes=${bytes.length} observedSha256=${sha256(bytes)} sourceMatch=false providerMatch=false observedMatch=false`
}
function hostile(name, mutate, pattern) {
  test(name, () => {
    const { root } = fixture()
    const source = sourceOnly(root)
    mutate(source)
    assert.throws(() => readAndValidateCarrier(source), pattern)
  })
}
function hostileObserved(name, mutate, pattern) {
  test(name, () => {
    const { root } = productionFixture()
    const source = sourceOnly(root)
    mutate(source)
    assert.throws(() => readAndValidateCarrier(source), pattern)
  })
}

test('generator is deterministic and source-only validation writes a private exact receipt', () => {
  const { root, carrier: generated } = fixture()
  assert.deepEqual([...UPLOAD_SOURCE_EXCLUDED_TRACKED_PATHS], ['.gitignore'])
  assert.deepEqual(generated.files.map(({ path, mode }) => ({ path, mode })), [{ path: 'run.sh', mode: '100755' }, { path: 'src/app.mjs', mode: '100644' }, { path: 'vercel.json', mode: '100644' }])
  assert.deepEqual(Object.keys(generated.files[0]), ['path', 'bytes', 'mode', 'sha256'])
  assert.deepEqual(Object.keys(generated.files[2]), ['path', 'bytes', 'mode', 'sha256', 'providerBytes', 'providerSha256'])
  const source = sourceOnly(root)
  rmSync(resolve(source, '.gitignore'))
  const result = validateDeploymentSource(source, {})
  assert.equal(result.mode, 'carrier')
  assert.deepEqual(readValidatedCarrierSource(source), { commit: generated.commit, tree: generated.tree })
  assert.equal(readFileSync(resolve(source, VALIDATION_RECEIPT_PATH), 'utf8'), canonical(result.receipt))
})

test('the shared upload exclusion ignores only .gitignore while every other tracked regular file remains authenticated', () => {
  const { root, carrier: generated } = fixture()
  assert.equal(generated.files.some((file) => file.path === '.gitignore'), false)
  assert.deepEqual(generated.files.map((file) => file.path), ['run.sh', 'src/app.mjs', 'vercel.json'])
  assert.doesNotThrow(() => readAndValidateCarrier(sourceOnly(root)))
})

test('vercel.json accepts only the authenticated source or deterministic provider representation', () => {
  const { root, carrier: generated } = fixture()
  const source = sourceOnly(root)
  const row = generated.files.find((file) => file.path === 'vercel.json')
  assert.equal(row.providerBytes, Buffer.byteLength(JSON.stringify(JSON.parse(readFileSync(resolve(source, 'vercel.json'), 'utf8')))))
  assert.equal(row.providerSha256, sha256(JSON.stringify(JSON.parse(readFileSync(resolve(source, 'vercel.json'), 'utf8')))))
  assert.doesNotThrow(() => readAndValidateCarrier(source))
  writeProviderVercel(source)
  assert.doesNotThrow(() => readAndValidateCarrier(source))
})

test('the exact production source carries the exact observed provider representation identity', () => {
  const { carrier: generated } = productionFixture()
  const row = generated.files.find((file) => file.path === 'vercel.json')
  assert.equal(row.sha256, OBSERVED_VERCEL_SOURCE_SHA256)
  assert.equal(row.observedSourceSha256, row.sha256)
  assert.equal(row.observedBytes, OBSERVED_VERCEL_BYTES)
  assert.equal(row.observedSha256, OBSERVED_VERCEL_SHA256)
  assert.deepEqual(Object.keys(row), ['path', 'bytes', 'mode', 'sha256', 'providerBytes', 'providerSha256', 'observedSourceSha256', 'observedBytes', 'observedSha256'])
  assert.deepEqual(matchVercelRepresentation(row, OBSERVED_VERCEL_BYTES, OBSERVED_VERCEL_SHA256), {
    sourceMatch: false, providerMatch: false, observedMatch: true, accepted: true,
  })
})

test('the observed identity rejects wrong and mixed pairs without widening either prior representation', () => {
  const { carrier: generated } = productionFixture()
  const row = generated.files.find((file) => file.path === 'vercel.json')
  assert.equal(matchVercelRepresentation(row, row.bytes, row.sha256).accepted, true)
  assert.equal(matchVercelRepresentation(row, row.providerBytes, row.providerSha256).accepted, true)
  for (const [bytes, hash] of [
    [OBSERVED_VERCEL_BYTES + 1, OBSERVED_VERCEL_SHA256],
    [OBSERVED_VERCEL_BYTES, '0'.repeat(64)],
    [row.bytes, OBSERVED_VERCEL_SHA256],
    [OBSERVED_VERCEL_BYTES, row.providerSha256],
    [727, '1'.repeat(64)],
  ]) assert.equal(matchVercelRepresentation(row, bytes, hash).accepted, false)
})

test('vercel.json mismatch reports deterministic content-free observed identity without widening acceptance', () => {
  const { root } = fixture()
  const source = sourceOnly(root)
  const target = resolve(source, 'vercel.json')
  writeFileSync(target, `${JSON.stringify(JSON.parse(readFileSync(target, 'utf8')))}\n`)
  const expected = expectedVercelMismatch(source)
  assert.throws(() => readAndValidateCarrier(source), (error) => {
    assert.equal(error.message, expected)
    assert.equal(error.message.split('carrier file bytes mismatch: vercel.json').length - 1, 1)
    assert.doesNotMatch(error.message, /buildCommand|outputDirectory|npm run|dist|providerBytes|providerSha256|\{|\}/)
    return true
  })
  assert.throws(() => readAndValidateCarrier(source), { message: expected })
})

test('vercel.json mismatch telemetry is exact across hostile bytes and metadata while ordinary files retain old errors', () => {
  const cases = [
    (root) => { const target = resolve(root, 'vercel.json'); writeFileSync(target, JSON.stringify(JSON.parse(readFileSync(target, 'utf8')), null, 4)) },
    (root) => writeProviderVercel(root, (value) => ({ ...value, outputDirectory: 'other' })),
    (root) => { writeProviderVercel(root); const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').providerSha256 = '0'.repeat(64); writeJson(root, resign(value)) },
  ]
  for (const mutate of cases) {
    const { root } = fixture(); const source = sourceOnly(root); mutate(source)
    const expected = expectedVercelMismatch(source)
    assert.throws(() => readAndValidateCarrier(source), (error) => {
      assert.equal(error.message, expected)
      assert.match(error.message, /sourceMatch=false providerMatch=false observedMatch=false$/)
      assert.doesNotMatch(error.message, /buildCommand|outputDirectory|npm run|dist|providerBytes|providerSha256|other|\{|\}/)
      return true
    })
  }
  const { root } = fixture(); const ordinary = sourceOnly(root)
  writeFileSync(resolve(ordinary, 'src/app.mjs'), 'changed\n')
  assert.throws(() => readAndValidateCarrier(ordinary), (error) => {
    assert.match(error.message, /carrier file byte length mismatch: src\/app.mjs/)
    assert.doesNotMatch(error.message, /observedBytes|observedSha256|sourceMatch|providerMatch|observedMatch/)
    return true
  })
})

test('ordinary length mismatch rejects before representation hash computation', async () => {
  const { root } = fixture(); const source = sourceOnly(root)
  writeFileSync(resolve(source, 'run.sh'), 'changed\n')
  const modules = mkdtempSync(resolve(tmpdir(), 'outcome-carrier-hash-canary-'))
  const creator = readFileSync(resolve(import.meta.dirname, 'create-deployment-source-carrier.mjs'), 'utf8')
  const instrumented = creator.replace("export const sha256 = (value) => createHash('sha256').update(value).digest('hex')", "export const sha256 = () => { throw new Error('representation hash canary invoked') }")
  assert.notEqual(instrumented, creator)
  writeFileSync(resolve(modules, 'create-deployment-source-carrier.mjs'), instrumented)
  writeFileSync(resolve(modules, 'validate-deployment-source-carrier.mjs'), readFileSync(resolve(import.meta.dirname, 'validate-deployment-source-carrier.mjs')))
  const canary = await import(`${pathToFileURL(resolve(modules, 'validate-deployment-source-carrier.mjs')).href}?canary=${Date.now()}`)
  assert.throws(() => canary.readAndValidateCarrier(source), /carrier file byte length mismatch: run\.sh/)
})

test('Git HEAD and provider Git paths remain compatible without a carrier', () => {
  const { root, carrier: generated } = fixture()
  rmSync(resolve(root, CARRIER_PATH))
  assert.equal(validateDeploymentSource(root, {}).mode, 'git-head')
  assert.equal(validateDeploymentSource(root, { VERCEL_GIT_COMMIT_SHA: generated.commit }).mode, 'provider-git')
})

test('carrier disagreement with provider Git or Git HEAD fails closed', () => {
  const { root } = fixture()
  assert.throws(() => validateDeploymentSource(root, { VERCEL_GIT_COMMIT_SHA: 'f'.repeat(40) }), /contradicts provider/)
  const value = carrier(root); value.commit = 'e'.repeat(40); writeJson(root, resign(value))
  assert.throws(() => validateDeploymentSource(root, {}), /contradicts Git HEAD/)
})

hostile('missing carrier', (root) => rmSync(resolve(root, CARRIER_PATH)), /ENOENT/)
hostile('extra source file', (root) => writeFileSync(resolve(root, 'extra.txt'), 'extra'), /closure/)
hostile('reordered files', (root) => { const value = carrier(root); value.files.reverse(); writeJson(root, resign(value)) }, /strictly sorted/)
hostile('duplicate file', (root) => { const value = carrier(root); value.files.splice(1, 0, { ...value.files[0] }); writeJson(root, resign(value)) }, /strictly sorted|duplicated/)
hostile('missing listed file', (root) => { const value = carrier(root); value.files.pop(); writeJson(root, resign(value)) }, /closure/)
hostile('traversal path', (root) => { const value = carrier(root); value.files[0].path = '../run.sh'; writeJson(root, resign(value)) }, /unsafe/)
hostile('absolute path', (root) => { const value = carrier(root); value.files[0].path = '/tmp/run.sh'; writeJson(root, resign(value)) }, /unsafe/)
hostile('control character path', (root) => { const value = carrier(root); value.files[0].path = 'bad\npath'; writeJson(root, resign(value)) }, /unsafe/)
hostile('accessor-like JSON shape', (root) => { const value = carrier(root); value.__proto_marker__ = 'forbidden'; writeJson(root, value) }, /schema/)
hostile('wrong field type', (root) => { const value = carrier(root); value.files[0].bytes = '1'; writeJson(root, resign(value)) }, /byte length/)
hostile('wrong declared byte length', (root) => { const value = carrier(root); value.files[0].bytes += 1; writeJson(root, resign(value)) }, /byte length mismatch/)
hostile('wrong provider byte length', (root) => { writeProviderVercel(root); const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').providerBytes += 1; writeJson(root, resign(value)) }, /bytes mismatch/)
hostile('wrong provider hash', (root) => { writeProviderVercel(root); const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').providerSha256 = '0'.repeat(64); writeJson(root, resign(value)) }, /bytes mismatch/)
hostile('changed provider semantics', (root) => writeProviderVercel(root, (value) => ({ ...value, outputDirectory: 'other' })), /bytes mismatch/)
hostile('alternate same-semantics vercel formatting', (root) => { const target = resolve(root, 'vercel.json'); writeFileSync(target, `${JSON.stringify(JSON.parse(readFileSync(target, 'utf8')), null, 4)}\n`) }, /bytes mismatch/)
hostile('missing provider representation metadata', (root) => { const value = carrier(root); delete value.files.find((file) => file.path === 'vercel.json').providerBytes; writeJson(root, resign(value)) }, /schema/)
hostile('wrong provider representation metadata type', (root) => { const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').providerBytes = '1'; writeJson(root, resign(value)) }, /provider byte length/)
hostile('decorated provider representation metadata', (root) => { const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').providerEncoding = 'json'; writeJson(root, resign(value)) }, /schema/)
hostile('provider representation metadata on another file', (root) => { const value = carrier(root); Object.assign(value.files[0], { providerBytes: value.files[0].bytes, providerSha256: value.files[0].sha256 }); writeJson(root, resign(value)) }, /schema/)
hostile('alternative representation on another file', (root) => { writeFileSync(resolve(root, 'run.sh'), '#!/bin/sh\nexit 1\n'); const value = carrier(root); const row = value.files[0]; Object.assign(row, { providerBytes: 17, providerSha256: sha256('#!/bin/sh\nexit 1\n') }); writeJson(root, resign(value)) }, /schema/)
hostile('observed representation metadata on an alternate vercel source', (root) => { const value = carrier(root); Object.assign(value.files.find((file) => file.path === 'vercel.json'), { observedSourceSha256: OBSERVED_VERCEL_SOURCE_SHA256, observedBytes: OBSERVED_VERCEL_BYTES, observedSha256: OBSERVED_VERCEL_SHA256 }); writeJson(root, resign(value)) }, /schema/)
hostile('observed representation metadata on an ordinary file', (root) => { const value = carrier(root); Object.assign(value.files[0], { observedSourceSha256: value.files[0].sha256, observedBytes: value.files[0].bytes, observedSha256: value.files[0].sha256 }); writeJson(root, resign(value)) }, /schema/)
hostileObserved('missing observed representation metadata', (root) => { const value = carrier(root); delete value.files.find((file) => file.path === 'vercel.json').observedBytes; writeJson(root, resign(value)) }, /schema/)
hostileObserved('wrong observed byte length', (root) => { const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').observedBytes += 1; writeJson(root, resign(value)) }, /observed byte length/)
hostileObserved('wrong observed hash', (root) => { const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').observedSha256 = '0'.repeat(64); writeJson(root, resign(value)) }, /observed hash/)
hostileObserved('wrong observed source binding', (root) => { const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').observedSourceSha256 = '0'.repeat(64); writeJson(root, resign(value)) }, /observed source hash/)
hostileObserved('decorated observed representation metadata', (root) => { const value = carrier(root); value.files.find((file) => file.path === 'vercel.json').observedEncoding = 'provider'; writeJson(root, resign(value)) }, /schema/)
hostile('missing vercel.json', (root) => rmSync(resolve(root, 'vercel.json')), /ENOENT|regular/)
hostile('wrong schema version', (root) => { const value = carrier(root); value.schemaVersion = 2; writeJson(root, resign(value)) }, /schema version/)
hostile('empty file count', (root) => { const value = carrier(root); value.files = []; writeJson(root, resign(value)) }, /file count/)
hostile('oversized carrier', (root) => writeFileSync(resolve(root, CARRIER_PATH), ' '.repeat(8 * 1024 * 1024 + 1)), /carrier size/)
hostile('wrong mode', (root) => { const value = carrier(root); value.files[0].mode = '100600'; writeJson(root, resign(value)) }, /mode/)
hostile('wrong file hash', (root) => { const value = carrier(root); value.files[0].sha256 = '0'.repeat(64); writeJson(root, resign(value)) }, /hash mismatch/)
hostile('invalid commit', (root) => { const value = carrier(root); value.commit = 'short'; writeJson(root, resign(value)) }, /commit/)
hostile('invalid tree', (root) => { const value = carrier(root); value.tree = 'short'; writeJson(root, resign(value)) }, /tree/)
hostile('wrong digest', (root) => { const value = carrier(root); value.digest = '0'.repeat(64); writeJson(root, value) }, /digest/)
hostile('modified source file', (root) => writeFileSync(resolve(root, 'src/app.mjs'), 'changed\n'), /byte length mismatch|hash mismatch/)
hostile('source symlink', (root) => symlinkSync('src/app.mjs', resolve(root, 'linked.mjs')), /symlink/)

test('stale private receipt fails finalizer fallback', () => {
  const { root } = fixture(); const source = sourceOnly(root)
  validateDeploymentSource(source, {})
  const receipt = JSON.parse(readFileSync(resolve(source, VALIDATION_RECEIPT_PATH), 'utf8'))
  receipt.commit = 'f'.repeat(40)
  writeFileSync(resolve(source, VALIDATION_RECEIPT_PATH), canonical(receipt))
  assert.throws(() => readValidatedCarrierSource(source), /digest|stale/)
})

test('Git-less finalization treats an explicitly empty provider commit as absent', () => {
  const { root, carrier: generated } = fixture(); const source = sourceOnly(root)
  validateDeploymentSource(source, {})
  mkdirSync(resolve(source, 'scripts'))
  cpSync(resolve(import.meta.dirname, 'create-deployment-source-carrier.mjs'), resolve(source, 'scripts/create-deployment-source-carrier.mjs'))
  cpSync(resolve(import.meta.dirname, 'finalize-stable-snapshot.mjs'), resolve(source, 'scripts/finalize-stable-snapshot.mjs'))
  mkdirSync(resolve(source, 'dist'))
  mkdirSync(resolve(source, 'api'))
  writeFileSync(resolve(source, 'dist/index.html'), '<script type="module" src="/assets/index-empty-provider.js"></script>')
  writeFileSync(resolve(source, 'snapshot/outcome-package-source.json'), canonical({ snapshot: { capturedAt: '2026-09-02T00:00:00.000Z' } }))
  execFileSync(process.execPath, ['scripts/finalize-stable-snapshot.mjs'], { cwd: source, env: { ...process.env, VERCEL_GIT_COMMIT_SHA: '' }, stdio: ['ignore', 'pipe', 'pipe'] })
  const finalized = JSON.parse(readFileSync(resolve(source, 'api/deployment-snapshot.mjs'), 'utf8').replace(/^export default /, ''))
  assert.equal(finalized.build.commit, generated.commit.slice(0, 12))
  assert.equal(finalized.build.tree, generated.tree.slice(0, 12))
})

test('provider commit normalization preserves exact absent and strict non-empty semantics', () => {
  assert.equal(normalizeProviderCommit(undefined), null)
  assert.equal(normalizeProviderCommit(''), null)
  assert.equal(normalizeProviderCommit('a'.repeat(40)), 'a'.repeat(40))
  for (const value of [' ', '\t', '\n', 'a'.repeat(39), 'a'.repeat(41), 'A'.repeat(40), 'not-a-commit']) {
    assert.throws(() => normalizeProviderCommit(value), /provider Git commit is invalid/)
  }
})

test('non-canonical carrier JSON fails closed', () => {
  const { root } = fixture(); const source = sourceOnly(root); const value = carrier(source)
  writeFileSync(resolve(source, CARRIER_PATH), JSON.stringify(value, null, 2))
  assert.throws(() => readAndValidateCarrier(source), /canonical/)
})

test('duplicate provider representation metadata fails canonical readback', () => {
  const { root } = fixture(); const source = sourceOnly(root); const value = vercelRow(source)
  const raw = readFileSync(resolve(source, CARRIER_PATH), 'utf8')
  writeFileSync(resolve(source, CARRIER_PATH), raw.replace(`"providerSha256":"${value.providerSha256}"`, `"providerSha256":"${value.providerSha256}","providerSha256":"${value.providerSha256}"`))
  assert.throws(() => readAndValidateCarrier(source), /canonical/)
})

test('duplicate observed representation metadata fails canonical readback', () => {
  const { root } = productionFixture(); const source = sourceOnly(root); const value = vercelRow(source)
  const raw = readFileSync(resolve(source, CARRIER_PATH), 'utf8')
  writeFileSync(resolve(source, CARRIER_PATH), raw.replace(`"observedSha256":"${value.observedSha256}"`, `"observedSha256":"${value.observedSha256}","observedSha256":"${value.observedSha256}"`))
  assert.throws(() => readAndValidateCarrier(source), /canonical/)
})
