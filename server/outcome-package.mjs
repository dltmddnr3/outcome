import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { sanitizeEvidenceText, sanitizeRemotePayload } from './cherry-note-dashboard.mjs'
import { loadRegistry, publicRegistryProjection } from './outcome-session-registry-persistence.mjs'

const ROLES = ['planner', 'builder', 'ux_product_qa', 'release_audit']
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const GIT_REMOTE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const GIT_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
const safeRead = (path) => { try { return readFileSync(path, 'utf8') } catch { return '' } }
const field = (text, name) => text.match(new RegExp(`^- ${name}:\\s*\`?([^\\n\`]+)\`?`, 'mi'))?.[1]?.trim() ?? null
const fencedYaml = (text) => text.match(/```yaml\s*\n([\s\S]*?)\n```/)?.[1] ?? null
const OUTCOME_ROOT = fileURLToPath(new URL('..', import.meta.url))

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
    if (!group) { const sourceName = gate.groupLabel ?? gate.groupCode; group = { code: gate.groupCode, name: sourceName, sourceName, total: 0, closed: 0 }; groups.push(group) }
    group.total += 1; if (gate.closed) group.closed += 1
  }
  return { gates, groups, total: gates.length, closed: gates.filter((gate) => gate.closed).length }
}

const projectGateGroupLabels = (metadata, groups, stageId, supplied) => {
  if (!supplied) return { groups, errors: [] }
  if (!Array.isArray(metadata) || metadata.length === 0) return { groups, errors: [`gate_group_metadata_conflict:${stageId}:invalid_entry`] }
  const labels = new Map()
  for (const entry of metadata) {
    const code = typeof entry?.code === 'string' && entry.code === entry.code.trim() ? entry.code : ''
    const label = typeof entry?.primary_label === 'string' ? entry.primary_label.trim() : ''
    if (!code || !label) return { groups, errors: [`gate_group_metadata_conflict:${stageId}:invalid_entry`] }
    if (labels.has(code)) return { groups, errors: [`gate_group_metadata_conflict:${stageId}:duplicate_code`] }
    labels.set(code, sanitizeEvidenceText(label))
  }
  const sourceCodes = groups.map((group) => group.code)
  if (labels.size !== sourceCodes.length || sourceCodes.some((code) => !labels.has(code))) return { groups, errors: [`gate_group_metadata_conflict:${stageId}:code_mismatch`] }
  return { groups: groups.map((group) => ({ ...group, name: labels.get(group.code) })), errors: [] }
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
  const implementation = String(stage.implementation_state ?? '')
  const evidence = String(stage.evidence_closure_state ?? '')
  if (gate.total > 0 && gate.closed === gate.total) {
    if (implementation.includes('work_in_progress') || (evidence && !evidence.includes('complete'))) return 'gates_closed_evidence_pending'
    return 'complete'
  }
  if (implementation.includes('work_in_progress') || implementation.includes('active')) return 'active'
  if (evidence.includes('pending')) return 'pending'
  return gate.total > 0 ? 'queued' : 'unknown'
}

function parseSessionsManifest(markdown, projectId) {
  if (!markdown) return { setupRequired: true, errors: [] }
  const source = fencedYaml(markdown)
  if (!source) return { setupRequired: false, errors: ['sessions_yaml_missing'] }
  try {
    const value = YAML.parse(source)
    const roles = value?.roles
    if (value?.schema_version !== 2 || value?.project_id !== projectId || !roles || typeof roles !== 'object' || Array.isArray(roles) || Object.keys(roles).length !== ROLES.length || ROLES.some((role) => !roles[role] || roles[role].state !== 'unbound' && !['active', 'idle', 'stale', 'rotating', 'blocked'].includes(roles[role].state) || !Number.isInteger(roles[role].binding_version) || roles[role].binding_version < 0 || roles[role].state === 'unbound' && roles[role].active_binding_ref != null)) return { setupRequired: false, errors: ['sessions_manifest_invalid'] }
    return { setupRequired: false, errors: [] }
  } catch { return { setupRequired: false, errors: ['sessions_yaml_invalid'] } }
}

function bindingViews(projectId, registry, now, staleAfterSeconds, setupRequired = false) {
  const runtimeError = !Array.isArray(registry) && ['registry_unavailable', 'registry_conflict'].includes(registry?.error) ? registry.error : null
  const rows = Array.isArray(registry) ? registry : Array.isArray(registry?.bindings) ? registry.bindings : []
  return ROLES.map((role) => {
    if (setupRequired) return { role, status: 'setup_required', activity: null, boundAt: null, observedAt: null, freshness: 'unknown', bindingVersion: 0, historyCount: 0, phaseId: null, scopeId: null, stageId: null, rotating: false, hasPredecessor: false, history: [] }
    if (runtimeError) return { role, status: runtimeError, activity: null, boundAt: null, observedAt: null, freshness: 'unknown', bindingVersion: 0, historyCount: 0, phaseId: null, scopeId: null, stageId: null, rotating: false, hasPredecessor: false, history: [] }
    const history = rows.filter((item) => item.project_id === projectId && item.role === role).sort((a, b) => Date.parse(b.bound_at) - Date.parse(a.bound_at))
    const projected = history.find((item) => Number.isInteger(item.history_count)) ?? null
    const current = projected ?? history.find((item) => !['replaced', 'revoked'].includes(item.status) && !item.replaced_at) ?? null
    if (!current || current.status === 'unbound') return { role, status: 'unbound', activity: null, boundAt: null, observedAt: null, freshness: 'unknown', bindingVersion: current?.binding_version ?? 0, historyCount: current?.history_count ?? history.length, phaseId: null, scopeId: null, stageId: null, rotating: false, hasPredecessor: false, history: current?.history ?? [] }
    const boundAt = Number.isFinite(Date.parse(current.bound_at)) ? current.bound_at : null
    const observedAt = current.observed_at ?? null
    const stale = !observedAt || now.getTime() - Date.parse(observedAt) > staleAfterSeconds * 1000
    return { role, status: ['rotating', 'blocked', 'stale'].includes(current.status) ? current.status : stale ? 'stale' : current.status, activity: current.activity == null ? null : sanitizeEvidenceText(current.activity), boundAt, observedAt, freshness: stale ? 'stale' : 'fresh', bindingVersion: current.binding_version ?? 0, historyCount: current.history_count ?? history.length, phaseId: current.phase_id ?? null, scopeId: current.scope_id ?? null, stageId: current.stage_id ?? null, rotating: current.rotating === true || current.status === 'rotating', hasPredecessor: current.has_predecessor === true, history: Array.isArray(current.history) ? current.history : [] }
  })
}

export function buildPackageModel({ root, contractFile, mapFile, sessionsFile = null, bindingRegistry = [], gitEvidence, now = new Date(), staleAfterSeconds = 900 }) {
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
  const sessionsText = sessionsFile ? safeRead(resolve(root, sessionsFile)) : ''
  if (sessionsFile && !sessionsText) errors.push('sessions_manifest_missing')
  const sessions = parseSessionsManifest(sessionsText, contract.projectId); errors.push(...sessions.errors)
  if (!map) return { status: 'unknown', errors: [...new Set(errors)], project: { id: contract.projectId ?? 'unknown', name: contract.projectName ?? 'Unknown project', outcome: contract.outcome }, phases: [], bindings: bindingViews(contract.projectId, bindingRegistry, now, staleAfterSeconds, sessions.setupRequired), now: { status: 'unbound', activity: null }, progress: { available: false } }
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
        const projectedGroups = projectGateGroupLabels(stage.gate_groups, ledger.groups, stage.id, Object.hasOwn(stage, 'gate_groups'))
        errors.push(...projectedGroups.errors)
        ledger.groups = projectedGroups.groups
        const gate = { ...ledger, available: Boolean(gateText), sourceRef: gatePath ? basename(gatePath) : null, observedAt: gatePath && existsSync(gatePath) ? statSync(gatePath).mtime.toISOString() : null }
        const expectedDurationSupplied = Object.hasOwn(stage, 'expected_duration_minutes')
        const expectedDurationMinutes = Number.isInteger(stage.expected_duration_minutes) && stage.expected_duration_minutes > 0 ? stage.expected_duration_minutes : null
        if (expectedDurationSupplied && expectedDurationMinutes === null) errors.push(`invalid_expected_duration_minutes:${stage.id}`)
        return { id: stage.id, title: stage.title, purpose: stage.purpose, dependsOn: stage.depends_on ?? [], expectedDurationMinutes, gatePurpose: gate.total ? `${stage.title} acceptance checklist` : 'Gate evidence unavailable', gate, sourceState: stage.gate_file_state ?? (gate.available ? 'present' : 'missing'), state: stageState(stage, gate), axes: { implementation: stage.implementation_state ?? axisState(gate.gates, 'implementation'), test: stage.test_state ?? axisState(gate.gates, 'test'), evidence: stage.evidence_closure_state ?? axisState(gate.gates), independentQa: stage.independent_qa_state ?? axisState(gate.gates, 'ux_product_qa'), cherryAcceptance: stage.cherry_acceptance_state ?? axisState(gate.gates, 'cherry_acceptance'), release: stage.release_state ?? axisState(gate.gates, 'release_audit') } }
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
  if (current && !['complete', 'gates_closed_evidence_pending'].includes(current.stage.state) && current.stage.gate.available) current.stage.state = 'active'
  for (const item of stages.slice(currentIndex + 1)) {
    if (item.stage.state === 'complete' || item.stage.state === 'blocked') continue
    item.stage.state = item.stage.dependsOn.every((id) => stages.find((candidate) => candidate.stage.id === id)?.stage.state === 'complete') ? 'queued' : 'locked'
  }
  const bindings = bindingViews(map.project_id, bindingRegistry, now, staleAfterSeconds, sessions.setupRequired)
  const builder = bindings.find((item) => item.role === 'builder')
  const evidenceTimes = stages.map((item) => item.stage.gate.observedAt).filter(Boolean).map(Date.parse).filter(Number.isFinite)
  const evidenceObservedAt = evidenceTimes.length ? new Date(Math.max(...evidenceTimes)).toISOString() : null
  const conflict = errors.some((error) => error.includes('conflict') || error.includes('mismatch') || error.includes('duplicate'))
  return {
    status: conflict ? 'conflict' : errors.length ? 'unknown' : 'valid', errors: [...new Set(errors)], observedAt: evidenceObservedAt, sourceFreshness: { state: evidenceObservedAt ? 'observed' : 'unknown', observedAt: evidenceObservedAt },
    project: { id: map.project_id, name: map.project_title ?? map.title ?? contract.projectName, outcome: map.project_purpose ?? contract.outcome, acceptanceAuthority: contract.acceptanceAuthority }, phases, connectors: { github },
    current: current ? { phaseId: current.phase.id, scopeId: current.scope.id, stageId: current.stage.id } : null,
    next: next ? { phaseId: next.phase.id, scopeId: next.scope.id, stageId: next.stage.id } : null,
    bindings, now: builder && !['unbound', 'setup_required', 'registry_unavailable', 'registry_conflict'].includes(builder.status) ? { status: builder.status, activity: builder.activity, observedAt: builder.observedAt, source: 'builder_binding' } : { status: builder?.status ?? 'unbound', activity: null, observedAt: null, source: 'runtime_registry' },
    progress: { available: false, reason: 'no_cross_stage_aggregate' },
  }
}

const registryError = (code) => { throw new Error(code) }
const insideRoot = (root, candidate) => candidate === root || candidate.startsWith(`${root}/`)

export function loadProjectRegistry({ environment = process.env, repositoryRoot = OUTCOME_ROOT } = {}) {
  const registryPath = environment.OUTCOME_PROJECT_REGISTRY
  const sourcePath = registryPath ? resolve(registryPath) : join(repositoryRoot, 'config', 'outcome-projects.json')
  let value
  try { value = JSON.parse(readFileSync(sourcePath, 'utf8')) } catch (error) { registryError(error instanceof SyntaxError ? 'project_registry_json_invalid' : 'project_registry_unavailable') }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema_version !== 1) registryError('project_registry_schema_invalid')
  if (!Array.isArray(value.projects) || value.projects.length === 0) registryError('project_registry_projects_invalid')
  const fingerprints = new Set(); const projectIds = new Set()
  return value.projects.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !['root', 'contract_file', 'map_file'].every((key) => typeof entry[key] === 'string' && entry[key].trim())) registryError('project_registry_entry_invalid')
    const root = resolve(repositoryRoot, entry.root)
    if (entry.sessions_file != null && (typeof entry.sessions_file !== 'string' || !entry.sessions_file.trim())) registryError('project_registry_entry_invalid')
    const documents = [entry.contract_file, entry.map_file, ...(entry.sessions_file ? [entry.sessions_file] : [])]
    if (documents.some(isAbsolute)) registryError('project_registry_document_absolute')
    const documentPaths = documents.map((document) => resolve(root, document))
    if (documentPaths.some((documentPath) => !insideRoot(root, documentPath))) registryError('project_registry_document_traversal')
    const [contractPath, mapPath] = documentPaths
    const definition = { root, contractFile: entry.contract_file, mapFile: entry.map_file, sessionsFile: entry.sessions_file ?? null }
    const fingerprint = JSON.stringify([root, contractPath, mapPath])
    if (fingerprints.has(fingerprint)) registryError('project_registry_duplicate_entry')
    fingerprints.add(fingerprint)
    const contract = parseOutcomeContract(safeRead(contractPath)); const parsedMap = parseOutcomeMap(safeRead(mapPath)); const projectId = contract.projectId ?? parsedMap.value?.project_id
    if (projectId && projectIds.has(projectId)) registryError('project_registry_duplicate_project_id')
    if (projectId) projectIds.add(projectId)
    return definition
  })
}

export function collectOutcomePackages({ bindingRegistry = [], now = new Date(), environment, repositoryRoot } = {}) {
  const definitions = loadProjectRegistry({ environment, repositoryRoot })
  return { schemaVersion: 2, observedAt: now.toISOString(), projects: definitions.map((definition) => buildPackageModel({ ...definition, bindingRegistry, now })) }
}

export function projectPublicPackages(value) {
  const projected = sanitizeRemotePayload(value)
  for (const project of projected.projects ?? []) for (const phase of project.phases ?? []) for (const scope of phase.scopes ?? []) for (const stage of scope.stages ?? []) {
    if (Array.isArray(stage.gate?.gates)) stage.gate.gates = stage.gate.gates.map(({ evidence: _evidence, ...gate }) => gate)
  }
  return projected
}

export function loadBindingRegistry(path = process.env.OUTCOME_BINDING_REGISTRY ?? join(process.cwd(), '.outcome-runtime', 'bindings.json')) {
  try {
    const value = loadRegistry(path)
    return { bindings: value.project_ids.flatMap((projectId) => publicRegistryProjection(value, projectId)), error: null }
  } catch (error) { return { bindings: [], error: error instanceof Error && error.message === 'registry_conflict' ? 'registry_conflict' : 'registry_unavailable' } }
}

export function installOutcomeSessions({ root, projectId, templatePath = join(OUTCOME_ROOT, 'templates', 'OUTCOME_SESSIONS.md') }) {
  if (typeof projectId !== 'string' || !STABLE_ID.test(projectId)) registryError('invalid_stable_id')
  const target = resolve(root, 'OUTCOME_SESSIONS.md')
  if (!insideRoot(resolve(root), target)) registryError('sessions_manifest_traversal')
  const template = readFileSync(templatePath, 'utf8')
  writeFileSync(target, template.replaceAll('<stable-project-id>', projectId).replace('<non-secret registry alias>', `${projectId}-local-private`), { encoding: 'utf8', flag: 'wx', mode: 0o644 })
  return { created: true, projectId, roles: [...ROLES] }
}
