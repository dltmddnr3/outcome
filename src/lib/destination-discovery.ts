export type DestinationMode = 'guided_200q' | 'brief_gap' | 'file_import'

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
  { id: 'scope', label: '포함 범위', prompt: '이번에 반드시 할 수 있어야 하는 일은 무엇인가요?', why: '이번에 필요한 일과 나중에 추가할 일을 구분하기 위해 묻습니다.', choices: ['입력 → 처리 → 결과 확인', '요청 → 승인 → 검증 → 실사용', '문서 분석 → 빈칸 질문 → 목적지 확인'] },
  { id: 'nonGoals', label: '비목표', prompt: '이번에는 하지 않을 일은 무엇인가요?', why: '완성도를 낮추지 않고, 이번에 끝낼 범위를 정합니다.', choices: ['실제 운영 환경 변경·외부 출시', '유료 변경·신규 계정 생성', '목적과 무관한 기능 확장·대규모 구조 변경'] },
  { id: 'constraints', label: '제약', prompt: '반드시 지켜야 할 조건은 무엇인가요?', why: '처음부터 조건을 알아야 나중에 다시 만드는 일을 줄일 수 있어요.', choices: ['수준 > 시간 > 비용', '꼭 필요한 권한만 사용·개인정보 보호·불확실하면 중단', '기존 사용자 파일과 작업 내용을 변경하지 않음'] },
  { id: 'acceptance', label: '수용 기준', prompt: '무엇을 직접 확인하면 원하는 결과라고 볼 수 있나요?', why: '검사를 통과한 것과 실제로 만족스럽게 쓰는 것은 다를 수 있어요.', choices: ['실제 계정으로 핵심 흐름을 끝까지 완주한다', '모바일·데스크톱에서 동일한 결과를 확인한다', '결과물과 품질·출시 전 검사가 모두 같은 고정 버전을 대상으로 한다'] },
  { id: 'failureRecovery', label: '실패·복구', prompt: '실패하거나 결과가 불명할 때 어떻게 해야 하나요?', why: '복구 규칙이 없으면 재시도가 중복 변경을 만들 수 있어요.', choices: ['재시도 없이 멈추고 읽기 후 최소 교정한다', '이번 작업이 만든 변경만 되돌린다', '불명하면 완료로 표시하지 않고 차단 근거를 남긴다'] },
] as const

export type BriefEvidence = { field: DestinationDomainId; startLine: number; endLine: number; value: string }
import { analyzeDestinationBrief } from './destination-brief-parser.mjs'
export { analyzeDestinationBrief }

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

export const destinationUnverifiedQuestions = ['기술·실행 가능성 및 문서 의미 검증 미완료'] as const

export function createDestinationReview(answers: DestinationAnswers, unknowns: readonly string[] = destinationUnverifiedQuestions): DestinationReview {
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
    residualUnknowns: Object.freeze([...new Set([...destinationUnverifiedQuestions, ...unknowns])]) as unknown as string[],
    confirmation: Object.freeze({ state: 'unconfirmed' as const, authority: false as const }),
  })
}

export function destinationRequestId(review: DestinationReview) {
  const value = [review.problem, review.targetUser, review.outcome, review.scope, review.nonGoals, review.constraints, review.acceptance, review.failureRecovery].join('\u001f')
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return `destination-${hash.toString(16).padStart(8, '0')}`
}
