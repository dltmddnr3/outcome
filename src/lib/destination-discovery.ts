export type DestinationMode = 'guided_200q' | 'brief_gap'

export type DestinationDomainId =
  | 'problem'
  | 'targetUser'
  | 'outcome'
  | 'scope'
  | 'nonGoals'
  | 'constraints'
  | 'acceptance'
  | 'failureRecovery'

export type DestinationQuestion = {
  id: DestinationDomainId
  label: string
  prompt: string
  why: string
  choices: readonly [string, string, string]
}

export type DestinationAnswers = Partial<Record<DestinationDomainId, string>>

export const destinationQuestions: readonly DestinationQuestion[] = [
  { id: 'problem', label: '문제', prompt: '가장 먼저 해결해야 할 문제는 무엇인가요?', why: '문제가 분명해야 기능이 아니라 결과로 범위를 줄일 수 있어요.', choices: ['현재 작업이 끊기거나 손실되는 문제', '현재 현황과 다음 행동을 파악하기 어려운 문제', '결과물은 있지만 실제 사용까지 이어지지 않는 문제'] },
  { id: 'targetUser', label: '대상 사용자', prompt: '이 결과를 가장 먼저 사용할 사람은 누구인가요?', why: '첫 사용자를 한 명으로 정해야 수용 기준이 흐려지지 않아요.', choices: ['나 혼자 먼저 쓴다', '나와 내부 팀이 함께 쓴다', '초대된 외부 사용자가 쓴다'] },
  { id: 'outcome', label: '원하는 결과', prompt: '완료되었을 때 사용자에게 무엇이 달라져야 하나요?', why: '결과는 산출물이 아니라 사용자가 직접 확인할 수 있는 변화여야 해요.', choices: ['최신 상태와 다음 행동을 30초 안에 이해한다', '하나의 채널에서 요청부터 결과까지 완결한다', '모바일과 데스크톱에서 같은 결과를 확인한다'] },
  { id: 'scope', label: '포함 범위', prompt: '이번 Destination에 반드시 포함할 핵심 흐름은?', why: '핵심 흐름이 한 문장으로 닫혀야 백로그와 MVP가 섞이지 않아요.', choices: ['입력 → 처리 → 결과 확인', '요청 → 승인 → 검증 → 실사용', '문서 분석 → 빈칸 질문 → Destination 확인'] },
  { id: 'nonGoals', label: '비목표', prompt: '이번에 의도적으로 하지 않을 것은?', why: '비목표는 수준을 낮추는 것이 아니라 완료 대상을 보호하는 경계예요.', choices: ['Production·외부 출시', '유료 변경·신규 계정 생성', '목적과 무관한 일반화·대규모 리팩터'] },
  { id: 'constraints', label: '제약', prompt: '반드시 지켜야 할 제약은?', why: '제약을 나중에 붙이면 구현과 검증을 다시 해야 할 수 있어요.', choices: ['수준 > 시간 > 비용', '최소권한·개인정보 비노출·fail-closed', '기존 사용자 작업 바이트 보존'] },
  { id: 'acceptance', label: '수용 기준', prompt: '무엇을 직접 확인하면 수용할 수 있나요?', why: '테스트 통과와 사용자 수용은 다른 경계예요.', choices: ['실제 계정으로 핵심 흐름을 끝까지 완주한다', '모바일·데스크톱에서 동일한 결과를 확인한다', '후보·QA·Release 검증이 하나의 불변 pin을 가리킨다'] },
  { id: 'failureRecovery', label: '실패·복구', prompt: '실패하거나 결과가 불명할 때 어떻게 해야 하나요?', why: '복구 규칙이 없으면 재시도가 중복 변경을 만들 수 있어요.', choices: ['재시도 없이 멈추고 읽기 후 최소 교정한다', '이번 작업이 만든 변경만 되돌린다', '불명하면 완료로 표시하지 않고 차단 근거를 남긴다'] },
] as const

const briefMatchers: Readonly<Record<DestinationDomainId, readonly string[]>> = {
  problem: ['문제', 'problem'],
  targetUser: ['대상 사용자', '타겟 사용자', 'target user', 'user'],
  outcome: ['원하는 결과', '결과', 'outcome'],
  scope: ['포함 범위', '범위', 'scope'],
  nonGoals: ['비목표', '하지 않는 것', 'non-goal', 'non goal'],
  constraints: ['제약', 'constraint'],
  acceptance: ['수용 기준', '완료 조건', 'acceptance'],
  failureRecovery: ['실패·복구', '실패/복구', '복구', 'failure', 'rollback'],
}

const stripPrefix = (line: string) => line.replace(/^\s{0,3}(?:[-*+]\s+|#{1,6}\s+|\d+[.)]\s+)?/, '').trim()

export type BriefEvidence = { field: DestinationDomainId; startLine: number; endLine: number; value: string }

export function analyzeDestinationBrief(text: string) {
  const bytes = new TextEncoder().encode(text).byteLength
  if (bytes > 65_536) throw new Error('payload_too_large')
  const answers: DestinationAnswers = {}
  const evidence: BriefEvidence[] = [], conflicts = new Set<DestinationDomainId>()
  let active: { field: DestinationDomainId; startLine: number; endLine: number; lines: string[] } | null = null
  let fence: string | null = null
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
    for (const question of destinationQuestions) {
      const marker = briefMatchers[question.id].find(candidate => {
        const prefix = candidate.toLocaleLowerCase('ko-KR')
        return normalized === prefix || normalized.startsWith(prefix) && /^\s*[:：—–-]\s*/.test(line.slice(candidate.length))
      })
      if (!marker) continue
      flush()
      const value = line.slice(marker.length).replace(/^\s*[:：—–-]\s*/, '').trim()
      active = { field: question.id, startLine: index + 1, endLine: index + 1, lines: value ? [value] : [] }
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

export function extractBriefAnswers(text: string): DestinationAnswers {
  return analyzeDestinationBrief(text).answers
}

export function unansweredDestinationQuestions(answers: DestinationAnswers) {
  return destinationQuestions.filter((question) => !answers[question.id]?.trim())
}

export type DestinationReview = {
  schemaVersion: 1
  problem: string
  targetUser: string
  outcome: string
  scope: string
  nonGoals: string
  constraints: string
  acceptance: string
  failureRecovery: string
  residualUnknowns: string[]
  confirmation: { state: 'unconfirmed'; authority: false }
}

export function createDestinationReview(answers: DestinationAnswers): DestinationReview {
  const missing = unansweredDestinationQuestions(answers)
  if (missing.length) throw new Error('material_gaps_remain')
  return Object.freeze({
    schemaVersion: 1,
    problem: answers.problem!,
    targetUser: answers.targetUser!,
    outcome: answers.outcome!,
    scope: answers.scope!,
    nonGoals: answers.nonGoals!,
    constraints: answers.constraints!,
    acceptance: answers.acceptance!,
    failureRecovery: answers.failureRecovery!,
    residualUnknowns: Object.freeze([]) as unknown as string[],
    confirmation: Object.freeze({ state: 'unconfirmed' as const, authority: false as const }),
  })
}

export function destinationRequestId(review: DestinationReview) {
  const value = [review.problem, review.targetUser, review.outcome, review.scope, review.nonGoals, review.constraints, review.acceptance, review.failureRecovery].join('\u001f')
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return `destination-${hash.toString(16).padStart(8, '0')}`
}
