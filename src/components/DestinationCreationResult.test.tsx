import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {creationResultNotice,DestinationCreationResult} from './DestinationCreationResult'
import type {StoredDiscovery,DestinationConfirmation} from '../lib/api'
it('creation notices distinguish registration from missing evidence without claiming execution or a use link',()=>{
 expect(creationResultNotice('registered')).toBe('프로젝트 등록이 확인되었습니다.')
 expect(creationResultNotice('missing')).toContain('실행 중인지 추정하지 않습니다')
 expect(creationResultNotice('unavailable')).toContain('재생성하지 않고 조회만')
 const markup=renderToStaticMarkup(<DestinationCreationResult discovery={{} as StoredDiscovery} receipt={{} as DestinationConfirmation}/>)
 expect(markup).toContain('aria-busy="true"');expect(markup).toContain('disabled=""');expect(markup).toContain('최종 수용을 뜻하지 않습니다')
 expect(markup).not.toContain('href=')
})
