import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {verifyWorkStageReceipt as verify,verifyStoredWorkStageReceipt as stored} from './outcome-work-stage-receipt.mjs'
import {mkdtempSync,realpathSync,writeFileSync,chmodSync,unlinkSync,symlinkSync,linkSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
const scope={projectId:'outcome',workId:'work-a',runId:'run-a',candidateCommit:'a'.repeat(40),candidateTree:'b'.repeat(40),stage:'qa_verifying',verificationMode:'same-session verification'}
const receipt=()=>({schemaVersion:1,...scope,checks:[{id:'regression',outcome:'pass',evidenceDigest:'c'.repeat(64)}]})
const expected=text=>JSON.stringify({...scope,digest:createHash('sha256').update(text).digest('hex'),requiredChecks:['regression']})
test('exact receipt matches content but grants neither execution nor completion',()=>{
  const text=JSON.stringify(receipt())
  assert.deepEqual(verify(text,expected(text)),{matches:true,executionAuthority:false,completionAuthority:false})
  assert.equal(verify(`${text} `,expected(text)).matches,false)
})
test('self-consistent hashes cannot conceal scope candidate stage mode or check failures',()=>{
  const mutations=[r=>r.projectId='other',r=>r.workId='other',r=>r.runId='other',r=>r.candidateCommit='d'.repeat(40),r=>r.candidateTree='d'.repeat(40),r=>r.stage='release_verifying',r=>r.verificationMode='independent verification',r=>r.checks[0].outcome='fail',r=>r.checks[0].evidenceDigest='invalid',r=>r.checks[0].id='unrequired',r=>r.checks.push(r.checks[0]),r=>r.checks=[],r=>r.executionAuthority=true,r=>r.checks[0].extra=true]
  for(const mutate of mutations){const value=receipt();mutate(value);const text=JSON.stringify(value);assert.equal(verify(text,expected(text)).matches,false)}
})
test('invalid empty duplicated or oversized expected policy never permits a receipt',()=>{
  const text=JSON.stringify(receipt())
  for(const checks of [[],['regression','regression'],[''],Array(129).fill('regression')]){
    const policy=JSON.parse(expected(text));policy.requiredChecks=checks;assert.equal(verify(text,JSON.stringify(policy)).matches,false)
  }
  for(const value of [null,{},'null','{','x'.repeat(65537)])assert.equal(verify(value,expected(text)).matches,false)
  assert.equal(verify(text,'null').matches,false)
  let accessed=false;assert.equal(verify({get text(){accessed=true}},expected(text)).matches,false);assert.equal(accessed,false)
})
test('stored receipt validates real bytes and rejects writable, altered, linked and missing files',()=>{
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'outcome-stage-receipt-')))
  chmodSync(directory,0o700)
  const text=JSON.stringify(receipt()),policy=expected(text),file=join(directory,`${JSON.parse(policy).digest}.json`)
  try{
    writeFileSync(file,text,{mode:0o400})
    assert.equal(stored(directory,policy).matches,true)
    chmodSync(file,0o600);assert.equal(stored(directory,policy).matches,false)
    writeFileSync(file,`${text} `);chmodSync(file,0o400);assert.equal(stored(directory,policy).matches,false)
    unlinkSync(file);writeFileSync(file,text,{mode:0o400})
    linkSync(file,join(directory,'second'));assert.equal(stored(directory,policy).matches,false);unlinkSync(join(directory,'second'))
    unlinkSync(file);symlinkSync('missing',file);assert.equal(stored(directory,policy).matches,false);unlinkSync(file)
    assert.equal(stored(directory,policy).matches,false)
    writeFileSync(file,text,{mode:0o400});chmodSync(directory,0o755);assert.equal(stored(directory,policy).matches,false)
    assert.deepEqual(stored(directory,'{}'),{matches:false,executionAuthority:false,completionAuthority:false})
  }finally{rmSync(directory,{recursive:true,force:true})}
})
