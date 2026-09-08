import {afterEach,expect,it,vi} from 'vitest'
import {activeDestinationDraftId,captureDestinationReviewBinding,fetchPrivateWorkspace,requestPreviousDestinationDiscovery,requestDestinationDiscovery,requestDestinationQuestions,requestDestinationQuestionRun,requestDestinationDecisionReview,type StoredDestinationDraft,type StoredDiscovery} from './api'
import {discoveryContextDigest,type DiscoveryContext} from './destination-question-receipt'
afterEach(()=>vi.unstubAllGlobals())
const intake:StoredDestinationDraft={draftId:activeDestinationDraftId,revision:1,document:{schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제'},unknowns:['검증 필요']},state:'draft',completionAuthority:false}
const context:DiscoveryContext={source:'',mode:'guided_200q',seedAnswers:{problem:'문제'},unknowns:['검증 필요'],revision:1,answers:[{questionId:'q-1',gapId:'gap-1',value:'소유자'}],askedQuestionIds:['q-1']}
const row=async()=>({draftId:activeDestinationDraftId,revision:1,intakeRevision:1,context,contextDigest:await discoveryContextDigest(context),state:'draft',completionAuthority:false})
const workspace=()=>new Response('{"workspace":{}}',{headers:{'x-outcome-destination-csrf':'synthetic-discovery'}})
it('keeps old discovery read-only and does not weaken strict current loading',async()=>{
 const stored=await row(),current={...intake,revision:2,document:{...intake.document,answers:{problem:'changed'}}}
 const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({discovery:stored,completionAuthority:false}))))
 vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner')
 await expect(requestDestinationDiscovery(current)).rejects.toThrow('discovery_response_invalid')
 expect(await requestPreviousDestinationDiscovery(current)).toEqual({previous:stored,readOnly:true})
 expect(mock.mock.calls.slice(1).every(([,options])=>options.method==='GET')).toBe(true)
 for(const invalid of [{...stored,intakeRevision:3},{...stored,contextDigest:'forged'},{...stored,completionAuthority:true}]){
  mock.mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({discovery:invalid,completionAuthority:false}))))
  await expect(requestPreviousDestinationDiscovery(current)).rejects.toThrow('discovery_response_invalid')
 }
})
it('cancels a prepared discovery update before dispatch if the review closes during credential refresh',async()=>{
 let release!:(v:string)=>void,started!:()=>void
 const entered=new Promise<void>(resolve=>{started=resolve})
 const mock=vi.fn().mockImplementation(()=>Promise.resolve(workspace()))
 vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner',()=>new Promise<string>(resolve=>{release=resolve;started()}))
 const controller=new AbortController(),pending=requestDestinationDiscovery(intake,{expectedRevision:0,context:{...context,answers:[],askedQuestionIds:[]}},controller.signal)
 await entered;controller.abort();release('owner')
 await expect(pending).rejects.toThrow();expect(mock).toHaveBeenCalledTimes(1)
})
it('reads exact current decision pairs without accepting changed values, source revision or authority',async()=>{
 const stored={...await row(),revision:2,context:{...context,revision:2}} as StoredDiscovery
 stored.contextDigest=await discoveryContextDigest(stored.context)
 const valid={contextDigest:stored.contextDigest,contextRevision:2,intakeRevision:1,decisions:[{...context.answers[0],prompt:'누가 확인하나요?',sourceContextRevision:1}],sourceVerification:'required',completionAuthority:false}
 for(const [review,pass] of [[valid,true],[{...valid,contextRevision:1},false],[{...valid,intakeRevision:2},false],[{...valid,completionAuthority:true},false],[{...valid,decisions:[]},false],[{...valid,decisions:[{...valid.decisions[0],value:'forged'}]},false],[{...valid,decisions:[{...valid.decisions[0],sourceContextRevision:2}]},false]] as const){
  const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({review,completionAuthority:false}))))
  vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner',async()=>'fresh-owner')
  if(pass)expect(await requestDestinationDecisionReview(stored)).toEqual(valid)
  else await expect(requestDestinationDecisionReview(stored)).rejects.toThrow('discovery_response_invalid')
  expect(mock).toHaveBeenCalledTimes(2);expect(mock.mock.calls[1][0]).toContain('/review/');expect(mock.mock.calls[1][1].headers.authorization).toBe('Bearer fresh-owner')
 }
})
it('discards delayed decision review after owner changes',async()=>{
 const stored=await row() as StoredDiscovery;let finish!:(r:Response)=>void,started!:()=>void
 const issued=new Promise<void>(resolve=>{started=resolve})
 vi.stubGlobal('fetch',vi.fn().mockImplementation((url:string)=>url.endsWith('/workspace')?Promise.resolve(workspace()):new Promise<Response>(resolve=>{finish=resolve;started()})))
 await fetchPrivateWorkspace('owner-one');const pending=requestDestinationDecisionReview(stored);await issued;await fetchPrivateWorkspace('owner-two')
 finish(new Response(JSON.stringify({review:null,completionAuthority:false})))
 await expect(pending).rejects.toThrow('destination_identity_changed')
})
it('sends one reference-only question request and rejects mismatched status without retry',async()=>{
 const stored=await row() as StoredDiscovery
 const status={requestId:activeDestinationDraftId,draftId:activeDestinationDraftId,contextDigest:stored.contextDigest,contextRevision:1,state:'queued',completionAuthority:false}
 for(const [value,valid] of [[status,true],[{...status,contextDigest:'0'.repeat(64)},false],[{...status,contextRevision:2},false],[{...status,state:'accepted'},false],[{...status,completionAuthority:true},false],[{...status,executionAuthority:true},false],[null,false]] as const){
  const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({questionRequest:value,completionAuthority:false}))))
  vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner')
  if(valid)expect(await requestDestinationQuestionRun(stored,true)).toEqual(status)
  else await expect(requestDestinationQuestionRun(stored,true)).rejects.toThrow('discovery_response_invalid')
  expect(mock).toHaveBeenCalledTimes(2)
  const [url,options]=mock.mock.calls[1]
  expect(url).toContain('/question-requests/');expect(options.method).toBe('POST')
  expect(JSON.parse(options.body)).toEqual({contextDigest:stored.contextDigest})
  expect(options.headers).toMatchObject({'x-outcome-csrf':'synthetic-discovery'})
 }
})
it('does not attach a delayed question request status to a changed owner',async()=>{
 const stored=await row() as StoredDiscovery;let finish!:(response:Response)=>void,started!:()=>void
 const issued=new Promise<void>(resolve=>{started=resolve})
 vi.stubGlobal('fetch',vi.fn().mockImplementation((url:string)=>url.endsWith('/workspace')?Promise.resolve(workspace()):new Promise<Response>(resolve=>{finish=resolve;started()})))
 await fetchPrivateWorkspace('owner-one')
 const pending=requestDestinationQuestionRun(stored);await issued;await fetchPrivateWorkspace('owner-two')
 finish(new Response(JSON.stringify({questionRequest:null,completionAuthority:false})))
 await expect(pending).rejects.toThrow('destination_identity_changed')
})
it('invalidates the visible review capability when workspace identity refreshes',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(workspace())))
 await fetchPrivateWorkspace('owner-one');const current=captureDestinationReviewBinding();expect(current()).toBe(true)
 await fetchPrivateWorkspace('owner-two');expect(current()).toBe(false);expect(captureDestinationReviewBinding()()).toBe(true)
})
it('reads only questions linked to the captured discovery context',async()=>{
 const stored=await row() as StoredDiscovery
 const receipt=JSON.stringify({schemaVersion:1,contextDigest:stored.contextDigest,coverage:[],questions:[],completionAuthority:false})
 const questions={contextDigest:stored.contextDigest,contextRevision:1,receipt,sourceVerification:'required',completionAuthority:false}
 for(const [value,valid] of [[questions,true],[{...questions,contextRevision:2},false],[{...questions,completionAuthority:true},false]] as const){
  const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({questions:value,completionAuthority:false}))))
  vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner')
  if(valid)expect(await requestDestinationQuestions(stored)).toBe(receipt)
  else await expect(requestDestinationQuestions(stored)).rejects.toThrow('discovery_response_invalid')
  expect(mock).toHaveBeenCalledTimes(2)
 }
})
it('sends one explicit scoped save and validates the exact unconfirmed context',async()=>{
 const stored=await row()
 const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({discovery:stored,completionAuthority:false}))))
 vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner')
 expect(await requestDestinationDiscovery(intake,{expectedRevision:0,context})).toEqual(stored)
 const [url,options]=mock.mock.calls[1]
 expect(url).toContain('/destination/discovery/');expect(options.method).toBe('PUT')
 expect(Object.keys(JSON.parse(options.body)).sort()).toEqual(['context','expectedRevision','intakeRevision','requestId'])
 expect(JSON.parse(JSON.parse(options.body).context)).toEqual(context)
 expect(mock).toHaveBeenCalledTimes(2)
 await expect(requestDestinationDiscovery(intake,{expectedRevision:0,context:{...context,source:'different'}})).rejects.toThrow()
 expect(mock).toHaveBeenCalledTimes(2)
})
it('rejects forged authority, stale intake and digest without retry',async()=>{
 const stored=await row()
 for(const changed of [{...stored,completionAuthority:true},{...stored,intakeRevision:2},{...stored,contextDigest:'wrong'}]){
  const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(url.endsWith('/workspace')?workspace():new Response(JSON.stringify({discovery:changed,completionAuthority:false}))))
  vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner')
  await expect(requestDestinationDiscovery(intake)).rejects.toThrow('discovery_response_invalid')
  expect(mock).toHaveBeenCalledTimes(2)
 }
})
it('discards a delayed discovery response after owner identity changes',async()=>{
 const stored=await row();let finish!:(response:Response)=>void,started!:()=>void
 const issued=new Promise<void>(resolve=>{started=resolve})
 vi.stubGlobal('fetch',vi.fn().mockImplementation((url:string)=>url.endsWith('/workspace')?Promise.resolve(workspace()):new Promise<Response>(resolve=>{finish=resolve;started()})))
 await fetchPrivateWorkspace('owner-one')
 const pending=requestDestinationDiscovery(intake);await issued
 await fetchPrivateWorkspace('owner-two')
 finish(new Response(JSON.stringify({discovery:stored,completionAuthority:false})))
 await expect(pending).rejects.toThrow('destination_identity_changed')
})
