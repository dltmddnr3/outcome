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
    const storagePage = await browser.newPage({ viewport: {width,height:900} })
    let stored=null, writes=0, failSave=false
    await storagePage.route('**/api/**', async route=>{
      if(route.request().url().endsWith('/workspace')) return route.fulfill({json:{workspace:{}},headers:{'x-outcome-destination-csrf':'synthetic-only-csrf'}})
      if(route.request().method()==='PUT') {
        writes++
        if(failSave) return route.fulfill({status:503,json:{error:'destination_unavailable'}})
        const input=route.request().postDataJSON()
        stored={draftId:'00000000-0000-4000-8000-000000000001',revision:input.expectedRevision+1,document:JSON.parse(input.document),state:'draft',completionAuthority:false}
      }
      return route.fulfill({json:{draft:stored,completionAuthority:false}})
    })
    await storagePage.goto(`${base}/scripts/fixtures/destination-browser.html?storage`)
    await storagePage.getByRole('button',{name:'목적지 설정',exact:true}).click()
    await storagePage.getByRole('button',{name:/질문으로 시작/}).click()
    await storagePage.getByRole('textbox',{name:'직접 입력',exact:true}).fill('저장할 미완료 답변')
    await storagePage.getByRole('button',{name:'초안 저장',exact:true}).click()
    await storagePage.getByRole('status').filter({hasText:'초안 버전 1 저장됨'}).waitFor()
    assert.equal(stored.document.answers.problem,'저장할 미완료 답변')
    await storagePage.reload()
    await storagePage.getByRole('button',{name:'목적지 설정',exact:true}).click()
    await storagePage.getByRole('button',{name:'서버 초안 불러오기 · 현재 입력 대체',exact:true}).click()
    await storagePage.getByRole('status').filter({hasText:'초안 버전 1 불러옴'}).waitFor()
    for(let index=0;index<7;index++) {
      await storagePage.getByRole('radio').first().check()
      await storagePage.getByRole('button',{name:index===6?'Destination 검토':'다음 질문',exact:true}).click()
    }
    await storagePage.getByText('저장할 미완료 답변',{exact:true}).waitFor()
    await storagePage.getByRole('button',{name:'문제 수정',exact:true}).click()
    await storagePage.getByRole('textbox',{name:'직접 입력',exact:true}).fill('실패해도 유지할 답변')
    failSave=true
    await storagePage.getByRole('button',{name:'초안 저장',exact:true}).click()
    await storagePage.getByRole('status').filter({hasText:'저장 결과를 확인하지 못했습니다'}).waitFor()
    assert.equal(await storagePage.getByRole('textbox',{name:'직접 입력',exact:true}).inputValue(),'실패해도 유지할 답변')
    assert.equal(await storagePage.getByRole('button',{name:'초안 저장',exact:true}).isDisabled(),true)
    assert.equal(writes,2)
    assert.equal(await storagePage.locator('.destination-studio').evaluate(node=>node.scrollWidth<=node.clientWidth),true)
    assert.equal(await storagePage.evaluate(()=>localStorage.length+sessionStorage.length),0)
    console.log(JSON.stringify({width,storageSaveReload:true,failurePreservesInput:true,writes,automaticRetry:false}))
    await storagePage.close()
    const analysisPage=await browser.newPage({viewport:{width,height:900}})
    let analysisRow=null,analysisWrites=0
    await analysisPage.route('**/api/**',async route=>{
      const request=route.request()
      if(request.url().endsWith('/workspace'))return route.fulfill({json:{workspace:{}},headers:{'x-outcome-destination-csrf':'synthetic-only-csrf'}})
      if(request.url().includes('/drafts/')){const body=request.postDataJSON();return route.fulfill({json:{draft:{draftId:request.url().split('/').at(-1),revision:1,document:JSON.parse(body.document),state:'draft',completionAuthority:false},completionAuthority:false}})}
      if(request.method()==='POST'){
        analysisWrites++;const body=request.postDataJSON()
        assert.deepEqual(Object.keys(body).sort(),['documentDigest','draftId','draftRevision'])
        analysisRow={requestId:request.url().split('/').at(-1),...body,state:'queued',result:null,completionAuthority:false}
      }else analysisRow={...analysisRow,state:'completed',result:{schemaVersion:1,documentDigest:analysisRow.documentDigest,draftRevision:1,proposals:[{field:'problem',value:'분산된 화면 때문에 결과를 놓침',quote:'여러 화면을 오가며 결과를 놓칩니다.',startLine:1,endLine:1,status:'needs_confirmation'}],conflicts:[],gaps:[],confirmedAnswers:{},semanticVerification:'owner_review_required',completionAuthority:false}}
      return route.fulfill({status:request.method()==='POST'?202:200,json:{analysis:analysisRow,completionAuthority:false}})
    })
    await analysisPage.goto(`${base}/scripts/fixtures/destination-browser.html?storage`)
    await analysisPage.getByRole('button',{name:'목적지 설정',exact:true}).click()
    await analysisPage.getByRole('button',{name:/기획서에서 빈칸 찾기/}).click()
    await analysisPage.getByRole('textbox',{name:'또는 내용 붙여넣기'}).fill('여러 화면을 오가며 결과를 놓칩니다.')
    await analysisPage.getByRole('button',{name:'초안 저장',exact:true}).click()
    await analysisPage.getByRole('status').filter({hasText:'초안 버전 1 저장됨'}).waitFor()
    await analysisPage.getByRole('button',{name:'저장한 문서 분석 요청',exact:true}).click()
    await analysisPage.getByRole('status').filter({hasText:'분석 요청 접수됨'}).waitFor()
    await analysisPage.getByRole('button',{name:'분석 결과 확인',exact:true}).click()
    await analysisPage.getByRole('status').filter({hasText:'문서 근거 확인됨'}).waitFor()
    await analysisPage.getByText('문제 · 미확정 제안',{exact:true}).waitFor()
    await analysisPage.getByRole('button',{name:'이 제안으로 답변 편집',exact:true}).click()
    assert.equal(await analysisPage.getByRole('textbox',{name:'직접 입력',exact:true}).inputValue(),'분산된 화면 때문에 결과를 놓침')
    assert.equal(analysisWrites,1)
    assert.equal(await analysisPage.locator('.destination-studio').evaluate(n=>n.scrollWidth<=n.clientWidth),true)
    console.log(JSON.stringify({width,referenceOnlyAnalysis:true,explicitProposalEdit:true,analysisWrites}))
    await analysisPage.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
