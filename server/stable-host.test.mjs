import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { handleStableHostRequest } from '../api/index.mjs'
import snapshot from '../snapshot/outcome-package-public.json' with { type: 'json' }

const request = (method, pathname) => handleStableHostRequest({ method, pathname })

test('stable host exposes the public Package snapshot needed by the app', () => {
  const response = request('GET', '/api/dashboard')
  assert.equal(response.status, 200)
  assert.equal(response.body.dashboard.snapshot.boundary, 'deployment_snapshot')
  assert.equal(response.body.dashboard.snapshot.source, 'sanitized_public_projection')
  assert.equal(response.body.dashboard.snapshot.liveSessionRelay, false)
  assert.equal(response.body.dashboard.projects.length >= 2, true)
})

test('stable host exposes public read-only session and health GETs', () => {
  assert.deepEqual(request('GET', '/api/auth/session'), { status: 200, body: { authenticated: false, publicReadOnly: true } })
  assert.deepEqual(request('GET', '/api/health'), { status: 200, body: { status: 'available', access: 'public_read_only', source: 'deployment_snapshot' } })
})

test('stable host rejects every mutation and unknown GET fails closed', () => {
  let checked = 0
  for (const path of ['/api/dashboard', '/api/auth/session', '/api/health', '/api/unknown']) for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.deepEqual(request(method, path), { status: 405, body: { error: 'read_only' } })
    checked += 1
  }
  assert.equal(checked, 16)
  assert.deepEqual(request('GET', '/api/unknown'), { status: 404, body: { error: 'not_found' } })
})

test('stable snapshot has no prohibited disclosure or Gate evidence fields', () => {
  const text = JSON.stringify(snapshot)
  for (const pattern of [/\/Users\//, /\/tmp\//, /(?:session|thread|turn|task)[_-]?id/i, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, /\b[0-9a-f]{40}\b/i, /\b[0-9a-f]{64}\b/i, /(?:token|secret|password|authorization)\s*[:=]/i]) assert.doesNotMatch(text, pattern)
  for (const project of snapshot.projects) for (const phase of project.phases ?? []) for (const scope of phase.scopes ?? []) for (const stage of scope.stages ?? []) for (const gate of stage.gate?.gates ?? []) assert.equal(Object.hasOwn(gate, 'evidence'), false)
  assert.equal(snapshot.snapshot.boundary, 'deployment_snapshot')
})

test('Vercel config preserves dashboard route fallback and built output contract', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(config.outputDirectory, 'dist')
  assert.equal(config.rewrites.some((item) => item.source === '/api/:path*' && item.destination.includes('/api')), true)
  assert.equal(config.rewrites.some((item) => item.source === '/cherry-note-dashboard' && item.destination === '/index.html'), true)
  if (process.env.OUTCOME_ASSERT_BUILT === '1') {
    assert.equal(existsSync(new URL('../dist/index.html', import.meta.url)), true)
    const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
    assert.match(html, /\/assets\/index-[A-Za-z0-9_-]+\.js/)
  }
})
