import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const shortHex = (value) => typeof value === 'string' && /^[0-9a-f]{12,40}$/i.test(value) ? value.slice(0, 12).toLowerCase() : null
const git = (...args) => { try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null } }

export function extractBuiltAsset(html) {
  return html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] ?? null
}

export function finalizeDeploymentSnapshot({ source, commit, tree, asset }) {
  const receipt = { repository: 'dltmddnr3/outcome', ref: 'main', commit: shortHex(commit), tree: shortHex(tree), asset: typeof asset === 'string' && /^index-[A-Za-z0-9_-]+\.js$/.test(asset) ? asset : null, runtimeNowPinned: false }
  assert.ok(receipt.commit, 'deployment commit is required')
  assert.ok(receipt.asset, 'built index asset is required')
  return { ...source, build: receipt }
}

export function assertFinalizedReceipt(snapshot, expected) {
  assert.equal(snapshot.build?.commit, shortHex(expected.commit), 'served snapshot commit is stale')
  assert.equal(snapshot.build?.tree, shortHex(expected.tree), 'served snapshot tree is stale')
  assert.equal(snapshot.build?.asset, expected.asset, 'served snapshot asset is stale or missing')
}

function finalize() {
  const source = JSON.parse(readFileSync(resolve(root, 'snapshot/outcome-package-source.json'), 'utf8'))
  const deployedCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? git('rev-parse', 'HEAD')
  const deployedTree = process.env.OUTCOME_DEPLOY_TREE ?? (deployedCommit ? git('rev-parse', `${deployedCommit}^{tree}`) : null)
  const asset = process.env.OUTCOME_DEPLOY_ASSET ?? extractBuiltAsset(readFileSync(resolve(root, 'dist/index.html'), 'utf8'))
  const snapshot = finalizeDeploymentSnapshot({ source, commit: deployedCommit, tree: deployedTree, asset })
  assertFinalizedReceipt(snapshot, { commit: deployedCommit, tree: deployedTree, asset })
  writeFileSync(resolve(root, 'api/deployment-snapshot.mjs'), `export default ${JSON.stringify(snapshot)}\n`, 'utf8')
  console.log(`deployment snapshot finalized: commit=${snapshot.build.commit}, tree=${snapshot.build.tree ?? 'unavailable'}, asset=${snapshot.build.asset}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) finalize()
