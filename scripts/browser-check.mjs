import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
import { assertDashboardMeasurement, exerciseDashboard, measureDashboard } from './browser-assertions.mjs'

const port = 18787
const server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, OUTCOME_PORT: String(port), OUTCOME_PUBLIC_READ_ONLY: '1' }, stdio: 'ignore' })
const waitForServer = async () => { for (let attempt = 0; attempt < 50; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return } catch { /* retry */ } await new Promise((resolve) => setTimeout(resolve, 100)) } throw new Error('OUTCOME server did not start') }
try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  for (const viewport of [{ name: 'desktop-1440x900', width: 1440, height: 900 }, { name: 'mobile-390x844', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${port}/cherry-note-dashboard`)
    await exerciseDashboard(page)
    assertDashboardMeasurement(viewport.name, await measureDashboard(page))
    await context.close()
  }
  await browser.close()
} finally { server.kill('SIGTERM') }
