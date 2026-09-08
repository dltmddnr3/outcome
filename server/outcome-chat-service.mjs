import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { runOutcomeChatConsumerOnce } from './outcome-chat-consumer-runner.mjs'
import { acquireChatServiceLease } from './outcome-chat-service-lease.mjs'

// Sequential coordinator only. Durable claims/idempotency remain repository-owned.
// Ambiguous dispatch disables further sends; response collection may still resolve it.
export async function runOutcomeChatService({ enabled = false, runOnce = runOutcomeChatConsumerOnce,
  signal, intervalMs = 2000, wait = (ms, signal) => delay(ms, undefined, { signal }),
  write = line => process.stdout.write(line), environment = process.env,
  acquireLease = acquireChatServiceLease } = {}) {
  if (enabled !== true || typeof runOnce !== 'function' || !signal || typeof signal.aborted !== 'boolean'
    || typeof acquireLease !== 'function'
    || !Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 60000) return 64
  let dispatch = true, phase = 'DISPATCH', responseFailures = 0
  const emit = state => { try { write(`OUTCOME_CHAT_SERVICE_${state}\n`) } catch {} }
  let release
  try { release = await acquireLease() } catch {}
  if (typeof release !== 'function') { emit('LEASE_SAFE_HOLD'); return 70 }
  emit('STARTED')
  try {
    while (!signal.aborted) {
      if (dispatch && responseFailures === 0) {
        phase = 'DISPATCH'
        const result = await runOnce({ environment, argv: [], write: () => {} })
        if (result === 2) { dispatch = false; emit('DISPATCH_UNKNOWN_RESPONSE_ONLY') }
        else if (result !== 0) { emit('DISPATCH_SAFE_HOLD'); return 70 }
      }
      if (signal.aborted) break
      phase = 'RESPONSES'
      const result = await runOnce({ environment, argv: ['--responses'], write: () => {} })
      if (result === 70 && responseFailures < 2) {
        responseFailures++; emit('RESPONSES_RECHECK')
        await wait(Math.min(intervalMs * 2 ** responseFailures, 60000), signal)
        continue
      }
      if (result !== 0) { emit('RESPONSES_SAFE_HOLD'); return 70 }
      if (responseFailures) emit('RESPONSES_RECOVERED')
      responseFailures = 0
      phase = 'WAIT'
      if (!signal.aborted) await wait(intervalMs, signal)
    }
    emit('STOPPED'); return 0
  } catch {
    if (signal.aborted) { emit('STOPPED'); return 0 }
    emit(`${phase}_SAFE_HOLD`); return 70
  } finally {
    try { await release() } catch { emit('LEASE_RELEASE_SAFE_HOLD'); return 70 }
  }
}

if (typeof process.argv[1] === 'string' && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const controller = new AbortController()
  const stop = () => controller.abort()
  process.once('SIGINT', stop); process.once('SIGTERM', stop)
  try {
    process.exitCode = await runOutcomeChatService({
      enabled: process.argv.length === 2 && process.env.OUTCOME_CHAT_SERVICE_ENABLED === '1'
        && process.env.OUTCOME_CHAT_RESPONSES_ENABLED === '1', signal: controller.signal,
    })
  } finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop) }
}
