import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { createPlannerThreadReader } from './outcome-chat-thread-reader.mjs'

const id='11111111-1111-4111-8111-111111111111'
function fixture(mode='success') {
  const writes=[]; let kills=0,spawns=0
  const child=new EventEmitter(); child.stdout=new EventEmitter(); child.stderr=new EventEmitter(); child.stdin=new EventEmitter()
  child.stdin.end=()=>{};child.kill=()=>{kills++}
  child.stdin.write=line=>{
    const request=JSON.parse(line);writes.push(request)
    queueMicrotask(()=>{
      if(mode==='timeout')return
      if(request.id===1)child.stdout.emit('data',Buffer.from(JSON.stringify({id:1,result:{userAgent:'test'}})+'\n'))
      if(request.id===2){
        if(mode==='malformed')child.stdout.emit('data',Buffer.from('bad json\n'))
        else {
          const data=Buffer.from(JSON.stringify({id:2,result:{thread:{id:mode==='mismatch'?'wrong':id,turns:[],name:'안녕'}}})+'\n')
          child.stdout.emit('data',data.subarray(0,data.length-5));child.stdout.emit('data',data.subarray(data.length-5))
        }
      }
      if(request.id>=3){
        const paged=['paged','cycle','bounded'].includes(mode)
        const nextCursor=mode==='cycle'?'same':mode==='bounded'?`page-${request.id}`:mode==='paged'&&request.id===3?'older':null
        child.stdout.emit('data',Buffer.from(JSON.stringify({id:request.id,result:{data:paged?[{id:`turn-${request.id}`}]:[],nextCursor}})+'\n'))
      }
    })
  }
  const read=createPlannerThreadReader({timeoutMs:20,spawnProcess:(...args)=>{spawns++;assert.deepEqual(args,['codex',['app-server','--stdio'],{shell:false,stdio:['pipe','pipe','pipe']}]);return child}})
  return {read,writes,counts:()=>({kills,spawns})}
}
test('read-only protocol initializes once and requests exact thread without starting work',async()=>{
  const f=fixture();const result=JSON.parse(await f.read(id))
  assert.equal(result.thread.id,id);assert.equal(result.thread.name,'안녕')
  assert.deepEqual(f.writes.map(x=>x.method),['initialize','initialized','thread/read','thread/turns/list'])
  assert.deepEqual(f.writes[2].params,{threadId:id,includeTurns:false})
  assert.deepEqual(f.writes[3].params,{threadId:id,limit:5,sortDirection:'desc',itemsView:'full'})
  assert.deepEqual(f.counts(),{kills:1,spawns:1})
})
test('invalid identity, malformed response, mismatch and timeout have no replay',async()=>{
  const invalid=fixture();assert.equal(await invalid.read('not-a-thread'),null);assert.equal(invalid.counts().spawns,0)
  for(const mode of ['malformed','mismatch','timeout']){const f=fixture(mode);assert.equal(await f.read(id),null);assert.deepEqual(f.counts(),{kills:1,spawns:1})}
})

test('reads older page with opaque cursor and preserves source completeness',async()=>{
  const f=fixture('paged');const result=JSON.parse(await f.read(id))
  assert.deepEqual(result.thread.turns.map(x=>x.id),['turn-3','turn-4'])
  assert.equal(f.writes.at(-1).params.cursor,'older')
  assert.deepEqual(result.sourceWindow,{limit:15,pages:2,complete:true})
  assert.deepEqual(f.counts(),{kills:1,spawns:1})
})

test('cursor cycles fail closed and page ceiling remains explicitly incomplete',async()=>{
  const cycle=fixture('cycle');assert.equal(await cycle.read(id),null)
  assert.equal(cycle.writes.filter(x=>x.method==='thread/turns/list').length,2)
  const bounded=fixture('bounded');const result=JSON.parse(await bounded.read(id))
  assert.equal(result.thread.turns.length,3)
  assert.deepEqual(result.sourceWindow,{limit:15,pages:3,complete:false})
  assert.deepEqual(bounded.counts(),{kills:1,spawns:1})
  for(const maxPages of [0,11,1.5])assert.throws(()=>createPlannerThreadReader({maxPages}),/configuration_invalid/)
})

function selectiveFixture(mode='ok') {
  const envelope='OUTCOME exact synthetic request', writes=[]
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter()
  child.stdin.end=()=>{};child.kill=()=>{}
  const user={id:'user',type:'userMessage',content:[{type:'text',text:envelope}]}
  const final={id:'final',type:'agentMessage',phase:'final_answer',text:'verified response'}
  child.stdin.write=line=>{
    const r=JSON.parse(line);writes.push(r)
    queueMicrotask(()=>{
      let result
      if(r.method==='initialize')result={userAgent:'test'}
      if(r.method==='thread/read')result={thread:{id,turns:[]}}
      if(r.method==='thread/turns/list')result={data:r.params.itemsView==='summary'
        ? [{id:'target',status:'completed',completedAt:1,error:null,itemsView:'summary',items:[user,final]},...(mode==='duplicate'?[{id:'other',items:[user]}]:[])]
        : [{id:'huge',items:[{type:'commandExecution',aggregatedOutput:'x'.repeat(10000)}]}],nextCursor:null}
      if(r.method==='thread/items/list') {
        if(mode==='unsupported'){child.stdout.emit('data',Buffer.from(JSON.stringify({id:r.id,error:{code:-32601}})+'\n'));return}
        result={data:[{turnId:mode==='wrong-turn'?'wrong':'target',item:r.params.cursor?final:user}],nextCursor:mode==='cycle'?'same':r.params.cursor?null:'next'}
      }
      if(result)child.stdout.emit('data',Buffer.from(JSON.stringify({id:r.id,result})+'\n'))
    })
  }
  return {envelope,writes,read:createPlannerThreadReader({spawnProcess:()=>child,maxBytes:4000,timeoutMs:100})}
}

test('exact request uses summaries then fully paginates only its turn, excluding huge unrelated tool output',async()=>{
  const f=selectiveFixture();const raw=await f.read(id,{requestEnvelope:f.envelope})
  assert.notEqual(raw,null)
  const result=JSON.parse(raw)
  assert.equal(result.thread.turns.length,1)
  assert.equal(result.thread.turns[0].itemsView,'full')
  assert.deepEqual(result.thread.turns[0].items.map(x=>x.id),['user','final'])
  assert.equal(f.writes.find(x=>x.method==='thread/turns/list').params.itemsView,'summary')
  assert.equal(f.writes.filter(x=>x.method==='thread/items/list').length,2)
  assert.ok(f.writes.filter(x=>x.method==='thread/items/list').every(x=>x.params.turnId==='target'))
})

test('selective read rejects duplicate matches, wrong item turn, item cycles and unsupported item API without fallback',async()=>{
  for(const mode of ['duplicate','wrong-turn','cycle','unsupported']){
    const f=selectiveFixture(mode);assert.equal(await f.read(id,{requestEnvelope:f.envelope}),null,mode)
    assert.ok(f.writes.filter(x=>x.method==='thread/turns/list').every(x=>x.params.itemsView==='summary'))
  }
})
