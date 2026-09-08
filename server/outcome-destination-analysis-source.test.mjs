import assert from 'node:assert/strict'
import test from 'node:test'
import {createDestinationAnalysisSourceResolver,destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
const document=()=>({schemaVersion:1,mode:'brief_gap',source:'기획'.repeat(10000),answers:{problem:'문제'},unknowns:['검증 필요']})
const make=()=>{
 const row={draftId:'00000000-0000-4000-8000-000000000001',revision:1,document:document(),state:'draft',completionAuthority:false}
 const calls=[]
 const resolve=createDestinationAnalysisSourceResolver({repository:{load:async scope=>{calls.push(scope);return scope.accountRef==='owner'?row:null}}})
 const input={workspaceId:'workspace',accountRef:'owner',draftId:row.draftId,revision:1,documentDigest:destinationDocumentDigest(row.document)}
 return {row,calls,resolve,input}
}
test('resolves a full 60KB private document by exact owner revision/hash without chat truncation',async()=>{
 const {resolve,input,calls,row}=make()
 const result=await resolve(input)
 assert.equal(JSON.parse(result.serializedDocument).source,row.document.source)
 assert.equal(Buffer.byteLength(JSON.parse(result.serializedDocument).source),60000)
 assert.deepEqual(calls,[{workspaceId:'workspace',accountRef:'owner',draftId:row.draftId}])
 row.document.source='edited after resolution'
 assert.notEqual(JSON.parse(result.serializedDocument).source,row.document.source)
 assert.equal(result.completionAuthority,false)
})
test('rejects foreign scope, stale version, changed content and extra authority',async()=>{
 const {resolve,input,row}=make()
 for(const changed of [{...input,accountRef:'other'},{...input,revision:2},{...input,documentDigest:'0'.repeat(64)},{...input,execute:true}])await assert.rejects(()=>resolve(changed),/^Error: destination_analysis_source_unavailable$/)
 row.document.answers.problem='changed answer'
 await assert.rejects(()=>resolve(input),/destination_analysis_source_unavailable/)
})
test('invalid accessor input never runs user getters or repository reads; backend detail stays private',async()=>{
 const {resolve,input,calls}=make();let getters=0
 const hostile={...input};Object.defineProperty(hostile,'revision',{enumerable:true,get(){getters++;return 1}})
 await assert.rejects(()=>resolve(hostile),/destination_analysis_source_unavailable/)
 assert.equal(getters,0);assert.equal(calls.length,0)
 const unavailable=createDestinationAnalysisSourceResolver({repository:{load:async()=>{throw Error('private connection detail')}}})
 await assert.rejects(()=>unavailable(input),/^Error: destination_analysis_source_unavailable$/)
})
