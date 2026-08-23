import { readFileSync } from 'node:fs'

const text = readFileSync('docs/REMOTE_ACCESS.md', 'utf8')
const required = ['Cloudflare Quick Tunnel', 'HTTPS', 'OUTCOME_PUBLIC_READ_ONLY=1', 'Mac Mini', 'random URL', 'restart', 'no SLA', 'PID', 'offline', 'rollback', 'stable hosting']
const missing = required.filter((value) => !text.toLowerCase().includes(value.toLowerCase()))
if (missing.length) throw new Error(`runbook missing: ${missing.join(', ')}`)
console.log('runbook PASS: public Quick Tunnel, mode boundary, no-SLA lifecycle, offline monitoring, rollback, and stable-hosting follow-up are explicit')
