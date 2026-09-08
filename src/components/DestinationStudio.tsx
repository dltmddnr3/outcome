import { sensitiveContentHint } from './PlannerConversation'
import {DestinationDiscoveryPanel} from './DestinationDiscoveryPanel'
import {captureDestinationReviewBinding} from '../lib/api'
import './DestinationStudio.css'
import { privateDestinationStorageAvailable, requestDestinationDraft, requestDestinationAnalysis, destinationDraftDigest, destinationAnalysisRequestId, type DestinationDraftDocument, type StoredDestinationDraft, type DestinationAnalysisView } from '../lib/api'
import { destinationUnverifiedQuestions } from '../lib/destination-discovery'
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
  const [revision, setRevision] = useState(0)
  const [storageBusy, setStorageBusy] = useState(false)
  const storageLock = useRef(false)
  const [storageHold, setStorageHold] = useState(false)
  const [storageNotice, setStorageNotice] = useState<string | null>(null)
  const [unknowns, setUnknowns] = useState<string[]>([...destinationUnverifiedQuestions])
  const latestDraft = useRef('')
  const [savedDraft,setSavedDraft]=useState<StoredDestinationDraft|null>(null)
  const [savedDraftGeneration,setSavedDraftGeneration]=useState(0)
  const [analysis,setAnalysis]=useState<DestinationAnalysisView|null>(null)
  const [analysisRequest,setAnalysisRequest]=useState<{id:string;draft:StoredDestinationDraft;input:string}|null>(null)
  const [analysisBusy,setAnalysisBusy]=useState(false)
  const [analysisAttempted,setAnalysisAttempted]=useState(false)
  const analysisLock=useRef(false)
  const [analysisNotice,setAnalysisNotice]=useState<string|null>(null)

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
  const review = useMemo(() => { try { return createDestinationReview(answers, unknowns) } catch { return null } }, [answers, unknowns])
  const pendingAnswers = {...answers}
  if (step === 'question' && currentQuestion) {
    if (draftAnswer.trim()) pendingAnswers[currentQuestion.id] = draftAnswer.trim()
    else delete pendingAnswers[currentQuestion.id]
  }
  const storageDocument: DestinationDraftDocument = {schemaVersion:1,mode,source:briefText,answers:pendingAnswers,unknowns}
  latestDraft.current = JSON.stringify(storageDocument)
  const canonicalIntake=(doc:DestinationDraftDocument)=>JSON.stringify([doc.mode,doc.source,Object.entries(doc.answers).sort(([a],[b])=>a.localeCompare(b)),doc.unknowns])
  const savedIntakeMatches=savedDraft&&canonicalIntake(savedDraft.document)===canonicalIntake(storageDocument)
  const useStorage = async (save: boolean) => {
    if (storageLock.current || analysisLock.current) return
    if (save && (sensitiveContentHint(latestDraft.current) || /\/(?:Users|home|private\/tmp|tmp)\//.test(latestDraft.current.normalize('NFKC')))) {
      setStorageNotice('민감한 값이나 로컬 경로를 제거한 뒤 저장해 주세요. 서버에 전송하지 않았습니다.'); return
    }
    storageLock.current = true; setStorageBusy(true); setStorageNotice(null)
    const identityIsCurrent=captureDestinationReviewBinding()
    const captured = latestDraft.current
    try {
      const stored = await requestDestinationDraft(save ? {expectedRevision:revision,document:storageDocument} : undefined)
      const restoredAnalysisId=stored?await destinationAnalysisRequestId(stored):null
      if(!identityIsCurrent())throw Error('destination_identity_changed')
      setSavedDraftGeneration(value=>value+1)
      if (save) {
        setSavedDraft(stored)
        setAnalysis(null);setAnalysisAttempted(false);setAnalysisRequest({id:restoredAnalysisId!,draft:stored!,input:captured});setAnalysisNotice(null)
        setRevision(stored!.revision)
        setStorageNotice(`초안 버전 ${stored!.revision} 저장됨 · 저장 이후 수정한 내용은 다시 저장해야 합니다. 확정은 아닙니다.`)
      } else {
        if (latestDraft.current !== captured) throw new Error('draft_changed_during_load')
        if (!stored) { setSavedDraft(null);setAnalysisRequest(null);setAnalysis(null);setAnalysisAttempted(false);setRevision(0); setStorageHold(false); setStorageNotice('저장된 초안이 없습니다. 현재 입력은 유지합니다.'); return }
        const doc = stored.document
        setSavedDraft(stored)
        setAnalysis(null);setAnalysisAttempted(true);setAnalysisRequest({id:restoredAnalysisId!,draft:stored,input:JSON.stringify(doc)});setAnalysisNotice('기존 분석은 결과 확인으로 복구할 수 있습니다. 자동 전송하지 않습니다.')
        setMode(doc.mode); setBriefText(doc.source); setAnswers(doc.answers); setUnknowns(doc.unknowns)
        const queue = unansweredDestinationQuestions(doc.answers).map(item=>item.id)
        setQuestionQueue(queue); setQuestionIndex(0); setDraftAnswer(''); setStep(queue.length ? 'question' : 'review')
        setEvidence(doc.mode === 'brief_gap' ? analyzeDestinationBrief(doc.source).evidence : [])
        setSourceNote(null); setError(null); setRevision(stored.revision); setStorageHold(false)
        setStorageNotice(`초안 버전 ${stored.revision} 불러옴 · 미확정`)
      }
    } catch {
      if (save) setStorageHold(true)
      setStorageNotice(save ? '저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 자동 재시도하지 않습니다. 서버 초안을 확인한 뒤 계속해 주세요.' : '초안을 불러오지 못했습니다. 현재 입력은 유지됩니다.')
    } finally { storageLock.current=false; setStorageBusy(false) }
  }

  const analyzeSavedDraft=async(submit:boolean)=>{
    if(analysisLock.current)return
    analysisLock.current=true;setAnalysisBusy(true);setAnalysisNotice(null)
    try{
      const captured=latestDraft.current
      if(!savedDraft||await destinationDraftDigest(JSON.parse(captured))!==await destinationDraftDigest(savedDraft.document)||captured!==latestDraft.current)throw Error('unsaved')
      const request=submit?{id:await destinationAnalysisRequestId(savedDraft),draft:savedDraft,input:captured}:analysisRequest
      if(!request||submit&&analysisAttempted)throw Error('request_exists')
      if(submit){setAnalysisRequest(request);setAnalysisAttempted(true)}
      const value=await requestDestinationAnalysis(request.draft,request.id,submit)
      if(latestDraft.current!==request.input)throw Error('draft_changed')
      setAnalysis(value)
      if(!submit)setAnalysisAttempted(value!==null)
      setAnalysisNotice(value?({queued:'분석 요청 접수됨 · 실행 대기',dispatch_started:'Planner 응답 대기 · 접수는 완료가 아닙니다.',completed:'문서 근거 확인됨 · 제안 의미는 직접 검토해 주세요.',failed:'분석 실패 · 자동 재시도하지 않습니다.',delivery_unknown:'전달 상태 불명 · 자동 재전송하지 않습니다.'}[value.state]):'요청 기록을 찾지 못했습니다. 자동 재전송하지 않습니다.')
    }catch{setAnalysisNotice('저장된 초안과 요청 상태를 확인해 주세요. 입력은 유지하며 자동 재전송하지 않습니다.')}
    finally{analysisLock.current=false;setAnalysisBusy(false)}
  }

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
        <p>아이디어 또는 제목이 명시된 기획서에서 목적지 초안을 정리합니다. 저장하지 않은 입력은 이 화면의 메모리에만 있으며 새로고침하면 사라집니다.</p>
        <div className="destination-studio__entry-grid">
          <button type="button" onClick={() => { setSourceNote(null); setEvidence([]); beginQuestions('guided_200q') }}><Sparkles size={22} aria-hidden="true" /><span><strong>질문으로 시작</strong><small>기본 8개 항목을 정리합니다. 적응형 200Q는 연결 준비 중이에요.</small></span></button>
          <button type="button" onClick={() => { setMode('brief_gap'); setStep('brief'); setError(null) }}><FileText size={22} aria-hidden="true" /><span><strong>기획서에서 빈칸 찾기</strong><small>텍스트·Markdown을 이 기기에서만 읽고, 없거나 충돌하는 항목만 묻습니다.</small></span></button>
        </div>
        <p className="destination-studio__boundary"><Lightbulb size={16} aria-hidden="true" />Destination을 확인하기 전에는 프로젝트·역할 세션·Gate를 만들지 않아요.</p>
      </div>}

      {step === 'brief' && <div className="destination-studio__brief">
        <button className="destination-studio__back" type="button" onClick={() => setStep('entry')}><ArrowLeft size={17} aria-hidden="true" />시작 방식</button>
        <div><h3>기획서의 빈칸만 찾을게요</h3><p>헤더에 `문제`, `대상 사용자`, `결과`, `범위`, `비목표`, `제약`, `수용 기준`, `복구`를 쓰면 더 정확해요.</p></div>
        <label className="destination-studio__file"><span>이 기기에서 파일 읽기</span><input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={(event) => void readLocalFile(event.currentTarget.files?.[0])} /><small>읽기만으로는 서버 업로드 없음 · 초안 저장은 별도 · 64KB 이하</small></label>
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
        <section className="destination-studio__unknowns" aria-label="잔여 미상"><strong>잔여 미상</strong>{review.residualUnknowns.map(item=><span key={item}>{item}</span>)}</section>
        {savedDraft&&savedIntakeMatches&&<DestinationDiscoveryPanel key={`${savedDraft.draftId}:${savedDraft.revision}:${savedDraftGeneration}`} intake={savedDraft}/>}
        <p className="destination-studio__boundary"><Lightbulb size={16} aria-hidden="true" />초안 저장은 Destination 확정이 아닙니다. 프로젝트·세션·Gate는 생성하지 않습니다.</p>
        <div className="destination-studio__actions"><button type="button" onClick={() => { const last = destinationQuestions[destinationQuestions.length - 1].id; editAnswer(last) }}><ArrowLeft size={17} aria-hidden="true" />답변 다시 보기</button></div>
        <p>확정하려면 현재 기본 초안과 후속 답변을 불러오고, 저장된 추가 결정을 검토해 주세요.</p>
      </div>}

      <section className="destination-studio__unknowns" aria-label="초안 보관" aria-busy={storageBusy}>
        <strong>계정별 진행 중 초안 1개</strong>
        <span>{privateDestinationStorageAvailable() ? '저장 시 기획서 본문과 답변이 비공개 서버에 보관됩니다. 불러오기는 현재 입력을 대체합니다.' : '서버 초안 저장 연결 준비 중 · 현재 입력은 이 화면에서만 유지됩니다.'}</span>
        <div className="destination-studio__actions">
          <button type="button" disabled={storageBusy || storageHold || !privateDestinationStorageAvailable()} onClick={()=>void useStorage(true)}>초안 저장</button>
          <button type="button" disabled={storageBusy || !privateDestinationStorageAvailable()} onClick={()=>void useStorage(false)}>서버 초안 불러오기 · 현재 입력 대체</button>
        </div>
        {storageNotice && <p role="status">{storageNotice}</p>}
      </section>
      <section className="destination-studio__unknowns" aria-label="Planner 문서 분석" aria-busy={analysisBusy}>
        <strong>Planner 문서 분석</strong>
        <span>저장한 초안의 버전과 해시로 요청합니다. 새로고침 후 서버 초안을 불러오고 결과 확인을 누르면 기존 요청을 복구합니다. 자동 재전송은 없습니다.</span>
        <div className="destination-studio__actions">
          <button type="button" disabled={!savedDraft||!savedDraft.document.source.trim()||analysisAttempted||analysisBusy||storageBusy} onClick={()=>void analyzeSavedDraft(true)}>저장한 문서 분석 요청</button>
          <button type="button" disabled={!analysisRequest||analysisBusy||storageBusy} onClick={()=>void analyzeSavedDraft(false)}>분석 결과 확인</button>
        </div>
        {analysisNotice&&<p role="status">{analysisNotice}</p>}
        {analysis?.state==='completed'&&analysisRequest?.input===latestDraft.current&&analysis.proposals.map((proposal,index)=><article key={index}>
          <strong>{destinationQuestions.find(q=>q.id===proposal.field)?.label} · 미확정 제안</strong><p>{proposal.value}</p>
          <blockquote>{proposal.quote}</blockquote><small>원문 {proposal.startLine}–{proposal.endLine}행{analysis.conflicts.includes(proposal.field)?' · 해석 충돌, 하나를 직접 검토하세요.':''}</small>
          <button type="button" onClick={()=>{editAnswer(proposal.field);setDraftAnswer(proposal.value)}}>이 제안으로 답변 편집</button>
        </article>)}
      </section>
    </section>
  </div>
}
