import {createHash} from 'node:crypto'
import {types} from 'node:util'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'
const fail=()=>{throw Error('destination_analysis_source_unavailable')}
const canonicalDocument=document=>{
 const parsed=parseDestinationDraft(JSON.stringify(document))
 return {schemaVersion:parsed.schemaVersion,mode:parsed.mode,source:parsed.source,answers:parsed.answers,unknowns:parsed.unknowns}
}
export const destinationDocumentDigest=document=>createHash('sha256').update(JSON.stringify(canonicalDocument(document))).digest('hex')

// Internal read-only resolver. Identity scope must come from verified server authority.
// Returned content is private analysis input, never a public receipt or ordinary chat body.
export function createDestinationAnalysisSourceResolver({repository}={}) {
 if(!repository||typeof repository.load!=='function')fail()
 return async input=>{
  try {
   const keys=['workspaceId','accountRef','draftId','revision','documentDigest']
   if(!input||typeof input!=='object'||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype||Reflect.ownKeys(input).length!==keys.length)fail()
   const descriptors=Object.getOwnPropertyDescriptors(input)
   if(keys.some(key=>!Object.hasOwn(descriptors[key]??{},'value')))fail()
   const value=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]))
   if(!Number.isSafeInteger(value.revision)||value.revision<1||typeof value.documentDigest!=='string'||! /^[a-f0-9]{64}$/.test(value.documentDigest))fail()
   const row=await repository.load({workspaceId:value.workspaceId,accountRef:value.accountRef,draftId:value.draftId})
   if(!row||row.draftId!==value.draftId||row.revision!==value.revision||row.state!=='draft'||row.completionAuthority!==false)fail()
   const document=canonicalDocument(row.document)
   if(destinationDocumentDigest(document)!==value.documentDigest)fail()
   // Detached serialization pins the content even if the underlying draft is later edited.
   return Object.freeze({schemaVersion:1,draftId:row.draftId,revision:row.revision,documentDigest:value.documentDigest,serializedDocument:JSON.stringify(document),completionAuthority:false})
  } catch {return fail()}
 }
}
