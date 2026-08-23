import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const port = 18787
const password = 'browser-check-password'
const server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, OUTCOME_PORT: String(port), OUTCOME_ACCESS_PASSWORD: password, OUTCOME_SESSION_SECRET: 'b'.repeat(32) }, stdio: 'ignore' })
const waitForServer = async () => { for (let attempt = 0; attempt < 50; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return } catch { /* retry */ } await new Promise((resolve) => setTimeout(resolve, 100)) } throw new Error('OUTCOME server did not start') }
try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${port}/cherry-note-dashboard`)
    await page.getByLabel('접근 암호').fill(password)
    await page.getByRole('button', { name: 'OUTCOME 열기' }).click()
    await page.getByText('진행 순서', { exact: false }).waitFor()
    const gate = page.locator('.cn-gate-groups button').first()
    if (await gate.count()) await gate.click()
    const geometry = await page.evaluate(() => {
      const detail = document.querySelector('.cn-scope-detail')?.getBoundingClientRect()
      const bottom = document.querySelector('.cn-bottom-grid')?.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, overlap: detail && bottom ? Math.max(0, detail.bottom - bottom.top) : 0, current: document.body.innerText.includes('현재 위치'), next: document.body.innerText.includes('다음 단계') }
    })
    if (geometry.overflow !== 0 || geometry.overlap !== 0 || !geometry.current || !geometry.next) throw new Error(`${viewport.name} geometry failed: ${JSON.stringify(geometry)}`)
    console.log(`${viewport.name} ${viewport.width}x${viewport.height}: overflow=0 overlap=0 current=true next=true`)
    await context.close()
  }
  await browser.close()
} finally { server.kill('SIGTERM') }
