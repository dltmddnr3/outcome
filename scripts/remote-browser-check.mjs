import { chromium } from '@playwright/test'

const publicUrl = process.env.OUTCOME_PUBLIC_URL
if (!publicUrl?.startsWith('https://')) throw new Error('OUTCOME_PUBLIC_URL must be an HTTPS URL')

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  for (const viewport of [{ name: 'remote-desktop', width: 1440, height: 900 }, { name: 'remote-mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(`${publicUrl}/cherry-note-dashboard`, { waitUntil: 'networkidle' })
    await page.getByText('목적과 다음 경계', { exact: false }).waitFor()
    await page.getByRole('button', { name: /Cherry Note/ }).click()
    await page.locator('[data-project-id="cherry-note"]').waitFor()
    await page.getByRole('button', { name: /Stage 33 Engineering and Build 41 Evidence/ }).click()
    await page.getByText('57/57', { exact: true }).first().waitFor()
    await page.getByRole('button', { name: /OUTCOME/ }).click()
    await page.locator('[data-project-id="outcome"]').waitFor()
    const result = await page.evaluate(() => {
      const detail = document.querySelector('.oc-detail')?.getBoundingClientRect()
      const main = document.querySelector('.oc-main')?.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, overlap: detail && main ? Math.max(0, main.bottom - detail.top) : 0, current: document.body.innerText.includes('현재 위치'), next: document.body.innerText.includes('다음 Stage'), purpose: ['PHASE 목적', 'SCOPE 목적', 'STAGE 목적', 'GATE 목적'].every((label) => document.body.innerText.includes(label)), publicLabel: document.body.innerText.includes('공개 read-only') }
    })
    if (result.overflow !== 0 || result.overlap !== 0 || !result.current || !result.next || !result.purpose || !result.publicLabel) throw new Error(`${viewport.name} failed: ${JSON.stringify(result)}`)
    console.log(`${viewport.name} ${viewport.width}x${viewport.height}: overflow=0 overlap=0 switch=true purpose=true current=true next=true public=true`)
    await context.close()
  }
} finally { await browser.close() }
