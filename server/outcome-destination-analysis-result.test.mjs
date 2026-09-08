import test from 'node:test'
import assert from 'node:assert/strict'
import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
import {validateDestinationAnalysisResult as validate} from './outcome-destination-analysis-result.mjs'
const doc={schemaVersion:1,mode:'brief_gap',source:'창 전환으로 맥락을 놓칩니다.\n첫 사용자는 운영자입니다.',answers:{},unknowns:['확인 필요']}
const proposal={field:'problem',value:'창 전환에 따른 맥락 손실',startLine:1,endLine:1,quote:doc.source.split('\n')[0]}
const input={source:JSON.stringify(doc),draftRevision:1,documentDigest:destinationDocumentDigest(doc)}
const output=()=>({schemaVersion:1,documentDigest:input.documentDigest,draftRevision:1,proposals:[proposal],completionAuthority:false})
test('grounded interpretation remains unconfirmed and missing fields remain gaps',async()=>{
 const result=await validate({...input,result:JSON.stringify(output())})
 assert.equal(result.proposals[0].status,'needs_confirmation')
 assert.deepEqual(result.confirmedAnswers,{})
 assert.equal(result.semanticVerification,'owner_review_required');assert.equal(result.completionAuthority,false)
 assert.equal(result.gaps.includes('targetUser'),true)
})
test('rejects stale pins, invented citations, private values and forged authority',async()=>{
 for(const patch of [{documentDigest:'b'.repeat(64)},{draftRevision:2},{completionAuthority:true},{execute:true},{proposals:[{...proposal,quote:'invented'}]},{proposals:[{...proposal,value:'password=private'}]},{proposals:[{...proposal,startLine:0}]}])await assert.rejects(()=>validate({...input,result:JSON.stringify({...output(),...patch})}),/^Error: destination_analysis_result_invalid$/)
 await assert.rejects(()=>validate({...input,source:JSON.stringify({...doc,answers:{problem:'changed'}}),result:JSON.stringify(output())}),/destination_analysis_result_invalid/)
})
test('conflicting interpretations cannot overwrite or fill a gap',async()=>{
 const result=await validate({...input,result:JSON.stringify({...output(),proposals:[proposal,{...proposal,value:'different interpretation'}]})})
 assert.deepEqual(result.conflicts,['problem']);assert.equal(result.gaps.includes('problem'),true)
 assert.deepEqual(result.confirmedAnswers,{})
})
