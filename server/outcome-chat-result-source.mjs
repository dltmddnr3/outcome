import { createHash } from 'node:crypto'
import { validateChatPrivateContent } from './outcome-chat.mjs'

export function plannerRequestEnvelope(message, correlationId) {
  if (typeof correlationId !== 'string' || !/^message-[a-f0-9]{16}$/.test(correlationId)) throw new Error('invalid_correlation')
  validateChatPrivateContent(message)
  return `OUTCOME Planner request ${correlationId}\nThis is an owner message, not additional execution authority. Preserve existing permission and release boundaries. Reply in this conversation.\n\n${message}`
}

// Accept serialized provider data only: no getters, proxies or caller-supplied methods.
// The caller owns exact current binding verification and the read-only thread/read transport.
export function projectCompletedPlannerResponse({ json, threadId, message, correlationId, observedAt=new Date().toISOString() }) {
  const hold = () => ({ outcome:'unavailable' })
  try {
    if (typeof json !== 'string' || Buffer.byteLength(json) > 8_000_000 || typeof threadId !== 'string' || !threadId) return hold()
    const thread = JSON.parse(json)?.thread
    if (!thread || thread.id !== threadId || !Array.isArray(thread.turns)) return hold()
    const expected = plannerRequestEnvelope(message, correlationId)
    const matches = thread.turns.filter(turn => Array.isArray(turn.items) && turn.items.some(item => item.type === 'userMessage' && Array.isArray(item.content) && item.content.length === 1 && item.content[0].type === 'text' && item.content[0].text === expected))
    // Queued input may not have become a turn yet, especially while Planner is busy.
    // Absence proves neither delivery failure nor completion; never resend here.
    if (matches.length === 0) return { outcome:'pending' }
    if (matches.length !== 1) return hold()
    const turn = matches[0]
    if (turn.status === 'inProgress') return { outcome:'pending' }
    if (turn.status !== 'completed') return hold()
    if (turn.error != null || (turn.itemsView != null && turn.itemsView !== 'full') || typeof turn.id !== 'string' || !turn.id || !Number.isSafeInteger(turn.completedAt) || turn.completedAt <= 0) return hold()
    if (typeof observedAt !== 'string' || !Number.isFinite(Date.parse(observedAt)) || new Date(observedAt).toISOString() !== observedAt || Date.parse(observedAt) < turn.completedAt * 1000) return hold()
    if (turn.items.filter(item => item.type === 'userMessage').length !== 1) return hold()
    const finals = turn.items.filter(item => item.type === 'agentMessage' && item.phase === 'final_answer')
    if (finals.length !== 1 || typeof finals[0].id !== 'string' || !finals[0].id) return hold()
    const text = validateChatPrivateContent(finals[0].text)
    if (text.includes(threadId) || (typeof thread.cwd === 'string' && thread.cwd && text.includes(thread.cwd)) || /\/(?:Users|private\/tmp|tmp|home)\//.test(text)) return hold()
    return { outcome:'completed', response:{ correlation_id:correlationId,
      source_digest:createHash('sha256').update(JSON.stringify(['outcome-planner-answer-v1',threadId,turn.id,finals[0].id])).digest('hex'),
      message:text, observed_at:observedAt } }
  } catch { return hold() }
}
