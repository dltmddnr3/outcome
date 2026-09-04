import { lstatSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { types } from 'node:util'
import { createCodexQueueAdapter } from './outcome-chat-codex-queue.mjs'
import { createOutcomeChatPostgresRepository, createOutcomeChatTransactionPort } from './outcome-chat-postgres.mjs'
import { createOutcomeChatConsumerRuntime } from './outcome-chat-runtime.mjs'
import { readOutcomeChatPoolerUrl } from './outcome-chat-database-url.mjs'

export const OUTCOME_CHAT_CONSUMER_ENV = Object.freeze({
  enabled: 'OUTCOME_CHAT_CONSUMER_ENABLED',
  databaseUrl: 'OUTCOME_CHAT_DATABASE_URL',
  databaseCaPem: 'OUTCOME_CHAT_DATABASE_CA_PEM',
  consumerId: 'OUTCOME_CHAT_CONSUMER_ID',
  registryPath: 'OUTCOME_SESSION_REGISTRY',
  leaseMs: 'OUTCOME_CHAT_LEASE_MS',
  timeoutMs: 'OUTCOME_CHAT_QUEUE_TIMEOUT_MS',
})

const TERMINALS = Object.freeze({
  acknowledged: [0, 'OUTCOME_CHAT_CONSUMER_ACKNOWLEDGED\n'],
  idle: [0, 'OUTCOME_CHAT_CONSUMER_IDLE\n'],
  delivery_unknown: [2, 'OUTCOME_CHAT_CONSUMER_DELIVERY_UNKNOWN\n'],
  rejected: [3, 'OUTCOME_CHAT_CONSUMER_REJECTED\n'],
  failed: [4, 'OUTCOME_CHAT_CONSUMER_FAILED\n'],
  config: [64, 'OUTCOME_CHAT_CONSUMER_CONFIG_SAFE_HOLD\n'],
  runtime: [70, 'OUTCOME_CHAT_CONSUMER_RUNTIME_SAFE_HOLD\n'],
})

const disabled = () => ({ enabled: false })
const integer = (value, minimum, maximum) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null

export function readOutcomeChatConsumerConfiguration(environment = {}, { pathStat = lstatSync } = {}) {
  if (!environment || typeof environment !== 'object' || types.isProxy(environment) || (environment !== process.env && Object.getPrototypeOf(environment) !== Object.prototype)) return disabled()
  let descriptors
  try { descriptors = Object.getOwnPropertyDescriptors(environment) } catch { return disabled() }
  const read = (name, optional = false) => {
    const descriptor = descriptors[name]
    if (!descriptor) return optional ? '' : null
    return Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string' ? descriptor.value.trim() : null
  }
  try {
    if (read(OUTCOME_CHAT_CONSUMER_ENV.enabled) !== '1' || read('NODE_TLS_REJECT_UNAUTHORIZED', true) !== '') return disabled()
    const databaseUrl = read(OUTCOME_CHAT_CONSUMER_ENV.databaseUrl), databaseCaPem = read(OUTCOME_CHAT_CONSUMER_ENV.databaseCaPem), consumerId = read(OUTCOME_CHAT_CONSUMER_ENV.consumerId), registryPath = read(OUTCOME_CHAT_CONSUMER_ENV.registryPath)
    const leaseMs = integer(read(OUTCOME_CHAT_CONSUMER_ENV.leaseMs), 1_000, 300_000), timeoutMs = integer(read(OUTCOME_CHAT_CONSUMER_ENV.timeoutMs), 1, 60_000)
    if ([databaseUrl,databaseCaPem,consumerId,registryPath].some((value) => typeof value !== 'string')) return disabled()
    const canonicalUrl = readOutcomeChatPoolerUrl(databaseUrl) !== null
    const canonicalCa = databaseCaPem.startsWith('-----BEGIN CERTIFICATE-----\n') && databaseCaPem.endsWith('\n-----END CERTIFICATE-----') && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(databaseCaPem)
    const pathInfo = isAbsolute(registryPath) ? pathStat(registryPath) : null
    const protectedRegistry = pathInfo?.isFile?.() === true && (pathInfo.mode & 0o777) === 0o600
    if (!canonicalUrl || !canonicalCa || !/^[a-z][a-z0-9-]{1,63}$/.test(consumerId) || !protectedRegistry || leaseMs === null || timeoutMs === null) return disabled()
    return { enabled: true, databaseUrl, databaseCaPem, consumerId, registryPath, leaseMs, timeoutMs }
  } catch { return disabled() }
}

const emit = (kind, write) => { const [code, text] = TERMINALS[kind]; try { write(text) } catch {}; return code }

export async function runOutcomeChatConsumerOnce({
  environment = process.env,
  argv = process.argv.slice(2),
  driverLoader = () => import('pg'),
  repositoryFactory = createOutcomeChatPostgresRepository,
  transactionFactory = createOutcomeChatTransactionPort,
  queueAdapterFactory = createCodexQueueAdapter,
  runtimeFactory = createOutcomeChatConsumerRuntime,
  write = (text) => process.stdout.write(text),
  pathStat = lstatSync,
} = {}) {
  if (!Array.isArray(argv) || types.isProxy(argv) || argv.length !== 0) return emit('config', write)
  const configuration = readOutcomeChatConsumerConfiguration(environment, { pathStat })
  if (!configuration.enabled) return emit('config', write)
  let pool, outcome = 'runtime'
  try {
    const driver = await driverLoader()
    if (typeof driver?.Pool !== 'function') throw new Error('unavailable')
    pool = new driver.Pool({ connectionString: configuration.databaseUrl, ssl: { ca: configuration.databaseCaPem, rejectUnauthorized: true }, max: 1, allowExitOnIdle: true, connectionTimeoutMillis: configuration.timeoutMs })
    const repository = repositoryFactory({ transact: transactionFactory({ pool }) })
    const queueAdapter = queueAdapterFactory({ enabled: true, registryPath: configuration.registryPath, timeoutMs: configuration.timeoutMs })
    const runtime = runtimeFactory({ consumerEnabled: true, repository, queueAdapter, consumerId: configuration.consumerId, leaseMs: configuration.leaseMs })
    if (!runtime || typeof runtime.runOnce !== 'function') throw new Error('unavailable')
    const result = await runtime.runOnce()
    if (!result || !Object.hasOwn(TERMINALS, result.outcome) || result.outcome === 'config' || result.outcome === 'runtime') throw new Error('unavailable')
    outcome = result.outcome
  } catch { outcome = 'runtime' }
  if (pool) try { await pool.end() } catch { outcome = 'runtime' }
  return emit(outcome, write)
}

const direct = typeof process.argv[1] === 'string' && pathToFileURL(process.argv[1]).href === import.meta.url
if (direct) process.exitCode = await runOutcomeChatConsumerOnce()
