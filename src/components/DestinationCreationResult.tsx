import {useCallback,useEffect,useRef,useState} from 'react'
import {requestDestinationCreation,type DestinationConfirmation,type StoredDiscovery} from '../lib/api'

export type CreationResultState='loading'|'registered'|'missing'|'unavailable'
export const creationResultNotice=(state:CreationResultState)=>({
 loading:'프로젝트 생성 결과를 조회하고 있습니다.',
 registered:'프로젝트 등록이 확인되었습니다.',
 missing:'프로젝트 등록 결과가 아직 확인되지 않았습니다. 실행 중인지 추정하지 않습니다.',
 unavailable:'생성 결과를 확인하지 못했습니다. 재생성하지 않고 조회만 다시 시도할 수 있습니다.',
})[state]

export function DestinationCreationResult({discovery,receipt}:{discovery:StoredDiscovery;receipt:DestinationConfirmation}){
 const [state,setState]=useState<CreationResultState>('loading')
 const current=useRef(0),controller=useRef<AbortController|null>(null)
 const load=useCallback(async()=>{
  const version=++current.current;controller.current?.abort()
  const abort=new AbortController();controller.current=abort;setState('loading')
  const timer=setTimeout(()=>{if(current.current===version){current.current++;setState('unavailable')}abort.abort()},15000)
  try{
   const value=await requestDestinationCreation(discovery,receipt,abort.signal)
   if(current.current===version)setState(value?'registered':'missing')
  }catch{if(current.current===version)setState('unavailable')}
  finally{clearTimeout(timer)}
 },[discovery,receipt])
 useEffect(()=>{void load();return()=>{current.current++;controller.current?.abort()}},[load])
 return <section className="destination-studio__unknowns" aria-label="프로젝트 생성 결과" aria-busy={state==='loading'}>
  <h4>프로젝트 생성 결과</h4>
  <p role="status">{creationResultNotice(state)}</p>
  <p>등록 확인은 작업 시작·접근 권한·실사용 완료·최종 수용을 뜻하지 않습니다.</p>
  <div className="destination-studio__actions"><button type="button" disabled={state==='loading'} onClick={()=>void load()}>생성 결과 다시 조회</button></div>
 </section>
}
