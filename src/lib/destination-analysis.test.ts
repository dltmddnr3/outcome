import { expect, it } from 'vitest'
import { destinationSourceSha256, validateDestinationAnalysis } from './destination-analysis'

const source = '작업자가 여러 창을 오가느라 맥락을 놓칩니다.\n첫 사용자는 내부 운영자입니다.'
const proposal = { field: 'problem', value: '창 전환으로 인한 맥락 손실', startLine: 1, endLine: 1, quote: source.split('\n')[0] }
const payload = async (proposals: unknown[] = [proposal]) => JSON.stringify({schemaVersion:1,sourceSha256:await destinationSourceSha256(source),proposals})

it('accepts grounded free-form interpretation only as unconfirmed suggestion', async () => {
  const result = await validateDestinationAnalysis(source, await payload())
  expect(result.proposals[0].status).toBe('needs_confirmation')
  expect(result.confirmedAnswers).toEqual({})
  expect(result.executionAuthority).toBe(false)
  expect(result.gaps).not.toContain('problem')
  expect(result.gaps).toContain('targetUser')
})
it('rejects changed sources, invented citations, invalid spans and extra authority', async () => {
  await expect(validateDestinationAnalysis(source+'changed', await payload())).rejects.toThrow('analysis_unavailable')
  for (const change of [{quote:'invented'},{startLine:0},{endLine:3},{field:'unknown'},{executionAuthority:true},{value:'token=private'},{value:'sk-testsecret123456'}]) {
    await expect(validateDestinationAnalysis(source, await payload([{...proposal,...change}]))).rejects.toThrow('analysis_unavailable')
  }
})
it('duplicate claims remain conflicts instead of silently overwriting', async () => {
  const result = await validateDestinationAnalysis(source, await payload([proposal,{...proposal,value:'different interpretation'}]))
  expect(result.conflicts).toEqual(['problem'])
  expect(result.gaps).toContain('problem')
  expect(result.confirmedAnswers).toEqual({})
})
it('bounds malformed and oversized model output', async () => {
  for(const text of ['not json', JSON.stringify({schemaVersion:1}), 'x'.repeat(65537)]) {
    await expect(validateDestinationAnalysis(source,text)).rejects.toThrow('analysis_unavailable')
  }
  await expect(destinationSourceSha256('가'.repeat(22000))).rejects.toThrow('analysis_unavailable')
})
