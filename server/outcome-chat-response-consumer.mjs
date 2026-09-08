import { types } from 'node:util'

const record = (value,keys) => {
  if (!value || typeof value !== 'object' || types.isProxy(value) || Object.getPrototypeOf(value)!==Object.prototype) throw new Error('invalid_input')
  const descriptors=Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).length!==keys.length || keys.some(key=>!descriptors[key] || !Object.hasOwn(descriptors[key],'value'))) throw new Error('invalid_input')
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]))
}

// One bounded pass, no scheduling and no request dispatch/replay.
export function createPlannerResponseConsumer({repository,queueAdapter,scope,diagnostic=()=>{}}={}) {
  const target=record(scope,['workspace_id','project_id','binding_version'])
  if (![target.workspace_id,target.project_id].every(value=>typeof value==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(value)) || !Number.isSafeInteger(target.binding_version)||target.binding_version<1) throw new Error('invalid_scope')
  if (typeof repository?.pendingPlannerResponses!=='function'||typeof repository?.appendPlannerResponse!=='function'||typeof queueAdapter?.bindingResolver!=='function'||typeof queueAdapter?.readPlannerResponse!=='function') throw new Error('invalid_runtime')
  let used=false
  return Object.freeze({async runOnce(){
    if(used)return {outcome:'unavailable'}
    used=true
    let pending
    try {pending=await repository.pendingPlannerResponses(target)}catch{try{diagnostic({phase:'pending_query',code:'unavailable'})}catch{};return {outcome:'unavailable'}}
    if(!Array.isArray(pending)||types.isProxy(pending)||pending.length>10)return {outcome:'unavailable'}
    const counts={stored:0,pending:0,unavailable:0}
    for(const raw of pending){
      let phase='pending_item'
      try{
        const request=record(raw,['correlation_id','message'])
        if(typeof request.correlation_id!=='string'||!/^message-[a-f0-9]{16}$/.test(request.correlation_id)||typeof request.message!=='string')throw new Error('invalid_request')
        phase='binding'
        const binding=await queueAdapter.bindingResolver({project_id:target.project_id,role:'planner'})
        if(binding?.project_id!==target.project_id||binding.role!=='planner'||binding.binding_version!==target.binding_version||binding.status!=='active'||binding.freshness!=='fresh'||!binding.destination)throw new Error('binding_drift')
        phase='source_read'
        const result=await queueAdapter.readPlannerResponse({destination:binding.destination,...request})
        if(result?.outcome==='pending'){counts.pending++;continue}
        if(result?.outcome!=='completed')throw new Error('unavailable')
        phase='response_validate'
        const response=record(result.response,['correlation_id','source_digest','message','observed_at'])
        if(response.correlation_id!==request.correlation_id)throw new Error('correlation_drift')
        phase='response_append'
        await repository.appendPlannerResponse({...target,...response})
        counts.stored++
      }catch{try{diagnostic({phase,code:'unavailable'})}catch{};counts.unavailable++}
    }
    return {outcome:pending.length?'checked':'idle',...counts}
  }})
}
