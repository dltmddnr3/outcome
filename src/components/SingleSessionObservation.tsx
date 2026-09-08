import { useEffect, useState } from 'react'
import { captureWorkObservationReader } from '../lib/api'
import { startWorkObservationPolling } from '../lib/work-observation-poll'

const stages = { queued: '작업 대기', implementing: '구현', qa_verifying: '품질 검증', release_verifying: '출시 전 점검', awaiting_owner: '소유자 확인 대기' }
const runtimes = { active: '실행 관측됨', idle: '현재 실행 없음', waiting_approval: '권한 승인 대기', waiting_user: '답변 대기', waiting_approval_and_user: '권한 승인·답변 대기', unknown: '실행 상태 확인 불가' }
const nextStates = { unobserved: '연결 확인 전', observation_stale: '새 관측 필요', observing: '관측 중', next_action_recorded: '다음 단계 기록됨 · 실행과 별개', next_action_missing: '완료 후 다음 단계 누락', needs_owner: '소유자 확인 필요', dependency_blocked: '선행 작업 대기', authority_missing: '실행 권한 확인 필요', evidence_missing: '검증 근거 필요', delivery_unknown: '전달 확인 필요 · 자동 재전송 안 함' }
type Snapshot = {
  observedAtMs: number
  work: { stage: keyof typeof stages | null; activity: 'running' | 'waiting' | 'terminal' | 'unknown'; freshness: 'fresh' | 'stale' | 'unobserved'; evidenceStatus: 'missing' | 'reference_only_unverified'; continuation: keyof typeof nextStates }
  runtime: { state: keyof typeof runtimes }
}
const member = (map: object, key: unknown): boolean => typeof key === 'string' && Object.hasOwn(map, key)
function parse(value: unknown): Snapshot | null {
  try {
    if (!value || typeof value !== 'object') return null
    const raw = value as Snapshot & { schemaVersion: number; completionAuthority: boolean; executionAuthority: boolean }
    if (raw.schemaVersion !== 1 || raw.completionAuthority !== false || raw.executionAuthority !== false
      || !Number.isSafeInteger(raw.observedAtMs) || raw.observedAtMs < 0 || !raw.work || !raw.runtime
      || !(raw.work.stage === null || member(stages, raw.work.stage))
      || !['running', 'waiting', 'terminal', 'unknown'].includes(raw.work.activity)
      || !['fresh', 'stale', 'unobserved'].includes(raw.work.freshness)
      || !['missing', 'reference_only_unverified'].includes(raw.work.evidenceStatus)
      || !member(nextStates, raw.work.continuation) || !member(runtimes, raw.runtime.state)) return null
    return { observedAtMs: raw.observedAtMs,
      work: { stage: raw.work.stage, activity: raw.work.activity, freshness: raw.work.freshness, evidenceStatus: raw.work.evidenceStatus, continuation: raw.work.continuation },
      runtime: { state: raw.runtime.state } }
  } catch { return null }
}

// The server supplies the ORIGINAL observation time. Rendering/polling must not
// replace it with Date.now(). This card never treats an evidence reference as PASS.
export function SingleSessionObservation({ observation, projectId }: { observation?: unknown; projectId?: string }) {
  const [now, setNow] = useState(Date.now)
  const [received, setReceived] = useState<{ initial: unknown; projectId?: string; value: unknown } | null>(null)
  const current = received && received.projectId === projectId && received.initial === observation ? received.value : observation
  useEffect(() => {
    const read = projectId ? captureWorkObservationReader(projectId) : null
    if (!read) return
    return startWorkObservationPolling({ read, publish: value => { setNow(Date.now()); setReceived({ initial: observation, projectId, value }) } })
  }, [projectId, observation])
  useEffect(() => {
    if (!parse(current)) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [current])
  const snapshot = parse(current)
  const age = snapshot ? now - snapshot.observedAtMs : null
  const fresh = age !== null && age >= 0 && age <= 15000 && snapshot?.work.freshness === 'fresh'
  const status = !snapshot ? '연결 확인 전' : !fresh ? '새 관측 필요' : runtimes[snapshot.runtime.state]
  return <article data-projection-field="single-session-observation" data-completion-authority="false" data-execution-authority="false">
    <small>한 세션 · 작업 관측</small>
    <h3>{status}</h3>
    <dl>
      <dt>마지막 작업 단계</dt><dd>{snapshot?.work.stage ? stages[snapshot.work.stage] : '단계 확인 전'}</dd>
      <dt>현재 실행</dt><dd>{fresh && snapshot ? snapshot.runtime.state === 'active' && snapshot.work.activity !== 'running' ? '실행 관측됨 · 작업 단계 확인 필요' : runtimes[snapshot.runtime.state] : '실행 상태 확인 불가'}</dd>
      <dt>후속 작업</dt><dd>{snapshot ? fresh ? nextStates[snapshot.work.continuation] : '새 관측 필요' : '연결 확인 전'}</dd>
      <dt>검증 근거</dt><dd>{snapshot?.work.evidenceStatus === 'reference_only_unverified' ? '근거 참조 있음 · 내용 검증과 별개' : '근거 확인 전'}</dd>
    </dl>
    <p>구현 → 품질 검증 → 출시 전 점검 → 소유자 확인</p>
    <p>같은 세션에서 진행한 검증입니다. 별도의 독립 검증과 다르며, 활동 기록만으로 진행률이나 완료를 판단하지 않습니다.</p>
  </article>
}
