import {destinationSourceSha256} from './destination-analysis'
import {destinationQuestions,type DestinationAnswers,type DestinationMode} from './destination-discovery'
import {planDestinationQuestions,type DiscoveryCoverage,type DiscoveryQuestion,type DiscoveryAnswer} from './destination-question-plan'

export type DiscoveryContext={source:string;mode:DestinationMode;seedAnswers:DestinationAnswers;unknowns:string[];answers:DiscoveryAnswer[];askedQuestionIds:string[];revision:number}
const fail=():never=>{throw Error('discovery_receipt_invalid')}
const exact=(value:unknown,keys:string[]):Record<string,unknown>=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))return fail()
 return value as Record<string,unknown>
}
export async function discoveryContextDigest(context:DiscoveryContext) {
 if(typeof context.source!=='string'||!Number.isSafeInteger(context.revision)||context.revision<0||!Array.isArray(context.answers)||!Array.isArray(context.askedQuestionIds))return fail()
 if(!['guided_200q','brief_gap'].includes(context.mode)||!context.seedAnswers||typeof context.seedAnswers!=='object'||Array.isArray(context.seedAnswers)||!Array.isArray(context.unknowns)||context.unknowns.length>200||context.unknowns.some(v=>typeof v!=='string'||!v.trim()||v.length>2000))return fail()
 const fields=new Set<string>(destinationQuestions.map(q=>q.id))
 const seeds=Object.entries(context.seedAnswers)
 if(seeds.some(([key,value])=>!fields.has(key)||typeof value!=='string'||!value.trim()||new TextEncoder().encode(value).length>16000))return fail()
 planDestinationQuestions({coverage:[],questions:[],answers:context.answers,askedQuestionIds:context.askedQuestionIds})
 const sourceDigest=await destinationSourceSha256(context.source)
 const bytes=new TextEncoder().encode(JSON.stringify([sourceDigest,context.mode,seeds.sort(([a],[b])=>a.localeCompare(b)),context.unknowns,context.revision,context.answers.map(a=>[a.questionId,a.gapId,a.value]).sort(([a],[b])=>a.localeCompare(b)),[...context.askedQuestionIds].sort()]))
 // Source upload remains 64KB. Accumulated 200 answers and unresolved items
 // have separate bounded fields and must all participate in the context hash.
 // 8MiB also accommodates JSON escaping at those existing field limits.
 if(bytes.length>8*1024*1024)return fail()
 const digest=await crypto.subtle.digest('SHA-256',bytes)
 return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
}

// This validates linkage and shape, never the truth of Planner-provided evidence.
export async function validateDiscoveryQuestionReceipt(context:DiscoveryContext,serialized:string) {
 if(typeof serialized!=='string'||new TextEncoder().encode(serialized).length>131072)return fail()
 let value:unknown
 try{value=JSON.parse(serialized)}catch{return fail()}
 const receipt=exact(value,['schemaVersion','contextDigest','coverage','questions','completionAuthority'])
 if(receipt.schemaVersion!==1||receipt.completionAuthority!==false||receipt.contextDigest!==await discoveryContextDigest(context)||!Array.isArray(receipt.coverage)||!Array.isArray(receipt.questions))return fail()
 for(const entry of receipt.coverage)exact(entry,['domain','state','evidenceRefs'])
 for(const entry of receipt.questions)exact(entry,['id','gapId','domain','prompt','choices','recommendation','reason','material'])
 let plan
 try{plan=planDestinationQuestions({coverage:receipt.coverage as DiscoveryCoverage[],questions:receipt.questions as DiscoveryQuestion[],answers:context.answers,askedQuestionIds:context.askedQuestionIds})}catch{return fail()}
 return {contextDigest:receipt.contextDigest as string,plan,sourceVerification:'required' as const,completionAuthority:false as const}
}
