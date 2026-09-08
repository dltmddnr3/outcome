import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { WorkspaceManagement } from './OutcomeDashboard'
it('keeps public management disabled and enables only bounded connection navigation', () => {
 const publicHtml = renderToStaticMarkup(<WorkspaceManagement />)
 expect(publicHtml).toContain('disabled="" aria-label="연결 관리 · 준비 중"')
 const privateHtml = renderToStaticMarkup(<WorkspaceManagement onConnections={() => {}} />)
 expect(privateHtml).toContain('aria-label="연결 관리 · 읽기 전용"')
 expect(privateHtml).not.toContain('disabled="" aria-label="연결 관리')
 expect(privateHtml).toContain('disabled="" aria-label="보관함 · 준비 중"')
})
