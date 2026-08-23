import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { LOCAL_ABSOLUTE_PATH_SOURCE } from '../server/cherry-note-dashboard.mjs'
import { createOutcomeServer } from '../server/index.mjs'

const server = createOutcomeServer({ publicReadOnly: true })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
try {
  const patterns = { localPath: new RegExp(LOCAL_ABSOLUTE_PATH_SOURCE), credential: /(?:https?:\/\/[^/\s:@]+:[^@\s/]+@|\bBearer\s+[A-Za-z0-9._-]{16,}|\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{16,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/i, rawIdentifier: /\b(?:task|turn|thread|session)[_-]?(?:id)?\s*(?::|=|\s)\s*(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{16,})/i, uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, fullHash: /\b(?:[0-9a-f]{40}|[0-9a-f]{64})\b/i }
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const check = async (base, label, localAssets = false) => {
    const api = await (await fetch(`${base}/api/dashboard`)).text()
    const html = localAssets ? readFileSync('dist/index.html', 'utf8') : await (await fetch(`${base}/cherry-note-dashboard`)).text()
    const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
    const bundle = (await Promise.all(assetPaths.map((path) => localAssets ? readFileSync(join('dist', path), 'utf8') : fetch(`${base}${path}`).then((response) => response.text())))).join('\n')
    const page = await browser.newPage(); await page.goto(`${base}/cherry-note-dashboard`); await page.getByText('목적과 다음 경계', { exact: false }).waitFor(); const renderedUI = await page.locator('body').innerText(); await page.close()
    const surfaces = { api, html, bundle, renderedUI }
    const hits = Object.entries(surfaces).flatMap(([surface, text]) => Object.entries(patterns).flatMap(([name, pattern]) => pattern.test(text) ? [`${label}:${surface}:${name}`] : []))
    if (hits.length) throw new Error(`public redaction failures: ${hits.join(', ')}`)
    console.log(`${label} boundary PASS: API/HTML/bundle/rendered UI prohibited identifiers=0`)
  }
  try { await check(`http://127.0.0.1:${server.address().port}`, 'local', true); if (process.env.OUTCOME_PUBLIC_URL) await check(process.env.OUTCOME_PUBLIC_URL, 'public') } finally { await browser.close() }
} finally { server.close(); await once(server, 'close') }
