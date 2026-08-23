import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const port = 18787
const server = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, OUTCOME_PORT: String(port), OUTCOME_PUBLIC_READ_ONLY: '1' }, stdio: 'ignore' })
const waitForServer = async () => { for (let attempt = 0; attempt < 50; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return } catch { /* retry */ } await new Promise((resolve) => setTimeout(resolve, 100)) } throw new Error('OUTCOME server did not start') }
try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${port}/cherry-note-dashboard`)
    await page.getByText('목적과 다음 경계', { exact: false }).waitFor()
    await page.getByRole('button', { name: /Cherry Note/ }).click()
    await page.locator('[data-project-id="cherry-note"]').waitFor()
    await page.getByRole('button', { name: /Stage 33 Engineering and Build 41 Evidence/ }).click()
    await page.getByText('57/57', { exact: true }).first().waitFor()
    await page.getByText('링크 미리보기', { exact: true }).waitFor()
    await page.getByRole('button', { name: /OUTCOME/ }).click()
    await page.locator('[data-project-id="outcome"]').waitFor()
    await page.getByText('Generic source model', { exact: false }).first().waitFor()
    const geometry = await page.evaluate(() => {
      const detail = document.querySelector('.oc-detail')?.getBoundingClientRect()
      const main = document.querySelector('.oc-main')?.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, overlap: detail && main ? Math.max(0, main.bottom - detail.top) : 0, current: document.body.innerText.includes('현재 위치'), next: document.body.innerText.includes('다음 Stage'), purpose: ['PHASE 목적', 'SCOPE 목적', 'STAGE 목적', 'GATE 목적'].every((label) => document.body.innerText.includes(label)), position: detail ? getComputedStyle(document.querySelector('.oc-detail')).position : 'missing' }
    })
    if (geometry.overflow !== 0 || geometry.overlap !== 0 || !geometry.current || !geometry.next || !geometry.purpose || geometry.position !== 'relative') throw new Error(`${viewport.name} geometry failed: ${JSON.stringify(geometry)}`)
    console.log(`${viewport.name} ${viewport.width}x${viewport.height}: overflow=0 overlap=0 switch=true purpose=true current=true next=true inline=true`)
    await context.close()
  }
  await browser.close()
} finally { server.kill('SIGTERM') }
