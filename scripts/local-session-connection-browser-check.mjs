import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {chromium} from '@playwright/test'
import {createLocalSessionReceiver} from '../server/outcome-local-session-receiver.mjs'
import {createHash} from 'node:crypto'

// Synthetic owner token and rendered Preview origin; actual Chrome fetch goes
// to the real one-shot loopback receiver. No live account or deployed UI proof.
const origin='https://outcome-fixture-white-castle.vercel.app'
const granted=process.argv.includes('--grant-test-permission')
const approvalMode=process.argv.includes('--approval')
const grantJson=JSON.stringify({schemaVersion:2,projectId:'outcome',workId:'work-a',runId:'run-a',sessionRef:'session-a',bindingVersion:1,ownerRef:'d'.repeat(64),candidateCommit:'a'.repeat(40),candidateTree:'b'.repeat(40),allowedStages:['qa_verifying'],issuedAt:Date.now()-1000,expiresAt:Date.now()+60000,execution:{checkoutRef:'e'.repeat(64),readPaths:['src/main.ts'],writePaths:[],commands:[{id:'check',stage:'qa_verifying',program:'node',args:['--version'],timeoutMs:1000}]}})
const approval=approvalMode?{grantJson,digest:createHash('sha256').update(grantJson).digest('hex')}:null
const compiled=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{LocalWorkSessionConnection}from'./src/components/LocalWorkSessionConnection';createRoot(document.getElementById('root')).render(<LocalWorkSessionConnection getToken={async()=> 'fixture-session'}/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}})
const receiver=await createLocalSessionReceiver({previewOrigin:origin,verifySession:async token=>token==='fixture-session',timeoutMs:10000,approval})
let browser
try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage()
  // Simulate an explicit user permission only in this disposable test context.
  // Never change the user's browser, enterprise policy or security flags.
  if(granted)await page.context().grantPermissions(['local-network-access'],{origin})
  const errors=[]
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text().replace(/https?:\/\/[^\s'"]+/g,'[test-origin]'))})
  await page.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:`<html lang="ko"><div id="root"></div><script type="module">${compiled.outputFiles[0].text}</script></html>`}))
  await page.goto(origin+'/workspace#local-work-session='+Buffer.from(JSON.stringify(receiver.invitation)).toString('base64url'))
  await page.getByRole('button',{name:approvalMode?'실행 범위 불러오기':'이 기기의 실행기에 연결'}).click()
  if(approvalMode&&granted){
    await page.getByRole('checkbox').waitFor()
    assert.throws(()=>receiver.readToken(),/session_unavailable/)
    assert.equal(await page.getByRole('button',{name:'이 실행 범위 승인 전달'}).isDisabled(),true)
    assert((await page.locator('pre').innerText()).includes('src/main.ts'))
    await page.getByRole('checkbox').check()
    await page.getByRole('button',{name:'이 실행 범위 승인 전달'}).click()
  }
  if(!granted){
    await page.getByRole('status').filter({hasText:'연결을 확인하지 못했습니다.'}).waitFor({timeout:5000})
    assert.throws(()=>receiver.readToken(),/session_unavailable/)
    assert(errors.some(error=>error.includes('Permission was denied')))
    console.log('Chrome denied-permission guard PASS; no session connected')
  }else{
  try{await page.getByRole('status').filter({hasText:approvalMode?'승인을 실행기에 전달했습니다.':'로그인 연결을 확인했습니다.'}).waitFor({timeout:5000})}
  catch(error){console.log(JSON.stringify({status:await page.getByRole('status').innerText(),errors}));throw error}
  assert.equal((await receiver.ready).outcome,'session_connected')
  assert.equal(receiver.readToken(),'fixture-session')
  assert.equal(new URL(page.url()).hash,'')
  assert(!(await page.locator('body').innerText()).includes('fixture-session'))
  console.log('Chrome explicit local session connection PASS; synthetic identity only')
  }
}finally{receiver.dispose();await browser?.close()}
