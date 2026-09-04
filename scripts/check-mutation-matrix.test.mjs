import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { assertDecisionMutationResponse, assertMutationResponse } from './check-mutation-matrix.mjs'

const matrixSource = readFileSync(new URL('./check-mutation-matrix.mjs', import.meta.url), 'utf8')
const redactionSource = readFileSync(new URL('./check-public-redaction.mjs', import.meta.url), 'utf8')
const scopeSource = readFileSync(new URL('./check-scope.mjs', import.meta.url), 'utf8')
const privateRoutes = ['/api/private/chat/timeline', '/api/private/chat/messages', '/api/private/bridge/admin/viewers/register', '/api/private/bridge/admin/viewers/revoke', '/api/private/bridge/admin/challenges/cleanup', '/api/private/bridge/admin/readiness']

test('C2-R1 mutation matrix names all six private chat and bridge routes', () => {
  for (const route of privateRoutes) assert.equal(matrixSource.includes(route), true, route)
})

test('C2-R2 mutation matrix pins the sole allowed route and canonical denial body', () => {
  assert.equal(matrixSource.includes("allowedPrivateRoute = 'GET /api/private/chat/timeline'"), true)
  assert.equal(matrixSource.includes("const canonicalBody = '{\"error\":\"read_only\"}'"), true)
})

test('C2-R3 retains the existing eight paths while adding the six private routes', () => {
  assert.equal(matrixSource.includes('const paths = ['), true)
  for (const route of ['/api/dashboard', '/api/dashboard/cherry-note', '/api/auth/login', '/api/auth/logout', '/api/private/config', '/api/private/workspace', '/api/unknown', '/cherry-note-dashboard', ...privateRoutes]) assert.equal(matrixSource.includes(`'${route}'`), true, route)
})

test('C2-R4 public redaction enumerates all six route response vocabularies without treating identifier names as leaks', () => {
  for (const route of privateRoutes) assert.equal(redactionSource.includes(`'${route}': [`), true, route)
  for (const field of ['private_content', 'correlation_id', 'binding_version', 'csrf', 'account_ref', 'workspace_id', 'event_id', 'idempotency_key', 'claim_token', 'consumer_id']) assert.equal(redactionSource.includes(`'${field}'`), true, field)
  for (const responseField of ['completion_authority', 'dispatch_state', 'ledger_revision', 'cleared_count', 'active_viewer_count']) assert.equal(redactionSource.includes(`'${responseField}'`), true, responseField)
  assert.equal(redactionSource.includes("['/api/dashboard', '/api/dashboard/cherry-note']"), true)
  assert.equal(redactionSource.includes('not disclosures'), true)
})

test('C2-R5 scope guard pins pg exactly without changing dependencies', () => {
  assert.equal(scopeSource.includes("packageJson.dependencies?.pg !== '8.23.0'"), true)
})

test('every mutation path fails unless status is exactly 405', () => {
  for (const status of [200, 204, 400, 404, 500]) assert.throws(() => assertMutationResponse({ label: 'test', method: 'POST', path: '/cherry-note-dashboard', status, text: '' }), /expected 405/)
})

test('API mutation requires exact read-only JSON and rejects empty or wrong bodies', () => {
  assert.doesNotThrow(() => assertMutationResponse({ label: 'test', method: 'PATCH', path: '/api/dashboard', status: 405, text: '{"error":"read_only"}' }))
  for (const text of ['', '{}', '{"error":"not_found"}', '<html>blocked</html>']) assert.throws(() => assertMutationResponse({ label: 'test', method: 'PATCH', path: '/api/dashboard', status: 405, text }), /API read-only JSON/)
})

test('non-API platform boundary accepts empty or canonical read-only body only', () => {
  assert.doesNotThrow(() => assertMutationResponse({ label: 'test', method: 'DELETE', path: '/cherry-note-dashboard', status: 405, text: '' }))
  assert.doesNotThrow(() => assertMutationResponse({ label: 'test', method: 'DELETE', path: '/cherry-note-dashboard', status: 405, text: '{"error":"read_only"}' }))
  assert.throws(() => assertMutationResponse({ label: 'test', method: 'DELETE', path: '/cherry-note-dashboard', status: 405, text: '<html>unexpected</html>' }), /page mutation body/)
})

test('decision route distinguishes public, unavailable private, and enabled private surface modes', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']) assert.doesNotThrow(() => assertDecisionMutationResponse({ method, status: 405, text: '{"error":"read_only"}', postExpectation: 'recorded' }))
  assert.doesNotThrow(() => assertDecisionMutationResponse({ method: 'POST', status: 405, text: '{"error":"read_only"}', postExpectation: 'public_read_only' }))
  assert.doesNotThrow(() => assertDecisionMutationResponse({ method: 'POST', status: 503, text: '{"error":"decision_store_unavailable"}', postExpectation: 'unavailable' }))
  assert.doesNotThrow(() => assertDecisionMutationResponse({ method: 'POST', status: 201, text: '{"decisionState":"recorded","completionAuthority":false}', postExpectation: 'recorded' }))
  assert.throws(() => assertDecisionMutationResponse({ method: 'POST', status: 503, text: '{"error":"decision_store_unavailable"}', postExpectation: 'public_read_only' }), /expected 405/)
})
