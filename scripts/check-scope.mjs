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
const packageJson = JSON.parse(packageText)
const packageViolations = ['@slack/', 'google-auth-library'].filter((value) => packageText.includes(value))
if (packageViolations.length) throw new Error(`OUTCOME package violation: ${packageViolations.join(', ')}`)
if (packageJson.dependencies?.['@clerk/backend'] !== '3.16.12') throw new Error('OUTCOME identity runtime must pin the approved Clerk backend dependency')
if (packageJson.dependencies?.['@clerk/react'] !== '6.14.7') throw new Error('OUTCOME browser session runtime must pin the approved Clerk React dependency')
if (packageJson.dependencies?.pg !== '8.23.0') throw new Error('OUTCOME durable chat runtime must pin pg exactly')
if (Object.keys(packageJson.dependencies ?? {}).some((name) => name.startsWith('@supabase/'))) throw new Error('HP1 must not add a Supabase runtime dependency')
console.log(`scope PASS: ${files.length} product/runtime/test files; no Desk, Slack, relay, or unapproved provider dependencies; Clerk backend, React SDK, and pg pinned`)
