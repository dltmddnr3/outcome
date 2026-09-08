import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const entry=`import React from 'react'; import {createRoot} from 'react-dom/client'; import {DecisionControls} from '/src/components/DecisionControls.tsx'; import {fetchPrivateWorkspace} from '/src/lib/api.ts'; await fetchPrivateWorkspace(); createRoot(document.getElementById('root')).render(React.createElement(DecisionControls,{projectId:'outcome',eventId:'event-blocked',sequence:1}));`
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:0},esbuild:{jsx:'automatic'},optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime']},plugins:[{name:'decision-test-entry',resolveId(id){if(id==='/decision-entry.js')return '\0decision-entry'},load(id){if(id==='\0decision-entry')return entry},configureServer(server){server.middlewares.use('/__decision-test',(_req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="root"></div><script type="module" src="/decision-entry.js"></script></body></html>')})}}]})
await server.listen()
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
 for(const width of [390,1440])for(const scenario of ['success','failure','unavailable']){
  const page=await browser.newPage({viewport:{width,height:900}});let posts=0;const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/private/workspace',route=>route.fulfill({json:{workspace:{}},headers:scenario==='unavailable'?{}:{etag:'"synthetic"','x-outcome-csrf':'synthetic-csrf-token'}}))
  await page.route('**/api/private/decisions',async route=>{posts++;const input=route.request().postDataJSON();assert.equal(input.eventId,'event-blocked');await route.fulfill(scenario==='failure'?{status:503,json:{error:'decision_store_unavailable'}}:{status:201,json:{decisionState:'recorded',decisionId:'00000000-0000-4000-8000-000000000001',decision:input.decision,rejectionReason:input.rejectionReason,decidedAt:'2026-09-08T00:00:00.000Z',decisionActorClass:'owner',notice:'기록됨 · 전달은 이 범위 밖',supersedesId:null,completionAuthority:false}})})
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__decision-test`)
  const approve=page.getByRole('button',{name:'승인 기록',exact:true});await approve.waitFor()
  if(scenario==='unavailable'){assert.equal(await approve.isDisabled(),true);assert.equal(posts,0)}else{
   await approve.click();await page.getByRole('alertdialog').waitFor();assert.equal(posts,0)
   await page.keyboard.press('Escape');await page.getByRole('alertdialog').waitFor({state:'detached'})
   assert.equal(await approve.evaluate(element=>document.activeElement===element),true,'cancel restores trigger focus')
   await approve.click();await page.getByRole('button',{name:'확인 기록',exact:true}).click()
   await page.getByRole(scenario==='failure'?'alert':'status').waitFor()
   assert.equal(posts,1);assert.equal(await page.getByRole('button',{name:'확인 기록',exact:true}).count(),0)
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${width} ${scenario} posts=${posts}`);await page.close()
 }
}finally{await browser.close();await server.close()}
