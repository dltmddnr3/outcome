export const discoveryDomains:readonly ['system_boundary','infrastructure','data_contract','api_events','external_feasibility','security','performance_cost','verification']
export type DiscoveryDomain=typeof discoveryDomains[number]
export type DiscoveryCoverage={domain:DiscoveryDomain;state:'unreviewed'|'requirements_present'|'proposed_default'|'technical_due_diligence'|'contract_ready'|'non_goal';evidenceRefs:string[]}
export type DiscoveryQuestion={id:string;gapId:string;domain:DiscoveryDomain;prompt:string;choices:string[];recommendation:string;reason:string;material:boolean}
export type DiscoveryAnswer={questionId:string;gapId:string;value:string}
export function planDestinationQuestions(input:{coverage:DiscoveryCoverage[];questions:DiscoveryQuestion[];answers:DiscoveryAnswer[];askedQuestionIds:string[]}):{
 batch:DiscoveryQuestion[];defaults:DiscoveryQuestion[];unresolvedDomains:DiscoveryDomain[];remainingBudget:number;
 state:'coverage_ready_for_review'|'questions_pending'|'question_limit_reached'|'analysis_required';completionAuthority:false;confirmedDestination:false
}
