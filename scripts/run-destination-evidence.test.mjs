import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {runDestinationEvidenceOnce,runConfiguredDestinationEvidence} from './run-destination-evidence.mjs'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'
const hash=v=>createHash('sha256').update(v).digest('hex')
function fixture(){
 const fields=['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery'],labels=['문제','대상 사용자','결과','범위','비목표','제약','수용 기준','복구']
 const source=labels.map(label=>`# ${label}\n검토된 내용`).join('\n')
 const document={schemaVersion:1,mode:'file_import',source,answers:Object.fromEntries(fields.map(field=>[field,'검토된 내용'])),unknowns:[]}
 const serializedSnapshot=JSON.stringify({schemaVersion:2,inputKind:'file_import',draftId:'00000000-0000-4000-8000-000000000001',intakeRevision:1,contextRevision:1,document,completionAuthority:false,executionAuthority:false}),reviewDigest=hash(serializedSnapshot)
 const assessment={schemaVersion:1,workspaceId:'workspace',accountRef:'owner',reviewDigest,verdict:'supported_for_owner_review',domains:discoveryDomains.map(domain=>({domain,state:'contract_ready',assessment:'supported',evidence:[{ref:'source',contentDigest:hash(source),startLine:2,endLine:2,quote:'검토된 내용'}]})),completionAuthority:false}
 const input={workspaceId:'workspace',accountRef:'owner',draftId:'00000000-0000-4000-8000-000000000001',expectedReviewDigest:reviewDigest,assessment:JSON.stringify(assessment),serializedSources:JSON.stringify({source})}
 let calls=0;const output=[]
 const args={input,signal:new AbortController().signal,ready:async()=>true,inspectionRepository:{inspect:async()=>({reviewDigest,serializedSnapshot,blockers:[]})},publisher:{publish:async()=>{calls++;return{state:'evidence_recorded',reviewDigest,completionAuthority:false,executionAuthority:false}}},write:line=>output.push(line)}
 return{args,output,calls:()=>calls}
}
test('check never publishes; explicit publish makes one call and emits only bounded state',async()=>{
 const f=fixture();assert.equal(await runDestinationEvidenceOnce({...f.args,mode:'--check'}),0);assert.equal(f.calls(),0)
 assert.equal(await runDestinationEvidenceOnce({...f.args,mode:'--publish-once'}),0);assert.equal(f.calls(),1)
 assert.deepEqual(f.output.map(line=>JSON.parse(line).state),['CHECKED_NO_MUTATION','EVIDENCE_RECORDED'])
 assert(!f.output.join('').includes('검토된 내용'))
})
test('missing evidence, changed digest, cancelled or changed authority never publishes',async()=>{
 for(const mutate of [f=>f.args.input.expectedReviewDigest='f'.repeat(64),f=>f.args.input.assessment='{}',f=>f.args.ready=async()=>false,f=>{const c=new AbortController();c.abort();f.args.signal=c.signal}]){
  const f=fixture();mutate(f);assert.equal(await runDestinationEvidenceOnce({...f.args,mode:'--publish-once'}),70);assert.equal(f.calls(),0)
 }
})
test('uncertain publication is reported without a retry or private error output',async()=>{
 const f=fixture();let calls=0;f.args.publisher.publish=async()=>{calls++;throw Error('private locator must not escape')}
 assert.equal(await runDestinationEvidenceOnce({...f.args,mode:'--publish-once'}),70);assert.equal(calls,1)
 assert.equal(JSON.parse(f.output[0]).state,'PUBLICATION_UNKNOWN');assert(!f.output.join('').includes('locator'))
})
test('configured entry with no authorized configuration fails closed',async()=>{
 const output=[]
 assert.equal(await runConfiguredDestinationEvidence({configPath:null,mode:'--check',signal:new AbortController().signal,environment:{},write:line=>output.push(line)}),70)
 assert.equal(JSON.parse(output[0]).state,'CONFIG_SAFE_HOLD')
})
