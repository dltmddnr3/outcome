const briefMatchers = {
  problem: ['문제', 'problem'],
  targetUser: ['대상 사용자', '타겟 사용자', 'target user', 'user'],
  outcome: ['원하는 결과', '결과', 'outcome'],
  scope: ['포함 범위', '범위', 'scope'],
  nonGoals: ['비목표', '하지 않는 것', 'non-goal', 'non goal'],
  constraints: ['제약', 'constraint'],
  acceptance: ['수용 기준', '완료 조건', 'acceptance'],
  failureRecovery: ['실패·복구', '실패/복구', '복구', 'failure', 'rollback'],
}

const stripPrefix = (line) => line.replace(/^\s{0,3}(?:[-*+]\s+|#{1,6}\s+|\d+[.)]\s+)?/, '').trim()


export function analyzeDestinationBrief(text) {
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > 65_536) throw new Error('payload_too_large')
  const answers = {}
  const evidence = [], conflicts = new Set()
  let active = null
  let fence = null
  const flush = () => {
    if (!active) return
    const value = active.lines.join('\n').trim()
    if (value) {
      evidence.push({ field: active.field, startLine: active.startLine, endLine: active.endLine, value })
      const previous = answers[active.field]
      if (previous && previous.replace(/\s+/g, ' ') !== value.replace(/\s+/g, ' ')) conflicts.add(active.field)
      if (!conflicts.has(active.field)) answers[active.field] = value
      else delete answers[active.field]
    }
    active = null
  }
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(rawLine)
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1]
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null
      continue
    }
    if (fence) continue
    const line = stripPrefix(rawLine)
    if (!line) continue
    const normalized = line.toLocaleLowerCase('ko-KR')
    let found = false
    for (const id of Object.keys(briefMatchers)) {
      const marker = briefMatchers[id].find(candidate => {
        const prefix = candidate.toLocaleLowerCase('ko-KR')
        return normalized === prefix || normalized.startsWith(prefix) && /^\s*[:：—–-]\s*/.test(line.slice(candidate.length))
      })
      if (!marker) continue
      flush()
      const value = line.slice(marker.length).replace(/^\s*[:：—–-]\s*/, '').trim()
      active = { field: id, startLine: index + 1, endLine: index + 1, lines: value ? [value] : [] }
      found = true; break
    }
    if (found) continue
    if (/^\s{0,3}#{1,6}\s/.test(rawLine)) { flush(); continue }
    if (/^[^:：]{1,80}[:：]\s*\S/.test(line)) { flush(); continue }
    if (active) { active.lines.push(rawLine.trim()); active.endLine = index + 1 }
  }
  flush()
  return { answers, conflicts: [...conflicts], evidence }
}
