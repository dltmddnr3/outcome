import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from '@playwright/test'
import {parseDiscoveryContext,discoveryContextDigest} from '../server/outcome-destination-discovery-repository.mjs'
const server=spawn(process.execPath,['scripts/chat-browser-fixture.mjs'],{stdio:['ignore','pipe','inherit']})
let browser
try{
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_timeout')),15000);server.once('exit',()=>{clearTimeout(timer);reject(Error('fixture_exit'))});server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127.0.0.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}})})
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const width of [390,1440])for(const mode of ['success','failure','stale','private']){
  const page=await browser.newPage({viewport:{width,height:900}})
  let writes=0;const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/**',async route=>{
   if(route.request().url().endsWith('/workspace'))return route.fulfill({status:200,contentType:'application/json',headers:{'x-outcome-destination-csrf':'synthetic'},body:'{"workspace":{}}'})
   assert.equal(route.request().method(),'PUT');writes++
   const input=route.request().postDataJSON(),context=parseDiscoveryContext(input.context)
   assert.equal(context.answers.length,2);assert.deepEqual(context.askedQuestionIds,['q-1','q-2'])
   return route.fulfill({status:mode==='failure'?503:200,contentType:'application/json',body:JSON.stringify(mode==='failure'?{error:'unavailable'}:{discovery:{draftId:route.request().url().split('/').at(-1),revision:1,intakeRevision:1,context,contextDigest:discoveryContextDigest(context),state:'draft',completionAuthority:false},completionAuthority:false})})
  })
  await page.goto(`${base}/scripts/fixtures/destination-question-browser.html${['stale','private'].includes(mode)?`?${mode}`:''}`)
  const save=page.getByRole('button',{name:'후속 답변 저장',exact:true})
  if(mode==='stale'||mode==='private'){
   await page.getByText('현재 답변과 일치하는 질문을 확인하지 못했습니다.',{exact:false}).waitFor()
   assert.equal(await page.getByRole('radio').count(),0);assert.equal(await save.isDisabled(),true)
  }else{
   await page.getByRole('radio',{name:/소유자/}).waitFor()
   assert.equal(await page.getByRole('radio',{checked:true}).count(),0);assert.equal(await save.isDisabled(),true)
   await page.getByRole('radio',{name:/소유자/}).check();assert.equal(await save.isDisabled(),true)
   await page.getByRole('textbox',{name:/실패 시.*직접 입력/}).fill('사용자 입력을 보존하고 확인')
   await save.click()
   await page.getByText(mode==='failure'?'저장 결과를 확인하지 못했습니다.':'후속 답변이 저장되었습니다.',{exact:false}).waitFor()
   assert.equal(await save.isDisabled(),true);assert.equal(writes,1)
   assert.equal(await page.getByRole('textbox',{name:/실패 시.*직접 입력/}).inputValue(),'사용자 입력을 보존하고 확인')
  }
  assert.deepEqual(errors,[])
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  console.log(JSON.stringify({width,mode,writes,overflow:false}));await page.close()
 }
}finally{await browser?.close();server.kill('SIGTERM')}
