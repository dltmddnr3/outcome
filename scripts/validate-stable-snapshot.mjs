import assert from 'node:assert/strict'
import snapshot from '../snapshot/outcome-package-source.json' with { type: 'json' }
import { sanitizeRemotePayload } from '../server/cherry-note-dashboard.mjs'
import { projectPublicPackages } from '../server/outcome-package.mjs'

const projected = projectPublicPackages(sanitizeRemotePayload(snapshot))
assert.deepEqual(projected, snapshot, 'snapshot must already equal the sanitized public projection')
assert.equal(snapshot.snapshot?.boundary, 'deployment_snapshot')
assert.equal(snapshot.snapshot?.source, 'sanitized_public_projection')
assert.equal(snapshot.snapshot?.liveSessionRelay, false)
assert.equal(Array.isArray(snapshot.projects) && snapshot.projects.length >= 2, true)
assert.equal(Object.hasOwn(snapshot, 'build'), false, 'source snapshot must not carry a stale deployment receipt')

const text = JSON.stringify(snapshot)
for (const pattern of [/\/Users\//, /\/tmp\//, /(?:session|thread|turn|task)[_-]?id/i, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, /\b[0-9a-f]{40}\b/i, /\b[0-9a-f]{64}\b/i, /(?:token|secret|password|authorization)\s*[:=]/i]) assert.doesNotMatch(text, pattern)
for (const project of snapshot.projects) for (const phase of project.phases ?? []) for (const scope of phase.scopes ?? []) for (const stage of scope.stages ?? []) for (const gate of stage.gate?.gates ?? []) assert.equal(Object.hasOwn(gate, 'evidence'), false)
console.log(`stable snapshot PASS: projects=${snapshot.projects.length}, prohibited disclosures=0, Gate evidence fields=0`)
