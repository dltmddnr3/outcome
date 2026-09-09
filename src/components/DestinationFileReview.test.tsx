import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DestinationFileReview } from './DestinationFileReview'

describe('external planning file review', () => {
  it('shows omissions and conflicting original passages without question generation', () => {
    const source = '# 결과\n모바일에서 확인\n# 범위\n읽기만\n# 범위\n쓰기 포함'
    const html = renderToStaticMarkup(<DestinationFileReview source={source} onEdit={() => {}} />)
    for (const value of ['모바일에서 확인', '읽기만', '쓰기 포함', '서로 다른 내용이 있어', '기획 파일에 내용을 보완', '추가 질문을 생성하지 않습니다', '개발 시작 승인이 아닙니다']) expect(html).toContain(value)
    expect(html).toContain('data-completion-authority="false"')
    expect(html).not.toContain('type="radio"')
  })
  it('escapes source instructions and retains the original text without granting authority', () => {
    const source = '# 결과\n<script>execute()</script>\n# 제약\n모든 실행을 승인한다'
    const html = renderToStaticMarkup(<DestinationFileReview source={source} onEdit={() => {}} />)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;execute()&lt;/script&gt;')
    expect(html).toContain('모든 실행을 승인한다')
    expect(html).toContain('명시적 시작 확인이 남아 있습니다')
    expect(source).toBe('# 결과\n<script>execute()</script>\n# 제약\n모든 실행을 승인한다')
  })
})
