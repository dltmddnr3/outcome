import {createServer} from 'node:http'
import {randomBytes,timingSafeEqual} from 'node:crypto'

// Explicit local pairing only. The caller pins the Preview and verifier from
// protected configuration. No server starts on import, no credential is stored,
// and pairing never records an execution grant or launches work.
export async function createLocalSessionReceiver({previewOrigin,verifySession,timeoutMs=60000}={}){
  if(typeof previewOrigin!=='string'||!/^https:\/\/outcome-[a-z0-9]+-white-castle\.vercel\.app$/.test(previewOrigin)
    ||typeof verifySession!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('session_receiver_unavailable')
  const challenge=randomBytes(32).toString('hex'),expiresAt=Date.now()+timeoutMs
  let token=null,used=false,done=false,port,timer,resolveReady
  const ready=new Promise(resolve=>{resolveReady=resolve})
  const controller=new AbortController()
  const finish=outcome=>{
    if(done)return
    done=true;clearTimeout(timer);controller.abort()
    if(outcome!=='session_connected')token=null
    server.close();if(outcome==='session_expired'||outcome==='session_closed')server.closeAllConnections()
    resolveReady({outcome,executionAuthority:false,completionAuthority:false})
  }
  const server=createServer(async(req,res)=>{
    const reply=(status,outcome)=>{
      if(res.destroyed)return
      res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':previewOrigin,'vary':'Origin'})
      res.end(JSON.stringify({outcome,executionAuthority:false,completionAuthority:false}))
    }
    if(done||Date.now()>=expiresAt)return reply(410,'session_unavailable')
    if(req.headers.host!==`127.0.0.1:${port}`||req.headers.origin!==previewOrigin||req.url!=='/outcome-session')return reply(403,'session_unavailable')
    if(req.method==='OPTIONS'){
      if(req.headers['access-control-request-method']!=='POST'||req.headers['access-control-request-headers']?.toLowerCase()!=='content-type')return reply(403,'session_unavailable')
      res.writeHead(204,{'access-control-allow-origin':previewOrigin,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type','access-control-allow-private-network':'true','cache-control':'no-store','vary':'Origin'})
      return res.end()
    }
    if(req.method!=='POST'||req.headers['content-type']!=='application/json'||used)return reply(403,'session_unavailable')
    let size=0
    const chunks=[]
    try{
      for await(const chunk of req){size+=chunk.length;if(size>20000)throw Error();chunks.push(chunk)}
      const bytes=Buffer.concat(chunks),text=bytes.toString('utf8')
      if(!Buffer.from(text).equals(bytes))throw Error()
      const value=JSON.parse(text)
      if(!value||Object.keys(value).length!==2||typeof value.challenge!=='string'||!/^[a-f0-9]{64}$/.test(value.challenge)
        ||!timingSafeEqual(Buffer.from(value.challenge),Buffer.from(challenge))||typeof value.token!=='string'||value.token.length>16384||!value.token)throw Error()
      if(used||done||Date.now()>=expiresAt)throw Error()
      used=true // An ambiguous verifier result consumes this invitation too.
      if(await verifySession(value.token,{signal:controller.signal})!==true||done||Date.now()>=expiresAt)throw Error()
      token=value.token
      reply(200,'session_connected');finish('session_connected')
    }catch{
      reply(403,'session_unavailable')
      if(used)finish('session_unavailable')
    }finally{chunks.length=0}
  })
  server.requestTimeout=Math.min(timeoutMs,10000)
  server.headersTimeout=Math.min(timeoutMs,10000)
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  port=server.address().port
  timer=setTimeout(()=>finish('session_expired'),timeoutMs)
  return Object.freeze({
    invitation:Object.freeze({schemaVersion:1,endpoint:`http://127.0.0.1:${port}/outcome-session`,previewOrigin,challenge,expiresAt}),
    ready,
    readToken(){if(!done||!token)throw Error('session_unavailable');return token},
    dispose(){token=null;finish('session_closed');server.closeAllConnections()},
  })
}
