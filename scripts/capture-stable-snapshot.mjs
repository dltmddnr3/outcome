import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectOutcomePackages, loadBindingRegistry, projectPublicPackages } from '../server/outcome-package.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = resolve(root, 'snapshot/outcome-package-source.json')

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
  const currentProjection = projectPublicPackages(collectOutcomePackages({ bindingRegistry: loadBindingRegistry(), now: new Date(capturedAt) }))
  const snapshot = buildStableSnapshot({ currentProjection, priorSnapshot: readPriorSnapshot(), capturedAt })
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(`captured sanitized deployment snapshot: ${snapshot.projects.length} projects`)
  return snapshot
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) captureStableSnapshot()
