import {useEffect,useRef,useState} from 'react'
import {requestDestinationDiscovery,type DiscoveryDecisionReview,type StoredDestinationDraft,type StoredDiscovery} from '../lib/api'
import {destinationQuestions} from '../lib/destination-discovery'

export function DestinationPreviousReview({intake,previous,decisions,pending,isCurrent,onCancel,onUpdated}:{intake:StoredDestinationDraft;previous:StoredDiscovery;decisions:DiscoveryDecisionReview;pending:boolean;isCurrent:()=>boolean;onCancel:()=>void;onUpdated:(value:StoredDiscovery)=>void}){
 const [ack,setAck]=useState(false),[busy,setBusy]=useState(false),[attempted,setAttempted]=useState(false)
 const [notice,setNotice]=useState('비교는 읽기 전용이며 갱신은 별도 확인 후 진행합니다.')
 const lock=useRef(false),controller=useRef<AbortController|null>(null),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort()}},[])
 const update=async()=>{
  if(lock.current||attempted||pending||!ack)return
  if(!isCurrent()){setNotice('계정 연결이 변경되었습니다. 초안부터 다시 불러와 주세요.');return}
  lock.current=true;setBusy(true);setAttempted(true)
  const abort=new AbortController();controller.current=abort
  try{
   const document=intake.document
   const context={...previous.context,revision:previous.revision+1,mode:document.mode,source:document.source,seedAnswers:document.answers,unknowns:document.unknowns}
   const saved=await requestDestinationDiscovery(intake,{expectedRevision:previous.revision,context},abort.signal)
   if(!saved)throw Error('not_saved')
   if(mounted.current)onUpdated(saved)
  }catch{if(mounted.current)setNotice('갱신 결과를 확인하지 못했습니다. 자동 재전송하지 않고 후속 답변 불러오기로 확인해 주세요.')}
  finally{lock.current=false;if(mounted.current)setBusy(false)}
 }
 return <section aria-label="이전 버전 후속 답변 비교" aria-busy={busy}>
  <h4>이전 버전 후속 답변 비교</h4>
  <p>{`기본 초안 버전 ${previous.intakeRevision} → ${intake.revision} · 후속 답변 버전 ${previous.revision}`}</p>
  <p>이전 답변은 비교용입니다. 현재 목적지의 확정 근거나 실행 승인으로 사용하지 않습니다.</p>
  <dl>{destinationQuestions.map(q=><div key={q.id}><dt>{q.label}</dt><dd>{`이전: ${previous.context.seedAnswers[q.id]??'미입력'}`}</dd><dd>{`현재: ${intake.document.answers[q.id]??'미입력'}`}</dd></div>)}</dl>
  <p>{previous.context.source===intake.document.source?'기획서 본문 변경 없음':'기획서 본문 변경됨 · 의미 재검토 필요'}</p>
  <p>{`이전 미상: ${previous.context.unknowns.join(' / ')||'없음'}`}</p><p>{`현재 미상: ${intake.document.unknowns.join(' / ')||'없음'}`}</p>
  <h4>보존할 기존 답변</h4>
  {decisions.decisions.length?<dl>{decisions.decisions.map(item=><div key={item.questionId}><dt>{item.prompt}</dt><dd>{item.value}</dd></div>)}</dl>:<p>저장된 후속 답변이 없습니다.</p>}
  {pending?<p role="status">이전 맥락에 미답변 질문이 남아 갱신을 보류합니다. 권장안을 자동 채택하지 않습니다.</p>:<>
   <fieldset><legend>버전 갱신 확인</legend><label><input type="checkbox" checked={ack} disabled={busy||attempted} onChange={e=>setAck(e.currentTarget.checked)}/>차이를 확인했고, 기존 답변을 보존해 현재 기본 초안에 연결합니다. 의미 검증과 목적지 확정은 별도입니다.</label></fieldset>
   <button type="button" disabled={!ack||busy||attempted} onClick={()=>void update()}>기존 답변 보존하여 버전 갱신</button>
  </>}
  <button type="button" disabled={busy} onClick={onCancel}>비교 닫기</button>
  <p role="status">{notice}</p>
 </section>
}
