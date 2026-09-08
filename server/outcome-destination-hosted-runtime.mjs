import {types} from 'node:util'
import {createDestinationRuntime} from './outcome-destination-runtime.mjs'
import {readOutcomeSupabaseProjectRef} from './outcome-chat-database-url.mjs'
import {createDestinationSourceVerifier} from './outcome-destination-source-verifier.mjs'

export const DESTINATION_HOSTED_ENV=Object.freeze({enabled:'OUTCOME_DESTINATION_DURABLE_ENABLED',databaseUrl:'OUTCOME_DESTINATION_DATABASE_URL',databaseCaPem:'OUTCOME_DESTINATION_DATABASE_CA_PEM',csrfSecret:'OUTCOME_DESTINATION_CSRF_SECRET',supabaseUrl:'OUTCOME_SUPABASE_URL'})
const disabled=()=>({enabled:false})
const configuration=environment=>{
 if(!environment||typeof environment!=='object'||types.isProxy(environment))return null
 try{
  const read=name=>{const value=Object.getOwnPropertyDescriptor(environment,name);return value&&Object.hasOwn(value,'value')&&typeof value.value==='string'?value.value.trim():''}
  if(read(DESTINATION_HOSTED_ENV.enabled)!=='1'||read('VERCEL_ENV')!=='preview'||!['','preview'].includes(read('VERCEL_TARGET_ENV'))||!['','1'].includes(read('NODE_TLS_REJECT_UNAUTHORIZED')))return null
  const host=read('VERCEL_URL')
  if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(host))return null
  const databaseUrl=read(DESTINATION_HOSTED_ENV.databaseUrl),databaseCaPem=read(DESTINATION_HOSTED_ENV.databaseCaPem),csrfSecret=read(DESTINATION_HOSTED_ENV.csrfSecret)
  const projectRef=readOutcomeSupabaseProjectRef(read(DESTINATION_HOSTED_ENV.supabaseUrl))
  const match=/^postgresql:\/\/outcome_destination_runtime\.([a-z]{20}):([^@/?#]+)@(aws-0-[a-z0-9]+(?:-[a-z0-9]+)*\.pooler\.supabase\.com):6543\/postgres\?sslmode=verify-full$/.exec(databaseUrl)
  if(!projectRef||!match||match[1]!==projectRef)return null
  const url=new URL(databaseUrl)
  if(url.username!==`outcome_destination_runtime.${projectRef}`||!decodeURIComponent(url.password)||/[\u0000-\u001f\u007f]/.test(decodeURIComponent(url.password)))return null
  if(!/^-----BEGIN CERTIFICATE-----\n[A-Za-z0-9+/=\n]+\n-----END CERTIFICATE-----$/.test(databaseCaPem)||csrfSecret.length<32||csrfSecret.length>256||/[\u0000-\u001f\u007f]/.test(csrfSecret))return null
  // pg parses sslmode in the URL; remove it so it cannot override the explicit CA.
  url.search=''
  return {allowedOrigin:`https://${host}`,connectionString:url.toString(),databaseCaPem,csrfSecret}
 }catch{return null}
}
// Only public-safe readiness; private configuration stays in the factory closure.
export const readDestinationHostedConfiguration=environment=>{
 const value=configuration(environment)
 return value?{enabled:true,allowedOrigin:value.allowedOrigin}:disabled()
}
export function createDestinationHostedRuntimeFactory({environment=process.env,driverLoader=()=>import('pg'),sourceReaders}={}){
 const value=configuration(environment)
 // Explicit server capabilities only. Neither environment strings nor request
 // payloads can install a verifier or turn an unreviewed source into evidence.
 let verifyDestinationReview,invalidReaders=false
 if(sourceReaders!==undefined)try{
  if(!sourceReaders||typeof sourceReaders!=='object'||types.isProxy(sourceReaders))throw Error()
  const descriptors=Object.getOwnPropertyDescriptors(sourceReaders)
  if(Object.keys(descriptors).sort().join(',')!=='readAssessment,readSource')throw Error()
  const readAssessment=descriptors.readAssessment.value,readSource=descriptors.readSource.value
  if(typeof readAssessment!=='function'||typeof readSource!=='function'||types.isProxy(readAssessment)||types.isProxy(readSource))throw Error()
  verifyDestinationReview=createDestinationSourceVerifier({readAssessment,readSource})
 }catch{invalidReaders=true}
 return async({accountRuntime,allowedOrigin}={})=>{
  if(!value||invalidReaders||allowedOrigin!==value.allowedOrigin||typeof accountRuntime?.service?.resolveBridgeAuthority!=='function')return null
  let pool
  try{
   const driver=await driverLoader()
   if(typeof driver?.Pool!=='function')return null
   pool=new driver.Pool({connectionString:value.connectionString,ssl:{ca:value.databaseCaPem,rejectUnauthorized:true},max:2,allowExitOnIdle:true,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:15000})
   // Idle connection failures must not print provider details or crash a function.
   pool.on?.('error',()=>{})
   return createDestinationRuntime({pool,allowedOrigin:value.allowedOrigin,csrfSecret:value.csrfSecret,verifyDestinationReview})
  }catch{if(pool)try{await pool.end()}catch{};return null}
 }
}
