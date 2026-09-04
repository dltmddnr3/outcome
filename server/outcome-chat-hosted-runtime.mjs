import { createHash } from 'node:crypto'
import { types } from 'node:util'
import { validateChatPrivateContent } from './outcome-chat.mjs'
import { createOutcomeChatPostgresRepository, createOutcomeChatTransactionPort } from './outcome-chat-postgres.mjs'
import { readOutcomeChatPoolerUrl, readOutcomeSupabaseProjectRef } from './outcome-chat-database-url.mjs'

export const OUTCOME_CHAT_HOSTED_ENV = Object.freeze({ enabled:'OUTCOME_CHAT_DURABLE_ENABLED',databaseUrl:'OUTCOME_CHAT_DATABASE_URL',databaseCaPem:'OUTCOME_CHAT_DATABASE_CA_PEM',csrfSecret:'OUTCOME_CHAT_CSRF_SECRET',bindingVersion:'OUTCOME_CHAT_PLANNER_BINDING_VERSION',supabaseUrl:'OUTCOME_SUPABASE_URL' })
const fail = (code='chat_unavailable') => { throw new Error(code) }
const read = (environment, name) => { let descriptor; try { descriptor=Object.getOwnPropertyDescriptor(environment,name) } catch { return '' }; return descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='string'?descriptor.value.trim():'' }
export function readOutcomeChatHostedConfiguration(environment={}) {
  if (!environment||typeof environment!=='object'||types.isProxy(environment)) return {enabled:false}
  try {
    const enabled=read(environment,OUTCOME_CHAT_HOSTED_ENV.enabled),databaseUrl=read(environment,OUTCOME_CHAT_HOSTED_ENV.databaseUrl),databaseCaPem=read(environment,OUTCOME_CHAT_HOSTED_ENV.databaseCaPem),csrfSecret=read(environment,OUTCOME_CHAT_HOSTED_ENV.csrfSecret),bindingVersion=Number(read(environment,OUTCOME_CHAT_HOSTED_ENV.bindingVersion)||'3'),supabaseUrl=read(environment,OUTCOME_CHAT_HOSTED_ENV.supabaseUrl)
    const pooler=readOutcomeChatPoolerUrl(databaseUrl),projectRef=readOutcomeSupabaseProjectRef(supabaseUrl)
    const valid=enabled==='1'&&pooler!==null&&projectRef!==null&&pooler.projectRef===projectRef&&databaseCaPem.startsWith('-----BEGIN CERTIFICATE-----\n')&&databaseCaPem.endsWith('\n-----END CERTIFICATE-----')&&csrfSecret.length>=32&&Number.isSafeInteger(bindingVersion)&&bindingVersion>0&&read(environment,'NODE_TLS_REJECT_UNAUTHORIZED')!=='0'
    return valid?{enabled:true,bindingVersion,databaseFingerprint:createHash('sha256').update(databaseUrl).digest('hex'),caFingerprint:createHash('sha256').update(databaseCaPem).digest('hex')}:{enabled:false}
  } catch { return {enabled:false} }
}
const privateConfiguration = (environment) => ({ enabled:read(environment,OUTCOME_CHAT_HOSTED_ENV.enabled),databaseUrl:read(environment,OUTCOME_CHAT_HOSTED_ENV.databaseUrl),databaseCaPem:read(environment,OUTCOME_CHAT_HOSTED_ENV.databaseCaPem),csrfSecret:read(environment,OUTCOME_CHAT_HOSTED_ENV.csrfSecret),bindingVersion:read(environment,OUTCOME_CHAT_HOSTED_ENV.bindingVersion)||'3',supabaseUrl:read(environment,OUTCOME_CHAT_HOSTED_ENV.supabaseUrl),tlsRejectUnauthorized:read(environment,'NODE_TLS_REJECT_UNAUTHORIZED') })
const owner = (value, workspaceId, projectId) => {
  if (!value||typeof value!=='object'||Array.isArray(value)||types.isProxy(value)||value.authenticated!==true||value.actor!=='cherry_owner'||value.workspace_id!==workspaceId||typeof value.account_ref!=='string'||!/^[a-f0-9]{64}$/.test(value.account_ref)||!Array.isArray(value.project_ids)||types.isProxy(value.project_ids)||value.project_ids.length!==1||value.project_ids[0]!==projectId) fail('access_denied')
}
const result = (value) => ({accepted:true,sequence:Number(value.sequence),event_id:value.event_id,dispatch_state:value.dispatch_state,delivery:value.delivery,execution_started:false,result_attached:false,evidence_attached:false})
export function createOutcomeChatHostedService({repository,bindingVersion,workspaceId,projectId,now=()=>new Date().toISOString()}={}) {
  if (!repository||typeof repository.reserve!=='function'||typeof repository.timeline!=='function'||!Number.isSafeInteger(bindingVersion)||bindingVersion<1||typeof workspaceId!=='string'||typeof projectId!=='string') fail()
  return Object.freeze({
    async submitPlannerMessage(input){ owner(input?.owner,workspaceId,projectId); if(input.project_id!==projectId||typeof input.idempotency_key!=='string'||!/^message-[a-f0-9]{16}$/.test(input.idempotency_key)) fail('access_denied'); const message=validateChatPrivateContent(input.message); const request_fingerprint=createHash('sha256').update(JSON.stringify({workspace_id:workspaceId,project_id:projectId,binding_version:bindingVersion,message})).digest('hex'); return result(await repository.reserve({workspace_id:workspaceId,project_id:projectId,binding_version:bindingVersion,idempotency_key:input.idempotency_key,request_fingerprint,message,observed_at:now()})) },
    async timeline(input){ owner(input?.owner,workspaceId,projectId); if(input.project_id!==projectId||!Number.isSafeInteger(input.after_sequence)||input.after_sequence<0) fail('access_denied'); return {target:{role:'planner',binding_version:bindingVersion},events:await repository.timeline({workspace_id:workspaceId,project_id:projectId,binding_version:bindingVersion,after_sequence:input.after_sequence}),completion_authority:false} },
  })
}

export function createOutcomeChatRateLimiter({now=Date.now,windowMs=60_000,timelineLimit=60,submitLimit=10,maxEntries=1_024}={}) {
  const validConfiguration=typeof now==='function'&&Number.isSafeInteger(windowMs)&&windowMs>=1_000&&Number.isSafeInteger(timelineLimit)&&timelineLimit>=1&&Number.isSafeInteger(submitLimit)&&submitLimit>=1&&Number.isSafeInteger(maxEntries)&&maxEntries>=1&&maxEntries<=10_000
  const entries=new Map(),fallback={allowed:false,retryAfter:validConfiguration?Math.max(1,Math.ceil(windowMs/1000)):60}
  const check=(input)=>{
    if(!validConfiguration||!input||typeof input!=='object'||Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype)return {...fallback}
    let descriptors;try{descriptors=Object.getOwnPropertyDescriptors(input)}catch{return {...fallback}}
    const keys=['account_ref','project_id','route_class','workspace_id'];if(Object.keys(descriptors).sort().join(',')!==keys.sort().join(',')||Object.values(descriptors).some(item=>!item.enumerable||!Object.hasOwn(item,'value')))return {...fallback}
    const value=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));if(typeof value.account_ref!=='string'||!/^[a-f0-9]{64}$/.test(value.account_ref)||typeof value.workspace_id!=='string'||!/^[a-z][a-z0-9-]{1,63}$/.test(value.workspace_id)||typeof value.project_id!=='string'||!/^[a-z][a-z0-9-]{1,63}$/.test(value.project_id)||!['timeline','submit'].includes(value.route_class))return {...fallback}
    let clock;try{clock=now()}catch{return {...fallback}};if(!Number.isSafeInteger(clock)||clock<0)return {...fallback}
    for(const [key,item] of entries)if(clock-item.startedAt>=windowMs)entries.delete(key)
    const key=createHash('sha256').update(JSON.stringify(value)).digest('hex'),limit=value.route_class==='timeline'?timelineLimit:submitLimit
    let item=entries.get(key);if(!item){if(entries.size>=maxEntries){const earliest=Math.min(...[...entries.values()].map(value=>value.startedAt+windowMs));return {allowed:false,retryAfter:Math.max(1,Math.ceil((earliest-clock)/1000))}};item={startedAt:clock,count:0};entries.set(key,item)}
    if(item.count>=limit)return {allowed:false,retryAfter:Math.max(1,Math.ceil((item.startedAt+windowMs-clock)/1000))}
    item.count+=1;return {allowed:true}
  }
  return Object.freeze({check,inspect:()=>Object.freeze({entry_count:entries.size,max_entries:maxEntries})})
}

export function createOutcomeChatHostedRuntimeFactory({environment=process.env,driverLoader=()=>import('pg'),repositoryFactory=createOutcomeChatPostgresRepository,rateLimiterFactory=createOutcomeChatRateLimiter,rateLimitOptions={}}={}) {
  const value=privateConfiguration(environment)
  const snapshotEnvironment={ [OUTCOME_CHAT_HOSTED_ENV.enabled]:value.enabled,[OUTCOME_CHAT_HOSTED_ENV.databaseUrl]:value.databaseUrl,[OUTCOME_CHAT_HOSTED_ENV.databaseCaPem]:value.databaseCaPem,[OUTCOME_CHAT_HOSTED_ENV.csrfSecret]:value.csrfSecret,[OUTCOME_CHAT_HOSTED_ENV.bindingVersion]:value.bindingVersion,[OUTCOME_CHAT_HOSTED_ENV.supabaseUrl]:value.supabaseUrl,NODE_TLS_REJECT_UNAUTHORIZED:value.tlsRejectUnauthorized }
  const configuration=readOutcomeChatHostedConfiguration(snapshotEnvironment)
  let limiter=null;try{limiter=configuration.enabled&&typeof rateLimiterFactory==='function'?rateLimiterFactory(rateLimitOptions):null}catch{}
  return async ({accountRuntime,allowedOrigin}={}) => {
    if(!configuration.enabled||!accountRuntime?.service||typeof accountRuntime.service.resolveBridgeAuthority!=='function'||typeof allowedOrigin!=='string'||!allowedOrigin.startsWith('https://'))return null
    try {
      const driver=await driverLoader(); if(typeof driver?.Pool!=='function')return null
      const connectionUrl=new URL(value.databaseUrl); connectionUrl.search=''
      const pool=new driver.Pool({connectionString:connectionUrl.toString(),ssl:{ca:value.databaseCaPem,rejectUnauthorized:true},max:4,allowExitOnIdle:true})
      const repository=repositoryFactory({transact:createOutcomeChatTransactionPort({pool})})
      if(!limiter||typeof limiter.check!=='function')return null
      return Object.freeze({repository,bindingVersion:configuration.bindingVersion,allowedOrigin,csrfSecret:value.csrfSecret,createService:(workspaceId)=>createOutcomeChatHostedService({repository,bindingVersion:configuration.bindingVersion,workspaceId,projectId:'outcome'}),rateLimit:(input)=>limiter.check(input)})
    } catch { return null }
  }
}
