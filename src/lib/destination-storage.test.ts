import {afterEach,expect,it,vi} from 'vitest'
import {activeDestinationDraftId,fetchPrivateWorkspace,requestDestinationDraft,validateStoredDestinationDraft,type DestinationDraftDocument} from './api'
afterEach(()=>vi.unstubAllGlobals())
const document:DestinationDraftDocument={schemaVersion:1,mode:'brief_gap',source:'기획서',answers:{problem:'문제'},unknowns:['기술 검증 필요']}
const row={draftId:activeDestinationDraftId,revision:1,document,state:'draft',completionAuthority:false}
it('validates unconfirmed owner draft responses and rejects authority or malformed fields',()=>{
 expect(validateStoredDestinationDraft({draft:row,completionAuthority:false})).toEqual(row)
 for(const draft of [{...row,completionAuthority:true},{...row,revision:0},{...row,draftId:'other'},{...row,document:{...document,confirmed:true}},{...row,document:{...document,answers:{owner:'forged'}}}])expect(()=>validateStoredDestinationDraft({draft,completionAuthority:false})).toThrow('destination_response_invalid')
})
it('binds draft requests separately from decisions and sends one explicit save',async()=>{
 const mock=vi.fn().mockImplementation((url:string)=>Promise.resolve(new Response(JSON.stringify(url.endsWith('/workspace')?{workspace:{}}:{draft:row,completionAuthority:false}),{headers:{'x-outcome-destination-csrf':'synthetic-draft-csrf'}})))
 vi.stubGlobal('fetch',mock)
 await fetchPrivateWorkspace('synthetic-token')
 expect(await requestDestinationDraft({expectedRevision:0,document})).toEqual(row)
 const [url,init]=mock.mock.calls[1]
 expect(url).toContain(activeDestinationDraftId);expect(init.method).toBe('PUT')
 expect(init.headers.authorization).toBe('Bearer synthetic-token')
 expect(JSON.parse(init.body)).toMatchObject({expectedRevision:0,document:JSON.stringify(document)})
 expect(mock).toHaveBeenCalledTimes(2)
})
it('holds delayed draft responses after a workspace identity refresh',async()=>{
 let finish!:(r:Response)=>void
 vi.stubGlobal('fetch',vi.fn().mockImplementation((url:string)=>url.endsWith('/workspace')?Promise.resolve(new Response('{"workspace":{}}',{headers:{'x-outcome-destination-csrf':'synthetic'}})):new Promise<Response>(resolve=>{finish=resolve})))
 await fetchPrivateWorkspace('owner-one')
 const pending=requestDestinationDraft()
 await fetchPrivateWorkspace('owner-two')
 finish(new Response(JSON.stringify({draft:row,completionAuthority:false})))
 await expect(pending).rejects.toThrow('destination_identity_changed')
})
