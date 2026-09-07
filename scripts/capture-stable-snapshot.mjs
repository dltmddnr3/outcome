import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPackageModel, collectOutcomePackages, loadBindingRegistry, parseOutcomeMap, projectPublicPackages } from '../server/outcome-package.mjs'
import { projectOutcomeCurrentSource } from '../server/outcome-result-view-projection.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = resolve(root, 'snapshot/outcome-package-source.json')
const trackingPath = resolve(root, 'config/outcome-work-tracking.json')
const registryPath = resolve(root, 'config/outcome-projects.json')

export function applyCurrentOutcomeSource({ currentProjection, sourceRoot, capturedAt, bindingRegistry }) {
  if (typeof sourceRoot !== 'string' || !sourceRoot.startsWith('/')) throw new Error('current_source_root_required')
  const canonicalRoot = resolve(sourceRoot)
  const mapPath = resolve(canonicalRoot, 'docs/OUTCOME_MAP.md')
  const gatePath = resolve(canonicalRoot, 'GATES_OUTCOME_MODEL_V2_LOCAL_DEFAULT_AND_SERVICE_PROJECTION.md')
  const mapText = readFileSync(mapPath, 'utf8')
  const gateText = readFileSync(gatePath, 'utf8')
  const parsedMap = parseOutcomeMap(mapText)
  if (!parsedMap.value || parsedMap.errors.length) throw new Error('current_source_map_invalid')
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const entry = registry.projects.find((row) => row.root === '.' && row.work_tracking_file === 'config/outcome-work-tracking.json')
  if (!entry || !Array.isArray(entry.work_tracking_source_refs)) throw new Error('current_source_tracking_registry_invalid')
  const canonicalProject = buildPackageModel({
    root: canonicalRoot,
    contractFile: 'docs/OUTCOME_CONTRACT.md',
    mapFile: 'docs/OUTCOME_MAP.md',
    sessionsFile: 'docs/OUTCOME_SESSIONS.md',
    bindingRegistry,
    now: new Date(capturedAt),
  })
  if (!Array.isArray(currentProjection?.projects) || currentProjection.projects.filter((project) => project?.project?.id === 'outcome').length !== 1) throw new Error('current_source_project_ambiguous')
  const sourceProject = structuredClone(currentProjection.projects.find((project) => project?.project?.id === 'outcome'))
  const canonicalMilestones = canonicalProject.phases.filter((phase) => phase.id === 'outcome-phase-5').flatMap((phase) => phase.scopes).filter((scope) => scope.id === 'outcome-phase-5-composition').flatMap((scope) => scope.stages).filter((stage) => ['outcome-milestone-model-v2-pilot', 'outcome-milestone-model-v2-local-default-projection'].includes(stage.id))
  const targetScopes = sourceProject.phases.filter((phase) => phase.id === 'outcome-phase-5').flatMap((phase) => phase.scopes).filter((scope) => scope.id === 'outcome-phase-5-composition')
  if (canonicalMilestones.length !== 2 || targetScopes.length !== 1) throw new Error('current_source_primary_ambiguous')
  targetScopes[0].stages = canonicalMilestones.map((stage) => ({ ...stage, gate: { ...stage.gate, gates: stage.gate.gates.map((gate) => ({ ...gate, title: `${gate.id} · canonical Gate evidence` })) } }))
  const tracking = JSON.parse(readFileSync(trackingPath, 'utf8'))
  const updated = mapText.match(/^Updated:\s*(.+)$/m)?.[1]?.trim()
  const corrected = projectOutcomeCurrentSource(sourceProject, tracking, { observedAtCutoff: capturedAt }, entry.work_tracking_source_refs, {
    map: parsedMap.value,
    map_text: mapText,
    gate_text: gateText,
    captured_at: capturedAt,
    map_updated_at: updated ?? '',
    gate_observed_at: statSync(gatePath).mtime.toISOString(),
  })
  return { ...currentProjection, projects: currentProjection.projects.map((project) => project?.project?.id === 'outcome' ? corrected : project) }
}

export function preserveUnavailableProjectSlots(currentProjection, priorSnapshot) {
  const currentProjects = currentProjection?.projects
  const priorProjects = priorSnapshot?.projects
  if (!Array.isArray(currentProjects) || !Array.isArray(priorProjects) || currentProjects.length !== priorProjects.length) return currentProjection
  return {
    ...currentProjection,
    projects: currentProjects.map((current, index) => {
      const prior = priorProjects[index]
      const currentUnavailable = current?.status === 'unknown'
      const priorAvailable = typeof prior?.status === 'string' && prior.status !== 'unknown' && prior?.project?.id && prior.project.id !== 'unknown'
      return currentUnavailable && priorAvailable ? prior : current
    }),
  }
}

export function buildStableSnapshot({ currentProjection, priorSnapshot, capturedAt }) {
  const merged = preserveUnavailableProjectSlots(currentProjection, priorSnapshot)
  return projectPublicPackages({
    ...merged,
    observedAt: capturedAt,
    snapshot: {
      boundary: 'deployment_snapshot',
      capturedAt,
      source: 'sanitized_public_projection',
      liveSessionRelay: false,
      refreshBehavior: 'new_deployment_required',
    },
  })
}

const readPriorSnapshot = () => { try { return JSON.parse(readFileSync(output, 'utf8')) } catch { return null } }

export function captureStableSnapshot() {
  const capturedAt = new Date().toISOString()
  const bindingRegistry = loadBindingRegistry()
  const collected = collectOutcomePackages({ bindingRegistry, now: new Date(capturedAt) })
  const currentProjection = projectPublicPackages(applyCurrentOutcomeSource({ currentProjection: collected, sourceRoot: process.env.OUTCOME_CURRENT_SOURCE_ROOT, capturedAt, bindingRegistry }))
  const snapshot = buildStableSnapshot({ currentProjection, priorSnapshot: readPriorSnapshot(), capturedAt })
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(`captured sanitized deployment snapshot: ${snapshot.projects.length} projects`)
  return snapshot
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) captureStableSnapshot()
