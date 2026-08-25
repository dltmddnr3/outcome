export const accountWorkspaceStateCopy = {
  login: { title: 'Cherry 계정으로 확인', detail: '승인된 한 명의 소유자만 비공개 프로젝트를 볼 수 있습니다.' },
  loading: { title: '비공개 결과를 확인하는 중', detail: '인증과 프로젝트 권한을 서버에서 확인하고 있습니다.' },
  empty: { title: '연결된 프로젝트가 없습니다', detail: '프로젝트를 임의로 대신 표시하지 않습니다.' },
  stale: { title: '마지막 확인 결과를 표시합니다', detail: '새 수집이 확인될 때까지 기존 스냅샷 시간을 유지합니다.' },
  conflict: { title: '계정 연결을 확인할 수 없습니다', detail: '서로 충돌하는 워크스페이스 정보가 있어 접근을 중단했습니다.' },
  unavailable: { title: '비공개 워크스페이스를 열 수 없습니다', detail: '공급자 설정 또는 저장소 연결이 준비되지 않았습니다.' },
  session_expired: { title: '로그인이 만료되었습니다', detail: 'Google 또는 이메일 인증 코드로 다시 확인해 주세요.' },
  access_denied: { title: '이 프로젝트에 접근할 수 없습니다', detail: '다른 프로젝트나 공개 데이터로 대신 연결하지 않습니다.' },
  safe_degraded: { title: '안전한 읽기 전용 상태입니다', detail: '마지막 검증 결과만 보이며 새로고침과 변경 작업은 중단되었습니다.' },
  ready: { title: '비공개 결과를 확인할 수 있습니다', detail: '허용된 프로젝트만 읽기 전용으로 표시합니다.' },
} as const

export type AccountWorkspaceState = keyof typeof accountWorkspaceStateCopy

type PrivateSelection = { projectId: string; phaseId: string; scopeId: string; stageId: string }
type LoginProvider = 'google' | 'email_code'

const initialSelection = (project: PrivateProjectProjection): PrivateSelection => ({ projectId: project.project.id, phaseId: project.current.phaseId, scopeId: project.current.scopeId, stageId: project.current.stageId })

export function AccountWorkspace({ state = 'unavailable', workspace, ownerVerified = false, sessionPresent = false, onLogin, onLogout, onAppleLink, loginContent, transitionError = null }: { state?: AccountWorkspaceState; workspace?: PrivateWorkspaceView; ownerVerified?: boolean; sessionPresent?: boolean; onLogin?: (provider: LoginProvider) => Promise<void>; onLogout?: () => Promise<void>; onAppleLink?: () => Promise<void>; loginContent?: ReactNode; transitionError?: string | null }) {
  const copy = accountWorkspaceStateCopy[state]
  const alert = ['conflict', 'unavailable', 'session_expired', 'access_denied'].includes(state)
  const projects = workspace?.projects ?? []
  const [selection, setSelection] = useState<PrivateSelection | null>(null)
  const [busy, setBusy] = useState<LoginProvider | 'logout' | null>(null)
  const project = projects.find((item) => item.project.id === selection?.projectId) ?? projects[0] ?? null
  const safeSelection = project && selection?.projectId === project.project.id ? selection : project ? initialSelection(project) : null
  const phase = project?.phases.find((item) => item.id === safeSelection?.phaseId) ?? project?.phases[0] ?? null
  const scope = phase?.scopes.find((item) => item.id === safeSelection?.scopeId) ?? phase?.scopes[0] ?? null
  const stage = scope?.stages.find((item) => item.id === safeSelection?.stageId) ?? scope?.stages[0] ?? null
  const actual = project ? [project.phases.find((item) => item.id === project.current.phaseId)?.title, project.phases.flatMap((item) => item.scopes).find((item) => item.id === project.current.scopeId)?.title, project.phases.flatMap((item) => item.scopes).flatMap((item) => item.stages).find((item) => item.id === project.current.stageId)?.title].filter(Boolean).join(' → ') : ''
  const selected = [phase?.title, scope?.title, stage?.title].filter(Boolean).join(' → ')
  const transition = async (value: LoginProvider | 'logout', action?: () => Promise<void>) => { if (!action || busy) return; setBusy(value); try { await action() } finally { setBusy(null) } }
  const chooseProject = (value: PrivateProjectProjection) => setSelection(initialSelection(value))
  const choosePhase = (phaseId: string) => { if (!project) return; const nextPhase = project.phases.find((item) => item.id === phaseId); const nextScope = nextPhase?.scopes.find((item) => item.id === project.current.scopeId) ?? nextPhase?.scopes[0]; const nextStage = nextScope?.stages.find((item) => item.id === project.current.stageId) ?? nextScope?.stages[0]; setSelection({ projectId: project.project.id, phaseId, scopeId: nextScope?.id ?? '', stageId: nextStage?.id ?? '' }) }
  const chooseScope = (scopeId: string) => { if (!project || !phase) return; const nextScope = phase.scopes.find((item) => item.id === scopeId); const nextStage = nextScope?.stages.find((item) => item.id === project.current.stageId) ?? nextScope?.stages[0]; setSelection({ projectId: project.project.id, phaseId: phase.id, scopeId, stageId: nextStage?.id ?? '' }) }
  const chooseStage = (stageId: string) => { if (project && phase && scope) setSelection({ projectId: project.project.id, phaseId: phase.id, scopeId: scope.id, stageId }) }
  return <main className="account-workspace" data-completion-authority="false">
    <header className="account-workspace__header">
      <div><span className="account-workspace__eyebrow">OUTCOME PRIVATE</span><h1>Cherry 전용 비공개 워크스페이스</h1></div>
      <div className="account-workspace__header-actions"><span className="account-workspace__mode">읽기 전용</span>{sessionPresent && onLogout && <button type="button" data-private-logout="true" disabled={busy !== null} onClick={() => void transition('logout', onLogout)}>{busy === 'logout' ? '로그아웃 중…' : '로그아웃'}</button>}</div>
    </header>
    <section className="account-workspace__state" role={alert ? 'alert' : 'status'} aria-live={alert ? 'assertive' : 'polite'}>
      <span className="account-workspace__state-code">{state}</span>
      <h2>{copy.title}</h2>
      <p>{copy.detail}</p>
      {state === 'login' && (loginContent ?? <div className="account-workspace__actions">
        <button type="button" data-touch-target="44" data-private-login-provider="google" disabled={busy !== null} onClick={() => void transition('google', onLogin ? () => onLogin('google') : undefined)}>{busy === 'google' ? '연결 확인 중…' : 'Google로 계속'}</button>
        <button type="button" data-touch-target="44" data-private-login-provider="email_code" disabled={busy !== null} onClick={() => void transition('email_code', onLogin ? () => onLogin('email_code') : undefined)}>{busy === 'email_code' ? '코드 확인 중…' : '이메일 인증 코드'}</button>
        <span>Apple은 로그인 후 연결</span>
        <p className="account-workspace__adapter-note">검증용 공급자 중립 전환 · 실제 OAuth 연결 아님</p>
      </div>)}
      {ownerVerified && onAppleLink && <button type="button" data-touch-target="44" data-private-link-provider="apple" disabled={busy !== null} onClick={() => void transition('logout', onAppleLink)}>Apple 계정 연결</button>}
      {state === 'session_expired' && <button type="button" data-touch-target="44">다시 로그인</button>}
      {state === 'safe_degraded' && <p className="account-workspace__notice">변경 기능 없음 · 자동 동기화 없음 · 마지막 검증 시각 유지</p>}
      {transitionError && <p className="account-workspace__transition-error" role="alert">{transitionError}</p>}
    </section>
    {state === 'ready' && project && <section className="account-workspace__ready" aria-label="비공개 프로젝트 결과 위계">
      <nav className="account-workspace__projects" aria-label="비공개 프로젝트 전환">{projects.map((item) => <button type="button" key={item.project.id} data-private-project={item.project.id} aria-pressed={item.project.id === project.project.id} onClick={() => chooseProject(item)}>{item.project.name}</button>)}</nav>
      <div className="account-workspace__position"><p data-private-actual><strong>실제 현재</strong><span>{actual}</span></p><p data-private-selected><strong>선택 위치</strong><span>{selected}</span></p></div>
      <div className="account-workspace__hierarchy">
        <section><h3>페이즈</h3>{project.phases.map((item) => <button type="button" key={item.id} data-private-phase={item.id} aria-selected={item.id === phase?.id} aria-current={item.id === project.current.phaseId ? 'step' : undefined} data-actual-current={item.id === project.current.phaseId} onClick={() => choosePhase(item.id)}>{item.title}{item.id === project.current.phaseId && <em>실제 현재</em>}</button>)}</section>
        <section><h3>범위</h3>{phase?.scopes.map((item) => <button type="button" key={item.id} data-private-scope={item.id} aria-selected={item.id === scope?.id} aria-current={item.id === project.current.scopeId ? 'step' : undefined} data-actual-current={item.id === project.current.scopeId} onClick={() => chooseScope(item.id)}>{item.title}{item.id === project.current.scopeId && <em>실제 현재</em>}</button>)}</section>
        <section><h3>스테이지</h3>{scope?.stages.map((item) => <button type="button" key={item.id} data-private-stage={item.id} aria-selected={item.id === stage?.id} aria-current={item.id === project.current.stageId ? 'step' : undefined} data-actual-current={item.id === project.current.stageId} onClick={() => chooseStage(item.id)}>{item.title}{item.id === project.current.stageId && <em>실제 현재</em>}</button>)}</section>
        <section className="account-workspace__gates"><h3>완료 조건</h3>{stage?.gate?.gates?.length ? <ol>{stage.gate.gates.map((gate) => <li key={gate.id} data-gate-closed={gate.closed}><b>{gate.id}</b><span>{gate.title}</span><em>{gate.closed ? '확인됨' : '확인 대기'}</em></li>)}</ol> : <p>완료 조건 근거 없음</p>}</section>
      </div>
    </section>}
    <footer>
      <span>허용 범위 · Cherry Note / OUTCOME</span>
      <code>completionAuthority=false</code>
    </footer>
  </main>
}
import { type ReactNode, useState } from 'react'
import type { PrivateProjectProjection, PrivateWorkspaceView } from '../lib/api'
