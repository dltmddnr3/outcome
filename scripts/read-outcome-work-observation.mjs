import { lstat, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import snapshot from '../api/deployment-snapshot.mjs'
import { readDestinationProtectedBytes } from './run-destination-questions.mjs'
import { readWorkSessionInput } from './run-outcome-work.mjs'
import { loadRegistry } from '../server/outcome-session-registry-persistence.mjs'
import { createHostedIdentityRuntime } from '../server/account-access-hosted.mjs'
import { createPreviewWorkIdentity } from '../server/outcome-preview-work-identity.mjs'
import { createDesktopObservationReader } from '../server/outcome-desktop-observation-reader.mjs'
import { createLocalWorkObservationSource, createStoredWorkJournalReader } from '../server/outcome-local-work-source.mjs'

// Explicit one-shot operational reader. No listener, scheduler, token file,
// schema bootstrap or provider mutation. The token remains in process memory.
export async function readOutcomeWorkObservation({ configPath, tokenReader, environment = process.env,
  write = value => process.stdout.write(value), identityFactory = createHostedIdentityRuntime,
  registryReader = loadRegistry, runtimeReader = createDesktopObservationReader({ socketPath: join(homedir(), '.codex', 'ipc', 'ipc.sock') }), now = Date.now } = {}) {
  let database, token
  try {
    const configBytes = await readDestinationProtectedBytes(configPath)
    const config = JSON.parse(configBytes)
    const keys = ['schemaVersion', 'candidatePin', 'databasePath', 'scopeJson', 'accountRef', 'workspaceId', 'ownerCwd']
    if (config?.schemaVersion === 2) keys.push('previewOrigin')
    if (!config || Object.keys(config).length !== keys.length || keys.some(key => !Object.hasOwn(config, key)) || ![1, 2].includes(config.schemaVersion)) throw Error()
    const checkout = fileURLToPath(new URL('..', import.meta.url))
    const git = args => execFileSync('git', args, { cwd: checkout, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' } }).trim()
    if (git(['rev-parse', 'HEAD']) !== config.candidatePin) throw Error()
    git(['diff', '--exit-code', 'HEAD', '--', 'scripts', 'server', 'api', 'package.json', 'package-lock.json'])
    if (await realpath(config.ownerCwd) !== config.ownerCwd || await realpath(config.databasePath) !== config.databasePath) throw Error()
    const before = await lstat(config.databasePath), parent = await lstat(dirname(config.databasePath))
    if (!before.isFile() || before.isSymbolicLink() || before.uid !== process.getuid() || before.nlink !== 1 || (before.mode & 0o777) !== 0o600
      || !parent.isDirectory() || parent.uid !== process.getuid() || (parent.mode & 0o777) !== 0o700) throw Error()
    database = new DatabaseSync(config.databasePath, { readOnly: true })
    const after = await lstat(config.databasePath)
    if (after.ino !== before.ino || after.dev !== before.dev) throw Error()
    const scope = JSON.parse(config.scopeJson)
    const source = createLocalWorkObservationSource({ now,
      readJournal: createStoredWorkJournalReader(database, { now }), readRuntime: runtimeReader,
      resolveBinding: async account => {
        if (account.accountRef !== config.accountRef || account.workspaceId !== config.workspaceId || account.projectId !== scope.projectId
          || !(await readDestinationProtectedBytes(configPath)).equals(configBytes)) return null
        const rows = registryReader(join(config.ownerCwd, '.outcome-runtime', 'bindings.json')).bindings.filter(row => row.project_id === scope.projectId && row.role === 'planner' && !['replaced', 'revoked'].includes(row.status))
        if (rows.length !== 1 || !['active', 'idle'].includes(rows[0].status) || rows[0].binding_version !== scope.bindingVersion) return null
        return JSON.stringify({ ...account, scopeJson: config.scopeJson, threadId: rows[0].locator_ref })
      },
    })
    const runtime = config.schemaVersion === 2
      ? createPreviewWorkIdentity({ previewOrigin: config.previewOrigin, accountRef: config.accountRef, workspaceId: config.workspaceId, projectId: scope.projectId, workObservationSource: source, now })
      : identityFactory({ environment, sealedSnapshot: snapshot, workObservationSource: source, now })
    if (typeof runtime?.service?.readWorkObservation !== 'function' || typeof tokenReader !== 'function') throw Error()
    token = await tokenReader()
    if (typeof token !== 'string' || !token || Buffer.byteLength(token) > 16384 || /\s|[\u0000-\u001f\u007f]/.test(token)) throw Error()
    const result = await runtime.service.readWorkObservation({ token, requestedProjectId: scope.projectId })
    if (!result?.observation) throw Error()
    write(JSON.stringify(result) + '\n')
    return 0
  } catch {
    write('{"outcome":"observation_unavailable","executionAuthority":false,"completionAuthority":false}\n')
    return 70
  } finally { token = undefined; try { database?.close() } catch {} }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await readOutcomeWorkObservation({ configPath: process.argv.length === 3 ? process.argv[2] : undefined, tokenReader: () => readWorkSessionInput(process.stdin) })
}
