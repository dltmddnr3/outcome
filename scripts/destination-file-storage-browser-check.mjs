import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {once} from 'node:events'
import {build} from 'esbuild'
import {chromium} from '@playwright/test'
import {PGlite} from '@electric-sql/pglite'
import {createOutcomeServer} from '../server/index.mjs'
import {createDestinationDraftRepository} from '../server/outcome-destination-postgres.mjs'
import {createDestinationConfirmationRepository} from '../server/outcome-destination-confirmation-repository.mjs'

// Disposable Chrome → real HTTP handlers → scoped SQL, synthetic identity only.
// No semantic verifier is supplied: confirmation must remain unavailable.
const origin='https://outcome-fixture-white-castle.vercel.app'
const useOutcomeInput=process.argv.includes('--outcome-input')
const outcomeInput=useOutcomeInput?await readFile(new URL('../docs/OUTCOME_FILE_MVP_DOGFOOD.md',import.meta.url),'utf8'):null
const compiled=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{DestinationStudio}from'./src/components/DestinationStudio';import{fetchPrivateWorkspace}from'./src/lib/api';await fetchPrivateWorkspace('fixture-owner');createRoot(document.getElementById('root')).render(<DestinationStudio open onClose={()=>{}}/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,outdir:'fixture-build',format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'}})
const js=compiled.outputFiles.find(file=>file.path.endsWith('.js')).text,css=compiled.outputFiles.find(file=>file.path.endsWith('.css')).text
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 for(const width of [1280,390]){
  const db=await PGlite.create('memory://')
  let server,page
  try{
   await db.exec('create role anon nologin;create role authenticated nologin;')
   for(const file of ['20260908011009_outcome_destination_private_drafts.sql','20260908042838_outcome_destination_discovery_drafts.sql','20260908044800_outcome_discovery_question_receipts.sql','20260908072037_outcome_destination_confirmations.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
   const transact=work=>db.transaction(async tx=>{await tx.exec('set local role outcome_destination_backend');return work({query:(sql,args)=>tx.query(sql,args)})})
   const identity={authenticate:async token=>{if(token!=='fixture-owner')throw Error('denied')},resolveBridgeAuthority:async()=>({workspace_id:'workspace',account_ref:'owner',project_ids:['outcome']})}
   server=createOutcomeServer({publicReadOnly:true,accountAccess:identity,destinationRuntime:{allowedOrigin:origin,csrfSecret:'fixture-csrf',repository:createDestinationDraftRepository({transact}),confirmationRepository:createDestinationConfirmationRepository({transact})}})
   server.listen(0,'127.0.0.1');await once(server,'listening')
   page=await browser.newPage({viewport:{width,height:900}})
   await page.context().addCookies([{name:'__session',value:'fixture-owner',url:origin,secure:true,httpOnly:true,sameSite:'Lax'}])
   const mutations=[]
   await page.route(origin+'/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname
    if(path==='/api/private/workspace')return route.fulfill({contentType:'application/json',headers:{'x-outcome-destination-csrf':'fixture-csrf'},body:'{"workspace":{}}'})
    if(path.startsWith('/api/private/destination/')){
     if(request.method()!=='GET')mutations.push(request.method())
     const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:request.method(),headers:{...await request.allHeaders(),host:`127.0.0.1:${server.address().port}`,origin},...(request.postData()?{body:request.postData()}: {})})
     if(!response.ok)console.log('fixture HTTP',request.method(),response.status,(await response.clone().json()).error)
     return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})
    }
    return route.fulfill({contentType:'text/html',body:`<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script type="module">${js}</script></html>`})
   })
   await page.goto(origin+'/workspace')
   await page.getByRole('button',{name:/기획 파일로 시작/}).click()
   const source=outcomeInput??['문제','대상 사용자','결과','범위','비목표','제약','수용 기준','복구'].map(label=>`# ${label}\n확인된 ${label}`).join('\n')
   await page.locator('input[type=file]').setInputFiles({name:'plan.md',mimeType:'text/markdown',buffer:Buffer.from(source)})
   assert.equal(await page.getByRole('button',{name:'초안 저장',exact:true}).isDisabled(),true)
   await page.getByRole('button',{name:'기획 내용 확인',exact:true}).click()
   await page.getByRole('button',{name:'초안 저장',exact:true}).click()
   await page.getByText('초안 버전 1 저장됨',{exact:false}).waitFor()
   await page.reload()
   await page.getByRole('button',{name:'서버 초안 불러오기 · 현재 입력 대체'}).click()
   await page.getByText('초안 버전 1 불러옴',{exact:false}).waitFor()
   assert.equal(await page.getByRole('textbox',{name:'또는 내용 붙여넣기'}).inputValue(),source)
   await page.getByRole('button',{name:'기획 내용 확인',exact:true}).click()
   await page.getByRole('button',{name:'확정 요청 기록 조회'}).click()
   await page.getByRole('button',{name:'현재 초안 근거 검증'}).click()
   await page.getByText('현재 초안의 근거 내용을 검증하는 연결이 아직 준비되지 않았습니다.',{exact:false}).waitFor()
   assert.equal(await page.getByRole('checkbox').count(),0)
   assert.deepEqual(mutations,['PUT'])
   assert.equal((await db.query('select count(*)::int n from outcome_destination_private.confirmations')).rows[0].n,0)
  }finally{await page?.close();server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));await db.close()}
 }
 console.log('PASS 2 Chrome→HTTP→SQL file save/reload/review cases; one save, no confirmation without evidence')
}finally{await browser.close()}
