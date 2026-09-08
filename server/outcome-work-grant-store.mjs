import {createHash} from 'node:crypto'
import {verifyWorkExecutionGrant} from './outcome-work-execution-grant.mjs'

const digest=s=>createHash('sha256').update(s).digest('hex')
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)
const fail=()=>{throw new Error('execution_grant_unavailable')}

// Explicit local storage port. A trusted caller owns a protected connection,
// authenticates ownerRef and obtains explicit approval before record/revoke.
// Storage alone is not authorization, dependencies, or execution activation.
export function createWorkGrantStore(db){
  const transaction=fn=>{
    let begun=false
    try{db.exec('BEGIN IMMEDIATE');begun=true;const r=fn();db.exec('COMMIT');return r}
    catch{if(begun)try{db.exec('ROLLBACK')}catch{};fail()}
  }
  transaction(()=>db.exec(`CREATE TABLE IF NOT EXISTS outcome_execution_grants (
    digest TEXT PRIMARY KEY, grant_json TEXT NOT NULL, owner_ref TEXT NOT NULL,
    revoked_at INTEGER
  ) STRICT`))
  const load=(ref,owner)=>{
    if(!sha(ref)||!sha(owner))fail()
    const row=db.prepare('SELECT * FROM outcome_execution_grants WHERE digest=?').get(ref)
    if(!row||row.owner_ref!==owner||digest(row.grant_json)!==ref)fail()
    const g=JSON.parse(row.grant_json)
    if(g.ownerRef!==owner||!(row.revoked_at===null||Number.isSafeInteger(row.revoked_at)&&row.revoked_at>=0))fail()
    return row
  }
  return Object.freeze({
    record(grantJson,ownerRef,now){return transaction(()=>{
      if(typeof grantJson!=='string'||Buffer.byteLength(grantJson)>8192||!sha(ownerRef))fail()
      const g=JSON.parse(grantJson),ref=digest(grantJson)
      const {schemaVersion,allowedStages,issuedAt,expiresAt,...identity}=g??{}
      const expected=JSON.stringify({...identity,ownerRef,authorityRef:ref,action:allowedStages?.[0],status:'active'})
      if(!verifyWorkExecutionGrant(grantJson,expected,now).matches)fail()
      db.prepare('INSERT OR IGNORE INTO outcome_execution_grants VALUES (?,?,?,NULL)').run(ref,grantJson,ownerRef)
      const row=load(ref,ownerRef)
      return Object.freeze({authorityRef:ref,status:row.revoked_at===null?'active':'revoked',completionAuthority:false})
    })},
    revoke(ref,ownerRef,now){return transaction(()=>{
      if(!Number.isSafeInteger(now)||now<0)fail()
      const row=load(ref,ownerRef)
      if(now<JSON.parse(row.grant_json).issuedAt)fail()
      db.prepare('UPDATE outcome_execution_grants SET revoked_at=? WHERE digest=? AND revoked_at IS NULL').run(now,ref)
      if(load(ref,ownerRef).revoked_at===null)fail()
      return Object.freeze({status:'revoked',completionAuthority:false})
    })},
    read(ref,currentOwnerRef){return transaction(()=>{
      const row=load(ref,currentOwnerRef)
      return JSON.stringify({grantJson:row.grant_json,ownerRef:currentOwnerRef,status:row.revoked_at===null?'active':'revoked'})
    })},
  })
}
