import { FormEvent, useEffect, useState } from 'react'
import { OutcomeDashboard } from './components/OutcomeDashboard'
import { loginErrorPresentation } from './components/outcomeKorean'
import { fetchSession, login, logout } from './lib/api'

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

export function OutcomeApp() {
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
