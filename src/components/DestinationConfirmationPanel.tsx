import {useEffect,useRef,useState} from 'react'
import {captureDestinationReviewBinding,requestDestinationConfirmation,requestDestinationConfirmationReview,type DestinationConfirmation,type DestinationConfirmationReview,type StoredDiscovery} from '../lib/api'

export function DestinationConfirmationPanel({discovery}:{discovery:StoredDiscovery}){
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
    setNotice(value?'목적지 확정 요청이 기록되었습니다. 프로젝트 생성·작업 실행·최종 수용은 아직 아닙니다.':attempted?'이번 요청 기록이 아직 확인되지 않습니다. 자동 재전송하지 않으며 기존 기록만 다시 조회할 수 있습니다.':'기존 확정 요청이 없습니다. 현재 초안의 근거 검증을 요청할 수 있습니다.')
   }
  }catch{
   if(!mounted.current)return
   setReview(null);setAck(false)
   if(kind==='read')setChecked(false)
   setNotice(kind==='prepare'?'현재 초안의 근거 검증을 완료하지 못했습니다. 미결정 답변·기술 검증 또는 서버 연결을 확인해야 하며 확정 요청은 보내지 않았습니다.':'요청 결과를 확인하지 못했습니다. 자동 재전송하지 않고 확정 요청 기록 조회로 확인해 주세요.')
  }finally{lock.current=false;if(mounted.current)setBusy(false)}
 }
 return <section className="destination-studio__unknowns" aria-label="Destination 확정 요청" aria-busy={busy}>
  <h4>Destination 확정 요청</h4>
  <p role="status">{notice}</p>
  <p>{`기본 초안 버전 ${discovery.intakeRevision} · 후속 답변 버전 ${discovery.revision}`}</p>
  <div className="destination-studio__actions">
   <button type="button" disabled={busy} onClick={()=>void act('read')}>확정 요청 기록 조회</button>
   <button type="button" disabled={busy||!checked||!!receipt||attempted||!!review} onClick={()=>void act('prepare')}>현재 초안 근거 검증</button>
  </div>
  {review&&!receipt&&<>
   <fieldset><legend>최종 확인</legend><label><input type="checkbox" checked={ack} disabled={busy} onChange={event=>setAck(event.currentTarget.checked)}/>위 기본 초안과 저장된 추가 결정을 검토했고, 이 버전으로 목적지 확정을 요청합니다.</label></fieldset>
   <div className="destination-studio__actions">
    <button type="button" disabled={busy} onClick={()=>{setReview(null);setAck(false);setNotice('확정을 취소했습니다. 요청을 보내지 않았습니다.')}}>확정 취소</button>
    <button className="destination-studio__primary" type="button" disabled={busy||!ack||attempted} onClick={()=>void act('confirm')}>이 버전으로 확정 요청</button>
   </div>
  </>}
  {receipt&&<p>확정 요청 기록됨 · 프로젝트 생성 대기</p>}
  <p>이 단계는 목적지 확정 요청만 기록합니다. 프로젝트·세션·Gate 생성과 실행 승인은 별도입니다.</p>
  <p>completionAuthority=false</p>
 </section>
}
