// Display-only translations of OUTCOME's built-in labels. Never rewrite stored
// source values or translate arbitrary project names/evidence by pattern.
const labels: Readonly<Record<string, string>> = {
  'Phase 1 · Local MVP': '1단계 · 기기에서 핵심 기능 검증',
  'Phase 2 · Account-scoped Project Service': '2단계 · 계정별 프로젝트 사용',
  'Phase 3 · Existing Session Operations': '3단계 · 기존 작업 세션 연결',
  'Phase 4 · In-OUTCOME Development': '4단계 · 아웃컴에서 개발 진행',
  'Phase 5 · Outcome-first Creation': '5단계 · 원하는 결과부터 프로젝트 만들기',
  'Documentation bootstrap': '기본 문서 준비',
  'Stable hosted shell': '서버에서 사용할 기본 화면 준비',
  'Codex adapter technical spike': '코덱스 연결 방식 검증',
  'Outcome Graph v2 live pilot': '결과 구조의 새 방식 시험 적용',
}

export function outcomeDisplayLabel(projectId: string, label: string): string {
  return projectId === 'outcome' && Object.hasOwn(labels, label) ? labels[label] : label
}
