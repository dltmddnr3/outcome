import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DestinationStudio } from './DestinationStudio'

describe('destination renewal entry', () => {
  it('uses Korean product labels while preserving explicit confirmation and storage warnings', () => {
    const html = renderToStaticMarkup(<DestinationStudio open onClose={() => {}} fileBased={false} />)
    for (const text of ['목적지 설정', '원하는 결과부터 정합니다', '질문으로 시작', '기획서에서 빈칸 찾기', '새로고침하면 사라집니다', '목적지를 확정하기 전에는 프로젝트나 작업을 만들지 않습니다.']) expect(html).toContain(text)
    expect(html).toContain('aria-label="목적지 설정 닫기"')
    expect(html).toContain('data-completion-authority="false"')
    expect(html).not.toContain('Phase 5')
    expect(html).not.toContain('Destination')
    expect(html).not.toContain('Planner')
    expect(html).toContain('<details class="destination-studio__analysis-tools">')
    expect(html).toContain('저장한 기획서를 플래너와 검토하기')
    expect(html).toContain('분석 결과 확인')
  })
  it('defaults to external file intake without internal planning questions', () => {
    const html = renderToStaticMarkup(<DestinationStudio open onClose={() => {}} />)
    expect(html).toContain('기획 파일로 시작')
    expect(html).not.toContain('질문으로 시작')
    expect(html).not.toContain('기획서에서 빈칸 찾기')
    expect(html).toContain('data-completion-authority="false"')
  })
})
