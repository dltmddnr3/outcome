import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {chromium} from '@playwright/test'

// Real Chrome interaction with the production component; synthetic input only.
// No account, private API or live project mutation is part of this check.
const origin='https://outcome-fixture-white-castle.vercel.app'
const compiled=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{DestinationStudio}from'./src/components/DestinationStudio';createRoot(document.getElementById('root')).render(<DestinationStudio open onClose={()=>{}}/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,outdir:'fixture-build',format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'}})
const js=compiled.outputFiles.find(file=>file.path.endsWith('.js')).text
const css=compiled.outputFiles.find(file=>file.path.endsWith('.css')).text
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
let cases=0
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}])for(const conflict of [false,true]){
  const page=await browser.newPage({viewport})
  const mutations=[],errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route(origin+'/**',route=>{
   if(route.request().method()!=='GET'){mutations.push(route.request().method());return route.abort()}
   return route.fulfill({contentType:'text/html',body:`<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script type="module">${js}</script></html>`})
  })
  await page.goto(origin+'/workspace')
  assert.equal(await page.getByRole('button',{name:'질문으로 시작',exact:true}).count(),0)
  await page.getByRole('button',{name:/기획 파일로 시작/}).click()
  const source='# 문제\n작업 단절\n# 대상 사용자\n소유자\n# 결과\n완주 확인\n# 범위\n파일 등록'+(conflict?'\n# 범위\n다른 범위':'\n# 비목표\n외부 출시\n# 제약\n명시 승인\n# 수용 기준\n실사용 확인\n# 복구\n이번 변경만 복구')
  await page.locator('input[type=file]').setInputFiles({name:'plan.md',mimeType:'text/markdown',buffer:Buffer.from(source)})
  await page.getByRole('button',{name:'기획 내용 확인',exact:true}).click()
  const review=page.getByRole('region',{name:'기획 파일 검토'})
  await review.waitFor()
  const visible=await review.innerText()
  assert(visible.includes('완주 확인'))
  assert(visible.includes('개발 시작 승인이 아닙니다'))
  assert.equal(visible.includes('서로 다른 내용이 있어'),conflict)
  assert.equal(visible.includes('기획 파일에 내용을 보완해 주세요'),conflict)
  assert.equal(await page.getByRole('radio').count(),0)
  const cdp=await page.context().newCDPSession(page)
  const ax=await cdp.send('Accessibility.getFullAXTree')
  assert(ax.nodes.some(node=>node.name?.value==='개발할 내용을 확인해 주세요'))
  await page.getByRole('button',{name:'기획 파일 다시 넣기'}).click()
  assert.equal(await page.getByRole('textbox',{name:'또는 내용 붙여넣기'}).inputValue(),source)
  assert.deepEqual(mutations,[]);assert.deepEqual(errors,[])
  await page.close();cases++
 }
 console.log(`PASS ${cases} Chrome desktop/mobile file review cases; original text retained; no mutation; synthetic input only`)
}finally{await browser.close()}
