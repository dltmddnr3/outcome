import {createHash} from 'node:crypto'
const hash=(v,n)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v)
const unknown=()=>JSON.stringify({delivery:'delivery_unknown'})

// Dispatch port for the durable controller only. No caller may bypass its grant,
// evidence and reservation checks. The receiving session must re-read authority.
export function createWorkQueueDispatch(queue){
  return async(input,{signal}={})=>{
    try{
      if(signal?.aborted||typeof input?.scopeJson!=='string'||Buffer.byteLength(input.scopeJson)>2048
        ||!hash(input.reservationDigest,64)||!hash(input.authorityRef,64)||!hash(input.candidateCommit,40)||!hash(input.candidateTree,40)
        ||!['implementing','qa_verifying','release_verifying'].includes(input.action))return unknown()
      const scope=JSON.parse(input.scopeJson)
      const bound=await queue.bindingResolver({project_id:scope.projectId,role:'planner'})
      if(signal?.aborted||queue.matchesWorkScope(bound.destination,input.scopeJson)!==true)return unknown()
      const message=JSON.stringify({type:'outcome-stage-request',schemaVersion:1,scope,
        candidateCommit:input.candidateCommit,candidateTree:input.candidateTree,action:input.action,
        authorityRef:input.authorityRef,reservationDigest:input.reservationDigest,
        instruction:'기존 작업 계약과 현재 승인·예약을 다시 확인한 뒤 해당 단계만 진행하세요. 확인 불가 시 보류하세요. 이 메시지는 추가 권한이나 단계 완료 증거가 아닙니다.'})
      const correlation_id=`message-${input.reservationDigest.slice(0,16)}`
      const receipt=await queue.transport({destination:bound.destination,message,correlation_id},{signal})
      if(receipt?.delivery!=='acknowledged')return unknown()
      return JSON.stringify({delivery:'acknowledged',sourceDigest:createHash('sha256').update(JSON.stringify(['outcome-work-queue-v1',input.reservationDigest,message,'acknowledged'])).digest('hex')})
    }catch{return unknown()}
  }
}
