import { describe, expect, it } from 'vitest'
import { analyzeDestinationBrief, createDestinationReview, destinationQuestions, destinationRequestId, extractBriefAnswers, unansweredDestinationQuestions } from './destination-discovery'

const completeAnswers = Object.fromEntries(destinationQuestions.map((question) => [question.id, question.choices[0]]))

describe('Phase 5 destination discovery contract', () => {
  it('uses Korean question copy without rewriting previously saved answers', () => {
    for (const question of destinationQuestions) {
      const visible = [question.label, question.prompt, question.why, ...question.choices].join(' ')
      expect(visible).not.toMatch(/Destination|Production|QA|Release|pin|fail-closed|MVP/)
    }
    const original = { ...completeAnswers, scope: '문서 분석 → 빈칸 질문 → Destination 확인', acceptance: '후보·QA·Release 검증이 하나의 불변 pin을 가리킨다' }
    const review = createDestinationReview(original)
    expect(review.scope).toBe(original.scope)
    expect(review.acceptance).toBe(original.acceptance)
  })
  it('reads Markdown heading bodies without matching unrelated word prefixes', () => {
    expect(extractBriefAnswers('## 문제\n작업이 끊긴다\n다음 단계가 없다\n## 대상 사용자\nCherry\n## 부록\n참고 사항')).toEqual({problem:'작업이 끊긴다\n다음 단계가 없다',targetUser:'Cherry'})
    expect(extractBriefAnswers('문제점은 미정\nusername: admin\nscopeful: no')).toEqual({})
  })
  it('keeps conflicting duplicate answers open and ignores code examples', () => {
    expect(extractBriefAnswers('문제: 첫 문제\n문제: 다른 문제')).toEqual({})
    expect(extractBriefAnswers('문제: 같은 문제\n문제: 같은 문제')).toEqual({problem:'같은 문제'})
    expect(extractBriefAnswers('```md\n문제: 예시 내용\n```\n대상 사용자: Cherry')).toEqual({targetUser:'Cherry'})
  })
  it('preserves exact source lines and cannot erase a conflict with a third answer', () => {
    const value = analyzeDestinationBrief('문제: 첫 문제\n문제: 다른 문제\n문제: 첫 문제\n대상 사용자: Cherry')
    expect(value.conflicts).toEqual(['problem'])
    expect(value.answers).toEqual({targetUser:'Cherry'})
    expect(value.evidence.map(item => [item.field,item.startLine,item.endLine])).toEqual([['problem',1,1],['problem',2,2],['problem',3,3],['targetUser',4,4]])
    expect(unansweredDestinationQuestions(value.answers).map(item => item.id)).toContain('problem')
  })
  it('does not absorb unrelated labeled metadata into the preceding answer', () => {
    expect(extractBriefAnswers('- Outcome: understandable progress\n- Acceptance authority: Cherry\n- Package name: OUTCOME')).toEqual({outcome:'understandable progress'})
  })
  it('keeps guided discovery adaptive and below the 200 question ceiling', () => {
    expect(destinationQuestions).toHaveLength(8)
    expect(destinationQuestions.length).toBeLessThanOrEqual(200)
    expect(unansweredDestinationQuestions({})).toHaveLength(8)
    expect(unansweredDestinationQuestions({ problem: 'known' })).toHaveLength(7)
  })

  it('extracts only source-grounded brief lines and asks only remaining gaps', () => {
    const answers = extractBriefAnswers('# 문제: 작업이 끊긴다\n- 대상 사용자: Cherry\n## 원하는 결과 — 하나의 채널에서 완결')
    expect(answers).toEqual({ problem: '작업이 끊긴다', targetUser: 'Cherry', outcome: '하나의 채널에서 완결' })
    expect(unansweredDestinationQuestions(answers).map((item) => item.id)).not.toContain('problem')
    expect(unansweredDestinationQuestions(answers)).toHaveLength(5)
  })

  it('rejects oversized source text without reflecting it', () => {
    expect(() => extractBriefAnswers('x'.repeat(65_537))).toThrow('payload_too_large')
  })

  it('blocks review while a material gap remains', () => {
    const { problem: _problem, ...incomplete } = completeAnswers
    expect(() => createDestinationReview(incomplete)).toThrow('material_gaps_remain')
  })

  it('converges both paths on one non-authoritative review and stable idempotency key', () => {
    const review = createDestinationReview(completeAnswers)
    expect(review.residualUnknowns).toContain('기술·실행 가능성 및 문서 의미 검증 미완료')
    expect(createDestinationReview(completeAnswers, ['운영 책임 확인 필요']).residualUnknowns).toContain('운영 책임 확인 필요')
    expect(createDestinationReview(completeAnswers, []).residualUnknowns.length).toBeGreaterThan(0)
    expect(Object.keys(review)).toEqual(['schemaVersion', 'problem', 'targetUser', 'outcome', 'scope', 'nonGoals', 'constraints', 'acceptance', 'failureRecovery', 'residualUnknowns', 'confirmation'])
    expect(review.confirmation).toEqual({ state: 'unconfirmed', authority: false })
    expect(destinationRequestId(review)).toBe(destinationRequestId(createDestinationReview({ ...completeAnswers })))
  })
})
