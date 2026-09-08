import {types} from 'node:util'
import {createDestinationDraftRepository} from './outcome-destination-postgres.mjs'
import {createDestinationAnalysisRepository} from './outcome-destination-analysis-repository.mjs'
import {validateDestinationAnalysisResult} from './outcome-destination-analysis-result.mjs'

const unavailable=()=>new Error('destination_unavailable')
const knownError=error=>{
 if(!error||typeof error!=='object'||types.isProxy(error))return null
 const code=Object.getOwnPropertyDescriptor(error,'message')?.value
 return ['destination_revision_conflict','destination_request_conflict','destination_invalid'].includes(code)?code:null
}

// An explicitly supplied dedicated pool only: no env reads, credentials or grants.
export function createDestinationTransactionPort({pool}={}) {
 if(!pool||typeof pool.connect!=='function')throw unavailable()
 return async work=>{
  if(typeof work!=='function')throw unavailable()
  let client,workError,discard=false
  try {
   client=await pool.connect()
   if(!client||typeof client.query!=='function'||typeof client.release!=='function')throw unavailable()
   await client.query('BEGIN')
   await client.query('SET LOCAL ROLE outcome_destination_backend')
   const identity=(await client.query('select session_user, current_user')).rows[0]
   if(identity?.session_user!=='outcome_destination_runtime'||identity?.current_user!=='outcome_destination_backend')throw unavailable()
   let value
   try {value=await work({query:(sql,args)=>client.query(sql,args)})}catch(error){workError=knownError(error);throw error}
   await client.query('COMMIT')
   return value
  } catch {
   if(client)try{await client.query('ROLLBACK')}catch{discard=true}
   throw new Error(!discard&&workError?workError:'destination_unavailable')
  } finally {
   if(client)try{client.release(discard?unavailable():undefined)}catch{}
  }
 }
}

export function createDestinationRuntime({pool,allowedOrigin,csrfSecret}={}) {
 if(typeof csrfSecret!=='string'||csrfSecret.length<16)throw unavailable()
 try {const origin=new URL(allowedOrigin);if(origin.protocol!=='https:'||origin.origin!==allowedOrigin)throw unavailable()}catch{throw unavailable()}
 const transact=createDestinationTransactionPort({pool})
 return Object.freeze({allowedOrigin,csrfSecret,repository:createDestinationDraftRepository({transact}),analysisRepository:createDestinationAnalysisRepository({transact,validateResult:validateDestinationAnalysisResult})})
}
