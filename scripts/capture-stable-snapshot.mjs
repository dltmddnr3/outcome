import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sanitizeRemotePayload } from '../server/cherry-note-dashboard.mjs'
import { collectOutcomePackages, loadBindingRegistry, projectPublicPackages } from '../server/outcome-package.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const output = resolve(root, 'snapshot/outcome-package-source.json')
const capturedAt = new Date().toISOString()
const publicProjection = projectPublicPackages(collectOutcomePackages({ bindingRegistry: loadBindingRegistry(), now: new Date(capturedAt) }))
const snapshot = sanitizeRemotePayload({
  ...publicProjection,
  observedAt: capturedAt,
  snapshot: {
    boundary: 'deployment_snapshot',
    capturedAt,
    source: 'sanitized_public_projection',
    liveSessionRelay: false,
    refreshBehavior: 'new_deployment_required',
  },
})

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
console.log(`captured sanitized deployment snapshot: ${snapshot.projects.length} projects`)
