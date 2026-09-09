import {useEffect,useState} from 'react'
import {captureDestinationReviewBinding,destinationDraftDigest,type DestinationReviewTarget,type StoredDestinationDraft} from '../lib/api'
import {DestinationConfirmationPanel} from './DestinationConfirmationPanel'

export function DestinationFileConfirmation({draft}:{draft:StoredDestinationDraft}){
 const [target,setTarget]=useState<{draft:StoredDestinationDraft;value:DestinationReviewTarget}|null>(null)
 const [failed,setFailed]=useState(false)
 useEffect(()=>{
  let current=true
  const identityCurrent=captureDestinationReviewBinding()
  setTarget(null);setFailed(false)
  void (async()=>{
   try{
    if(draft.document.mode!=='file_import')throw Error('not_file')
    const digest=await destinationDraftDigest(draft.document)
    if(current&&identityCurrent())setTarget({draft,value:{draftId:draft.draftId,intakeRevision:draft.revision,revision:draft.revision,contextDigest:digest}})
    else if(current)setFailed(true)
   }catch{if(current)setFailed(true)}
  })()
  return()=>{current=false}
 },[draft])
 if(!target||target.draft!==draft)return <p role="status">{failed?'현재 파일 버전을 확인하지 못했습니다. 저장된 파일을 다시 불러와 주세요.':'저장된 파일 버전을 확인하고 있습니다.'}</p>
 return <DestinationConfirmationPanel key={`${target.value.revision}:${target.value.contextDigest}`} discovery={target.value} fileBased/>
}
