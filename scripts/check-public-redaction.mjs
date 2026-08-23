import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createOutcomeServer } from '../server/index.mjs'

const server = createOutcomeServer({ publicReadOnly: true })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const api = await (await fetch(`${base}/api/dashboard`)).text()
  const html = readFileSync('dist/index.html', 'utf8')
  const assets = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((match) => readFileSync(join('dist', 'assets', match[1]), 'utf8')).join('\n')
  const surfaces = { api, html, bundle: assets }
  const patterns = { localPath: /(?:\/Users\/|\/home\/|[A-Za-z]:\\)/, credential: /(?:https?:\/\/[^/\s:@]+:[^@\s/]+@|\bBearer\s+[A-Za-z0-9._-]{16,}|\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{16,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/i, rawIdentifier: /\b(?:task|turn|thread|session)[_-]?(?:id)?\s*(?::|=|\s)\s*(?:[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{16,})/i, uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, fullHash: /\b(?:[0-9a-f]{40}|[0-9a-f]{64})\b/i }
  const hits = Object.entries(surfaces).flatMap(([surface, text]) => Object.entries(patterns).flatMap(([name, pattern]) => pattern.test(text) ? [`${surface}:${name}`] : []))
  if (hits.length) throw new Error(`public redaction failures: ${hits.join(', ')}`)
  console.log('public boundary PASS: API/HTML/bundle prohibited identifiers=0')
} finally { server.close(); await once(server, 'close') }
