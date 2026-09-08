// Local synthetic inputs only: no owner data, provider or model calls.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
const server = spawn(process.execPath, ['scripts/chat-browser-fixture.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] })
let browser
try {
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fixture_timeout')), 15000)
    server.once('exit', () => { clearTimeout(timer); reject(new Error('fixture_exit')) })
    server.stdout.on('data', chunk => { const match = String(chunk).match(/http:\/\/127.0.0.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]) } })
  })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    let requests = 0
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/api/**', route => { requests++; return route.abort() })
    await page.goto(`${base}/scripts/fixtures/destination-browser.html`)
    await page.getByRole('button', { name: '목적지 설정', exact: true }).click()
    await page.getByRole('button', { name: /질문으로 시작/ }).click()
    for (let i = 0; i < 8; i++) {
      await page.getByRole('radio').first().check()
      await page.getByRole('button', { name: i === 7 ? 'Destination 검토' : '다음 질문', exact: true }).click()
      if (i === 0) {
        await page.getByRole('button', { name: '이전', exact: true }).click()
        assert.equal(await page.getByRole('radio').first().isChecked(), true)
        await page.getByRole('button', { name: '다음 질문', exact: true }).click()
      }
    }
    assert.equal(await page.locator('dl>div').count(), 8)
    assert.equal(await page.getByRole('button', { name: 'Destination 확정 · 연결 준비 중' }).isDisabled(), true)
    await page.getByRole('button', { name: '문제 수정', exact: true }).click()
    await page.getByRole('textbox', { name: '직접 입력', exact: true }).fill('수정한 사용자 문제')
    await page.getByRole('button', { name: 'Destination 검토', exact: true }).click()
    await page.getByText('수정한 사용자 문제', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('dialog').count(), 0)
    assert.equal(await page.getByRole('button', { name: '목적지 설정', exact: true }).evaluate(node => node === document.activeElement), true)
    await page.getByRole('button', { name: '목적지 설정', exact: true }).click()
    await page.getByText('수정한 사용자 문제', { exact: true }).waitFor()
    await page.reload()
    await page.getByRole('button', { name: '목적지 설정', exact: true }).click()
    await page.getByRole('button', { name: /기획서에서 빈칸 찾기/ }).click()
    const brief = page.getByRole('textbox', { name: '또는 내용 붙여넣기' })
    await brief.fill('문제: 첫 번째\n문제: 충돌\n대상 사용자: 나\n결과: 결과\n범위: 핵심\n비목표: 출시\n제약: 기존 경계\n수용 기준: 실제 사용\n복구: 되돌리기')
    await page.getByRole('button', { name: '빈칸 찾기', exact: true }).click()
    await page.getByText('1 / 1', { exact: true }).waitFor()
    await page.getByRole('radio').first().check()
    await page.getByRole('button', { name: 'Destination 검토', exact: true }).click()
    assert.equal(await page.locator('dl small').count(), 9)
    assert.equal(await page.locator('.destination-studio').evaluate(node => node.scrollWidth <= node.clientWidth), true)
    await page.reload()
    await page.getByRole('button', { name: '목적지 설정', exact: true }).click()
    await page.getByRole('button', { name: /기획서에서 빈칸 찾기/ }).click()
    await brief.fill('token=synthetic-not-a-real-secret')
    await page.getByRole('button', { name: '빈칸 찾기', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '민감한 값' }).waitFor()
    assert.equal(await page.locator('dl').count(), 0)
    await brief.fill('a'.repeat(65537))
    await page.getByRole('button', { name: '빈칸 찾기', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '64KB 이하' }).waitFor()
    await page.locator('input[type=file]').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('synthetic') })
    await page.getByRole('alert').filter({ hasText: '.txt 파일만' }).waitFor()
    await page.locator('input[type=file]').setInputFiles({ name: 'fixture.md', mimeType: 'text/markdown', buffer: Buffer.from('문제: 파일 입력') })
    await page.waitForFunction(() => document.querySelector('textarea')?.value === '문제: 파일 입력')
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
    assert.equal(requests, 0)
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ width, guided: true, backEditRetained: true, conflictQuestionOnly: true, sourceRanges: 9, confirmationDisabled: true, requests, overflow: false }))
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
