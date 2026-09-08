import test from 'node:test'
import assert from 'node:assert/strict'
import {validateDestinationQuestionReceipt as validate} from './outcome-destination-question-receipt.mjs'
import {discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
const context={source:'',mode:'guided_200q',seedAnswers:{problem:'문제'},unknowns:['검증 필요'],revision:1,answers:[],askedQuestionIds:[]}
const q={id:'q-1',gapId:'owner',domain:'system_boundary',prompt:'누가 사용하나요?',choices:['소유자','내부 팀'],recommendation:'소유자',reason:'사용 주체를 정합니다.',material:true}
const receipt={schemaVersion:1,contextDigest:discoveryContextDigest(context),coverage:[],questions:[q],completionAuthority:false}
const run=(r=receipt,c=context)=>validate({serializedContext:JSON.stringify(c),serializedReceipt:JSON.stringify(r)})
test('server shares the browser question plan without claiming evidence or completion',()=>{
 const result=run();assert.deepEqual(result.plan.batch,[q]);assert.equal(result.sourceVerification,'required');assert.equal(result.completionAuthority,false)
 assert.equal(result.plan.confirmedDestination,false)
})
test('stale, forged, duplicate and private Planner question output fails closed',()=>{
 for(const r of [{...receipt,contextDigest:'wrong'},{...receipt,completionAuthority:true},{...receipt,execute:true},{...receipt,questions:[q,q]},{...receipt,questions:[{...q,prompt:'password=synthetic-private'}]},{...receipt,questions:[{...q,recommendation:'not an option'}]}])assert.throws(()=>run(r),/discovery_question_receipt_invalid/)
 assert.throws(()=>run(receipt,{...context,revision:2}),/discovery_question_receipt_invalid/)
})
test('full issued budget suppresses fresh questions without inventing closure',()=>{
 const full={...context,askedQuestionIds:Array.from({length:200},(_,i)=>`issued-${i}`)}
 const result=run({...receipt,contextDigest:discoveryContextDigest(full)},full)
 assert.equal(result.plan.state,'question_limit_reached');assert.deepEqual(result.plan.batch,[]);assert.equal(result.plan.confirmedDestination,false)
})
