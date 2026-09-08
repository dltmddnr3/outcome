import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,chmod,symlink,stat,writeFile,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createDestinationInputStore} from './outcome-destination-input-store.mjs'
import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
import {discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
import {readDestinationAnalysisInput} from '../scripts/read-destination-analysis-input.mjs'
import {execFileSync,spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
test('private question input retains full 200-answer context through the existing reader',async()=>{
 const directory=await realpath(await mkdtemp(join(tmpdir(),'outcome-question-store-test-')));await chmod(directory,0o700)
 const answers=Array.from({length:200},(_,i)=>({questionId:`q-${i}`,gapId:`gap-${i}`,value:'가'.repeat(4000)}))
 const context={source:'',mode:'guided_200q',seedAnswers:{problem:'문제'},unknowns:['검증 필요'],revision:1,answers,askedQuestionIds:answers.map(a=>a.questionId)}
 const input={requestId:'00000000-0000-4000-8000-000000000010',draftId:'00000000-0000-4000-8000-000000000011',contextRevision:1,contextDigest:discoveryContextDigest(context),serializedContext:JSON.stringify(context),purpose:'destination_questions_only',executionAuthority:false}
 const store=createDestinationInputStore({directory,scopeKey:'a'.repeat(64)})
 const publication=await store.publish(input)
 assert.equal(publication.contextDigest,input.contextDigest)
 const recovered=await readDestinationAnalysisInput({reference:publication.reference,environment:{OUTCOME_DESTINATION_INPUT_READER_ENABLED:'1',OUTCOME_DESTINATION_INPUT_DIRECTORY:directory,OUTCOME_DESTINATION_INPUT_SCOPE_SHA256:'a'.repeat(64)}})
 assert.equal(recovered.serializedContext,input.serializedContext);assert.equal(recovered.purpose,'destination_questions_only')
 for(const invalid of [{...input,contextDigest:'b'.repeat(64)},{...input,contextRevision:2},{...input,executionAuthority:true},{...input,serializedDocument:'unexpected'}])await assert.rejects(()=>store.publish(invalid),/destination_input_unavailable/)
})
test('private input store persists exact reference, denies scope/permission/symlink/content drift',async()=>{
 const directory=await realpath(await mkdtemp(join(tmpdir(),'outcome-analysis-store-test-')))
 await chmod(directory,0o700)
 const doc={schemaVersion:1,mode:'brief_gap',source:'기획서'.repeat(6000),answers:{},unknowns:['검증 필요']}
 const input={requestId:'00000000-0000-4000-8000-000000000001',draftId:'00000000-0000-4000-8000-000000000002',draftRevision:1,documentDigest:destinationDocumentDigest(doc),serializedDocument:JSON.stringify(doc),purpose:'destination_analysis_only',executionAuthority:false}
 const options={directory,scopeKey:'a'.repeat(64)},store=createDestinationInputStore(options)
 const receipt=await store.publish(input)
 const reader=fileURLToPath(new URL('../scripts/read-destination-analysis-input.mjs',import.meta.url))
 const env={...process.env,OUTCOME_DESTINATION_INPUT_READER_ENABLED:'1',OUTCOME_DESTINATION_INPUT_DIRECTORY:directory,OUTCOME_DESTINATION_INPUT_SCOPE_SHA256:options.scopeKey}
 const output=JSON.parse(execFileSync(process.execPath,[reader,receipt.reference],{env,encoding:'utf8'}))
 assert.equal(output.reference,receipt.reference);assert.equal(output.serializedDocument,input.serializedDocument)
 assert.equal(output.executionAuthority,false)
 for(const [enabled,args] of [['0',[receipt.reference]],['1',[receipt.reference,'extra']],['1',['../escape']]]){
  const invalid=spawnSync(process.execPath,[reader,...args],{env:{...env,OUTCOME_DESTINATION_INPUT_READER_ENABLED:enabled},encoding:'utf8'})
  assert.equal(invalid.status,1);assert.equal(invalid.stdout,'');assert.equal(invalid.stderr,'destination_input_unavailable\n')
 }
 assert.deepEqual(await createDestinationInputStore(options).read(receipt.reference),input)
 const path=join(directory,`${receipt.reference}.json`),before=await readFile(path)
 assert.deepEqual(await store.publish(input),receipt)
 assert.deepEqual(await readFile(path),before)
 assert.equal((await stat(path)).mode&0o777,0o600)
 await assert.rejects(()=>createDestinationInputStore({...options,scopeKey:'b'.repeat(64)}).read(receipt.reference),/destination_input_unavailable/)
 await assert.rejects(()=>store.read('../escape'),/destination_input_unavailable/)
 const alias=`analysis-${'c'.repeat(64)}`;await symlink(path,join(directory,`${alias}.json`))
 await assert.rejects(()=>store.read(alias),/destination_input_unavailable/)
 await chmod(path,0o644);await assert.rejects(()=>store.read(receipt.reference),/destination_input_unavailable/)
 await chmod(path,0o600);await writeFile(path,'corrupt',{mode:0o600})
 await assert.rejects(()=>store.read(receipt.reference),/destination_input_unavailable/)
 await assert.rejects(()=>store.publish(input),/destination_input_unavailable/)
 assert.equal(await readFile(path,'utf8'),'corrupt')
 // Task-owned synthetic fixtures intentionally retained, never owner source data.
})
