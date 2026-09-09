import { useEffect, useRef, useState } from 'react'

type Invitation = { schemaVersion: number; endpoint: string; previewOrigin: string; challenge: string; expiresAt: number; approvalDigest?: string }
export function readLocalWorkInvitation(fragment: string, origin: string, now = Date.now()): Invitation | null {
  try {
    const prefix = '#local-work-session='
    if (!fragment.startsWith(prefix) || fragment.length > 4096) return null
    const value = JSON.parse(atob(fragment.slice(prefix.length).replace(/-/g, '+').replace(/_/g, '/')))
    if (!value || Object.keys(value).length !== (value.schemaVersion===2?6:5) || ![1,2].includes(value.schemaVersion) || (value.schemaVersion===2&&!/^[a-f0-9]{64}$/.test(value.approvalDigest)) || value.previewOrigin !== origin
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
  const [plan,setPlan]=useState<string|null>(null),[confirmed,setConfirmed]=useState(false)
  const busy = useRef(false), active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  if (!invitation) return null
  const connect = async () => {
    if (status !== 'idle' || busy.current) return
    if(invitation.approvalDigest&&plan&&!confirmed)return
    busy.current = true
    setStatus('connecting')
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
    active.current = controller
    try {
      if (invitation.expiresAt <= Date.now()) throw Error()
      const token = await getToken()
      if (!token || controller.signal.aborted) throw Error()
      const response = await fetch(invitation.endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ challenge: invitation.challenge, token,...(invitation.approvalDigest?(plan?{approvalDigest:invitation.approvalDigest}:{action:'review'}):{}) }), signal: controller.signal })
      const result = await response.json()
      if(invitation.approvalDigest&&!plan){
        if(!response.ok||result.outcome!=='approval_review'||result.approvalDigest!==invitation.approvalDigest||typeof result.grantJson!=='string'||new TextEncoder().encode(result.grantJson).length>8192||result.executionAuthority!==false||result.completionAuthority!==false)throw Error()
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(result.grantJson))
        if([...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('')!==invitation.approvalDigest)throw Error()
        const parsed=JSON.parse(result.grantJson)
        if(parsed?.schemaVersion!==2||!parsed.execution||!Array.isArray(parsed.allowedStages)||!Array.isArray(parsed.execution.commands))throw Error()
        setPlan(result.grantJson);setStatus('idle');busy.current=false;return
      }
      if (!response.ok || result.outcome !== 'session_connected' || result.executionAuthority !== false || result.completionAuthority !== false) throw Error()
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setStatus('connected')
    } catch { setStatus('failed') } finally { clearTimeout(timer) }
  }
  return <section aria-label="이 기기 실행 연결" data-completion-authority="false">
    <h2>{invitation.approvalDigest?'개발 실행 범위 확인':'이 기기에서 로그인 연결'}</h2>
    <p>{invitation.approvalDigest?'직접 시작한 실행기인지 확인하세요. 로그인 후 계획을 읽고, 별도로 확인해야 해당 계획의 승인 절차를 계속합니다. 배포·출시 권한은 추가되지 않습니다.':'OUTCOME 실행기에서 직접 연 연결인가요? 같은 컴퓨터의 실행기에 로그인 상태를 한 번 전달합니다. 작업 승인이나 배포 권한은 추가되지 않습니다.'}</p>
    <p>브라우저가 로컬 연결 권한을 물으면, 직접 시작한 연결인지 확인한 뒤 허용해 주세요.</p>
    {plan&&<><p>대상 작업·후보 버전·읽기/쓰기 파일·명령·유효 시간을 확인하세요. 이 범위 밖의 실행은 허용하지 않습니다.</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{formatApprovalPlan(plan)}</pre><label><input type="checkbox" checked={confirmed} disabled={status!=='idle'} onChange={event=>setConfirmed(event.currentTarget.checked)}/>이 정확한 실행 범위를 확인하고 승인을 전달합니다.</label></>}
    <button type="button" disabled={status !== 'idle'||!!(invitation.approvalDigest&&plan&&!confirmed)} onClick={() => void connect()}>{invitation.approvalDigest?(plan?'이 실행 범위 승인 전달':'실행 범위 불러오기'):'이 기기의 실행기에 연결'}</button>
    <p role="status">{status === 'idle' ? '직접 시작한 연결인지 확인한 뒤 눌러 주세요.' : status === 'connecting' ? '로그인 상태를 확인하고 있습니다.' : status === 'connected' ? invitation.approvalDigest?'승인을 실행기에 전달했습니다. 승인 기록과 실제 작업 시작은 별도로 확인합니다.':'로그인 연결을 확인했습니다. 작업 실행 여부는 별도로 확인합니다.' : '연결을 확인하지 못했습니다. 자동으로 재시도하지 않습니다.'}</p>
  </section>
}

function formatApprovalPlan(raw:string){
 const plan=JSON.parse(raw),stage=(value:string)=>({implementing:'구현',qa_verifying:'품질 검증',release_verifying:'릴리스 검증'}[value]??value)
 return JSON.stringify({'프로젝트':plan.projectId,'작업':plan.workId,'실행':plan.runId,'담당 연결':plan.sessionRef,'연결 버전':plan.bindingVersion,'후보 버전':plan.candidateCommit,'허용 단계':plan.allowedStages.map(stage),'읽을 파일':plan.execution.readPaths??[],'수정할 파일':plan.execution.writePaths,'실행 명령':plan.execution.commands.map((command:{stage:string;program:string;args:string[];timeoutMs:number})=>({'단계':stage(command.stage),'프로그램':command.program,'인수':command.args,'제한 시간(밀리초)':command.timeoutMs})),'승인 만료':new Date(plan.expiresAt).toLocaleString('ko-KR')},null,2)
}
