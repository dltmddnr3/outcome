import {useEffect,useRef,useState} from 'react'
import {validateDiscoveryQuestionReceipt,type DiscoveryContext} from '../lib/destination-question-receipt'
import type {DiscoveryQuestion} from '../lib/destination-question-plan'
import {sensitiveContentHint} from './PlannerConversation'

export function DestinationQuestionBatch({context,receipt,onSave}:{context:DiscoveryContext;receipt:string;onSave:(next:DiscoveryContext)=>Promise<void>}) {
 const [questions,setQuestions]=useState<DiscoveryQuestion[]>([])
 const [values,setValues]=useState<Record<string,string>>({})
 const [notice,setNotice]=useState('질문과 현재 답변의 연결을 확인하고 있습니다.')
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[hold,setHold]=useState(false),[saved,setSaved]=useState(false)
 const [validatedIdentity,setValidatedIdentity]=useState('')
 const identity=JSON.stringify([context,receipt])
 const latest=useRef(identity);latest.current=identity
 const lock=useRef(false)
 useEffect(()=>{
  let active=true
  setReady(false);setQuestions([]);setValues({});setHold(false);setSaved(false)
  setNotice('질문과 현재 답변의 연결을 확인하고 있습니다.')
  void validateDiscoveryQuestionReceipt(context,receipt).then(result=>{
   if(!active)return
   if(result.plan.batch.some(q=>[q.prompt,q.reason,...q.choices].some(text=>sensitiveContentHint(text)||/\/(?:Users|home|private\/tmp|tmp)\//.test(text.normalize('NFKC')))))throw Error('private_question_rejected')
   setQuestions(result.plan.batch);setValidatedIdentity(identity);setReady(true)
   setNotice(result.plan.batch.length?'질문은 제안입니다. 근거 검증과 목적지 확정은 별도입니다.':result.plan.state==='question_limit_reached'?'질문 200개 한도에 도달했습니다. 남은 미확인 항목을 Planner와 검토해야 합니다.':'새 질문이 없습니다. 근거 검증과 목적지 검토가 남아 있습니다.')
  }).catch(()=>{if(active)setNotice('현재 답변과 일치하는 질문을 확인하지 못했습니다. 오래된 질문으로 진행하지 않습니다.')})
  return()=>{active=false}
 },[identity])
 const save=async()=>{
  if(lock.current||!ready||validatedIdentity!==identity||hold||saved||!questions.length||questions.some(q=>!values[q.id]?.trim()))return
  if(Object.values(values).some(value=>sensitiveContentHint(value)||/\/(?:Users|home|private\/tmp|tmp)\//.test(value.normalize('NFKC')))){setNotice('민감한 값이나 로컬 경로를 제거해 주세요. 전송하지 않았습니다.');return}
  const captured=identity
  const next:DiscoveryContext={...context,revision:context.revision+1,askedQuestionIds:[...new Set([...context.askedQuestionIds,...questions.map(q=>q.id)])],answers:[...context.answers,...questions.map(q=>({questionId:q.id,gapId:q.gapId,value:values[q.id].trim()}))]}
  lock.current=true;setBusy(true)
  try {
   await onSave(next)
   if(latest.current!==captured)return
   setSaved(true);setNotice('후속 답변이 저장되었습니다. 다음 질문은 새 답변을 기준으로 받아야 합니다. 목적지 확정은 아닙니다.')
  }catch{
   if(latest.current!==captured)return
   setHold(true);setNotice('저장 결과를 확인하지 못했습니다. 입력을 유지합니다. 자동 재시도하지 않으며 저장된 답변 확인이 필요합니다.')
  }finally{lock.current=false;setBusy(false)}
 }
 return <section className="destination-studio__question" aria-label="목적지 후속 질문" aria-busy={busy}>
  <h3>목적지 후속 질문</h3>
  <p role="status">{notice}</p>
  {ready&&validatedIdentity===identity&&questions.map((question,index)=><div key={question.id}>
   <div className="destination-studio__prompt"><small>이번 질문 {index+1} / {questions.length} · 달성률이 아닙니다</small><h4>{question.prompt}</h4><p>{question.reason}</p></div>
   <fieldset disabled={busy||hold||saved}><legend>{question.prompt}</legend>{question.choices.map(choice=><label key={choice} data-selected={values[question.id]===choice?'true':undefined}><input type="radio" name={`followup-${question.id}`} checked={values[question.id]===choice} onChange={()=>setValues(current=>({...current,[question.id]:choice}))}/><span><strong>{choice}</strong>{choice===question.recommendation&&<small>권장 · 자동 선택하지 않습니다</small>}</span></label>)}</fieldset>
   <label className="destination-studio__custom"><span>{question.prompt} · 직접 입력</span><textarea rows={3} maxLength={4000} disabled={busy||hold||saved} value={question.choices.includes(values[question.id])?'':values[question.id]??''} onChange={event=>{const value=event.currentTarget.value;setValues(current=>({...current,[question.id]:value}))}}/></label>
  </div>)}
  <button className="destination-studio__primary" type="button" disabled={!ready||validatedIdentity!==identity||!questions.length||busy||hold||saved||questions.some(q=>!values[q.id]?.trim())} onClick={()=>void save()}>후속 답변 저장</button>
 </section>
}
