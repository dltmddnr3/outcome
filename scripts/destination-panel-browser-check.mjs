import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from '@playwright/test'
import {parseDiscoveryContext,discoveryContextDigest} from '../server/outcome-destination-discovery-repository.mjs'
const server=spawn(process.execPath,['scripts/chat-browser-fixture.mjs'],{stdio:['ignore','pipe','inherit']})
let browser
try{
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_timeout')),15000);server.once('exit',()=>{clearTimeout(timer);reject(Error('fixture_exit'))});server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127.0.0.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}})})
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const width of [390,1440])for(const requestFailure of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900}})
  let discovery=null,writes=0,questionPosts=0;const runs=new Map();const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const draftId='00000000-0000-4000-8000-000000000001'
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제',targetUser:'소유자',outcome:'결과',scope:'내부 사용',nonGoals:'출시',constraints:'기존 권한',acceptance:'실제 확인',failureRecovery:'입력 보존'},unknowns:['검증 필요']}
  const draft={draftId,revision:1,document,state:'draft',completionAuthority:false}
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname
   let body
   if(path.endsWith('/workspace'))body={workspace:{}}
   else if(path.includes('/drafts/')){assert.equal(route.request().method(),'GET');body={draft,completionAuthority:false}}
   else if(path.includes('/discovery/')){
    if(route.request().method()==='PUT'){
     const input=route.request().postDataJSON(),context=parseDiscoveryContext(input.context)
     assert.equal(input.expectedRevision,discovery?.revision??0);writes++
     discovery={draftId,revision:input.expectedRevision+1,intakeRevision:1,context,contextDigest:discoveryContextDigest(context),state:'draft',completionAuthority:false}
    }
    body={discovery,completionAuthority:false}
   }else if(path.includes('/question-requests/')){
    if(route.request().method()==='POST'){
     const input=route.request().postDataJSON();assert.deepEqual(Object.keys(input),['contextDigest']);assert.equal(input.contextDigest,discovery.contextDigest);questionPosts++
     if(requestFailure){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'destination_unavailable'})});return}
     const row={requestId:'00000000-0000-4000-8000-000000000010',draftId,contextDigest:input.contextDigest,contextRevision:discovery.revision,state:'queued',completionAuthority:false}
     body={questionRequest:row,completionAuthority:false}
     // Synthetic worker completion is fixture-only, never production code.
     runs.set(input.contextDigest,{...row,state:'completed'})
    }else body={questionRequest:runs.get(discovery?.contextDigest)??null,completionAuthority:false}
   }else if(path.includes('/questions/')){
    assert.equal(route.request().method(),'GET')
    const receipt={schemaVersion:1,contextDigest:discovery?.contextDigest,coverage:[],questions:[{id:'q-1',gapId:'owner',domain:'system_boundary',prompt:'결과 확인 담당자는 누구인가요?',choices:['소유자','내부 팀'],recommendation:'소유자',reason:'확인 주체를 정합니다.',material:true}],completionAuthority:false}
    body={questions:discovery?.revision===1&&runs.has(discovery.contextDigest)?{contextDigest:discovery.contextDigest,contextRevision:1,receipt:JSON.stringify(receipt),sourceVerification:'required',completionAuthority:false}:null,completionAuthority:false}
   }else throw Error(`unexpected fixture route ${path}`)
   await route.fulfill({status:200,contentType:'application/json',headers:{'x-outcome-destination-csrf':'synthetic'},body:JSON.stringify(body)})
  })
  const open=async()=>{await page.getByRole('button',{name:'목적지 설정',exact:true}).click();await page.getByRole('button',{name:'서버 초안 불러오기 · 현재 입력 대체',exact:true}).click();await page.getByRole('heading',{name:'목적지 심화 질문',exact:true}).waitFor()}
  await page.goto(`${base}/scripts/fixtures/destination-browser.html?storage`);await open()
  assert.equal(await page.getByRole('button',{name:'후속 질문 준비 시작',exact:true}).isDisabled(),true)
  await page.getByRole('button',{name:'후속 답변 불러오기',exact:true}).click()
  await page.getByRole('button',{name:'후속 질문 준비 시작',exact:true}).click()
  await page.getByRole('button',{name:'현재 후속 질문 확인',exact:true}).click()
  await page.getByRole('button',{name:'Planner 후속 질문 요청',exact:true}).click()
  if(requestFailure){
   await page.getByText('연결 상태 또는 저장 결과를 확인하지 못했습니다. 입력을 유지하고 자동 재시도하지 않습니다.',{exact:true}).waitFor()
   const requestButton=page.getByRole('button',{name:'Planner 후속 질문 요청',exact:true})
   assert.equal(await requestButton.isDisabled(),true)
   // Read the unchanged UI through separate browser turns; no timers or retry trigger.
   await page.getByRole('heading',{name:'목적지 심화 질문',exact:true}).focus()
   assert.equal(await requestButton.isDisabled(),true)
   assert.equal(await page.getByRole('radio').count(),0)
   assert.equal(questionPosts,1);assert.equal(writes,1);assert.deepEqual(errors,[])
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   console.log(JSON.stringify({width,actualStudio:true,requestFailure:true,requestHeld:true,questionPosts,writes,noInventedQuestion:true}))
   await page.close();continue
  }
  await page.getByText('요청 접수 · 실행 대기',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Planner 후속 질문 요청',exact:true}).isDisabled(),true)
  await page.getByRole('button',{name:'현재 후속 질문 확인',exact:true}).click()
  await page.getByRole('radio',{name:/소유자/}).check()
  await page.getByRole('button',{name:'후속 답변 저장',exact:true}).click()
  await page.getByText('보관된 후속 답변 1개',{exact:false}).waitFor()
  assert.equal(writes,2);assert.equal(discovery.context.answers[0].value,'소유자')
  await page.reload();await open();await page.getByRole('button',{name:'후속 답변 불러오기',exact:true}).click()
  await page.getByText('보관된 후속 답변 1개',{exact:false}).waitFor()
  await page.getByRole('button',{name:'현재 후속 질문 확인',exact:true}).click()
  await page.getByText('아직 현재 맥락의 Planner 질문이 없습니다.',{exact:false}).waitFor()
  assert.equal(await page.getByRole('radio').count(),0);assert.equal(writes,2)
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.equal(questionPosts,1)
  console.log(JSON.stringify({width,actualStudio:true,initializedOnce:true,answered:true,reloadPreserved:true,writes,questionPosts,noInventedNextQuestion:true}));await page.close()
 }
}finally{await browser?.close();server.kill('SIGTERM')}
