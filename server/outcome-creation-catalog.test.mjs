import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,symlinkSync,statSync,chmodSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createConfirmedPackagePublisher,readCreatedProjectEntries} from './outcome-creation-catalog.mjs'
import {collectOutcomePackages} from './outcome-package.mjs'

const scope={workspaceId:'workspace-test',accountRef:'owner-test',draftId:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000002'}
const proof={draftId:scope.draftId,requestId:scope.requestId,reviewDigest:'a'.repeat(64),evidenceDigest:'b'.repeat(64),serializedSnapshot:'{}',completionAuthority:false,executionAuthority:false}
proof.reviewDigest=createHash('sha256').update(proof.serializedSnapshot).digest('hex')
function documents(id){return {
 'OUTCOME_CONTRACT.md':`# Contract\n- Project ID: ${id}\n- Project name: Confirmed destination\n- Outcome: Owner verified result\n- Acceptance authority: Cherry\n`,
 'OUTCOME_MAP.md':`# Map\n\`\`\`yaml\nschema_version: 1\nproject_id: ${id}\ntitle: Confirmed destination\nphases:\n  - id: first-phase\n    title: Destination\n    purpose: Owner verified result\n    scopes:\n      - id: first-scope\n        title: Confirmed scope\n        purpose: Deliver result\n        stages:\n          - id: first-stage\n            title: Verify outcome\n            purpose: Prove result\n            depends_on: []\n            gates_file: GATES.md\n            implementation_state: not_started\n            evidence_closure_state: pending\n\`\`\`\n`,
 'GATES.md':'# Gates\n- [ ] G1: Owner verifies result\n  - EVIDENCE: pending\n',
 'OUTCOME_SESSIONS.md':`# Sessions\n\`\`\`yaml\nschema_version: 3\nproject_id: ${id}\nexecution_mode: result_owned\nowner_role: planner\nstages: [implementation, qa_verification, release_verification, preview]\n\`\`\`\n`,
}}
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'outcome-creation-test-')),catalog=join(root,'created');mkdirSync(catalog,{mode:0o700})
 const legacy=join(root,'legacy');mkdirSync(legacy);for(const [name,content] of Object.entries(documents('legacy')))writeFileSync(join(legacy,name),content)
 const registryPath=join(root,'projects.json');writeFileSync(registryPath,JSON.stringify({schema_version:1,creation_catalog:'created',projects:[{root:'legacy',contract_file:'OUTCOME_CONTRACT.md',map_file:'OUTCOME_MAP.md',sessions_file:'OUTCOME_SESSIONS.md'}]}))
 const options={catalog,confirmationRepository:{readConfirmedCreation:async()=>proof},renderPackage:({projectId})=>documents(projectId)}
 return {root,catalog,registryPath,options,collect:()=>collectOutcomePackages({repositoryRoot:root,environment:{OUTCOME_PROJECT_REGISTRY:registryPath}})}
}
test('confirmed publication becomes discoverable once, leaves legacy bytes and owner binding unchanged',async()=>{
 const f=fixture(),before=readFileSync(f.registryPath,'utf8'),publisher=createConfirmedPackagePublisher(f.options)
 assert.equal(f.collect().projects.length,1)
 const result=await publisher.publish(scope)
 assert.equal(result.state,'package_registered');assert.equal(result.completionAuthority,false);assert.equal(result.executionAuthority,false)
 assert.deepEqual(await publisher.publish(scope),result)
 const all=f.collect().projects;assert.equal(all.length,2);assert.deepEqual(all.map(p=>p.status),['valid','valid'])
 assert.equal(all[1].now.status,'unbound');assert.equal(all[1].bindings.length,1);assert.equal(all[1].bindings[0].role,'planner')
 assert.equal(readFileSync(f.registryPath,'utf8'),before)
 assert.equal(readdirSync(f.catalog).filter(n=>n.endsWith('.json')).length,1)
 const entries=readCreatedProjectEntries(f.catalog);assert.equal(entries.length,1)
 assert.equal(statSync(entries[0].root).mode&0o777,0o700)
})
test('missing confirmation creates nothing; conflicts and bad capability proofs fail closed',async()=>{
 const f=fixture()
 await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,confirmationRepository:{readConfirmedCreation:async()=>null}}).publish(scope))
 assert.deepEqual(readdirSync(f.catalog),[])
 await createConfirmedPackagePublisher(f.options).publish(scope)
 for(const changed of [{...proof,evidenceDigest:'c'.repeat(64)},{...proof,executionAuthority:true},{...proof,requestId:'00000000-0000-4000-8000-000000000009'}])await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,confirmationRepository:{readConfirmedCreation:async()=>changed}}).publish(scope))
 assert.equal(f.collect().projects.length,2)
})
test('each pre-publication failure leaves no visible project and removes only attempt-owned files',async()=>{
 for(const boundary of ['files_written','package_validated','before_publish']){
  const f=fixture();writeFileSync(join(f.catalog,'user-note.txt'),'keep')
  await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,checkpoint:step=>{assert.equal(f.collect().projects.length,1);if(step===boundary)throw Error('injected')}}).publish(scope))
  assert.equal(f.collect().projects.length,1);assert.deepEqual(readdirSync(f.catalog),['user-note.txt'])
 }
})
test('post-publication ambiguity preserves registered result and readback recovers without another package',async()=>{
 const f=fixture()
 await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,checkpoint:step=>{if(step==='published')throw Error('injected')}}).publish(scope),/creation_publication_unknown/)
 assert.equal(f.collect().projects.length,2)
 const before=readdirSync(f.catalog).sort()
 const recovered=await createConfirmedPackagePublisher({...f.options,renderPackage:()=>{throw Error('must not render')},checkpoint:()=>{throw Error('must not execute')}}).load(scope)
 assert.equal(recovered.state,'package_registered')
 assert.deepEqual(readdirSync(f.catalog).sort(),before)
})
test('load of an unpublished confirmed request is read-only and does not infer a queued execution',async()=>{
 const f=fixture(),publisher=createConfirmedPackagePublisher({...f.options,renderPackage:()=>{throw Error('must not render')},checkpoint:()=>{throw Error('must not execute')}})
 assert.equal(await publisher.load(scope),null);assert.deepEqual(readdirSync(f.catalog),[])
 await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,confirmationRepository:{readConfirmedCreation:async()=>null}}).load(scope))
 assert.deepEqual(readdirSync(f.catalog),[])
 const key=createHash('sha256').update(JSON.stringify([scope.workspaceId,scope.accountRef,scope.draftId])).digest('hex')
 symlinkSync('missing-target',join(f.catalog,`${key}.json`))
 await assert.rejects(()=>publisher.load(scope),/creation_catalog_unavailable/)
})
test('concurrent identical requests publish one immutable Package without replacing the winner',async()=>{
 const f=fixture();let arrived=0,release;const barrier=new Promise(resolve=>{release=resolve})
 const publisher=createConfirmedPackagePublisher({...f.options,checkpoint:async step=>{if(step==='before_publish'){if(++arrived===2)release();await barrier}}})
 const [one,two]=await Promise.all([publisher.publish(scope),publisher.publish(scope)])
 assert.deepEqual(one,two);assert.equal(f.collect().projects.length,2)
 assert.equal(readdirSync(f.catalog).filter(name=>name.startsWith('.package-')).length,1)
})
test('rollback preserves unexpected bytes rather than recursively deleting an attempt directory',async()=>{
 const f=fixture();let attempt
 await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,checkpoint:step=>{
  if(step==='files_written'){attempt=join(f.catalog,readdirSync(f.catalog).find(name=>name.startsWith('.package-')));writeFileSync(join(attempt,'user-note'),'keep');throw Error('injected')}
 }}).publish(scope),/creation_rollback_unknown/)
 assert.equal(readFileSync(join(attempt,'user-note'),'utf8'),'keep');assert.equal(f.collect().projects.length,1)
})
test('tamper, symlink, authority-bearing or invalid Package content is not published or consumed',async()=>{
 for(const alter of [d=>({...d,'../escape':'bad'}),d=>({...d,'OUTCOME_SESSIONS.md':d['OUTCOME_SESSIONS.md'].replace('result_owned','role_separated')}),d=>({...d,'OUTCOME_CONTRACT.md':d['OUTCOME_CONTRACT.md']+'\npassword=private-value'}),d=>({...d,'GATES.md':'- [x] G1: already accepted'}),d=>({...d,'OUTCOME_MAP.md':d['OUTCOME_MAP.md'].replace('gates_file: GATES.md','gates_file: ../foreign.md')}),d=>({...d,'OUTCOME_MAP.md':d['OUTCOME_MAP.md'].replace('implementation_state: not_started','implementation_state: complete')})]){
  const f=fixture();await assert.rejects(()=>createConfirmedPackagePublisher({...f.options,renderPackage:({projectId})=>alter(documents(projectId))}).publish(scope));assert.equal(f.collect().projects.length,1)
 }
 const f=fixture();await createConfirmedPackagePublisher(f.options).publish(scope)
 const entry=readCreatedProjectEntries(f.catalog)[0];chmodSync(join(entry.root,'GATES.md'),0o600);writeFileSync(join(entry.root,'GATES.md'),'changed')
 assert.throws(()=>f.collect(),/creation_catalog_unavailable/)
 const other=fixture();symlinkSync(f.catalog,join(other.root,'linked'));assert.throws(()=>readCreatedProjectEntries(join(other.root,'linked')),/creation_catalog_unavailable/)
})
