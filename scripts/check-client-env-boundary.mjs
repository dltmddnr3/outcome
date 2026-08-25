import { readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import sealedSource from '../snapshot/outcome-package-source.json' with { type: 'json' }

const output = '.outcome-runtime/client-env-boundary-dist'
const synthetic = Object.freeze({
  VITE_VERCEL_GIT_COMMIT_SHA: '0123456789abcdef0123456789abcdef01234567',
  VITE_VERCEL_GIT_COMMIT_MESSAGE: 'SYNTHETIC_PRIVATE_DEPLOYMENT_MESSAGE',
  VITE_VERCEL_GIT_COMMIT_REF: 'synthetic-private-ref',
})
const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', output, '--emptyOutDir'], {
  cwd: process.cwd(),
  env: { ...process.env, ...synthetic },
  encoding: 'utf8',
})
if (build.status !== 0) throw new Error(`client env boundary build failed\n${build.stdout}\n${build.stderr}`)

const assets = readdirSync(`${output}/assets`)
const bundle = assets.filter((name) => /\.(?:js|css)$/.test(name)).map((name) => readFileSync(`${output}/assets/${name}`, 'utf8')).join('\n')
const leaked = Object.entries(synthetic).filter(([, value]) => bundle.includes(value)).map(([name]) => name)
if (leaked.length) throw new Error(`Vercel client metadata leaked into production bundle: ${leaked.join(', ')}`)
for (const marker of ['oauth_google', 'oauth_apple', '/workspace/sso-callback']) {
  if (!bundle.includes(marker)) throw new Error(`Clerk browser integration missing after client env filtering: ${marker}`)
}
const privatePayloadMarkers = sealedSource.projects.flatMap((project) => [project.project.outcome, project.phases?.[0]?.purpose, project.phases?.[0]?.scopes?.[0]?.stages?.[0]?.gate?.gates?.[0]?.title]).filter((value) => typeof value === 'string' && value.length > 24)
if (privatePayloadMarkers.some((marker) => bundle.includes(marker))) throw new Error('sealed Package projection leaked into public client assets')
if (bundle.includes('허용 범위 · Cherry Note / OUTCOME')) throw new Error('private project allowlist leaked into public client copy')
console.log(`client env boundary PASS: Vercel Git metadata leaks=0; sealed Package payload leaks=0/${privatePayloadMarkers.length}; Clerk browser markers=3; assets=${assets.length}`)
