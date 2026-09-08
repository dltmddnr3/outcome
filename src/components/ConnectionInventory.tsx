import { useEffect, useState } from 'react'
import { captureConnectionInventoryReader } from '../lib/api'
import { connectionLabels, parseConnectionInventory } from '../lib/connection-inventory'
import { startWorkObservationPolling } from '../lib/work-observation-poll'

export function ConnectionInventory({ projectId }: { projectId: string }) {
 const [open, setOpen] = useState(false)
 const [received, setReceived] = useState<{ projectId: string; value: unknown; receivedAtMs: number } | null>(null)
 const [now, setNow] = useState(() => performance.now())
 useEffect(() => {
  if (!open) return
  const read = captureConnectionInventoryReader(projectId)
  if (!read) return
  return startWorkObservationPolling({ read, publish: value => {
   const receivedAtMs = performance.now(), inventory = parseConnectionInventory(value, projectId)
   setNow(receivedAtMs)
   setReceived(previous => ({ projectId, value, receivedAtMs: previous?.projectId === projectId && inventory && parseConnectionInventory(previous.value, projectId)?.checkedAtMs === inventory.checkedAtMs ? previous.receivedAtMs : receivedAtMs }))
  } })
 }, [open, projectId])
 useEffect(() => {
  if (!open) return
  const timer = setInterval(() => setNow(performance.now()), 1000)
  return () => clearInterval(timer)
 }, [open])
 const inventory = open && received?.projectId === projectId ? parseConnectionInventory(received.value, projectId) : null
 // Keep server observation age separate from client wall-clock skew.
 const elapsed = received ? Math.max(0, now - received.receivedAtMs) : 0
 return <article data-projection-field="connection-inventory" data-completion-authority="false" data-execution-authority="false">
  <details onToggle={event => { const expanded = event.currentTarget.open; setOpen(expanded); if (!expanded) setReceived(null) }}>
   <summary>연결 관리 · 읽기 전용</summary>
   <p>현재 프로젝트의 접근과 관측 상태입니다. 연결 설정이나 실행 권한을 변경하지 않습니다.</p>
   {!inventory ? <p role="status">연결 상태 확인 전 · 확인되지 않은 연결을 정상으로 표시하지 않습니다.</p> : <dl>{inventory.entries.map(entry => {
    const stale = entry.observedAtMs !== null && inventory.checkedAtMs - entry.observedAtMs + elapsed > 15000
    const label = stale || entry.state === 'stale' ? '새 관측 필요' : entry.state === 'access_verified' ? '접근 확인됨 · 이 조회 기준' : entry.state === 'source_observed' ? '관측 수신됨 · 실행 가능 여부와 별개' : '관측 없음'
    return <div key={entry.id}><dt>{connectionLabels[entry.id]}</dt><dd>{label}{entry.observedAtMs !== null && <small> · 관측 <time dateTime={new Date(entry.observedAtMs).toISOString()}>{new Date(entry.observedAtMs).toISOString()}</time></small>}</dd></div>
   })}</dl>}
   <p>관측 없음은 연결 해제를 뜻하지 않습니다. 외부 서비스·도구·환경·배포의 실제 확인은 아직 미연결입니다.</p>
  </details>
 </article>
}
