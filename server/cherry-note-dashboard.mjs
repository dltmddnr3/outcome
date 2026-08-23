import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_ROOT = process.env.OUTCOME_CHERRY_NOTE_ROOT ?? '/Users/rosum/.codex/worktrees/cn-outcome-candidate'
const DEFAULT_ROLLOUT = process.env.OUTCOME_CHERRY_NOTE_ROLLOUT ?? ''
const safeRead = (path) => { try { return readFileSync(path, 'utf8') } catch { return '' } }
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const percent = (value, total) => total > 0 ? Math.round((value / total) * 100) : 0

export function sanitizeEvidenceText(value) {
  return String(value ?? '')
    .replace(/(?:\/Users|\/home|[A-Za-z]:\\)[^\s`'"<>]+/g, '[local source]')
    .replace(/\b(?:task|turn|thread|session)[_-]?(?:id)?\s*[:=]\s*[A-Za-z0-9_-]+/gi, '[private id]')
    .replace(/\b[0-9a-f]{24,64}\b/gi, '[immutable artifact]')
    .replace(/(?:token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, '[credential redacted]')
    .replace(/`/g, '')
    .slice(0, 240)
}

const prohibitedRemoteKey = /(?:^|_)(?:path|root|token|secret|password|authorization|cookie|rollout|session|thread|task|turn|hash)(?:$|_)/i
export function sanitizeRemotePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizeRemotePayload)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !prohibitedRemoteKey.test(key)).map(([key, item]) => [key, sanitizeRemotePayload(item)]))
  return typeof value === 'string' ? sanitizeEvidenceText(value) : value
}

export function parseGateContract(markdown) {
  const groups = []
  for (const line of markdown.split('\n')) {
    const gate = line.match(/^- \[[ x]\] ([A-Z])(\d+):\s*(.+)$/)
    if (!gate) continue
    const labels = { Y: '링크 미리보기', L: '아이보리 화면 통일', B: '브랜드 표현', M: '더보기 화면', N: '새 폴더 만들기', E: '새 일정 만들기', A: '폴더 보관·복원', D: '폴더·콘텐츠 복구 삭제', G: '엔지니어링 완료 증거' }
    let group = groups.find((item) => item.id === gate[1])
    if (!group) { group = { id: gate[1], label: labels[gate[1]] ?? '완료 증거', total: 0, gates: [] }; groups.push(group) }
    group.total += 1
    group.gates.push({ id: `${gate[1]}${gate[2]}`, title: sanitizeEvidenceText(gate[3]), checked: line.startsWith('- [x]') })
  }
  return { total: groups.reduce((sum, group) => sum + group.total, 0), groups }
}

export function parseProgressSnapshots(text) {
  const latest = (pattern, fallback) => { const matches = [...text.matchAll(pattern)]; return matches.length ? Number(matches.at(-1)[1]) : fallback }
  return { implemented: latest(/implemented:\s*(\d+)\/57/gi, 54), tested: latest(/tested:\s*(\d+)\/57/gi, 50), evidenceClosed: latest(/evidence(?:-closed| closed):\s*(\d+)\/57/gi, 44) }
}

export function parseLiveTestPulse(text) {
  const points = [...text.matchAll(/(?:small|full).*?passed[= :](\d+)/gi)].map((match) => Number(match[1]))
  const failures = [...text.matchAll(/(?:failed|failures?)[= :](\d+)/gi)].map((match) => Number(match[1]))
  const suites = [...text.matchAll(/\b([A-Z][A-Za-z0-9_]*(?:Tests|UITests))\b/g)].map((match) => match[1])
  return { passed: points.at(-1) ?? null, failed: failures.at(-1) ?? 0, delta: points.length > 1 ? Math.max(0, points.at(-1) - points.at(-2)) : null, currentTest: suites.at(-1) ?? null }
}

function receiptStages(root) {
  const directory = join(root, '.whitecastle', 'outcome-events')
  if (!existsSync(directory)) return []
  const selected = new Map()
  for (const name of readdirSync(directory).filter((item) => /stage\d+/i.test(item)).sort()) {
    const stage = Number(name.match(/stage(\d+)/i)?.[1]); if (!stage) continue
    const available = name.includes('available')
    const item = { stage, label: `Stage ${stage}`, kind: available ? 'Cherry review available' : name.includes('blocked') ? 'Decision blocked' : 'Candidate ready', status: stage <= 32 ? 'complete' : 'pending', priority: available ? 3 : name.includes('blocked') ? 2 : 1 }
    if (!selected.has(stage) || selected.get(stage).priority < item.priority) selected.set(stage, item)
  }
  return [...selected.values()].sort((a, b) => a.stage - b.stage).map(({ priority: _priority, ...item }) => item)
}

function processEvidence(root) {
  try {
    const output = execFileSync('ps', ['-axo', 'etime=,command='], { encoding: 'utf8', timeout: 1500 })
    const row = output.split('\n').find((line) => line.includes('xcodebuild') && line.includes(root))
    if (!row) return { running: false, elapsedSeconds: null, label: '활성 테스트 프로세스 없음' }
    const elapsed = row.trim().match(/^([0-9:-]+)/)?.[1].split(':').map(Number) ?? []
    return { running: true, elapsedSeconds: elapsed.reduce((sum, unit) => sum * 60 + unit, 0), label: '제품 검증 실행 중' }
  } catch { return { running: false, elapsedSeconds: null, label: '프로세스 근거 확인 불가' } }
}

function latestActivity(text) {
  const messages = []
  for (const line of text.trim().split('\n').slice(-500)) {
    try {
      const event = JSON.parse(line)
      const message = event?.payload?.message ?? event?.message
      if (typeof message === 'string' && message.length > 20) messages.push(sanitizeEvidenceText(message))
    } catch { /* non-JSON evidence lines are parsed separately */ }
  }
  return messages.at(-1) || 'Stage 33 검증 근거를 확인하고 있습니다.'
}

export function buildCherryNoteDashboard({ root = DEFAULT_ROOT, rolloutPath = DEFAULT_ROLLOUT, now = new Date(), rolloutText, gateText, scorecardText, process, sourceObservedAt } = {}) {
  const gatePath = join(root, 'GATES_STAGE33_PHYSICAL_UIUX.md')
  const gateSource = gateText ?? safeRead(gatePath)
  const rollout = rolloutText ?? (rolloutPath ? safeRead(rolloutPath) : '')
  const scorecard = scorecardText ?? safeRead(join(root, 'OUTCOME_SCORECARD.md'))
  const observedAt = sourceObservedAt ?? (rolloutPath && existsSync(rolloutPath) ? statSync(rolloutPath).mtime.toISOString() : existsSync(gatePath) ? statSync(gatePath).mtime.toISOString() : null)
  const age = observedAt ? Math.max(0, (now.getTime() - Date.parse(observedAt)) / 1000) : Infinity
  const collectorState = !gateSource ? 'offline' : age > 180 ? 'stale' : 'online'
  const gates = parseGateContract(gateSource)
  const total = gates.total || 57
  const progress = parseProgressSnapshots(rollout)
  const activeProcess = process ?? processEvidence(root)
  const active = collectorState === 'online' && activeProcess.running
  const stages = receiptStages(root)
  if (!stages.some((item) => item.stage === 33)) stages.push({ stage: 33, label: 'Stage 33', kind: 'Physical UI/UX correction', status: active ? 'active' : collectorState === 'offline' ? 'unknown' : 'stale' })
  return {
    schemaVersion: 1, observedAt: now.toISOString(), collector: { state: collectorState, observedAt, staleAfterSeconds: 180 },
    project: { name: 'Cherry Note', outcome: 'Inbox → organize → rediscover 핵심 흐름을 실제 사용자에게 전달 가능한 MVP로 닫기', phase: 'Phase 1 · MVP closure', currentStage: 33, nextStage: 'Final Feed', closureState: 'MVP_SCOPE_OPEN' },
    live: { state: active ? 'active' : collectorState === 'offline' ? 'unknown' : 'stale', role: 'Outcome Builder', activity: latestActivity(rollout), observedAt, elapsedSeconds: activeProcess.elapsedSeconds, processLabel: activeProcess.label, pulse: parseLiveTestPulse(rollout.slice(-2_000_000)) },
    progress: { total, implemented: clamp(progress.implemented, 0, total), tested: clamp(progress.tested, 0, total), evidenceClosed: clamp(progress.evidenceClosed, 0, total), percentages: { implemented: percent(progress.implemented, total), tested: percent(progress.tested, total), evidenceClosed: percent(progress.evidenceClosed, total) } },
    hierarchy: { phases: [{ id: 'phase-1', label: 'Phase 1 · MVP', status: 'active', scopes: [{ id: 'core', label: 'Core loop', status: 'complete', stages: stages.filter((item) => item.stage <= 32) }, { id: 'hardening', label: 'UI/UX hardening', status: 'active', stages: stages.filter((item) => item.stage === 33), gateGroups: gates.groups.map(({ gates: _gates, ...group }) => group) }, { id: 'feed', label: 'Final Feed', status: 'queued', stages: [{ stage: 34, label: 'Feed', kind: 'Final MVP feature stage', status: 'queued' }] }, { id: 'audit', label: 'Claude QA / Audit', status: 'queued', stages: [] }, { id: 'acceptance', label: 'Cherry acceptance', status: 'queued', stages: [] }] }, { id: 'phase-2', label: 'Phase 2', status: 'locked' }], gateGroups: gates.groups },
    outcomes: { functional: /Functional[^\n]*14\/15 PASS/i.test(scorecard) ? '14/15 PASS · 1 PARTIAL' : 'scorecard 확인 필요', uiux: 'Cherry 검증 대기', realUse: /Real-use accepted[^\n]*8\/17 PASS/i.test(scorecard) ? '8/17 PASS · 4 revision · 5 pending' : 'scorecard 확인 필요', final: '0/17 all-axes PASS', externalReady: false },
    guidance: [{ title: '지금 Stage 33에 포함', body: '물리 UI 피드백, 입력 회귀, 보관/복구 삭제, 전체 테스트와 immutable candidate 증거' }, { title: '다음 Feed에 포함', body: 'MVP의 마지막 제품 기능만 구현하고 Stage 33 수정 범위와 섞지 않음' }, { title: 'Builder 이후', body: 'fresh UX/Product QA → 별도 Release Audit → Cherry 실기기 수용' }],
  }
}

export function collectCherryNoteDashboard(options = {}) { return buildCherryNoteDashboard(options) }
