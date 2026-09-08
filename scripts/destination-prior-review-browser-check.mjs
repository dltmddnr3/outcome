import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from '@playwright/test'
import {discoveryContextDigest} from '../server/outcome-destination-discovery-repository.mjs'
const server=spawn(process.execPath,['scripts/chat-browser-fixture.mjs'],{stdio:['ignore','pipe','inherit']})
let browser
try{
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_timeout')),15000);server.once('exit',()=>{clearTimeout(timer);reject(Error('fixture_exit'))});server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127.0.0.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}})})
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const width of [390,1440])for(const mode of ['success','pending','ambiguous','private']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const draftId='00000000-0000-4000-8000-000000000001'
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'새 문제',targetUser:'소유자',outcome:'결과',scope:'내부 사용',nonGoals:'출시',constraints:'기존 권한',acceptance:'실제 확인',failureRecovery:'입력 보존'},unknowns:['기술 검토 필요']}
  const context={mode:document.mode,source:'',seedAnswers:{...document.answers,problem:'이전 문제'},unknowns:document.unknowns,answers:[{questionId:'q-1',gapId:'owner',value:'팀'}],askedQuestionIds:['q-1'],revision:2}
  let discovery={draftId,revision:2,intakeRevision:1,context,contextDigest:discoveryContextDigest(context),state:'draft',completionAuthority:false},puts=0
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname,method=route.request().method();let body
   if(path.endsWith('/workspace'))body={workspace:{}}
   else if(path.includes('/drafts/')){assert.equal(method,'GET');body={draft:{draftId,revision:2,document,state:'draft',completionAuthority:false},completionAuthority:false}}
   else if(path.includes('/discovery/')){
    if(method==='PUT'){
     puts++;const input=route.request().postDataJSON(),next=JSON.parse(input.context)
     assert.equal(input.expectedRevision,2);assert.equal(input.intakeRevision,2);assert.equal(next.revision,3)
     assert.deepEqual(next.answers,context.answers);assert.deepEqual(next.askedQuestionIds,context.askedQuestionIds);assert.deepEqual(next.unknowns,context.unknowns);assert.deepEqual(next.seedAnswers,document.answers)
     discovery={...discovery,intakeRevision:2,revision:3,context:next,contextDigest:discoveryContextDigest(next)}
     if(mode==='ambiguous'){await route.abort('failed');return}
    }else assert.equal(method,'GET')
    body={discovery,completionAuthority:false}
   }else if(path.includes('/review/')){
    assert.equal(method,'GET');body={review:{contextDigest:discovery.contextDigest,contextRevision:discovery.revision,intakeRevision:discovery.intakeRevision,decisions:[{...context.answers[0],prompt:mode==='private'?'password=synthetic-private':'누가 사용하나요?',sourceContextRevision:1}],sourceVerification:'required',completionAuthority:false},completionAuthority:false}
   }else if(path.includes('/questions/')){
    assert.equal(method,'GET')
    const receipt={schemaVersion:1,contextDigest:discovery.contextDigest,coverage:[],questions:[{id:'q-2',gapId:'offline',domain:'infrastructure',prompt:'오프라인에서는?',choices:['보관','차단'],recommendation:'보관',reason:'요청 보존',material:true}],completionAuthority:false}
    body={questions:mode==='pending'?{contextDigest:discovery.contextDigest,contextRevision:2,receipt:JSON.stringify(receipt),sourceVerification:'required',completionAuthority:false}:null,completionAuthority:false}
   }else throw Error(`unexpected fixture route ${path}`)
   await route.fulfill({status:200,contentType:'application/json',headers:{'x-outcome-destination-csrf':'synthetic'},body:JSON.stringify(body)})
  })
  await page.goto(`${base}/scripts/fixtures/destination-browser.html?storage`)
  await page.getByRole('button',{name:'목적지 설정',exact:true}).click();await page.getByRole('button',{name:'서버 초안 불러오기 · 현재 입력 대체',exact:true}).click()
  await page.getByRole('button',{name:'후속 답변 불러오기',exact:true}).click()
  await page.getByText('연결 상태 또는 저장 결과를 확인하지 못했습니다.',{exact:false}).waitFor()
  const open=page.getByRole('button',{name:'이전 버전 후속 답변 비교',exact:true})
  await open.click()
  const panel=page.getByRole('region',{name:'이전 버전 후속 답변 비교',exact:true})
  if(mode==='private'){
   await page.getByText('연결 상태 또는 저장 결과를 확인하지 못했습니다.',{exact:false}).waitFor()
   assert.equal(await panel.count(),0);assert.equal((await page.locator('body').innerText()).includes('synthetic-private'),false)
  }else{
   await panel.getByText('이전: 이전 문제',{exact:true}).waitFor();await panel.getByText('현재: 새 문제',{exact:true}).waitFor();await panel.getByText('팀',{exact:true}).waitFor()
   for(const [field,value] of Object.entries(context.seedAnswers)){
    assert.equal(await panel.getByText(`이전: ${value}`,{exact:true}).isVisible(),true)
    assert.equal(await panel.getByText(`현재: ${document.answers[field]}`,{exact:true}).isVisible(),true)
   }
   const comparisonSession=await page.context().newCDPSession(page),comparisonAx=await comparisonSession.send('Accessibility.getFullAXTree')
   assert.ok(comparisonAx.nodes.some(n=>n.name?.value==='기본 초안 버전 1 → 2 · 후속 답변 버전 2'));await comparisonSession.detach()
   assert.equal(puts,0);assert.equal(await page.getByRole('region',{name:'Destination 확정 요청',exact:true}).count(),0)
   if(mode==='pending'){
    await panel.getByText('이전 맥락에 미답변 질문이 남아 갱신을 보류합니다.',{exact:false}).waitFor()
    assert.equal(await panel.getByRole('checkbox').count(),0)
   }else{
    const checkbox=panel.getByRole('checkbox'),update=panel.getByRole('button',{name:'기존 답변 보존하여 버전 갱신',exact:true})
    assert.equal(await checkbox.isChecked(),false);assert.equal(await update.isDisabled(),true)
    await checkbox.check();await panel.getByRole('button',{name:'비교 닫기',exact:true}).click();assert.equal(puts,0)
    await open.click();await checkbox.waitFor();assert.equal(await checkbox.isChecked(),false)
    await checkbox.check();await update.click()
    if(mode==='ambiguous'){
     await panel.getByText('갱신 결과를 확인하지 못했습니다.',{exact:false}).waitFor();assert.equal(await update.isDisabled(),true)
     await page.getByRole('button',{name:'후속 답변 불러오기',exact:true}).click()
    }
    await page.getByText('보관된 후속 답변 1개',{exact:false}).waitFor();assert.equal(await panel.count(),0);assert.equal(puts,1)
    assert.equal(discovery.revision,3);assert.equal(discovery.intakeRevision,2)
   }
   const cdp=await page.context().newCDPSession(page),ax=await cdp.send('Accessibility.getFullAXTree')
   assert.ok(ax.nodes.some(n=>String(n.name?.value??'').includes(mode==='pending'?'미답변 질문이 남아':'보관된 후속 답변')));await cdp.detach()
  }
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  console.log(JSON.stringify({width,mode,puts,actualStudio:true,preserved:true,noAutomaticUpdate:true,overflow:false,pageErrors:0}))
  await page.close()
 }
}finally{await browser?.close();server.kill('SIGTERM')}
