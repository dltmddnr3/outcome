import {planDestinationQuestions} from '../src/lib/destination-question-policy.mjs'
import {parseDiscoveryContext,discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'
const fail=()=>{throw Error('discovery_question_receipt_invalid')}
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...keys].sort().join(','))fail()}
const privateSafe=text=>parseDestinationDraft(JSON.stringify({schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:text},unknowns:[]}))

// Internal ingestion after a verified Planner response; this is not provenance
// proof and must not be exposed as a browser-authorized receipt write endpoint.
export function validateDestinationQuestionReceipt({serializedContext,serializedReceipt}={}) {
 try{
  const context=parseDiscoveryContext(serializedContext)
  if(typeof serializedReceipt!=='string'||Buffer.byteLength(serializedReceipt)>131072)fail()
  const receipt=JSON.parse(serializedReceipt)
  exact(receipt,['schemaVersion','contextDigest','coverage','questions','completionAuthority'])
  if(receipt.schemaVersion!==1||receipt.completionAuthority!==false||receipt.contextDigest!==discoveryContextDigest(context)||!Array.isArray(receipt.coverage)||!Array.isArray(receipt.questions))fail()
  for(const entry of receipt.coverage){exact(entry,['domain','state','evidenceRefs']);if(!Array.isArray(entry.evidenceRefs))fail();for(const ref of entry.evidenceRefs)privateSafe(ref)}
  for(const question of receipt.questions){exact(question,['id','gapId','domain','prompt','choices','recommendation','reason','material']);if(!Array.isArray(question.choices))fail();for(const text of [question.prompt,question.reason,...question.choices])privateSafe(text)}
  const plan=planDestinationQuestions({...receipt,answers:context.answers,askedQuestionIds:context.askedQuestionIds})
  return {receipt,plan,sourceVerification:'required',completionAuthority:false}
 }catch{fail()}
}
