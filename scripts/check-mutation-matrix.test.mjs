import assert from 'node:assert/strict'
import test from 'node:test'
import { assertDecisionMutationResponse, assertMutationResponse } from './check-mutation-matrix.mjs'

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
