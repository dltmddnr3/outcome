import { expect, it } from 'vitest'
import { validatePrivateDecisionReceipt } from './api'
const receipt={decisionState:'recorded',decisionId:'00000000-0000-4000-8000-000000000001',decision:'approved',rejectionReason:null,decidedAt:'2026-09-08T00:00:00.000Z',decisionActorClass:'owner',notice:'기록됨 · 전달은 이 범위 밖',supersedesId:null,completionAuthority:false}
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
