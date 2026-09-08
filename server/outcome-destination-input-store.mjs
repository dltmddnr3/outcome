import {constants} from 'node:fs'
import {lstat,realpath,open} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'
import {destinationDocumentDigest} from './outcome-destination-analysis-source.mjs'
const fail=()=>{throw Error('destination_input_unavailable')}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const validInput=input=>{
 const keys=['requestId','draftId','draftRevision','documentDigest','serializedDocument','purpose','executionAuthority']
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!==keys.sort().join(','))fail()
 for(const key of ['requestId','draftId'])if(typeof input[key]!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input[key]))fail()
 if(input.purpose!=='destination_analysis_only'||input.executionAuthority!==false||!Number.isSafeInteger(input.draftRevision)||input.draftRevision<1||destinationDocumentDigest(parseDestinationDraft(input.serializedDocument))!==input.documentDigest)fail()
 return input
}
export function createDestinationInputStore({directory,scopeKey}={}) {
 if(typeof directory!=='string'||resolve(directory)!==directory||typeof scopeKey!=='string'||! /^[a-f0-9]{64}$/.test(scopeKey))fail()
 const checkDirectory=async()=>{
  const stat=await lstat(directory)
  if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o777)!==0o700||stat.uid!==process.getuid()||await realpath(directory)!==directory)fail()
 }
 const read=async reference=>{
  await checkDirectory()
  if(typeof reference!=='string'||!/^analysis-[a-f0-9]{64}$/.test(reference))fail()
  const file=await open(join(directory,`${reference}.json`),constants.O_RDONLY|constants.O_NOFOLLOW)
  try{
   const stat=await file.stat()
   if(!stat.isFile()||(stat.mode&0o777)!==0o600||stat.uid!==process.getuid()||stat.nlink!==1||stat.size>524288)fail()
   const bytes=await file.readFile()
   if(`analysis-${digest(bytes)}`!==reference)fail()
   const bundle=JSON.parse(bytes.toString('utf8'))
   if(bundle.schemaVersion!==1||bundle.scopeKey!==scopeKey)fail()
   return validInput(bundle.input)
  }finally{await file.close()}
 }
 return Object.freeze({
  async read(reference){try{return await read(reference)}catch{fail()}},
  async publish(input){
   try{
    await checkDirectory();validInput(input)
    const bytes=Buffer.from(JSON.stringify({schemaVersion:1,scopeKey,input}))
    if(bytes.length>524288)fail()
    const reference=`analysis-${digest(bytes)}`
    let file
    try{file=await open(join(directory,`${reference}.json`),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600)}catch(error){if(error.code!=='EEXIST')throw error}
    if(file)try{await file.writeFile(bytes);await file.sync()}finally{await file.close()}
    const verified=await read(reference)
    return {state:'ready',reference,requestId:verified.requestId,draftRevision:verified.draftRevision,documentDigest:verified.documentDigest}
   }catch{fail()}
  },
 })
}
