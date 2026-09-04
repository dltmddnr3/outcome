import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CARRIER_SCHEMA_VERSION = 1
export const CARRIER_PATH = 'snapshot/deployment-source-carrier.json'
export const VALIDATION_RECEIPT_PATH = '.outcome-runtime/deployment-source-validation.json'
export const REGULAR_MODES = new Set(['100644', '100755'])
export const UPLOAD_SOURCE_EXCLUDED_TRACKED_PATHS = new Set(['.gitignore'])
export const OBSERVED_VERCEL_SOURCE_SHA256 = '9b3a5f549ba69e0c67bc08d69522dab7431b1143b8f1d828631b52faa361e1e0'
export const OBSERVED_VERCEL_BYTES = 726
export const OBSERVED_VERCEL_SHA256 = '0b9dfe0b73893f33d4cff1c5f7762a3705950bc388291a2612c50bcc8db90a22'
export const sha256 = (value) => createHash('sha256').update(value).digest('hex')
export const canonical = (value) => `${JSON.stringify(value)}\n`

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

export function createCarrier(root) {
  const commit = git(root, 'rev-parse', 'HEAD')
  const tree = git(root, 'rev-parse', 'HEAD^{tree}')
  assert.match(commit, /^[0-9a-f]{40}$/, 'full Git commit is required')
  assert.match(tree, /^[0-9a-f]{40}$/, 'full Git tree is required')
  assert.equal(git(root, 'status', '--porcelain=v1', '--untracked-files=no'), '', 'tracked checkout must be clean')

  const entries = execFileSync('git', ['-C', root, 'ls-files', '-s', '-z'], { encoding: 'buffer' }).toString('utf8').split('\0').filter(Boolean)
  const files = entries.map((entry) => {
    const match = entry.match(/^(\d{6}) [0-9a-f]{40} 0\t(.+)$/s)
    assert.ok(match, 'tracked entry shape is invalid')
    const [, mode, path] = match
    if (UPLOAD_SOURCE_EXCLUDED_TRACKED_PATHS.has(path)) return null
    assert.ok(REGULAR_MODES.has(mode), `tracked entry is not a regular file: ${path}`)
    const absolute = resolve(root, path)
    const stat = lstatSync(absolute)
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `tracked entry is not a regular file: ${path}`)
    const bytes = readFileSync(absolute)
    const sourceSha256 = sha256(bytes)
    const providerBytes = path === 'vercel.json' ? Buffer.from(JSON.stringify(JSON.parse(bytes.toString('utf8')))) : null
    const observedProviderRepresentation = path === 'vercel.json' && sourceSha256 === OBSERVED_VERCEL_SOURCE_SHA256
    return {
      path,
      bytes: bytes.length,
      mode,
      sha256: sourceSha256,
      ...(providerBytes ? { providerBytes: providerBytes.length, providerSha256: sha256(providerBytes) } : {}),
      ...(observedProviderRepresentation ? {
        observedSourceSha256: OBSERVED_VERCEL_SOURCE_SHA256,
        observedBytes: OBSERVED_VERCEL_BYTES,
        observedSha256: OBSERVED_VERCEL_SHA256,
      } : {}),
    }
  }).filter(Boolean).sort((a, b) => a.path.localeCompare(b.path, 'en'))

  const body = { schemaVersion: CARRIER_SCHEMA_VERSION, commit, tree, files }
  return { ...body, digest: sha256(canonical(body)) }
}

export function writeCarrier(root) {
  const carrier = createCarrier(root)
  const target = resolve(root, CARRIER_PATH)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, canonical(carrier), { encoding: 'utf8', mode: 0o600 })
  return carrier
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const carrier = writeCarrier(root)
  console.log(`deployment source carrier created: files=${carrier.files.length}, digest=${carrier.digest}`)
}
