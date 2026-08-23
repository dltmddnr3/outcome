import { existsSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import YAML from 'yaml'
import { sanitizeEvidenceText } from './cherry-note-dashboard.mjs'

const ROLES = ['planner', 'builder', 'ux_product_qa', 'release_audit']
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const GIT_REMOTE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const GIT_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
const safeRead = (path) => { try { return readFileSync(path, 'utf8') } catch { return '' } }
const field = (text, name) => text.match(new RegExp(`^- ${name}:\\s*\`?([^\\n\`]+)\`?`, 'mi'))?.[1]?.trim() ?? null
const fencedYaml = (text) => text.match(/```yaml\s*\n([\s\S]*?)\n```/)?.[1] ?? null

const githubRepository = (value) => {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/)
  return match?.[1] ?? null
}

export function readLocalGitEvidence(root, connector = {}) {
  const run = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  try {
    const branch = run('branch', '--show-current') || null
    const configuredRemote = typeof connector.remote_name === 'string' ? connector.remote_name : ''
    const configuredBranch = typeof connector.default_branch === 'string' ? connector.default_branch : ''
    const remoteName = GIT_REMOTE.test(configuredRemote) ? configuredRemote : null
    const defaultBranch = GIT_BRANCH.test(configuredBranch) && !configuredBranch.includes('..') && !configuredBranch.includes('@{') ? configuredBranch : null
    if (!remoteName || !defaultBranch) return { state: branch ? 'available' : 'unknown', branch, ahead: null, behind: null, observedRepository: null, remoteState: 'unbound' }
    const observedRepository = githubRepository(run('remote', 'get-url', remoteName))
    try {
      run('show-ref', '--verify', `refs/remotes/${remoteName}/${defaultBranch}`)
      const [behind, ahead] = run('rev-list', '--left-right', '--count', `${remoteName}/${defaultBranch}...${branch ?? defaultBranch}`).split(/\s+/).map(Number)
      return { state: branch ? 'available' : 'unknown', branch, ahead: Number.isFinite(ahead) ? ahead : null, behind: Number.isFinite(behind) ? behind : null, observedRepository, remoteState: 'published' }
    } catch { return { state: branch ? 'available' : 'unknown', branch, ahead: null, behind: null, observedRepository, remoteState: 'empty_remote' } }
  } catch { return { state: 'unknown', branch: null, ahead: null, behind: null, observedRepository: null, remoteState: 'unknown' } }
}

export function parseGithubConnector(value, local = { state: 'unknown', branch: null, ahead: null, behind: null, observedRepository: null, remoteState: 'unknown' }) {
  const sync = local.ahead == null || local.behind == null ? 'unknown' : local.ahead > 0 && local.behind > 0 ? 'diverged' : local.ahead > 0 ? 'ahead' : local.behind > 0 ? 'behind' : 'synced'
  const localCandidate = { state: local.state, branch: local.branch, ahead: local.ahead, behind: local.behind, sync }
  const empty = { adopted: false, required: false, state: 'missing', repository: null, remoteName: null, defaultBranch: null, completionAuthority: false, localCandidate, published: { state: 'unknown', repository: null, ref: null, detail: 'unknown' }, checks: { state: 'unknown' }, release: { state: 'unknown' } }
  if (value == null) return empty
  if (typeof value !== 'object' || typeof value.adopted !== 'boolean') return { ...empty, state: 'unknown' }
  const repository = value.repository == null ? null : githubRepository(value.repository)
  const configuredRemote = typeof value.remote_name === 'string' ? value.remote_name : ''
  const configuredBranch = typeof value.default_branch === 'string' ? value.default_branch : ''
  const remoteName = GIT_REMOTE.test(configuredRemote) ? configuredRemote : null
  const defaultBranch = GIT_BRANCH.test(configuredBranch) && !configuredBranch.includes('..') && !configuredBranch.includes('@{') ? configuredBranch : null
  const authoritySafe = value.completion_authority === false
  const declared = value.binding_state
  let state = ['connected', 'unbound'].includes(declared) ? declared : 'unknown'
  if (!value.adopted && (repository || declared === 'connected')) state = 'conflict'
  if (value.adopted && declared === 'unbound' && value.repository != null) state = 'conflict'
  if (value.adopted && declared === 'connected' && (!repository || !remoteName || !defaultBranch)) state = 'conflict'
  if (value.repository != null && !repository) state = 'conflict'
  if (!authoritySafe || value.required === true) state = 'conflict'
  if (state === 'connected' && local.observedRepository && local.observedRepository !== repository) state = 'conflict'
  return {
    adopted: value.adopted, required: value.required === true, state, repository, remoteName, defaultBranch, completionAuthority: false,
    localCandidate,
    published: { state: state === 'connected' && local.remoteState === 'empty_remote' ? 'not_published' : state === 'connected' ? 'connected' : state, repository, ref: remoteName && defaultBranch ? `${remoteName}/${defaultBranch}` : defaultBranch, detail: local.remoteState },
    checks: { state: 'unknown' }, release: { state: 'unknown' },
  }
}

export function parseOutcomeContract(markdown) {
  const projectId = field(markdown, 'Project ID')
  const projectName = field(markdown, 'Project name') ?? markdown.match(/^#\s+(.+?)(?:\s+Outcome Contract|\s+Contract)/m)?.[1]?.trim() ?? null
  const outcome = field(markdown, 'Outcome')
  const acceptanceAuthority = field(markdown, 'Acceptance authority')
  const phaseId = field(markdown, 'Phase ID')
  const missing = [['project_id', projectId], ['project_name', projectName], ['outcome', outcome], ['acceptance_authority', acceptanceAuthority]].filter(([, value]) => !value).map(([name]) => name)
  return { projectId, projectName, outcome, acceptanceAuthority, phaseId, missing }
}

export function parseOutcomeMap(markdown) {
  const source = fencedYaml(markdown)
  if (!source) return { value: null, errors: ['map_yaml_missing'] }
  try { return { value: YAML.parse(source), errors: [] } } catch { return { value: null, errors: ['map_yaml_invalid'] } }
}

const gateAnchorIds = (anchor) => {
  if (!anchor) return null
  const ids = new Set()
  for (const match of anchor.matchAll(/([A-Z]+)(\d+)-(?:([A-Z]+))?(\d+)/g)) {
    const prefix = match[1]; const endPrefix = match[3] ?? prefix
    if (prefix !== endPrefix) continue
    for (let value = Number(match[2]); value <= Number(match[4]); value += 1) ids.add(`${prefix}${value}`)
  }
  return ids.size ? ids : null
}

export function parseGateLedger(markdown, stageId, anchor = '') {
  const allowed = gateAnchorIds(anchor)
  const gates = []
  let sourceGroup = null
  let sourceGroupCode = null
  let activeGate = null
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^([^\s#-].*?\bgates?\b(?:\s+\([^)]*\))?)[:.]?\s*$/i)
    if (heading) { sourceGroup = sanitizeEvidenceText(heading[1].trim()); sourceGroupCode = null }
    const match = line.match(/^- \[([ xX])\]\s+([A-Za-z]+\d*|[^:]+):\s*(.+)$/)
    if (match) {
      const id = match[2].trim()
      if (allowed && !allowed.has(id)) { activeGate = null; continue }
      const code = id.match(/^([A-Z])\d+$/)?.[1] ?? id.match(/^([A-Z]+)/)?.[1] ?? 'GATE'
      if (sourceGroup && sourceGroupCode === null) sourceGroupCode = code
      activeGate = { id, stageId, title: sanitizeEvidenceText(match[3]), closed: match[1].toLowerCase() === 'x', groupCode: code, groupLabel: sourceGroupCode === code ? sourceGroup : null, proves: null, evidence: null }
      gates.push(activeGate)
      continue
    }
    const proves = line.match(/^\s+PROVES:\s*(\S+)/i)
    const evidence = line.match(/^\s+EVIDENCE:\s*(.+)/i)
    if (proves && activeGate) activeGate.proves = proves[1].toLowerCase()
    if (evidence && activeGate) activeGate.evidence = sanitizeEvidenceText(evidence[1])
  }
  const groups = []
  for (const gate of gates) {
    let group = groups.find((item) => item.code === gate.groupCode)
    if (!group) { group = { code: gate.groupCode, name: gate.groupLabel ?? gate.groupCode, total: 0, closed: 0 }; groups.push(group) }
    group.total += 1; if (gate.closed) group.closed += 1
  }
  return { gates, groups, total: gates.length, closed: gates.filter((gate) => gate.closed).length }
}

const axisState = (gates, proves) => {
  const scoped = proves ? gates.filter((gate) => gate.proves === proves) : gates
  if (!scoped.length) return 'not_sourced'
  if (scoped.every((gate) => gate.closed && gate.evidence && !/^pending\b/i.test(gate.evidence))) return 'evidence_closed'
  if (scoped.some((gate) => gate.closed)) return 'partially_evidenced'
  return 'pending'
}

const stageState = (stage, gate) => {
  if (!gate.available) return stage.gate_file_state?.includes('blocked') || stage.gate_file_state?.includes('required') ? 'blocked' : 'unknown'
  if (gate.total > 0 && gate.closed === gate.total && String(stage.evidence_closure_state ?? '').includes('complete')) return 'complete'
  if (gate.total > 0 && gate.closed === gate.total) return 'complete'
  if (String(stage.implementation_state ?? '').includes('work_in_progress') || String(stage.implementation_state ?? '').includes('active')) return 'active'
  if (String(stage.evidence_closure_state ?? '').includes('pending')) return 'pending'
  return gate.total > 0 ? 'queued' : 'unknown'
}

function bindingViews(projectId, registry, now, staleAfterSeconds) {
  return ROLES.map((role) => {
    const history = registry.filter((item) => item.project_id === projectId && item.role === role).sort((a, b) => Date.parse(b.bound_at) - Date.parse(a.bound_at))
    const current = history.find((item) => !item.replaced_at) ?? null
    if (!current) return { role, status: 'unbound', activity: null, observedAt: null, freshness: 'unknown', historyCount: history.length, stageId: null }
    const observedAt = current.observed_at ?? current.bound_at
    const stale = !observedAt || now.getTime() - Date.parse(observedAt) > staleAfterSeconds * 1000
    return { role, status: stale ? 'stale' : current.status, activity: current.activity == null ? null : sanitizeEvidenceText(current.activity), observedAt, freshness: stale ? 'stale' : 'fresh', historyCount: history.length, stageId: current.stage_id ?? null }
  })
}

export function buildPackageModel({ root, contractFile, mapFile, bindingRegistry = [], gitEvidence, now = new Date(), staleAfterSeconds = 900 }) {
  const contractPath = resolve(root, contractFile)
  const mapPath = resolve(root, mapFile)
  const contractText = safeRead(contractPath)
  const mapText = safeRead(mapPath)
  const errors = []
  if (!contractText) errors.push('contract_missing')
  if (!mapText) errors.push('map_missing')
  const contract = parseOutcomeContract(contractText)
  errors.push(...contract.missing.map((name) => `contract_${name}_missing`))
  const parsedMap = parseOutcomeMap(mapText); errors.push(...parsedMap.errors)
  const map = parsedMap.value
  if (!map) return { status: 'unknown', errors: [...new Set(errors)], project: { id: contract.projectId ?? 'unknown', name: contract.projectName ?? 'Unknown project', outcome: contract.outcome }, phases: [], bindings: bindingViews(contract.projectId, bindingRegistry, now, staleAfterSeconds), now: { status: 'unbound', activity: null }, progress: { available: false } }
  if (contract.projectId !== map.project_id) errors.push('project_reference_mismatch')
  const github = parseGithubConnector(map.source_connectors?.github, gitEvidence ?? readLocalGitEvidence(root, map.source_connectors?.github))
  const allIds = [map.project_id]
  const phases = (map.phases ?? []).map((phase) => ({
    id: phase.id, title: phase.title, purpose: phase.purpose, completion: phase.completion ?? phase.completion_marker ?? null,
    scopes: (phase.scopes ?? []).map((scope) => ({
      id: scope.id, title: scope.title, purpose: scope.purpose,
      stages: (scope.stages ?? []).map((stage) => {
        const [gateReference, gateAnchor = ''] = String(stage.gates_file ?? '').split('#', 2)
        const relativeGatePath = gateReference ? resolve(root, gateReference) : null
        const mapRelativeGatePath = gateReference ? resolve(dirname(mapPath), gateReference) : null
        const gatePath = !gateReference ? null : isAbsolute(gateReference) ? gateReference : existsSync(relativeGatePath) ? relativeGatePath : mapRelativeGatePath
        const gateText = gatePath ? safeRead(gatePath) : ''
        if (!gateText) errors.push(`gate_reference_missing:${stage.id}`)
        const ledger = parseGateLedger(gateText, stage.id, gateAnchor)
        const gate = { ...ledger, available: Boolean(gateText), sourceRef: gatePath ? basename(gatePath) : null, observedAt: gatePath && existsSync(gatePath) ? statSync(gatePath).mtime.toISOString() : null }
        return { id: stage.id, title: stage.title, purpose: stage.purpose, dependsOn: stage.depends_on ?? [], gatePurpose: gate.total ? `${stage.title} acceptance checklist` : 'Gate evidence unavailable', gate, sourceState: stage.gate_file_state ?? (gate.available ? 'present' : 'missing'), state: stageState(stage, gate), axes: { implementation: stage.implementation_state ?? axisState(gate.gates, 'implementation'), test: stage.test_state ?? axisState(gate.gates, 'test'), evidence: stage.evidence_closure_state ?? axisState(gate.gates), independentQa: stage.independent_qa_state ?? axisState(gate.gates, 'ux_product_qa'), cherryAcceptance: stage.cherry_acceptance_state ?? axisState(gate.gates, 'cherry_acceptance'), release: stage.release_state ?? axisState(gate.gates, 'release_audit') } }
      }),
    })),
  }))
  for (const phase of phases) { allIds.push(phase.id); for (const scope of phase.scopes) { allIds.push(scope.id); for (const stage of scope.stages) allIds.push(stage.id) } }
  if (allIds.some((id) => !STABLE_ID.test(String(id)))) errors.push('invalid_stable_id')
  if (new Set(allIds).size !== allIds.length) errors.push('duplicate_stable_id')
  const stages = phases.flatMap((phase) => phase.scopes.flatMap((scope) => scope.stages.map((stage) => ({ phase, scope, stage }))))
  const explicitCurrents = [...mapText.matchAll(/^- Current:\s*`([^`]+)`/gm)].map((match) => match[1])
  if (explicitCurrents.length > 1) errors.push('conflicting_current_boundary')
  const explicitStageId = explicitCurrents[0]?.match(/([a-z0-9]+(?:-[a-z0-9]+)*)\s*(?:·|$)/)?.[1]
  let current = stages.find((item) => item.stage.id === explicitStageId)
  if (explicitCurrents.length === 1 && (!explicitStageId || !current)) errors.push('current_reference_mismatch')
  current ??= stages.find((item) => item.stage.state === 'active')
  current ??= stages.find((item) => item.stage.state !== 'complete')
  const currentIndex = current ? stages.indexOf(current) : -1
  if (explicitCurrents.length === 1 && current?.stage.gate.total > 0 && current.stage.gate.closed === current.stage.gate.total) errors.push('current_stage_gate_closed_conflict')
  const next = currentIndex >= 0 ? stages.slice(currentIndex + 1).find((item) => item.stage.state !== 'complete') ?? null : null
  if (current && current.stage.state !== 'complete' && current.stage.gate.available) current.stage.state = 'active'
  for (const item of stages.slice(currentIndex + 1)) {
    if (item.stage.state === 'complete' || item.stage.state === 'blocked') continue
    item.stage.state = item.stage.dependsOn.every((id) => stages.find((candidate) => candidate.stage.id === id)?.stage.state === 'complete') ? 'queued' : 'locked'
  }
  const bindings = bindingViews(map.project_id, bindingRegistry, now, staleAfterSeconds)
  const builder = bindings.find((item) => item.role === 'builder')
  const evidenceTimes = stages.map((item) => item.stage.gate.observedAt).filter(Boolean).map(Date.parse).filter(Number.isFinite)
  const evidenceObservedAt = evidenceTimes.length ? new Date(Math.max(...evidenceTimes)).toISOString() : null
  const conflict = errors.some((error) => error.includes('conflict') || error.includes('mismatch') || error.includes('duplicate'))
  return {
    status: conflict ? 'conflict' : errors.length ? 'unknown' : 'valid', errors: [...new Set(errors)], observedAt: evidenceObservedAt, sourceFreshness: { state: evidenceObservedAt ? 'observed' : 'unknown', observedAt: evidenceObservedAt },
    project: { id: map.project_id, name: map.project_title ?? map.title ?? contract.projectName, outcome: map.project_purpose ?? contract.outcome, acceptanceAuthority: contract.acceptanceAuthority }, phases, connectors: { github },
    current: current ? { phaseId: current.phase.id, scopeId: current.scope.id, stageId: current.stage.id } : null,
    next: next ? { phaseId: next.phase.id, scopeId: next.scope.id, stageId: next.stage.id } : null,
    bindings, now: builder && builder.status !== 'unbound' ? { status: builder.status, activity: builder.activity, observedAt: builder.observedAt, source: 'builder_binding' } : { status: 'unbound', activity: null, observedAt: null, source: 'runtime_registry' },
    progress: { available: false, reason: 'no_cross_stage_aggregate' },
  }
}

export function collectOutcomePackages({ bindingRegistry = [], now = new Date(), projects } = {}) {
  const definitions = projects ?? [
    { root: '/Users/rosum/Documents/ChatGPT/Cherry Note', contractFile: 'OUTCOME_CONTRACT.md', mapFile: 'OUTCOME_MAP.md' },
    { root: '/Users/rosum/Documents/ChatGPT/OUTCOME', contractFile: 'docs/OUTCOME_CONTRACT.md', mapFile: 'docs/OUTCOME_MAP.md' },
  ]
  return { schemaVersion: 2, observedAt: now.toISOString(), projects: definitions.map((definition) => buildPackageModel({ ...definition, bindingRegistry, now })) }
}

export function loadBindingRegistry(path = process.env.OUTCOME_BINDING_REGISTRY ?? join(process.cwd(), '.outcome-runtime', 'bindings.json')) {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(value.bindings) ? value.bindings.filter((item) => item && typeof item.project_id === 'string' && ROLES.includes(item.role)) : []
  } catch { return [] }
}
