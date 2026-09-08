import {afterEach,expect,it,vi} from 'vitest'
import {activeDestinationDraftId,fetchPrivateWorkspace,requestDestinationDraft,requestDestinationAnalysis,requestDestinationDiscovery,requestDestinationQuestions,requestDestinationQuestionRun,type StoredDestinationDraft,type StoredDiscovery} from './api'
afterEach(()=>vi.unstubAllGlobals())
const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제'},unknowns:[]} as const
const draft={draftId:activeDestinationDraftId,revision:1,document,state:'draft',completionAuthority:false} as unknown as StoredDestinationDraft
const discovery:StoredDiscovery={draftId:activeDestinationDraftId,revision:1,intakeRevision:1,contextDigest:'a'.repeat(64),context:{source:'',mode:'guided_200q',seedAnswers:{problem:'문제'},unknowns:[],answers:[],askedQuestionIds:[],revision:1},state:'draft',completionAuthority:false}
const workspace=()=>new Response('{"workspace":{}}',{headers:{'x-outcome-destination-csrf':'bound-csrf'}})
it('uses current same-session credentials at every destination endpoint, not the workspace token',async()=>{
 let current='fresh-1'
 const refresh=vi.fn(async()=>current)
 const fetcher=vi.fn(async(url:string,init?:RequestInit)=>{
  if(url==='/api/private/workspace')return workspace()
  expect((init?.headers as Record<string,string>).authorization).toBe(`Bearer ${current}`)
  return new Response('{"error":"observed_current_credential"}',{status:503})
 })
 vi.stubGlobal('fetch',fetcher)
 await fetchPrivateWorkspace('expired-at-submit',refresh)
 const actions=[()=>requestDestinationDraft({expectedRevision:0,document:draft.document}),()=>requestDestinationAnalysis(draft,'00000000-0000-4000-8000-000000000002',true),()=>requestDestinationDiscovery(draft),()=>requestDestinationQuestions(discovery),()=>requestDestinationQuestionRun(discovery,true)]
 for(const [i,action] of actions.entries()){current=`fresh-${i}`;await expect(action()).rejects.toThrow('observed_current_credential')}
 expect(refresh).toHaveBeenCalledTimes(5)
 expect(fetcher).toHaveBeenCalledTimes(6)
})
it.each(['null','throws'])('does not fall back to the cached token when refresh %s',async mode=>{
 const fetcher=vi.fn(async()=>workspace());vi.stubGlobal('fetch',fetcher)
 await fetchPrivateWorkspace('old-owner-token',async()=>{if(mode==='throws')throw Error('private-provider-detail');return null})
 await expect(requestDestinationDraft({expectedRevision:0,document:draft.document})).rejects.toThrow('destination_session_unavailable')
 expect(fetcher).toHaveBeenCalledTimes(1)
})
it('rejects an in-flight refresh after workspace identity changed before any destination request',async()=>{
 let finish!:(v:string)=>void
 const fetcher=vi.fn(async()=>workspace());vi.stubGlobal('fetch',fetcher)
 await fetchPrivateWorkspace('owner-one',()=>new Promise(resolve=>{finish=resolve}))
 const pending=requestDestinationDraft({expectedRevision:0,document:draft.document})
 await fetchPrivateWorkspace('owner-two')
 finish('old-session-refreshed')
 await expect(pending).rejects.toThrow('destination_identity_changed')
 expect(fetcher).toHaveBeenCalledTimes(2)
})
it('does not resend a mutation after a refreshed credential still receives an unknown failure',async()=>{
 const fetcher=vi.fn(async(url:string)=>url==='/api/private/workspace'?workspace():new Response('{"error":"unknown_outcome"}',{status:503}));vi.stubGlobal('fetch',fetcher)
 const refresh=vi.fn(async()=>'fresh-token')
 await fetchPrivateWorkspace('old-token',refresh)
 await expect(requestDestinationDraft({expectedRevision:0,document:draft.document})).rejects.toThrow('unknown_outcome')
 expect(fetcher).toHaveBeenCalledTimes(2);expect(refresh).toHaveBeenCalledTimes(1)
})
