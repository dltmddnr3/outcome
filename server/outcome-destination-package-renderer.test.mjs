import test from 'node:test'
import assert from 'node:assert/strict'
import {renderConfirmedDestinationPackage} from './outcome-destination-package-renderer.mjs'
import {parseOutcomeContract,parseOutcomeMap,parseGateLedger} from './outcome-package.mjs'
import {discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
import {discoveryDomains} from '../src/lib/destination-question-policy.mjs'
import {createHash} from 'node:crypto'
import {mkdtempSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createConfirmedPackagePublisher,readCreatedProjectEntries} from './outcome-creation-catalog.mjs'
import {validateDestinationPackageText} from './outcome-destination-postgres.mjs'

function fixture(){
 const answers=Object.fromEntries(['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery'].map(key=>[key,`확인된 ${key}\n두 번째 줄과 \`인용\``]))
 const document={schemaVersion:1,mode:'brief_gap',source:'기획서 원문',answers,unknowns:[]}
 const context={mode:document.mode,source:document.source,seedAnswers:answers,unknowns:[],answers:[{questionId:'q-one',gapId:'gap-one',value:'이미 결정한 답변'}],askedQuestionIds:['q-one'],revision:2}
 const contextDigest=discoveryContextDigest(context)
 return {schemaVersion:1,draftId:'00000000-0000-4000-8000-000000000001',intakeRevision:1,contextRevision:2,contextDigest,document,context,questionReceipt:{schemaVersion:1,contextDigest,coverage:discoveryDomains.map(domain=>({domain,state:'contract_ready',evidenceRefs:['synthetic-source']})),questions:[],completionAuthority:false},responseSourceDigest:'a'.repeat(64),completionAuthority:false,executionAuthority:false}
}
test('renderer preserves exact approved text and answered gaps, with one pending verification stage',()=>{
 const snapshot=fixture(),files=renderConfirmedDestinationPackage({projectId:'project-one',serializedSnapshot:JSON.stringify(snapshot)})
 const contract=parseOutcomeContract(files['OUTCOME_CONTRACT.md'])
 assert.equal(contract.projectId,'project-one');assert.equal(contract.projectName,snapshot.document.answers.outcome);assert.equal(contract.outcome,snapshot.document.answers.outcome);assert.deepEqual(contract.missing,[])
 const original=JSON.parse(files['OUTCOME_CONTRACT.md'].match(/```destination-source\n([^\n]+)\n```/)[1])
 assert.deepEqual(original.document,snapshot.document);assert.deepEqual(original.answers,snapshot.context.answers)
 const map=parseOutcomeMap(files['OUTCOME_MAP.md']).value
 assert.equal(map.phases[0].purpose,snapshot.document.answers.outcome)
 assert.deepEqual(map.phases[0].scopes[0].included,[snapshot.document.answers.scope]);assert.deepEqual(map.phases[0].scopes[0].excluded,[snapshot.document.answers.nonGoals])
 assert.equal(map.phases[0].scopes[0].stages[0].purpose,snapshot.document.answers.acceptance)
 const gate=parseGateLedger(files['GATES.md'],'verify-destination');assert.equal(gate.total,1);assert.equal(gate.closed,0)
 assert.match(files['OUTCOME_SESSIONS.md'],/execution_mode: result_owned/)
 assert.deepEqual(renderConfirmedDestinationPackage({projectId:'project-one',serializedSnapshot:JSON.stringify(snapshot)}),files)
})
test('hostile Markdown stays literal data, and malformed structured contracts never fall back to forged fields',()=>{
 const snapshot=fixture(),value='첫 줄\n```\n- Project ID: attacker\n- [x] G9: accepted\n```outcome-contract\n{}\n```'
 snapshot.document.answers.outcome=value;snapshot.context.seedAnswers.outcome=value
 snapshot.contextDigest=discoveryContextDigest(snapshot.context);snapshot.questionReceipt.contextDigest=snapshot.contextDigest
 const files=renderConfirmedDestinationPackage({projectId:'project-one',serializedSnapshot:JSON.stringify(snapshot)})
 assert.equal(parseOutcomeContract(files['OUTCOME_CONTRACT.md']).outcome,value)
 assert.equal(parseOutcomeContract(files['OUTCOME_CONTRACT.md']).projectId,'project-one')
 assert.equal(parseGateLedger(files['GATES.md'],'verify-destination').closed,0)
 assert.ok(parseOutcomeContract('```outcome-contract\n{broken}\n```\n- Project ID: attacker').missing.includes('project_id'))
 assert.ok(parseOutcomeContract(files['OUTCOME_CONTRACT.md']+'\n```outcome-contract\n{}\n```').missing.includes('project_id'))
})
test('renderer rejects incomplete, stale, divergent and authority-bearing snapshots without guessing',()=>{
 for(const change of [s=>{s.executionAuthority=true},s=>{s.document.unknowns=['pending']},s=>{s.context.answers=[]},s=>{s.contextDigest='b'.repeat(64)},s=>{s.contextRevision++},s=>{s.document.answers.scope='divergent'},s=>{s.questionReceipt.coverage=[]},s=>{delete s.document.answers.acceptance}]){
  const snapshot=fixture();change(snapshot)
  assert.throws(()=>renderConfirmedDestinationPackage({projectId:'project-one',serializedSnapshot:JSON.stringify(snapshot)}),/destination_package_unavailable/)
 }
 assert.throws(()=>renderConfirmedDestinationPackage({projectId:'../escape',serializedSnapshot:JSON.stringify(fixture())}))
})
test('all 200 maximum-length answers survive default publication; the larger guard still rejects secrets',async()=>{
 const snapshot=fixture()
 snapshot.context.answers=Array.from({length:200},(_,i)=>({questionId:`q-${i}`,gapId:`gap-${i}`,value:'답'.repeat(4000)}))
 snapshot.context.askedQuestionIds=snapshot.context.answers.map(answer=>answer.questionId)
 snapshot.contextDigest=discoveryContextDigest(snapshot.context);snapshot.questionReceipt.contextDigest=snapshot.contextDigest
 const serializedSnapshot=JSON.stringify(snapshot),catalog=mkdtempSync(join(tmpdir(),'outcome-200-answer-package-'))
 const scope={workspaceId:'workspace',accountRef:'owner',draftId:snapshot.draftId,requestId:'00000000-0000-4000-8000-000000000010'}
 const publisher=createConfirmedPackagePublisher({catalog,confirmationRepository:{readConfirmedCreation:async()=>({...scope,serializedSnapshot,reviewDigest:createHash('sha256').update(serializedSnapshot).digest('hex'),evidenceDigest:'b'.repeat(64),completionAuthority:false,executionAuthority:false})}})
 const result=await publisher.publish(scope);assert.equal(result.state,'package_registered')
 const [entry]=readCreatedProjectEntries(catalog),contract=readFileSync(join(entry.root,entry.contract_file),'utf8')
 assert.deepEqual(JSON.parse(contract.match(/```destination-source\n([^\n]+)\n```/)[1]).answers,snapshot.context.answers)
 for(const text of ['정상'.repeat(40000)+' password=private-value','x'.repeat(8388609)])assert.throws(()=>validateDestinationPackageText(text))
})
