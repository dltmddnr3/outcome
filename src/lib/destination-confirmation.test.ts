import {afterEach,expect,it,vi} from 'vitest'
import {activeDestinationDraftId,fetchPrivateWorkspace,requestDestinationConfirmationReview,requestDestinationConfirmation,type StoredDiscovery} from './api'
afterEach(()=>vi.unstubAllGlobals())
const discovery:StoredDiscovery={draftId:activeDestinationDraftId,revision:2,intakeRevision:1,contextDigest:'a'.repeat(64),state:'draft',completionAuthority:false,context:{mode:'guided_200q',source:'',seedAnswers:{},unknowns:[],answers:[],askedQuestionIds:[],revision:2}}
const review={reviewDigest:'b'.repeat(64),intakeRevision:1,contextRevision:2,completionAuthority:false as const,executionAuthority:false as const}
const receipt={...review,requestId:activeDestinationDraftId,draftId:activeDestinationDraftId,state:'creation_requested' as const}
const json=(v:unknown)=>new Response(JSON.stringify(v))
const workspace=()=>new Response('{"workspace":{}}',{headers:{'x-outcome-destination-csrf':'synthetic'}})
async function setup(handler:(url:string,options:RequestInit)=>Promise<Response>|Response,refresh?:()=>Promise<string|null>){
 const mock=vi.fn((url:string,options:RequestInit)=>url.endsWith('/workspace')?Promise.resolve(workspace()):Promise.resolve(handler(url,options)))
 vi.stubGlobal('fetch',mock);await fetchPrivateWorkspace('owner',refresh);return mock
}
it('requires an exact minted review and sends one explicit confirmation with fresh credentials',async()=>{
 const refresh=vi.fn(async()=>'fresh-owner')
 const mock=await setup((url,options)=>url.includes('/confirmation-review/')?json({confirmationReview:review,completionAuthority:false}):json({confirmation:options.method==='POST'?receipt:null,completionAuthority:false}),refresh)
 expect(await requestDestinationConfirmation(discovery)).toBeNull()
 await expect(requestDestinationConfirmation(discovery,{...review})).rejects.toThrow('confirmation_review_changed')
 const prepared=await requestDestinationConfirmationReview(discovery)
 expect(Object.isFrozen(prepared)).toBe(true)
 expect(await requestDestinationConfirmation(discovery,prepared)).toEqual(receipt)
 await expect(requestDestinationConfirmation(discovery,prepared)).rejects.toThrow('confirmation_review_changed')
 const posts=mock.mock.calls.filter(([,options])=>options.method==='POST');expect(posts).toHaveLength(1)
 expect(JSON.parse(posts[0][1].body as string)).toEqual({requestId:expect.any(String),reviewDigest:review.reviewDigest,confirmed:true})
 expect(posts[0][1].headers).toMatchObject({authorization:'Bearer fresh-owner','x-outcome-csrf':'synthetic'})
 expect(refresh).toHaveBeenCalledTimes(3)
})
it('consumes an ambiguous attempt and recovers only with readback',async()=>{
 const mock=await setup((url,options)=>{if(url.includes('/confirmation-review/'))return json({confirmationReview:review,completionAuthority:false});if(options.method==='POST')throw Error('network');return json({confirmation:receipt,completionAuthority:false})})
 const prepared=await requestDestinationConfirmationReview(discovery)
 await expect(requestDestinationConfirmation(discovery,prepared)).rejects.toThrow()
 await expect(requestDestinationConfirmation(discovery,prepared)).rejects.toThrow('confirmation_review_changed')
 expect(await requestDestinationConfirmation(discovery)).toEqual(receipt)
 expect(mock.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(1)
})
it('rejects stale, extra-field, or authoritative review and confirmation responses',async()=>{
 for(const invalid of [{...review,intakeRevision:3},{...review,contextRevision:3},{...review,reviewDigest:'invalid'},{...review,executionAuthority:true},{...review,extra:'no'}]){
  await setup(()=>json({confirmationReview:invalid,completionAuthority:false}))
  await expect(requestDestinationConfirmationReview(discovery)).rejects.toThrow('confirmation_invalid')
 }
 for(const invalid of [{...receipt,draftId:'other'},{...receipt,contextRevision:3},{...receipt,completionAuthority:true},{...receipt,state:'created'},{...receipt,extra:'no'}]){
  await setup(()=>json({confirmation:invalid,completionAuthority:false}))
  await expect(requestDestinationConfirmation(discovery)).rejects.toThrow('confirmation_invalid')
 }
})
it('rejects changed context and owner before sending any POST',async()=>{
 const mock=await setup(()=>json({confirmationReview:review,completionAuthority:false}))
 const prepared=await requestDestinationConfirmationReview(discovery)
 await expect(requestDestinationConfirmation({...discovery,contextDigest:'c'.repeat(64)},prepared)).rejects.toThrow('confirmation_review_changed')
 await fetchPrivateWorkspace('other-owner')
 await expect(requestDestinationConfirmation(discovery,prepared)).rejects.toThrow('confirmation_review_changed')
 expect(mock.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(0)
})
it('aborts before POST if review UI unmounts while credentials refresh',async()=>{
 let release!:(v:string)=>void,started!:()=>void
 const entered=new Promise<void>(r=>{started=r});let block=false
 const mock=await setup(()=>json({confirmationReview:review,completionAuthority:false}),()=>block?new Promise<string>(r=>{release=r;started()}):Promise.resolve('owner'))
 const prepared=await requestDestinationConfirmationReview(discovery);block=true
 const controller=new AbortController(),pending=requestDestinationConfirmation(discovery,prepared,controller.signal)
 await entered;controller.abort();release('owner')
 await expect(pending).rejects.toThrow()
 expect(mock.mock.calls.filter(([,o])=>o.method==='POST')).toHaveLength(0)
})
it('discards delayed readback after identity changes',async()=>{
 let finish!:(v:Response)=>void,started!:()=>void
 const issued=new Promise<void>(r=>{started=r})
 await setup(()=>new Promise<Response>(r=>{finish=r;started()}))
 const pending=requestDestinationConfirmation(discovery);await issued;await fetchPrivateWorkspace('other-owner')
 finish(json({confirmation:receipt,completionAuthority:false}))
 await expect(pending).rejects.toThrow('destination_identity_changed')
})
