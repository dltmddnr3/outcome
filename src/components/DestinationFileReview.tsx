import { analyzeDestinationBrief, destinationQuestions } from '../lib/destination-discovery'

export function DestinationFileReview({ source, onEdit }: { source: string; onEdit: () => void }) {
  const analysis = analyzeDestinationBrief(source)
  return <section className="destination-studio__review" aria-label="기획 파일 검토" data-completion-authority="false">
    <h3>개발할 내용을 확인해 주세요</h3>
    <p>제목으로 구분된 원문을 보여드립니다. 내용의 타당성이나 개발 준비가 확인된 것은 아닙니다.</p>
    <dl>{destinationQuestions.map(({ id, label }) => <div key={id}>
      <dt>{label}</dt>
      <dd>{analysis.conflicts.includes(id) ? '서로 다른 내용이 있어 확인이 필요해요.' : analysis.answers[id] || '기획 파일에 내용을 보완해 주세요.'}
        {analysis.evidence.filter(item => item.field === id).map((item, index) => <blockquote key={index}>{item.value}<small>원문 {item.startLine}–{item.endLine}행</small></blockquote>)}
      </dd>
    </div>)}</dl>
    <p>누락되거나 충돌하는 내용은 별도 기획 세션에서 보완한 뒤 다시 넣어 주세요. 여기서는 추가 질문을 생성하지 않습니다.</p>
    <button type="button" onClick={onEdit}>기획 파일 다시 넣기</button>
    <p>파일 검토와 초안 저장은 개발 시작 승인이 아닙니다. 현재 버전의 내용 검증과 명시적 시작 확인이 남아 있습니다.</p>
  </section>
}
