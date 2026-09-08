import { useEffect, useRef, useState } from 'react'
import { capturePrivateDecisionBindingVersion, fetchPrivateDecisionHistory, privateDecisionRecordingAvailable, recordPrivateDecision, type PrivateDecisionReason, type PrivateDecisionReceipt } from '../lib/api'

import { decisionReasonLabels } from '../lib/decision-copy'

const reasons = Object.entries(decisionReasonLabels) as Array<[PrivateDecisionReason, string]>
export function DecisionControls({projectId,eventId,sequence,onRecorded}: {projectId:string;eventId:string;sequence:number;onRecorded?:()=>void}) {
  const [choice,setChoice]=useState<'approved'|'rejected'|null>(null)
  const [reason,setReason]=useState<PrivateDecisionReason>('evidence_insufficient')
  const [receipt,setReceipt]=useState<PrivateDecisionReceipt|null>(null)
  const [failure,setFailure]=useState(false)
  const [pending,setPending]=useState(false)
  const [loading,setLoading]=useState(true)
  const [withdrawn,setWithdrawn]=useState(false)
  const busy=useRef(false)
  const trigger=useRef<HTMLButtonElement|null>(null)
  const confirm=useRef<HTMLButtonElement|null>(null)
  const restoreFocus=useRef(false)
  const reviewedBinding=useRef<number|null>(null)
  const available=privateDecisionRecordingAvailable()
  useEffect(()=>{
    if(!available){setLoading(false);return}
    let current=true
    setLoading(true)
    void fetchPrivateDecisionHistory().then(history=>{
      if(!current)return
      const existing=history.find(entry=>entry.target.projectId===projectId&&entry.target.eventId===eventId&&entry.target.sequence===sequence)
      if(existing){setReceipt(existing.receipt);setWithdrawn(existing.withdrawn)}
    }).catch(()=>{if(current)setFailure(true)}).finally(()=>{if(current)setLoading(false)})
    return()=>{current=false}
  },[available,projectId,eventId,sequence])
  useEffect(()=>{if(choice)confirm.current?.focus();else if(restoreFocus.current){restoreFocus.current=false;trigger.current?.focus()}},[choice])
  const cancel=()=>{if(busy.current)return;restoreFocus.current=true;setChoice(null)}
  const submit=async()=>{
    if(!available||loading||!choice||busy.current||failure||receipt)return
    busy.current=true;setPending(true)
    try {
      const result=await recordPrivateDecision({projectId,eventId,sequence,decision:choice,rejectionReason:choice==='rejected'?reason:null,expectedBindingVersion:reviewedBinding.current})
      if(result.decisionState!=='recorded'||result.completionAuthority!==false||result.decision!==choice||!result.decisionId)throw Error('invalid_receipt')
      setReceipt(result);setChoice(null);onRecorded?.()
    } catch {setFailure(true);setChoice(null)}
    finally {busy.current=false;setPending(false)}
  }
  if(loading&&available)return <p role="status">기존 결정 기록 확인 중…</p>
  if(receipt)return <div role="status"><p>{withdrawn?'철회된 결정 · 원래 기록 보존':'결정 기록됨'} · 실행·완료·배포 승인이 아닙니다.</p><p>{receipt.decision==='approved'?'승인':'반려'} · {receipt.decidedAt}</p><p>기록 ID · {receipt.decisionId}</p></div>
  if(failure)return <p role="alert">결정 기록 결과를 확인하지 못했습니다. 중복 기록을 막기 위해 재전송하지 않습니다. 플래너에게 기록 확인을 요청하세요.</p>
  return <div className="oc-approval-actions">
    <p>기록만 하며 전달·완료·배포 권한을 부여하지 않습니다.</p>
    {!available&&<p role="status">승인 기록 저장소 연결이 준비되지 않았습니다.</p>}
    <label>반려 사유<select value={reason} disabled={pending||choice!==null} onChange={event=>setReason(event.target.value as PrivateDecisionReason)}>{reasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <button type="button" disabled={!available||pending||choice!==null} onClick={event=>{trigger.current=event.currentTarget;reviewedBinding.current=capturePrivateDecisionBindingVersion();setChoice('approved')}}>승인 기록</button>
    <button type="button" disabled={!available||pending||choice!==null} onClick={event=>{trigger.current=event.currentTarget;reviewedBinding.current=capturePrivateDecisionBindingVersion();setChoice('rejected')}}>반려 기록</button>
    {choice&&<section role="alertdialog" aria-label="결정 기록 검토" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();cancel()}}}>
      <h4>결정 기록 검토</h4><p>{eventId} · 순번 {sequence}</p><p>{choice==='approved'?'승인':'반려'}{choice==='rejected'?` · ${reasons.find(([value])=>value===reason)?.[1]}`:''}</p>
      <p>completionAuthority=false · 확인 전에는 기록되지 않습니다.</p>
      <button type="button" disabled={pending} onClick={cancel}>취소</button><button type="button" ref={confirm} disabled={pending} onClick={()=>void submit()}>{pending?'기록 중…':'확인 기록'}</button>
    </section>}
  </div>
}
