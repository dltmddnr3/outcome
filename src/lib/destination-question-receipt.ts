import {destinationSourceSha256} from './destination-analysis'
import {planDestinationQuestions,type DiscoveryCoverage,type DiscoveryQuestion,type DiscoveryAnswer} from './destination-question-plan'

export type DiscoveryContext={source:string;answers:DiscoveryAnswer[];askedQuestionIds:string[];revision:number}
const fail=():never=>{throw Error('discovery_receipt_invalid')}
const exact=(value:unknown,keys:string[]):Record<string,unknown>=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))return fail()
 return value as Record<string,unknown>
}
export async function discoveryContextDigest(context:DiscoveryContext) {
 if(typeof context.source!=='string'||!Number.isSafeInteger(context.revision)||context.revision<0||!Array.isArray(context.answers)||!Array.isArray(context.askedQuestionIds))return fail()
 planDestinationQuestions({coverage:[],questions:[],answers:context.answers,askedQuestionIds:context.askedQuestionIds})
 const sourceDigest=await destinationSourceSha256(context.source)
 return destinationSourceSha256(JSON.stringify([sourceDigest,context.revision,context.answers.map(a=>[a.questionId,a.gapId,a.value]).sort(([a],[b])=>a.localeCompare(b)),[...context.askedQuestionIds].sort()]))
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
