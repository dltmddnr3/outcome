import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,chmod,symlink,stat,writeFile,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createDestinationInputStore} from './outcome-destination-input-store.mjs'
import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
test('private input store persists exact reference, denies scope/permission/symlink/content drift',async()=>{
 const directory=await realpath(await mkdtemp(join(tmpdir(),'outcome-analysis-store-test-')))
 await chmod(directory,0o700)
 const doc={schemaVersion:1,mode:'brief_gap',source:'기획서'.repeat(6000),answers:{},unknowns:['검증 필요']}
 const input={requestId:'00000000-0000-4000-8000-000000000001',draftId:'00000000-0000-4000-8000-000000000002',draftRevision:1,documentDigest:destinationDocumentDigest(doc),serializedDocument:JSON.stringify(doc),purpose:'destination_analysis_only',executionAuthority:false}
 const options={directory,scopeKey:'a'.repeat(64)},store=createDestinationInputStore(options)
 const receipt=await store.publish(input)
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
