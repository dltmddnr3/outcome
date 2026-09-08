import {expect,it} from 'vitest'
import {discoveryContextDigest,validateDiscoveryQuestionReceipt,type DiscoveryContext} from './destination-question-receipt'
const context:DiscoveryContext={source:'운영 상태를 쉽게 확인하고 싶습니다.',answers:[],askedQuestionIds:[],revision:1}
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
