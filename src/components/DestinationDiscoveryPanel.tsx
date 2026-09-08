import {useRef,useState} from 'react'
import {captureDestinationReviewBinding,requestDestinationDiscovery,requestDestinationQuestions,requestDestinationQuestionRun,requestDestinationDecisionReview,type DiscoveryDecisionReview,type DiscoveryQuestionRun,type StoredDestinationDraft,type StoredDiscovery} from '../lib/api'
import {DestinationQuestionBatch} from './DestinationQuestionBatch'
import type {DiscoveryContext} from '../lib/destination-question-receipt'
import {sensitiveContentHint} from './PlannerConversation'

export function DestinationDiscoveryPanel({intake}:{intake:StoredDestinationDraft}) {
 const [reviewIsCurrent]=useState(()=>captureDestinationReviewBinding())
 const [discovery,setDiscovery]=useState<StoredDiscovery|null>(null)
 const [checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[hold,setHold]=useState(false)
 const [receipt,setReceipt]=useState<string|null>(null)
 const [decisionReview,setDecisionReview]=useState<DiscoveryDecisionReview|null>(null)
 const [run,setRun]=useState<DiscoveryQuestionRun|null>(null),[runChecked,setRunChecked]=useState(false),[runHold,setRunHold]=useState(false)
 const [notice,setNotice]=useState('저장된 후속 답변을 먼저 확인해 주세요. 질문 준비는 목적지 확정이 아닙니다.')
 const lock=useRef(false)
 const act=async(kind:'load'|'initialize'|'questions'|'request'|'review')=>{
  if(!reviewIsCurrent()){setNotice('계정 연결이 변경되었습니다. 현재 계정의 기본 초안을 다시 불러와 주세요.');return}
  if(lock.current||kind==='initialize'&&(!checked||discovery||hold))return
  if(kind==='request'&&(!runChecked||run||runHold||receipt))return
  lock.current=true;setBusy(true)
  try{
   if(kind==='review'){
    setDecisionReview(null)
    if(!discovery)throw Error('missing_context')
    const value=await requestDestinationDecisionReview(discovery)
    if(value.decisions.some(item=>[item.prompt,item.value].some(text=>sensitiveContentHint(text)||/\/(?:Users|home|private\/tmp|tmp)\//.test(text.normalize('NFKC')))))throw Error('private_review_rejected')
    setDecisionReview(value);setNotice('저장된 추가 결정과 질문 원문을 확인했습니다. 기술 근거 검증과 목적지 확정은 별도입니다.')
   }else if(kind==='questions'||kind==='request'){
    if(!discovery)throw Error('missing_context')
    if(kind==='request'){
     setRunHold(true)
     const requested=await requestDestinationQuestionRun(discovery,true);setRun(requested)
     setNotice('질문 요청이 기록되었습니다. 접수는 실행·완료가 아닙니다. 현재 후속 질문 확인으로 상태를 확인해 주세요.')
    }else{
     const [value,status]=await Promise.all([requestDestinationQuestions(discovery),requestDestinationQuestionRun(discovery)])
     setReceipt(value);setRun(status);setRunChecked(true);setRunHold(false)
     setNotice(value?'현재 답변 맥락에 연결된 질문입니다.':status?'질문 요청 상태를 확인했습니다. 자동 재전송하지 않습니다.':'아직 현재 맥락의 Planner 질문이 없습니다. 자동 전송하거나 임의 질문으로 대체하지 않습니다.')
    }
   }else{
    const document=intake.document
    const value=await requestDestinationDiscovery(intake,kind==='initialize'?{expectedRevision:0,context:{source:document.source,mode:document.mode,seedAnswers:document.answers,unknowns:document.unknowns,answers:[],askedQuestionIds:[],revision:1}}:undefined)
    setDiscovery(value);setDecisionReview(null);setReceipt(null);setChecked(true);setHold(false);setRun(null);setRunChecked(false);setRunHold(false)
    setNotice(value?'후속 답변을 불러왔습니다. 현재 맥락의 질문을 확인해 주세요.':'저장된 후속 답변이 없습니다. 명시적으로 질문 준비를 시작할 수 있습니다.')
   }
  }catch{
   if(kind==='initialize')setHold(true)
   setNotice('연결 상태 또는 저장 결과를 확인하지 못했습니다. 입력을 유지하고 자동 재시도하지 않습니다.')
  }finally{lock.current=false;setBusy(false)}
 }
 const save=async(next:DiscoveryContext)=>{
  if(!reviewIsCurrent()||lock.current||!discovery)throw Error('discovery_busy')
  lock.current=true;setBusy(true)
  try{
   const stored=await requestDestinationDiscovery(intake,{expectedRevision:discovery.revision,context:next})
   if(!stored)throw Error('not_saved')
   setDiscovery(stored);setDecisionReview(null);setReceipt(null);setRun(null);setRunChecked(false);setRunHold(false);setNotice('후속 답변이 저장되었습니다. 다음 질문은 새 답변 맥락을 기준으로 확인해 주세요. 목적지 확정은 아닙니다.')
  }finally{lock.current=false;setBusy(false)}
 }
 return <section className="destination-studio__unknowns" aria-label="목적지 심화 질문" aria-busy={busy}>
  <h3>목적지 심화 질문</h3><p role="status">{notice}</p>
  <div className="destination-studio__actions">
   <button type="button" disabled={busy} onClick={()=>void act('load')}>후속 답변 불러오기</button>
   <button type="button" disabled={busy||!checked||!!discovery||hold} onClick={()=>void act('initialize')}>후속 질문 준비 시작</button>
   <button type="button" disabled={busy||!discovery} onClick={()=>void act('questions')}>현재 후속 질문 확인</button>
   <button type="button" disabled={busy||!discovery} onClick={()=>void act('review')}>저장된 추가 결정 검토</button>
   <button type="button" disabled={busy||!discovery||!runChecked||!!run||runHold||!!receipt} onClick={()=>void act('request')}>Planner 후속 질문 요청</button>
  </div>
  {run&&<p role="status">{{queued:'요청 접수 · 실행 대기',dispatch_started:'질문 처리 중 · 응답 미확인',completed:'질문 응답 기록됨 · 목적지 확정 아님',failed:'질문 요청 실패 · 자동 재전송 없음',delivery_unknown:'전달 상태 불명 · 자동 재전송 없음'}[run.state]}</p>}
  {discovery&&<p>보관된 후속 답변 {discovery.context.answers.length}개 · 질문 한도 200개 · 달성률이 아닙니다</p>}
  {discovery&&decisionReview&&decisionReview.contextDigest===discovery.contextDigest&&<section aria-label="저장된 추가 결정">
   <h4>저장된 추가 결정</h4><p>기본 초안 버전 {decisionReview.intakeRevision} · 후속 답변 버전 {decisionReview.contextRevision}</p>
   {decisionReview.decisions.length?<dl>{decisionReview.decisions.map(item=><div key={item.questionId}><dt>{item.prompt}</dt><dd>{item.value}</dd></div>)}</dl>:<p>아직 저장된 추가 결정이 없습니다. 권장안은 자동 채택하지 않습니다.</p>}
   <p>질문 원문과 답변의 연결만 확인했습니다. 근거 내용 검증·Destination 확정·실행 승인은 별도입니다.</p>
  </section>}
  {discovery&&receipt&&<DestinationQuestionBatch context={discovery.context} receipt={receipt} onSave={save}/>}
 </section>
}
