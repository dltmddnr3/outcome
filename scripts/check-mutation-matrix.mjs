import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { createOutcomeServer } from '../server/index.mjs'

const paths = ['/api/dashboard', '/api/dashboard/cherry-note', '/api/auth/login', '/api/auth/logout', '/api/unknown', '/cherry-note-dashboard']
const methods = ['POST', 'PUT', 'PATCH', 'DELETE']
const canonicalBody = '{"error":"read_only"}'

const isCanonicalReadOnly = (text) => {
  try { return JSON.stringify(JSON.parse(text)) === canonicalBody } catch { return false }
}

export function assertMutationResponse({ label, method, path, status, text }) {
  if (status !== 405) throw new Error(`${label} ${method} ${path} expected 405, received ${status}`)
  if (path.startsWith('/api/')) {
    if (!isCanonicalReadOnly(text)) throw new Error(`${label} ${method} ${path} expected API read-only JSON`)
    return
  }
  if (text.trim() && !isCanonicalReadOnly(text)) throw new Error(`${label} ${method} ${path} unexpected page mutation body`)
}

export async function checkMutationMatrix(base, label, fetchImpl = fetch) {
  let count = 0; let apiBodies = 0; let emptyPageBodies = 0
  for (const path of paths) for (const method of methods) {
    const response = await fetchImpl(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: '{}' })
    const text = await response.text()
    assertMutationResponse({ label, method, path, status: response.status, text })
    if (path.startsWith('/api/')) apiBodies += 1
    else if (!text.trim()) emptyPageBodies += 1
    count += 1
  }
  console.log(`${label} mutation ${count}/24 = 405; API read_only JSON=${apiBodies}/20; empty page boundary=${emptyPageBodies}/4`)
  return { count, apiBodies, emptyPageBodies }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createOutcomeServer({ publicReadOnly: true })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try {
    await checkMutationMatrix(`http://127.0.0.1:${server.address().port}`, 'local')
    if (process.env.OUTCOME_PUBLIC_URL) await checkMutationMatrix(process.env.OUTCOME_PUBLIC_URL, 'public')
  } finally { server.close(); await once(server, 'close') }
}
