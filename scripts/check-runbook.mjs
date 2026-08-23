import { readFileSync } from 'node:fs'

const text = readFileSync('docs/REMOTE_ACCESS.md', 'utf8')
const required = ['Tailscale Serve', 'HTTPS', 'authentication', 'Mac Mini', 'OUTCOME_ACCESS_PASSWORD', 'OUTCOME_SESSION_SECRET', 'offline', 'rollback', 'anonymous']
const missing = required.filter((value) => !text.toLowerCase().includes(value.toLowerCase()))
if (missing.length) throw new Error(`runbook missing: ${missing.join(', ')}`)
console.log('runbook PASS: private HTTPS, identity, secrets, offline monitoring, and rollback are explicit')
