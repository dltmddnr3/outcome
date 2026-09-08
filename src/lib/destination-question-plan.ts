// Question 200 is a gap audit, not a fixed questionnaire or completion counter.
export const discoveryDomains = ['system_boundary','infrastructure','data_contract','api_events','external_feasibility','security','performance_cost','verification'] as const
export type DiscoveryDomain = typeof discoveryDomains[number]
export type DiscoveryCoverage = {domain:DiscoveryDomain;state:'unreviewed'|'requirements_present'|'proposed_default'|'technical_due_diligence'|'contract_ready'|'non_goal';evidenceRefs:string[]}
export type DiscoveryQuestion = {id:string;gapId:string;domain:DiscoveryDomain;prompt:string;choices:string[];recommendation:string;reason:string;material:boolean}
export type DiscoveryAnswer = {questionId:string;gapId:string;value:string}

const invalid=():never=>{throw new Error('discovery_plan_invalid')}
const text=(value:unknown,limit=4000):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=limit
const id=(value:unknown):value is string=>typeof value==='string'&&/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value)

export function planDestinationQuestions(input:{coverage:DiscoveryCoverage[];questions:DiscoveryQuestion[];answers:DiscoveryAnswer[];askedQuestionIds:string[]}) {
 const {coverage,questions,answers,askedQuestionIds}=input
 if(!Array.isArray(coverage)||!Array.isArray(questions)||!Array.isArray(answers)||!Array.isArray(askedQuestionIds)||questions.length>200||answers.length>200||askedQuestionIds.length>200)invalid()
 const domains=new Set<string>()
 for(const entry of coverage){
  if(!discoveryDomains.includes(entry.domain)||domains.has(entry.domain)||!['unreviewed','requirements_present','proposed_default','technical_due_diligence','contract_ready','non_goal'].includes(entry.state)||!Array.isArray(entry.evidenceRefs)||entry.evidenceRefs.length>50||entry.evidenceRefs.some(ref=>!text(ref,200)))invalid()
  domains.add(entry.domain)
 }
 const ids=new Set<string>(),questionGaps=new Set<string>()
 for(const question of questions){
  if(!id(question.id)||!id(question.gapId)||ids.has(question.id)||questionGaps.has(question.gapId)||!discoveryDomains.includes(question.domain)||!text(question.prompt)||!text(question.reason)||!Array.isArray(question.choices)||question.choices.length<2||question.choices.length>3||question.choices.some(choice=>!text(choice,1000))||new Set(question.choices).size!==question.choices.length||!question.choices.includes(question.recommendation)||typeof question.material!=='boolean')invalid()
  ids.add(question.id);questionGaps.add(question.gapId)
 }
 if(new Set(askedQuestionIds).size!==askedQuestionIds.length||askedQuestionIds.some(value=>!id(value)))invalid()
 const answeredQuestions=new Set<string>(),answeredGaps=new Set<string>()
 for(const answer of answers){
  if(!id(answer.questionId)||!id(answer.gapId)||!text(answer.value)||answeredQuestions.has(answer.questionId)||answeredGaps.has(answer.gapId)||!askedQuestionIds.includes(answer.questionId))invalid()
  const question=questions.find(item=>item.id===answer.questionId)
  if(question&&question.gapId!==answer.gapId)invalid()
  answeredQuestions.add(answer.questionId);answeredGaps.add(answer.gapId)
 }
 const unresolvedDomains=discoveryDomains.filter(domain=>{
  const entry=coverage.find(item=>item.domain===domain)
  return !entry||!['contract_ready','non_goal'].includes(entry.state)||entry.evidenceRefs.length===0
 })
 const pending=questions.filter(question=>question.material&&!answeredGaps.has(question.gapId)&&!answeredQuestions.has(question.id)&&unresolvedDomains.includes(question.domain))
 // Redisplay an unanswered issued question without spending another question slot.
 const active=pending.filter(question=>askedQuestionIds.includes(question.id))
 const remainingBudget=200-askedQuestionIds.length
 const fresh=pending.filter(question=>!askedQuestionIds.includes(question.id)).slice(0,remainingBudget)
 const batch=[...active,...fresh].slice(0,3)
 const defaults=questions.filter(question=>!question.material&&!answeredGaps.has(question.gapId)&&unresolvedDomains.includes(question.domain))
 return {
  batch,defaults,unresolvedDomains,remainingBudget,
  state:unresolvedDomains.length===0?'coverage_ready_for_review':batch.length?'questions_pending':remainingBudget===0?'question_limit_reached':'analysis_required',
  // References still require source verification and explicit owner review.
  completionAuthority:false as const,confirmedDestination:false as const,
 }
}
