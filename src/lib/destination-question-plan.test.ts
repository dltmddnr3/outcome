import {expect,it} from 'vitest'
import {discoveryDomains,planDestinationQuestions,type DiscoveryQuestion,type DiscoveryCoverage} from './destination-question-plan'
const question=(n:number):DiscoveryQuestion=>({id:`q-${n}`,gapId:`gap-${n}`,domain:'system_boundary',prompt:`결정 ${n}`,choices:['A','B'],recommendation:'A',reason:'사용자 결과에 영향을 줍니다',material:true})
const base=()=>({coverage:[] as DiscoveryCoverage[],questions:[1,2,3,4].map(question),answers:[],askedQuestionIds:[]})
it('asks at most three material gaps and does not treat missing domain audit as complete',()=>{
 const result=planDestinationQuestions(base())
 expect(result.batch.map(q=>q.id)).toEqual(['q-1','q-2','q-3'])
 expect(result.unresolvedDomains).toEqual(discoveryDomains)
 expect(result.completionAuthority).toBe(false);expect(result.confirmedDestination).toBe(false)
})
it('excludes answered semantic gaps even when question wording and id change',()=>{
 const input={...base(),askedQuestionIds:['old-question'],answers:[{questionId:'old-question',gapId:'gap-1',value:'기존 결정'}]}
 expect(planDestinationQuestions(input).batch.map(q=>q.id)).toEqual(['q-2','q-3','q-4'])
})
it('holds the 200 question ceiling while preserving an already issued unanswered question',()=>{
 const askedQuestionIds=Array.from({length:200},(_,n)=>`q-${n+1}`)
 expect(planDestinationQuestions({...base(),askedQuestionIds}).remainingBudget).toBe(0)
 const blocked=planDestinationQuestions({...base(),questions:[question(201)],askedQuestionIds})
 expect(blocked.batch).toEqual([]);expect(blocked.state).toBe('question_limit_reached')
})
it('separates reversible defaults and refuses bare requirements or ungrounded completion',()=>{
 const input=base();input.questions=[{...question(1),material:false}]
 const result=planDestinationQuestions(input)
 expect(result.batch).toEqual([]);expect(result.defaults).toHaveLength(1);expect(result.state).toBe('analysis_required')
 const coverage=discoveryDomains.map(domain=>({domain,state:'contract_ready' as const,evidenceRefs:[]}))
 expect(planDestinationQuestions({...base(),coverage}).unresolvedDomains).toHaveLength(8)
 const ready=planDestinationQuestions({...base(),coverage:coverage.map(item=>({...item,evidenceRefs:['contract-pin']}))})
 expect(ready.state).toBe('coverage_ready_for_review');expect(ready.confirmedDestination).toBe(false)
})
it('rejects duplicate gaps and unsupported recommendations instead of silently selecting',()=>{
 expect(()=>planDestinationQuestions({...base(),questions:[question(1),{...question(2),gapId:'gap-1'}]})).toThrow('discovery_plan_invalid')
 expect(()=>planDestinationQuestions({...base(),questions:[{...question(1),recommendation:'not-a-choice'}]})).toThrow('discovery_plan_invalid')
})
