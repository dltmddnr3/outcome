import {useRef,useState} from 'react'
import {captureDestinationReviewBinding,requestDestinationDiscovery,requestDestinationQuestions,type StoredDestinationDraft,type StoredDiscovery} from '../lib/api'
import {DestinationQuestionBatch} from './DestinationQuestionBatch'
import type {DiscoveryContext} from '../lib/destination-question-receipt'

export function DestinationDiscoveryPanel({intake}:{intake:StoredDestinationDraft}) {
 const [reviewIsCurrent]=useState(()=>captureDestinationReviewBinding())
 const [discovery,setDiscovery]=useState<StoredDiscovery|null>(null)
 const [checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[hold,setHold]=useState(false)
 const [receipt,setReceipt]=useState<string|null>(null)
 const [notice,setNotice]=useState('저장된 후속 답변을 먼저 확인해 주세요. 질문 준비는 목적지 확정이 아닙니다.')
 const lock=useRef(false)
 const act=async(kind:'load'|'initialize'|'questions')=>{
  if(!reviewIsCurrent()){setNotice('계정 연결이 변경되었습니다. 현재 계정의 기본 초안을 다시 불러와 주세요.');return}
  if(lock.current||kind==='initialize'&&(!checked||discovery||hold))return
  lock.current=true;setBusy(true)
  try{
   if(kind==='questions'){
    if(!discovery)throw Error('missing_context')
    const value=await requestDestinationQuestions(discovery);setReceipt(value)
    setNotice(value?'현재 답변 맥락에 연결된 질문입니다.':'아직 현재 맥락의 Planner 질문이 없습니다. 자동 전송하거나 임의 질문으로 대체하지 않습니다.')
   }else{
    const document=intake.document
    const value=await requestDestinationDiscovery(intake,kind==='initialize'?{expectedRevision:0,context:{source:document.source,mode:document.mode,seedAnswers:document.answers,unknowns:document.unknowns,answers:[],askedQuestionIds:[],revision:1}}:undefined)
    setDiscovery(value);setReceipt(null);setChecked(true);setHold(false)
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
   setDiscovery(stored);setReceipt(null);setNotice('후속 답변이 저장되었습니다. 다음 질문은 새 답변 맥락을 기준으로 확인해 주세요. 목적지 확정은 아닙니다.')
  }finally{lock.current=false;setBusy(false)}
 }
 return <section className="destination-studio__unknowns" aria-label="목적지 심화 질문" aria-busy={busy}>
  <h3>목적지 심화 질문</h3><p role="status">{notice}</p>
  <div className="destination-studio__actions">
   <button type="button" disabled={busy} onClick={()=>void act('load')}>후속 답변 불러오기</button>
   <button type="button" disabled={busy||!checked||!!discovery||hold} onClick={()=>void act('initialize')}>후속 질문 준비 시작</button>
   <button type="button" disabled={busy||!discovery} onClick={()=>void act('questions')}>현재 후속 질문 확인</button>
  </div>
  {discovery&&<p>보관된 후속 답변 {discovery.context.answers.length}개 · 질문 한도 200개 · 달성률이 아닙니다</p>}
  {discovery&&receipt&&<DestinationQuestionBatch context={discovery.context} receipt={receipt} onSave={save}/>}
 </section>
}
