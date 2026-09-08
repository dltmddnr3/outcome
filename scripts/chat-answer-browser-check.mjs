// Synthetic local browser regression: no provider, account, or Planner dispatch.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const server = spawn(process.execPath, ['scripts/chat-browser-fixture.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] })
let browser
try {
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fixture_start_timeout')), 15000)
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`fixture_exit_${code}`)) })
    server.stdout.on('data', chunk => { const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+\/scripts\/fixtures\/chat-browser.html/); if (match) { clearTimeout(timer); resolve(match[0]) } })
  })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const width of [390, 1440]) for (const edited of [false, true]) for (const confirmation of ['answer', 'acknowledgement']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    let events = [], posts = 0
    await page.route('**/api/private/chat/**', async route => {
      const request = route.request()
      if (request.method() === 'POST') {
        posts++
        const correlation_id = request.headers()['idempotency-key']
        events = [{ event_id: 'event-0000000000000001', sequence: 1, observed_at: '2026-09-08T00:00:00.000Z', kind: 'user_message', state: 'queued', correlation_id, payload: { private_content: { text: request.postDataJSON().message } }, delivery: 'delivery_unknown', dispatch_state: 'invoked' }]
        return route.fulfill({ json: { accepted: true, event_id: events[0].event_id, sequence: 1, delivery: 'delivery_unknown', dispatch_state: 'invoked', execution_started: false, result_attached: false, evidence_attached: false } })
      }
      return route.fulfill({ json: { target: { role: 'planner', binding_version: 1 }, events, csrf: 'synthetic-csrf', completion_authority: false } })
    })
    await page.goto(url)
    await page.getByText('합성 호환 정보', { exact: true }).click()
    assert.equal(await page.locator('details.oc-v1-compatibility').getAttribute('open'), null)
    await page.getByRole('button', { name: 'Planner 대화 보기', exact: true }).click()
    assert.notEqual(await page.locator('details.oc-v1-compatibility').getAttribute('open'), null)
    assert.equal(await page.locator('#planner-conversation-title').evaluate(node => node === document.activeElement), true)
    const draft = page.getByLabel('Planner에게 메시지', { exact: true })
    await draft.fill('합성 수신 확인')
    await page.getByRole('button', { name: '메시지 보내기', exact: true }).click()
    await page.getByRole('button', { name: '수동으로 다시 시도', exact: true }).waitFor()
    if (edited) await draft.fill('보존해야 할 새로운 초안')
    if (confirmation === 'answer') events.push({ event_id: 'event-0000000000000002', sequence: 2, observed_at: '2026-09-08T00:00:01.000Z', kind: 'assistant_message', state: 'completed', correlation_id: events[0].correlation_id, payload: { private_content: { text: '합성 답변 확인' } } })
    else events[0].delivery = 'acknowledged'
    await page.getByRole('button', { name: '새로고침', exact: true }).click()
    const confirmationText = confirmation === 'answer' ? 'Planner 답변 확인됨' : '목적지 접수 확인'
    await page.locator('.planner-conversation__messages').getByText(confirmationText, { exact: true }).waitFor()
    await page.getByRole('button', { name: '수동으로 다시 시도', exact: true }).waitFor({ state: 'detached' })
    assert.equal(await draft.inputValue(), edited ? '보존해야 할 새로운 초안' : '')
    assert.equal(posts, 1, 'no automatic resend')
    assert.equal(events[0].delivery, confirmation === 'answer' ? 'delivery_unknown' : 'acknowledged', 'server receipt preserved')
    assert.deepEqual(errors, [])
    assert.equal(await page.locator('vite-error-overlay').count(), 0)
    await page.reload()
    await page.locator('.planner-conversation__messages').getByText(confirmationText, { exact: true }).waitFor()
    assert.equal(posts, 1)
    console.log(JSON.stringify({ width, edited, confirmation, confirmed: true, draftPreserved: true, retryRemoved: true, posts, reloadConfirmed: true }))
    await page.close()
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
