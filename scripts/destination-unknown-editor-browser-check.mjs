import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from '@playwright/test'
const server=spawn(process.execPath,['scripts/chat-browser-fixture.mjs'],{stdio:['ignore','pipe','inherit']})
let browser
try{
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('fixture_timeout')),15000);server.once('exit',()=>{clearTimeout(timer);reject(Error('fixture_exit'))});server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127.0.0.1:\d+/);if(match){clearTimeout(timer);resolve(match[0])}})})
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const document={schemaVersion:1,mode:'guided_200q',source:'',answers:{problem:'문제',targetUser:'소유자',outcome:'결과',scope:'내부 사용',nonGoals:'출시',constraints:'기존 권한',acceptance:'실제 확인',failureRecovery:'입력 보존'},unknowns:['기술·실행 가능성 및 문서 의미 검증 미완료','연결 복구 정책']}
  let draft={draftId:'00000000-0000-4000-8000-000000000001',revision:1,document,state:'draft',completionAuthority:false},puts=0
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname,method=route.request().method();let body
   if(path.endsWith('/workspace'))body={workspace:{}}
   else if(path.includes('/drafts/')){
    if(method==='PUT'){puts++;const input=route.request().postDataJSON();assert.equal(input.expectedRevision,draft.revision);const value=typeof input.document==='string'?JSON.parse(input.document):input.document;draft={...draft,revision:draft.revision+1,document:value}}
    else assert.equal(method,'GET')
    body={draft,completionAuthority:false}
   }else throw Error(`unexpected fixture route ${path}`)
   await route.fulfill({status:200,contentType:'application/json',headers:{'x-outcome-destination-csrf':'synthetic'},body:JSON.stringify(body)})
  })
  const load=async()=>{await page.goto(`${base}/scripts/fixtures/destination-browser.html?storage`);await page.getByRole('button',{name:'목적지 설정',exact:true}).click();await page.getByRole('button',{name:'서버 초안 불러오기 · 현재 입력 대체',exact:true}).click();await page.getByText('목적지 초안을 확인해 주세요',{exact:true}).waitFor()}
  await load()
  const panel=page.getByRole('region',{name:'초안의 미상 목록 편집',exact:true}),open=panel.getByRole('button',{name:'미상 목록 수정',exact:true}),apply=panel.getByRole('button',{name:'목록 변경 적용 · 아직 미저장',exact:true})
  await open.click();await panel.getByRole('textbox').fill('취소할 변경');await panel.getByRole('button',{name:'목록 수정 취소',exact:true}).click();assert.equal(puts,0)
  await open.click();assert.equal(await panel.getByRole('textbox').inputValue(),document.unknowns.join('\n'))
  for(const [input,error] of [['가'.repeat(667),'각 항목은 UTF-8 기준 2000바이트 이하여야 합니다.'],[Array.from({length:201},(_,i)=>`항목 ${i}`).join('\n'),'항목은 최대 200개입니다.'],['중복\n중복','중복 항목을 정리해 주세요.'],['password=synthetic-private','민감한 값이나 로컬 경로를 제거해 주세요.'],['/Users/example/private','민감한 값이나 로컬 경로를 제거해 주세요.']]){
   await panel.getByRole('textbox').fill(input);await panel.getByRole('alert').getByText(error,{exact:true}).waitFor();assert.equal(await apply.isDisabled(),true);assert.equal(puts,0)
  }
  await panel.getByRole('textbox').fill('연결 복구 정책\n추가 확인 필요');assert.equal(await panel.getByRole('checkbox').isChecked(),false);assert.equal(await apply.isDisabled(),true)
  await panel.getByRole('checkbox').check();await panel.getByRole('textbox').fill('연결 복구 정책\n새 추가 확인');assert.equal(await panel.getByRole('checkbox').isChecked(),false)
  await panel.getByRole('checkbox').check();await apply.click();assert.equal(puts,0)
  assert.equal(await page.getByRole('button',{name:'후속 답변 불러오기',exact:true}).count(),0)
  await page.getByRole('region',{name:'잔여 미상',exact:true}).getByText('기술·실행 가능성 및 문서 의미 검증 미완료',{exact:true}).waitFor()
  await page.getByRole('button',{name:'초안 저장',exact:true}).click();await page.getByText('초안 버전 2 저장됨',{exact:false}).waitFor();assert.equal(puts,1);assert.deepEqual(draft.document.unknowns,['연결 복구 정책','새 추가 확인']);assert.deepEqual(draft.document.answers,document.answers)
  await load();await open.click();assert.equal(await panel.getByRole('textbox').inputValue(),'연결 복구 정책\n새 추가 확인')
  await panel.getByRole('textbox').fill('');assert.equal(await apply.isDisabled(),true);await panel.getByRole('checkbox').check();await apply.click();assert.equal(puts,1)
  await page.getByRole('button',{name:'초안 저장',exact:true}).click();await page.getByText('초안 버전 3 저장됨',{exact:false}).waitFor();assert.equal(puts,2);assert.deepEqual(draft.document.unknowns,[])
  await load();await panel.getByText('등록된 항목 없음 · 검증 완료를 뜻하지 않습니다.',{exact:true}).waitFor()
  const cdp=await page.context().newCDPSession(page),ax=await cdp.send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(node=>node.name?.value==='기술·실행 가능성 및 문서 의미 검증 미완료'));await cdp.detach()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[])
  console.log(JSON.stringify({width,puts,cancelAndApplyNoWrite:true,limits:true,explicitRemoval:true,reload:true,technicalBoundaryPreserved:true,overflow:false,pageErrors:0}))
  await page.close()
 }
}finally{await browser?.close();server.kill('SIGTERM')}
