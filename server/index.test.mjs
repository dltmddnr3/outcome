import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createOutcomeServer } from './index.mjs'

const secret = 's'.repeat(32)
const password = 'correct horse battery staple'
const dashboard = { schemaVersion: 1, project: { name: 'Cherry Note' }, live: { activity: 'safe' }, hierarchy: { gateGroups: [] }, collector: { state: 'offline' } }

async function withServer(run) {
  const server = createOutcomeServer({ password, secret, secureCookies: false, collect: () => dashboard })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try { await run(`http://127.0.0.1:${server.address().port}`) } finally { server.close(); await once(server, 'close') }
}

test('unauthenticated clients receive no dashboard data', async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/dashboard/cherry-note`); const text = await response.text()
  assert.equal(response.status, 401); assert.equal(text.includes('Cherry Note'), false); assert.equal(text.includes('gateGroups'), false)
  const page = await (await fetch(`${base}/cherry-note-dashboard`)).text()
  assert.equal(page.includes('Cherry Note'), false); assert.equal(page.includes('Gate'), false); assert.equal(page.includes('/assets/'), false)
}))

test('html form login gates the dashboard bundle', async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password }) })
  assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/cherry-note-dashboard'); assert.match(response.headers.get('set-cookie'), /HttpOnly/)
}))

test('valid login issues an httpOnly same-site cookie and permits read-only GET', async () => withServer(async (base) => {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
  const cookie = login.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/)
  const response = await fetch(`${base}/api/dashboard/cherry-note`, { headers: { cookie } }); assert.equal(response.status, 200); assert.equal((await response.json()).dashboard.project.name, 'Cherry Note')
}))

test('invalid or expired cookie fails closed', async () => withServer(async (base) => {
  const response = await fetch(`${base}/api/dashboard/cherry-note`, { headers: { cookie: 'outcome_session=invalid' } }); assert.equal(response.status, 401)
}))

test('remote API is read-only', async () => withServer(async (base) => {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
  const response = await fetch(`${base}/api/dashboard/cherry-note`, { method: 'POST', headers: { cookie: login.headers.get('set-cookie') } }); assert.equal(response.status, 405); assert.deepEqual(await response.json(), { error: 'read_only' })
}))

test('authenticated payload redacts prohibited remote fields', async () => withServer(async (base) => {
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
  const response = await fetch(`${base}/api/dashboard/cherry-note`, { headers: { cookie: login.headers.get('set-cookie') } }); const text = await response.text()
  for (const prohibited of ['/Users/', 'rollout', 'task_id', 'turn_id', 'session_id', 'credential', 'mutation']) assert.equal(text.toLowerCase().includes(prohibited.toLowerCase()), false, prohibited)
}))

test('session endpoint discloses only authentication state', async () => withServer(async (base) => {
  const body = await (await fetch(`${base}/api/auth/session`)).json(); assert.deepEqual(body, { authenticated: false })
}))
