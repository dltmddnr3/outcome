import { expect, it } from 'vitest'
import { validatePrivateDecisionHistory, validatePrivateDecisionReceipt } from './api'
const receipt={decisionState:'recorded',decisionId:'00000000-0000-4000-8000-000000000001',decision:'approved',rejectionReason:null,decidedAt:'2026-09-08T00:00:00.000Z',decisionActorClass:'owner',notice:'기록됨 · 전달은 이 범위 밖',supersedesId:null,completionAuthority:false}
it('validates history targets and withdrawal without accepting duplicate or forged rows',()=>{
  const row={receipt,target:{projectId:'outcome',eventId:'event-blocked',sequence:1},withdrawn:true}
  expect(validatePrivateDecisionHistory({decisions:[row],completionAuthority:false})).toEqual([row])
  for(const decisions of [[row,row],[{...row,withdrawn:'true'}],[{...row,target:{...row.target,sequence:0}}],[{...row,target:{...row.target,privateValue:'secret'}}],[{...row,receipt:{...receipt,decisionId:'bad'}}]])expect(()=>validatePrivateDecisionHistory({decisions,completionAuthority:false})).toThrow()
})
it('accepts only a closed owner receipt matching the exact requested decision',()=>{
  expect(validatePrivateDecisionReceipt(receipt,{decision:'approved'})).toEqual(receipt)
  const rejected={...receipt,decision:'rejected',rejectionReason:'evidence_insufficient'}
  expect(validatePrivateDecisionReceipt(rejected,{decision:'rejected',rejectionReason:'evidence_insufficient'})).toEqual(rejected)
})
it('rejects malformed or mismatched success without exposing server content',()=>{
  for(const value of [null,[],{}, {...receipt,decisionId:'private-value'},{...receipt,decidedAt:'yesterday'},{...receipt,decidedAt:'2026-09-08'},{...receipt,completionAuthority:true},{...receipt,decisionActorClass:'agent'},{...receipt,notice:'untrusted-private-text'},{...receipt,decision:'rejected'},{...receipt,rejectionReason:'scope_not_authorized'},{...receipt,supersedesId:receipt.decisionId},{...receipt,privateLocator:'private-value'}]){
    expect(()=>validatePrivateDecisionReceipt(value,{decision:'approved'})).toThrow(/^decision_receipt_invalid$/)
  }
})
it('does not invoke receipt field accessors',()=>{
  let reads=0
  const value={...receipt}
  Object.defineProperty(value,'notice',{enumerable:true,get(){reads++;return 'private-value'}})
  expect(()=>validatePrivateDecisionReceipt(value,{decision:'approved'})).toThrow('decision_receipt_invalid')
  expect(reads).toBe(0)
})
