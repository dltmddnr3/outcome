import {afterEach,expect,it,vi} from 'vitest'
import {activeDestinationDraftId,captureDestinationReviewBinding,fetchPrivateWorkspace,requestDestinationDiscovery,requestDestinationQuestions,type StoredDestinationDraft,type StoredDiscovery} from './api'
import {discoveryContextDigest,type DiscoveryContext} from './destination-question-receipt'
afterEach(()=>vi.unstubAllGlobals())
const intake:StoredDestinationDraft={draftId:activeDestinationDraftId,revision:1,document:{schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제'},unknowns:['검증 필요']},state:'draft',completionAuthority:false}
const context:DiscoveryContext={source:'',mode:'guided_200q',seedAnswers:{problem:'문제'},unknowns:['검증 필요'],revision:1,answers:[{questionId:'q-1',gapId:'gap-1',value:'소유자'}],askedQuestionIds:['q-1']}
const row=async()=>({draftId:activeDestinationDraftId,revision:1,intakeRevision:1,context,contextDigest:await discoveryContextDigest(context),state:'draft',completionAuthority:false})
const workspace=()=>new Response('{"workspace":{}}',{headers:{'x-outcome-destination-csrf':'synthetic-discovery'}})
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
