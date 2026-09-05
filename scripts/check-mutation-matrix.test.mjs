import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { assertDecisionMutationResponse, assertMutationResponse } from './check-mutation-matrix.mjs'

const matrixSource = readFileSync(new URL('./check-mutation-matrix.mjs', import.meta.url), 'utf8')
const redactionSource = readFileSync(new URL('./check-public-redaction.mjs', import.meta.url), 'utf8')
const scopeSource = readFileSync(new URL('./check-scope.mjs', import.meta.url), 'utf8')
const privateRoutes = ['/api/private/chat/timeline', '/api/private/chat/messages', '/api/private/bridge/admin/viewers/register', '/api/private/bridge/admin/viewers/revoke', '/api/private/bridge/admin/challenges/cleanup', '/api/private/bridge/admin/readiness']

test('F3 complete scanner rejects CSRF literal syntax variants and preserves AF-1 controls', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const fixtures = mkdtempSync(join(tmpdir(), 'outcome-f3-scanner-'))
  const secret = 'SyntheticValueAB' // 16 characters; never a credential.
  assert.equal(secret.length, 16)
  const cases = [
    ['qa-original', 'globalThis.probe={"csrf":"QaSyntheticSecretValueABCDEFG"}', true],
    ...['csrf', '"csrf"', "'csrf'"].flatMap((key, k) => ['"', "'", '`'].map((quote, q) => [`property-${k}-${q}`, `globalThis.probe={${key} \n : \t ${quote}${secret}${quote}}`, true])),
    ['assignment', `globalThis.csrf = '${secret}'`, true],
    ['bracket-assignment', `globalThis['csrf'] = \`${secret}\``, true],
    ['computed-literal', `globalThis.probe={['csrf']:"${secret}"}`, true],
    ['comment-property', `globalThis.probe={csrf: /* ordinary comment */ "${secret}"}`, true],
    ['comment-assignment', `globalThis.csrf /* left */ = // right\n "${secret}"`, true],
    ['comment-bracket', `globalThis[/* key */ 'csrf'] = /* value */ '${secret}'`, true],
    ['escaped-key', `globalThis.probe={"c\\u0073rf":"${secret}"}`, true],
    ['escaped-identifier', `globalThis.probe={c\\u0073rf:"${secret}"}`, true],
    ['decoded-value-16', 'globalThis.probe={csrf:"SyntheticValueA\\u0042"}', true],
    ['decoded-value-15', 'globalThis.probe={csrf:"SyntheticValue\\u0041"}', false],
    ['comment-looking-string', 'globalThis.probe={note:"/* csrf: secret */ //",csrf:""}', false],
    ['runtime-value', 'globalThis.probe={csrf:globalThis.runtimeCsrf}', false],
    ['parenthesized', `globalThis.csrf = ("${secret}")`, true],
    ['variable', `const csrf = "${secret}"`, true],
    ['parse-error', 'globalThis.probe={csrf:', 'javascript-parse'],
    ['length-15', `globalThis.probe={"csrf":"${secret.slice(0, 15)}"}`, false],
    ['af1-identifiers', 'globalThis.probe={csrf:"",private_content:null,route:"/api/private/chat/timeline",other:"/api/private/chat/messages"}', false],
  ]
  try {
    mkdirSync(join(fixtures, 'assets'))
    writeFileSync(join(fixtures, 'index.html'), '<h1>프로젝트 여정</h1><link href="/assets/style.css" rel="stylesheet"><script src="/assets/clean.js"></script><script src="/assets/probe.js"></script>')
    writeFileSync(join(fixtures, 'assets/style.css'), 'body { color: black; }')
    writeFileSync(join(fixtures, 'assets/clean.js'), 'globalThis.cleanProbe = true;')
    for (const [label, code, reject] of cases) {
      writeFileSync(join(fixtures, 'assets/probe.js'), code)
      const result = spawnSync(process.execPath, ['scripts/check-public-redaction.mjs'], { cwd: root, encoding: 'utf8', timeout: 30_000, env: { ...process.env, OUTCOME_CANDIDATE_DIST: relative(root, fixtures), OUTCOME_PUBLIC_URL: '' } })
      const csrfFailure = result.stderr.includes('bundle:csrf-secret-literal')
      console.info(JSON.stringify({ label, fixtureSha256: createHash('sha256').update(code).digest('hex'), scannerExit: result.status, csrfFailure }))
      assert.equal(result.error, undefined, `${label}: scanner environment failure`)
      assert.equal(result.status, reject ? 1 : 0, `${label}: unexpected complete scanner exit`)
      assert.equal(csrfFailure, reject === true, `${label}: wrong failure class`)
      if (typeof reject === 'string') assert.ok(result.stderr.includes(`bundle:${reject}`), `${label}: missing check error`)
      if (!reject) assert.match(result.stdout, /G-6d csrf build secrets=0/)
    }
  } finally { rmSync(fixtures, { recursive: true, force: true }) }
})

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
