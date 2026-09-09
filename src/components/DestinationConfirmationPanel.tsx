import {useEffect,useRef,useState} from 'react'
import {captureDestinationReviewBinding,requestDestinationConfirmation,requestDestinationConfirmationReview,type DestinationConfirmation,type DestinationConfirmationReview,type DestinationReviewTarget} from '../lib/api'
import {DestinationCreationResult} from './DestinationCreationResult'

const readinessNotices:Record<string,string>={
 destination_confirmation_intake_incomplete:'기본 초안의 필수 답변이 남아 있습니다. 답변을 저장한 뒤 다시 검토해 주세요.',
 destination_confirmation_residual_unknowns:'초안의 미상 항목이 남아 있습니다. 필요한 근거를 확인해 해결해야 하며, 확정을 위해 목록만 지우면 안 됩니다.',
 destination_confirmation_issued_answers_missing:'이미 받은 질문 중 답변하지 않은 항목이 있습니다. 후속 질문과 저장된 답변을 확인해 주세요.',
 destination_confirmation_question_receipt_missing:'현재 답변 버전에 연결된 질문 검토 결과가 없습니다. 저장된 답변을 유지한 채 현재 맥락의 검토가 필요합니다.',
 destination_confirmation_coverage_or_material_gap:'목적지의 중요한 미결정 사항 또는 기술 검증이 남아 있습니다. 답변 개수만으로 검토를 완료하지 않습니다.',
 destination_confirmation_verification_pending:'현재 초안의 근거 내용을 검증하는 연결이 아직 준비되지 않았습니다. 기술 검증 후 다시 확인해야 합니다.',
}
export function destinationConfirmationFailureNotice(error:unknown){
 const code=error instanceof Error?error.message:''
 return Object.hasOwn(readinessNotices,code)?`${readinessNotices[code]} 확정 요청은 보내지 않았습니다.`:'현재 초안의 근거 검증 결과를 확인하지 못했습니다. 서버 연결 또는 검증 상태를 확인해야 하며 확정 요청은 보내지 않았습니다.'
}

export function DestinationConfirmationPanel({discovery,fileBased=false}:{discovery:DestinationReviewTarget;fileBased?:boolean}){
 const [isCurrent]=useState(()=>captureDestinationReviewBinding())
 const [checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[ack,setAck]=useState(false),[attempted,setAttempted]=useState(false)
 const [review,setReview]=useState<DestinationConfirmationReview|null>(null)
 const [receipt,setReceipt]=useState<DestinationConfirmation|null>(null)
 const [notice,setNotice]=useState('확정 요청 기록을 먼저 조회해 주세요. 조회만으로 확정하거나 실행하지 않습니다.')
 const lock=useRef(false),mounted=useRef(true),controller=useRef<AbortController|null>(null)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort()}},[])
 const act=async(kind:'read'|'prepare'|'confirm')=>{
  if(lock.current)return
  if(!isCurrent()){setNotice('계정 연결이 변경되었습니다. 기본 초안부터 다시 불러와 주세요.');return}
  if(kind==='prepare'&&(!checked||receipt||attempted))return
  if(kind==='confirm'&&(!review||!ack||attempted||receipt))return
  lock.current=true;setBusy(true)
  const abort=new AbortController();controller.current=abort
  try{
   if(kind==='prepare'){
    setReview(null);setAck(false)
    const value=await requestDestinationConfirmationReview(discovery,abort.signal)
    if(!mounted.current)return
    setReview(value);setNotice('서버가 현재 초안의 근거와 버전을 검증했습니다. 위 기본 초안과 추가 결정을 검토한 뒤 직접 확인해 주세요.')
   }else{
    if(kind==='confirm')setAttempted(true)
    const value=await requestDestinationConfirmation(discovery,kind==='confirm'?review!:undefined,abort.signal)
    if(!mounted.current)return
    setReceipt(value);setChecked(true);setReview(null);setAck(false)
    setNotice(value?'목적지 확정 요청이 기록되었습니다. 생성 결과는 아래에서 별도로 확인합니다. 작업 실행·최종 수용을 의미하지 않습니다.':attempted?'이번 요청 기록이 아직 확인되지 않습니다. 자동 재전송하지 않으며 기존 기록만 다시 조회할 수 있습니다.':'기존 확정 요청이 없습니다. 현재 초안의 근거 검증을 요청할 수 있습니다.')
   }
  }catch(error){
   if(!mounted.current)return
   setReview(null);setAck(false)
   if(kind==='read')setChecked(false)
   setNotice(kind==='prepare'?destinationConfirmationFailureNotice(error):'요청 결과를 확인하지 못했습니다. 자동 재전송하지 않고 확정 요청 기록 조회로 확인해 주세요.')
  }finally{lock.current=false;if(mounted.current)setBusy(false)}
 }
 return <section className="destination-studio__unknowns" aria-label="목적지 확정 요청" aria-busy={busy}>
  <h4>목적지 확정 요청</h4>
  <p role="status">{notice}</p>
  {!receipt&&<p>{fileBased?`기획 파일 버전 ${discovery.intakeRevision}`:`기본 초안 버전 ${discovery.intakeRevision} · 후속 답변 버전 ${discovery.revision}`}</p>}
  <div className="destination-studio__actions">
   <button type="button" disabled={busy} onClick={()=>void act('read')}>확정 요청 기록 조회</button>
   {!receipt&&<button type="button" disabled={busy||!checked||attempted||!!review} onClick={()=>void act('prepare')}>현재 초안 근거 검증</button>}
  </div>
  {review&&!receipt&&<>
   <fieldset><legend>최종 확인</legend><label><input type="checkbox" checked={ack} disabled={busy} onChange={event=>setAck(event.currentTarget.checked)}/>{fileBased?'위 기획 파일의 목표·범위·완료 조건을 검토했고, 이 버전으로 프로젝트 등록을 요청합니다. 개발 실행 승인은 별도입니다.':'위 기본 초안과 저장된 추가 결정을 검토했고, 이 버전으로 목적지 확정을 요청합니다.'}</label></fieldset>
   <div className="destination-studio__actions">
    <button type="button" disabled={busy} onClick={()=>{setReview(null);setAck(false);setNotice('확정을 취소했습니다. 요청을 보내지 않았습니다.')}}>확정 취소</button>
    <button className="destination-studio__primary" type="button" disabled={busy||!ack||attempted} onClick={()=>void act('confirm')}>이 버전으로 확정 요청</button>
   </div>
  </>}
  {receipt&&<><p>확정 요청 기록됨 · 생성 결과 별도 확인</p><DestinationCreationResult key={`${receipt.requestId}:${receipt.reviewDigest}`} discovery={discovery} receipt={receipt}/></>}
  {!receipt&&<p>이 단계에서는 목적지 확정 요청만 기록합니다. 프로젝트 생성과 작업 실행은 별도입니다.</p>}
  <details><summary>확정 요청의 권한 범위</summary>{receipt&&<p>{`기본 초안 버전 ${discovery.intakeRevision} · 후속 답변 버전 ${discovery.revision}`}</p>}<p>확정 요청은 최종 수용이나 출시 승인이 아닙니다.</p><code>completionAuthority=false</code></details>
 </section>
}
