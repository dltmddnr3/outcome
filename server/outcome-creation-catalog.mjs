import {createHash} from 'node:crypto'
import {closeSync,constants,existsSync,fsyncSync,fstatSync,linkSync,lstatSync,mkdtempSync,openSync,readFileSync,readdirSync,realpathSync,rmdirSync,unlinkSync,writeFileSync} from 'node:fs'
import {basename,join} from 'node:path'
import YAML from 'yaml'
import {validateDestinationPackageText} from './outcome-destination-postgres.mjs'
import {buildPackageModel} from './outcome-package.mjs'
import {renderConfirmedDestinationPackage} from './outcome-destination-package-renderer.mjs'

const names=['GATES.md','OUTCOME_CONTRACT.md','OUTCOME_MAP.md','OUTCOME_SESSIONS.md']
const hash=value=>createHash('sha256').update(value).digest('hex')
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)
const fail=()=>{throw Error('creation_catalog_unavailable')}
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',')
function privateDirectory(path){
 const stat=lstatSync(path)
 if(!stat.isDirectory()||(stat.mode&0o077)!==0||stat.uid!==process.getuid())fail()
 return realpathSync(path)
}
function readRegular(path,limit=8388608){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW)
 try{const stat=fstatSync(fd);if(!stat.isFile()||stat.size>limit)fail();return readFileSync(fd,'utf8')}finally{closeSync(fd)}
}
function durableWrite(path,content){
 const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o400)
 try{writeFileSync(fd,content,'utf8');fsyncSync(fd)}finally{closeSync(fd)}
}
function syncDirectory(path){const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{fsyncSync(fd)}finally{closeSync(fd)}}
function readEntry(catalog,key){
 if(!digest(key))fail()
 const record=JSON.parse(readRegular(join(catalog,`${key}.json`),8192))
 if(!exact(record,['schemaVersion','key','projectId','reviewDigest','evidenceDigest','root','files','completionAuthority','executionAuthority'])
  ||record.schemaVersion!==1||record.key!==key||record.projectId!==`destination-${key}`||!digest(record.reviewDigest)||!digest(record.evidenceDigest)
  ||record.completionAuthority!==false||record.executionAuthority!==false||typeof record.root!=='string'||!/^\.package-[A-Za-z0-9]{6}$/.test(record.root)
  ||!exact(record.files,names)||Object.values(record.files).some(value=>!digest(value)))fail()
 const root=privateDirectory(join(catalog,record.root))
 for(const name of names)if(hash(readRegular(join(root,name)))!==record.files[name])fail()
 return {record,entry:{root,contract_file:'OUTCOME_CONTRACT.md',map_file:'OUTCOME_MAP.md',sessions_file:'OUTCOME_SESSIONS.md'}}
}

// Explicitly configured, private local catalog only. No provider or account
// membership is registered here. Unpublished attempt directories are invisible.
export function readCreatedProjectEntries(path){
 try{
  const catalog=privateDirectory(path),files=readdirSync(catalog).filter(name=>name.endsWith('.json')).sort()
  if(files.some(name=>!(/^[a-f0-9]{64}\.json$/).test(name)))fail()
  return files.map(name=>readEntry(catalog,name.slice(0,-5)).entry)
 }catch{fail()}
}

// All three dependencies are trusted host capabilities, never browser input.
// A renderer override is a host-only capability. The default preserves the
// verified snapshot; neither renderer invents a technical assessment.
export function createConfirmedPackagePublisher({catalog,confirmationRepository,renderPackage=renderConfirmedDestinationPackage,checkpoint=()=>{}}={}){
 if(typeof catalog!=='string'||typeof confirmationRepository?.readConfirmedCreation!=='function'||typeof renderPackage!=='function'||typeof checkpoint!=='function')fail()
 const result=projectId=>({projectId,state:'package_registered',completionAuthority:false,executionAuthority:false})
 return Object.freeze({async publish(scope){
  let attempt=null,published=false,root,owned={}
  const clean=()=>{
   if(!attempt)return
   privateDirectory(attempt)
   // Never recursively remove a directory: preserve any unexpected or altered
   // bytes, including files placed here after an interrupted attempt.
   if(readdirSync(attempt).some(name=>!Object.hasOwn(owned,name)))fail()
   for(const [name,content] of Object.entries(owned))if(!lstatSync(join(attempt,name)).isFile()||readRegular(join(attempt,name))!==content)fail()
   for(const name of Object.keys(owned))unlinkSync(join(attempt,name))
   rmdirSync(attempt);attempt=null
  }
  try{
   if(!scope||!['workspaceId','accountRef'].every(key=>typeof scope[key]==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(scope[key]))||!uuid(scope.draftId)||!uuid(scope.requestId))fail()
   scope=Object.freeze({workspaceId:scope.workspaceId,accountRef:scope.accountRef,draftId:scope.draftId,requestId:scope.requestId})
   // No disk mutation until the repository revalidates the actual confirmation.
   const input=await confirmationRepository.readConfirmedCreation(scope)
   if(!input||input.draftId!==scope.draftId||input.requestId!==scope.requestId||input.completionAuthority!==false||input.executionAuthority!==false
    ||!digest(input.reviewDigest)||!digest(input.evidenceDigest)||typeof input.serializedSnapshot!=='string'||Buffer.byteLength(input.serializedSnapshot)>8388608||hash(input.serializedSnapshot)!==input.reviewDigest)fail()
   root=privateDirectory(catalog)
   const key=hash(JSON.stringify([scope.workspaceId,scope.accountRef,scope.draftId])),projectId=`destination-${key}`,target=join(root,`${key}.json`)
   const same=()=>{const prior=readEntry(root,key).record;if(prior.reviewDigest!==input.reviewDigest||prior.evidenceDigest!==input.evidenceDigest)fail();return result(projectId)}
   if(existsSync(target))return same()
   const files=await renderPackage({projectId,serializedSnapshot:input.serializedSnapshot})
   if(!exact(files,names)||names.some(name=>typeof files[name]!=='string'||Buffer.byteLength(files[name])>8388608))fail()
   // Existing intake privacy rules apply before any candidate bytes reach disk.
   for(const content of Object.values(files))validateDestinationPackageText(content)
   if(/^\s*-\s*\[[xX]\]/m.test(files['GATES.md']))fail()
   const map=YAML.parse(files['OUTCOME_MAP.md'].match(/```yaml\s*\n([\s\S]*?)\n```/)?.[1]??'')
   const stages=map?.phases?.flatMap(phase=>phase.scopes.flatMap(scope=>scope.stages))
   if(!Array.isArray(stages)||!stages.length||stages.some(stage=>stage.gates_file!=='GATES.md'
    ||['implementation_state','test_state','evidence_closure_state','independent_qa_state','cherry_acceptance_state','release_state'].some(key=>Object.hasOwn(stage,key)&&!['not_started','pending','unknown','unverified'].includes(stage[key]))))fail()
   attempt=mkdtempSync(join(root,'.package-'))
   for(const name of names){durableWrite(join(attempt,name),files[name]);owned[name]=files[name]}
   await checkpoint('files_written')
   const model=buildPackageModel({root:attempt,contractFile:'OUTCOME_CONTRACT.md',mapFile:'OUTCOME_MAP.md',sessionsFile:'OUTCOME_SESSIONS.md',gitEvidence:{state:'unknown'}})
   if(model.status!=='valid'||model.project.id!==projectId||model.now.status!=='unbound'||model.bindings.length!==1||model.bindings[0].role!=='planner')fail()
   if(model.phases.some(phase=>phase.scopes.some(scope=>scope.stages.some(stage=>stage.gate.total===0||stage.gate.closed!==0))))fail()
   await checkpoint('package_validated')
   const record={schemaVersion:1,key,projectId,reviewDigest:input.reviewDigest,evidenceDigest:input.evidenceDigest,root:basename(attempt),files:Object.fromEntries(names.map(name=>[name,hash(files[name])])),completionAuthority:false,executionAuthority:false}
   const serialized=JSON.stringify(record)
   durableWrite(join(attempt,'registration'),serialized);owned.registration=serialized;syncDirectory(attempt)
   await checkpoint('before_publish')
   for(const [name,content] of Object.entries(owned))if(readRegular(join(attempt,name))!==content)fail()
   // link is an exclusive, atomic publication. It never overwrites a concurrent
   // winner. Both names are on the same explicitly configured local filesystem.
   // An I/O error may have an ambiguous outcome. From this point preserve the
   // files unless EEXIST definitively identifies a different winning link.
   published=true
   try{linkSync(join(attempt,'registration'),target)}catch(error){if(error.code!=='EEXIST')throw error;published=false;clean();return same()}
   syncDirectory(root)
   await checkpoint('published')
   return same()
  }catch{
   if(published)throw Error('creation_publication_unknown')
   try{clean()}catch{throw Error('creation_rollback_unknown')}
   fail()
  }
 }})
}
