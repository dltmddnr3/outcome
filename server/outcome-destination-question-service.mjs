import {setTimeout as delay} from 'node:timers/promises'
import {acquireChatServiceLease} from './outcome-chat-service-lease.mjs'

// Explicitly started local process, not a Codex heartbeat/cron/role task.
export async function runDestinationQuestionService({enabled=false,coordinator,signal,intervalMs=2000,wait=(ms,signal)=>delay(ms,undefined,{signal}),acquireLease=()=>acquireChatServiceLease({port:61130}),write=line=>process.stdout.write(line)}={}){
 if(enabled!==true||typeof coordinator?.runOnce!=='function'||!signal||typeof signal.aborted!=='boolean'||typeof wait!=='function'||typeof acquireLease!=='function'||!Number.isSafeInteger(intervalMs)||intervalMs<1000||intervalMs>60000)return 64
 let release,last='',observationDelay=intervalMs
 const emit=state=>{if(last===state)return;last=state;try{write(`OUTCOME_DESTINATION_QUESTIONS_${state}\n`)}catch{}}
 try{
  if(signal.aborted)return 0
  release=await acquireLease()
  if(typeof release!=='function'){emit('LEASE_SAFE_HOLD');return 70}
  emit('STARTED')
  while(!signal.aborted){
   const value=await coordinator.runOnce()
   if(value?.completionAuthority!==false||!['idle','awaiting_result','awaiting_observation','result_recorded'].includes(value.state)){emit('SAFE_HOLD');return 70}
   emit(value.state.toUpperCase())
   observationDelay=value.state==='awaiting_observation'?Math.min(60000,observationDelay*2):intervalMs
   if(!signal.aborted)await wait(observationDelay,signal)
  }
  emit('STOPPED');return 0
 }catch{if(signal.aborted){emit('STOPPED');return 0}emit('SAFE_HOLD');return 70}
 finally{if(release)try{await release()}catch{emit('LEASE_RELEASE_SAFE_HOLD');return 70}}
}
