import assert from 'node:assert/strict'
import {readFileSync,existsSync,createReadStream} from 'node:fs'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {resolve,extname} from 'node:path'
import {chromium} from '@playwright/test'
const root=resolve(process.env.OUTCOME_COMPARE_DIST??'dist')
const baseline=process.env.OUTCOME_BASELINE==='1'
const snapshot=JSON.parse(readFileSync('snapshot/outcome-package-source.json','utf8'))
snapshot.build={repository:'OUTCOME',ref:'candidate',commit:null,tree:null,asset:null,runtimeNowPinned:false}
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname
 if(pathname.startsWith('/api/')){
  const body=pathname==='/api/auth/session'?{authenticated:true,publicReadOnly:true}:pathname==='/api/dashboard'?{dashboard:snapshot}:pathname==='/api/private/config'?{enabled:false}:{}
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(body));return
 }
 const candidate=resolve(root,'.'+pathname)
 const path=candidate.startsWith(root+'/')&&existsSync(candidate)&&extname(candidate)?candidate:root+'/index.html'
 res.writeHead(200,{'content-type':({'.js':'application/javascript','.css':'text/css','.html':'text/html'})[extname(path)]??'application/octet-stream'});createReadStream(path).pipe(res)
})
server.listen(0,'127.0.0.1');await once(server,'listening')
let browser
try{
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const context=snapshot.projects.find(project=>project.project.id==='outcome').resultView.source_projection
 const originalConflicts=[{code:'map_primary_narrative_stale',map_value:'Slice A A1-A4 OPEN',gate_value:'13/13 evidence closure'}]
 for(const coherent of [false,true]){
 context.conflicts=coherent?[]:structuredClone(originalConflicts)
 for(const viewport of [{width:1440,height:900},{width:430,height:932},{width:390,height:844},{width:375,height:812},{width:320,height:568}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/cherry-note-dashboard`,{waitUntil:'networkidle'})
  assert.equal(await page.locator('#oc-planner-conversation').evaluate(element=>element.closest('details.oc-v1-compatibility')===null),true,'primary composer must not be inside compatibility disclosure')
  assert.equal(await page.locator('.oc-approval-rail').evaluate(element=>element.closest('details.oc-v1-compatibility')===null),true,'approval inbox must not be inside compatibility disclosure')
  const compatibility=page.locator('.oc-v1-compatibility > summary')
  if(await compatibility.count())await compatibility.click()
  const block=page.locator('[data-source-context="true"]');
  if(await block.count()===0){console.log(JSON.stringify({diagnostic:(await page.locator('body').innerText()).slice(0,1600),errors}));throw Error('source_context_not_rendered')}
  await block.waitFor({state:'visible',timeout:5000})
  const sourceDetails=block.locator('.oc-source-context-details')
  assert.equal(await sourceDetails.getAttribute('open'),null)
  if(!coherent)assert.equal(await block.getByText('진행 기록이 서로 다릅니다. 원본을 대조하기 전에는 완료 여부를 확정할 수 없습니다.',{exact:true}).isVisible(),true)
  await sourceDetails.locator('summary').focus();await page.keyboard.press('Enter')
  assert.notEqual(await sourceDetails.getAttribute('open'),null)
  const text=await block.innerText()
  const expected='Phase 3 집계 차이 · Map 문서 기록 38/43 · 현재 후보의 연결 Gate 집계 17/43. 문서 기록을 현재 후보의 검증 완료율로 사용하지 않습니다.'
  assert.equal(text.includes(expected),!baseline)
  const session=await page.context().newCDPSession(page)
  const ax=await session.send('Accessibility.getFullAXTree')
  assert.equal(ax.nodes.some(node=>node.name?.value===expected),!baseline)
  for(const literal of ['38/43','5/6','completionAuthority=false'])assert.ok(ax.nodes.some(node=>node.name?.value===literal),literal)
  for(const literal of ['Map · Slice A A1-A4 OPEN','Gate · 13/13 evidence closure']){
   assert.equal(text.includes(literal),!coherent,literal)
   assert.equal(ax.nodes.some(node=>node.name?.value===literal),!coherent,literal)
  }
  assert.equal(await block.getAttribute('data-source-conflict'),coherent?null:'Slice A A1-A4 OPEN|13/13 evidence closure')
  assert.equal(errors.length,0)
  const panels=page.locator('.oc-workbench > [data-workspace-panel]')
  assert.equal(await panels.count(),3)
  if(viewport.width<1100){
   for(const label of ['대화','승인','지도']){
    await page.getByRole('navigation',{name:'모바일 작업공간'}).getByRole('button',{name:label,exact:true}).click()
    for(const panel of ['지도','대화','승인'])assert.equal(await page.locator(`.oc-workbench > [data-workspace-panel="${panel}"]`).isVisible(),panel===label)
   }
  }else{
   const boxes=await panels.evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}))
   assert.ok(boxes.every(box=>box.width>0&&box.height>0))
   assert.ok(boxes[0].right<=boxes[1].x+1&&boxes[1].right<=boxes[2].x+1,'desktop map/inbox/chat must remain nonoverlapping peers')
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)
  if(!baseline)assert.equal(overflow,0,'document must not overflow horizontally')
  if(overflow>0)console.log(JSON.stringify({overflowElements:await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,cls:e.className,rect:e.getBoundingClientRect()})).filter(x=>x.rect.right>innerWidth&&x.rect.width>0).slice(0,12).map(x=>({tag:x.tag,cls:x.cls,right:x.rect.right,width:x.rect.width})))}))
  console.log(JSON.stringify({baseline,coherent,viewport,visible:true,rawAXExact:true,originalLiterals:coherent?3:5,pageErrors:errors.length,overflow}))
  await page.close()
 }
 }
}finally{await browser?.close();server.close();await once(server,'close')}
