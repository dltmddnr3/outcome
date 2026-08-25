import { FormEvent, useEffect, useState } from 'react'
import { OutcomeDashboard } from './components/OutcomeDashboard'
import { AccountWorkspace, accountWorkspaceStateCopy, type AccountWorkspaceState } from './components/AccountWorkspace'
import { HostedClerkWorkspace } from './components/AccountWorkspaceClerk'
import { loginErrorPresentation } from './components/outcomeKorean'
import { beginPrivateSession, endPrivateSession, fetchPrivateAccessConfig, fetchPrivateWorkspace, fetchSession, login, logout, type PrivateWorkspaceView } from './lib/api'

const privateErrorState = (reason: unknown): AccountWorkspaceState => {
  const code = reason instanceof Error ? reason.message : ''
  if (code === 'authentication_required') return 'login'
  if (code === 'session_expired' || code === 'session_revoked') return 'session_expired'
  if (code === 'membership_conflict') return 'conflict'
  if (code === 'owner_mismatch' || code === 'membership_inactive' || code === 'project_access_denied') return 'access_denied'
  return 'unavailable'
}

const privateResultState = (value: { workspace: { viewState?: string } }): AccountWorkspaceState => {
  const state = value.workspace.viewState
  return state && state in accountWorkspaceStateCopy ? state as AccountWorkspaceState : 'ready'
}

function PrivateWorkspaceEntry({ config }: { config?: Awaited<ReturnType<typeof fetchPrivateAccessConfig>> }) {
  if (config?.enabled && config.publishableKey) return <HostedClerkWorkspace publishableKey={config.publishableKey} />
  return <InjectedPrivateWorkspaceEntry />
}

function InjectedPrivateWorkspaceEntry() {
  const [state, setState] = useState<AccountWorkspaceState>('loading')
  const [workspace, setWorkspace] = useState<PrivateWorkspaceView | undefined>()
  const [transitionError, setTransitionError] = useState<string | null>(null)
  const load = () => fetchPrivateAccessConfig()
      .then((config) => config.enabled ? fetchPrivateWorkspace() : Promise.reject(new Error('private_workspace_unavailable')))
      .then((value) => { setWorkspace(value.workspace); setState(privateResultState(value)) })
      .catch((reason) => { setWorkspace(undefined); setState(privateErrorState(reason)); throw reason })
  useEffect(() => { void load().catch(() => undefined) }, [])
  const authenticate = async (provider: 'google' | 'email_code') => { setState('loading'); setTransitionError(null); try { await beginPrivateSession(provider); await load() } catch { setTransitionError('검증용 인증 전환을 완료하지 못했습니다.'); setState('login') } }
  const signOut = async () => { setState('loading'); setTransitionError(null); try { await endPrivateSession(); setWorkspace(undefined); setState('login') } catch { setTransitionError('로그아웃을 완료하지 못했습니다.'); setState('unavailable') } }
  return <AccountWorkspace state={state} workspace={workspace} ownerVerified={state === 'ready'} sessionPresent={state === 'ready'} onLogin={authenticate} onLogout={signOut} transitionError={transitionError} />
}

function Login({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null)
    try { await login(password); onAuthenticated() }
    catch (reason) { setError(reason instanceof Error ? loginErrorPresentation(reason.message) : '로그인하지 못했습니다.') }
    finally { setBusy(false) }
  }
  return <main className="outcome-login"><section>
    <p>OUTCOME · 비공개 읽기 전용</p><h1>결과의 현재 위치를 확인하세요</h1>
    <span>인증 후에만 프로젝트, 현재 작업, 작업 단계와 완료 조건 근거를 읽을 수 있습니다.</span>
    <form onSubmit={(event) => void submit(event)}><label htmlFor="outcome-password">접근 암호</label><input id="outcome-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button disabled={busy}>{busy ? '확인 중…' : 'OUTCOME 열기'}</button></form>
    {error && <strong role="alert">{error}</strong>}
  </section></main>
}

function DashboardEntry() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [publicReadOnly, setPublicReadOnly] = useState(false)
  useEffect(() => { void fetchSession().then((session) => { setPublicReadOnly(Boolean(session.publicReadOnly)); setAuthenticated(session.authenticated || Boolean(session.publicReadOnly)) }).catch(() => setAuthenticated(false)) }, [])
  if (authenticated === null) return <main className="outcome-login"><section aria-live="polite"><p>OUTCOME</p><h1>인증 상태 확인 중</h1></section></main>
  if (!authenticated) return <Login onAuthenticated={() => setAuthenticated(true)} />
  return <main className="cn-standalone-shell">
    {!publicReadOnly && <div className="cn-standalone-controls"><span>OUTCOME · 인증된 읽기 전용</span><button className="cn-signout" onClick={() => void logout().finally(() => setAuthenticated(false))}>로그아웃</button></div>}
    <OutcomeDashboard onUnauthorized={() => setAuthenticated(false)} />
  </main>
}

export function OutcomeApp() {
  const privatePath = window.location.pathname.startsWith('/workspace')
  const [config, setConfig] = useState<Awaited<ReturnType<typeof fetchPrivateAccessConfig>> | null>(null)
  useEffect(() => { void fetchPrivateAccessConfig().then(setConfig).catch(() => setConfig({ enabled: false, access: 'private_read_only', providers: [], sessionMaximumDays: 7, completionAuthority: false })) }, [])
  if (config === null) return <AccountWorkspace state="loading" />
  if (!privatePath && !config.enabled) return <DashboardEntry />
  return <PrivateWorkspaceEntry config={config} />
}
