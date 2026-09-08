import { sensitiveContentHint } from './PlannerConversation'
import './DestinationStudio.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, FileText, Lightbulb, Sparkles, X } from 'lucide-react'
import { createDestinationReview, destinationQuestions, analyzeDestinationBrief, unansweredDestinationQuestions, type DestinationAnswers, type DestinationDomainId, type DestinationMode, type BriefEvidence } from '../lib/destination-discovery'

type DestinationStep = 'entry' | 'brief' | 'question' | 'review'

const reviewRows: ReadonlyArray<{ id: DestinationDomainId; label: string }> = destinationQuestions.map(({ id, label }) => ({ id, label }))

export function DestinationStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<DestinationStep>('entry')
  const [mode, setMode] = useState<DestinationMode>('guided_200q')
  const [briefText, setBriefText] = useState('')
  const [answers, setAnswers] = useState<DestinationAnswers>({})
  const [questionQueue, setQuestionQueue] = useState<DestinationDomainId[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [draftAnswer, setDraftAnswer] = useState('')
  const [sourceNote, setSourceNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<BriefEvidence[]>([])
  const [reading, setReading] = useState(false)
  const fileRead = useRef(0)
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const siblings = Array.from(dialogRef.current?.parentElement?.parentElement?.children ?? []).filter(item => item !== dialogRef.current?.parentElement) as HTMLElement[]
    const inertStates = siblings.map(item => item.inert)
    siblings.forEach(item => { item.inert = true })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])') ?? []).filter((item) => item.tabIndex >= 0)
      if (!items.length) return
      const first = items[0]; const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus())
    return () => { window.cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); siblings.forEach((item, index) => { item.inert = inertStates[index] }); previousFocus?.focus() }
  }, [open])

  const currentQuestion = destinationQuestions.find((item) => item.id === questionQueue[questionIndex]) ?? null
  const review = useMemo(() => { try { return createDestinationReview(answers) } catch { return null } }, [answers])

  if (!open) return null

  const beginQuestions = (nextMode: DestinationMode, seed: DestinationAnswers = {}) => {
    const queue = unansweredDestinationQuestions(seed).map((item) => item.id)
    setMode(nextMode); setAnswers(seed); setQuestionQueue(queue); setQuestionIndex(0); setDraftAnswer(''); setError(null)
    setStep(queue.length ? 'question' : 'review')
  }
  const analyzeBrief = () => {
    try {
      if (!briefText.trim() || sensitiveContentHint(briefText) || /\/(?:Users|home|private\/tmp|tmp)\//.test(briefText.normalize('NFKC'))) { setError('빈 문서 또는 민감한 값이 포함된 문서는 분석하지 않습니다. 내용을 확인해 주세요.'); return }
      const analysis = analyzeDestinationBrief(briefText)
      const extracted = analysis.answers
      setEvidence(analysis.evidence)
      const count = Object.keys(extracted).length
      setSourceNote(count ? `명시된 제목에서 ${count}개 항목을 찾았어요. 충돌 ${analysis.conflicts.length}개를 포함해 빈 항목을 묻습니다. 자유 서술의 의미 분석은 아직 연결되지 않았어요.` : '확정할 수 있는 항목이 없어 첫 질문부터 시작합니다.')
      beginQuestions('brief_gap', extracted)
    } catch (reason) {
      setError(reason instanceof Error && reason.message === 'payload_too_large' ? '문서는 64KB 이하의 텍스트나 Markdown만 사용할 수 있어요.' : '문서를 분석할 수 없어요.')
    }
  }
  const readLocalFile = async (file: File | undefined) => {
    const request = ++fileRead.current; setReading(false)
    if (!file) return
    const supported = /\.(?:md|markdown|txt)$/i.test(file.name) && file.size <= 65_536
    if (!supported) { setError('64KB 이하의 .md, .markdown, .txt 파일만 이 기기에서 읽을 수 있어요.'); return }
    setReading(true)
    try { const text = await file.text(); if (request !== fileRead.current) return; setBriefText(text); setError(null); setSourceNote('파일은 서버에 올리지 않고 이 화면에서만 읽었어요.') } catch { if (request === fileRead.current) setError('파일을 읽을 수 없어요.') } finally { if (request === fileRead.current) setReading(false) }
  }
  const commitAnswer = () => {
    if (!currentQuestion || !draftAnswer.trim()) return
    if (sensitiveContentHint(draftAnswer) || /\/(?:Users|home|private\/tmp|tmp)\//.test(draftAnswer.normalize('NFKC'))) { setError('민감한 값이나 로컬 경로는 답변에서 제거해 주세요.'); return }
    const nextAnswers = { ...answers, [currentQuestion.id]: draftAnswer.trim() }
    setAnswers(nextAnswers); setDraftAnswer(''); setError(null)
    if (questionIndex + 1 < questionQueue.length) { setQuestionIndex((value) => value + 1); setDraftAnswer(nextAnswers[questionQueue[questionIndex + 1]] ?? '') }
    else setStep('review')
  }
  const goBack = () => {
    if (questionIndex > 0) { const next = questionIndex - 1; setQuestionIndex(next); setDraftAnswer(answers[questionQueue[next]] ?? ''); return }
    setStep(mode === 'brief_gap' ? 'brief' : 'entry')
  }
  const editAnswer = (id: DestinationDomainId) => { setQuestionQueue([id]); setQuestionIndex(0); setDraftAnswer(answers[id] ?? ''); setStep('question') }

  return <div className="destination-studio__backdrop" data-destination-studio="open">
    <section ref={dialogRef} className="destination-studio" role="dialog" aria-modal="true" aria-labelledby="destination-studio-title" data-step={step} data-completion-authority="false">
      <header className="destination-studio__header">
        <div><small>Phase 5 · Destination 설정</small><h2 id="destination-studio-title">원하는 결과부터 정합니다</h2></div>
        <button ref={closeRef} type="button" aria-label="Destination 설정 닫기" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>

      {step === 'entry' && <div className="destination-studio__entry">
        <p>아이디어 또는 제목이 명시된 기획서에서 목적지 초안을 정리합니다. 초안은 이 화면의 메모리에만 있으며 새로고침하면 사라집니다.</p>
        <div className="destination-studio__entry-grid">
          <button type="button" onClick={() => { setSourceNote(null); setEvidence([]); beginQuestions('guided_200q') }}><Sparkles size={22} aria-hidden="true" /><span><strong>질문으로 시작</strong><small>기본 8개 항목을 정리합니다. 적응형 200Q는 연결 준비 중이에요.</small></span></button>
          <button type="button" onClick={() => { setMode('brief_gap'); setStep('brief'); setError(null) }}><FileText size={22} aria-hidden="true" /><span><strong>기획서에서 빈칸 찾기</strong><small>텍스트·Markdown을 이 기기에서만 읽고, 없거나 충돌하는 항목만 묻습니다.</small></span></button>
        </div>
        <p className="destination-studio__boundary"><Lightbulb size={16} aria-hidden="true" />Destination을 확인하기 전에는 프로젝트·역할 세션·Gate를 만들지 않아요.</p>
      </div>}

      {step === 'brief' && <div className="destination-studio__brief">
        <button className="destination-studio__back" type="button" onClick={() => setStep('entry')}><ArrowLeft size={17} aria-hidden="true" />시작 방식</button>
        <div><h3>기획서의 빈칸만 찾을게요</h3><p>헤더에 `문제`, `대상 사용자`, `결과`, `범위`, `비목표`, `제약`, `수용 기준`, `복구`를 쓰면 더 정확해요.</p></div>
        <label className="destination-studio__file"><span>이 기기에서 파일 읽기</span><input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={(event) => void readLocalFile(event.currentTarget.files?.[0])} /><small>서버 업로드 없음 · 64KB 이하</small></label>
        <label><span>또는 내용 붙여넣기</span><textarea rows={12} value={briefText} disabled={reading} onChange={(event) => setBriefText(event.currentTarget.value)} placeholder="텍스트 또는 Markdown 기획서" /></label>
        {sourceNote && <p className="destination-studio__note" role="status">{sourceNote}</p>}
        {error && <p className="destination-studio__error" role="alert">{error}</p>}
        <button className="destination-studio__primary" type="button" disabled={reading || !briefText.trim()} onClick={analyzeBrief}>{reading ? '파일 읽는 중' : '빈칸 찾기'}</button>
      </div>}

      {step === 'question' && currentQuestion && <div className="destination-studio__question">
        <div className="destination-studio__progress"><span>{mode === 'guided_200q' ? '기본 질문' : '기획서 빈칸'}</span><strong>{questionIndex + 1} / {questionQueue.length}</strong></div>
        {sourceNote && questionIndex === 0 && <p className="destination-studio__note" role="status">{sourceNote}</p>}
        <div className="destination-studio__prompt"><small>{currentQuestion.label}</small><h3>{currentQuestion.prompt}</h3><p>{currentQuestion.why}</p></div>
        <fieldset><legend>하나를 고르거나 직접 적어주세요</legend>{currentQuestion.choices.map((choice) => <label key={choice} data-selected={draftAnswer === choice ? 'true' : undefined}><input type="radio" name={`destination-${currentQuestion.id}`} checked={draftAnswer === choice} onChange={() => setDraftAnswer(choice)} /><span><strong>{choice}</strong></span></label>)}</fieldset>
        <label className="destination-studio__custom"><span>직접 입력</span><textarea rows={3} maxLength={4000} value={currentQuestion.choices.includes(draftAnswer as never) ? '' : draftAnswer} onChange={(event) => setDraftAnswer(event.currentTarget.value)} placeholder="선택지에 없는 내용을 적어주세요" /></label>
        {error && <p role="alert">{error}</p>}
        <div className="destination-studio__actions"><button type="button" onClick={goBack}><ArrowLeft size={17} aria-hidden="true" />이전</button><button className="destination-studio__primary" type="button" disabled={!draftAnswer.trim()} onClick={commitAnswer}>{questionIndex + 1 === questionQueue.length ? 'Destination 검토' : '다음 질문'}</button></div>
      </div>}

      {step === 'review' && review && <div className="destination-studio__review">
        <div className="destination-studio__review-intro"><span><Check size={18} aria-hidden="true" /></span><div><h3>Destination 초안을 확인해주세요</h3><p>두 시작 경로는 같은 형식으로 수렴합니다. 아직 프로젝트를 만들지 않았어요.</p></div></div>
        <dl>{reviewRows.map(({ id, label }) => <div key={id}><dt>{label}</dt><dd>{review[id]}{evidence.filter(item => item.field === id).map((item, index) => <small key={index}>문서 근거 {item.startLine}–{item.endLine}행 · 현재 답변은 직접 검토 필요</small>)}</dd><button type="button" onClick={() => editAnswer(id)}>{label} 수정</button></div>)}</dl>
        <section className="destination-studio__unknowns" aria-label="잔여 미상"><strong>잔여 미상</strong><span>기본 항목 입력됨 · 기술·실행 가능성 및 문서 의미 검증 미완료</span></section>
        <p className="destination-studio__boundary"><Lightbulb size={16} aria-hidden="true" />서버 저장·확정 요청이 아직 연결되지 않았습니다. 프로젝트·세션·Gate는 생성하지 않습니다.</p>
        <div className="destination-studio__actions"><button type="button" onClick={() => { const last = destinationQuestions[destinationQuestions.length - 1].id; editAnswer(last) }}><ArrowLeft size={17} aria-hidden="true" />답변 다시 보기</button><button className="destination-studio__primary" type="button" disabled>Destination 확정 · 연결 준비 중</button></div>
      </div>}

    </section>
  </div>
}
