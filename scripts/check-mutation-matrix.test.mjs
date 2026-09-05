import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import test from 'node:test'
import ts from 'typescript'
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
  const operators = ['=', '+=', '-=', '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=', '||=', '&&=', '??=', '^=']
  // Independently derive the finite union from the installed parser declarations.
  const declarations = readFileSync(new URL(import.meta.resolve('typescript').replace(/typescript\.js$/, 'typescript.d.ts')), 'utf8')
  const assignmentUnion = ['AssignmentOperator', 'CompoundAssignmentOperator'].map((name) => {
    const match = declarations.match(new RegExp(`type ${name} = ([^;]+);`))
    assert.ok(match, `missing installed ${name} declaration`)
    return [...match[1].matchAll(/SyntaxKind\.(\w+)/g)].map((item) => ts.SyntaxKind[item[1]])
  }).flat().sort((a, b) => a - b)
  assert.equal(assignmentUnion.length, 16)
  assert.deepEqual(operators.map((operator) => ts.stringToToken(operator)).sort((a, b) => a - b), assignmentUnion)
  assert.deepEqual(assignmentUnion, Array.from({ length: ts.SyntaxKind.LastAssignment - ts.SyntaxKind.FirstAssignment + 1 }, (_, i) => ts.SyntaxKind.FirstAssignment + i))
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
    ['function-parameter', `function probe(csrf = "${secret}") { return csrf }`, true],
    ['arrow-parameter', `globalThis.probe = (csrf /* default */ = '${secret}') => csrf`, true],
    ['method-parameter', `globalThis.probe = { method(csrf = \`${secret}\`) { return csrf } }`, true],
    ['constructor-parameter', `class Probe { constructor(csrf = "${secret}") {} }`, true],
    ['class-field', `class Probe { csrf = "${secret}" }`, true],
    ['binding-object', `const {csrf = "${secret}"} = {}`, true],
    ['binding-alias', `const {csrf: local = "${secret}"} = {}`, true],
    ['binding-local-name', `const {other: csrf = "${secret}"} = {}`, true],
    ['binding-array', `const [csrf = "${secret}"] = []`, true],
    ['parameter-binding', `function probe({csrf = "${secret}"} = {}) {}`, true],
    ['parameter-binding-alias', `function probe({['c\\u0073rf']: local = "${secret}"} = {}) {}`, true],
    ['assignment-shorthand', `let csrf; ({csrf = "${secret}"} = {})`, true],
    ['assignment-alias', `let local; ({['csrf']: local = "${secret}"} = {})`, true],
    ['assignment-array', `let csrf; [csrf = "${secret}"] = []`, true],
    ['parameter-decoded-16', 'function probe(c\\u0073rf = "SyntheticValueA\\u0042") {}', true],
    ['parameter-decoded-15', 'function probe(csrf = "SyntheticValue\\u0041") {}', false],
    ['parameter-runtime', 'function probe(csrf = globalThis.runtimeCsrf) {}', false],
    ['binding-runtime', 'const {csrf: local = globalThis.runtimeCsrf} = {}', false],
    ['ordinary-default', `function probe(ordinary = "${secret}") {}`, false],
    ...operators.flatMap((operator, index) => [
      [`operator-${index}-member`, `globalThis.csrf ${operator} "${secret}"`, true],
      [`operator-${index}-bracket`, `globalThis['csrf'] ${operator} "${secret}"`, true],
      [`operator-${index}-controls`, ['globalThis.csrf', "globalThis['csrf']"].flatMap((target) => [`${target} ${operator} globalThis.runtimeCsrf`, `${target} ${operator} "short"`]).concat(`globalThis.unrelated ${operator} "${secret}"`).join(';'), false],
    ]),
    ['nonassignment-controls', ['==', '===', '!=', '!==', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '**', '<<', '>>', '>>>', '&', '|', '^', '&&', '||', '??'].map((operator) => `globalThis.csrf ${operator} "${secret}"`).join(';'), false],
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

test('F7 complete scanner discovers HTML-equivalent scripts and contains asset URLs', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const fixtures = mkdtempSync(join(tmpdir(), 'outcome-f7-scanner-'))
  const dist = join(fixtures, 'dist')
  const secret = 'globalThis.csrf = "SyntheticValueAB";'
  const cases = [
    ['double', '<script src="/assets/probe.js"></script>', true, 2],
    ['single', "<script src='/assets/probe.js'></script>", true, 2],
    ['unquoted', '<script src=/assets/probe.js></script>', true, 2],
    ['whitespace-case', '<ScRiPt\n SrC \t=\n "/assets/probe.js" ></sCrIpT>', true, 2],
    ['entity', '<script src="&#47;assets&#47;pro&#98;e.js"></script>', true, 2],
    ['relative', '<script src="assets/probe.js"></script>', true, 2],
    ['dot-relative', '<script src="./assets/probe.js"></script>', true, 2],
    ['query-fragment', '<script src="/assets/probe.js?v=1&amp;x=2#code"></script>', true, 2],
    ['encoded-filename', '<script src="/assets/pro%62e.js"></script>', true, 2],
    ['base-relative', '<base href="/assets/"><script src="probe.js"></script>', true, 2],
    ['first-base-only', '<base href="/assets/"><base href="https://outside.invalid/"><script src="probe.js"></script>', true, 2],
    ['duplicate-first-secret', '<script src="/assets/probe.js" SRC="/assets/clean.js"></script>', true, 2],
    ['duplicate-first-clean', '<script src="/assets/clean.js" SRC="/assets/probe.js"></script>', false, 2],
    ['comment', '<!-- <script src="/assets/probe.js"></script> -->', false, 1],
    ['data-attribute', '<div data-src="/assets/probe.js"></div>', false, 1],
    ['escaped-lookalike', '<div>&lt;script src="/assets/probe.js"&gt;</div>', false, 1],
    ['template-inert', '<template><script src="/assets/probe.js"></script></template>', false, 1],
    ['modulepreload', '<link rel="MoDuLePrElOaD" href="/assets/probe.js">', true, 1],
    ['script-preload', '<link rel="preload" as="SCRIPT" href="/assets/probe.js">', true, 1],
    ['stylesheet', "<link rel='stylesheet' href='/assets/style.css?x=1#style'>", false, 1],
    ['style-preload', '<link rel="preload" as="style" href="/assets/style.css">', false, 1],
    ['runtime-control', '<script src="/assets/runtime.js"></script>', false, 2],
    ['short-control', '<script src="/assets/short.js"></script>', false, 2],
    ['nonstandard-extension', '<script src="/assets/probe.dat"></script>', true, 2],
    ['missing', '<script src="/assets/missing.js"></script>', 'asset-read'],
    ['empty', '<script src=""></script>', 'asset-reference'],
    ['foreign-origin', '<script src="https://outside.invalid/probe.js"></script>', 'asset-origin'],
    ['scheme-relative', '<script src="//outside.invalid/probe.js"></script>', 'asset-origin'],
    ['foreign-base', '<base href="https://outside.invalid/"><script src="probe.js"></script>', 'asset-origin'],
    ['file-url', '<script src="file:///outside/probe.js"></script>', 'asset-origin'],
    ['data-url', '<script src="data:text/javascript,void(0)"></script>', 'asset-origin'],
    ['encoded-slash', '<script src="/assets%2fprobe.js"></script>', 'asset-path'],
    ['encoded-traversal', '<script src="/assets/%2e%2e%2foutside.js"></script>', 'asset-path'],
    ['malformed-encoding', '<script src="/assets/%zz.js"></script>', 'asset-path'],
    ['symlink-escape', '<script src="/assets/escape.js"></script>', 'asset-path'],
    ...[9, 10, 12, 13, 32].flatMap((code) => [
      [`rel-ascii-${code}`, `<link rel="other${String.fromCharCode(code)}MoDuLePrElOaD" href="/assets/probe.js">`, true, 1, 2],
      [`rel-ascii-entity-${code}`, `<link rel="other&#${code};STYLESHEET" href="/assets/style.css">`, false, 1],
    ]),
    ...[11, 160, 8195, 8239, 65279].flatMap((code) => [
      [`rel-nonascii-${code}`, `<link rel="modulepreload${String.fromCharCode(code)}other" href="/assets/probe.js">`, false, 1],
      [`rel-nonascii-entity-${code}`, `<link rel="modulepreload&#${code};other" href="/assets/probe.js">`, false, 1],
    ]),
    ['rel-upper', '<link rel="MODULEPRELOAD" href="/assets/probe.js">', true, 1, 2],
    ['rel-mixed-token', '<link rel="other MoDuLePrElOaD other" href="/assets/probe.js">', true, 1, 2],
    ['rel-substring', '<link rel="xmodulepreload" href="/assets/probe.js">', false, 1],
    ['rel-nbsp-stylesheet', '<link rel="stylesheet&#160;other" href="/assets/not-a-stylesheet.css">', false, 1],
  ]
  try {
    mkdirSync(join(dist, 'assets'), { recursive: true })
    writeFileSync(join(dist, 'assets/clean.js'), 'globalThis.cleanProbe = true;')
    writeFileSync(join(dist, 'assets/probe.js'), secret)
    writeFileSync(join(dist, 'assets/probe.dat'), secret)
    writeFileSync(join(dist, 'assets/runtime.js'), 'globalThis.csrf = globalThis.runtimeCsrf;')
    writeFileSync(join(dist, 'assets/short.js'), 'globalThis.csrf = "short";')
    writeFileSync(join(dist, 'assets/style.css'), 'body { color: black; }')
    writeFileSync(join(fixtures, 'outside.js'), secret)
    symlinkSync(join(fixtures, 'outside.js'), join(dist, 'assets/escape.js'))
    for (const [label, markup, reject, scripts, expectedInspected] of cases) {
      writeFileSync(join(dist, 'index.html'), `<h1>프로젝트 여정</h1><script src="/assets/clean.js"></script>${markup}`)
      const result = spawnSync(process.execPath, ['scripts/check-public-redaction.mjs'], { cwd: root, encoding: 'utf8', timeout: 30_000, env: { ...process.env, OUTCOME_CANDIDATE_DIST: relative(root, dist), OUTCOME_PUBLIC_URL: '' } })
      const csrfFailure = result.stderr.includes('bundle:csrf-secret-literal')
      console.info(JSON.stringify({ label: `F7-${label}`, scannerExit: result.status, csrfFailure, discovery: result.stdout.trim() }))
      assert.equal(result.error, undefined, `${label}: environment failure`)
      assert.equal(result.status, reject ? 1 : 0, `${label}: scanner exit`)
      assert.equal(csrfFailure, reject === true, `${label}: failure class`)
      if (typeof reject === 'string') assert.ok(result.stderr.includes(`bundle:${reject}`), `${label}: missing failure class`)
      else {
        const inspected = expectedInspected ?? scripts + (['modulepreload', 'script-preload'].includes(label) ? 1 : 0)
        assert.ok(result.stdout.includes(`direct scripts=${scripts}; inspected script references=${inspected};`), `${label}: discovery count`)
      }
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
