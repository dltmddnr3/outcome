import type { PrivateDecisionReason } from './api'

export const decisionReasonLabels: Record<PrivateDecisionReason, string> = {
  evidence_insufficient: '근거 보완 필요',
  scope_not_authorized: '승인 범위 밖',
  superseded_by_newer_observation: '새 확인 내용으로 대체',
  defer_pending_external_input: '외부 답변·자료 대기',
}
