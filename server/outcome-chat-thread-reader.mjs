import { spawn } from 'node:child_process'

// A short-lived stdio server reads the existing store; no daemon installation or thread start.
export function createPlannerThreadReader({ spawnProcess=spawn, executable='codex', pageSize=5, maxPages=3, timeoutMs=5000, maxBytes=8_000_000 }={}) {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 10) throw new Error('reader_configuration_invalid')
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error('reader_configuration_invalid')
  if (typeof executable !== 'string' || !(executable === 'codex' || executable.startsWith('/')) || /[\u0000-\u001f\u007f]/.test(executable)) throw new Error('reader_configuration_invalid')
  if (typeof spawnProcess !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>60_000 || !Number.isSafeInteger(maxBytes) || maxBytes<1 || maxBytes>8_000_000) throw new Error('reader_configuration_invalid')
  return (threadId, { includeTurns=true, requestEnvelope=null }={}) => new Promise(resolve => {
    if (typeof includeTurns !== 'boolean' || (requestEnvelope!==null && (typeof requestEnvelope!=='string'||!requestEnvelope.length||Buffer.byteLength(requestEnvelope)>20_000||!includeTurns)) || typeof threadId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(threadId)) { resolve(null); return }
    let child, timer, done=false, initialized=false, bytes=0, pending=Buffer.alloc(0), thread
    let pageRequestId=3, pages=0
    const turns=[], cursors=new Set(), itemCursors=new Set(), itemIds=new Set(), items=[]
    let selected=null, itemPages=0, sourceWindow
    const itemsView=requestEnvelope===null?'full':'summary'
    const finish = value => {
      if (done) return
      done=true; clearTimeout(timer)
      try { child?.stdin?.end() } catch {}
      try { child?.kill('SIGTERM') } catch {}
      resolve(value)
    }
    const send = value => child.stdin.write(`${JSON.stringify(value)}\n`)
    try {
      child=spawnProcess(executable,['app-server','--stdio'],{shell:false,stdio:['pipe','pipe','pipe']})
      child.on('error',()=>finish(null))
      child.on('close',()=>finish(null))
      child.stdin.on('error',()=>finish(null))
      child.stderr.on('data',chunk=>{ bytes+=Buffer.byteLength(chunk); if(bytes>maxBytes)finish(null) })
      child.stdout.on('data',chunk=>{
        if(done)return
        try {
          bytes+=Buffer.byteLength(chunk); if(bytes>maxBytes){finish(null);return}
          pending=Buffer.concat([pending,Buffer.from(chunk)])
          let newline
          while(!done && (newline=pending.indexOf(10))>=0){
            const line=pending.subarray(0,newline).toString('utf8'); pending=pending.subarray(newline+1)
            if(!line.trim())continue
            const message=JSON.parse(line)
            if(message.id===1){
              if(initialized||message.error||!message.result){finish(null);return}
              initialized=true; send({method:'initialized'})
              send({id:2,method:'thread/read',params:{threadId,includeTurns:false}})
            }else if(message.id===2){
              if(!initialized||message.error||message.result?.thread?.id!==threadId){finish(null);return}
              if(!includeTurns){finish(JSON.stringify(message.result));return}
              thread=message.result.thread
              send({id:3,method:'thread/turns/list',params:{threadId,limit:pageSize,sortDirection:'desc',itemsView}})
            }else if(message.id===pageRequestId){
              if(!thread||message.error||!Array.isArray(message.result?.data)){finish(null);return}
              if(selected){
                if(!Object.hasOwn(message.result,'nextCursor')){finish(null);return}
                itemPages++
                for(const entry of message.result.data){
                  const item=entry?.item
                  if(entry?.turnId!==selected.id||!item||typeof item.id!=='string'||!item.id||itemIds.has(item.id)){finish(null);return}
                  itemIds.add(item.id);items.push(item)
                }
                const cursor=message.result.nextCursor
                if(cursor!=null && (typeof cursor!=='string'||!cursor.length||cursor.length>4096||itemCursors.has(cursor)||itemPages>=20)){finish(null);return}
                if(cursor==null){
                  // Full means every target item page was read, never the summary projection.
                  finish(JSON.stringify({thread:{...thread,turns:[{...selected,items,itemsView:'full'}]},sourceWindow}))
                }else{
                  itemCursors.add(cursor);pageRequestId++
                  send({id:pageRequestId,method:'thread/items/list',params:{threadId,turnId:selected.id,limit:50,sortDirection:'asc',cursor}})
                }
                continue
              }
              turns.push(...message.result.data); pages++
              const cursor=message.result.nextCursor
              if(cursor!=null && (typeof cursor!=='string'||!cursor.length||cursor.length>4096||cursors.has(cursor))){finish(null);return}
              if(cursor==null || pages>=maxPages){
                sourceWindow={limit:pageSize*maxPages,pages,complete:cursor==null}
                if(requestEnvelope===null){finish(JSON.stringify({thread:{...thread,turns},sourceWindow}));continue}
                const matches=turns.filter(turn=>Array.isArray(turn.items)&&turn.items.some(item=>item.type==='userMessage'&&Array.isArray(item.content)&&item.content.length===1&&item.content[0].type==='text'&&item.content[0].text===requestEnvelope))
                if(matches.length>1){finish(null);return}
                if(matches.length===0){finish(JSON.stringify({thread:{...thread,turns:[]},sourceWindow}));continue}
                selected=matches[0]
                if(typeof selected.id!=='string'||!selected.id){finish(null);return}
                pageRequestId++
                send({id:pageRequestId,method:'thread/items/list',params:{threadId,turnId:selected.id,limit:50,sortDirection:'asc'}})
              }else{
                cursors.add(cursor); pageRequestId++
                send({id:pageRequestId,method:'thread/turns/list',params:{threadId,limit:pageSize,sortDirection:'desc',itemsView,cursor}})
              }
            }else if(Object.hasOwn(message,'id')){finish(null)}
          }
        }catch{finish(null)}
      })
      timer=setTimeout(()=>finish(null),timeoutMs)
      send({id:1,method:'initialize',params:{clientInfo:{name:'outcome_chat_reader',version:'1.0.0'},capabilities:{experimentalApi:true}}})
    }catch{finish(null)}
  })
}
