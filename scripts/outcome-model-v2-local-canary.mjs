import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateOutcomeSourceManifest } from '../server/outcome-context-bootstrap.mjs'

const finalProductCandidate = '28db58fd5018dc4094c9cbbf764d0e86e83cbea4'
const sources = Object.freeze({
  agents: 'AGENTS.md', contract: 'docs/OUTCOME_CONTRACT.md', map: 'docs/OUTCOME_MAP.md',
  'slice-contract': 'docs/OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION_CONTRACT.md', gate: 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md',
  'builder-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_PUBLIC_MILESTONE_LABEL_CORRECTION_BUILDER_RECEIPT.md',
  'qa-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_PUBLIC_MILESTONE_LABEL_CORRECTION_FRESH_REQA_RECEIPT.md',
  'promotion-receipt': 'docs/OUTCOME_MODEL_V2_SERVICE_PROJECTION_Q2_EVIDENCE_PROMOTION_RECEIPT.md',
  'failed-audit': 'docs/OUTCOME_MODEL_V2_A5_COHERENT_CANDIDATE_FRESH_RELEASE_AUDIT_RECEIPT.md',
  'activation-gate': 'GATES_OUTCOME_MODEL_V2_SELECTIVE_CONTEXT_LOCAL_ACTIVATION.md',
  snapshot: 'snapshot/outcome-model-v2-current.json',
})
const pinnedDigests = Object.freeze({
  agents: 'cbda193480670fdbc0dfd5aa1cbcae2a945418ba8b670246997d3ba44f39cb93', contract: 'c25e8f3920018aeca4bb219c8f9a678fa21700f3d4ebfe0d6c66a5481d20a442', map: 'da2b8c47bce8522d36f6e70ca5c5dc940988df6f8cf2b773b8e13a68e1bf60d3',
  'slice-contract': 'b7c0f31cec46dc658b950b28a65dff02ee21867a67f72a3e61428651de2ae657', gate: 'b6c156c60cfca729c261641a96401590f44d9e47845d5ae34dd4a028790e7357',
  'builder-receipt': '80a01e7597941d21b281da26b711005421831670ff4668ce80d2e6302a90acad', 'qa-receipt': '41f80e48b9475f59fabb636768470f87bf9d49cef22544e8b26f558fa0c0e8a3',
  'promotion-receipt': '75cae693bad35f8a7791941eefbd008605162073ee817fa3c7632d73c8b98dfb', 'failed-audit': '9e77063cfbc09517fa5e8376846902075a449205006ff021eff91765c279ba5b',
  'activation-gate': '50987cbba74c275ce5143c26d4ecb20c2fad377dfea2b7f50b75c621a989628f',
  snapshot: '8981ec71e586822b1f498e1f82e6539930a9841b88b36759db0dd42e34da7302',
})
const digest = (value) => createHash('sha256').update(value).digest('hex')
const failClosed = (reason) => { process.stdout.write(`${JSON.stringify({ schema_version: 2, outcome: 'cold_compile_required', reason, automatic_retry_count: 0, safety: { duplicate_execution_count: 0, unauthorized_canonical_transition_count: 0, registry_provider_environment_mutation_count: 0, false_completion_count: 0 } }, null, 2)}\n`); process.exitCode = 2 }
const sourcePaths = Object.values(sources)
const sourcePathValid = (path) => typeof path === 'string' && !isAbsolute(path) && path.split('/').every((part) => part && part !== '.' && part !== '..')
const sourceSetValid = sourcePaths.every(sourcePathValid) && new Set(sourcePaths).size === sourcePaths.length
const loadHeadSources = () => {
  if (!sourceSetValid) throw new Error('canonical_source_unavailable')
  const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const git = (args) => execFileSync('git', ['-C', scriptRoot, ...args], { maxBuffer: 16 * 1024 * 1024 })
  const repositoryRoot = realpathSync(git(['rev-parse', '--show-toplevel']).toString().trim())
  if (repositoryRoot !== realpathSync(scriptRoot)) throw new Error('canonical_source_unavailable')
  const tree = git(['rev-parse', '--verify', 'HEAD^{tree}']).toString().trim()
  if (!/^[a-f0-9]{40,64}$/.test(tree) || git(['cat-file', '-t', tree]).toString().trim() !== 'tree') throw new Error('canonical_source_unavailable')
  return Object.fromEntries(Object.entries(sources).map(([key, path]) => {
    const rows = git(['ls-tree', '-z', tree, '--', path]).toString().split('\0').filter(Boolean)
    if (rows.length !== 1) throw new Error('canonical_source_unavailable')
    const tab = rows[0].indexOf('\t'); const [mode, type, object] = rows[0].slice(0, tab).split(' ')
    if (tab < 0 || rows[0].slice(tab + 1) !== path || type !== 'blob' || !['100644', '100755'].includes(mode) || !/^[a-f0-9]{40,64}$/.test(object)) throw new Error('canonical_source_unavailable')
    return [key, git(['cat-file', 'blob', object])]
  }))
}
const loadFixtureSources = (fixtureRoot) => {
  if (!sourceSetValid) throw new Error('source_input_invalid')
  const requestedRoot = resolve(fixtureRoot); const rootStat = lstatSync(requestedRoot)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('source_input_invalid')
  const canonicalRoot = realpathSync(requestedRoot)
  return Object.fromEntries(Object.entries(sources).map(([key, path]) => {
    const target = resolve(canonicalRoot, path); const fromRoot = relative(canonicalRoot, target)
    if (!fromRoot || fromRoot.startsWith(`..${sep}`) || fromRoot === '..' || isAbsolute(fromRoot)) throw new Error('source_input_invalid')
    const stat = lstatSync(target)
    if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(target) !== target) throw new Error('source_input_invalid')
    return [key, readFileSync(target)]
  }))
}

const args = process.argv.slice(2)
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--source-root' || !args[1])) failClosed('invalid_source_root')
else {
  let sourceBytes
  try { sourceBytes = args.length ? loadFixtureSources(args[1]) : loadHeadSources() } catch (error) { failClosed(args.length ? error.code === 'ENOENT' ? 'source_input_missing' : 'source_input_invalid' : 'canonical_source_unavailable') }
  if (sourceBytes) {
    const actualDigests = Object.fromEntries(Object.entries(sourceBytes).map(([key, bytes]) => [key, digest(bytes)]))
    const manifestValidation = validateOutcomeSourceManifest(actualDigests, pinnedDigests)
    if (manifestValidation.outcome !== 'ready') failClosed(manifestValidation.reason)
    else {
      canary: {
      const snapshotBytes = sourceBytes.snapshot
      let snapshot
      try { snapshot = JSON.parse(snapshotBytes) } catch { snapshot = null }
      if (snapshot?.outcome !== 'current_projection' || snapshot.candidate_commit !== finalProductCandidate || snapshot.current?.acceptance_gap?.closed !== 8 || snapshot.current?.acceptance_gap?.total !== 8 || snapshot.current?.acceptance_gap?.remaining !== 0 || snapshot.current?.ready_frontier?.length !== 0 || snapshot.current.next_action !== null || snapshot.current.cherry_action !== null || snapshot.current.active_work !== null || snapshot.rollback?.available !== true || Object.values(snapshot.safety ?? {}).some((value) => value !== 0)) failClosed('snapshot_projection_invalid')
      if (process.exitCode) break canary
      failClosed('o1_evidence_closed')
      }
    }
  }
}
