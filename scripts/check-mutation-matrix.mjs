import { once } from 'node:events'
import { createOutcomeServer } from '../server/index.mjs'

const paths = ['/api/dashboard', '/api/dashboard/cherry-note', '/api/auth/login', '/api/auth/logout', '/api/unknown', '/cherry-note-dashboard']
const methods = ['POST', 'PUT', 'PATCH', 'DELETE']
const check = async (base, label) => { let count = 0; for (const path of paths) for (const method of methods) { const response = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: '{}' }); if (response.status !== 405 || JSON.stringify(await response.json()) !== JSON.stringify({ error: 'read_only' })) throw new Error(`${label} ${method} ${path} failed`); count += 1 } console.log(`${label} mutation ${count}/24 = 405 read_only`) }

const server = createOutcomeServer({ publicReadOnly: true })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
try { await check(`http://127.0.0.1:${server.address().port}`, 'local'); if (process.env.OUTCOME_PUBLIC_URL) await check(process.env.OUTCOME_PUBLIC_URL, 'public') } finally { server.close(); await once(server, 'close') }
