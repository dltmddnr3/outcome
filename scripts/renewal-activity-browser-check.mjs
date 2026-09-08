// Synthetic UI only; no real account, provider, or message dispatch.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

const output = await build({ stdin: { contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {PlannerConversation} from './src/components/PlannerConversation';
const states=['active','blocked','failed','rejected','safe_hold','delivery_unknown'];
const events=states.map((status,index)=>({id:'event-'+index,sequence:index+1,role:'builder',type:'work_observed',summary:'원본 작업 기록 '+index,status,observedAt:'2026-09-09T00:00:00.000Z',completionAuthority:false}));
createRoot(document.getElementById('root')).render(<PlannerConversation events={events}/>);
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, format: 'esm', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } })
const css = readFileSync('src/styles.css','utf8')
const server = createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(output.outputFiles[0].text);return}
  if(req.url==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css);return}
  res.setHeader('Content-Type','text/html');res.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script type="module" src="/app.js"></script></html>')
})
server.listen(0,'127.0.0.1');await once(server,'listening')
let browser
try {
  browser=await chromium.launch({channel:'chrome',headless:true})
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'})
    const errors=[];page.on('pageerror',error=>errors.push(error.message))
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    const activities=page.locator('.planner-conversation__activity');await activities.first().waitFor()
    assert.equal(await activities.count(),6)
    assert.equal(await page.locator('.planner-conversation__activity[open]').count(),5)
    const session=await page.context().newCDPSession(page)
    const names=async()=> (await session.send('Accessibility.getFullAXTree')).nodes.filter(node=>!node.ignored).map(node=>node.name?.value)
    assert.equal((await names()).includes('원본 작업 기록 0'),false)
    for(let index=1;index<6;index++)assert.equal((await names()).includes('원본 작업 기록 '+index),true)
    await activities.first().locator('summary').focus();await page.keyboard.press('Enter')
    assert.equal((await names()).includes('원본 작업 기록 0'),true)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    assert.equal(await activities.first().locator('summary').evaluate(el=>el.getBoundingClientRect().height>=44),true)
    assert.deepEqual(errors,[])
    console.log(`PASS activity ${width}: routine collapsed, five warning states open, keyboard/raw AX, 44px, no overflow`)
    await session.detach();await page.close()
  }
}finally{await browser?.close();server.close();await once(server,'close')}
