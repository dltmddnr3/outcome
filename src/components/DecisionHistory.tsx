import {useEffect,useState} from 'react'
import {fetchPrivateDecisionHistory,privateDecisionRecordingAvailable,type PrivateDecisionHistoryEntry} from '../lib/api'
import { decisionReasonLabels } from '../lib/decision-copy'

export function DecisionHistory({projectId,version=0}:{projectId:string;version?:number}) {
  const [entries,setEntries]=useState<PrivateDecisionHistoryEntry[]>([])
  const [state,setState]=useState<'loading'|'ready'|'failed'>('loading')
  const [refresh,setRefresh]=useState(0)
  const available=privateDecisionRecordingAvailable()
  useEffect(()=>{
    if(!available)return
    let current=true
    setState('loading');setEntries([])
    void fetchPrivateDecisionHistory().then(history=>{if(current){setEntries(history.filter(entry=>entry.target.projectId===projectId));setState('ready')}}).catch(()=>{if(current)setState('failed')})
    return()=>{current=false}
  },[projectId,version,refresh,available])
  if(!available)return null
  return <section aria-label="결정 기록 이력" data-completion-authority="false">
    <h3>결정 기록 이력</h3><p>과거 기록은 실행·완료·배포 권한을 대신하지 않습니다.</p>
    <button type="button" disabled={state==='loading'} onClick={()=>setRefresh(value=>value+1)}>기록 다시 확인</button>
    {state==='loading'?<p role="status">기록 확인 중…</p>:state==='failed'?<p role="alert">기록을 불러오지 못했습니다. 결정은 재전송하지 않았습니다.</p>:entries.length===0?<p role="status">저장된 결정 기록이 없습니다.</p>:<ol className="oc-approval-list">{entries.map(entry=><li className="oc-approval-item" key={entry.receipt.decisionId}>
      <h4>{entry.withdrawn?'철회됨':entry.receipt.decision==='approved'?'승인 기록':'반려 기록'}</h4>
      <p>{entry.target.eventId} · 순번 {entry.target.sequence}</p>
      <p>{entry.receipt.decidedAt}</p><p>기록 ID · {entry.receipt.decisionId}</p>
      {entry.receipt.rejectionReason&&<p>반려 사유 · {decisionReasonLabels[entry.receipt.rejectionReason]}</p>}
      {entry.receipt.supersedesId&&<p>정정 대상 기록 · {entry.receipt.supersedesId}</p>}
      {entry.withdrawn&&<p>원래 결정 · {entry.receipt.decision==='approved'?'승인':'반려'} · 삭제하지 않고 보존</p>}
    </li>)}</ol>}
  </section>
}
