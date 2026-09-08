import {types} from 'node:util'
import {runDiscoveryQuestionOnce,collectDiscoveryQuestionOnce} from './outcome-destination-question-worker.mjs'
import {createDiscoveryQuestionDispatch} from './outcome-destination-question-dispatch.mjs'

const result=state=>({state,completionAuthority:false})
const readScope=input=>{
 if(!input||typeof input!=='object'||Array.isArray(input)||types.isProxy(input))throw Error('destination_coordinator_invalid')
 const descriptors=Object.getOwnPropertyDescriptors(input),keys=['workspaceId','accountRef','draftId']
 if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>!descriptors[key]||!Object.hasOwn(descriptors[key],'value')))throw Error('destination_coordinator_invalid')
 const scope=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]))
 if(!['workspaceId','accountRef'].every(key=>typeof scope[key]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(scope[key]))||typeof scope.draftId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(scope.draftId))throw Error('destination_coordinator_invalid')
 return Object.freeze(scope)
}

// No authority to create requests. A browser's explicit, durable enqueue is required.
// The original response capability stays in this process; restart never reclaims it.
export function createDestinationQuestionCoordinator({scope,discovery,requests,questions,queueAdapter,publishInput,ready}={}){
 const target=readScope(scope)
 if(typeof discovery?.load!=='function'||typeof requests?.load!=='function'||typeof requests?.claim!=='function'||typeof requests?.finish!=='function'||typeof requests?.readClaim!=='function'||typeof questions?.record!=='function'||typeof queueAdapter?.readPlannerResponse!=='function'||typeof ready!=='function')throw Error('destination_coordinator_invalid')
 const dispatch=createDiscoveryQuestionDispatch({queueAdapter,publishInput})
 if(!dispatch)throw Error('destination_coordinator_invalid')
 let collection=null,busy=false,held=false
 const hold=()=>{held=true;return result('safe_hold')}
 return Object.freeze({async runOnce(){
  if(busy)return result('busy')
  if(held)return result('safe_hold')
  busy=true
  try{
   if(collection){
    const value=await collectDiscoveryQuestionOnce({requests,questions,queueAdapter,...collection})
    if(value.state==='observation_unavailable')return result('awaiting_observation')
    if(value.state==='pending')return result('awaiting_result')
    if(value.state!=='result_recorded')return hold()
    collection=null;return result('result_recorded')
   }
   const current=await discovery.load(target)
   if(!current)return result('idle')
   if(current.draftId!==target.draftId||current.state!=='draft'||current.completionAuthority!==false||!Number.isSafeInteger(current.revision)||current.revision<1||typeof current.contextDigest!=='string'||!/^[a-f0-9]{64}$/.test(current.contextDigest))return hold()
   const request={...target,contextDigest:current.contextDigest}
   const row=await requests.load(request)
   if(!row)return result('idle')
   if(row.draftId!==target.draftId||row.contextDigest!==current.contextDigest||row.contextRevision!==current.revision||row.completionAuthority!==false)return hold()
   if(row.state==='completed')return result('idle')
   if(row.state!=='queued')return hold()
   // Do not consume the one-shot SQL claim when the configured reader is absent.
   if(await ready()!==true)return hold()
   const value=await runDiscoveryQuestionOnce({requests,dispatch,request})
   if(value.state==='not_claimed')return hold()
   if(value.state!=='awaiting_result'||!value.collection?.readReceipt)return hold()
   collection=value.collection
   return result('awaiting_result')
  }catch{return hold()}finally{busy=false}
 }})
}
