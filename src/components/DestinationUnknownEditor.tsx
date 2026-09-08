import {useState} from 'react'
import {sensitiveContentHint} from './PlannerConversation'

export function DestinationUnknownEditor({unknowns,disabled,onChange}:{unknowns:readonly string[];disabled:boolean;onChange:(value:string[])=>void}) {
  const [editing,setEditing]=useState(false)
  const [text,setText]=useState(unknowns.join('\n'))
  const [acknowledged,setAcknowledged]=useState(false)
  const next=text.split(/\r?\n/).map(value=>value.trim()).filter(Boolean)
  const removed=unknowns.filter(value=>!next.includes(value))
  const normalized=text.normalize('NFKC')
  const error=next.length>200?'항목은 최대 200개입니다.':next.some(value=>new TextEncoder().encode(value).length>2000)?'각 항목은 UTF-8 기준 2000바이트 이하여야 합니다.':new Set(next).size!==next.length?'중복 항목을 정리해 주세요.':sensitiveContentHint(text)||/\/(?:Users|home|private\/tmp|tmp)\/|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)?'민감한 값이나 로컬 경로를 제거해 주세요.':null
  const changed=JSON.stringify(next)!==JSON.stringify(unknowns)
  const cancel=()=>{setEditing(false);setText(unknowns.join('\n'));setAcknowledged(false)}
  return <section className="destination-studio__unknowns" aria-label="초안의 미상 목록 편집">
    <strong>초안의 미상 목록</strong>
    <p>목록 편집은 기술 검증 통과나 Destination 확정이 아닙니다. 변경한 목록은 초안 저장을 눌러야 서버에 반영됩니다.</p>
    {!editing?<><span>{unknowns.length?`${unknowns.length}개 항목`:'등록된 항목 없음 · 검증 완료를 뜻하지 않습니다.'}</span><button type="button" disabled={disabled} onClick={()=>setEditing(true)}>미상 목록 수정</button></>:<>
      <label><span>미상 항목 · 한 줄에 하나</span><textarea rows={5} value={text} disabled={disabled} onChange={event=>{setText(event.currentTarget.value);setAcknowledged(false)}} /></label>
      <div><strong>변경 전</strong>{unknowns.length?<ul>{unknowns.map((value,index)=><li key={index}>{value}</li>)}</ul>:<p>등록된 항목 없음</p>}</div>
      {error?<p role="alert">{error}</p>:<div><strong>변경 후</strong>{next.length?<ul>{next.map((value,index)=><li key={index}>{value}</li>)}</ul>:<p>등록된 항목 없음 · 기술 검증은 별도로 필요합니다.</p>}</div>}
      {removed.length>0&&<fieldset disabled={disabled}><legend>삭제되는 항목 {removed.length}개</legend><label><input type="checkbox" checked={acknowledged} onChange={event=>setAcknowledged(event.currentTarget.checked)} /><span>목록에서 제외할 항목을 검토했습니다. 검증 통과 처리가 아님을 확인합니다.</span></label></fieldset>}
      <div className="destination-studio__actions"><button type="button" disabled={disabled} onClick={cancel}>목록 수정 취소</button><button type="button" disabled={disabled||!!error||!changed||(removed.length>0&&!acknowledged)} onClick={()=>{if(!disabled&&!error&&changed&&(!removed.length||acknowledged)){onChange(next);cancel()}}}>목록 변경 적용 · 아직 미저장</button></div>
    </>}
  </section>
}
