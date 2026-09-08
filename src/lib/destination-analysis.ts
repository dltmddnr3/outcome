import { destinationQuestions, type DestinationDomainId } from './destination-discovery'

export type DestinationProposal = {
  field: DestinationDomainId
  value: string
  startLine: number
  endLine: number
  quote: string
  status: 'needs_confirmation'
}

const fields = new Set(destinationQuestions.map(question => question.id))
const fail = (): never => { throw new Error('analysis_unavailable') }
const exact = (value: unknown, keys: string[]): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) return fail()
  return value as Record<string, unknown>
}
const safe = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 4000
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  && !/(?:\/(?:Users|home|private\/tmp|tmp)\/|-----BEGIN .*PRIVATE KEY-----|\b(?:bearer|basic)\s+\S+|\b(?:token|secret|password|api[_ -]?key|credential)\s*[:=]\s*\S+)/i.test(value.normalize('NFKC'))
  && !/\b(?:sk|pk|ghp|github_pat|xox[baprs]|vercel|sb_secret)[-_][A-Za-z0-9_-]{8,}/.test(value.normalize('NFKC'))

export async function destinationSourceSha256(source: string): Promise<string> {
  if (typeof source !== 'string') return fail()
  const bytes = new TextEncoder().encode(source)
  if (bytes.length > 65536) return fail()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// The Planner supplies semantic suggestions; code proves citation identity only.
// A verbatim citation cannot prove entailment. Every proposal still needs owner review.
export async function validateDestinationAnalysis(source: string, serialized: string) {
  if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).length > 65536) return fail()
  let parsed: unknown
  try { parsed = JSON.parse(serialized) } catch { return fail() }
  const root = exact(parsed, ['schemaVersion', 'sourceSha256', 'proposals'])
  if (root.schemaVersion !== 1 || root.sourceSha256 !== await destinationSourceSha256(source)
    || !Array.isArray(root.proposals) || root.proposals.length > 8) return fail()
  const lines = source.split(/\r?\n/), proposals: DestinationProposal[] = [], counts = new Map<DestinationDomainId, number>()
  for (const raw of root.proposals) {
    const item = exact(raw, ['field', 'value', 'startLine', 'endLine', 'quote'])
    if (!fields.has(item.field as DestinationDomainId) || !safe(item.value) || !safe(item.quote)
      || !Number.isSafeInteger(item.startLine) || !Number.isSafeInteger(item.endLine)) return fail()
    const startLine = item.startLine as number, endLine = item.endLine as number, field = item.field as DestinationDomainId
    if (startLine < 1 || endLine < startLine || endLine > lines.length || lines.slice(startLine - 1, endLine).join('\n') !== item.quote) return fail()
    counts.set(field, (counts.get(field) ?? 0) + 1)
    proposals.push({ field, value: item.value.trim(), startLine, endLine, quote: item.quote, status: 'needs_confirmation' })
  }
  const conflicts = [...counts].filter(([, count]) => count > 1).map(([field]) => field)
  return {
    sourceSha256: root.sourceSha256 as string,
    proposals,
    conflicts,
    gaps: destinationQuestions.filter(question => !counts.has(question.id) || conflicts.includes(question.id)).map(question => question.id),
    confirmedAnswers: {},
    executionAuthority: false as const,
  }
}
