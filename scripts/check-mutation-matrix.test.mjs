import assert from 'node:assert/strict'
import test from 'node:test'
import { assertMutationResponse } from './check-mutation-matrix.mjs'

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
