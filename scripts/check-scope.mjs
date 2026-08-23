import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['src', 'server']
const files = []
const walk = (directory) => { for (const name of readdirSync(directory)) { const path = join(directory, name); statSync(path).isDirectory() ? walk(path) : files.push(path) } }
for (const root of roots) walk(root)
const text = files.map((path) => readFileSync(path, 'utf8')).join('\n')
const forbidden = ['@slack/', 'google-auth-library', 'account-relay', 'provider-auth', 'companion-registry', "from './App'", 'src/App.tsx']
const found = forbidden.filter((value) => text.includes(value))
if (found.length) throw new Error(`OUTCOME scope violation: ${found.join(', ')}`)
const packageText = readFileSync('package.json', 'utf8')
const packageViolations = ['@slack/', 'google-auth-library'].filter((value) => packageText.includes(value))
if (packageViolations.length) throw new Error(`OUTCOME package violation: ${packageViolations.join(', ')}`)
console.log(`scope PASS: ${files.length} product/runtime/test files; no Desk, Slack, relay, or provider dependencies`)
