// Local UI integration fixture, never a production auth or transport implementation.
import { createServer as createHttpServer } from 'node:http'
import { createServer as createViteServer } from 'vite'
import react from '@vitejs/plugin-react'
import { handlePrivateChatRequest } from '../server/outcome-chat-api.mjs'

const events=[], receipts=new Map()
const csrf='synthetic-local-browser-csrf'
let origin
const service={
  async timeline(){return {target:{role:'planner',binding_version:1},events:structuredClone(events),completion_authority:false}},
  async submitPlannerMessage({message,idempotency_key}){
    if(receipts.has(idempotency_key))return receipts.get(idempotency_key)
    const sequence=events.length+1,event_id=`event-${sequence.toString(16).padStart(16,'0')}`
    events.push({event_id,sequence,observed_at:new Date().toISOString(),kind:'user_message',state:'queued',correlation_id:idempotency_key,payload:{private_content:{text:message}},delivery:'acknowledged',dispatch_state:'invoked'})
    const receipt={accepted:true,event_id,sequence,delivery:'acknowledged',dispatch_state:'invoked',execution_started:false,result_attached:false,evidence_attached:false}
    receipts.set(idempotency_key,receipt)
    setTimeout(()=>{const sequence=events.length+1;events.push({event_id:`event-${sequence.toString(16).padStart(16,'0')}`,sequence,observed_at:new Date().toISOString(),kind:'assistant_message',state:'completed',correlation_id:idempotency_key,payload:{private_content:{text:'합성 Planner 응답: 브라우저 수신 경로가 동작합니다.'}}})},200)
    return receipt
  },
}
const vite=await createViteServer({configFile:false,envPrefix:'FIXTURE_NEVER_',plugins:[react()],server:{middlewareMode:true},appType:'spa'})
const server=createHttpServer(async(req,res)=>{
  if(req.url?.startsWith('/api/private/chat/')){
    let body='',oversized=false
    for await(const chunk of req){if(Buffer.byteLength(body)+chunk.length>10000){oversized=true;break}body+=chunk.toString('utf8')}
    if(oversized){res.writeHead(413);res.end();return}
    const value=await handlePrivateChatRequest({method:req.method,url:req.url,headers:req.headers,rawBody:body,service,
      owner:req.headers.authorization==='Bearer synthetic-browser-owner'?{authenticated:true,actor:'cherry_owner',allowed_origin:origin,csrf}:null,
      sendEnabled:true})
    res.writeHead(value.status,value.headers);res.end(JSON.stringify(value.body));return
  }
  vite.middlewares(req,res,()=>{res.writeHead(404);res.end()})
})
server.listen(0,'127.0.0.1',()=>{origin=`http://127.0.0.1:${server.address().port}`;console.log(`${origin}/scripts/fixtures/chat-browser.html`)})
const close=()=>{server.close();void vite.close().then(()=>process.exit(0))}
process.on('SIGTERM',close);process.on('SIGINT',close)
