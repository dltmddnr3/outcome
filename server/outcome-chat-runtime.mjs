import { createOutcomeChatService } from './outcome-chat.mjs'
import { createOutcomeChatConsumer } from './outcome-chat-consumer.mjs'

export function createOutcomeChatRuntime(options = {}) {
  if (options.transportEnabled !== true) return null
  const bindingResolver = options.queueAdapter?.bindingResolver ?? options.bindingResolver
  const transport = options.queueAdapter?.transport ?? options.transport
  if (!options.repository || typeof bindingResolver !== 'function' || typeof transport !== 'function' || typeof options.ownerVerifier !== 'function') return null
  return createOutcomeChatService({ repository: options.repository, bindingResolver, transport, ownerVerifier: options.ownerVerifier, now: options.now, timeoutMs: options.timeoutMs, setTimer: options.setTimer, clearTimer: options.clearTimer })
}

export function createOutcomeChatConsumerRuntime(options = {}) {
  if (options.consumerEnabled !== true || !options.repository || !options.queueAdapter || typeof options.queueAdapter.bindingResolver !== 'function' || typeof options.queueAdapter.transport !== 'function') return null
  return createOutcomeChatConsumer({ repository: options.repository, bindingResolver: options.queueAdapter.bindingResolver, transport: options.queueAdapter.transport, consumerId: options.consumerId, now: options.now, leaseMs: options.leaseMs })
}
