import { useEffect, useRef, useState } from 'react'

type Invitation = { schemaVersion: number; endpoint: string; previewOrigin: string; challenge: string; expiresAt: number }
export function readLocalWorkInvitation(fragment: string, origin: string, now = Date.now()): Invitation | null {
  try {
    const prefix = '#local-work-session='
    if (!fragment.startsWith(prefix) || fragment.length > 4096) return null
    const value = JSON.parse(atob(fragment.slice(prefix.length).replace(/-/g, '+').replace(/_/g, '/')))
    if (!value || Object.keys(value).length !== 5 || value.schemaVersion !== 1 || value.previewOrigin !== origin
      || !/^https:\/\/outcome-[a-z0-9]+-white-castle\.vercel\.app$/.test(origin)
      || typeof value.challenge !== 'string' || !/^[a-f0-9]{64}$/.test(value.challenge)
      || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 300000) return null
    const url = new URL(value.endpoint)
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || Number(url.port) < 1024
      || url.username || url.password || url.pathname !== '/outcome-session' || url.search || url.hash || url.href !== value.endpoint) return null
    return value
  } catch { return null }
}

export function LocalWorkSessionConnection({ getToken }: { getToken: () => Promise<string | null> }) {
  const [invitation] = useState(() => typeof window === 'undefined' ? null : readLocalWorkInvitation(window.location.hash, window.location.origin))
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle')
  const busy = useRef(false), active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  if (!invitation) return null
  const connect = async () => {
    if (status !== 'idle' || busy.current) return
    busy.current = true
    setStatus('connecting')
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
    active.current = controller
    try {
      if (invitation.expiresAt <= Date.now()) throw Error()
      const token = await getToken()
      if (!token || controller.signal.aborted) throw Error()
      const response = await fetch(invitation.endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ challenge: invitation.challenge, token }), signal: controller.signal })
      const result = await response.json()
      if (!response.ok || result.outcome !== 'session_connected' || result.executionAuthority !== false || result.completionAuthority !== false) throw Error()
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setStatus('connected')
    } catch { setStatus('failed') } finally { clearTimeout(timer) }
  }
  return <section aria-label="이 기기 실행 연결" data-completion-authority="false">
    <h2>이 기기에서 로그인 연결</h2>
    <p>OUTCOME 실행기에서 직접 연 연결인가요? 같은 컴퓨터의 실행기에 로그인 상태를 한 번 전달합니다. 작업 승인이나 배포 권한은 추가되지 않습니다.</p>
    <button type="button" disabled={status !== 'idle'} onClick={() => void connect()}>이 기기의 실행기에 연결</button>
    <p role="status">{status === 'idle' ? '직접 시작한 연결인지 확인한 뒤 눌러 주세요.' : status === 'connecting' ? '로그인 상태를 확인하고 있습니다.' : status === 'connected' ? '로그인 연결을 확인했습니다. 작업 실행 여부는 별도로 확인합니다.' : '연결을 확인하지 못했습니다. 자동으로 재시도하지 않습니다.'}</p>
  </section>
}
