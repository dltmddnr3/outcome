import { chromium } from '@playwright/test'

const publicUrl = process.env.OUTCOME_PUBLIC_URL
if (!publicUrl?.startsWith('https://')) throw new Error('OUTCOME_PUBLIC_URL must be an HTTPS URL')

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  for (const viewport of [{ name: 'remote-desktop', width: 1440, height: 900 }, { name: 'remote-mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(`${publicUrl}/cherry-note-dashboard`, { waitUntil: 'networkidle' })
    await page.getByText('진행 순서', { exact: false }).waitFor()
    const gate = page.locator('.cn-gate-groups button').first()
    if (await gate.count()) await gate.click()
    const result = await page.evaluate(() => {
      const detail = document.querySelector('.cn-scope-detail')?.getBoundingClientRect()
      const bottom = document.querySelector('.cn-bottom-grid')?.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, overlap: detail && bottom ? Math.max(0, detail.bottom - bottom.top) : 0, current: document.body.innerText.includes('현재 위치'), next: document.body.innerText.includes('다음 단계'), publicLabel: document.body.innerText.includes('공개 read-only') }
    })
    if (result.overflow !== 0 || result.overlap !== 0 || !result.current || !result.next || !result.publicLabel) throw new Error(`${viewport.name} failed: ${JSON.stringify(result)}`)
    console.log(`${viewport.name} ${viewport.width}x${viewport.height}: overflow=0 overlap=0 current=true next=true public=true`)
    await context.close()
  }
} finally { await browser.close() }
