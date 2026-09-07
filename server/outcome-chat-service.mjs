import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { runOutcomeChatConsumerOnce } from './outcome-chat-consumer-runner.mjs'

// Sequential coordinator only. Durable claims/idempotency remain repository-owned.
// Ambiguous dispatch disables further sends; response collection may still resolve it.
export async function runOutcomeChatService({ enabled = false, runOnce = runOutcomeChatConsumerOnce,
  signal, intervalMs = 2000, wait = (ms, signal) => delay(ms, undefined, { signal }),
  write = line => process.stdout.write(line), environment = process.env } = {}) {
  if (enabled !== true || typeof runOnce !== 'function' || !signal || typeof signal.aborted !== 'boolean'
    || !Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 60000) return 64
  let dispatch = true
  const emit = state => { try { write(`OUTCOME_CHAT_SERVICE_${state}\n`) } catch {} }
  emit('STARTED')
  try {
    while (!signal.aborted) {
      if (dispatch) {
        const result = await runOnce({ environment, argv: [], write: () => {} })
        if (result === 2) { dispatch = false; emit('DISPATCH_UNKNOWN_RESPONSE_ONLY') }
        else if (result !== 0) { emit('SAFE_HOLD'); return 70 }
      }
      if (signal.aborted) break
      const result = await runOnce({ environment, argv: ['--responses'], write: () => {} })
      if (result !== 0) { emit('SAFE_HOLD'); return 70 }
      if (!signal.aborted) await wait(intervalMs, signal)
    }
    emit('STOPPED'); return 0
  } catch {
    if (signal.aborted) { emit('STOPPED'); return 0 }
    emit('SAFE_HOLD'); return 70
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
