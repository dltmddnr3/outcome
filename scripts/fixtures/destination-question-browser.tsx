import React from 'react'
import {createRoot} from 'react-dom/client'
import {DestinationQuestionBatch} from '../../src/components/DestinationQuestionBatch'
import {discoveryContextDigest,type DiscoveryContext} from '../../src/lib/destination-question-receipt'
import {activeDestinationDraftId,fetchPrivateWorkspace,requestDestinationDiscovery,type StoredDestinationDraft} from '../../src/lib/api'
import '../../src/styles.css'
import '../../src/components/DestinationStudio.css'
const context:DiscoveryContext={source:'',mode:'guided_200q',seedAnswers:{problem:'문제'},unknowns:['검증 필요'],revision:0,answers:[],askedQuestionIds:[]}
const intake:StoredDestinationDraft={draftId:activeDestinationDraftId,revision:1,document:{schemaVersion:1,mode:context.mode,source:context.source,answers:context.seedAnswers,unknowns:context.unknowns},state:'draft',completionAuthority:false}
const questions=[{id:'q-1',gapId:'owner',domain:'system_boundary',prompt:'누가 결과를 확인하나요?',choices:['소유자','내부 팀'],recommendation:'소유자',reason:'사용 주체를 명확히 합니다.',material:true},{id:'q-2',gapId:'recovery',domain:'verification',prompt:'실패 시 어떤 상태를 유지하나요?',choices:['기존 상태','중단 후 확인'],recommendation:'기존 상태',reason:'복구 기준을 정합니다.',material:true}]
if(new URLSearchParams(location.search).has('private'))questions[0].prompt='password=synthetic-test-value'
const receipt=JSON.stringify({schemaVersion:1,contextDigest:new URLSearchParams(location.search).has('stale')?'wrong':await discoveryContextDigest(context),coverage:[],questions,completionAuthority:false})
await fetchPrivateWorkspace()
createRoot(document.getElementById('root')!).render(<main className="destination-studio"><DestinationQuestionBatch context={context} receipt={receipt} onSave={async next=>{await requestDestinationDiscovery(intake,{expectedRevision:0,context:next})}}/></main>)
