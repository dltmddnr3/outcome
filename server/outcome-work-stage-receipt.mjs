import {createHash} from 'node:crypto'

const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(value)
const hash=(value,length)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${length}}$`).test(value)
const fields=['projectId','workId','runId','candidateCommit','candidateTree','stage','verificationMode']
const result=matches=>Object.freeze({matches,executionAuthority:false,completionAuthority:false})

// Only content integrity and coverage. The caller must establish issuer trust,
// current owner binding, dependencies and approval independently of this receipt.
export function verifyWorkStageReceipt(receiptJson,expectedJson){
  try{
    if(typeof receiptJson!=='string'||Buffer.byteLength(receiptJson)>65536
      ||typeof expectedJson!=='string'||Buffer.byteLength(expectedJson)>16384)return result(false)
    const expected=JSON.parse(expectedJson)
    if(!exact(expected,[...fields,'digest','requiredChecks'])||!hash(expected.digest,64)
      ||!fields.slice(0,3).every(key=>id(expected[key]))
      ||!hash(expected.candidateCommit,40)||!hash(expected.candidateTree,40)
      ||!['implementing','qa_verifying','release_verifying'].includes(expected.stage)
      ||!['same-session verification','independent verification'].includes(expected.verificationMode)
      ||!Array.isArray(expected.requiredChecks)||expected.requiredChecks.length<1||expected.requiredChecks.length>128
      ||!expected.requiredChecks.every(id)||new Set(expected.requiredChecks).size!==expected.requiredChecks.length)return result(false)
    if(createHash('sha256').update(receiptJson).digest('hex')!==expected.digest)return result(false)
    const receipt=JSON.parse(receiptJson)
    if(!exact(receipt,['schemaVersion',...fields,'checks'])||receipt.schemaVersion!==1
      ||!fields.every(key=>receipt[key]===expected[key])||!Array.isArray(receipt.checks)
      ||receipt.checks.length!==expected.requiredChecks.length)return result(false)
    const seen=new Set()
    for(const check of receipt.checks){
      if(!exact(check,['id','outcome','evidenceDigest'])||!expected.requiredChecks.includes(check.id)
        ||seen.has(check.id)||check.outcome!=='pass'||!hash(check.evidenceDigest,64))return result(false)
      seen.add(check.id)
    }
    return result(true)
  }catch{return result(false)}
}
