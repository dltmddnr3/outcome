import { once } from 'node:events'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createOutcomeServer, readBuildReceipt } from '../server/index.mjs'
import { collectOutcomePackages } from '../server/outcome-package.mjs'
import { verifyAllDashboardStates } from './browser-assertions.mjs'

const repositoryRoot = resolve('.')
const candidateDist = resolve(process.env.OUTCOME_CANDIDATE_DIST ?? 'dist')
if (!existsSync(join(candidateDist, 'index.html'))) throw new Error(`candidate build missing: ${candidateDist}`)
const runtime = mkdtempSync(join(tmpdir(), 'outcome-portfolio-browser-'))
symlinkSync(candidateDist, join(runtime, 'dist'), 'dir')
const html = readFileSync(join(candidateDist, 'index.html'), 'utf8')
const receipt = { ...readBuildReceipt(), asset: html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] ?? null }
const registryPath = join(repositoryRoot, 'test', 'fixtures', 'portfolio-registry.json')
const server = createOutcomeServer({ root: runtime, publicReadOnly: true, buildReceipt: receipt, collectPackages: () => collectOutcomePackages({ environment: { ...process.env, OUTCOME_PROJECT_REGISTRY: registryPath }, repositoryRoot }) })
server.listen(0, '127.0.0.1'); await once(server, 'listening')
try {
  const base = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  try {
    for (const viewport of [{ name: 'portfolio-desktop-1440x900', width: 1440, height: 900 }, { name: 'portfolio-mobile-390x844', width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport }); const page = await context.newPage()
      await page.goto(`${base}/cherry-note-dashboard`); await verifyAllDashboardStates(page, viewport.name); await context.close()
    }
  } finally { await browser.close() }
} finally { server.close(); await once(server, 'close'); rmSync(runtime, { recursive: true, force: true }) }
