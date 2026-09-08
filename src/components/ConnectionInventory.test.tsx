import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ConnectionInventory } from './ConnectionInventory'
it('closed connection disclosure exposes no connect controls or unsupported health claims', () => {
 const html = renderToStaticMarkup(<ConnectionInventory projectId="outcome" />)
 expect(html).toContain('연결 관리 · 읽기 전용')
 expect(html).toContain('연결 상태 확인 전')
 expect(html).toContain('data-completion-authority="false"')
 for (const absent of ['<button', '<input', '연결 성공', '접근 확인됨']) expect(html).not.toContain(absent)
})
