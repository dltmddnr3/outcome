import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {once} from 'node:events'
import {chromium} from '@playwright/test'
import {createOutcomeServer} from '../server/index.mjs'
import {createAccountModelV2Projection} from '../server/account-model-v2-projection.mjs'
import {createDecisionRecordService,createInMemoryDecisionRecordStore} from '../server/outcome-decision-record.mjs'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const decisions = [[null,null],['evidence_insufficient','근거 보완 필요'],['scope_not_authorized','승인 범위 밖'],['superseded_by_newer_observation','새 확인 내용으로 대체'],['defer_pending_external_input','외부 답변·자료 대기']]
try{for(const width of [390,1440]){for(const [reason,reasonLabel] of decisions){
 const dashboard=JSON.parse(readFileSync('snapshot/outcome-package-source.json','utf8'))
 dashboard.build={repository:'synthetic/outcome',ref:'test',commit:null,tree:null,asset:null,runtimeNowPinned:false}
 const modelV2=createAccountModelV2Projection({project:{id:'outcome',name:'OUTCOME',outcome:'safe result'},blocked:true,events:[{id:'event-blocked',sequence:1,role:'planner',type:'result_observed',summary:'승인 기록 브라우저 검증',observedAt:'2026-09-08T00:00:00.000Z',status:'safe_hold'}]},{observedAt:'2026-09-08T00:00:00.000Z'})
 let projects=dashboard.projects.map(project=>({...project,modelV2:project.project.id==='outcome'?modelV2:createAccountModelV2Projection(project,{observedAt:'2026-09-08T00:00:00.000Z'})}))
 const store=createInMemoryDecisionRecordStore()
 const runtime={allowedOrigin:'pending',csrfSecret:'synthetic-csrf-token',service:createDecisionRecordService({store})}
 const identity={authenticate:async(token)=>{assert.equal(token,'valid');return {subject:'owner'}},readWorkspace:async()=>({viewState:'ready',workspace:{id:'workspace'},projects,dashboard,completionAuthority:false})}
 const server=createOutcomeServer({publicReadOnly:true,accountAccess:identity,decisionRuntime:runtime})
 server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;runtime.allowedOrigin=base
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',error=>errors.push(error.message))
 try{
  await page.context().addCookies([{name:'__session',value:'valid',url:base}])
  await page.goto(`${base}/workspace`)
  if(process.env.OUTCOME_DECISION_DIAGNOSE==='1'){
    await page.waitForLoadState('networkidle')
    console.log(JSON.stringify({width,errors,state:await page.evaluate(()=>document.querySelector('[data-state-code]')?.getAttribute('data-state-code')??null),body:(await page.locator('body').innerText()).slice(0,600)}))
    continue
  }
  if(width<1100)await page.locator('.oc-workspace-tabs').getByRole('button',{name:'승인',exact:true}).click()
  const evidence=page.locator('.oc-approval-evidence')
  assert.equal(await evidence.getAttribute('open'),null)
  await page.getByRole('button',{name:'승인 기록',exact:true}).waitFor({state:'visible',timeout:10000})
  const evidenceAx=await page.context().newCDPSession(page)
  const rawNames=async()=> (await evidenceAx.send('Accessibility.getFullAXTree')).nodes.filter(node=>!node.ignored).map(node=>node.name?.value)
  assert.equal((await rawNames()).includes('고정된 버전'),false)
  await evidence.locator('summary').focus();await page.keyboard.press('Enter')
  assert.notEqual(await evidence.getAttribute('open'),null)
  assert.equal((await rawNames()).includes('고정된 버전'),true)
  assert.equal((await rawNames()).includes('원본 이력'),true)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'expanded evidence overflow')
  await page.keyboard.press('Enter');assert.equal(await evidence.getAttribute('open'),null)
  await evidenceAx.detach()
  if(reason)await page.getByRole('combobox',{name:'반려 사유',exact:true}).selectOption(reason)
  await page.getByRole('button',{name:reason?'반려 기록':'승인 기록',exact:true}).click()
  const dialog=page.getByRole('alertdialog',{name:'결정 기록 검토'});await dialog.waitFor()
  assert.equal((await dialog.innerText()).includes(' · 순번 '),true)
  assert.equal((await dialog.innerText()).includes(' · sequence '),false)
  assert.equal(store.snapshot().decisions.length,0)
  const ax=await (await page.context().newCDPSession(page)).send('Accessibility.getFullAXTree')
  assert.equal(ax.nodes.some(node=>node.role?.value==='alertdialog'&&node.name?.value==='결정 기록 검토'),true)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'whole dashboard overflow')
  await page.getByRole('button',{name:'확인 기록',exact:true}).click()
  await page.getByText('결정 기록됨 · 실행·완료·배포 승인이 아닙니다.',{exact:true}).waitFor()
  assert.equal(store.snapshot().decisions.length,1)
  await page.reload()
  if(width<1100)await page.locator('.oc-workspace-tabs').getByRole('button',{name:'승인',exact:true}).click()
  await page.getByText('결정 기록됨 · 실행·완료·배포 승인이 아닙니다.',{exact:true}).waitFor()
  assert.equal(store.snapshot().decisions.length,1);assert.deepEqual(errors,[])
  const history=page.getByRole('region',{name:'결정 기록 이력'})
  if(reason){
    await history.getByText(`반려 사유 · ${reasonLabel}`,{exact:true}).waitFor()
    assert.equal((await history.innerText()).includes(reason),false)
    const session=await page.context().newCDPSession(page)
    const raw=await session.send('Accessibility.getFullAXTree')
    assert.equal(raw.nodes.some(node=>!node.ignored&&String(node.name?.value??'').includes(reasonLabel)),true)
    await session.detach()
  }
  await history.getByText('event-blocked · 순번 1',{exact:true}).waitFor()
  projects=projects.map(project=>project.project.id==='outcome'?{...project,modelV2:createAccountModelV2Projection({project:{id:'outcome',name:'OUTCOME',outcome:'safe result'},events:[]},{observedAt:'2026-09-08T00:01:00.000Z'})}:project)
  await page.reload()
  if(width<1100)await page.locator('.oc-workspace-tabs').getByRole('button',{name:'승인',exact:true}).click()
  await history.getByText('event-blocked · 순번 1',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'승인 기록',exact:true}).count(),0)
  assert.equal(store.snapshot().decisions.length,1)
  console.log(`PASS built dashboard ${width}/${reason??'approved'}: review AX, zero-before-confirm, one record, Korean history, reload`)
 }finally{await page.close();server.close();await once(server,'close')}
}}}finally{await browser.close()}
