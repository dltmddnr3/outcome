import {expect,it} from 'vitest'
import {discoveryContextDigest,validateDiscoveryQuestionReceipt,type DiscoveryContext} from './destination-question-receipt'
const context:DiscoveryContext={source:'운영 상태를 쉽게 확인하고 싶습니다.',mode:'guided_200q',seedAnswers:{},unknowns:['검증 필요'],answers:[],askedQuestionIds:[],revision:1}
const question={id:'q-1',gapId:'ownership',domain:'system_boundary',prompt:'누가 결과를 확인하나요?',choices:['소유자','내부 팀'],recommendation:'소유자',reason:'첫 사용자의 범위를 고정합니다.',material:true}
const receipt=async()=>JSON.stringify({schemaVersion:1,contextDigest:await discoveryContextDigest(context),coverage:[],questions:[question],completionAuthority:false})
it('routes a current Planner question through bounded planning without claiming evidence verification',async()=>{
 const result=await validateDiscoveryQuestionReceipt(context,await receipt())
 expect(result.plan.batch).toEqual([question]);expect(result.sourceVerification).toBe('required');expect(result.completionAuthority).toBe(false)
})
it('rejects late questions after source, revision or issued-question history changes',async()=>{
 const serialized=await receipt()
 for(const changed of [{...context,source:'바뀐 문서'},{...context,revision:2},{...context,askedQuestionIds:['q-1']},{...context,askedQuestionIds:['q-1'],answers:[{questionId:'q-1',gapId:'ownership',value:'내부 팀'}]}])await expect(validateDiscoveryQuestionReceipt(changed,serialized)).rejects.toThrow('discovery_receipt_invalid')
})
it('rejects forged authority, extra fields and malformed question records',async()=>{
 const value=JSON.parse(await receipt())
 for(const modified of [{...value,completionAuthority:true},{...value,execute:true},{...value,questions:[{...question,callback:'execute'}]},{...value,questions:[{...question,recommendation:'outside choices'}]}])await expect(validateDiscoveryQuestionReceipt(context,JSON.stringify(modified))).rejects.toThrow('discovery_receipt_invalid')
})
it('binds mode, initial intake answers and unresolved questions as well as follow-up answers',async()=>{
 const initial={...context,mode:'guided_200q' as const,seedAnswers:{problem:'원래 문제'},unknowns:['검증 필요']}
 const digest=await discoveryContextDigest(initial)
 for(const changed of [{...initial,mode:'brief_gap' as const},{...initial,seedAnswers:{problem:'다른 문제'}},{...initial,unknowns:['다른 미상']}])expect(await discoveryContextDigest(changed)).not.toBe(digest)
})
it('binds all 200 full-length answers without reusing the source-file byte limit',async()=>{
 const answers=Array.from({length:200},(_,i)=>({questionId:`q-${i}`,gapId:`gap-${i}`,value:'가'.repeat(4000)}))
 const full={...context,answers,askedQuestionIds:answers.map(a=>a.questionId)}
 const digest=await discoveryContextDigest(full)
 expect(digest).toMatch(/^[a-f0-9]{64}$/)
 expect(await discoveryContextDigest({...full,answers:[...answers].reverse()})).toBe(digest)
 expect(await discoveryContextDigest({...full,answers:answers.map((a,i)=>i===199?{...a,value:a.value.slice(0,-1)+'나'}:a)})).not.toBe(digest)
 await expect(discoveryContextDigest({...full,source:'x'.repeat(65537)})).rejects.toThrow()
})
it('uses the same complete context identity in browser policy and durable server repository',async()=>{
 const fixture={...context,seedAnswers:{outcome:'결과',problem:'문제'},answers:[{questionId:'q-2',gapId:'g-2',value:'나'},{questionId:'q-1',gapId:'g-1',value:'가'}],askedQuestionIds:['q-2','q-1']}
 // Shared golden vector also asserted by the server repository test.
 expect(await discoveryContextDigest(fixture)).toBe('5785cb3038097cfdb6950deafbb7e842ab9c1a800510e2dfb92b92bbe8e97f72')
})
