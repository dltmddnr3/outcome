import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARRIER_PATH, CARRIER_SCHEMA_VERSION, OBSERVED_VERCEL_BYTES, OBSERVED_VERCEL_SHA256, OBSERVED_VERCEL_SOURCE_SHA256, REGULAR_MODES, UPLOAD_SOURCE_EXCLUDED_TRACKED_PATHS, VALIDATION_RECEIPT_PATH, canonical, sha256 } from './create-deployment-source-carrier.mjs'

const MAX_CARRIER_BYTES = 8 * 1024 * 1024
const MAX_FILES = 10_000
const EXCLUDED_DIRS = new Set(['.git', '.outcome-runtime', '.vercel', 'dist', 'node_modules'])
const EXCLUDED_FILES = new Set([CARRIER_PATH, 'api/deployment-snapshot.mjs', 'tsconfig.app.tsbuildinfo', 'tsconfig.node.tsbuildinfo', ...UPLOAD_SOURCE_EXCLUDED_TRACKED_PATHS])
const exactKeys = (value, expected, label) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  assert.deepEqual(Object.keys(value), expected, `${label} schema is invalid`)
}
const safePath = (path) => typeof path === 'string' && path.length > 0 && path.length <= 512 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').includes('..') && !path.split('/').includes('.') && !/[\u0000-\u001f\u007f]/.test(path)
const git = (root, ...args) => { try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

export function matchVercelRepresentation(file, observedBytes, observedSha256) {
  const sourceMatch = observedBytes === file.bytes && observedSha256 === file.sha256
  const providerMatch = observedBytes === file.providerBytes && observedSha256 === file.providerSha256
  const observedMatch = file.sha256 === OBSERVED_VERCEL_SOURCE_SHA256
    && file.observedSourceSha256 === file.sha256
    && file.observedBytes === OBSERVED_VERCEL_BYTES
    && file.observedSha256 === OBSERVED_VERCEL_SHA256
    && observedBytes === file.observedBytes
    && observedSha256 === file.observedSha256
  return { sourceMatch, providerMatch, observedMatch, accepted: sourceMatch || providerMatch || observedMatch }
}

function walk(root, directory = root, rows = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const absolute = resolve(directory, entry.name)
    const path = relative(root, absolute).split(sep).join('/')
    if (EXCLUDED_DIRS.has(entry.name) && directory === root) continue
    if (EXCLUDED_FILES.has(path)) continue
    const stat = lstatSync(absolute)
    assert.ok(!stat.isSymbolicLink(), `source symlink is forbidden: ${path}`)
    if (stat.isDirectory()) walk(root, absolute, rows)
    else {
      assert.ok(stat.isFile(), `non-regular source entry is forbidden: ${path}`)
      rows.push(path)
    }
  }
  return rows
}

export function readAndValidateCarrier(root) {
  const target = resolve(root, CARRIER_PATH)
  const raw = readFileSync(target)
  assert.ok(raw.length > 0 && raw.length <= MAX_CARRIER_BYTES, 'carrier size is invalid')
  const carrier = JSON.parse(raw.toString('utf8'))
  exactKeys(carrier, ['schemaVersion', 'commit', 'tree', 'files', 'digest'], 'carrier')
  assert.equal(carrier.schemaVersion, CARRIER_SCHEMA_VERSION, 'carrier schema version is invalid')
  assert.match(carrier.commit, /^[0-9a-f]{40}$/, 'carrier commit is invalid')
  assert.match(carrier.tree, /^[0-9a-f]{40}$/, 'carrier tree is invalid')
  assert.ok(Array.isArray(carrier.files) && carrier.files.length > 0 && carrier.files.length <= MAX_FILES, 'carrier file count is invalid')
  const seen = new Set()
  let previous = null
  for (const file of carrier.files) {
    const providerTransformed = file?.path === 'vercel.json'
    const observedProviderRepresentation = providerTransformed && file?.sha256 === OBSERVED_VERCEL_SOURCE_SHA256
    exactKeys(file, providerTransformed
      ? ['path', 'bytes', 'mode', 'sha256', 'providerBytes', 'providerSha256', ...(observedProviderRepresentation ? ['observedSourceSha256', 'observedBytes', 'observedSha256'] : [])]
      : ['path', 'bytes', 'mode', 'sha256'], 'carrier file')
    assert.ok(safePath(file.path), 'carrier file path is unsafe')
    assert.ok(previous === null || previous.localeCompare(file.path, 'en') < 0, 'carrier files are not strictly sorted')
    assert.ok(!seen.has(file.path), 'carrier file path is duplicated')
    assert.ok(Number.isSafeInteger(file.bytes) && file.bytes >= 0, 'carrier file byte length is invalid')
    assert.ok(typeof file.mode === 'string' && REGULAR_MODES.has(file.mode), 'carrier file mode is invalid')
    assert.match(file.sha256, /^[0-9a-f]{64}$/, 'carrier file hash is invalid')
    if (providerTransformed) {
      assert.ok(Number.isSafeInteger(file.providerBytes) && file.providerBytes >= 0, 'carrier provider byte length is invalid')
      assert.match(file.providerSha256, /^[0-9a-f]{64}$/, 'carrier provider hash is invalid')
      if (observedProviderRepresentation) {
        assert.equal(file.observedSourceSha256, OBSERVED_VERCEL_SOURCE_SHA256, 'carrier observed source hash is invalid')
        assert.equal(file.observedBytes, OBSERVED_VERCEL_BYTES, 'carrier observed byte length is invalid')
        assert.equal(file.observedSha256, OBSERVED_VERCEL_SHA256, 'carrier observed hash is invalid')
      }
    }
    const absolute = resolve(root, file.path)
    const stat = lstatSync(absolute)
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `carrier file is not regular: ${file.path}`)
    const bytes = readFileSync(absolute)
    if (providerTransformed) {
      const observedSha256 = sha256(bytes)
      const match = matchVercelRepresentation(file, bytes.length, observedSha256)
      assert.ok(match.accepted, `carrier file bytes mismatch: ${file.path} observedBytes=${bytes.length} observedSha256=${observedSha256} sourceMatch=${match.sourceMatch} providerMatch=${match.providerMatch} observedMatch=${match.observedMatch}`)
    } else {
      assert.equal(bytes.length, file.bytes, `carrier file byte length mismatch: ${file.path}`)
      assert.equal(sha256(bytes), file.sha256, `carrier file hash mismatch: ${file.path}`)
    }
    const actualMode = stat.mode & 0o111 ? '100755' : '100644'
    assert.equal(actualMode, file.mode, `carrier file mode mismatch: ${file.path}`)
    seen.add(file.path)
    previous = file.path
  }
  assert.deepEqual(walk(root), carrier.files.map((file) => file.path), 'source file closure does not match carrier')
  const body = { schemaVersion: carrier.schemaVersion, commit: carrier.commit, tree: carrier.tree, files: carrier.files }
  assert.equal(carrier.digest, sha256(canonical(body)), 'carrier digest is invalid')
  assert.equal(raw.toString('utf8'), canonical(carrier), 'carrier is not canonical JSON')
  return carrier
}

export function validateDeploymentSource(root, env = process.env) {
  const providerCommit = env.VERCEL_GIT_COMMIT_SHA || null
  if (providerCommit !== null) assert.match(providerCommit, /^[0-9a-f]{40}$/, 'provider Git commit is invalid')
  const gitCommit = git(root, 'rev-parse', 'HEAD')
  const carrier = (() => { try { return readAndValidateCarrier(root) } catch (error) { if (providerCommit || gitCommit) { try { readFileSync(resolve(root, CARRIER_PATH)); throw error } catch (readError) { if (readError === error) throw error; return null } } throw error } })()
  if (!providerCommit && !gitCommit) assert.ok(carrier, 'validated deployment source carrier is required')
  if (carrier && providerCommit) assert.equal(carrier.commit, providerCommit, 'carrier contradicts provider Git commit')
  if (carrier && gitCommit) {
    assert.equal(carrier.commit, gitCommit, 'carrier contradicts Git HEAD')
    assert.equal(carrier.tree, git(root, 'rev-parse', `${gitCommit}^{tree}`), 'carrier contradicts Git tree')
  }
  if (!carrier) return { mode: providerCommit ? 'provider-git' : 'git-head' }
  const body = { schemaVersion: 1, carrierDigest: carrier.digest, commit: carrier.commit, tree: carrier.tree }
  const receipt = { ...body, receiptDigest: sha256(canonical(body)) }
  const target = resolve(root, VALIDATION_RECEIPT_PATH)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, canonical(receipt), { encoding: 'utf8', mode: 0o600 })
  return { mode: 'carrier', receipt }
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateDeploymentSource(root)
  console.log(`deployment source validation PASS: mode=${result.mode}`)
}
