import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from '@playwright/test'
import {discoveryContextDigest} from '../server/outcome-destination-discovery-repository.mjs'
const server=spawn(process.execPath,['scripts/chat-browser-fixture.mjs'],{stdio:['ignore','pipe','inherit']})
let browser
try{
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_timeout')),15000);server.once('exit',()=>{clearTimeout(timer);reject(Error('fixture_exit'))});server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127.0.0.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}})})
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const width of [390,1440])for(const mode of ['success','unavailable','ambiguous-recorded','ambiguous-missing','creation-missing','creation-unavailable','creation-timeout']){
  const selected=process.argv.find(arg=>arg.startsWith('--mode='))?.slice(7);if(selected&&mode!==selected)continue
  if(width===1440&&mode==='creation-timeout')continue
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const draftId='00000000-0000-4000-8000-000000000001'
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제',targetUser:'소유자',outcome:'결과',scope:'내부 사용',nonGoals:'출시',constraints:'기존 권한',acceptance:'실제 확인',failureRecovery:'입력 보존'},unknowns:[]}
  const context={mode:document.mode,source:'',seedAnswers:document.answers,unknowns:[],answers:[],askedQuestionIds:[],revision:1}
  const discovery={draftId,revision:1,intakeRevision:1,context,contextDigest:discoveryContextDigest(context),state:'draft',completionAuthority:false}
  const challenge={reviewDigest:'b'.repeat(64),intakeRevision:1,contextRevision:1,completionAuthority:false,executionAuthority:false}
  let posts=0,reads=0,prepares=0,creationReads=0,receipt=null
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname,method=route.request().method();let body
   if(path.endsWith('/workspace'))body={workspace:{}}
   else if(path.includes('/drafts/')){assert.equal(method,'GET');body={draft:{draftId,revision:1,document,state:'draft',completionAuthority:false},completionAuthority:false}}
   else if(path.includes('/discovery/')){assert.equal(method,'GET');body={discovery,completionAuthority:false}}
   else if(path.includes('/review/')){assert.equal(method,'GET');body={review:{contextDigest:discovery.contextDigest,contextRevision:1,intakeRevision:1,decisions:[],sourceVerification:'required',completionAuthority:false},completionAuthority:false}}
   else if(path.includes('/confirmation-review/')){
    assert.equal(method,'GET');prepares++
    if(mode==='unavailable'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"destination_unavailable"}'});return}
    body={confirmationReview:challenge,completionAuthority:false}
   }else if(path.includes('/creations/')){
    assert.equal(method,'GET');creationReads++
    if(mode==='creation-timeout')return
    if(mode==='creation-unavailable'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"destination_unavailable"}'});return}
    body={creation:mode==='creation-missing'?null:{projectId:`destination-${'a'.repeat(64)}`,requestId:receipt.requestId,reviewDigest:receipt.reviewDigest,state:'package_registered',completionAuthority:false,executionAuthority:false},completionAuthority:false}
   }else if(path.includes('/confirmations/')){
    if(method==='POST'){
     posts++;const input=route.request().postDataJSON()
     assert.deepEqual(Object.keys(input).sort(),['confirmed','requestId','reviewDigest']);assert.equal(input.confirmed,true);assert.equal(input.reviewDigest,challenge.reviewDigest)
     if(mode!=='ambiguous-missing')receipt={...challenge,draftId,requestId:input.requestId,state:'creation_requested'}
     if(mode.startsWith('ambiguous')){await route.abort('failed');return}
    }else{assert.equal(method,'GET');reads++}
    body={confirmation:receipt,completionAuthority:false}
   }else throw Error(`unexpected fixture route ${path}`)
   await route.fulfill({status:200,contentType:'application/json',headers:{'x-outcome-destination-csrf':'synthetic'},body:JSON.stringify(body)})
  })
  const open=async()=>{
   await page.getByRole('button',{name:'목적지 설정',exact:true}).click()
   await page.getByRole('button',{name:'서버 초안 불러오기 · 현재 입력 대체',exact:true}).click()
   await page.getByRole('button',{name:'후속 답변 불러오기',exact:true}).click()
   await page.getByText('보관된 후속 답변 0개',{exact:false}).waitFor()
   await page.getByRole('button',{name:'저장된 추가 결정 검토',exact:true}).click()
   await page.getByRole('region',{name:'목적지 확정 요청',exact:true}).waitFor()
  }
  await page.goto(`${base}/scripts/fixtures/destination-browser.html?storage`);await open()
  const panel=page.getByRole('region',{name:'목적지 확정 요청',exact:true}),prepare=panel.getByRole('button',{name:'현재 초안 근거 검증',exact:true}),read=panel.getByRole('button',{name:'확정 요청 기록 조회',exact:true})
  assert.equal(posts,0);assert.equal(reads,0);assert.equal(prepares,0);assert.equal(await prepare.isDisabled(),true)
  await read.click();await page.getByText('기존 확정 요청이 없습니다.',{exact:false}).waitFor();await prepare.click()
  if(mode==='unavailable'){
   await panel.getByText('현재 초안의 근거 검증 결과를 확인하지 못했습니다.',{exact:false}).waitFor()
   assert.equal(await panel.getByRole('checkbox').count(),0);assert.equal(posts,0)
  }else{
   const checkbox=panel.getByRole('checkbox'),confirm=panel.getByRole('button',{name:'이 버전으로 확정 요청',exact:true})
   await checkbox.waitFor();assert.equal(await checkbox.isChecked(),false);assert.equal(await confirm.isDisabled(),true)
   assert.ok(await checkbox.locator('..').evaluate(node=>node.getBoundingClientRect().height>=44))
   await checkbox.check();await panel.getByRole('button',{name:'확정 취소',exact:true}).click()
   assert.equal(posts,0);assert.equal(await checkbox.count(),0)
   await prepare.click();await checkbox.waitFor();assert.equal(await checkbox.isChecked(),false)
   await checkbox.check();await confirm.click()
   if(mode.startsWith('ambiguous')){
    await panel.getByText('요청 결과를 확인하지 못했습니다.',{exact:false}).waitFor()
    assert.equal(await prepare.isDisabled(),true);await read.click()
    if(mode==='ambiguous-missing'){
     await panel.getByText('이번 요청 기록이 아직 확인되지 않습니다.',{exact:false}).waitFor()
     assert.equal(await prepare.isDisabled(),true);assert.equal(await confirm.count(),0)
    }
   }
   if(mode!=='ambiguous-missing'){
    await panel.getByText('확정 요청 기록됨 · 생성 결과 별도 확인',{exact:true}).waitFor()
    const creationNotice=mode==='creation-missing'?'프로젝트 등록 결과가 아직 확인되지 않았습니다. 실행 중인지 추정하지 않습니다.':['creation-unavailable','creation-timeout'].includes(mode)?'생성 결과를 확인하지 못했습니다. 재생성하지 않고 조회만 다시 시도할 수 있습니다.':'프로젝트 등록이 확인되었습니다.'
    try{await panel.getByText(creationNotice,{exact:true}).waitFor()}catch(error){await page.screenshot({path:'/tmp/outcome-creation-ui-failure.png'});console.log(JSON.stringify({width,mode,creationReads,visible:await page.locator('body').innerText()}));throw error}
    assert.ok(await panel.getByRole('button',{name:'생성 결과 다시 조회',exact:true}).evaluate(node=>node.getBoundingClientRect().height>=44))
    if(mode!=='creation-timeout'){
     const beforeRefresh=creationReads;await panel.getByRole('button',{name:'생성 결과 다시 조회',exact:true}).click();await panel.getByText(creationNotice,{exact:true}).waitFor()
     assert.equal(creationReads,beforeRefresh+1);assert.equal(posts,1)
    }else{assert.equal(creationReads,1);assert.equal(await panel.getByRole('button',{name:'생성 결과 다시 조회',exact:true}).isEnabled(),true)}
    assert.equal(await prepare.count(),0);assert.equal(await confirm.count(),0)
    if(mode!=='creation-timeout'){await page.reload();await open();await read.click()}
    await panel.getByText('확정 요청 기록됨 · 생성 결과 별도 확인',{exact:true}).waitFor()
    await panel.getByText(creationNotice,{exact:true}).waitFor()
    const permission=panel.locator(':scope > details')
    assert.equal(await permission.getAttribute('open'),null)
    await permission.locator('summary').focus();await page.keyboard.press('Enter')
    assert.notEqual(await permission.getAttribute('open'),null)
    const cdp=await page.context().newCDPSession(page),ax=await cdp.send('Accessibility.getFullAXTree')
    for(const text of ['확정 요청 기록됨 · 생성 결과 별도 확인',creationNotice,'completionAuthority=false'])assert.ok(ax.nodes.some(n=>n.name?.value===text))
    await cdp.detach()
    if(mode==='success'){await panel.getByRole('region',{name:'프로젝트 생성 결과',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/outcome-creation-ui-${width}.png`})}
   }
   assert.equal(posts,1)
  }
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.equal(await page.locator('vite-error-overlay').count(),0)
  console.log(JSON.stringify({width,mode,posts,reads,prepares,creationReads,actualStudio:true,noAutomaticConfirmation:true,overflow:false,pageErrors:0}))
  await page.close()
 }
}finally{await browser?.close();server.kill('SIGTERM')}
