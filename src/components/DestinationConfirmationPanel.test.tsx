import {expect,it} from 'vitest'
import {destinationConfirmationFailureNotice} from './DestinationConfirmationPanel'
it('maps readiness blockers to distinct owner actions without leaking arbitrary errors',()=>{
 const notices=['intake_incomplete','residual_unknowns','issued_answers_missing','question_receipt_missing','coverage_or_material_gap','verification_pending'].map(code=>destinationConfirmationFailureNotice(Error(`destination_confirmation_${code}`)))
 expect(new Set(notices).size).toBe(6)
 for(const notice of notices)expect(notice).toContain('확정 요청은 보내지 않았습니다')
 expect(notices[1]).toContain('목록만 지우면 안 됩니다')
 expect(notices[3]).toContain('저장된 답변을 유지')
 for(const error of [Error('/private/secret token'),Error('__proto__'),null,{message:'destination_confirmation_intake_incomplete'}]){
  const notice=destinationConfirmationFailureNotice(error)
  expect(notice).toContain('결과를 확인하지 못했습니다');expect(notice).not.toContain('secret');expect(notice).not.toContain('__proto__')
 }
})
