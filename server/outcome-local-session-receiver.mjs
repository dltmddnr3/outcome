import {createServer} from 'node:http'
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto'
import {verifyWorkExecutionGrant} from './outcome-work-execution-grant.mjs'

// Explicit local pairing only. The caller pins the Preview and verifier from
// protected configuration. No server starts on import, no credential is stored,
// and pairing never records an execution grant or launches work.
export async function createLocalSessionReceiver({previewOrigin,verifySession,timeoutMs=60000,approval=null}={}){
  if(typeof previewOrigin!=='string'||!/^https:\/\/outcome-[a-z0-9]+-white-castle\.vercel\.app$/.test(previewOrigin)
    ||typeof verifySession!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('session_receiver_unavailable')
  if(approval!==null){
    if(!approval||Object.keys(approval).sort().join(',')!=='digest,grantJson'||typeof approval.grantJson!=='string'||Buffer.byteLength(approval.grantJson)>8192||createHash('sha256').update(approval.grantJson).digest('hex')!==approval.digest)throw Error('session_receiver_unavailable')
    let grant;try{grant=JSON.parse(approval.grantJson)}catch{throw Error('session_receiver_unavailable')}
    const identity=Object.fromEntries(['projectId','workId','runId','sessionRef','bindingVersion','ownerRef','candidateCommit','candidateTree'].map(key=>[key,grant?.[key]]))
    if(grant?.schemaVersion!==2||!verifyWorkExecutionGrant(approval.grantJson,JSON.stringify({...identity,authorityRef:approval.digest,action:grant.allowedStages?.[0],status:'active'}),Date.now()).matches)throw Error('session_receiver_unavailable')
    // Do not send secrets or absolute private paths in an approval display.
    if(/(?:\/(?:Users|home|private\/tmp|tmp)\/|-----BEGIN .*PRIVATE KEY-----|\b(?:bearer|basic)\s+\S+|\b(?:password|secret|token|api[_ -]?key)\s*[:=]\s*\S+)/i.test(approval.grantJson.normalize('NFKC')))throw Error('session_receiver_unavailable')
    approval=Object.freeze({...approval})
  }
  const challenge=randomBytes(32).toString('hex'),expiresAt=Math.min(Date.now()+timeoutMs,approval===null?Infinity:JSON.parse(approval.grantJson).expiresAt)
  let token=null,used=false,done=false,port,timer,resolveReady,reviewed=false
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
      const reviewRequest=approval!==null&&value?.action==='review'
      const expectedKeys=approval===null?['challenge','token']:reviewRequest?['action','challenge','token']:['approvalDigest','challenge','token']
      if(!value||Object.keys(value).sort().join(',')!==expectedKeys.sort().join(',')||typeof value.challenge!=='string'||!/^[a-f0-9]{64}$/.test(value.challenge)
        ||!timingSafeEqual(Buffer.from(value.challenge),Buffer.from(challenge))||typeof value.token!=='string'||value.token.length>16384||!value.token)throw Error()
      if(used||done||Date.now()>=expiresAt)throw Error()
      if(approval!==null&&!reviewRequest&&(!reviewed||value.approvalDigest!==approval.digest))throw Error()
      used=true // An ambiguous verifier result consumes this invitation too.
      if(await verifySession(value.token,{signal:controller.signal})!==true||done||Date.now()>=expiresAt)throw Error()
      if(reviewRequest){
        if(reviewed)throw Error()
        reviewed=true;used=false
        res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':previewOrigin,'vary':'Origin'})
        res.end(JSON.stringify({outcome:'approval_review',grantJson:approval.grantJson,approvalDigest:approval.digest,executionAuthority:false,completionAuthority:false}));return
      }
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
  timer=setTimeout(()=>finish('session_expired'),Math.max(0,expiresAt-Date.now()))
  return Object.freeze({
    invitation:Object.freeze({schemaVersion:approval===null?1:2,endpoint:`http://127.0.0.1:${port}/outcome-session`,previewOrigin,challenge,expiresAt,...(approval===null?{}:{approvalDigest:approval.digest})}),
    ready,
    readToken(){if(!done||!token)throw Error('session_unavailable');return token},
    dispose(){token=null;finish('session_closed');server.closeAllConnections()},
  })
}
