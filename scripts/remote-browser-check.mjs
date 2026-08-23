import { chromium } from '@playwright/test'
import { assertDashboardMeasurement, exerciseDashboard, measureDashboard } from './browser-assertions.mjs'

const publicUrl = process.env.OUTCOME_PUBLIC_URL
if (!publicUrl?.startsWith('https://')) throw new Error('OUTCOME_PUBLIC_URL must be an HTTPS URL')
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  for (const viewport of [{ name: 'remote-desktop-1440x900', width: 1440, height: 900 }, { name: 'remote-mobile-390x844', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(`${publicUrl}/cherry-note-dashboard`, { waitUntil: 'networkidle' })
    await exerciseDashboard(page)
    assertDashboardMeasurement(viewport.name, await measureDashboard(page))
    await context.close()
  }
} finally { await browser.close() }
