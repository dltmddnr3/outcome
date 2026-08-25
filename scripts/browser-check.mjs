import { once } from 'node:events'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createOutcomeServer, readBuildReceipt } from '../server/index.mjs'
import { collectOutcomePackages, loadProjectRegistry } from '../server/outcome-package.mjs'
import { verifyAllDashboardStates } from './browser-assertions.mjs'

const repositoryRoot = resolve('.')
const isolatedDist = resolve('.outcome-runtime/candidate-dist')
const candidateDist = resolve(process.env.OUTCOME_CANDIDATE_DIST ?? (existsSync(join(isolatedDist, 'index.html')) ? isolatedDist : 'dist'))
if (!existsSync(join(candidateDist, 'index.html'))) throw new Error(`candidate build missing: ${candidateDist}`)
const runtime = mkdtempSync(join(tmpdir(), 'outcome-browser-runtime-'))
symlinkSync(candidateDist, join(runtime, 'dist'), 'dir')
const html = readFileSync(join(candidateDist, 'index.html'), 'utf8')
const receipt = { ...readBuildReceipt(), asset: html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] ?? null }
const fixtureRoot = join(repositoryRoot, 'test', 'fixtures')
const registryPath = join(fixtureRoot, 'portfolio-registry.json')
const environment = { ...process.env, OUTCOME_PROJECT_REGISTRY: registryPath }
const definitions = loadProjectRegistry({ environment, repositoryRoot })
if (!definitions.every(({ root }) => { const path = relative(fixtureRoot, root); return path && !path.startsWith('..') && !isAbsolute(path) })) throw new Error('browser fixture escaped tracked fixture root')
const fixturePackages = collectOutcomePackages({ environment, repositoryRoot })
const fixtureIds = fixturePackages.projects.map(({ project }) => project.id)
if (fixturePackages.projects.length !== 3 || fixturePackages.projects.some(({ status }) => status !== 'valid') || new Set(fixtureIds).size !== 3) throw new Error(`browser fixture invalid: count=${fixturePackages.projects.length} ids=${fixtureIds.join(',')}`)
const server = createOutcomeServer({ root: runtime, publicReadOnly: true, buildReceipt: receipt, collectPackages: () => fixturePackages })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  try {
    const screenshotDirectory = process.env.OUTCOME_BROWSER_SCREENSHOTS === '1' ? resolve('.outcome-runtime/split-workbench-screenshots') : null
    if (screenshotDirectory) mkdirSync(screenshotDirectory, { recursive: true })
    for (const viewport of [
      { name: 'desktop-1440x900', width: 1440, height: 900 },
      { name: 'tablet-1024x768', width: 1024, height: 768 },
      { name: 'mobile-390x844', width: 390, height: 844 },
      { name: 'mobile-360x800', width: 360, height: 800 },
      { name: 'phone-375x812', width: 375, height: 812 },
      { name: 'landscape-844x390', width: 844, height: 390 },
    ]) {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage(); await page.goto(`${base}/cherry-note-dashboard`); await verifyAllDashboardStates(page, viewport.name); if (screenshotDirectory && ['desktop-1440x900', 'mobile-390x844'].includes(viewport.name)) await page.screenshot({ path: join(screenshotDirectory, `${viewport.name}.png`), fullPage: true }); await context.close()
    }
    console.log(`browser fixture boundary PASS: registry=test/fixtures/portfolio-registry.json projects=${fixtureIds.join(',')} source=repository-contained deterministic fixture; live external source not exercised`)
  } finally { await browser.close() }
} finally { server.close(); await once(server, 'close'); rmSync(runtime, { recursive: true, force: true }) }
