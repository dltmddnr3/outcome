import test from 'node:test'
import assert from 'node:assert/strict'
import {handleDestinationDraftRequest} from './outcome-destination-api.mjs'
const draft='00000000-0000-4000-8000-000000000001'
const identityService={authenticate:async()=>{},resolveBridgeAuthority:async()=>({workspace_id:'workspace',account_ref:'a'.repeat(64),project_ids:['outcome']})}
const codes=['intake_incomplete','residual_unknowns','issued_answers_missing','question_receipt_missing','coverage_or_material_gap','verification_pending'].map(code=>`destination_confirmation_${code}`)
test('only authenticated confirmation review exposes finite readiness codes, never raw error or write result',async()=>{
 for(const code of [...codes,'secret /private/path credential','__proto__']){
  let calls=0
  const fail=async()=>{calls++;throw Error(code)}
  const runtime={confirmationRepository:{load:fail,review:fail,confirm:fail}}
  const input={pathname:`/api/private/destination/confirmation-review/${draft}`,identityService,runtime}
  assert.equal((await handleDestinationDraftRequest(input)).status,401);assert.equal(calls,0)
  const response=await handleDestinationDraftRequest({...input,token:'owner'})
  assert.equal(response.status,codes.includes(code)?409:503)
  assert.equal(response.body.error,codes.includes(code)?code:'destination_unavailable')
  const other=await handleDestinationDraftRequest({...input,token:'owner',pathname:`/api/private/destination/confirmations/${draft}`})
  assert.equal(other.status,503);assert.equal(other.body.error,'destination_unavailable')
 }
})
