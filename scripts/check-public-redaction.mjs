import { once } from 'node:events'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import ts from 'typescript'
import { LOCAL_ABSOLUTE_PATH_SOURCE } from '../server/cherry-note-dashboard.mjs'
import { createOutcomeServer, readBuildReceipt } from '../server/index.mjs'

// The public bundle contains the authenticated private client's code. Route strings under
// /api/private/** and field names such as private_content and csrf are expected identifiers,
// not disclosures. This scanner checks private values (secrets, identifier values, paths and
// hashes), never identifier names. The pinned base 3039a279 already has eight /api/private/...
// route literals in src/lib/api.ts.
const isolatedDist = '.outcome-runtime/candidate-dist'
const candidateDist = process.env.OUTCOME_CANDIDATE_DIST ?? (existsSync(join(isolatedDist, 'index.html')) ? isolatedDist : 'dist')
if (!existsSync(join(candidateDist, 'index.html'))) throw new Error(`candidate build missing: ${candidateDist}`)
const runtime = mkdtempSync(join(tmpdir(), 'outcome-public-boundary-'))
symlinkSync(join(process.cwd(), candidateDist), join(runtime, 'dist'), 'dir')
const htmlReceipt = readFileSync(join(candidateDist, 'index.html'), 'utf8')
const buildReceipt = { ...readBuildReceipt(), asset: htmlReceipt.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] ?? null }
const privateResponseVocabulary = {
  '/api/private/chat/timeline': ['target', 'events', 'completion_authority', 'csrf', 'binding_version', 'event_id', 'correlation_id', 'private_content'],
  '/api/private/chat/messages': ['accepted', 'sequence', 'event_id', 'dispatch_state', 'delivery', 'execution_started', 'result_attached', 'evidence_attached'],
  '/api/private/bridge/admin/viewers/register': ['status', 'revision', 'ledger_revision'],
  '/api/private/bridge/admin/viewers/revoke': ['status', 'revision', 'ledger_revision'],
  '/api/private/bridge/admin/challenges/cleanup': ['status', 'cleared_count'],
  '/api/private/bridge/admin/readiness': ['status', 'active_viewer_count', 'active_viewer_class_count'],
}
const privateValueKeys = ['private_content', 'correlation_id', 'binding_version', 'csrf', 'account_ref', 'workspace_id', 'event_id', 'idempotency_key', 'claim_token', 'consumer_id']
const privateStringValue = /"(?:correlation_id|csrf|account_ref|workspace_id|event_id|idempotency_key|claim_token|consumer_id)"\s*:\s*"(?:[^"\\]|\\.)+"/i
const privateBindingValue = /"binding_version"\s*:\s*(?:[1-9][0-9]*|"[^"\\]+")/i
const privateContentValue = /"private_content"\s*:\s*(?:"(?:[^"\\]|\\.)+"|\{\s*"text"\s*:\s*"(?:[^"\\]|\\.)+")/i
// Inspect decoded literals, never execute/evaluate expressions or strip comments.
// Runtime expressions, aliases and dynamic computed keys are not data-flow verified.
function inspectCsrfLiterals(code) {
  const source = ts.createSourceFile('asset.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  if (source.parseDiagnostics.length) throw new Error('public redaction check error: bundle:javascript-parse')
  const unwrap = (node) => node && ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node
  const name = (node) => {
    node = unwrap(node)
    if (!node) return null
    if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text.toLowerCase()
    if (ts.isComputedPropertyName(node)) return ts.isStringLiteralLike(unwrap(node.expression)) ? unwrap(node.expression).text.toLowerCase() : null
    if (ts.isPropertyAccessExpression(node)) return name(node.name)
    if (ts.isElementAccessExpression(node)) return ts.isStringLiteralLike(unwrap(node.argumentExpression)) ? unwrap(node.argumentExpression).text.toLowerCase() : null
    return null
  }
  let secrets = 0
  let runtimeExpressions = 0
  const inspect = (key, value) => {
    if (name(key) !== 'csrf' || !value) return
    value = unwrap(value)
    if (ts.isStringLiteralLike(value)) {
      if (/^[A-Za-z0-9._~+/=-]{16,}$/.test(value.text)) secrets++
    } else if (value.kind !== ts.SyntaxKind.NullKeyword) runtimeExpressions++
  }
  const visit = (node) => {
    // Parameters cover functions/arrows/methods/constructors. Binding elements
    // cover object/array declaration and parameter defaults, including aliases.
    if (ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) inspect(node.name, node.initializer)
    if (ts.isBindingElement(node) && node.propertyName) inspect(node.propertyName, node.initializer)
    if (ts.isShorthandPropertyAssignment(node)) inspect(node.name, node.objectAssignmentInitializer)
    // In an assignment pattern, { csrf: local = "literal" } pairs the
    // property key with the default as well as the local binding name.
    if (ts.isPropertyAssignment(node)) {
      const value = unwrap(node.initializer)
      if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsToken) inspect(node.name, value.right)
    }
    // All 16 AssignmentOperator tokens: reject embedded RHS secret literals,
    // including arithmetic/bitwise assignment, without asserting a runtime result.
    // Comparisons, equality and nonassignment logical expressions are excluded.
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) inspect(node.left, node.right)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return { secrets, runtimeExpressions }
}
const server = createOutcomeServer({ root: runtime, publicReadOnly: true, buildReceipt })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
try {
  const patterns = { localPath: new RegExp(LOCAL_ABSOLUTE_PATH_SOURCE), credential: /(?:https?:\/\/[^/\s:@]+:[^@\s/]+@|\bBearer\s+[A-Za-z0-9._-]{16,}|\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{16,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/i, rawIdentifier: /\b(?:task|turn|thread|session)[_-]?(?:id)?\s*(?::|=|\s)\s*(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{16,})/i, uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, fullHash: /\b(?:[0-9a-f]{40}|[0-9a-f]{64})\b/i }
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const check = async (base, label, localAssets = false) => {
    const api = (await Promise.all(['/api/dashboard', '/api/dashboard/cherry-note'].map(async (path) => (await fetch(`${base}${path}`)).text()))).join('\n')
    const html = localAssets ? readFileSync(join(candidateDist, 'index.html'), 'utf8') : await (await fetch(`${base}/cherry-note-dashboard`)).text()
    const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
    const assets = await Promise.all(assetPaths.map(async (path) => ({ path, text: localAssets ? readFileSync(join(candidateDist, path), 'utf8') : await fetch(`${base}${path}`).then((response) => { if (!response.ok) throw new Error('public redaction check error: bundle:asset-fetch'); return response.text() }) })))
    const bundle = assets.map((asset) => asset.text).join('\n')
    const syntax = assets.filter((asset) => /\.(?:mjs|cjs|js)(?:[?#]|$)/i.test(asset.path)).map((asset) => inspectCsrfLiterals(asset.text))
    if (!syntax.length) throw new Error('public redaction check error: bundle:javascript-assets-missing')
    const page = await browser.newPage(); await page.goto(`${base}/cherry-note-dashboard`); await page.getByText('프로젝트 여정', { exact: true }).waitFor(); const renderedUI = await page.locator('body').innerText(); await page.close()
    const surfaces = { api, html, bundle, renderedUI }
    const hits = Object.entries(surfaces).flatMap(([surface, text]) => Object.entries(patterns).flatMap(([name, pattern]) => pattern.test(text) ? [`${label}:${surface}:${name}`] : []))
    const privateValueHits = Object.entries({ api, html, renderedUI }).flatMap(([surface, text]) => [
      privateStringValue.test(text) ? `${label}:${surface}:private-string-value` : null,
      privateBindingValue.test(text) ? `${label}:${surface}:binding-version-value` : null,
      privateContentValue.test(text) ? `${label}:${surface}:private-content-value` : null,
    ].filter(Boolean))
    const csrfSecretHits = syntax.some((asset) => asset.secrets > 0) ? [`${label}:bundle:csrf-secret-literal`] : []
    hits.push(...privateValueHits, ...csrfSecretHits)
    if (hits.length) throw new Error(`public redaction failures: ${hits.join(', ')}`)
    console.log(`${label} G-6a/G-6b private response values=0; G-6c bundle value classes=0; G-6d csrf build secrets=0; G-6e routes=${Object.keys(privateResponseVocabulary).length}/6 values=${privateValueKeys.length}/10`)
    console.log(`G-6d syntax assets=${syntax.length}; nonliteral csrf expressions=${syntax.reduce((sum, asset) => sum + asset.runtimeExpressions, 0)}; dynamic data flow=unverified`)
  }
  try { await check(`http://127.0.0.1:${server.address().port}`, 'local', true); if (process.env.OUTCOME_PUBLIC_URL) await check(process.env.OUTCOME_PUBLIC_URL, 'public') } finally { await browser.close() }
} finally { server.close(); await once(server, 'close'); rmSync(runtime, { recursive: true, force: true }) }
